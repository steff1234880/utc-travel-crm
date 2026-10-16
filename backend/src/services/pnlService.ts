import { PrismaClient } from '@prisma/client';
import Decimal from 'decimal.js';

const prisma = new PrismaClient();

export interface PnLFilters {
  startDate?: Date;
  endDate?: Date;
}

export const generatePnLStatement = async (filters: PnLFilters) => {
  const whereClause: any = {};
  if (filters.startDate && filters.endDate) {
    whereClause.date = {
      gte: filters.startDate,
      lte: filters.endDate
    };
  } else if (filters.startDate) {
    whereClause.date = { gte: filters.startDate };
  } else if (filters.endDate) {
    whereClause.date = { lte: filters.endDate };
  }

  // 1. Fetch Valid Financial Transactions for Revenue (INCOME and REFUND)
  const financialTransactions = await prisma.financialTransaction.findMany({
    where: {
      ...whereClause,
      type: { in: ['INCOME', 'REFUND'] },
      status: 'COMPLETED'
    },
    include: {
      customerPayment: {
        include: {
          quotation: true,
          bookingPrep: true
        }
      },
      refund: {
        include: {
          quotation: true
        }
      }
    }
  });

  // 2. Fetch Valid Expenses
  const expenseWhere = {
    status: { in: ['APPROVED', 'PAID'] }
  };
  
  if (filters.startDate && filters.endDate) {
    (expenseWhere as any).expenseDate = { gte: filters.startDate, lte: filters.endDate };
  }

  const expenses = await prisma.expense.findMany({
    where: expenseWhere,
    include: { category: true, operationalCost: true }
  });

  const opCostWhere: any = {
    expenseId: null, // Avoid double counting
  };
  if (filters.startDate && filters.endDate) {
    opCostWhere.costDate = { gte: filters.startDate, lte: filters.endDate };
  }
  const operationalCosts = await prisma.operationalCost.findMany({
    where: opCostWhere
  });

  // 3. Fetch Valid Payroll
  const payrollWhere: any = { status: { in: ['PAID', 'COMPLETED'] } };
  if (filters.startDate && filters.endDate) {
    payrollWhere.createdAt = { gte: filters.startDate, lte: filters.endDate };
  }

  const salaries = await prisma.salaryRecord.findMany({ where: payrollWhere });
  const bonuses = await prisma.employeeBonus.findMany({ where: payrollWhere });
  const incentives = await prisma.employeeIncentive.findMany({ where: payrollWhere });

  // === CALCULATIONS ===

  let totalRevenue = new Decimal(0);
  let totalDirectExpenses = new Decimal(0);
  let totalOperatingExpenses = new Decimal(0);
  
  // Breakdown objects
  const revenueBreakdown = {
    PACKAGE: new Decimal(0),
    BOOKING_SERVICE: new Decimal(0),
    CUSTOMIZED_TOUR: new Decimal(0),
    OTHER_SERVICE: new Decimal(0),
    UNCLASSIFIED: new Decimal(0)
  };

  const expenseBreakdown: Record<string, Decimal> = {};
  
  // A. Process Revenue from Financial Transactions
  financialTransactions.forEach(t => {
    const amt = new Decimal(t.amount);
    const isRefund = t.type === 'REFUND';
    
    if (isRefund) {
      totalRevenue = totalRevenue.minus(amt);
    } else {
      totalRevenue = totalRevenue.plus(amt);
    }
    
    let resolvedType = 'UNCLASSIFIED';
    
    if (t.customerPayment) {
      if (t.customerPayment.quotation?.packageId) {
        resolvedType = 'PACKAGE';
      } else if (t.customerPayment.quotation) {
        resolvedType = 'CUSTOMIZED_TOUR';
      } else if (t.customerPayment.bookingPrepId) {
        resolvedType = 'PACKAGE';
      } else {
        resolvedType = 'OTHER_SERVICE';
      }
    } else if (t.refund) {
      if (t.refund.quotation?.packageId) {
        resolvedType = 'PACKAGE';
      } else if (t.refund.quotation) {
        resolvedType = 'CUSTOMIZED_TOUR';
      } else {
        resolvedType = 'OTHER_SERVICE';
      }
    }
    
    if (resolvedType in revenueBreakdown) {
      if (isRefund) {
        revenueBreakdown[resolvedType as keyof typeof revenueBreakdown] = revenueBreakdown[resolvedType as keyof typeof revenueBreakdown].minus(amt);
      } else {
        revenueBreakdown[resolvedType as keyof typeof revenueBreakdown] = revenueBreakdown[resolvedType as keyof typeof revenueBreakdown].plus(amt);
      }
    } else {
      if (isRefund) {
        revenueBreakdown.UNCLASSIFIED = revenueBreakdown.UNCLASSIFIED.minus(amt);
      } else {
        revenueBreakdown.UNCLASSIFIED = revenueBreakdown.UNCLASSIFIED.plus(amt);
      }
    }
  });

  // B. Process Expenses
  expenses.forEach(e => {
    // For expenses, if GST applies, we only consider the taxableAmount (Base) as the true expense for P&L,
    // because the GST component is an Input Tax Credit, not a true P&L expense.
    const expenseAmt = e.gstApplicable ? new Decimal(e.taxableAmount) : new Decimal(e.totalAmount);
    
    const catName = e.category?.name || 'Uncategorized';
    
    // Check if it's explicitly tied to an Operational Cost, or falls into a known direct category
    const isDirect = (e as any).operationalCost != null || 
      ['OPERATIONAL', 'Vendor Payments', 'Transport', 'Accommodation', 'Booking-related Expenses'].includes(catName);
    
    if (isDirect) {
      totalDirectExpenses = totalDirectExpenses.plus(expenseAmt);
    } else {
      totalOperatingExpenses = totalOperatingExpenses.plus(expenseAmt);
    }

    if (!expenseBreakdown[catName]) {
      expenseBreakdown[catName] = new Decimal(0);
    }
    expenseBreakdown[catName] = expenseBreakdown[catName].plus(expenseAmt);
  });

  // B2. Process Standalone Operational Costs (Direct COGS)
  operationalCosts.forEach(oc => {
    // We use actualCost as the incurred expense. If 0, fallback to estimatedCost to ensure COGS is not severely under-reported.
    const costVal = new Decimal(oc.actualCost).greaterThan(0) ? new Decimal(oc.actualCost) : new Decimal(oc.estimatedCost);
    totalDirectExpenses = totalDirectExpenses.plus(costVal);

    const catName = oc.costCategory || 'Direct Tour Operations';
    if (!expenseBreakdown[catName]) {
      expenseBreakdown[catName] = new Decimal(0);
    }
    expenseBreakdown[catName] = expenseBreakdown[catName].plus(costVal);
  });

  // C. Process Payroll (Operating Expenses)
  let totalPayroll = new Decimal(0);
  
  salaries.forEach(s => totalPayroll = totalPayroll.plus(new Decimal(s.netSalary)));
  bonuses.forEach(b => totalPayroll = totalPayroll.plus(new Decimal(b.amount)));
  incentives.forEach(i => totalPayroll = totalPayroll.plus(new Decimal(i.amount)));
  
  totalOperatingExpenses = totalOperatingExpenses.plus(totalPayroll);
  
  if (totalPayroll.greaterThan(0)) {
    expenseBreakdown['Payroll (Salary, Bonus, Incentive)'] = totalPayroll;
  }

  // D. Final Derivations
  const grossProfit = totalRevenue.minus(totalDirectExpenses);
  const netProfit = grossProfit.minus(totalOperatingExpenses);
  
  let profitMargin = new Decimal(0);
  if (totalRevenue.greaterThan(0)) {
    profitMargin = netProfit.dividedBy(totalRevenue).times(100);
  }

  // Serialize to standard numbers for JSON response
  return {
    revenue: {
      total: totalRevenue.toNumber(),
      breakdown: {
        PACKAGE: revenueBreakdown.PACKAGE.toNumber(),
        BOOKING_SERVICE: revenueBreakdown.BOOKING_SERVICE.toNumber(),
        CUSTOMIZED_TOUR: revenueBreakdown.CUSTOMIZED_TOUR.toNumber(),
        OTHER_SERVICE: revenueBreakdown.OTHER_SERVICE.toNumber(),
        UNCLASSIFIED: revenueBreakdown.UNCLASSIFIED.toNumber()
      }
    },
    expenses: {
      directTotal: totalDirectExpenses.toNumber(),
      operatingTotal: totalOperatingExpenses.toNumber(),
      total: totalDirectExpenses.plus(totalOperatingExpenses).toNumber(),
      breakdown: Object.fromEntries(
        Object.entries(expenseBreakdown).map(([k, v]) => [k, v.toNumber()])
      )
    },
    payrollTotal: totalPayroll.toNumber(),
    profitability: {
      grossProfit: grossProfit.toNumber(),
      netProfit: netProfit.toNumber(),
      profitMargin: profitMargin.toDecimalPlaces(2).toNumber()
    }
  };
};
