import { useEffect, useState } from 'react';
import UtcTravelLogo from './UtcTravelLogo';

interface PreloaderProps {
  /** Whether the app is currently loading. */
  isLoading?: boolean;
  /** Static, inline rendering (used for preview panels). */
  previewMode?: boolean;
}

const FADE_MS = 600;
const SAFETY_MS = 6000;

export default function GlobalLoadingAnimation({
  isLoading = true,
  previewMode = false
}: PreloaderProps) {
  const [mounted, setMounted] = useState(isLoading || previewMode);
  const [shown, setShown] = useState(false); // drives fade in / out

  // Fade-in / fade-out lifecycle
  useEffect(() => {
    if (previewMode) {
      setMounted(true);
      setShown(true);
      return;
    }

    if (isLoading) {
      setMounted(true);
      // next frame so the opacity transition actually runs
      const raf = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(raf);
    }

    setShown(false);
    const t = setTimeout(() => setMounted(false), FADE_MS);
    return () => clearTimeout(t);
  }, [isLoading, previewMode]);

  // Safety net: never let the overlay get stuck
  useEffect(() => {
    if (previewMode || !isLoading) return;
    const t = setTimeout(() => {
      setShown(false);
      setTimeout(() => setMounted(false), FADE_MS);
    }, SAFETY_MS);
    return () => clearTimeout(t);
  }, [isLoading, previewMode]);

  if (!mounted) return null;

  const wrapper = previewMode
    ? 'relative w-full h-80 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl'
    : 'fixed inset-0 z-[99999]';

  return (
    <div
      className={`${wrapper} flex flex-col items-center justify-center bg-[#020617] select-none`}
      style={{
        opacity: shown ? 1 : 0,
        transition: `opacity ${FADE_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
        pointerEvents: shown ? 'auto' : 'none'
      }}
      role="status"
      aria-live="polite"
      aria-label="Loading Universal Travel Company"
    >
      <style>{`
        @keyframes utcLoaderBar {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(250%); }
        }
        @keyframes utcLoaderGlow {
          0%, 100% { opacity: 0.55; transform: scale(0.96); }
          50%      { opacity: 0.85; transform: scale(1.04); }
        }
        @keyframes utcLoaderRise {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .utc-loader-anim { animation: none !important; }
        }
      `}</style>

      {/* Cinematic backdrop: deep navy radial + soft blue bloom (behind the logo, never over it) */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_#0b1a3a_0%,_#020617_62%)]" />
      <div
        className="utc-loader-anim absolute w-[70vw] max-w-[640px] aspect-square rounded-full pointer-events-none bg-[radial-gradient(circle,_rgba(37,99,235,0.22)_0%,_rgba(2,6,23,0)_65%)]"
        style={{ animation: 'utcLoaderGlow 4.5s ease-in-out infinite', willChange: 'transform, opacity' }}
      />

      {/* Content */}
      <div
        className="utc-loader-anim relative z-10 flex flex-col items-center w-full px-6"
        style={{ animation: 'utcLoaderRise 700ms cubic-bezier(0.16, 1, 0.3, 1) both' }}
      >
        {/* Crisp vector logo — scales with viewport, no raster, no blur */}
        <UtcTravelLogo
          className={previewMode ? 'w-[300px] max-w-full h-auto' : 'w-[75vw] sm:w-[380px] lg:w-[450px] max-w-[500px] h-auto'}
        />

        {/* Thin glowing progress bar */}
        <div className={`${previewMode ? 'mt-3 w-40' : 'mt-6 sm:mt-8 w-44 sm:w-56'} h-[2px] rounded-full bg-white/10 overflow-hidden`}>
          <div
            className="utc-loader-anim h-full w-2/5 rounded-full bg-gradient-to-r from-transparent via-sky-300 to-transparent shadow-[0_0_8px_rgba(125,211,252,0.9)]"
            style={{ animation: 'utcLoaderBar 1.6s cubic-bezier(0.65, 0, 0.35, 1) infinite', willChange: 'transform' }}
          />
        </div>

        <p
          className={`${previewMode ? 'mt-2.5 text-[9px]' : 'mt-4 text-[10px] sm:text-xs'} font-medium uppercase tracking-[0.35em] pl-[0.35em] text-slate-300/90`}
          style={{ fontFamily: "Poppins, 'Segoe UI', Arial, sans-serif" }}
        >
          Loading Universal Travel Company
        </p>
      </div>
    </div>
  );
}
