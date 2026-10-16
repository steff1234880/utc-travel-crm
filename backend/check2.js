const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
prisma.auditLog.findMany({ where: { action: 'LEAD_WON' } })
  .then(r => console.log(JSON.stringify(r)))
  .catch(console.error)
  .finally(() => prisma.$disconnect());
