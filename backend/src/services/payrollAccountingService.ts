import { PrismaClient } from '@prisma/client';
import Decimal from 'decimal.js';

const prisma = new PrismaClient();

/**
 * Marks a Salary as PAID and creates the corresponding Accounting entry (idempotent).
 */
export const paySalary = async (salaryId: string, createdById: string, paymentMethod: string = 'BANK_TRANSFER') => {
  return await prisma.$transaction(async (tx) => {
    const salary = await tx.salaryRecord.findUnique({
      where: { id: salaryId }
    });

    if (!salary) throw new Error('Salary record not found');
    if (salary.transactionId) return salary; // Idempotent
    if (salary.status === 'PAID') return salary;

    const transaction = await tx.financialTransaction.create({
      data: {
        referenceNumber: `SAL-${salary.month}-${salary.year}-${Date.now()}`,
        type: 'SALARY',
        amount: salary.netSalary,
        currency: 'INR',
        paymentMethod,
        notes: `Salary for ${salary.month}/${salary.year}`,
        createdById,
        status: 'COMPLETED'
      }
    });

    return await tx.salaryRecord.update({
      where: { id: salaryId },
      data: {
        status: 'PAID',
        transactionId: transaction.id
      }
    });
  });
};

/**
 * Marks a Bonus as PAID and creates the Accounting entry.
 */
export const payBonus = async (bonusId: string, createdById: string, paymentMethod: string = 'BANK_TRANSFER') => {
  return await prisma.$transaction(async (tx) => {
    const bonus = await tx.employeeBonus.findUnique({
      where: { id: bonusId }
    });

    if (!bonus) throw new Error('Bonus not found');
    if (bonus.transactionId) return bonus;
    if (bonus.status === 'PAID') return bonus;

    const transaction = await tx.financialTransaction.create({
      data: {
        referenceNumber: `BON-${Date.now()}`,
        type: 'SALARY', // Treating Bonus as Salary expense type
        amount: bonus.amount,
        currency: 'INR',
        paymentMethod,
        notes: `Bonus: ${bonus.reason}`,
        createdById,
        status: 'COMPLETED'
      }
    });

    return await tx.employeeBonus.update({
      where: { id: bonusId },
      data: {
        status: 'PAID',
        transactionId: transaction.id
      }
    });
  });
};

/**
 * Marks an Incentive/Commission as PAID and creates the Accounting entry.
 */
export const payIncentive = async (incentiveId: string, createdById: string, paymentMethod: string = 'BANK_TRANSFER') => {
  return await prisma.$transaction(async (tx) => {
    const incentive = await tx.employeeIncentive.findUnique({
      where: { id: incentiveId }
    });

    if (!incentive) throw new Error('Incentive not found');
    if (incentive.transactionId) return incentive;
    if (incentive.status === 'PAID') return incentive;

    const transaction = await tx.financialTransaction.create({
      data: {
        referenceNumber: `INC-${Date.now()}`,
        type: 'SALARY',
        amount: incentive.amount,
        currency: 'INR',
        paymentMethod,
        notes: `Incentive: ${incentive.reason}`,
        createdById,
        status: 'COMPLETED'
      }
    });

    return await tx.employeeIncentive.update({
      where: { id: incentiveId },
      data: {
        status: 'PAID',
        transactionId: transaction.id
      }
    });
  });
};

/**
 * Retrieves the high-level dashboard metrics for Payroll Liabilities vs Paid
 */
export const getPayrollAccountingDashboard = async () => {
  const [salaries, bonuses, incentives] = await Promise.all([
    prisma.salaryRecord.findMany({ include: { employee: true } }),
    prisma.employeeBonus.findMany({ include: { employee: true } }),
    prisma.employeeIncentive.findMany({ include: { employee: true } })
  ]);

  let unpaidLiability = new Decimal(0);
  let paidTotal = new Decimal(0);

  const pendingItems: any[] = [];
  const paidItems: any[] = [];

  // Categorize Salaries
  salaries.forEach(s => {
    const amt = new Decimal(s.netSalary);
    const item = { type: 'Salary', amount: s.netSalary, employee: `${s.employee.firstName} ${s.employee.lastName}`, date: s.createdAt, status: s.status, id: s.id, category: 'SALARY' };
    
    if (s.status === 'PAID') {
      paidTotal = paidTotal.plus(amt);
      paidItems.push(item);
    } else if (['PENDING', 'APPROVED', 'PROCESSED'].includes(s.status)) {
      unpaidLiability = unpaidLiability.plus(amt);
      pendingItems.push(item);
    }
  });

  // Categorize Bonuses
  bonuses.forEach(b => {
    const amt = new Decimal(b.amount);
    const item = { type: 'Bonus', amount: b.amount, employee: `${b.employee.firstName} ${b.employee.lastName}`, date: b.createdAt, status: b.status, id: b.id, category: 'BONUS' };
    
    if (b.status === 'PAID') {
      paidTotal = paidTotal.plus(amt);
      paidItems.push(item);
    } else if (['APPROVED', 'SUBMITTED', 'DRAFT', 'PROCESSED'].includes(b.status)) {
      unpaidLiability = unpaidLiability.plus(amt);
      pendingItems.push(item);
    }
  });

  // Categorize Incentives
  incentives.forEach(i => {
    const amt = new Decimal(i.amount);
    const item = { type: 'Commission', amount: i.amount, employee: `${i.employee.firstName} ${i.employee.lastName}`, date: i.createdAt, status: i.status, id: i.id, category: 'INCENTIVE' };
    
    if (i.status === 'PAID') {
      paidTotal = paidTotal.plus(amt);
      paidItems.push(item);
    } else if (['APPROVED', 'SUBMITTED', 'DRAFT', 'PROCESSED'].includes(i.status)) {
      unpaidLiability = unpaidLiability.plus(amt);
      pendingItems.push(item);
    }
  });

  return {
    metrics: {
      unpaidLiability: unpaidLiability.toNumber(),
      paidTotal: paidTotal.toNumber()
    },
    pendingItems: pendingItems.sort((a, b) => b.date.getTime() - a.date.getTime()),
    paidItems: paidItems.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 50) // limit for UI
  };
};
