const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const expenses = await prisma.expense.findMany();
  console.log("Expenses count:", expenses.length);
  console.log("Expenses:", expenses);
}
main().catch(console.error).finally(()=>prisma.$disconnect());
