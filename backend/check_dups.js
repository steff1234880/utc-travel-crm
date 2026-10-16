const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDuplicates() {
  const currentYear = new Date().getFullYear();
  const startOfYear = new Date(currentYear, 0, 1);
  const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);

  const allRevenues = await prisma.revenueRecord.findMany({
    where: {
      date: { gte: startOfYear, lte: endOfYear }
    }
  });

  const completedRevenues = allRevenues.filter(r => r.paymentStatus === 'COMPLETED');
  const totalAmount = completedRevenues.reduce((sum, r) => sum + r.amount, 0);

  // Check for duplicates by paymentId
  const paymentMap = new Map();
  const duplicates = [];

  allRevenues.forEach(r => {
    if (r.paymentId) {
      if (paymentMap.has(r.paymentId)) {
        duplicates.push({ id1: paymentMap.get(r.paymentId).id, id2: r.id, paymentId: r.paymentId });
      } else {
        paymentMap.set(r.paymentId, r);
      }
    }
  });

  // Also check if any FinancialTransaction has amount that matches but isn't a payment?
  
  console.log("Total current year revenues:", allRevenues.length);
  console.log("Completed revenues count:", completedRevenues.length);
  console.log("Total completed amount:", totalAmount);
  console.log("Duplicate paymentId records:", duplicates.length > 0 ? duplicates : "None");
}

checkDuplicates().catch(console.error).finally(() => prisma.$disconnect());
