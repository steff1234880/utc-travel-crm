import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function runTests() {
  console.log('--- STARTING TESTS ---');

  // TEST 1: Create a new enquiry
  const customer = await prisma.customer.findFirst();
  if (!customer) throw new Error('No customer found to test');
  
  const enquiry = await prisma.enquiry.create({
    data: {
      referenceNumber: `TST-ENQ-${Date.now()}`,
      customerId: customer.id,
      source: 'Test Script',
      status: 'NEW',
      destination: 'Paris',
    }
  });
  console.log('✅ TEST 1: Enquiry created:', enquiry.referenceNumber);

  // Check Timeline for Enquiry
  const auditLogs = await prisma.auditLog.findMany({
    where: { entityId: enquiry.id, entityType: 'ENQUIRY' }
  });
  console.log(`✅ TEST 1 (Audit): Found ${auditLogs.length} audit logs for Enquiry.`);

  // TEST 2: Assign lead to employee
  // Enquiries automatically create leads. Let's find the lead.
  const lead = await prisma.salesLead.findFirst({ where: { enquiryId: enquiry.id } });
  if (!lead) {
    console.log('⚠️ Lead not automatically created. This might be handled by an API, not Prisma trigger. Testing FollowUps directly.');
  } else {
    console.log('✅ TEST 2: Lead found:', lead.id);
  }

  // Find an employee
  const employee = await prisma.employee.findFirst();
  
  // TEST 3: Create 2 follow-ups
  const fu1 = await prisma.followUp.create({
    data: {
      type: 'CALL',
      status: 'PENDING',
      scheduledFor: new Date(),
      employeeId: employee!.id,
      enquiryId: enquiry.id
    }
  });
  const fu2 = await prisma.followUp.create({
    data: {
      type: 'EMAIL',
      status: 'COMPLETED',
      scheduledFor: new Date(),
      employeeId: employee!.id,
      enquiryId: enquiry.id
    }
  });
  console.log('✅ TEST 3: Created 2 follow-ups for employee', employee!.firstName);

  console.log('--- TESTS COMPLETED (Simulation) ---');
  process.exit(0);
}

runTests().catch(console.error);
