import React, { useState, useEffect } from 'react';
import { useAuth, UserProfile } from '../../context/AuthContext';
import UtcTravelLogo from '../common/UtcTravelLogo';
import { Sparkles, ArrowRight, Briefcase } from 'lucide-react';

export default function EmployeeWelcomeModal() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    // Check if welcome popup should be shown
    const justLoggedIn = sessionStorage.getItem('utc_just_logged_in') === 'true';
    const alreadyShown = sessionStorage.getItem('utc_welcome_popup_shown') === 'true';

    if (justLoggedIn && !alreadyShown) {
      // Mark as shown immediately so neither strict mode re-mount nor route transition skips or duplicates it
      sessionStorage.setItem('utc_welcome_popup_shown', 'true');
      sessionStorage.removeItem('utc_just_logged_in');
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 280);
  };

  if (!isOpen) return null;

  // 1. Time-based Greeting dynamically calculated for India (IST – Asia/Kolkata)
  // - 5:00 AM – 11:59 AM → Good Morning
  // - 12:00 PM – 4:59 PM → Good Afternoon
  // - 5:00 PM – 8:59 PM → Good Evening
  // - 9:00 PM – 4:59 AM → Good Night
  const getGreeting = (now: Date = new Date()) => {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false
      }).formatToParts(now);

      const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10) % 24;
      const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
      const totalMinutes = hour * 60 + minute;

      if (totalMinutes >= 300 && totalMinutes < 720) {
        return 'Good Morning';
      } else if (totalMinutes >= 720 && totalMinutes < 1020) {
        return 'Good Afternoon';
      } else if (totalMinutes >= 1020 && totalMinutes < 1260) {
        return 'Good Evening';
      } else {
        return 'Good Night';
      }
    } catch {
      // Fallback in the rare case Intl timezone format fails
      const hour = now.getHours();
      if (hour >= 5 && hour < 12) return 'Good Morning';
      if (hour >= 12 && hour < 17) return 'Good Afternoon';
      if (hour >= 17 && hour < 21) return 'Good Evening';
      return 'Good Night';
    }
  };

  // 2. Resolve Personalized Display Name (with fallback for any user profile)
  const getDisplayName = (userObj: UserProfile | null): string => {
    if (userObj?.employee?.firstName) {
      return userObj.employee.firstName.trim();
    }
    // Fallback: extract from cached profile or user email
    let email = userObj?.email;
    if (!email) {
      try {
        const cached = localStorage.getItem('user_profile');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.employee?.firstName) return parsed.employee.firstName.trim();
          email = parsed?.email;
        }
      } catch {}
    }

    if (email) {
      const emailPrefix = email.split('@')[0];
      const cleaned = emailPrefix.split('.')[0];
      return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }
    return 'Team Member';
  };

  // 3. Resolve Role / Designation Display
  const getRoleDesignation = (userObj: UserProfile | null): string => {
    if (userObj?.employee?.designation?.name) {
      return userObj.employee.designation.name;
    }
    let role = userObj?.roleName;
    if (!role) {
      try {
        const cached = localStorage.getItem('user_profile');
        if (cached) {
          const parsed = JSON.parse(cached);
          role = parsed?.roleName || parsed?.role?.name;
        }
      } catch {}
    }

    if (role) {
      if (role === 'SUPER_ADMIN') return 'Super Administrator';
      if (role === 'ADMIN') return 'System Administrator';
      return role;
    }
    return 'Travel Specialist';
  };

  // 4. Role-specific Motivational Tagline
  const getRoleTagline = (roleName?: string): string => {
    const r = (roleName || '').toUpperCase();
    if (r.includes('CEO') || r.includes('SUPER') || r === 'ADMIN') {
      return 'Overseeing seamless global journeys and company excellence.';
    }
    if (r.includes('SALES') || r.includes('CRM')) {
      return 'Connecting dream destinations with our valued travelers today.';
    }
    if (r.includes('OPERAT') || r.includes('TOUR') || r.includes('RESERVATION')) {
      return 'Crafting flawless itineraries and unforgettable travel experiences.';
    }
    if (r.includes('ACCOUNT') || r.includes('FINANCE')) {
      return 'Ensuring financial clarity and secure travel transactions.';
    }
    if (r.includes('HR')) {
      return 'Empowering our exceptional UTC Travel team every day.';
    }
    return 'Creating memorable travel experiences for our customers.';
  };

  const greeting = getGreeting();
  const firstName = getDisplayName(user);
  const designationOrRole = getRoleDesignation(user);
  const departmentName = user?.employee?.department?.name;
  const roleTagline = getRoleTagline(user?.roleName);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-modal-title"
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 ease-out ${
        isClosing ? 'opacity-0 scale-98 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Premium Backdrop with soft blur matching light luxury theme */}
      <div
        onClick={handleClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300"
      />

      {/* Modal Dialog Card */}
      <div
        className={`relative w-full max-w-lg bg-white rounded-3xl shadow-[0_20px_60px_-15px_rgba(15,23,42,0.22)] border border-slate-100 overflow-hidden transform transition-all duration-300 ${
          isClosing ? 'scale-95 translate-y-2' : 'scale-100 translate-y-0'
        }`}
      >
        {/* Subtle Top Accent Gradient Bar matching UTC Travel Crimson / Burgundy Brand */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#8b182b] via-[#b91c1c] to-amber-500" />

        <div className="p-7 sm:p-9 text-slate-800">
          {/* Header Row: Official UTC Logo & Session Badge */}
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-28 sm:w-32 bg-slate-900/95 px-3 py-1.5 rounded-xl shadow-xs border border-slate-800 flex items-center justify-center">
                <UtcTravelLogo className="w-full h-auto text-white" animated={false} />
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Active Session</span>
            </div>
          </div>

          {/* Personalized Greeting */}
          <div className="space-y-1 mb-4">
            <h2
              id="welcome-modal-title"
              className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight flex items-center gap-2 flex-wrap"
            >
              <span>{greeting}, {firstName}!</span>
              <span className="text-2xl sm:text-3xl inline-block origin-bottom-right hover:rotate-12 transition-transform select-none">
                👋
              </span>
            </h2>

            {/* Designation / Role Badge */}
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100/90 text-slate-700 text-xs font-semibold border border-slate-200/60">
                <Briefcase className="w-3.5 h-3.5 text-[#8b182b]" />
                <span>{designationOrRole}</span>
              </div>

              {departmentName && (
                <span className="text-xs text-slate-500 font-medium">
                  • <span className="font-semibold text-slate-700">{departmentName}</span>
                </span>
              )}
            </div>
          </div>

          {/* Welcome Message Body */}
          <div className="my-5 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-rose-50/30 border border-slate-100 text-slate-700 space-y-2 text-sm leading-relaxed">
            <p className="font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#8b182b] shrink-0" />
              <span>Welcome back to UTC Travel!</span>
            </p>
            <p className="text-slate-600 text-xs sm:text-sm">
              We're glad to have you here. Let's make today productive and create memorable travel experiences for our customers.
            </p>
            {roleTagline && (
              <p className="text-[11px] text-[#8b182b] font-semibold pt-1 border-t border-slate-200/60">
                {roleTagline}
              </p>
            )}
          </div>

          {/* Action Button: Let's Get Started */}
          <div className="pt-2 flex items-center justify-end">
            <button
              onClick={handleClose}
              autoFocus
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-[#8b182b] to-[#a31b32] hover:from-[#731423] hover:to-[#8b182b] text-white font-bold text-sm shadow-md hover:shadow-lg active:scale-95 transition-all duration-200 cursor-pointer"
            >
              <span>Let's Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
