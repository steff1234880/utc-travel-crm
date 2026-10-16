require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testQuotations() {
  console.log('Testing Quotation System...');
  try {
    // 1. Get a random active lead to attach quotation to
    const lead = await prisma.salesLead.findFirst({
      where: { customerId: { not: null } }
    });
    
    if (!lead) throw new Error('No valid lead found');
    
    console.log(`Using Lead: ${lead.id}`);

    // 2. Create Quotation
    const quote = await prisma.quotation.create({
      data: {
        quotationNumber: 'QT-TEST-' + Date.now(),
        salesLeadId: lead.id,
        customerId: lead.customerId,
        validityDate: new Date(),
        basePrice: 1000,
        additionalCharges: 100,
        discounts: 50,
        taxes: 105,
        finalAmount: 1155,
        currency: 'USD',
        status: 'DRAFT',
        items: {
          create: [
            { title: 'Flight Ticket', quantity: 2, unitPrice: 500, totalPrice: 1000 }
          ]
        },
        statusHistory: {
          create: {
            newStatus: 'DRAFT',
            remarks: 'Test script',
            updatedById: 'system-test-id'
          }
        }
      },
      include: { items: true, statusHistory: true }
    });
    console.log('Quotation created successfully:', quote.id);

    // 3. Update Status
    const updatedQuote = await prisma.quotation.update({
      where: { id: quote.id },
      data: { status: 'SENT' }
    });
    console.log('Quotation status updated to:', updatedQuote.status);

    // 4. Delete Quotation
    await prisma.quotation.delete({ where: { id: quote.id } });
    console.log('Quotation deleted successfully.');
    
    console.log('All backend tests passed!');
  } catch (err) {
    console.error('Test Failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

testQuotations();
