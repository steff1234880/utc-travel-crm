const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function main() {
  const wonStage = await prisma.salesPipelineStage.findFirst({ where: { name: 'Won' } });
  const lead = await prisma.salesLead.findFirst({ include: { pipelineStage: true } });
  const user = await prisma.user.findFirst();
  
  if (!lead || !wonStage || !user) {
    console.log("No lead or stage or user found");
    return;
  }
  
  console.log("Updating lead to won...");
  
  // Simulate the API call handler logic:
  const updatedLead = await prisma.$transaction(async (tx) => {
      const l = await tx.salesLead.update({
        where: { id: lead.id },
        data: { pipelineStageId: wonStage.id },
        include: { pipelineStage: true }
      });
      
      if (l.pipelineStage?.name === 'Won') {
        const existingWonLog = await tx.auditLog.findFirst({
          where: { recordId: l.id, action: 'LEAD_WON' }
        });
        if (!existingWonLog) {
          await tx.auditLog.create({
            data: {
              userId: user.id,
              userEmail: user.email,
              action: 'LEAD_WON',
              module: 'CRM',
              recordId: l.id,
              details: `Lead stage changed to Won`
            }
          });
        }
      }
      return l;
  });
  
  const logs = await prisma.auditLog.findMany({ where: { recordId: lead.id, action: 'LEAD_WON' } });
  console.log("AuditLogs for this lead:", logs);
}
main().catch(console.error).finally(() => prisma.$disconnect());
