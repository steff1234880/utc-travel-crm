import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const departments = [
    'Management',
    'HR',
    'Sales',
    'Operations',
    'Accounting',
    'Reservations',
    'Marketing'
  ];

  for (const dept of departments) {
    const existing = await prisma.department.findUnique({ where: { name: dept } });
    if (!existing) {
      await prisma.department.create({
        data: {
          name: dept,
          description: `${dept} Department`
        }
      });
      console.log(`Created department: ${dept}`);
    } else {
      console.log(`Department already exists: ${dept}`);
    }
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
