const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runTest() {
  console.log('=== TEST 1: Inspecting current Expense records in PostgreSQL ===');
  
  let expenses = await prisma.expense.findMany({
    where: { status: { notIn: ['CANCELLED', 'REJECTED'] } }
  });
  console.log(`Current active Expense records count: ${expenses.length}`);
  expenses.forEach(e => console.log(`- ID: ${e.id}, Num: ${e.expenseNumber}, Title: "${e.title}", Status: ${e.status}, Date: ${e.expenseDate.toISOString()}, totalAmount: ₹${e.totalAmount}`));

  const sumBefore = expenses.reduce((acc, e) => acc + e.totalAmount, 0);
  console.log(`Sum of active Expense records totalAmount: ₹${sumBefore.toFixed(2)}`);

  // Let's create or update 3 test expenses with known amounts: ₹1,000, ₹2,500, ₹500
  // First clean up any previous TEST-EXP- records if re-running
  await prisma.expense.deleteMany({
    where: { expenseNumber: { startsWith: 'TEST-EXP-' } }
  });

  const emp = await prisma.employee.findFirst();
  const cat = await prisma.expenseCategory.findFirst();

  console.log('\n=== TEST 2: Creating 3 Real Expenses (₹1,000, ₹2,500, ₹500) ===');
  const expA = await prisma.expense.create({
    data: {
      expenseNumber: 'TEST-EXP-A',
      title: 'Expense A - Office Supplies',
      expenseDate: new Date('2026-09-10'),
      status: 'APPROVED',
      amount: 1000,
      taxableAmount: 1000,
      totalAmount: 1000,
      categoryId: cat.id,
      createdById: emp.id
    }
  });

  const expB = await prisma.expense.create({
    data: {
      expenseNumber: 'TEST-EXP-B',
      title: 'Expense B - Travel Ticket',
      expenseDate: new Date('2026-09-15'),
      status: 'PAID',
      amount: 2500,
      taxableAmount: 2500,
      totalAmount: 2500,
      categoryId: cat.id,
      createdById: emp.id
    }
  });

  const expC = await prisma.expense.create({
    data: {
      expenseNumber: 'TEST-EXP-C',
      title: 'Expense C - Refreshments',
      expenseDate: new Date('2026-09-20'),
      status: 'SUBMITTED',
      amount: 500,
      taxableAmount: 500,
      totalAmount: 500,
      categoryId: cat.id,
      createdById: emp.id
    }
  });

  console.log(`Created Exp A: ₹${expA.totalAmount}, Exp B: ₹${expB.totalAmount}, Exp C: ₹${expC.totalAmount}`);

  // Fetch active expenses in Sep 2026
  const activeSep2026 = await prisma.expense.findMany({
    where: {
      expenseDate: { gte: new Date('2026-09-01T00:00:00Z'), lte: new Date('2026-09-30T23:59:59Z') },
      status: { notIn: ['CANCELLED', 'REJECTED'] }
    }
  });

  const totalSep2026 = activeSep2026.reduce((acc, e) => acc + e.totalAmount, 0);
  console.log(`\nActive Expenses in Sep 2026 in PostgreSQL (Count: ${activeSep2026.length}): ₹${totalSep2026.toFixed(2)}`);

  console.log('\n=== TEST 3: Cancelling Expense C (₹500) ===');
  await prisma.expense.update({
    where: { id: expC.id },
    data: { status: 'CANCELLED' }
  });

  const activeAfterCancel = await prisma.expense.findMany({
    where: {
      expenseDate: { gte: new Date('2026-09-01T00:00:00Z'), lte: new Date('2026-09-30T23:59:59Z') },
      status: { notIn: ['CANCELLED', 'REJECTED'] }
    }
  });
  const totalAfterCancel = activeAfterCancel.reduce((acc, e) => acc + e.totalAmount, 0);
  console.log(`Active Expenses in Sep 2026 after cancelling Exp C (Count: ${activeAfterCancel.length}): ₹${totalAfterCancel.toFixed(2)}`);

  // Clean up test records
  await prisma.expense.deleteMany({
    where: { expenseNumber: { startsWith: 'TEST-EXP-' } }
  });
  console.log('\nTest cleanup complete.');
}

runTest().catch(console.error).finally(() => prisma.$disconnect());
