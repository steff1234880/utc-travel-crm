import prisma from './src/utils/prisma';

async function checkBookingPrepData() {
  try {
    const bookings = await prisma.bookingPreparation.findMany({
      include: {
        customer: true,
        quotation: true,
      },
    });
    console.log('Bookings total:', bookings.length);
    bookings.forEach((b) => {
      console.log(`- ID: ${b.id}, Ref: ${b.bookingRef}, Status: ${b.status}, Customer: ${b.customer?.firstName} ${b.customer?.lastName || ''}, Dest: ${b.quotation?.destination}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkBookingPrepData();
