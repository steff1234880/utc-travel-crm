import prisma from './src/utils/prisma';

async function main() {
  console.log('--- Testing Flight Ticket Tour Selection Data Flow ---');

  // 1. Fetch real customer & tour
  const customer = await prisma.customer.findFirst();
  if (!customer) {
    console.error('No customer found');
    process.exit(1);
  }

  let tour = await prisma.tour.findFirst({
    include: { customer: true }
  });

  if (!tour) {
    tour = await prisma.tour.create({
      data: {
        tourReference: `TOUR-TEST-FLT-${Date.now()}`,
        customerId: customer.id,
        destination: 'Goa Beaches',
        startDate: new Date(),
        endDate: new Date(Date.now() + 4 * 86400000),
        status: 'Confirmed',
      },
      include: { customer: true }
    });
  }

  console.log(`✅ Loaded Real Tour: ${tour.tourReference} | Customer: ${tour.customer.firstName} | Destination: ${tour.destination} (${tour.id})`);

  // 2. Create FlightTicket using selected tourId UUID
  const ticket = await prisma.flightTicket.create({
    data: {
      tourId: tour.id,
      passengerName: `${tour.customer.firstName} ${tour.customer.lastName || ''}`.trim(),
      airline: 'Air India',
      flightNumber: 'AI-803',
      departureAirport: 'DEL',
      arrivalAirport: 'GOI',
      departureDateTime: new Date('2026-11-10T10:00:00Z'),
      arrivalDateTime: new Date('2026-11-10T12:30:00Z'),
      pnr: `PNR-SELECT-${Date.now()}`,
      ticketStatus: 'Confirmed',
    },
    include: { tour: { include: { customer: true } } },
  });

  console.log('✅ Created Flight Ticket ID:', ticket.id);
  console.log('✅ Saved Tour ID:', ticket.tourId);
  console.log('✅ Verified Linked Tour Reference:', ticket.tour.tourReference);
  console.log('✅ Edit Mode Verification - Pre-selected tourId matches:', ticket.tourId === tour.id);

  // Clean up
  await prisma.flightTicket.delete({ where: { id: ticket.id } });
  console.log('✅ Flight Ticket test cleaned up cleanly.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
