const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== EMPLOYEES ===');
  const employees = await prisma.employee.findMany({
    include: {
      assignedEnquiries: { include: { enquiry: true } },
      followUps: { include: { enquiry: true, salesLead: true } }
    }
  });
  console.log(`Employees count: ${employees.length}`);
  employees.forEach(e => {
    console.log(`Employee: ${e.id} | ${e.firstName} ${e.lastName} (${e.employeeId})`);
    console.log(`  Direct followUps relation count: ${e.followUps.length}`);
    e.followUps.forEach(f => {
      console.log(`   - FollowUp ID: ${f.id}, Status: ${f.status}, Type: ${f.type}, EnquiryId: ${f.enquiryId}, SalesLeadId: ${f.salesLeadId}, ScheduledFor: ${f.scheduledFor}, CreatedAt: ${f.createdAt}`);
    });
    console.log(`  Enquiry Assignments count: ${e.assignedEnquiries.length}`);
    e.assignedEnquiries.forEach(a => {
      console.log(`   - EnquiryId: ${a.enquiryId}, Title: ${a.enquiry ? (a.enquiry.title || a.enquiry.customerName) : 'No Eq'}`);
    });
  });

  console.log('\n=== ALL FOLLOWUPS IN DATABASE ===');
  const allFollowUps = await prisma.followUp.findMany({
    include: { employee: true, enquiry: { include: { assignments: true } }, salesLead: true }
  });
  console.log(`Total FollowUps count: ${allFollowUps.length}`);
  allFollowUps.forEach(f => {
    console.log(`- ID: ${f.id}, Status: ${f.status}, Type: ${f.type}, EmpId: ${f.employeeId} (${f.employee ? f.employee.firstName : 'No Emp'}), EnquiryId: ${f.enquiryId}, LeadId: ${f.salesLeadId}, CreatedAt: ${f.createdAt.toISOString()}`);
  });

  console.log('\n=== ENQUIRIES ===');
  const enquiries = await prisma.enquiry.findMany({
    include: { followUps: true, assignments: true }
  });
  console.log(`Total Enquiries count: ${enquiries.length}`);
  enquiries.forEach(eq => {
    console.log(`- Enquiry ID: ${eq.id}, Name: ${eq.customerName}, FollowUps: ${eq.followUps.length}, Assignments: ${eq.assignments.length}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
