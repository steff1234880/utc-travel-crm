const path = require('path');
const { PrismaClient } = require(path.join(__dirname, '../../node_modules/@prisma/client'));
const prisma = new PrismaClient();

async function seedContent() {
  console.log('--- Starting Content & Package Seeding into PostgreSQL ---');

  // 1. Get or create Admin user for Author relation
  let adminUser = await prisma.user.findFirst({ where: { email: 'admin@utctravel.com' } });
  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: { email: 'admin@utctravel.com', passwordHash: 'password', isActive: true }
    });
  }

  // 2. Destinations
  const destData = [
    { name: 'Paris, France', slug: 'paris-france', tagline: 'The City of Lights & Timeless Romance', description: 'Experience luxury dining, VIP museum access, and iconic landmarks.', image: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=800&auto=format&fit=crop' },
    { name: 'Kyoto, Japan', slug: 'kyoto-japan', tagline: 'Ancient Culture & Serene Zen Gardens', description: 'Immerse yourself in authentic tea ceremonies and breathtaking temples.', image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=800&auto=format&fit=crop' },
    { name: 'Malé, Maldives', slug: 'male-maldives', tagline: 'Tropical Overwater Paradise', description: 'Private bungalows, pristine beaches, and crystal clear ocean waters.', image: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?q=80&w=800&auto=format&fit=crop' },
    { name: 'Zermatt, Switzerland', slug: 'zermatt-switzerland', tagline: 'Pristine Alpine Slopes & Matterhorn Views', description: 'World-class skiing, luxury chalets, and breathtaking mountain vistas.', image: 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?q=80&w=800&auto=format&fit=crop' }
  ];

  const destinationsMap: Record<string, string> = {};
  for (const item of destData) {
    let dest = await prisma.destination.findUnique({ where: { slug: item.slug } });
    if (!dest) {
      dest = await prisma.destination.create({ data: item });
    }
    destinationsMap[item.slug] = dest.id;
  }
  console.log('Destinations Seeded:', Object.keys(destinationsMap).length);

  // 3. Travel Packages
  const pkgData = [
    {
      title: 'Ultimate Paris Luxury Escape',
      slug: 'ultimate-paris-luxury-escape',
      overview: 'Experience the City of Lights like never before with VIP museum access, Michelin-starred dining, and a private Seine cruise.',
      durationDays: 7,
      durationNights: 6,
      destinationId: destinationsMap['paris-france'],
      status: 'PUBLISHED',
      basePrice: 4500,
      currency: 'USD',
      isFeatured: true,
      images: { create: [{ url: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=800&auto=format&fit=crop', isFeatured: true }] }
    },
    {
      title: 'Kyoto Zen Retreat',
      slug: 'kyoto-zen-retreat',
      overview: 'Immerse yourself in ancient Japanese culture with private tea ceremonies, ryokan stays, and guided temple tours.',
      durationDays: 10,
      durationNights: 9,
      destinationId: destinationsMap['kyoto-japan'],
      status: 'PUBLISHED',
      basePrice: 6200,
      currency: 'USD',
      isFeatured: true,
      images: { create: [{ url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=800&auto=format&fit=crop', isFeatured: true }] }
    },
    {
      title: 'Maldives Overwater Paradise',
      slug: 'maldives-overwater-paradise',
      overview: 'Relax in your private overwater bungalow, enjoy world-class snorkeling, and dine under the stars on a secluded beach.',
      durationDays: 5,
      durationNights: 4,
      destinationId: destinationsMap['male-maldives'],
      status: 'PUBLISHED',
      basePrice: 5800,
      currency: 'USD',
      isFeatured: true,
      images: { create: [{ url: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?q=80&w=800&auto=format&fit=crop', isFeatured: true }] }
    },
    {
      title: 'Swiss Alps Ski Adventure',
      slug: 'swiss-alps-ski-adventure',
      overview: 'Hit the pristine slopes of Zermatt, stay in a luxury chalet, and enjoy exclusive après-ski experiences.',
      durationDays: 8,
      durationNights: 7,
      destinationId: destinationsMap['zermatt-switzerland'],
      status: 'PUBLISHED',
      basePrice: 7100,
      currency: 'USD',
      isFeatured: true,
      images: { create: [{ url: 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?q=80&w=800&auto=format&fit=crop', isFeatured: true }] }
    }
  ];

  for (const pkg of pkgData) {
    const existing = await prisma.travelPackage.findUnique({ where: { slug: pkg.slug } });
    if (!existing) {
      await prisma.travelPackage.create({ data: pkg });
    }
  }
  console.log('Travel Packages Seeded Successfully!');

  // 4. Blog Categories
  const catData = [
    { name: 'Destinations', slug: 'destinations', description: 'Top places to travel' },
    { name: 'Travel Tips', slug: 'travel-tips', description: 'Packing, planning and advice' },
    { name: 'Cultural Experiences', slug: 'cultural-experiences', description: 'Heritage and local culture' }
  ];

  const catMap: Record<string, string> = {};
  for (const cat of catData) {
    let blogCat = await prisma.blogCategory.findUnique({ where: { slug: cat.slug } });
    if (!blogCat) {
      blogCat = await prisma.blogCategory.create({ data: cat });
    }
    catMap[cat.slug] = blogCat.id;
  }

  // 5. Blog Posts
  const blogData = [
    {
      title: 'Top 10 Hidden Gems in Europe for 2027',
      slug: 'top-10-hidden-gems-europe-2027',
      excerpt: 'Discover the most breathtaking and uncrowded destinations across Europe that you need to visit before they become mainstream.',
      content: '<p>Europe is full of surprises. While Paris and Rome are beautiful, true luxury lies in the undiscovered...</p><h2>1. The Azores, Portugal</h2><p>Often called the Hawaii of the mid-Atlantic...</p>',
      featuredImage: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=800&auto=format&fit=crop',
      status: 'PUBLISHED',
      publishedAt: new Date(),
      authorId: adminUser.id,
      categoryId: catMap['destinations']
    },
    {
      title: 'How to Pack for a 14-Day Luxury Cruise',
      slug: 'pack-for-luxury-cruise',
      excerpt: 'Essential packing tips for your next luxury cruise. Learn what to bring for formal nights, excursions, and relaxing days at sea.',
      content: '<p>Packing for a cruise can be daunting. With limited space but varying dress codes, strategy is key...</p><h2>1. Formal Wear</h2><p>Bring elegant attire for gala dinners.</p>',
      featuredImage: 'https://images.unsplash.com/photo-1599640842225-85d111c60e6b?q=80&w=800&auto=format&fit=crop',
      status: 'PUBLISHED',
      publishedAt: new Date(),
      authorId: adminUser.id,
      categoryId: catMap['travel-tips']
    },
    {
      title: 'The Ultimate Guide to Kyoto in Autumn',
      slug: 'kyoto-in-autumn',
      excerpt: 'Experience the magic of changing leaves, ancient temples, and authentic Japanese cuisine in our comprehensive Kyoto guide.',
      content: '<p>Autumn in Kyoto is nothing short of magical. The fiery red maple leaves contrast beautifully with historic temples...</p><h2>1. Arashiyama Bamboo Grove</h2><p>Stroll through iconic bamboo paths.</p>',
      featuredImage: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=800&auto=format&fit=crop',
      status: 'PUBLISHED',
      publishedAt: new Date(),
      authorId: adminUser.id,
      categoryId: catMap['cultural-experiences']
    }
  ];

  for (const post of blogData) {
    const existing = await prisma.blogPost.findUnique({ where: { slug: post.slug } });
    if (!existing) {
      await prisma.blogPost.create({ data: post });
    }
  }
  console.log('Blog Posts & Categories Seeded Successfully!');
}

seedContent()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
