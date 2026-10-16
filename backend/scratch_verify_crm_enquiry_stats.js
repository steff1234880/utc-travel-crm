const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runCrmStatsTest() {
  console.log('=== TEST: CRM ENQUIRY DASHBOARD STATS CONSISTENCY ===\n');

  // Clean up any test records created previously
  await prisma.followUp.deleteMany({ where: { notes: { startsWith: 'TEST-CRM-STAT-' } } });
  await prisma.enquiry.deleteMany({ where: { referenceNumber: { startsWith: 'CRM-TEST-' } } });

  // Helper function mimicking crmEnquiryController getDashboardStats query
  async function fetchCrmStats() {
    const [total, newEnquiries, pendingFollowUps, converted] = await Promise.all([
      prisma.enquiry.count(),
      prisma.enquiry.count({ where: { status: 'NEW' } }),
      prisma.followUp.count({
        where: {
          status: 'PENDING',
          scheduledFor: { lte: new Date() },
          enquiryId: { not: null },
          enquiry: { isNot: null }
        }
      }),
      prisma.enquiry.count({ where: { status: 'CONVERTED' } }),
    ]);
    return { total, newEnquiries, pendingFollowUps, converted };
  }

  // Step 1: Current Database State
  const stats1 = await fetchCrmStats();
  console.log('Step 1: Current PostgreSQL Database State');
  console.log(`  Total Enquiries: ${stats1.total}`);
  console.log(`  Pending Follow-ups: ${stats1.pendingFollowUps}`);
  console.log(`  -> Match Expected (Total = 0, Pending = 0): ${stats1.total === 0 && stats1.pendingFollowUps === 0 ? 'PASS' : 'FAIL'}`);

  // Step 2: Create 1 Valid Enquiry + 1 Pending Follow-up
  const customer = await prisma.customer.findFirst() || await prisma.customer.create({
    data: { firstName: 'CRM', lastName: 'Test', email: 'crmtest@example.com' }
  });
  const employee = await prisma.employee.findFirst();

  const enq1 = await prisma.enquiry.create({
    data: {
      referenceNumber: 'CRM-TEST-001',
      customerId: customer.id,
      message: 'CRM Test Enquiry 1',
      status: 'NEW',
      source: 'WEBSITE'
    }
  });

  const fu1 = await prisma.followUp.create({
    data: {
      enquiryId: enq1.id,
      employeeId: employee.id,
      type: 'CALL',
      notes: 'TEST-CRM-STAT-1',
      scheduledFor: new Date(Date.now() - 3600000), // 1 hour ago (scheduled <= current date)
      status: 'PENDING'
    }
  });

  const stats2 = await fetchCrmStats();
  console.log('\nStep 2: Created 1 Valid Enquiry + 1 Pending Follow-up');
  console.log(`  Total Enquiries: ${stats2.total}`);
  console.log(`  Pending Follow-ups: ${stats2.pendingFollowUps}`);
  console.log(`  -> Match Expected (Total = 1, Pending = 1): ${stats2.total === 1 && stats2.pendingFollowUps === 1 ? 'PASS' : 'FAIL'}`);

  // Step 3: Add 2nd Pending Follow-up to Enquiry 1
  const fu2 = await prisma.followUp.create({
    data: {
      enquiryId: enq1.id,
      employeeId: employee.id,
      type: 'EMAIL',
      notes: 'TEST-CRM-STAT-2',
      scheduledFor: new Date(Date.now() - 1800000), // 30 min ago
      status: 'PENDING'
    }
  });

  const stats3 = await fetchCrmStats();
  console.log('\nStep 3: Added 2nd Pending Follow-up for Enquiry 1');
  console.log(`  Total Enquiries: ${stats3.total}`);
  console.log(`  Pending Follow-ups: ${stats3.pendingFollowUps}`);
  console.log(`  -> Match Expected (Total = 1, Pending = 2): ${stats3.total === 1 && stats3.pendingFollowUps === 2 ? 'PASS' : 'FAIL'}`);

  // Cleanup test records
  await prisma.followUp.deleteMany({ where: { notes: { startsWith: 'TEST-CRM-STAT-' } } });
  await prisma.enquiry.deleteMany({ where: { referenceNumber: { startsWith: 'CRM-TEST-' } } });

  const statsFinal = await fetchCrmStats();
  console.log('\nStep 4: After Cleanup');
  console.log(`  Total Enquiries: ${statsFinal.total}`);
  console.log(`  Pending Follow-ups: ${statsFinal.pendingFollowUps}`);
  console.log(`  -> Final Verification (Total = 0, Pending = 0): ${statsFinal.total === 0 && statsFinal.pendingFollowUps === 0 ? 'PASS' : 'FAIL'}`);
}

runCrmStatsTest().catch(console.error).finally(() => prisma.$disconnect());
