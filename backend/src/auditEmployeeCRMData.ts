import prisma from './utils/prisma';

async function auditData() {
  console.log('=== DATA AUDIT FOR EMPLOYEE PERFORMANCE LEADERBOARD ===\n');

  // 1. Employees
  const employees = await prisma.employee.findMany({
    include: {
      department: true,
      designation: true,
      assignedEnquiries: { include: { enquiry: true } },
      followUps: true,
      assignedLeads: {
        include: {
          quotations: true,
          enquiry: true
        }
      },
      toursCoordinated: true,
      revenueRecords: true,
    }
  });

  console.log(`Total Employees in DB: ${employees.length}`);

  for (const emp of employees) {
    console.log(`\n--- EMPLOYEE: ${emp.firstName} ${emp.lastName} (ID: ${emp.id}, Status: ${emp.status}) ---`);
    console.log(`  Code: ${emp.employeeId}`);
    console.log(`  Department: ${emp.department?.name || 'None'}`);
    console.log(`  Designation: ${emp.designation?.name || 'None'}`);
    console.log(`  Assigned Enquiries Count: ${emp.assignedEnquiries.length}`);
    console.log(`  Follow-ups Count: ${emp.followUps.length}`);
    console.log(`  Assigned SalesLeads Count: ${emp.assignedLeads.length}`);
    
    // Count quotations via assigned SalesLeads
    const quotationsFromLeads = emp.assignedLeads.flatMap(l => l.quotations);
    console.log(`  Quotations via SalesLeads: ${quotationsFromLeads.length}`);

    // Tours coordinated
    console.log(`  Tours Coordinated: ${emp.toursCoordinated.length}`);

    // Revenue Records created by employee
    console.log(`  Direct RevenueRecords created: ${emp.revenueRecords.length}`);

    // Find quotations and revenue linked via sales leads
    const leadIds = emp.assignedLeads.map(l => l.id);
    const quotationIds = quotationsFromLeads.map(q => q.id);

    const revenueRecordsForQuotes = await prisma.revenueRecord.findMany({
      where: {
        OR: [
          { createdById: emp.id },
          { quotationId: { in: quotationIds } }
        ]
      }
    });
    console.log(`  Total RevenueRecords linked: ${revenueRecordsForQuotes.length}, Sum: ${revenueRecordsForQuotes.reduce((s, r) => s + r.amount, 0)}`);

    // Find payments for quotations
    const paymentsForQuotes = await prisma.customerPayment.findMany({
      where: { quotationId: { in: quotationIds } },
      include: { transaction: true }
    });
    const completedPayments = paymentsForQuotes.filter(p => p.transaction && p.transaction.status === 'COMPLETED');
    console.log(`  Completed Payments linked: ${completedPayments.length}, Sum: ${completedPayments.reduce((s, p) => s + (p.transaction?.amount || 0), 0)}`);
  }

  // Also check total global counts
  console.log('\n=== GLOBAL TOTALS IN DB ===');
  console.log('Total Enquiries:', await prisma.enquiry.count());
  console.log('Total EnquiryAssignments:', await prisma.enquiryAssignment.count());
  console.log('Total FollowUps:', await prisma.followUp.count());
  console.log('Total SalesLeads:', await prisma.salesLead.count());
  console.log('Total Quotations:', await prisma.quotation.count());
  console.log('Total Tours:', await prisma.tour.count());
  console.log('Total RevenueRecords:', await prisma.revenueRecord.count());
  console.log('Total CustomerPayments:', await prisma.customerPayment.count());
  console.log('Total FinancialTransactions (INCOME, COMPLETED):', await prisma.financialTransaction.count({ where: { type: 'INCOME', status: 'COMPLETED' } }));

  await prisma.$disconnect();
}

auditData().catch(console.error);
