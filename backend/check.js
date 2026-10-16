const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
prisma.salesPipelineStage.findMany().then(r => console.log(JSON.stringify(r))).catch(console.error).finally(() => prisma.$disconnect());
