const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const email = 'e2e@utctravel.com';
  const hashedPassword = await bcrypt.hash('password123', 10);

  let user = await prisma.user.findUnique({ where: { email } });
  
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        
        roleId: (await prisma.role.findFirst({ where: { name: 'CEO' } }))?.id || null
      }
    });

    await prisma.employee.create({
        data: {
            userId: user.id,
            firstName: 'E2E',
            lastName: 'Admin',
            email: email, employeeId: 'EMP-E2E',
            phone: '000000',
            status: 'ACTIVE'
        }
    })
    console.log('Test user created.');
  } else {
    // Force update password just in case
    await prisma.user.update({
        where: { email },
        data: { passwordHash: hashedPassword }
    });
    console.log('Test user updated.');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
