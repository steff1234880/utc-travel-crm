import { useId } from 'react';

interface UtcTravelLogoProps {
  className?: string;
  /** Enables the subtle light-trail / wake motion. Logo artwork itself never moves or blurs. */
  animated?: boolean;
}

/**
 * UTC TRAVEL brand mark rendered as pure vector SVG.
 * - Infinitely sharp on any screen density (no raster upscaling).
 * - Typography uses the site's existing Poppins font with system fallbacks.
 * - Glow is applied only to the orbit ribbon / horizon, never to the lettering,
 *   so the wordmark edges stay crisp.
 */
export default function UtcTravelLogo({ className = '', animated = true }: UtcTravelLogoProps) {
  // Unique, URL-safe IDs so multiple instances (e.g. admin preview + live loader) don't clash
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const id = (name: string) => `utc-${name}-${uid}`;

  const fontStack = "Poppins, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";
  const orbitPath = 'M 150 176 C 40 150, 210 112, 352 102 C 452 95, 520 80, 566 58';

  return (
    <svg
      viewBox="0 0 640 320"
      className={className}
      role="img"
      aria-label="Universal Travel Company"
      shapeRendering="geometricPrecision"
      textRendering="geometricPrecision"
    >
      <defs>
        {/* Brushed-silver wordmark fill */}
        <linearGradient id={id('silver')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.55" stopColor="#e9eef5" />
          <stop offset="1" stopColor="#b9c4d3" />
        </linearGradient>

        {/* Orbit ribbon: fades in from the left, bright near the airplane */}
        <linearGradient id={id('orbit')} x1="150" y1="176" x2="566" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#1e3a8a" stopOpacity="0" />
          <stop offset="0.35" stopColor="#3b82f6" stopOpacity="0.85" />
          <stop offset="0.8" stopColor="#bae6fd" stopOpacity="1" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="1" />
        </linearGradient>

        {/* Horizon line under the cruise ship */}
        <linearGradient id={id('horizon')} x1="90" y1="0" x2="560" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#1d4ed8" stopOpacity="0" />
          <stop offset="0.55" stopColor="#3b82f6" stopOpacity="0.9" />
          <stop offset="0.85" stopColor="#7dd3fc" stopOpacity="1" />
          <stop offset="1" stopColor="#7dd3fc" stopOpacity="0" />
        </linearGradient>

        {/* Soft glow used ONLY on ribbon / horizon copies (never on text) */}
        <filter id={id('glow')} x="-20%" y="-200%" width="140%" height="500%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>

      <style>{`
        .utc-trail-${uid} {
          stroke-dasharray: 70 600;
          stroke-dashoffset: 670;
          animation: utcTrail-${uid} 2.6s cubic-bezier(0.45, 0, 0.2, 1) infinite;
        }
        .utc-wake-${uid} {
          stroke-dasharray: 60 420;
          stroke-dashoffset: 0;
          animation: utcWake-${uid} 3.2s linear infinite;
        }
        .utc-plane-${uid} {
          transform-box: fill-box;
          transform-origin: center;
          animation: utcPlane-${uid} 3.6s ease-in-out infinite;
        }
        @keyframes utcTrail-${uid} {
          0%   { stroke-dashoffset: 670; opacity: 0; }
          15%  { opacity: 1; }
          85%  { opacity: 1; }
          100% { stroke-dashoffset: 0; opacity: 0; }
        }
        @keyframes utcWake-${uid} {
          from { stroke-dashoffset: 0; }
          to   { stroke-dashoffset: 480; }
        }
        @keyframes utcPlane-${uid} {
          0%, 100% { transform: translate(0, 0); }
          50%      { transform: translate(3px, -3px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .utc-trail-${uid}, .utc-wake-${uid}, .utc-plane-${uid} { animation: none; }
          .utc-trail-${uid} { opacity: 0; }
        }
      `}</style>

      {/* ── Orbit ribbon (behind lettering) ── */}
      <path d={orbitPath} fill="none" stroke={`url(#${id('orbit')})`} strokeWidth="7" strokeLinecap="round" filter={`url(#${id('glow')})`} opacity="0.55" />

      {/* ── UTC wordmark ── */}
      <text
        x="320"
        y="196"
        textAnchor="middle"
        fontFamily={fontStack}
        fontWeight={700}
        fontSize="152"
        letterSpacing="-2"
        fill={`url(#${id('silver')})`}
      >
        UTC
      </text>

      {/* ── Orbit ribbon (crisp core, crosses in front of the letters) ── */}
      <path d={orbitPath} fill="none" stroke={`url(#${id('orbit')})`} strokeWidth="2.6" strokeLinecap="round" />

      {/* Travelling light pulse along the orbit */}
      {animated && (
        <path
          d={orbitPath}
          fill="none"
          stroke="#e0f2fe"
          strokeWidth="3.2"
          strokeLinecap="round"
          className={`utc-trail-${uid}`}
        />
      )}

      {/* ── Airplane (side view, climbing to the upper right) ── */}
      <g className={animated ? `utc-plane-${uid}` : undefined}>
        <g transform="translate(560 60) rotate(-22) scale(1.05)" fill="#ffffff">
          {/* Fuselage */}
          <path d="M-4 -2.6 L36 -3.2 C44 -3.2 50 -1.4 52 0 C50 1.4 44 3.2 36 3.2 L-4 2.6 C-7 2.4 -8 1 -8 0 C-8 -1 -7 -2.4 -4 -2.6 Z" />
          {/* Tail fin */}
          <path d="M-6 -2 L-12 -15 L-6.5 -15 L4 -2.4 Z" />
          {/* Horizontal stabiliser */}
          <path d="M-5 1 L-11 6.5 L-7 6.5 L1 1.6 Z" opacity="0.85" />
          {/* Near wing */}
          <path d="M14 1.2 L4 13 L10 13 L28 2 Z" />
          {/* Far wing */}
          <path d="M16 -1.6 L10 -8 L14 -8 L26 -2 Z" opacity="0.7" />
          {/* Engine */}
          <rect x="11" y="4.6" width="8" height="2.6" rx="1.3" opacity="0.9" />
          {/* Cockpit / window line */}
          <path d="M44 -1.8 C47 -1.4 49 -0.6 50 0 L44 0 Z" fill="#93c5fd" />
          <line x1="8" y1="-1" x2="40" y2="-1.3" stroke="#cbd5e1" strokeWidth="0.8" strokeDasharray="1.2 1.6" />
        </g>
      </g>

      {/* ── TRAVEL ── */}
      <text
        x="330"
        y="252"
        textAnchor="middle"
        fontFamily={fontStack}
        fontWeight={400}
        fontSize="38"
        letterSpacing="20"
        fill="#e2e8f0"
      >
        TRAVEL
      </text>

      {/* ── Horizon line + glow ── */}
      <line x1="90" y1="294" x2="560" y2="294" stroke={`url(#${id('horizon')})`} strokeWidth="6" filter={`url(#${id('glow')})`} opacity="0.7" />
      <line x1="90" y1="294" x2="560" y2="294" stroke={`url(#${id('horizon')})`} strokeWidth="1.4" />

      {/* Animated wake shimmer behind the ship */}
      {animated && (
        <line x1="470" y1="294" x2="150" y2="294" stroke="#bae6fd" strokeWidth="1.6" strokeLinecap="round" className={`utc-wake-${uid}`} opacity="0.9" />
      )}

      {/* ── Cruise ship (sailing right) ── */}
      <g transform="translate(468 263)">
        {/* Hull */}
        <path d="M0 18 L98 18 L104 22 L92 31 L8 31 Z" fill="#f8fafc" />
        <path d="M6 27 L95 27 L92 31 L8 31 Z" fill="#1e3a8a" />
        {/* Decks */}
        <path d="M8 18 L8 12 L86 12 L94 18 Z" fill="#ffffff" />
        <path d="M16 12 L16 7 L76 7 L82 12 Z" fill="#f1f5f9" />
        <path d="M26 7 L26 3 L64 3 L68 7 Z" fill="#e2e8f0" />
        {/* Funnel */}
        <path d="M40 3 L42 -4 L50 -4 L50 3 Z" fill="#e2e8f0" />
        <rect x="42" y="-4" width="8" height="2" fill="#1e3a8a" />
        {/* Window rows */}
        <line x1="12" y1="22.5" x2="92" y2="22.5" stroke="#1e3a8a" strokeWidth="1.2" strokeDasharray="2 1.6" />
        <line x1="12" y1="15" x2="86" y2="15" stroke="#64748b" strokeWidth="1" strokeDasharray="2 1.6" />
        <line x1="20" y1="9.5" x2="76" y2="9.5" stroke="#64748b" strokeWidth="0.9" strokeDasharray="1.8 1.6" />
        <line x1="30" y1="5" x2="64" y2="5" stroke="#94a3b8" strokeWidth="0.8" strokeDasharray="1.6 1.6" />
        {/* Water reflection */}
        <path d="M10 33 L92 33" stroke="#7dd3fc" strokeWidth="0.8" opacity="0.5" />
      </g>
    </svg>
  );
}
