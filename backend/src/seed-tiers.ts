import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  await prisma.tourPricingTier.upsert({
    where: { tierId: 'normal' },
    update: { tierName: 'Normal (Group Tour)' },
    create: { id: '1_normal', tierId: 'normal', tierName: 'Normal (Group Tour)', basePrice: 49999, adultPrice: 49999, child6to17: 34999, child2to5: 9999, infantPrice: 9999, singleSupplement: 0 }
  });
  
  await prisma.tourPricingTier.updateMany({
    where: { tierId: 'essential' },
    data: { tierName: 'Essential (Custom)' }
  });
  await prisma.tourPricingTier.updateMany({
    where: { tierId: 'signature' },
    data: { tierName: 'Signature (Custom)' }
  });
  await prisma.tourPricingTier.updateMany({
    where: { tierId: 'elite' },
    data: { tierName: 'Elite (Custom)' }
  });

  console.log('Done');
}
run().finally(() => prisma.$disconnect());
