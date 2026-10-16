const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 
async function main() { 
  const salesActs = await prisma.salesActivity.findMany({take: 5, orderBy: {createdAt: 'desc'}}); 
  console.log("Sales Activities:", JSON.stringify(salesActs, null, 2)); 
} 
main().catch(console.error).finally(()=>prisma.$disconnect());
