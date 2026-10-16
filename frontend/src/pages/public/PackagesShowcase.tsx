import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Sparkles,
  MapPin,
  Clock,
  Star,
  ShieldCheck,
  CheckCircle2,
  Play,
  ArrowRight,
  Upload,
  ChevronRight,
  Calendar as CalendarIcon,
  X,
  Plus,
  Minus,
  HelpCircle,
  Building,
  Car,
  Utensils,
  Train,
  Check,
  AlertCircle
} from 'lucide-react';
import api from '../../services/api';
import EnquiryModal from '../../components/EnquiryModal';
import WhatsAppEnquiryButton from '../../components/WhatsAppEnquiryButton';
import GlobalTravelCalendar from '../../components/GlobalTravelCalendar';

export default function Home() {
  const [isEnquiryModalOpen, setIsEnquiryModalOpen] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);
  const [selectedTier, setSelectedTier] = useState<string>('Signature');

  const { data: groupToursData } = useQuery<{ data: any[] }>({
    queryKey: ['package-group-tours-generic', 'home'],
    queryFn: async () => {
      const res = await api.get('/group-tours/calendar');
      return res.data;
    }
  });

  // Fetch package details or homepage content from backend
  const { data: pkgData } = useQuery({
    queryKey: ['home-package-detail'],
    queryFn: async () => {
      const res = await api.get('/packages?status=PUBLISHED&isFeatured=true').catch(() => null);
      if (res?.data?.data && res.data.data.length > 0) {
        return res.data.data[0];
      }
      const fallback = await api.get('/packages?status=PUBLISHED').catch(() => null);
      return fallback?.data?.data?.[0] || null;
    }
  });

  const { data: homeContentData } = useQuery({
    queryKey: ['homepage-content'],
    queryFn: async () => {
      const res = await api.get('/settings/homepage').catch(() => null);
      return res?.data?.data || null;
    }
  });

  const content = homeContentData?.content;
  const pkg = pkgData || {
    title: 'Into The Heart of Ceylon',
    overview: 'Tea trails, scenic train journeys, wildlife safaris and coastal charm across Sri Lanka.',
    durationDays: 5,
    durationNights: 4,
    basePrice: 59999,
    category: { name: 'Premium Sri Lanka Experience' }
  };

  const heroMediaType = content?.heroMediaType || 'IMAGE';
  const heroTitle = content?.heroTitle || pkg?.title || 'Into The Heart of Ceylon';
  const heroSubtitle = content?.heroSubtitle || pkg?.overview || 'Tea trails, scenic train journeys, wildlife safaris and coastal charm across Sri Lanka.';
  const heroImg = content?.heroImage || pkg?.heroImage || 'https://images.unsplash.com/photo-1546708973-b339540b5162?q=80&w=1600&auto=format&fit=crop';
  const heroVideo = content?.heroVideoUrl || content?.videoUrl || pkg?.highlightsVideo || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  const primaryCtaText = content?.primaryCtaText || 'Plan My Trip';
  const primaryCtaLink = content?.primaryCtaLink || '#date-selection';
  const secondaryCtaText = content?.secondaryCtaText || 'Customise This Journey';
  const secondaryCtaLink = content?.secondaryCtaLink || '#date-selection';
  const videoUrl = content?.videoUrl || pkg?.highlightsVideo || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  const mapActive = content?.mapActive !== false;
  const mapImg = mapActive ? (content?.mapImage || pkg?.mapImage || null) : null;

  const topHighlightsList = [
    { title: 'Scenic Train Journey', label: 'Hill Country', image: 'https://images.unsplash.com/photo-1546708973-b339540b5162?q=80&w=400' },
    { title: 'Yala Jeep Safari', label: 'Wildlife Safari', image: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?q=80&w=400' },
    { title: 'Ramboda Waterfalls', label: 'Scenic Waterfalls', image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=400' },
    { title: 'Galle Dutch Fort', label: 'Coastal Heritage', image: 'https://images.unsplash.com/photo-1590059392631-f111e13364f3?q=80&w=400' },
    { title: 'Tea Plantation Experience', label: 'Estate Excursion', image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=400' },
    { title: 'Cultural Heritage', label: 'Temple Tour', image: 'https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?q=80&w=400' }
  ];

  const itineraryDays = [
    {
      day: 1,
      title: 'Arrival in Sri Lanka / Kandy',
      location: 'Kandy',
      transport: 'Transfer',
      hotel: 'Hotel',
      desc: 'Arrive at Colombo Airport. Meet our representative and transfer to Kandy. Visit Temple of the Tooth Relic & Kandy Lake.',
      overnight: 'Kandy',
      image: 'https://images.unsplash.com/photo-1546708973-b339540b5162?q=80&w=400'
    },
    {
      day: 2,
      title: 'Kandy to Nuwara Eliya',
      location: 'Nuwara Eliya',
      transport: 'Train',
      hotel: 'Sightseeing',
      desc: 'Scenic train journey to Nuwara Eliya. Visit Ramboda Waterfall, Tea Plantations & Gregory Lake.',
      overnight: 'Nuwara Eliya',
      image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=400'
    },
    {
      day: 3,
      title: 'Nuwara Eliya to Ella / Yala',
      location: 'Ella / Yala',
      transport: 'Transfer',
      hotel: 'Safari',
      desc: 'Scenic train ride to Ella, visit Nine Arch Bridge and Ravana Falls. Later drive to Yala.',
      overnight: 'Yala',
      image: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?q=80&w=400'
    },
    {
      day: 4,
      title: 'Yala Safari / Galle / Colombo',
      location: 'Galle / Colombo',
      transport: 'Safari',
      hotel: 'Sightseeing',
      desc: 'Early morning jeep safari in Yala. Proceed to Galle Dutch Fort and continue to Colombo.',
      overnight: 'Colombo',
      image: 'https://images.unsplash.com/photo-1590059392631-f111e13364f3?q=80&w=400'
    },
    {
      day: 5,
      title: 'Colombo / Departure',
      location: 'Colombo Airport',
      transport: 'Transfer',
      hotel: 'Departure',
      desc: 'City tour, shopping and memories before airport transfer for homebound departure.',
      overnight: 'Colombo Airport',
      image: 'https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?q=80&w=400'
    }
  ];

  const faqs = [
    { q: 'Is visa included in this package?', a: 'Visa guidance and ETA support is included. Travelers can apply for online tourist eVisa before departure.' },
    { q: 'What is the best time to visit Sri Lanka?', a: 'Sri Lanka is a year-round destination. The west and south coasts are best from November to April.' },
    { q: 'Is this package suitable for senior citizens?', a: 'Yes! All transfers are conducted via private AC vehicles with easy pacing.' },
    { q: 'What kind of vehicle will be provided?', a: 'Private AC Sedan for up to 3 guests, AC Mini-van for 4-6 guests.' },
    { q: 'Can I customise this package?', a: 'Absolutely! Click "Customise My Trip" to tailor hotel category, nights, or extra safari rides.' }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 font-sans pb-16">

      {/* ==================================================
          1. HERO SECTION (EXACT MATCH REFERENCE DESIGN)
      ================================================== */}
      <section className="relative bg-[#2e070c] text-white pt-10 pb-20 overflow-hidden border-b border-[#4d0c15]">
        {/* Full Width Hero Background with Dark Wine Overlay */}
        <div className="absolute inset-0 z-0">
          {heroMediaType === 'VIDEO' && heroVideo ? (
            heroVideo.includes('youtube.com') || heroVideo.includes('youtu.be') ? (
              <iframe
                src={`${heroVideo.replace('watch?v=', 'embed/')}?autoplay=1&mute=1&loop=1`}
                title="Hero Background Video"
                className="w-full h-full object-cover opacity-40 scale-105 pointer-events-none"
                allow="autoplay"
              ></iframe>
            ) : (
              <video src={heroVideo} autoPlay loop muted playsInline className="w-full h-full object-cover opacity-40 scale-105"></video>
            )
          ) : (
            <img src={heroImg} alt="Universal Travel Company Hero" className="w-full h-full object-cover opacity-40 scale-105" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#2e070c] via-[#2e070c]/70 to-[#2e070c]/40"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6">

              {/* Pill Badge */}
              <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-amber-200 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>{pkg.category?.name || 'Premium Sri Lanka Experience'}</span>
              </div>

              {/* Large Display Title */}
              <h1 className="text-4xl sm:text-6xl font-serif font-bold text-white tracking-tight leading-tight">
                {heroTitle}
              </h1>

              {/* Subtitle */}
              <p className="text-sm sm:text-lg text-slate-200 font-light leading-relaxed max-w-2xl">
                {heroSubtitle}
              </p>

              {/* Package Meta Pills */}
              <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
                <div className="px-3.5 py-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/15 flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-amber-300" />
                  <span>{pkg.durationDays} Days / {pkg.durationNights} Nights</span>
                </div>
                <div className="px-3.5 py-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/15 flex items-center space-x-2">
                  <Star className="w-4 h-4 text-amber-300 fill-current" />
                  <span>Premium Comfort</span>
                </div>
                <div className="px-3.5 py-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/15 flex items-center space-x-2">
                  <Car className="w-4 h-4 text-amber-300" />
                  <span>Private Transfers</span>
                </div>
                <div className="px-3.5 py-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/15 flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>24/7 On-trip Support</span>
                </div>
              </div>

              {/* Hero Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-4">
                <button
                  onClick={() => setIsEnquiryModalOpen(true)}
                  className="px-8 py-4 bg-[#8b182b] hover:bg-[#a31c33] text-white font-bold rounded-2xl shadow-xl shadow-rose-950/50 transition-all text-xs uppercase tracking-wider border border-white/20"
                >
                  {primaryCtaText}
                </button>

                <a
                  href={secondaryCtaLink}
                  className="px-7 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl backdrop-blur-md border border-white/25 transition-all text-xs uppercase tracking-wider"
                >
                  {secondaryCtaText}
                </a>

                {videoUrl && (
                  <button
                    onClick={() => setIsVideoModalOpen(true)}
                    className="px-5 py-4 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-bold rounded-2xl backdrop-blur-md border border-amber-400/30 transition-all text-xs flex items-center"
                  >
                    <Play className="w-4 h-4 mr-2 fill-current" />
                    Package Explanation Video
                  </button>
                )}
              </div>
            </div>

            {/* Right Summary Card */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-2xl text-slate-900 space-y-6 border border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 bg-[#8b182b] text-white text-[10px] font-bold uppercase rounded-full tracking-wider">
                    Trending Package
                  </span>
                  <span className="text-xs font-bold text-slate-500">All Inclusive Package</span>
                </div>

                <div className="space-y-3 border-y border-slate-100 py-4 text-xs font-bold text-slate-700">
                  <div className="flex items-center space-x-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Best Price Guarantee</span>
                  </div>
                  <div className="flex items-center space-x-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>No Hidden Charges</span>
                  </div>
                  <div className="flex items-center space-x-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>100% Secure Booking</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <a
                    href="#date-selection"
                    className="block w-full py-4 bg-[#8b182b] hover:bg-[#a31c33] text-white font-bold rounded-2xl text-center shadow-md transition-all text-xs uppercase tracking-wider"
                  >
                    Check Availability
                  </a>

                  <WhatsAppEnquiryButton
                    packageName={pkg.title}
                    variant="outline"
                    className="w-full py-3.5 rounded-2xl text-xs font-bold"
                  />
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ==================================================
          2. TRUST / INFORMATION STRIP (EXACT MATCH)
      ================================================== */}
      <section className="bg-white border-b border-slate-200 py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center text-xs">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Loved By</span>
              <span className="text-base font-black text-slate-900 block mt-0.5">28,000+ Travelers</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Recent Bookings</span>
              <span className="text-base font-black text-slate-900 block mt-0.5">38 Booked in last week</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Google Ratings</span>
              <span className="text-base font-black text-slate-900 block mt-0.5">4.8 / 5 (1,250+ Reviews)</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Traveller Trust</span>
              <span className="text-base font-black text-slate-900 block mt-0.5">15,000+ Happy Travelers</span>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================
          3. PACKAGE HIGHLIGHTS VIDEO (EXACT MATCH)
      ================================================== */}
      <section className="py-16 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">

            {/* Left: Video Player Card */}
            <div className="lg:col-span-7">
              <div className="rounded-3xl overflow-hidden shadow-xl bg-slate-900 aspect-video relative group border border-slate-200">
                {videoUrl ? (
                  videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be') ? (
                    <iframe src={videoUrl.replace('watch?v=', 'embed/')} title="Package Highlight Video" className="w-full h-full border-0" allowFullScreen></iframe>
                  ) : (
                    <video src={videoUrl} controls className="w-full h-full object-cover"></video>
                  )
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-slate-900 text-white">
                    <Play className="w-12 h-12 text-amber-400 fill-current mb-2" />
                    <span className="font-bold text-sm">Package Explanation Video</span>
                  </div>
                )}
                <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur-md text-white text-[10px] font-mono font-bold px-3 py-1 rounded-full border border-white/20">
                  02:45
                </div>
              </div>
            </div>

            {/* Right: Watch the Journey Unfold */}
            <div className="lg:col-span-5 space-y-6">
              <div>
                <span className="text-xs font-bold text-[#8b182b] uppercase tracking-wider block mb-1">Package Highlights Video</span>
                <h2 className="text-3xl font-serif font-bold text-slate-900 tracking-tight">Watch the Journey Unfold</h2>
                <p className="text-xs text-slate-600 leading-relaxed mt-2">
                  From misty mountains to golden beaches, experience the best of Sri Lanka in this curated journey.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center text-center space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-[#8b182b]/10 text-[#8b182b] flex items-center justify-center font-bold">🌄</div>
                  <span className="font-bold text-xs text-slate-900">Scenic Landscapes</span>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center text-center space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-[#8b182b]/10 text-[#8b182b] flex items-center justify-center font-bold">🐘</div>
                  <span className="font-bold text-xs text-slate-900">Wildlife Encounters</span>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center text-center space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-[#8b182b]/10 text-[#8b182b] flex items-center justify-center font-bold">🏛️</div>
                  <span className="font-bold text-xs text-slate-900">Cultural Experiences</span>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center text-center space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-[#8b182b]/10 text-[#8b182b] flex items-center justify-center font-bold">🍲</div>
                  <span className="font-bold text-xs text-slate-900">Local Flavours</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ==================================================
          4. THREE-PART LAYOUT (HIGHLIGHTS + ROUTE + DATE)
      ================================================== */}
      {/* ==================================================
          4. TOP HIGHLIGHTS, JOURNEY ROUTE & DATE SELECTION
      ================================================== */}
      <section className="py-12 sm:py-16 bg-slate-50/80 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

          {/* Top Highlights Bar */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-serif font-bold text-slate-900 text-base sm:text-lg uppercase tracking-wider">Top Highlights</h3>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sri Lanka Expeditions</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {topHighlightsList.map((item, idx) => (
                <div key={idx} className="bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex items-center space-x-2.5 p-2 group">
                  <img src={item.image} alt={item.title} className="w-12 h-12 rounded-xl object-cover shrink-0 group-hover:scale-105 transition-transform" />
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-900 text-xs truncate">{item.title}</h4>
                    <span className="text-[10px] text-slate-400 font-medium block truncate">{item.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Main Grid: Premium Route Card (8 Cols) + Calendar (4 Cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

            {/* Left/Center: Premium Website Route / Journey Card */}
            <div className="lg:col-span-8 bg-white p-5 sm:p-6 lg:p-7 rounded-3xl border border-slate-200/90 shadow-sm space-y-6">

              {/* Card Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[11px] font-bold text-[#8b182b] uppercase tracking-wider block">Official Expedition Map</span>
                  <h3 className="font-serif font-bold text-slate-900 text-xl tracking-tight uppercase">Your Journey Route</h3>
                </div>
                <span className="text-[11px] font-bold text-[#8b182b] bg-[#8b182b]/10 border border-[#8b182b]/20 px-3 py-1 rounded-full uppercase tracking-wider">
                  7 Destinations
                </span>
              </div>

              {/* Two-Column Content Grid: Image Left, Route Stops Right */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">

                {/* LEFT SIDE: Contained Image / Map Area */}
                <div className="md:col-span-6 relative rounded-2xl overflow-hidden border border-slate-200/80 bg-slate-900 flex items-center justify-center min-h-[260px] sm:min-h-[300px] shadow-xs group">
                  {mapImg ? (
                    <>
                      <img
                        src={mapImg}
                        alt="Your Journey Route Map Visual"
                        className="w-full h-full object-cover sm:object-contain rounded-2xl group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1 rounded-full border border-white/20 uppercase tracking-wider">
                        Official Route Map
                      </div>
                    </>
                  ) : (
                    <div className="p-6 text-center text-slate-400 space-y-2">
                      <MapPin className="w-10 h-10 text-slate-500 mx-auto" />
                      <p className="text-xs font-bold text-slate-300">Route Map Visual</p>
                      <p className="text-[11px] text-slate-500">7 Destinations across Sri Lanka</p>
                    </div>
                  )}
                </div>

                {/* RIGHT SIDE: Route Details & Stops */}
                <div className="md:col-span-6 bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200/70 flex flex-col justify-between space-y-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-3">Key Expedition Stops</span>
                    <div className="space-y-2 text-xs font-bold">
                      {[
                        { num: 1, name: 'Airport (Arrival in Sri Lanka)' },
                        { num: 2, name: 'Kandy (Cultural Capital)' },
                        { num: 3, name: 'Nuwara Eliya (Hill Country)' },
                        { num: 4, name: 'Ella (Scenic Train Journey)' },
                        { num: 5, name: 'Yala (Wildlife Safari)' },
                        { num: 6, name: 'Galle (Coastal Heritage)' },
                        { num: 7, name: 'Colombo (City Experience)' }
                      ].map(stop => (
                        <div key={stop.num} className="flex items-center space-x-3 p-1.5 rounded-xl hover:bg-white transition-colors border border-transparent hover:border-slate-200/60">
                          <span className="w-5 h-5 rounded-full bg-[#8b182b] text-white flex items-center justify-center text-[10px] font-bold shrink-0 shadow-xs">
                            {stop.num}
                          </span>
                          <span className="text-slate-800 text-xs font-bold">{stop.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>

              {/* BOTTOM: Legend / Information Items Row */}
              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs font-semibold text-slate-600">
                <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/60">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span className="text-[11px] font-bold text-slate-700">••• By Road</span>
                </div>
                <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/60">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span className="text-[11px] font-bold text-slate-700">--- By Train</span>
                </div>
                <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/60">
                  <MapPin className="w-3.5 h-3.5 text-[#8b182b]" />
                  <span className="text-[11px] font-bold text-slate-700">📍 Overnight Stay</span>
                </div>
              </div>

            </div>

            {/* Right: Choose Your Date (Calendar) */}
            <div id="date-selection" className="lg:col-span-4">
              <GlobalTravelCalendar />
            </div>

          </div>
        </div>
      </section>

      {/* ==================================================
          5. DAY-WISE ITINERARY (EXACT MATCH)
      ================================================== */}
      <section className="py-16 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div>
            <span className="text-xs font-bold text-[#8b182b] uppercase tracking-wider block mb-1">A perfect blend of culture, nature, adventure and relaxation</span>
            <h2 className="text-3xl font-serif font-bold text-slate-900 tracking-tight">Day-Wise Itinerary</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-5">
            {itineraryDays.map((item) => (
              <div key={item.day} className="bg-slate-50 rounded-3xl overflow-hidden border border-slate-200 shadow-sm space-y-3 p-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="relative h-32 rounded-2xl overflow-hidden">
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                    <span className="absolute top-2 left-2 px-2.5 py-0.5 bg-[#8b182b] text-white text-[10px] font-bold uppercase rounded-full">
                      DAY {item.day}
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-900 text-sm">{item.title}</h4>

                  <div className="flex items-center space-x-3 text-[10px] font-bold text-slate-500">
                    <span className="flex items-center"><Car className="w-3 h-3 mr-1 text-[#8b182b]" /> {item.transport}</span>
                    <span className="flex items-center"><Building className="w-3 h-3 mr-1 text-[#8b182b]" /> {item.hotel}</span>
                  </div>

                  <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-3">
                    {item.desc}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200 text-[10px] font-bold text-slate-500">
                  <span>Overnight: </span>
                  <span className="text-slate-900">{item.overnight}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================================================
          6. GROUP TOUR PRICING
      ================================================== */}
      <section className="py-16 bg-slate-50 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center">
            <span className="text-xs font-bold text-[#8b182b] uppercase tracking-wider block mb-1">Group Tour Pricing</span>
            <h2 className="text-3xl font-serif font-bold text-slate-900 tracking-tight">Select Package Experience</h2>
            <p className="text-xs text-slate-500 mt-1">Choose from our Essential, Signature, or Elite tiers. Exact pricing depends on your selected package and destination.</p>
          </div>

          <div className="bg-white rounded-3xl border-2 border-[#8b182b] shadow-xl p-6 sm:p-8 space-y-6 max-w-4xl mx-auto">
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
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Adult</div>
                        <div className="text-[10px] text-slate-400 mb-3">(18+)</div>
                        <div className="text-2xl font-black text-[#8b182b]">
                          {normalPricing?.adultPrice ? `₹${normalPricing.adultPrice.toLocaleString('en-IN')}` : 'See Dates'}
                        </div>
                        <div className="text-[9px] text-slate-400 font-medium mt-1">per person</div>
                      </div>
                      <div className="bg-slate-50 rounded-2xl p-5 text-center border border-slate-200">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Child</div>
                        <div className="text-[10px] text-slate-400 mb-3">(6–17)</div>
                        <div className="text-2xl font-black text-[#8b182b]">
                          {normalPricing?.child6to17Price ? `₹${normalPricing.child6to17Price.toLocaleString('en-IN')}` : 'See Dates'}
                        </div>
                        <div className="text-[9px] text-slate-400 font-medium mt-1">per person</div>
                      </div>
                      <div className="bg-slate-50 rounded-2xl p-5 text-center border border-slate-200">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Child</div>
                        <div className="text-[10px] text-slate-400 mb-3">(2–5)</div>
                        <div className="text-2xl font-black text-[#8b182b]">
                          {normalPricing?.child2to5Price ? `₹${normalPricing.child2to5Price.toLocaleString('en-IN')}` : 'See Dates'}
                        </div>
                        <div className="text-[9px] text-slate-400 font-medium mt-1">per person</div>
                      </div>
                      <div className="bg-slate-50 rounded-2xl p-5 text-center border border-slate-200">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Infant</div>
                        <div className="text-[10px] text-slate-400 mb-3">(0–2)</div>
                        <div className="text-2xl font-black text-[#8b182b]">
                          {normalPricing?.infantPrice ? `₹${normalPricing.infantPrice.toLocaleString('en-IN')}` : 'See Dates'}
                        </div>
                        <div className="text-[9px] text-slate-400 font-medium mt-1">per person</div>
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
                        className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                          selectedTier === tier
                            ? 'bg-[#8b182b] text-white shadow-md'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                        }`}
                        onClick={() => setSelectedTier(tier)}
                      >
                        {tier}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-slate-50 rounded-2xl p-5 text-center border border-slate-200">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Adult</div>
                      <div className="text-[10px] text-slate-400 mb-3">(18+)</div>
                      <div className="text-2xl font-black text-[#8b182b]">
                        {activePricing?.adultPrice ? `₹${activePricing.adultPrice.toLocaleString('en-IN')}` : 'See Dates'}
                      </div>
                      <div className="text-[9px] text-slate-400 font-medium mt-1">per person</div>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-5 text-center border border-slate-200">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Child</div>
                      <div className="text-[10px] text-slate-400 mb-3">(6–17)</div>
                      <div className="text-2xl font-black text-[#8b182b]">
                        {activePricing?.child6to17Price ? `₹${activePricing.child6to17Price.toLocaleString('en-IN')}` : 'See Dates'}
                      </div>
                      <div className="text-[9px] text-slate-400 font-medium mt-1">per person</div>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-5 text-center border border-slate-200">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Child</div>
                      <div className="text-[10px] text-slate-400 mb-3">(2–5)</div>
                      <div className="text-2xl font-black text-[#8b182b]">
                        {activePricing?.child2to5Price ? `₹${activePricing.child2to5Price.toLocaleString('en-IN')}` : 'See Dates'}
                      </div>
                      <div className="text-[9px] text-slate-400 font-medium mt-1">per person</div>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-5 text-center border border-slate-200">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Infant</div>
                      <div className="text-[10px] text-slate-400 mb-3">(0–2)</div>
                      <div className="text-2xl font-black text-[#8b182b]">
                        {activePricing?.infantPrice ? `₹${activePricing.infantPrice.toLocaleString('en-IN')}` : 'See Dates'}
                      </div>
                      <div className="text-[9px] text-slate-400 font-medium mt-1">per person</div>
                    </div>
                  </div>
                </>
              );
            })()}

            <div className="pt-2">
              <button
                onClick={() => {
                  document.getElementById('date-selection')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full py-4 bg-[#8b182b] text-white font-bold text-sm uppercase tracking-wider rounded-2xl hover:bg-[#a31c33] shadow-md transition-all"
              >
                Select Dates &amp; Book Group Tour
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================
          7. INCLUSIONS / EXCLUSIONS / DOCS / FAQ GRID
      ================================================== */}
      <section className="py-16 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 items-start text-xs">

            {/* Inclusions */}
            <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 space-y-3">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs border-b border-slate-200 pb-2">Inclusions</h4>
              <ul className="space-y-2 text-slate-700">
                <li className="flex items-center"><Check className="w-3.5 h-3.5 text-emerald-600 mr-2 shrink-0" /> Accommodation</li>
                <li className="flex items-center"><Check className="w-3.5 h-3.5 text-emerald-600 mr-2 shrink-0" /> Meals as per itinerary</li>
                <li className="flex items-center"><Check className="w-3.5 h-3.5 text-emerald-600 mr-2 shrink-0" /> All Transfers & Sightseeing</li>
                <li className="flex items-center"><Check className="w-3.5 h-3.5 text-emerald-600 mr-2 shrink-0" /> Entrance Fees</li>
                <li className="flex items-center"><Check className="w-3.5 h-3.5 text-emerald-600 mr-2 shrink-0" /> English Speaking Guide</li>
                <li className="flex items-center"><Check className="w-3.5 h-3.5 text-emerald-600 mr-2 shrink-0" /> Travel Insurance</li>
                <li className="flex items-center"><Check className="w-3.5 h-3.5 text-emerald-600 mr-2 shrink-0" /> All Taxes Included</li>
                <li className="flex items-center"><Check className="w-3.5 h-3.5 text-emerald-600 mr-2 shrink-0" /> Universal Travel Company 24/7 Support</li>
              </ul>
            </div>

            {/* Exclusions */}
            <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 space-y-3">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs border-b border-slate-200 pb-2">Exclusions</h4>
              <ul className="space-y-2 text-slate-700">
                <li className="flex items-center"><X className="w-3.5 h-3.5 text-rose-600 mr-2 shrink-0" /> International Flights</li>
                <li className="flex items-center"><X className="w-3.5 h-3.5 text-rose-600 mr-2 shrink-0" /> Lunch</li>
                <li className="flex items-center"><X className="w-3.5 h-3.5 text-rose-600 mr-2 shrink-0" /> Personal Expenses</li>
                <li className="flex items-center"><X className="w-3.5 h-3.5 text-rose-600 mr-2 shrink-0" /> Travel Insurance (Optional)</li>
                <li className="flex items-center"><X className="w-3.5 h-3.5 text-rose-600 mr-2 shrink-0" /> Tips & Gratuities</li>
                <li className="flex items-center"><X className="w-3.5 h-3.5 text-rose-600 mr-2 shrink-0" /> Early Check-in / Late Check-out</li>
                <li className="flex items-center"><X className="w-3.5 h-3.5 text-rose-600 mr-2 shrink-0" /> Any Adventure Activities</li>
              </ul>
            </div>

            {/* Document Checklist */}
            <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 space-y-3">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs border-b border-slate-200 pb-2">Document Checklist</h4>
              <ul className="space-y-2 text-[11px] text-slate-700">
                <li className="flex items-center justify-between"><span>Passport</span><span className="text-rose-600 font-bold text-[9px]">Required</span></li>
                <li className="flex items-center justify-between"><span>Visa</span><span className="text-rose-600 font-bold text-[9px]">Required</span></li>
                <li className="flex items-center justify-between"><span>Flight Ticket</span><span className="text-rose-600 font-bold text-[9px]">Required</span></li>
                <li className="flex items-center justify-between"><span>Travel Insurance</span><span className="text-amber-600 font-bold text-[9px]">Recommended</span></li>
                <li className="flex items-center justify-between"><span>Aadhar (For Reference)</span><span className="text-slate-400 font-bold text-[9px]">Optional</span></li>
              </ul>
              <button onClick={() => setIsDocModalOpen(true)} className="w-full py-2 bg-slate-900 text-white font-bold text-[10px] uppercase rounded-xl">
                Upload Documents
              </button>
            </div>

            {/* Frequently Asked Questions */}
            <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 space-y-3">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs border-b border-slate-200 pb-2">Frequently Asked Questions</h4>
              <div className="space-y-2">
                {faqs.slice(0, 3).map((item, idx) => (
                  <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                    <button onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)} className="w-full p-2 text-left font-bold text-[11px] text-slate-900 flex justify-between items-center">
                      <span>{item.q}</span>
                      <span>{expandedFaq === idx ? '-' : '+'}</span>
                    </button>
                    {expandedFaq === idx && (
                      <div className="p-2 border-t border-slate-100 text-[10px] text-slate-600">{item.a}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Booking & Cancellation Policy */}
            <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 space-y-3">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs border-b border-slate-200 pb-2">Booking & Cancellation Policy</h4>
              <ul className="space-y-2 text-[10px] text-slate-700">
                <li className="flex items-start"><Check className="w-3.5 h-3.5 text-emerald-600 mr-1.5 shrink-0 mt-0.5" /> Free Cancellation up to 15 days before departure.</li>
                <li className="flex items-start"><Check className="w-3.5 h-3.5 text-emerald-600 mr-1.5 shrink-0 mt-0.5" /> 50% refund for cancellation 7-14 days before departure.</li>
                <li className="flex items-start"><X className="w-3.5 h-3.5 text-rose-600 mr-1.5 shrink-0 mt-0.5" /> No refund for cancellation within 7 days.</li>
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* ==================================================
          8. FINAL CTA BANNER (EXACT MATCH)
      ================================================== */}
      <section className="bg-[#3b0b12] text-white py-20 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-6">
          <h2 className="text-3xl sm:text-5xl font-serif font-bold text-white max-w-3xl mx-auto leading-tight">
            This is not just a trip. It's a story you will remember forever.
          </h2>
          <p className="text-sm sm:text-base text-slate-200 max-w-xl mx-auto font-light">
            Let us design the perfect Sri Lanka experience for you.
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4">
            <button
              onClick={() => { setIsCustomMode(true); setIsEnquiryModalOpen(true); }}
              className="px-8 py-4 bg-[#8b182b] hover:bg-[#a31c33] text-white font-bold rounded-2xl shadow-xl text-xs uppercase tracking-wider border border-white/20"
            >
              Plan My Custom Journey
            </button>
            <a
              href={`https://wa.me/${(pkgData?.whatsappNumber || import.meta.env.VITE_WHATSAPP_NUMBER || '919876543210').replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-7 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-xl text-xs uppercase tracking-wider flex items-center"
            >
              Talk to Travel Expert
            </a>
          </div>

          <div className="pt-10 flex flex-wrap justify-center items-center gap-6 text-xs text-amber-200 font-bold border-t border-white/10 max-w-4xl mx-auto">
            <span>Best Time to Visit: Nov - Apr</span>
            <span>•</span>
            <span>Visa: eVisa Available</span>
            <span>•</span>
            <span>Currency: LKR (Sri Lankan Rupee)</span>
            <span>•</span>
            <span>Language: Sinhala, English, Tamil</span>
            <span>•</span>
            <span>Time Difference: +30 mins</span>
          </div>
        </div>
      </section>

      {/* DOCUMENT UPLOAD MODAL */}
      {isDocModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full text-slate-900 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-bold text-sm">Upload Booking Documents</h3>
              <button onClick={() => setIsDocModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center cursor-pointer bg-slate-50">
              <Upload className="w-8 h-8 text-[#8b182b] mx-auto mb-2" />
              <span className="text-xs font-bold block">Select Passport or Visa PDF</span>
            </div>
            <button onClick={() => setIsDocModalOpen(false)} className="w-full py-2 bg-[#8b182b] text-white font-bold text-xs rounded-xl">
              Submit Documents
            </button>
          </div>
        </div>
      )}

      {/* ENQUIRY MODAL */}
      <EnquiryModal
        isOpen={isEnquiryModalOpen}
        onClose={() => { setIsCustomMode(false); setIsEnquiryModalOpen(false); }}
        isCustomMode={isCustomMode}
      />
    </div>
  );
}
