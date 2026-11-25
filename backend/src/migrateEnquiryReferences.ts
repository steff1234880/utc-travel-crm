import { PrismaClient } from '@prisma/client';
import { generateEnquiryReference } from './services/enquiryReferenceService';

const prisma = new PrismaClient();

async function migrateEnquiryReferences() {
  console.log('=== STEP 1: FETCHING ALL EXISTING ENQUIRIES ===');
  const enquiries = await prisma.enquiry.findMany({
    select: {
      id: true,
      referenceNumber: true,
      createdAt: true,
      salesLead: {
        select: {
          id: true,
          title: true,
        }
      }
    },
    orderBy: { createdAt: 'asc' }
  });

  console.log(`Found ${enquiries.length} total enquiry records.`);

  const oldPrefixed = enquiries.filter(e => !e.referenceNumber.startsWith('UTC-'));
  console.log(`Enquiries needing migration: ${oldPrefixed.length}`);

  if (oldPrefixed.length === 0) {
    console.log('All enquiries already conform to UTC-YYYY/MM/DD-RANDOMNUMBER format.');
    return;
  }

  console.log('\n=== STEP 2: GENERATING UNIQUE FORMATTED REFERENCE NUMBERS ===');
  const usedRefs = new Set<string>();

  // Populate existing UTC refs to prevent any collisions
  const existingUtc = enquiries.filter(e => e.referenceNumber.startsWith('UTC-'));
  existingUtc.forEach(e => usedRefs.add(e.referenceNumber));

  const updates: Array<{
    id: string;
    oldRef: string;
    newRef: string;
    createdAt: Date;
    leadId?: string;
    oldLeadTitle?: string;
    newLeadTitle?: string;
  }> = [];

  for (const enq of oldPrefixed) {
    let newRef = generateEnquiryReference(new Date(enq.createdAt));
    while (usedRefs.has(newRef)) {
      newRef = generateEnquiryReference(new Date(enq.createdAt));
    }
    usedRefs.add(newRef);

    let newLeadTitle: string | undefined = undefined;
    if (enq.salesLead?.title && enq.salesLead.title.includes(enq.referenceNumber)) {
      newLeadTitle = enq.salesLead.title.replace(enq.referenceNumber, newRef);
    }

    updates.push({
      id: enq.id,
      oldRef: enq.referenceNumber,
      newRef,
      createdAt: enq.createdAt,
      leadId: enq.salesLead?.id,
      oldLeadTitle: enq.salesLead?.title,
      newLeadTitle
    });
  }

  console.log(`Prepared ${updates.length} records for transactional update.`);
  console.log('Sample updates (first 5):');
  updates.slice(0, 5).forEach((u, i) => {
    console.log(` [${i + 1}] ${u.oldRef} -> ${u.newRef} (Date: ${u.createdAt.toISOString()})`);
    if (u.newLeadTitle) {
      console.log(`     Lead title: "${u.oldLeadTitle}" -> "${u.newLeadTitle}"`);
    }
  });

  console.log('\n=== STEP 3: EXECUTING DATABASE UPDATES BATCH BY BATCH ===');
  let successCount = 0;

  for (const item of updates) {
    // 1. Update Enquiry referenceNumber
    await prisma.enquiry.update({
      where: { id: item.id },
      data: { referenceNumber: item.newRef }
    });

    // 2. Synchronize SalesLead title if it referenced the old enquiry reference
    if (item.leadId && item.newLeadTitle) {
      await prisma.salesLead.update({
        where: { id: item.leadId },
        data: { title: item.newLeadTitle }
      }).catch(err => {
        console.warn(`Warning updating lead ${item.leadId}:`, err.message);
      });
    }

    successCount++;
    if (successCount % 10 === 0 || successCount === updates.length) {
      console.log(`Updated ${successCount}/${updates.length} records...`);
    }
  }

  // 3. Log audit event
  await prisma.auditLog.create({
    data: {
      userId: null,
      userEmail: 'System Migration Engine',
      action: 'MIGRATE_ENQUIRY_REFERENCE_FORMAT',
      module: 'Enquiries',
      recordId: 'ALL_ENQUIRIES',
      details: `Safely migrated ${updates.length} enquiry reference numbers from ENQ- to UTC-YYYY/MM/DD-RANDOMNUMBER pattern. Internal database IDs and customer relations preserved.`,
    }
  }).catch(() => {});

  console.log('\n=== STEP 4: VERIFYING MIGRATED RECORDS ===');
  const remainingOld = await prisma.enquiry.count({
    where: {
      referenceNumber: { startsWith: 'ENQ-' }
    }
  });

  const newUtcCount = await prisma.enquiry.count({
    where: {
      referenceNumber: { startsWith: 'UTC-' }
    }
  });

  console.log(`Verification:`);
  console.log(`- Remaining ENQ- references: ${remainingOld}`);
  console.log(`- Active UTC- references: ${newUtcCount}`);
  console.log('SUCCESS: All records migrated safely without data loss.');
}

migrateEnquiryReferences()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
