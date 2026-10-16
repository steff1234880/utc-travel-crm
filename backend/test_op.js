const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const opCosts = await prisma.operationalCost.findMany();
  console.log("Operational Costs count:", opCosts.length);
  console.log("Operational Costs:", opCosts);
}
main().catch(console.error).finally(()=>prisma.$disconnect());
