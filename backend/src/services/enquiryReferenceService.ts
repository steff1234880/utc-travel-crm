import prisma from '../utils/prisma';

/**
 * Generates an Enquiry Reference Number formatted exactly as:
 * UTC-YYYY/MM/DD-RANDOMNUMBER
 * Example: UTC-2026/12/10-583921
 *
 * Requirements:
 * - UTC prefix
 * - Actual creation date (YYYY/MM/DD in Asia/Kolkata IST)
 * - Separated by forward slashes
 * - A unique random numeric suffix (e.g. 6-digit random number: 100000 - 999999)
 * - Database collision checking ensuring global uniqueness
 */
export function generateEnquiryReference(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);

  const year = parts.find(p => p.type === 'year')?.value || String(date.getFullYear());
  const month = parts.find(p => p.type === 'month')?.value || String(date.getMonth() + 1).padStart(2, '0');
  const day = parts.find(p => p.type === 'day')?.value || String(date.getDate()).padStart(2, '0');

  // Generate 6-digit random number suffix (e.g. 583921)
  const randomSuffix = Math.floor(100000 + Math.random() * 900000).toString();
  return `UTC-${year}/${month}/${day}-${randomSuffix}`;
}

/**
 * Generates a collision-free Enquiry reference by checking against existing database records.
 */
export async function generateUniqueEnquiryReference(date: Date = new Date()): Promise<string> {
  let ref = generateEnquiryReference(date);
  let attempts = 0;
  const maxAttempts = 25;

  while (await prisma.enquiry.findUnique({ where: { referenceNumber: ref } })) {
    attempts++;
    ref = generateEnquiryReference(date);
    if (attempts >= maxAttempts) {
      // High concurrency fallback: append additional random digit
      const extra = Math.floor(1000000 + Math.random() * 9000000).toString();
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).formatToParts(date);
      const year = parts.find(p => p.type === 'year')?.value || String(date.getFullYear());
      const month = parts.find(p => p.type === 'month')?.value || String(date.getMonth() + 1).padStart(2, '0');
      const day = parts.find(p => p.type === 'day')?.value || String(date.getDate()).padStart(2, '0');
      ref = `UTC-${year}/${month}/${day}-${extra}`;
    }
  }

  return ref;
}
