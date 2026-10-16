const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const currentYear = new Date().getFullYear();
  const startOfYear = new Date(currentYear, 0, 1);
  const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);

  const transactions = await prisma.financialTransaction.findMany({
    where: { date: { gte: startOfYear, lte: endOfYear }, status: 'COMPLETED' }
  });

  const income = transactions.filter(t => t.type === 'INCOME');
  const refund = transactions.filter(t => t.type === 'REFUND');
  const expense = transactions.filter(t => t.type === 'EXPENSE');

  console.log("INCOME:", income.length, "total:", income.reduce((sum, t) => sum + t.amount, 0));
  if (income.length > 0) console.log("Example INCOME:", income[0]);

  console.log("REFUND:", refund.length, "total:", refund.reduce((sum, t) => sum + t.amount, 0));
  if (refund.length > 0) console.log("Example REFUND:", refund[0]);

  console.log("EXPENSE:", expense.length, "total:", expense.reduce((sum, t) => sum + t.amount, 0));
  if (expense.length > 0) console.log("Example EXPENSE:", expense[0]);

  const revenues = await prisma.revenueRecord.findMany({
    where: { date: { gte: startOfYear, lte: endOfYear }, paymentStatus: 'COMPLETED' }
  });
  console.log("RevenueRecord COMPLETED:", revenues.length, "total:", revenues.reduce((sum, r) => sum + r.amount, 0));
}

main().catch(console.error).finally(() => prisma.$disconnect());
