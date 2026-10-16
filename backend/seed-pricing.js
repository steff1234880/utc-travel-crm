const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const DEFAULT_PRICING = [
  { id: "essential", tierName: "Essential", adultPrice: 32999, child6to17Price: 32999, child2to5Price: 22999, infant0to2Price: 6999, singleSuppPrice: 12999 },
  { id: "signature", tierName: "Signature", adultPrice: 49999, child6to17Price: 34999, child2to5Price: 9999, infant0to2Price: 9999, singleSuppPrice: 14999 },
  { id: "elite", tierName: "Elite", adultPrice: 64999, child6to17Price: 44999, child2to5Price: 44999, infant0to2Price: 11999, singleSuppPrice: 15999 },
];

async function main() {
  for (const tier of DEFAULT_PRICING) {
    const existing = await prisma.tourPricingConfig.findUnique({ where: { id: tier.id } });
    if (!existing) {
      const created = await prisma.tourPricingConfig.create({ data: tier });
      console.log("Created tier: " + created.tierName);
    } else {
      console.log("Tier " + tier.tierName + " already exists. Skipping.");
    }
  }
  console.log("Done seeding tour pricing config.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
