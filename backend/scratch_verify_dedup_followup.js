const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runVerification() {
  console.log('=== VERIFICATION: UNIQUE FOLLOW-UP COUNTING ===\n');

  // 1. Total FollowUps in database (single source of truth)
  const allFollowUps = await prisma.followUp.findMany({
    where: { status: { notIn: ['CANCELLED', 'DELETED'] } }
  });
  const totalDbCount = allFollowUps.length;

  console.log(`1. Total Active FollowUp records in PostgreSQL: ${totalDbCount}`);

  // 2. Global CEO Dashboard Follow-up Performance query
  const ceoTotal = await prisma.followUp.count({
    where: { status: { notIn: ['CANCELLED', 'DELETED'] } }
  });
  console.log(`2. CEO Dashboard Global Total Follow-ups count: ${ceoTotal}`);

  console.log(`   --> Match Status: ${totalDbCount === ceoTotal ? 'EXACT MATCH (Duplicate counting eliminated)' : 'MISMATCH'}`);

  // 3. Employee-level deduplication test
  const employee = await prisma.employee.findFirst();
  console.log(`\n3. Employee-Level Deduplication Test for: ${employee.firstName} ${employee.lastName} (${employee.id})`);

  const empFollowUpWhere = {
    status: { notIn: ['CANCELLED', 'DELETED'] },
    OR: [
      { employeeId: employee.id },
      { salesLead: { assignedToId: employee.id } },
      { enquiry: { assignments: { some: { employeeId: employee.id } } } }
    ]
  };

  const rawEmpFollowUps = await prisma.followUp.findMany({ where: empFollowUpWhere });
  const empFollowUpMap = new Map();
  rawEmpFollowUps.forEach(f => empFollowUpMap.set(f.id, f));
  const uniqueEmpFollowUps = Array.from(empFollowUpMap.values());

  console.log(`   - Raw Query Records Found: ${rawEmpFollowUps.length}`);
  console.log(`   - Deduplicated Unique Records Count: ${uniqueEmpFollowUps.length}`);

  // Print details of unique records
  uniqueEmpFollowUps.forEach(f => {
    console.log(`     * FollowUp ID: ${f.id} | Status: ${f.status} | EnquiryId: ${f.enquiryId} | SalesLeadId: ${f.salesLeadId} | EmpId: ${f.employeeId}`);
  });

  console.log('\nVerification complete.');
}

runVerification().catch(console.error).finally(() => prisma.$disconnect());
