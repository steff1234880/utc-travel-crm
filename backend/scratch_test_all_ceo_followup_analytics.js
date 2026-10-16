const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runAllTests() {
  console.log('=== FULL TEST SUITE: CEO SALES & EMPLOYEE FOLLOW-UP ANALYTICS ===\n');

  // Clean up any test records created previously
  await prisma.followUp.deleteMany({ where: { notes: { startsWith: 'CEO-ALL-TEST-' } } });
  await prisma.enquiry.deleteMany({ where: { referenceNumber: { startsWith: 'CEO-ALL-' } } });

  // Get 2 existing employees from DB
  const employees = await prisma.employee.findMany();
  let empA = employees[0];
  let empB = employees[1] || employees[0];

  let customer = await prisma.customer.findFirst() || await prisma.customer.create({
    data: { firstName: 'AllCEO', lastName: 'Test', email: 'allceo@example.com' }
  });

  // Helper to query Sales Analytics follow-up performance card total
  async function getSalesFollowUpsCardTotal() {
    const validEnquiryFollowUpWhere = {
      status: { notIn: ['CANCELLED', 'DELETED'] },
      enquiryId: { not: null },
      enquiry: { isNot: null }
    };
    return await prisma.followUp.count({ where: validEnquiryFollowUpWhere });
  }

  // Helper to query employee-level follow-up performance for a given employee
  async function getEmployeeFollowUpsCount(empId) {
    const followUpWhere = {
      status: { notIn: ['CANCELLED', 'DELETED'] },
      enquiryId: { not: null },
      enquiry: { isNot: null },
      OR: [
        { employeeId: empId },
        { enquiry: { assignments: { some: { employeeId: empId } } } }
      ]
    };
    const rawFollowUps = await prisma.followUp.findMany({ where: followUpWhere });
    const followUpMap = new Map();
    rawFollowUps.forEach(f => followUpMap.set(f.id, f));
    return Array.from(followUpMap.values()).length;
  }

  // --------------------------------------------------------------------------
  // TEST 1: Current data (Valid Enquiries = 0)
  // --------------------------------------------------------------------------
  console.log('--- TEST 1: Current Data (Valid Enquiries = 0) ---');
  const validEnquiries0 = await prisma.enquiry.count();
  const salesFollowUps1 = await getSalesFollowUpsCardTotal();
  const empAFollowUps1 = await getEmployeeFollowUpsCount(empA.id);

  console.log(`  Valid Enquiries in DB: ${validEnquiries0}`);
  console.log(`  Sales Analytics Total Follow-ups: ${salesFollowUps1} (Expected: 0)`);
  console.log(`  Employee A (${empA.firstName}) Follow-ups: ${empAFollowUps1} (Expected: 0)`);
  console.log(`  -> TEST 1 Status: ${salesFollowUps1 === 0 && empAFollowUps1 === 0 ? 'PASS' : 'FAIL'}`);

  // --------------------------------------------------------------------------
  // TEST 2: Create 1 valid Enquiry + 1 Follow-up assigned to Employee A
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 2: Create 1 valid Enquiry + 1 Follow-up for Employee A ---');
  const enq1 = await prisma.enquiry.create({
    data: {
      referenceNumber: 'CEO-ALL-001',
      customerId: customer.id,
      message: 'CEO All Test 1',
      status: 'NEW',
      source: 'WEBSITE'
    }
  });

  const fu1 = await prisma.followUp.create({
    data: {
      enquiryId: enq1.id,
      employeeId: empA.id,
      type: 'CALL',
      notes: 'CEO-ALL-TEST-1',
      scheduledFor: new Date('2026-09-30T10:00:00Z'),
      status: 'PENDING'
    }
  });

  const salesFollowUps2 = await getSalesFollowUpsCardTotal();
  const empAFollowUps2 = await getEmployeeFollowUpsCount(empA.id);

  console.log(`  Sales Analytics Total Follow-ups: ${salesFollowUps2} (Expected: 1)`);
  console.log(`  Employee A (${empA.firstName}) Follow-ups: ${empAFollowUps2} (Expected: 1)`);
  console.log(`  -> TEST 2 Status: ${salesFollowUps2 === 1 && empAFollowUps2 === 1 ? 'PASS' : 'FAIL'}`);

  // --------------------------------------------------------------------------
  // TEST 3: Create 2nd Follow-up for the same Enquiry and same Employee A
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 3: Create 2nd Follow-up for same Enquiry & Employee A ---');
  const fu2 = await prisma.followUp.create({
    data: {
      enquiryId: enq1.id,
      employeeId: empA.id,
      type: 'EMAIL',
      notes: 'CEO-ALL-TEST-2',
      scheduledFor: new Date('2026-09-30T14:00:00Z'),
      status: 'COMPLETED'
    }
  });

  const salesFollowUps3 = await getSalesFollowUpsCardTotal();
  const empAFollowUps3 = await getEmployeeFollowUpsCount(empA.id);

  console.log(`  Sales Analytics Total Follow-ups: ${salesFollowUps3} (Expected: 2)`);
  console.log(`  Employee A (${empA.firstName}) Follow-ups: ${empAFollowUps3} (Expected: 2)`);
  console.log(`  -> TEST 3 Status: ${salesFollowUps3 === 2 && empAFollowUps3 === 2 ? 'PASS' : 'FAIL'}`);

  // --------------------------------------------------------------------------
  // TEST 4: Assign 1 valid Follow-up to Employee B (for a 2nd Enquiry)
  // --------------------------------------------------------------------------
  console.log(`\n--- TEST 4: Assign 1 valid Follow-up to Employee B (${empB.firstName}) ---`);

  const enq2 = await prisma.enquiry.create({
    data: {
      referenceNumber: 'CEO-ALL-002',
      customerId: customer.id,
      message: 'CEO All Test 2',
      status: 'NEW',
      source: 'DIRECT'
    }
  });

  const fu3 = await prisma.followUp.create({
    data: {
      enquiryId: enq2.id,
      employeeId: empB.id,
      type: 'WHATSAPP',
      notes: 'CEO-ALL-TEST-3',
      scheduledFor: new Date('2026-09-30T16:00:00Z'),
      status: 'PENDING'
    }
  });

  const salesFollowUps4 = await getSalesFollowUpsCardTotal();
  const empAFollowUps4 = await getEmployeeFollowUpsCount(empA.id);
  const empBFollowUps4 = await getEmployeeFollowUpsCount(empB.id);

  console.log(`  Total Sales Analytics Follow-ups: ${salesFollowUps4} (Expected: 3)`);
  console.log(`  Employee A (${empA.firstName}) Follow-ups: ${empAFollowUps4} (Expected: 2)`);
  console.log(`  Employee B (${empB.firstName}) Follow-ups: ${empBFollowUps4} (Expected: 1)`);
  console.log(`  -> TEST 4 Status: ${salesFollowUps4 === 3 && empAFollowUps4 === 2 && empBFollowUps4 === 1 ? 'PASS' : 'FAIL'}`);

  // Cleanup test records
  await prisma.followUp.deleteMany({ where: { notes: { startsWith: 'CEO-ALL-TEST-' } } });
  await prisma.enquiry.deleteMany({ where: { referenceNumber: { startsWith: 'CEO-ALL-' } } });

  console.log('\nCleaned up test records successfully.');
}

runAllTests().catch(console.error).finally(() => prisma.$disconnect());
