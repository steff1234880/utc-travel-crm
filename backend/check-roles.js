const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const users = await prisma.user.findMany({ include: { role: true } });
  users.forEach(u => {
    console.log(u.email, '->', u.role ? u.role.name : 'NO ROLE');
  });
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
