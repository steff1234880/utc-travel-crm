const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const revs = await prisma.revenueRecord.findMany();
  console.log("Revenues:", revs);
  
  const payments = await prisma.customerPayment.findMany();
  console.log("Payments:", payments);
}
main().catch(console.error).finally(()=>prisma.$disconnect());
