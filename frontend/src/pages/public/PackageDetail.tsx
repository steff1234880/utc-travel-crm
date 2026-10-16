import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  MapPin,
  Clock,
  Star,
  Check,
  X,
  AlertCircle,
  Play,
  Calendar as CalendarIcon,
  ShieldCheck,
  Users,
  Sparkles,
  PhoneCall,
  FileText,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Info,
  Layers,
  Compass,
  CheckCircle2,
  ArrowRight,
  Upload,
  CreditCard,
  Building,
  Car,
  Utensils
} from 'lucide-react';
import api from '../../services/api';
import EnquiryModal from '../../components/EnquiryModal';
import WhatsAppEnquiryButton from '../../components/WhatsAppEnquiryButton';
interface ItineraryActivity {
  id: string;
  time?: string | null;
  description: string;
}

interface PackageItineraryDay {
  id: string;
  dayNumber: number;
  title: string;
  location?: string | null;
  description: string;
  mealsIncluded?: string | null;
  accommodation?: string | null;
  activities?: ItineraryActivity[];
}

interface PackagePricingTier {
  id: string;
  title: string;
  price: number;
  adultPrice: number;
  child6to17Price: number;
  child2to5Price: number;
  infantPrice: number;
  currency: string;
}

interface PackageDetailData {
  id: string;
  title: string;
  slug: string;
  overview: string;
  durationDays: number;
  durationNights: number;
  basePrice?: number;
  currency?: string;
  destination?: { name: string; slug?: string };
  category?: { name: string };
  travelType?: { name: string };
  heroImage?: string | null;
  mapImage?: string | null;
  highlightsVideo?: string | null;
  images?: Array<{ url: string; isFeatured?: boolean }>;
  videos?: Array<{ url: string; title?: string }>;
  highlights?: Array<{ id: string; text: string }>;
  topHighlights?: Array<{
    id: string;
    title: string;
    description?: string | null;
    image?: string | null;
    displayOrder: number;
    isActive: boolean;
  }>;
  inclusions?: Array<{ id: string; text: string }>;
  exclusions?: Array<{ id: string; text: string }>;
  itineraryDays?: PackageItineraryDay[];
  pricingVars?: PackagePricingTier[];
  popular?: boolean;
}

export default function PackageDetail() {
  const { slug } = useParams<{ slug: string }>();

  // Modals & Active State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<string>('Signature');
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [expandedDay, setExpandedDay] = useState<number | null>(1);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);

  // Scroll to top when the package changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  const { data: pkgData, isLoading, isError } = useQuery<{ data: PackageDetailData }>({
    queryKey: ['package-detail', slug],
    queryFn: async () => {
      const res = await api.get(`/packages/${slug}`);
      return res.data;
    },
    enabled: !!slug
  });

  const { data: homeContent } = useQuery({
    queryKey: ['homepage-content'],
    queryFn: async () => {
      const res = await api.get('/settings/homepage').catch(() => null);
      return res?.data?.data || null;
    }
  });

  const { data: pricingData } = useQuery({
    queryKey: ['tour-pricing'],
    queryFn: async () => {
      const res = await api.get('/tour-pricing').catch(() => null);
      return res?.data?.data || null;
    }
  });

  const { data: groupToursData } = useQuery<{ data: any[] }>({
    queryKey: ['package-group-tours-generic', slug],
    queryFn: async () => {
      const res = await api.get('/group-tours/calendar');
      return res.data;
    }
  });

  const pkg = pkgData?.data;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-12">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-bold text-slate-600 tracking-wide uppercase">Loading Luxury Package Details...</p>
        </div>
      </div>
    );
  }

  if (isError || !pkg) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Package Not Found</h2>
          <p className="text-xs text-slate-500 mb-6">The travel package you requested does not exist or has been unlisted.</p>
          <Link to="/packages" className="px-6 py-3 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow-md inline-block">
            ← Explore All Packages
          </Link>
        </div>
      </div>
    );
  }

  const mainImg = pkg.heroImage || pkg.images?.find(i => i.isFeatured)?.url || pkg.images?.[0]?.url || 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=1200&auto=format&fit=crop';
  const videoUrl = pkg.highlightsVideo || pkg.videos?.[0]?.url;

  const basePrice = pkg.basePrice || 24999;

  // Fallback defaults for rich experience sections
  const defaultInclusions = [
    'Luxury 5-Star Hotel & Resort Accommodations',
    'Private AC Chauffeur Transfers Throughout',
    'Daily Gourmet Breakfast & Select Specialty Dinners',
    'Guided Sightseeing Excursions with Entry Passes',
    'Dedicated 24/7 Concierge & Tour Manager Support',
    'Complimentary Welcome Kit & Travel Insurance Cover'
  ];

  const defaultExclusions = [
    'International Airfare & Visa Processing Fees',
    'Personal Laundry, Telephone Calls & Room Services',
    'Lunch and Unspecified Gourmet Beverages',
    'Optional Adventure Sports & Personal Gratuities'
  ];

  // Journey route points derived from itinerary
  const routePoints = pkg.itineraryDays?.length
    ? pkg.itineraryDays.map((day, idx) => ({
      step: idx + 1,
      title: day.title,
      location: day.location || pkg.destination?.name || 'Destination',
      mode: idx % 2 === 0 ? 'Private AC Sedan' : 'Scenic Express Train',
      overnight: day.accommodation || 'Luxury Resort & Spa'
    }))
    : [
      { step: 1, title: 'Arrival & Welcome', location: pkg.destination?.name || 'Main City', mode: 'Airport Transfer', overnight: '5-Star Grand Hotel' },
      { step: 2, title: 'Cultural Heritage Tour', location: 'Heritage Quarter', mode: 'Private AC Chauffeur', overnight: 'Heritage Boutique Resort' },
      { step: 3, title: 'Nature & Wildlife Excursion', location: 'National Sanctuary', mode: '4x4 Open Safari Jeep', overnight: 'Eco Luxury Lodge' },
      { step: 4, title: 'Relaxation & Leisure', location: 'Coastal Bay', mode: 'Private Sedan', overnight: 'Beachfront Resort' },
      { step: 5, title: 'Departure Transfer', location: 'Airport', mode: 'Private Transfer', overnight: 'Homebound Departure' }
    ];

  // Visual highlights fallback grid
  const topVisualHighlights: Array<{ title: string; label: string; image: string; description?: string | null }> = [
    {
      title: 'Scenic Landscapes & Vistas',
      label: 'Panoramic Views',
      image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=600&auto=format&fit=crop',
      description: null
    },
    {
      title: 'Wildlife & Nature Safaris',
      label: 'Guided Safaris',
      image: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?q=80&w=600&auto=format&fit=crop',
      description: null
    },
    {
      title: 'Heritage & Ancient Forts',
      label: 'Cultural Landmarks',
      image: 'https://images.unsplash.com/photo-1590059392631-f111e13364f3?q=80&w=600&auto=format&fit=crop',
      description: null
    },
    {
      title: 'Luxury Stays & Wellness',
      label: '5-Star Spa Resorts',
      image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=600&auto=format&fit=crop',
      description: null
    }
  ];

  // Helper to get tier pricing from DB
  const getTierPrice = (tierId: string, fallbackAdult: number, fallbackChild: number, fallbackInfant: number, fallbackSingle: number, fallbackBase: number) => {
    const dbTier = pricingData?.find((t: any) => t.tierId === tierId);
    if (dbTier) {
      return {
        price: dbTier.basePrice,
        adultPrice: dbTier.adultPrice,
        childPrice: dbTier.child6to17,
        infantPrice: dbTier.infantPrice,
        singleSupplement: dbTier.singleSupplement
      };
    }
    return {
      price: fallbackBase,
      adultPrice: fallbackAdult,
      childPrice: fallbackChild,
      infantPrice: fallbackInfant,
      singleSupplement: fallbackSingle
    };
  };

  // Resolve Normal pricing from this package's pricingVars
  const allPricingVars = pkg.pricingVars || [];
  const normalPricingVar = allPricingVars.find((pv: any) =>
    pv.title === 'Normal' || pv.title === 'normal'
  ) || allPricingVars[0] || null;

  const normalPricing = {
    perAdult: normalPricingVar?.adultPrice || normalPricingVar?.price || basePrice,
    perChild6to17: normalPricingVar?.child6to17Price || Math.round(basePrice * 0.65),
    perChild2to5: normalPricingVar?.child2to5Price || Math.round(basePrice * 0.35),
    perInfant: normalPricingVar?.infantPrice || Math.round(basePrice * 0.15),
  };

  // Document checklist items
  const documentChecklist = [
    { title: 'Passport', status: 'Required', desc: 'Valid for at least 6 months beyond travel date', icon: FileText },
    { title: 'Visa / Travel Permit', status: 'Required', desc: 'Electronic ETA or Entry Stamped Visa', icon: ShieldCheck },
    { title: 'Flight Tickets', status: 'Recommended', desc: 'Confirmed round-trip airline ticket details', icon: Compass },
    { title: 'Travel Medical Insurance', status: 'Recommended', desc: 'Comprehensive coverage up to USD 50,000', icon: ShieldCheck },
    { title: 'Government ID / Aadhaar', status: 'Optional', desc: 'For domestic hotel check-in verification', icon: CheckCircle2 }
  ];

  // FAQs
  const faqs = [
    {
      q: 'Are international flights included in this package rate?',
      a: 'Package rates cover ground arrangements, luxury accommodation, transfers, and sightseeing tours. International flights can be added seamlessly by our travel desk upon request.'
    },
    {
      q: 'What is the date customization and cancellation policy?',
      a: 'We offer 1 free date modification up to 14 days before departure. Cancellations made 14+ days prior receive a 100% credit voucher toward future journeys.'
    },
    {
      q: 'Can I choose between a Group Tour departure and a Custom Private Trip?',
      a: 'Yes! Our interactive calendar allows you to switch between fixed-departure Group Tours (with group savings) or Customize Dates for a private journey.'
    },
    {
      q: 'Are vegetarian, vegan, or halal dietary choices catered for?',
      a: 'Absolutey. All dining options and resort partners accommodate custom dietary preferences including Vegetarian, Vegan, Jain, and Halal options.'
    }
  ];

  return (
    <div className="bg-slate-50 min-h-screen text-slate-900 font-sans pb-24">
      {/* 1. PACKAGE HERO SECTION (UTCIN.COM-STYLE FULL-BLEED BANNER) */}
      <section
        id="home-hero"
        aria-label={`${pkg.title} featured journey`}
        className="utc-hero relative isolate flex items-center overflow-hidden bg-[#14060a] text-white min-h-[calc(100svh-5rem)] lg:min-h-[calc(100vh-5rem)]"
      >
        <style>{`
          .utc-hero { font-family: 'Poppins', ui-sans-serif, system-ui, sans-serif; }
          @keyframes utcHeroZoom { from { transform: scale(1.12); } to { transform: scale(1.02); } }
          @keyframes utcHeroFadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
          .utc-hero-media { animation: utcHeroZoom 14s ease-out both; }
          .utc-hero-reveal { animation: utcHeroFadeUp 0.9s cubic-bezier(0.22, 1, 0.36, 1) both; }
          @media (prefers-reduced-motion: reduce) {
            .utc-hero-media, .utc-hero-reveal { animation: none !important; }
          }
        `}</style>

        {/* Full-bleed background media (dynamic) */}
        <div className="absolute inset-0 -z-10">
          {videoUrl && (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) ? (
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <iframe
                src={`${videoUrl.replace('watch?v=', 'embed/')}?autoplay=1&mute=1&loop=1&controls=0&modestbranding=1&playsinline=1`}
                title="Hero Background Video"
                className="absolute top-1/2 left-1/2 w-[177.78vh] h-[56.25vw] min-w-full min-h-full -translate-x-1/2 -translate-y-1/2 border-0"
                allow="autoplay"
              ></iframe>
            </div>
          ) : (videoUrl ? (
            <video src={videoUrl} autoPlay loop muted playsInline className="utc-hero-media w-full h-full object-cover"></video>
          ) : (
            <img
              src={mainImg}
              alt={pkg.title}
              className="utc-hero-media w-full h-full object-cover object-center"
              fetchPriority="high"
            />
          ))}

          {/* Readability overlays: left-weighted shade (like reference) + soft bottom fade + subtle wine tint */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/10"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#14060a] via-[#14060a]/20 to-black/30"></div>
          <div className="absolute inset-0 bg-[#4a0e17]/20 mix-blend-multiply"></div>
        </div>

        <div className="relative w-full max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 pb-14 pt-28 sm:pb-20 sm:pt-32 lg:pb-24 lg:pt-36">
          <div className="mb-6 flex items-center justify-between">
            <Link to="/packages" className="inline-flex items-center text-xs font-bold text-slate-300 hover:text-white transition-colors bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10">
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to Packages
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-end">
            {/* Left Content */}
            <div className="lg:col-span-7">

              {/* Glass Pill Badge */}
              <div className="utc-hero-reveal inline-flex items-center gap-2 px-5 sm:px-6 py-2 sm:py-2.5 rounded-full bg-white/10 backdrop-blur-md border border-white/40 text-white/95 text-sm sm:text-base font-semibold shadow-lg shadow-black/20">
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>{pkg.category?.name || 'Premium Experience'}</span>
              </div>

              {/* Display Title */}
              <h1
                className="utc-hero-reveal mt-7 sm:mt-9 text-[2.15rem] leading-[1.18] sm:text-5xl sm:leading-[1.15] lg:text-[3.6rem] lg:leading-[1.12] font-bold text-white tracking-tight drop-shadow-[0_4px_24px_rgba(0,0,0,0.45)]"
                style={{ animationDelay: '120ms' }}
              >
                {pkg.title}
              </h1>

              {/* Subtitle */}
              <p
                className="utc-hero-reveal mt-5 sm:mt-6 text-[0.95rem] sm:text-lg lg:text-xl text-white/90 font-medium leading-relaxed max-w-2xl drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)]"
                style={{ animationDelay: '220ms' }}
              >
                {pkg.overview}
              </p>

              {/* Package Meta */}
              <div
                className="utc-hero-reveal mt-7 flex flex-wrap items-center gap-2.5 text-[11px] sm:text-xs font-medium text-white/90"
                style={{ animationDelay: '320ms' }}
              >
                <div className="px-3.5 py-2 bg-black/25 backdrop-blur-md rounded-full border border-white/15 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-amber-300" />
                  <span>{pkg.durationDays} Days / {pkg.durationNights} Nights</span>
                </div>
                <div className="px-3.5 py-2 bg-black/25 backdrop-blur-md rounded-full border border-white/15 flex items-center gap-2">
                  <Star className="w-3.5 h-3.5 text-amber-300 fill-current" />
                  <span>Premium Comfort</span>
                </div>
                <div className="px-3.5 py-2 bg-black/25 backdrop-blur-md rounded-full border border-white/15 flex items-center gap-2">
                  <Car className="w-3.5 h-3.5 text-amber-300" />
                  <span>Private Transfers</span>
                </div>
                <div className="px-3.5 py-2 bg-black/25 backdrop-blur-md rounded-full border border-white/15 flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>24/7 On-trip Support</span>
                </div>
              </div>

              {/* Hero Action Buttons */}
              <div
                className="utc-hero-reveal mt-10 sm:mt-14 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:gap-4"
                style={{ animationDelay: '420ms' }}
              >
                <button
                  id="hero-primary-cta"
                  onClick={() => setIsModalOpen(true)}
                  className="group inline-flex items-center justify-center gap-2 w-full sm:w-auto sm:min-w-[220px] px-9 py-4 rounded-xl bg-gradient-to-r from-[#8b182b] to-[#b0204a] hover:from-[#a31c33] hover:to-[#c72656] text-white text-base font-semibold border border-[#e0577a]/50 shadow-xl shadow-[#8b182b]/40 hover:-translate-y-0.5 transition-all duration-300"
                >
                  Plan My Trip
                  <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                </button>

                <a
                  id="hero-secondary-cta"
                  href="#date-selection"
                  className="inline-flex items-center justify-center w-full sm:w-auto px-8 py-4 rounded-xl bg-white/10 hover:bg-white/20 text-white text-base font-medium backdrop-blur-md border border-white/40 hover:border-white/60 hover:-translate-y-0.5 transition-all duration-300"
                >
                  Customise This Journey
                </a>

                {videoUrl && (
                  <button
                    id="hero-video-cta"
                    onClick={() => setIsVideoModalOpen(true)}
                    className="group inline-flex items-center justify-center gap-3 w-full sm:w-auto px-3 py-2 sm:py-3 text-white/90 hover:text-white text-sm font-medium transition-colors"
                  >
                    <span className="w-11 h-11 rounded-full bg-white/15 backdrop-blur-md border border-white/40 flex items-center justify-center group-hover:bg-amber-400/25 group-hover:border-amber-300/60 transition-all">
                      <Play className="w-4 h-4 ml-0.5 fill-current text-amber-200" />
                    </span>
                    Package Explanation Video
                  </button>
                )}
              </div>
            </div>

            {/* Right Summary Card (glass) */}
            <div className="utc-hero-reveal lg:col-span-5 xl:col-span-4 xl:col-start-9" style={{ animationDelay: '520ms' }}>
              <div className="rounded-3xl p-6 sm:p-7 bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl shadow-black/40 space-y-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="px-3 py-1 bg-[#8b182b] text-white text-[10px] font-semibold uppercase rounded-full tracking-wider border border-white/20">
                    Trending Package
                  </span>
                  <span className="text-xs font-medium text-white/75">{pkg.travelType?.name || 'Exclusive Luxury Experience'}</span>
                </div>

                <div className="flex items-end justify-between py-2 border-b border-white/15">
                  <div>
                    <div className="text-[10px] font-bold text-white/60 uppercase tracking-wider">Starting Price</div>
                    <div className="text-3xl font-black text-amber-300">
                      ₹{basePrice.toLocaleString('en-IN')}
                      <span className="text-xs text-white/60 font-normal"> / guest</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 border-b border-white/15 pb-4 text-sm font-medium text-white/90">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Best Price Guarantee</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>No Hidden Charges</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>100% Secure Booking</span>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <button
                    id="hero-check-availability"
                    onClick={() => setIsModalOpen(true)}
                    className="block w-full py-3.5 bg-white text-[#8b182b] hover:bg-amber-50 font-semibold rounded-xl text-center shadow-lg transition-all text-sm"
                  >
                    Check Availability
                  </button>

                  <WhatsAppEnquiryButton
                    packageName={pkg.title}
                    variant="outline"
                    className="w-full py-3 rounded-xl text-sm font-semibold !border-emerald-400/70 !text-emerald-300 hover:!bg-emerald-500/15"
                  />
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 2. TRUST / SOCIAL PROOF STRIP */}
      <div className="bg-white border-b border-slate-200/80 py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center text-xs">
            <div className="flex items-center justify-center space-x-2">
              <Users className="w-5 h-5 text-indigo-600" />
              <div>
                <span className="font-black text-slate-900 block text-sm">12,500+</span>
                <span className="text-slate-500 text-[11px]">Happy Travelers</span>
              </div>
            </div>

            <div className="flex items-center justify-center space-x-2">
              <Compass className="w-5 h-5 text-blue-600" />
              <div>
                <span className="font-black text-slate-900 block text-sm">450+</span>
                <span className="text-slate-500 text-[11px]">Recent Bookings</span>
              </div>
            </div>

            <div className="flex items-center justify-center space-x-2">
              <Star className="w-5 h-5 text-amber-500 fill-current" />
              <div>
                <span className="font-black text-slate-900 block text-sm">4.9 / 5.0 Rating</span>
                <span className="text-slate-500 text-[11px]">1,200+ Google Reviews</span>
              </div>
            </div>

            <div className="flex items-center justify-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <div>
                <span className="font-black text-slate-900 block text-sm">100% Verified</span>
                <span className="text-slate-500 text-[11px]">Licensed Operator</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN BODY CONTAINER */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">

        {/* 3. PACKAGE HIGHLIGHTS SECTION */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/90 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block mb-1">Key Features</span>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Package Highlights</h2>
            </div>
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold">
                {pkg.highlights?.length || 4} Major Highlights
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Highlights List */}
            <div className="space-y-4">
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Experience hand-picked activities and bucket-list moments designed to give you an authentic, unforgettable journey through {pkg.destination?.name || 'this destination'}.
              </p>

              <div className="space-y-3 pt-2">
                {(pkg.highlights?.length ? pkg.highlights.map(h => h.text) : [
                  'Panoramic Mountain & Coastal Scenic Drives',
                  'Exclusive Private Wildlife Safari Excursion',
                  'Heritage Architecture & Guided Cultural Walks',
                  'Gourmet Culinary Tastings & Local Flavours'
                ]).map((highlight, idx) => (
                  <div key={idx} className="flex items-start space-x-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                    <div className="p-1 bg-indigo-100 text-indigo-700 rounded-lg shrink-0 mt-0.5">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-800">{highlight}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual Video / Image Highlight Preview */}
            <div className="relative rounded-3xl overflow-hidden shadow-lg h-64 sm:h-72 border border-slate-200 group">
              <img src={mainImg} alt="Highlights Preview" className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent flex flex-col justify-end p-6">
                <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider mb-1">Signature Experience</span>
                <h4 className="text-lg font-bold text-white">{pkg.title} Highlights</h4>
                {videoUrl && (
                  <button
                    onClick={() => setIsVideoModalOpen(true)}
                    className="mt-3 inline-flex items-center px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white rounded-xl text-xs font-bold border border-white/30 transition-all self-start"
                  >
                    <Play className="w-3.5 h-3.5 mr-2 fill-current" /> Watch Video
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 4. TOP HIGHLIGHTS VISUAL GRID */}
        <section className="space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block">Visual Journey</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Top Visual Highlights</h2>
            <p className="text-xs text-slate-500">Glimpse the breathtaking spots and experiences included in your itinerary.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {(pkg.topHighlights?.filter(th => th.isActive !== false)?.length
              ? pkg.topHighlights.filter(th => th.isActive !== false).map(th => ({
                title: th.title,
                label: 'Top Highlight',
                image: th.image || mainImg,
                description: th.description
              }))
              : topVisualHighlights
            ).map((item, idx) => (
              <div key={idx} className="bg-white rounded-3xl overflow-hidden border border-slate-200/90 shadow-sm hover:shadow-md transition-all group">
                <div className="h-44 overflow-hidden relative">
                  <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500" />
                  <span className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-white/20">
                    {item.label}
                  </span>
                </div>
                <div className="p-4">
                  <h4 className="font-bold text-slate-900 text-sm mb-1">{item.title}</h4>
                  <p className="text-[11px] text-slate-500">{item.description || `Hand-crafted highlight of ${pkg.destination?.name || 'the itinerary'}.`}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 5. YOUR JOURNEY ROUTE TIMELINE */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/90 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block mb-1">Route & Locations</span>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Your Journey Route</h2>
            </div>
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full border border-indigo-100">
              {routePoints.length} Key Stops
            </span>
          </div>

          {/* Two-Column Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

            {/* LEFT SIDE: Contained Image / Map Area */}
            <div className="lg:col-span-5 relative rounded-2xl overflow-hidden border border-slate-200/80 bg-slate-900 flex items-center justify-center min-h-[260px] sm:min-h-[300px] shadow-xs group">
              {pkg.mapImage ? (
                <>
                  <img
                    src={pkg.mapImage}
                    alt="Package Journey Route Map"
                    className="w-full h-full object-cover sm:object-contain rounded-2xl group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1 rounded-full border border-white/20 uppercase tracking-wider">
                    Official Route Map
                  </div>
                </>
              ) : (
                <div className="p-6 text-center text-slate-400 space-y-2">
                  <MapPin className="w-10 h-10 text-indigo-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-300">Route Map Visual</p>
                  <p className="text-[11px] text-slate-500">{routePoints.length} Key Destinations Covered</p>
                </div>
              )}
            </div>

            {/* RIGHT SIDE: Key Stop Cards */}
            <div className="lg:col-span-7 bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200/70 flex flex-col justify-between space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {routePoints.slice(0, 6).map((point, idx) => (
                  <div key={idx} className="bg-white p-3.5 rounded-xl border border-slate-200/80 space-y-1.5 shadow-xs hover:border-indigo-300 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-mono font-bold text-[10px] flex items-center justify-center">
                        {point.step}
                      </span>
                      <span className="text-[9px] font-bold text-indigo-600 uppercase bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                        {point.mode}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-xs line-clamp-1">{point.title}</h4>
                    <div className="text-[10px] text-slate-500 flex items-center">
                      <MapPin className="w-3 h-3 mr-1 text-indigo-600 shrink-0" /> {point.location}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* BOTTOM LEGEND */}
          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs font-semibold text-slate-600">
            <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/60">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              <span className="text-[11px] font-bold text-slate-700">Private Chauffeur Transfers</span>
            </div>
            <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/60">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span className="text-[11px] font-bold text-slate-700">Scenic Train Journeys</span>
            </div>
            <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/60">
              <MapPin className="w-3.5 h-3.5 text-indigo-600" />
              <span className="text-[11px] font-bold text-slate-700">Luxury Accommodation</span>
            </div>
          </div>
        </section>

        

        {/* 7. DAY-WISE DETAILED ITINERARY */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/90 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block mb-1">Schedule & Activities</span>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Day-Wise Detailed Itinerary</h2>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              {pkg.durationDays} Days / {pkg.durationNights} Nights
            </span>
          </div>

          <div className="space-y-4">
            {(pkg.itineraryDays?.length ? pkg.itineraryDays : [
              { dayNumber: 1, title: 'Arrival & Welcome Reception', location: pkg.destination?.name || 'City', description: 'Arrive at airport, private chauffeur transfer to hotel. Enjoy welcome drinks and evening leisure.', mealsIncluded: 'Dinner', accommodation: 'Luxury 5-Star Hotel', activities: [] },
              { dayNumber: 2, title: 'Full Day Cultural Excursion', location: 'Heritage Center', description: 'Guided tour of historical monuments, local markets, and traditional handicraft centers.', mealsIncluded: 'Breakfast, Dinner', accommodation: 'Heritage Resort', activities: [] },
              { dayNumber: 3, title: 'Nature Safari & Wildlife Discovery', location: 'National Park', description: 'Early morning safari ride. Spot exotic flora & fauna followed by gourmet lunch.', mealsIncluded: 'Breakfast, Lunch', accommodation: 'Wilderness Lodge', activities: [] },
              { dayNumber: 4, title: 'Scenic Coastal Tour & Departure', location: 'Coastal Bay', description: 'Leisure morning, souvenir shopping, followed by chauffeur transfer to airport.', mealsIncluded: 'Breakfast', accommodation: 'Homebound Departure', activities: [] }
            ]).map((day: PackageItineraryDay | any) => {
              const displayImage = day.image || mainImg;
              return (
                <div key={day.dayNumber} className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm p-4 sm:p-6 mb-4">
                  <div className="flex flex-col md:flex-row gap-5 md:gap-6">
                    {displayImage && (
                      <div className="w-full md:w-[280px] lg:w-[320px] shrink-0 rounded-xl overflow-hidden self-start">
                        <div className="aspect-video w-full">
                          <img src={displayImage} alt={day.title} className="w-full h-full object-cover" />
                        </div>
                      </div>
                    )}
                    <div className="flex-1 space-y-4 text-xs text-slate-700">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-indigo-600 text-white">
                          DAY {day.dayNumber}
                        </span>
                        <span className="font-bold text-sm sm:text-lg text-slate-900">{day.title}</span>
                      </div>
                    
                    {day.location && (
                      <div className="flex items-center text-slate-500 font-medium text-xs mb-2">
                        <MapPin className="w-3.5 h-3.5 mr-1" /> {day.location}
                      </div>
                    )}

                    <p className="leading-relaxed text-slate-600 text-sm">{day.description}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      {day.mealsIncluded && (
                        <div className="flex items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <Utensils className="w-4 h-4 text-indigo-600 mr-2 shrink-0" />
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Meals</span>
                            <span className="font-bold text-slate-900">{day.mealsIncluded}</span>
                          </div>
                        </div>
                      )}
                      {day.accommodation && (
                        <div className="flex items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <Building className="w-4 h-4 text-indigo-600 mr-2 shrink-0" />
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Stay</span>
                            <span className="font-bold text-slate-900 line-clamp-1">{day.accommodation}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Activities List */}
                    {day.activities && day.activities.length > 0 && (
                      <div className="pt-3 border-t border-slate-100 space-y-2">
                        <span className="font-bold text-slate-900 uppercase text-[10px] tracking-wider block">Activities Schedule</span>
                        {day.activities.map((act: ItineraryActivity, actIdx: number) => (
                          <div key={actIdx} className="flex items-start space-x-2 text-slate-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0"></span>
                            <span>{act.time ? `${act.time} - ` : ''}{act.description}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        </section>

        {/* 8. GROUP TOUR PRICING (DYNAMIC TIERS) */}
        <section className="space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block">Group Tour Pricing</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Select Package Experience</h2>
            <p className="text-xs text-slate-500">Choose from our Essential, Signature, or Elite tiers.</p>
          </div>

          <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-indigo-600 shadow-xl space-y-6">
            {(() => {
              const packageGroupTours = groupToursData?.data?.filter((gt: any) => gt.packageId === pkg?.id) || [];
              const firstGroupTour = packageGroupTours.find((gt: any) => gt.pricing && gt.pricing.length > 0) || groupToursData?.data?.find((gt: any) => gt.pricing && gt.pricing.length > 0);
              const pricingList = firstGroupTour?.pricing || [];
              const hasNormalPricing = pricingList.some((p: any) => p.title.toLowerCase() === 'normal');

              if (hasNormalPricing) {
                const normalPricing = pricingList.find((p: any) => p.title.toLowerCase() === 'normal');
                return (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="bg-slate-50 rounded-2xl p-5 text-center border border-slate-200">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Adult (18+)</div>
                        <div className="text-2xl font-black text-indigo-600 mt-2">
                          {normalPricing?.adultPrice ? `₹${normalPricing.adultPrice.toLocaleString('en-IN')}` : 'See Dates'}
                        </div>
                        <div className="text-[9px] text-slate-400 mt-1">per person</div>
                      </div>
                      <div className="bg-slate-50 rounded-2xl p-5 text-center border border-slate-200">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Child (6–17)</div>
                        <div className="text-2xl font-black text-indigo-600 mt-2">
                          {normalPricing?.child6to17Price ? `₹${normalPricing.child6to17Price.toLocaleString('en-IN')}` : 'See Dates'}
                        </div>
                        <div className="text-[9px] text-slate-400 mt-1">per person</div>
                      </div>
                      <div className="bg-slate-50 rounded-2xl p-5 text-center border border-slate-200">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Child (2–5)</div>
                        <div className="text-2xl font-black text-indigo-600 mt-2">
                          {normalPricing?.child2to5Price ? `₹${normalPricing.child2to5Price.toLocaleString('en-IN')}` : 'See Dates'}
                        </div>
                        <div className="text-[9px] text-slate-400 mt-1">per person</div>
                      </div>
                      <div className="bg-slate-50 rounded-2xl p-5 text-center border border-slate-200">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Infant (0–2)</div>
                        <div className="text-2xl font-black text-indigo-600 mt-2">
                          {normalPricing?.infantPrice ? `₹${normalPricing.infantPrice.toLocaleString('en-IN')}` : 'See Dates'}
                        </div>
                        <div className="text-[9px] text-slate-400 mt-1">per person</div>
                      </div>
                    </div>
                  </>
                );
              }

              const activePricing = pricingList.find((p: any) => p.title.toLowerCase() === selectedTier.toLowerCase());

              return (
                <>
                  {/* Tiers Tabs */}
                  <div className="flex space-x-2 p-1.5 bg-slate-100 rounded-2xl mb-6">
                    {['Essential', 'Signature', 'Elite'].map((tier) => (
                      <button
                        key={tier}
                        onClick={() => setSelectedTier(tier)}
                        className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                          selectedTier === tier
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                        }`}
                      >
                        {tier}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-slate-50 rounded-2xl p-5 text-center border border-slate-200">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Adult (18+)</div>
                      <div className="text-2xl font-black text-indigo-600 mt-2">
                        {activePricing?.adultPrice ? `₹${activePricing.adultPrice.toLocaleString('en-IN')}` : 'See Dates'}
                      </div>
                      <div className="text-[9px] text-slate-400 mt-1">per person</div>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-5 text-center border border-slate-200">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Child (6–17)</div>
                      <div className="text-2xl font-black text-indigo-600 mt-2">
                        {activePricing?.child6to17Price ? `₹${activePricing.child6to17Price.toLocaleString('en-IN')}` : 'See Dates'}
                      </div>
                      <div className="text-[9px] text-slate-400 mt-1">per person</div>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-5 text-center border border-slate-200">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Child (2–5)</div>
                      <div className="text-2xl font-black text-indigo-600 mt-2">
                        {activePricing?.child2to5Price ? `₹${activePricing.child2to5Price.toLocaleString('en-IN')}` : 'See Dates'}
                      </div>
                      <div className="text-[9px] text-slate-400 mt-1">per person</div>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-5 text-center border border-slate-200">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Infant (0–2)</div>
                      <div className="text-2xl font-black text-indigo-600 mt-2">
                        {activePricing?.infantPrice ? `₹${activePricing.infantPrice.toLocaleString('en-IN')}` : 'See Dates'}
                      </div>
                      <div className="text-[9px] text-slate-400 mt-1">per person</div>
                    </div>
                  </div>
                </>
              );
            })()}

            {/* Book button */}
            <button
              onClick={() => {
                // Scroll to calendar
                document.getElementById('date-selection')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full py-3.5 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all shadow-sm bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20"
            >
              Select Dates &amp; Book Group Tour
            </button>
          </div>
        </section>

        {/* 9. INCLUSIONS & EXCLUSIONS */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* INCLUSIONS */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Package Inclusions</h3>
            </div>

            <div className="space-y-3 text-xs">
              {(pkg.inclusions?.length ? pkg.inclusions.map(i => i.text) : defaultInclusions).map((item, idx) => (
                <div key={idx} className="flex items-center text-slate-700 font-medium bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100/60">
                  <Check className="w-4 h-4 text-emerald-600 mr-2.5 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* EXCLUSIONS */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                <X className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Package Exclusions</h3>
            </div>

            <div className="space-y-3 text-xs">
              {(pkg.exclusions?.length ? pkg.exclusions.map(e => e.text) : defaultExclusions).map((item, idx) => (
                <div key={idx} className="flex items-center text-slate-700 font-medium bg-rose-50/50 p-2.5 rounded-xl border border-rose-100/60">
                  <X className="w-4 h-4 text-rose-500 mr-2.5 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 10. DOCUMENT CHECKLIST & UPLOAD */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block mb-1">Pre-Travel Requirements</span>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Travel Document Checklist</h2>
            </div>
            <button
              onClick={() => setIsDocModalOpen(true)}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl shadow-sm transition-all flex items-center"
            >
              <Upload className="w-4 h-4 mr-2" /> Upload Documents
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {documentChecklist.map((doc, idx) => (
              <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <doc.icon className="w-5 h-5 text-indigo-600" />
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${doc.status === 'Required'
                      ? 'bg-rose-100 text-rose-800 border-rose-200'
                      : doc.status === 'Recommended'
                        ? 'bg-amber-100 text-amber-800 border-amber-200'
                        : 'bg-slate-200 text-slate-700 border-slate-300'
                    }`}>
                    {doc.status}
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 text-xs">{doc.title}</h4>
                <p className="text-[11px] text-slate-500">{doc.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 11. FREQUENTLY ASKED QUESTIONS (FAQ) */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-4">
            <HelpCircle className="w-6 h-6 text-indigo-600" />
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Frequently Asked Questions</h2>
              <p className="text-xs text-slate-500 font-medium">Clear answers to common queries regarding this itinerary.</p>
            </div>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div key={idx} className="border border-slate-200/90 rounded-2xl overflow-hidden transition-all">
                  <button
                    onClick={() => setActiveFaq(isOpen ? null : idx)}
                    className="w-full p-4 text-left font-bold text-xs sm:text-sm text-slate-900 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                  </button>
                  {isOpen && (
                    <div className="p-4 sm:p-5 bg-white text-xs text-slate-600 leading-relaxed border-t border-slate-100">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* 12. BOOKING & CANCELLATION POLICY */}
        <section className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex items-center space-x-3 border-b border-slate-800 pb-4">
            <ShieldCheck className="w-6 h-6 text-indigo-400" />
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">Booking & Cancellation Policy</h2>
              <p className="text-xs text-slate-400">Transparent guidelines for easy modifications and refunds.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
            <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 space-y-1.5">
              <span className="font-bold text-indigo-300 block text-xs uppercase tracking-wider">Free Cancellation</span>
              <p className="text-slate-300 leading-relaxed">Cancel up to 14 days prior to departure date for a 100% credit refund towards future trips.</p>
            </div>

            <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 space-y-1.5">
              <span className="font-bold text-blue-300 block text-xs uppercase tracking-wider">Date Modifications</span>
              <p className="text-slate-300 leading-relaxed">1 free departure date modification allowed up to 7 days before scheduled journey.</p>
            </div>

            <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 space-y-1.5">
              <span className="font-bold text-emerald-300 block text-xs uppercase tracking-wider">Payment Milestones</span>
              <p className="text-slate-300 leading-relaxed">20% advance deposit to confirm booking date. Remaining balance payable 10 days prior.</p>
            </div>
          </div>
        </section>

        {/* 13. FINAL CTA BANNER */}
        <section className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 text-white rounded-3xl p-8 sm:p-12 text-center shadow-2xl relative overflow-hidden space-y-6 border border-white/10">
          <div className="max-w-2xl mx-auto space-y-4 relative z-10">
            <span className="px-3.5 py-1 bg-white/10 text-indigo-300 rounded-full text-xs font-bold uppercase tracking-widest backdrop-blur-md border border-white/10">
              Universal Travel Company Experience
            </span>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
              "This is not just a trip. It's a story you will remember forever."
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto">
              Our travel specialists are ready to craft every detail of your journey.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/30 transition-all text-xs uppercase tracking-wider flex items-center"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Plan My Trip
              </button>

              <a
                href={`https://wa.me/${(homeContent?.whatsappNumber || import.meta.env.VITE_WHATSAPP_NUMBER || '919876543210').replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="px-7 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl backdrop-blur-md border border-white/20 transition-all text-xs flex items-center"
              >
                <PhoneCall className="w-4 h-4 mr-2 text-emerald-400" />
                Talk to Travel Expert
              </a>
            </div>
          </div>
        </section>

      </div>

      {/* ENQUIRY MODAL */}
      <EnquiryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        packageName={pkg.title}
        packageId={pkg.id}
        selectedTier={selectedTier}
      />

      {/* VIDEO MODAL PLAYER */}
      {isVideoModalOpen && videoUrl && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl overflow-hidden max-w-3xl w-full border border-slate-800 shadow-2xl relative">
            <button
              onClick={() => setIsVideoModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-full bg-slate-800/80 backdrop-blur-md z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="p-4 border-b border-slate-800">
              <h3 className="font-bold text-white text-sm">{pkg.title} - Video Highlight</h3>
            </div>
            <div className="aspect-video w-full">
              <iframe
                src={videoUrl.replace('watch?v=', 'embed/')}
                title="Highlight Video"
                className="w-full h-full border-0"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENT UPLOAD MODAL */}
      {isDocModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Upload className="w-5 h-5 text-indigo-600" />
                <h3 className="font-black text-slate-900 text-lg">Document Upload Center</h3>
              </div>
              <button onClick={() => setIsDocModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Upload copies of your Passport, Visa, or ID proof. Your documents are encrypted and accessible only by your assigned travel manager.
            </p>

            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer space-y-3">
              <Upload className="w-8 h-8 text-indigo-600 mx-auto" />
              <div>
                <span className="font-bold text-slate-900 text-xs block">Click to select files or drag & drop</span>
                <span className="text-[10px] text-slate-400">PDF, JPG, PNG (Max 10MB)</span>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setIsDocModalOpen(false)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Close
              </button>
              <button
                onClick={() => {
                  alert('Documents recorded for your trip booking verification!');
                  setIsDocModalOpen(false);
                }}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md"
              >
                Submit Documents
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

