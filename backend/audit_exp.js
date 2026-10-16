const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const Decimal = require('decimal.js');

async function main() {
  const currentYear = new Date().getFullYear();
  const startOfYear = new Date(currentYear, 0, 1);
  const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);

  // 1. Expense Model
  const expenses = await prisma.expense.findMany({
    where: {
      status: { in: ['APPROVED', 'PAID'] },
      expenseDate: { gte: startOfYear, lte: endOfYear }
    },
    include: { category: true, operationalCost: true }
  });

  const expenseTotal = expenses.reduce((sum, e) => sum + (e.gstApplicable ? e.taxableAmount : e.totalAmount), 0);

  // 2. Payroll Model
  const salaries = await prisma.salaryRecord.findMany({
    where: { status: { in: ['PAID', 'COMPLETED'] }, createdAt: { gte: startOfYear, lte: endOfYear } }
  });
  const salaryTotal = salaries.reduce((sum, s) => sum + s.netSalary, 0);

  const bonuses = await prisma.employeeBonus.findMany({
    where: { status: { in: ['PAID', 'COMPLETED'] }, createdAt: { gte: startOfYear, lte: endOfYear } }
  });
  const bonusTotal = bonuses.reduce((sum, b) => sum + b.amount, 0);

  const incentives = await prisma.employeeIncentive.findMany({
    where: { status: { in: ['PAID', 'COMPLETED'] }, createdAt: { gte: startOfYear, lte: endOfYear } }
  });
  const incTotal = incentives.reduce((sum, b) => sum + b.amount, 0);

  const payrollTotal = salaryTotal + bonusTotal + incTotal;

  // 3. OperationalCost Model
  const opCosts = await prisma.operationalCost.findMany({
    where: { expenseId: null, costDate: { gte: startOfYear, lte: endOfYear } }
  });
  const opCostTotal = opCosts.reduce((sum, o) => sum + (parseFloat(o.actualCost) > 0 ? parseFloat(o.actualCost) : parseFloat(o.estimatedCost)), 0);

  console.log("Expense total:", expenseTotal);
  console.log("Payroll total:", payrollTotal);
  console.log("OperationalCost total:", opCostTotal);
  console.log("Other cost total:", 0);

  console.log("P&L Total Expenses:", expenseTotal + payrollTotal + opCostTotal);
  console.log("CEO Total Expenses:", expenseTotal + payrollTotal + opCostTotal);
}

main().catch(console.error).finally(() => prisma.$disconnect());
