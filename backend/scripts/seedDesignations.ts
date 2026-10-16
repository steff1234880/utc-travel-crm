import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const mappings = [
    { dept: 'Management', designations: ['Managing Director', 'CEO', 'General Manager'] },
    { dept: 'HR', designations: ['HR Manager', 'HR Executive'] },
    { dept: 'Sales', designations: ['Sales Manager', 'Sales Executive', 'Senior Travel Consultant', 'Travel Consultant'] },
    { dept: 'Operations', designations: ['Operations Manager', 'Operations Executive'] },
    { dept: 'Accounting', designations: ['Accountant'] },
    { dept: 'Reservations', designations: ['Reservation Manager', 'Reservation Executive'] },
    { dept: 'Marketing', designations: ['Marketing Manager', 'Marketing Executive'] },
    { dept: 'General', designations: ['Other'] }
  ];

  for (const group of mappings) {
    let department = await prisma.department.findUnique({ where: { name: group.dept } });
    
    if (!department) {
      department = await prisma.department.create({
        data: { name: group.dept, description: `${group.dept} Department` }
      });
      console.log(`Created missing department: ${group.dept}`);
    }

    for (const name of group.designations) {
      const existing = await prisma.designation.findFirst({
        where: { name, departmentId: department.id }
      });

      if (!existing) {
        await prisma.designation.create({
          data: { name, departmentId: department.id }
        });
        console.log(`Created designation: ${name} in ${group.dept}`);
      } else {
        console.log(`Designation already exists: ${name} in ${group.dept}`);
      }
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
