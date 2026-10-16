import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const expenses = await prisma.expense.findMany({
    include: { category: true }
  });
  console.log(`Total Expense records count: ${expenses.length}`);
  console.log('Expenses:', JSON.stringify(expenses, null, 2));

  const financialTransactionsExpenses = await prisma.financialTransaction.findMany({
    where: { type: 'EXPENSE' }
  });
  console.log(`FinancialTransactions EXPENSE count: ${financialTransactionsExpenses.length}`);
  console.log('FinancialTransaction Expenses:', JSON.stringify(financialTransactionsExpenses, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
