const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runCeoSalesTest() {
  console.log('=== TEST: CEO SALES ANALYTICS FOLLOW-UP PERFORMANCE CONSISTENCY ===\n');

  // Clean up any test records created previously
  await prisma.followUp.deleteMany({ where: { notes: { startsWith: 'CEO-SALES-TEST-' } } });
  await prisma.enquiry.deleteMany({ where: { referenceNumber: { startsWith: 'CEO-TEST-' } } });

  // Helper function mimicking the updated getSalesAnalytics followUpPerformance query
  async function fetchCeoFollowUpPerformance() {
    const validEnquiryFollowUpWhere = {
      status: { notIn: ['CANCELLED', 'DELETED'] },
      enquiryId: { not: null },
      enquiry: { isNot: null }
    };

    const totalFollowUps = await prisma.followUp.count({ where: validEnquiryFollowUpWhere });
    const completedFollowUps = await prisma.followUp.count({
      where: { ...validEnquiryFollowUpWhere, status: 'COMPLETED' }
    });
    const pendingFollowUps = await prisma.followUp.count({
      where: { ...validEnquiryFollowUpWhere, status: { in: ['PENDING', 'SCHEDULED'] } }
    });
    const overdueFollowUps = await prisma.followUp.count({
      where: { ...validEnquiryFollowUpWhere, status: 'PENDING', scheduledFor: { lt: new Date() } }
    });
    const completionRate = totalFollowUps > 0 ? Number(((completedFollowUps / totalFollowUps) * 100).toFixed(1)) : 0;

    return { totalFollowUps, completedFollowUps, pendingFollowUps, overdueFollowUps, completionRate };
  }

  // Step 1: Current State
  const perf1 = await fetchCeoFollowUpPerformance();
  const validEnquiriesCount = await prisma.enquiry.count();
  console.log('Step 1: Current PostgreSQL Database State');
  console.log(`  Valid Enquiries in DB: ${validEnquiriesCount}`);
  console.log(`  CEO Total Follow-ups: ${perf1.totalFollowUps}`);
  console.log(`  CEO Completed Follow-ups: ${perf1.completedFollowUps}`);
  console.log(`  CEO Pending Follow-ups: ${perf1.pendingFollowUps}`);
  console.log(`  CEO Completion %: ${perf1.completionRate}%`);
  console.log(`  -> Match Expected (Total = 0, Pending = 0, Completed = 0, Rate = 0%): ${perf1.totalFollowUps === 0 ? 'PASS' : 'FAIL'}`);

  // Step 2: Create 1 Valid Enquiry + Assign 1 Follow-up
  const customer = await prisma.customer.findFirst() || await prisma.customer.create({
    data: { firstName: 'CEO', lastName: 'Test', email: 'ceotest@example.com' }
  });
  const employee = await prisma.employee.findFirst();

  const enq = await prisma.enquiry.create({
    data: {
      referenceNumber: 'CEO-TEST-001',
      customerId: customer.id,
      message: 'CEO Test Enquiry 1',
      status: 'NEW',
      source: 'WEBSITE'
    }
  });

  const fu1 = await prisma.followUp.create({
    data: {
      enquiryId: enq.id,
      employeeId: employee.id,
      type: 'CALL',
      notes: 'CEO-SALES-TEST-1',
      scheduledFor: new Date('2026-09-30T10:00:00Z'),
      status: 'PENDING'
    }
  });

  const perf2 = await fetchCeoFollowUpPerformance();
  console.log('\nStep 2: Created 1 Valid Enquiry + 1 Assigned Follow-up');
  console.log(`  CEO Total Follow-ups: ${perf2.totalFollowUps}`);
  console.log(`  CEO Pending Follow-ups: ${perf2.pendingFollowUps}`);
  console.log(`  -> Match Expected (Total = 1): ${perf2.totalFollowUps === 1 ? 'PASS' : 'FAIL'}`);

  // Step 3: Create 2nd Follow-up for the same enquiry
  const fu2 = await prisma.followUp.create({
    data: {
      enquiryId: enq.id,
      employeeId: employee.id,
      type: 'EMAIL',
      notes: 'CEO-SALES-TEST-2',
      scheduledFor: new Date('2026-09-30T14:00:00Z'),
      status: 'COMPLETED'
    }
  });

  const perf3 = await fetchCeoFollowUpPerformance();
  console.log('\nStep 3: Created 2nd Follow-up (COMPLETED) for the same enquiry');
  console.log(`  CEO Total Follow-ups: ${perf3.totalFollowUps}`);
  console.log(`  CEO Completed Follow-ups: ${perf3.completedFollowUps}`);
  console.log(`  CEO Pending Follow-ups: ${perf3.pendingFollowUps}`);
  console.log(`  CEO Completion %: ${perf3.completionRate}%`);
  console.log(`  -> Match Expected (Total = 2, Completed = 1, Pending = 1, Rate = 50%): ${perf3.totalFollowUps === 2 && perf3.completedFollowUps === 1 && perf3.pendingFollowUps === 1 ? 'PASS' : 'FAIL'}`);

  // Step 4: Delete the Enquiry (testing orphaned follow-ups behavior)
  await prisma.enquiry.delete({
    where: { id: enq.id }
  });

  const perf4 = await fetchCeoFollowUpPerformance();
  console.log('\nStep 4: Deleted Enquiry (Follow-ups are now orphaned/cascade-deleted)');
  console.log(`  CEO Total Follow-ups: ${perf4.totalFollowUps}`);
  console.log(`  CEO Pending Follow-ups: ${perf4.pendingFollowUps}`);
  console.log(`  CEO Completed Follow-ups: ${perf4.completedFollowUps}`);
  console.log(`  -> Final Verification (Total = 0): ${perf4.totalFollowUps === 0 ? 'PASS' : 'FAIL'}`);

  // Clean up any remaining test records
  await prisma.followUp.deleteMany({ where: { notes: { startsWith: 'CEO-SALES-TEST-' } } });
  await prisma.enquiry.deleteMany({ where: { referenceNumber: { startsWith: 'CEO-TEST-' } } });
}

runCeoSalesTest().catch(console.error).finally(() => prisma.$disconnect());
