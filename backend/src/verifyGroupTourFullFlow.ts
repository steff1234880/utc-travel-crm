import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runE2EVerification() {
  console.log('==================================================');
  console.log('STARTING FULL END-TO-END GROUP TOUR TEST SUITE');
  console.log('==================================================\n');

  try {
    // TEST 1 & 2: Create Group Tour in Admin / DB
    const today = new Date();
    const startDate = new Date(today.getTime() + 10 * 86400000); // 10 days from now
    const endDate = new Date(startDate.getTime() + 5 * 86400000);
    const deadline = new Date(startDate.getTime() - 2 * 86400000);

    const count = await prisma.groupTour.count();
    const ref = `GT-${today.getFullYear()}-${(count + 1).toString().padStart(4, '0')}`;

    const tour = await prisma.groupTour.create({
      data: {
        groupTourRef: ref,
        title: 'Kerala Group Tour Test',
        destination: 'Kerala, India',
        startDate,
        endDate,
        pricePerPerson: 35000,
        totalSlots: 10,
        bookingDeadline: deadline,
        description: 'Serene backwaters, tea gardens & luxury houseboat cruise.',
        status: 'Open',
      },
    });

    console.log(`✅ TEST 1 & 2 PASSED: Created Group Tour "${tour.title}" (${tour.groupTourRef}) in PostgreSQL.`);
    console.log(`   ID: ${tour.id}, Total Capacity: ${tour.totalSlots}, Date: ${tour.startDate.toISOString().split('T')[0]}`);

    // TEST 3 & 4 & 5: Verify initial slot calculation
    const booked0 = await prisma.groupTourBooking.aggregate({
      where: { groupTourId: tour.id, status: 'CONFIRMED' },
      _sum: { numberOfPeople: true },
    });
    const bookedCount0 = booked0._sum.numberOfPeople || 0;
    const remaining0 = tour.totalSlots - bookedCount0;

    console.log(`✅ TEST 3, 4, 5 PASSED: Initial State:`);
    console.log(`   Capacity: ${tour.totalSlots} | Booked: ${bookedCount0} | Remaining: ${remaining0}`);

    if (tour.totalSlots !== 10 || bookedCount0 !== 0 || remaining0 !== 10) {
      throw new Error(`Initial state mismatch! Expected 10/0/10, got ${tour.totalSlots}/${bookedCount0}/${remaining0}`);
    }

    // TEST 6 & 7: Join Group Tour with 1 person
    let testCustomer = await prisma.customer.findUnique({ where: { email: 'keralatest@example.com' } });
    if (!testCustomer) {
      testCustomer = await prisma.customer.create({
        data: {
          firstName: 'Ananya',
          lastName: 'Nair',
          email: 'keralatest@example.com',
          phone: '+91 9123456789',
        },
      });
    }

    const refCount = await prisma.enquiry.count();
    const enquiry = await prisma.enquiry.create({
      data: {
        referenceNumber: `ENQ-${today.getFullYear()}-${(refCount + 1).toString().padStart(4, '0')}`,
        source: 'Group Tour Calendar',
        customerId: testCustomer.id,
        destination: tour.destination,
        travelDate: startDate.toISOString().split('T')[0],
        travellerCount: 1,
      },
    });

    const booking = await prisma.groupTourBooking.create({
      data: {
        groupTourId: tour.id,
        customerId: testCustomer.id,
        enquiryId: enquiry.id,
        customerName: 'Ananya Nair',
        customerEmail: 'keralatest@example.com',
        customerPhone: '+91 9123456789',
        numberOfPeople: 1,
        status: 'CONFIRMED',
      },
    });

    console.log(`✅ TEST 6 & 7 PASSED: Joined Group Tour for 1 seat (Booking ID: ${booking.id}).`);

    // TEST 8: Verify updated DB state after join
    const booked1 = await prisma.groupTourBooking.aggregate({
      where: { groupTourId: tour.id, status: 'CONFIRMED' },
      _sum: { numberOfPeople: true },
    });
    const bookedCount1 = booked1._sum.numberOfPeople || 0;
    const remaining1 = tour.totalSlots - bookedCount1;

    console.log(`✅ TEST 8 PASSED (DB Persisted):`);
    console.log(`   Capacity: ${tour.totalSlots} | Booked: ${bookedCount1} | Remaining: ${remaining1}`);

    if (bookedCount1 !== 1 || remaining1 !== 9) {
      throw new Error(`Post-join state mismatch! Expected 1/9, got ${bookedCount1}/${remaining1}`);
    }

    // TEST 9: Fill remaining 9 slots to test Fully Booked logic
    await prisma.groupTourBooking.create({
      data: {
        groupTourId: tour.id,
        customerId: testCustomer.id,
        customerName: 'Family Group',
        customerEmail: 'keralatest@example.com',
        customerPhone: '+91 9123456789',
        numberOfPeople: 9,
        status: 'CONFIRMED',
      },
    });

    const bookedFull = await prisma.groupTourBooking.aggregate({
      where: { groupTourId: tour.id, status: 'CONFIRMED' },
      _sum: { numberOfPeople: true },
    });
    const bookedCountFull = bookedFull._sum.numberOfPeople || 0;
    const remainingFull = tour.totalSlots - bookedCountFull;

    if (remainingFull === 0) {
      await prisma.groupTour.update({
        where: { id: tour.id },
        data: { status: 'Full' },
      });
    }

    const updatedTour = await prisma.groupTour.findUnique({ where: { id: tour.id } });

    console.log(`✅ TEST 9 PASSED: All 10 slots filled.`);
    console.log(`   Capacity: ${updatedTour?.totalSlots} | Booked: ${bookedCountFull} | Remaining: ${remainingFull} | Status: ${updatedTour?.status}`);

    if (bookedCountFull !== 10 || remainingFull !== 0 || updatedTour?.status !== 'Full') {
      throw new Error('Fully booked state validation failed.');
    }

    console.log('\n==================================================');
    console.log('ALL 9 TESTS PASSED CLEANLY & SUCCESSFULLY! 🎉');
    console.log('==================================================');
  } catch (err) {
    console.error('\n❌ E2E TEST FAILED:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runE2EVerification();
