const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const stages = [
    { name: 'New', orderIndex: 0, color: '#3B82F6', isDefault: true },
    { name: 'Contacted', orderIndex: 1, color: '#EAB308', isDefault: false },
    { name: 'Qualified', orderIndex: 2, color: '#F97316', isDefault: false },
    { name: 'Proposal Sent', orderIndex: 3, color: '#A855F7', isDefault: false },
    { name: 'Negotiation', orderIndex: 4, color: '#14B8A6', isDefault: false },
    { name: 'Won', orderIndex: 5, color: '#22C55E', isDefault: false },
    { name: 'Lost', orderIndex: 6, color: '#EF4444', isDefault: false },
  ];

  for (const stage of stages) {
    await prisma.salesPipelineStage.upsert({
      where: { name: stage.name },
      update: stage,
      create: stage
    });
  }

  console.log('Pipeline stages seeded successfully.');
}

run()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
