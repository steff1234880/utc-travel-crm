import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Check if HR_MANAGER role exists
  let hrRole = await prisma.role.findUnique({ where: { name: 'HR_MANAGER' } });
  
  if (!hrRole) {
    hrRole = await prisma.role.create({
      data: {
        name: 'HR_MANAGER',
        description: 'Human Resources Manager'
      }
    });
    console.log('Created HR_MANAGER role');
  } else {
    console.log('HR_MANAGER role already exists');
  }

  // Check if admin user exists
  let adminUser = await prisma.user.findUnique({ where: { email: 'admin@utctravel.com' } });
  
  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: {
        email: 'admin@utctravel.com',
        passwordHash: 'password', // In production, this should be bcrypt hashed
        roleId: hrRole.id,
        isActive: true
      }
    });
    console.log('Created admin@utctravel.com user');
  } else {
    // Ensure admin user has HR_MANAGER role
    adminUser = await prisma.user.update({
      where: { email: 'admin@utctravel.com' },
      data: { roleId: hrRole.id }
    });
    console.log('Updated admin@utctravel.com user to have HR_MANAGER role');
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
