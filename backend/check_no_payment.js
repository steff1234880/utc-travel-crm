const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkNoPaymentId() {
  const currentYear = new Date().getFullYear();
  const startOfYear = new Date(currentYear, 0, 1);
  const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);

  const allRevenues = await prisma.revenueRecord.findMany({
    where: {
      date: { gte: startOfYear, lte: endOfYear }
    }
  });

  const noPaymentId = allRevenues.filter(r => !r.paymentId);
  console.log("Revenues without paymentId:", noPaymentId.length);
  if (noPaymentId.length > 0) {
    console.log(noPaymentId);
  }
}

checkNoPaymentId().catch(console.error).finally(() => prisma.$disconnect());
