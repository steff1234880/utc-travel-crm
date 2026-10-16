import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function inspect() {
  console.log('--- Inspecting Database Data ---');

  const [txCount, cpCount, revCount, expCount, refundCount] = await Promise.all([
    prisma.financialTransaction.count(),
    prisma.customerPayment.count(),
    prisma.revenueRecord.count(),
    prisma.expense.count(),
    prisma.refund.count()
  ]);

  console.log({
    financialTransactions: txCount,
    customerPayments: cpCount,
    revenueRecords: revCount,
    expenses: expCount,
    refunds: refundCount
  });

  const sampleTx = await prisma.financialTransaction.findMany({
    take: 10,
    include: { customerPayment: { include: { customer: true } }, gstRecord: true }
  });

  console.log('Sample Financial Transactions:', JSON.stringify(sampleTx, null, 2));

  const sampleRev = await prisma.revenueRecord.findMany({
    take: 10,
    include: { customer: true }
  });

  console.log('Sample Revenue Records:', JSON.stringify(sampleRev, null, 2));
}

inspect().catch(console.error).finally(() => prisma.$disconnect());
