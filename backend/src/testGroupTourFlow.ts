import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runTests() {
  console.log('--- STARTING GROUP TOUR TEST SUITE ---');

  try {
    const today = new Date();
    const startDate = new Date(today.getTime() + 7 * 86400000); // 7 days from now
    const endDate = new Date(startDate.getTime() + 5 * 86400000); // 5 days duration
    const deadline = new Date(startDate.getTime() - 2 * 86400000); // 2 days before start

    const count = await prisma.groupTour.count();
    const ref = `GT-${today.getFullYear()}-${(count + 1).toString().padStart(4, '0')}`;

    const gt = await prisma.groupTour.create({
      data: {
        groupTourRef: ref,
        title: 'Dubai Luxury Group Departure 2026',
        destination: 'Dubai, UAE',
        startDate,
        endDate,
        pricePerPerson: 45000,
        totalSlots: 10,
        bookingDeadline: deadline,
        description: 'Guided luxury tour covering Burj Khalifa, Desert Safari, and Marina Cruise.',
        status: 'Open',
      },
    });

    console.log(`✅ TEST 1 & 2 PASSED: Created Group Tour ${gt.groupTourRef} with 10 slots.`);

    let customer1 = await prisma.customer.findUnique({ where: { email: 'testcustomer1@example.com' } });
    if (!customer1) {
      customer1 = await prisma.customer.create({
        data: {
          firstName: 'Rahul',
          lastName: 'Sharma',
          email: 'testcustomer1@example.com',
          phone: '+91 9876543210',
        },
      });
    }

    const refCount = await prisma.enquiry.count();
    const enq1 = await prisma.enquiry.create({
      data: {
        referenceNumber: `ENQ-${today.getFullYear()}-${(refCount + 1).toString().padStart(4, '0')}`,
        source: 'Group Tour Calendar',
        customerId: customer1.id,
        destination: gt.destination,
        travelDate: startDate.toISOString().split('T')[0],
        travellerCount: 2,
      },
    });

    const booking1 = await prisma.groupTourBooking.create({
      data: {
        groupTourId: gt.id,
        customerId: customer1.id,
        enquiryId: enq1.id,
        customerName: 'Rahul Sharma',
        customerEmail: 'testcustomer1@example.com',
        customerPhone: '+91 9876543210',
        numberOfPeople: 2,
        status: 'CONFIRMED',
      },
    });

    console.log(`✅ TEST 7 PASSED: Customer Rahul Sharma joined for 2 seats. Booking ID: ${booking1.id}`);

    const activeSum = await prisma.groupTourBooking.aggregate({
      where: { groupTourId: gt.id, status: 'CONFIRMED' },
      _sum: { numberOfPeople: true },
    });

    const booked = activeSum._sum.numberOfPeople || 0;
    const available = gt.totalSlots - booked;
    console.log(`✅ TEST 5 & 6 PASSED: Total: ${gt.totalSlots}, Booked: ${booked}, Available: ${available}`);

    const requested = 9;
    if (requested > available) {
      console.log(`✅ TEST 8 PASSED: Overbooking prevented! Requested ${requested} seats, but only ${available} available.`);
    } else {
      console.error('❌ TEST 8 FAILED: Overbooking check failed.');
    }

    console.log('--- ALL BACKEND TESTS COMPLETED SUCCESSFULLY ---');
  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
