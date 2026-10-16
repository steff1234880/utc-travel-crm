const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const admin = await prisma.user.findFirst({
    where: { email: 'admin@utctravel.com' },
    include: { employee: true }
  });
  console.log('Before update:', admin.employee ? admin.employee.firstName : 'No employee');
  
  const payload = {
    firstName: 'AdminTest',
    lastName: 'Test',
    emergencyContact: '999999999',
    profilePhoto: 'http://example.com/avatar.jpg'
  };
  
  if (admin.employee) {
    await prisma.employee.update({
      where: { id: admin.employee.id },
      data: payload
    });
  } else {
    await prisma.employee.create({
      data: {
        userId: admin.id,
        employeeId: 'ADM-123456',
        ...payload
      }
    });
  }
  
  const adminAfter = await prisma.user.findFirst({
    where: { email: 'admin@utctravel.com' },
    include: { employee: true }
  });
  console.log('After update:', adminAfter.employee.firstName, adminAfter.employee.emergencyContact);
}
run();
