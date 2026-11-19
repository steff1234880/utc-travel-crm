/**
 * Time and Date Formatting Utilities for UTC Travel CRM
 * 
 * Standardizes time and date display across attendance, bookings, hotel reservations,
 * and itineraries with consistent Indian Standard Time (IST / Asia/Kolkata, UTC+5:30)
 * and localized display fallbacks.
 */

export const CRM_TIMEZONE = 'Asia/Kolkata';

/**
 * Formats an ISO timestamp or time string into a clean 12-hour format (e.g. "09:30 AM").
 * Respects company/business timezone (Asia/Kolkata) so that times display accurately
 * regardless of the client machine or server container timezone.
 */
export function formatAttendanceTime(val?: string | Date | null, timeZone: string = CRM_TIMEZONE): string {
  if (!val) return '--:--';

  // If already in simple "09:30 AM" or "09:30" format, return cleanly formatted
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed || trimmed === '-') return '--:--';
    
    // Check if it's "HH:mm" or "HH:mm AM/PM"
    const simpleTimeMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
    if (simpleTimeMatch) {
      let hours = parseInt(simpleTimeMatch[1], 10);
      const minutes = simpleTimeMatch[2];
      const meridiem = simpleTimeMatch[3];

      if (meridiem) {
        return `${String(hours).padStart(2, '0')}:${minutes} ${meridiem.toUpperCase()}`;
      } else {
        const period = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        return `${String(hours).padStart(2, '0')}:${minutes} ${period}`;
      }
    }
  }

  try {
    const date = typeof val === 'string' ? new Date(val) : val;
    if (isNaN(date.getTime())) return typeof val === 'string' ? val : '--:--';

    return date.toLocaleTimeString('en-US', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    try {
      const fallbackDate = typeof val === 'string' ? new Date(val) : val;
      return fallbackDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return '--:--';
    }
  }
}

/**
 * Formats a date string (YYYY-MM-DD or ISO) into DD/MM/YYYY without timezone drift.
 */
export function formatBookingDate(val?: string | Date | null): string {
  if (!val) return '-';

  if (typeof val === 'string') {
    const trimmed = val.trim();
    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return `${match[3]}/${match[2]}/${match[1]}`;
    }
  }

  try {
    const date = typeof val === 'string' ? new Date(val) : val;
    if (isNaN(date.getTime())) return String(val);
    return date.toLocaleDateString('en-GB', { timeZone: 'UTC' });
  } catch {
    return String(val);
  }
}

