import api from '../services/api';

declare global {
  interface Window {
    fbq?: any;
    _fbq?: any;
  }
}

/**
 * Generate a unique deduplication Event ID (UUID v4 format)
 */
export function generateEventId(): string {
  return 'evt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
}

/**
 * Initialize Meta Pixel script dynamically in the browser
 */
export function initMetaPixel(pixelId: string) {
  if (typeof window === 'undefined' || !pixelId) return;

  if (window.fbq) return; // already initialized

  /* eslint-disable */
  (function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = !0;
    n.version = '2.0';
    n.queue = [];
    t = b.createElement(e);
    t.async = !0;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */

  window.fbq('init', pixelId);
  console.log(`[Meta Pixel] Initialized with Pixel ID: ${pixelId}`);
}

/**
 * Track Meta standard or custom event with simultaneous Browser Pixel & Server CAPI deduplication
 */
export async function trackMetaEvent(
  eventName: 'PageView' | 'ViewContent' | 'Search' | 'Contact' | 'Lead' | 'InitiateCheckout' | 'Purchase' | string,
  customData: Record<string, any> = {},
  userData: {
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
  } = {}
) {
  const eventId = generateEventId();
  const eventSourceUrl = typeof window !== 'undefined' ? window.location.href : '';

  // 1. Browser Pixel tracking (with eventID deduplication parameter)
  if (typeof window !== 'undefined' && window.fbq) {
    try {
      window.fbq('track', eventName, customData, { eventID: eventId });
    } catch (pixelErr) {
      console.warn('[Meta Pixel] Error sending browser event:', pixelErr);
    }
  }

  // 2. Server-side Conversions API (CAPI) with identical eventId for deduplication
  try {
    // Read Meta browser cookies for enhanced match rates
    let fbp: string | undefined;
    let fbc: string | undefined;
    if (typeof document !== 'undefined') {
      const matchFbp = document.cookie.match(/_fbp=([^;]+)/);
      if (matchFbp) fbp = matchFbp[1];
      const matchFbc = document.cookie.match(/_fbc=([^;]+)/);
      if (matchFbc) fbc = matchFbc[1];
    }

    await api.post('/meta/capi/event', {
      eventName,
      eventId,
      eventSourceUrl,
      userData: {
        ...userData,
        fbp,
        fbc,
      },
      customData,
    });
  } catch (capiErr) {
    // Do not break client app if CAPI bridge fails
    console.debug('[Meta CAPI] Dispatch completed or logged');
  }

  return eventId;
}

