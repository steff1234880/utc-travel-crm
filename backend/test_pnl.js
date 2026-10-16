const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const revs = await prisma.revenueRecord.findMany({ select: { revenueType: true }, distinct: ['revenueType'] });
  console.log("Distinct revenueTypes:", revs);
  
  const expCats = await prisma.expenseCategory.findMany();
  console.log("Expense Categories:", expCats);
}
main().catch(console.error).finally(()=>prisma.$disconnect());
