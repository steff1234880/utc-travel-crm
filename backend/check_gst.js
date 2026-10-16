const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const g = await prisma.gSTRecord.aggregate({ _sum: { totalGst: true } });
  console.log('totalGst:', g._sum.totalGst);
  
  const r = await prisma.revenueRecord.aggregate({
    _sum: { amount: true },
    where: { gstStatus: 'GST_INCLUDED' }
  });
  console.log('rev amount:', r._sum.amount);
  
  const c = await prisma.financialTransaction.aggregate({
    _sum: { amount: true },
    where: { type: 'INCOME', status: 'COMPLETED' }
  });
  console.log('income amount:', c._sum.amount);
  
  const allInc = await prisma.financialTransaction.findMany({
    where: { type: 'INCOME', status: 'COMPLETED' },
    select: { id: true, amount: true, gstCollected: true, date: true, reference: true }
  });
  console.log('All incomes:', allInc);
  
  const allGstRecords = await prisma.gSTRecord.findMany({});
  console.log('All GST Records:', allGstRecords);
  
  const allRevRecords = await prisma.revenueRecord.findMany({});
  console.log('All Revenue Records:', allRevRecords);
}

run().finally(() => prisma.$disconnect());
