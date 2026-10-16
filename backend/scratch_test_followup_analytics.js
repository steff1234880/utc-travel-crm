const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runTest() {
  console.log('=== FOLLOW-UP ANALYTICS TEST ===');
  
  // Find a test employee, e.g., 'John Doe' (EMP-001) or first employee
  const employee = await prisma.employee.findFirst({
    where: { firstName: { contains: 'John' } }
  }) || await prisma.employee.findFirst();

  console.log(`Test Employee: ${employee.firstName} ${employee.lastName} (${employee.id})`);

  const customer = await prisma.customer.findFirst() || await prisma.customer.create({
    data: {
      firstName: 'Test',
      lastName: 'Customer',
      email: 'testcustomer@example.com'
    }
  });

  // Clean up any test followups/enquiries created previously with prefix TEST-FOLLOWUP-
  await prisma.followUp.deleteMany({
    where: { notes: { startsWith: 'TEST-FOLLOWUP-' } }
  });
  await prisma.enquiry.deleteMany({
    where: { referenceNumber: { startsWith: 'ENQ-TEST-' } }
  });

  // Step 1: Create 2 different enquiries
  const enquiry1 = await prisma.enquiry.create({
    data: {
      referenceNumber: 'ENQ-TEST-001',
      customerId: customer.id,
      message: 'TEST-ENQUIRY-1',
      status: 'NEW',
      source: 'WEBSITE'
    }
  });

  const enquiry2 = await prisma.enquiry.create({
    data: {
      referenceNumber: 'ENQ-TEST-002',
      customerId: customer.id,
      message: 'TEST-ENQUIRY-2',
      status: 'NEW',
      source: 'DIRECT'
    }
  });

  // Assign enquiry1 and enquiry2 to employee
  await prisma.enquiryAssignment.createMany({
    data: [
      { enquiryId: enquiry1.id, employeeId: employee.id },
      { enquiryId: enquiry2.id, employeeId: employee.id }
    ]
  });

  console.log(`Created 2 Enquiries: "${enquiry1.referenceNumber}" & "${enquiry2.referenceNumber}", assigned to ${employee.firstName}`);

  // Step 2: Create 1 PENDING follow-up for Enquiry 1 and 1 PENDING follow-up for Enquiry 2
  const fu1 = await prisma.followUp.create({
    data: {
      enquiryId: enquiry1.id,
      employeeId: employee.id,
      type: 'CALL',
      notes: 'TEST-FOLLOWUP-1 for Enquiry 1',
      scheduledFor: new Date('2026-09-29T10:00:00Z'),
      status: 'PENDING'
    }
  });

  const fu2 = await prisma.followUp.create({
    data: {
      enquiryId: enquiry2.id,
      employeeId: employee.id,
      type: 'EMAIL',
      notes: 'TEST-FOLLOWUP-2 for Enquiry 2',
      scheduledFor: new Date('2026-09-29T14:00:00Z'),
      status: 'PENDING'
    }
  });

  console.log(`Created 2 PENDING Follow-ups for 2 different enquiries.`);

  // Query follow-ups for employee
  let followUps = await prisma.followUp.findMany({
    where: {
      status: { notIn: ['CANCELLED', 'DELETED'] },
      OR: [
        { employeeId: employee.id },
        { enquiry: { assignments: { some: { employeeId: employee.id } } } }
      ]
    }
  });

  let testFollowUps = followUps.filter(f => f.notes && f.notes.startsWith('TEST-FOLLOWUP-'));
  let totalCount = testFollowUps.length;
  let completedCount = testFollowUps.filter(f => f.status === 'COMPLETED').length;
  let pendingCount = testFollowUps.filter(f => f.status === 'PENDING').length;

  console.log(`\n--- Verification 1 (2 PENDING Follow-ups across 2 Enquiries) ---`);
  console.log(`Total Test Follow-up Count: ${totalCount} (Expected: 2)`);
  console.log(`Completed Follow-ups: ${completedCount} (Expected: 0)`);
  console.log(`Pending Follow-ups: ${pendingCount} (Expected: 2)`);

  // Step 3: Complete 1 follow-up (fu1)
  console.log('\n--- Action: Completing Follow-up 1 ---');
  await prisma.followUp.update({
    where: { id: fu1.id },
    data: { status: 'COMPLETED' }
  });

  followUps = await prisma.followUp.findMany({
    where: {
      status: { notIn: ['CANCELLED', 'DELETED'] },
      OR: [
        { employeeId: employee.id },
        { enquiry: { assignments: { some: { employeeId: employee.id } } } }
      ]
    }
  });
  testFollowUps = followUps.filter(f => f.notes && f.notes.startsWith('TEST-FOLLOWUP-'));
  totalCount = testFollowUps.length;
  completedCount = testFollowUps.filter(f => f.status === 'COMPLETED').length;
  pendingCount = testFollowUps.filter(f => f.status === 'PENDING').length;

  console.log(`\n--- Verification 2 (1 COMPLETED, 1 PENDING) ---`);
  console.log(`Total Test Follow-up Count: ${totalCount} (Expected: 2)`);
  console.log(`Completed Follow-ups: ${completedCount} (Expected: 1)`);
  console.log(`Pending Follow-ups: ${pendingCount} (Expected: 1)`);

  // Step 4: Add 3rd follow-up (COMPLETED) for Enquiry 1
  console.log('\n--- Action: Adding 3rd Follow-up (COMPLETED) for Enquiry 1 ---');
  const fu3 = await prisma.followUp.create({
    data: {
      enquiryId: enquiry1.id,
      employeeId: employee.id,
      type: 'WHATSAPP',
      notes: 'TEST-FOLLOWUP-3 for Enquiry 1',
      scheduledFor: new Date('2026-09-30T10:00:00Z'),
      status: 'COMPLETED'
    }
  });

  followUps = await prisma.followUp.findMany({
    where: {
      status: { notIn: ['CANCELLED', 'DELETED'] },
      OR: [
        { employeeId: employee.id },
        { enquiry: { assignments: { some: { employeeId: employee.id } } } }
      ]
    }
  });
  testFollowUps = followUps.filter(f => f.notes && f.notes.startsWith('TEST-FOLLOWUP-'));
  totalCount = testFollowUps.length;
  completedCount = testFollowUps.filter(f => f.status === 'COMPLETED').length;
  pendingCount = testFollowUps.filter(f => f.status === 'PENDING').length;

  console.log(`\n--- Verification 3 (2 COMPLETED, 1 PENDING) ---`);
  console.log(`Total Test Follow-up Count: ${totalCount} (Expected: 3)`);
  console.log(`Completed Follow-ups: ${completedCount} (Expected: 2)`);
  console.log(`Pending Follow-ups: ${pendingCount} (Expected: 1)`);

  // Cleanup test records
  await prisma.followUp.deleteMany({
    where: { notes: { startsWith: 'TEST-FOLLOWUP-' } }
  });
  await prisma.enquiry.deleteMany({
    where: { referenceNumber: { startsWith: 'ENQ-TEST-' } }
  });
  console.log('\nCleaned up test records successfully.');
}

runTest().catch(console.error).finally(() => prisma.$disconnect());
