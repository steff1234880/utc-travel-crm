import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Sparkles, MapPin, Clock, Star, Play, ArrowRight, Compass,
  Heart, Search, Calendar as CalendarIcon, ShieldCheck, CheckCircle2, Quote
} from 'lucide-react';
import api from '../../services/api';
import EnquiryModal from '../../components/EnquiryModal';
import WhatsAppEnquiryButton from '../../components/WhatsAppEnquiryButton';
import React, { useState, useEffect, useRef } from 'react';

export default function Home() {
  const navigate = useNavigate();
  const [isEnquiryModalOpen, setIsEnquiryModalOpen] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<{id: string, title: string} | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [videoHasError, setVideoHasError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Scroll Animation Hook
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: '0px 0px -50px 0px',
      threshold: 0.1
    });

    document.querySelectorAll('.reveal-on-scroll').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // 1. Fetch Homepage Content settings
  const { data: homeContentData } = useQuery({
    queryKey: ['homepage-content'],
    queryFn: async () => {
      const res = await api.get('/settings/homepage').catch(() => null);
      return res?.data?.data || null;
    }
  });

  // 2. Fetch All Packages for the grid (Intentionally displayed on Home page)
  const { data: allPackagesData } = useQuery({
    queryKey: ['home-all-packages'],
    queryFn: async () => {
      const res = await api.get('/packages?status=PUBLISHED').catch(() => null);
      return res?.data?.data || [];
    }
  });

  // 3. Fetch Destinations for destination cards & map
  const { data: destsData } = useQuery({
    queryKey: ['destinations-list'],
    queryFn: async () => {
      const res = await api.get('/packages/destinations');
      return res.data;
    }
  });

  const content = homeContentData?.content;
  const dyn = (content?.dynamicSections as any) || {};

  // Section 1: Hero
  const rawHeroVideo = dyn.heroVideoUrl || content?.heroVideoUrl || '/uploads/packages/pkgmedia-1791259354907-505268289.mp4';
  const heroFallbackImage = content?.heroImage || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop';

  const resolveMediaUrl = (url?: string) => {
    if (!url) return '';
    if (/^(https?:)?\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) {
      return url;
    }
    return url.startsWith('/') ? url : `/${url}`;
  };

  const heroVideo = resolveMediaUrl(rawHeroVideo);

  // Autoplay compliance across Desktop & Mobile/Android browsers
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Hero video autoPlay deferred by browser policy:', err);
        });
      }
    }
  }, [heroVideo]);

  const heroBadge = dyn.heroBadge || 'Welcome To Universal Travel Company';
  const heroTitle = dyn.heroTitle || content?.heroTitle || "India's Leading Customized\nTravel Expert";
  const heroSubtitle = dyn.heroSubtitle || content?.heroSubtitle || 'Every itinerary is thoughtfully designed around your lifestyle, preferences, and dreams ensuring a seamless experience from departure to return.';
  const primaryCtaText = dyn.primaryCtaText || content?.primaryCtaText || 'Explore Tours';
  const primaryCtaLink = dyn.primaryCtaLink || content?.primaryCtaLink || '/packages';

  // Section 2: Plan Trip
  const planHeading = dyn.planHeading || 'Plan the trip of a lifetime';
  const planDescription = dyn.planDescription || "Whether you're looking for a romantic getaway, a family adventure, or a solo journey of self-discovery, we have the perfect itinerary for you.";
  const planCtaText = dyn.planCtaText || 'More Info';
  const planCtaLink = dyn.planCtaLink || '/packages';

  const mapBgImage = dyn.mapBgImage || 'https://upload.wikimedia.org/wikipedia/commons/e/ec/World_map_blank_without_borders.svg';
  const mapDots = (dyn.mapDots && Array.isArray(dyn.mapDots)) ? dyn.mapDots : [];

  // Section 4: Search
  const searchHeading = dyn.searchHeading || 'Start your Vacation Now';
  const searchSubtitle = dyn.searchSubtitle || "Looking for your dream vacation destination but don't know where to start? With the help of experienced and knowledgeable travel agents, you can plan the trip of a lifetime with ease.";
  const searchBgImage = dyn.searchBgImage || 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=2000&auto=format&fit=crop';

  // Section 5: Destinations & Stats
  const destHeading = dyn.destHeading || 'Travel Destinations Available Worldwide';
  const destSubtitle = dyn.destSubtitle || 'We have compiled a list of top destinations across the globe, scoured the world for the most alluring and fascinating places to visit. From the beautiful beaches of the Caribbean to the majestic mountains of Europe and the vibrant cities of Asia, our destination list has something for everyone.';
  const stat1Value = dyn.stat1Value || '15+';
  const stat1Label = dyn.stat1Label || 'Years in\nOperation';
  const stat2Value = dyn.stat2Value || '100+';
  const stat2Label = dyn.stat2Label || 'Travel\nPackages';
  const stat3Value = dyn.stat3Value || '15+';
  const stat3Label = dyn.stat3Label || 'Industry\nAwards';
  const stat4Value = dyn.stat4Value || '1M+';
  const stat4Label = dyn.stat4Label || 'Travelers\nServed';
  const stat5Value = dyn.stat5Value || '50+';
  const stat5Label = dyn.stat5Label || 'Destinations';

  // Section 6: Value
  const valueHeading = dyn.valueHeading || 'The Value We Deliver';
  const valueDescription = dyn.valueDescription || 'We orchestrate seamless travel experiences by handling every detail, so you can focus entirely on enjoying your journey.';
  const valuePoints = dyn.valuePoints && Array.isArray(dyn.valuePoints) && dyn.valuePoints.length > 0 ? dyn.valuePoints : [
    'Handpicked luxury accommodations',
    'Expert local guides and chauffeurs',
    '24/7 dedicated on-trip support',
    'Fully customizable itineraries'
  ];
  const valueVideoUrl = dyn.valueVideoUrl || content?.videoUrl || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  const valueThumbnail = dyn.valueThumbnail || 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=1000&auto=format&fit=crop';
  const valueCtaText = dyn.valueCtaText || 'Discover More';

  // Section 7: Journey
  const journeyHeading = dyn.journeyHeading || 'Your Journey,\nOur Priority.';
  const journeySubtitle = dyn.journeySubtitle || 'We believe that every journey should be as unique as the traveler. Our dedicated team works tirelessly to craft personalized itineraries that exceed your expectations.';
  const journeyF1Title = dyn.journeyF1Title || 'Safe Travels';
  const journeyF1Desc = dyn.journeyF1Desc || 'Stringent safety protocols and verified partners.';
  const journeyF2Title = dyn.journeyF2Title || 'Expert Guides';
  const journeyF2Desc = dyn.journeyF2Desc || 'Deep local knowledge for authentic experiences.';
  const journeyImage = dyn.journeyImage || 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?q=80&w=800&auto=format&fit=crop';
  const journeyBadge = dyn.journeyBadge || 'Top Rated Travel Agency';

  // Section 8: Testimonials
  const testimonialHeading = dyn.testimonialHeading || 'Unforgettable Travel Experiences';
  const testimonialSubtitle = dyn.testimonialSubtitle || "Our customer's feedback is essential in building a great reputation and maintaining excellent service. By listening to our customer's needs, we can improve our offerings and provide an exceptional travel experience.";
  const testimonials = dyn.testimonials && Array.isArray(dyn.testimonials) && dyn.testimonials.length > 0 ? dyn.testimonials : [
    {
      quote: 'Universal Travel Company made my dream trip to Europe a reality. They worked with me every step of the way to plan the itinerary.',
      author: 'Swabeeh Asharaf',
      role: 'Entrepreneur, Developer'
    },
    {
      quote: 'Universal Travel Company made my dream trip to Europe a reality. They worked with me every step of the way to plan the itinerary.',
      author: 'Swabeeh Asharaf',
      role: 'Entrepreneur, Developer'
    }
  ];

  const packages = allPackagesData || [];
  const destinations = destsData?.data || [];
  
  // Use CMS managed dots if available, otherwise fallback to existing destinations for backward compatibility until configured
  const mapDotsToRender = mapDots.length > 0 ? mapDots.filter((d: any) => d.enabled) : destinations.map((dest: any) => ({
    id: dest.id,
    title: dest.name,
    x: ((dest.longitude + 180) / 360) * 100,
    y: ((90 - dest.latitude) / 180) * 100,
    link: `/packages?destination=${dest.slug}`,
    enabled: true
  }));

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/packages?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/packages');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f8fafc] text-slate-900 font-sans">
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .reveal-on-scroll {
            opacity: 0;
            transform: translateY(30px);
            transition: opacity 800ms cubic-bezier(0.16, 1, 0.3, 1), transform 800ms cubic-bezier(0.16, 1, 0.3, 1);
            will-change: opacity, transform;
          }
          .reveal-on-scroll.is-revealed {
            opacity: 1;
            transform: translateY(0);
          }
          .reveal-delay-100 { transition-delay: 100ms; }
          .reveal-delay-200 { transition-delay: 200ms; }
          .reveal-delay-300 { transition-delay: 300ms; }
        }
      `}</style>

      {/* ==================================================
          SECTION 1: HERO / BANNER
          Exact UI Recreation of utcin.com Hero
      ================================================== */}
      <section id="home-hero" className="relative w-full min-h-screen flex flex-col justify-center overflow-hidden bg-black text-white">
        
        {/* 1. Hero Background Video with Fallback */}
        <div 
          className="absolute inset-0 z-0 bg-black bg-cover bg-center"
          style={{ backgroundImage: `url(${heroFallbackImage})` }}
        >
          {heroVideo.includes('youtube.com') || heroVideo.includes('youtu.be') ? (
            <iframe
              src={`${heroVideo.replace('watch?v=', 'embed/')}?autoplay=1&mute=1&loop=1&controls=0&modestbranding=1&playsinline=1`}
              title="Hero Background Video"
              className="absolute top-1/2 left-1/2 w-[177.78vh] h-[56.25vw] min-w-full min-h-full -translate-x-1/2 -translate-y-1/2 border-0 pointer-events-none"
              allow="autoplay; encrypted-media"
            />
          ) : !videoHasError ? (
            <video 
              ref={videoRef}
              src={heroVideo}
              autoPlay 
              loop 
              muted 
              playsInline
              // @ts-ignore
              webkit-playsinline="true"
              x5-playsinline="true"
              preload="auto"
              poster={heroFallbackImage}
              onError={() => {
                console.warn('Hero video failed to load, falling back to static hero image.');
                setVideoHasError(true);
              }}
              className="w-full h-full object-cover object-center"
            >
              <source src={heroVideo} type={heroVideo.endsWith('.webm') ? 'video/webm' : 'video/mp4'} />
              {heroVideo !== '/hero-video.mp4' && (
                <source src="/hero-video.mp4" type="video/mp4" />
              )}
              {heroVideo !== '/uploads/packages/pkgmedia-1791259354907-505268289.mp4' && (
                <source src="/uploads/packages/pkgmedia-1791259354907-505268289.mp4" type="video/mp4" />
              )}
            </video>
          ) : (
            <img 
              src={heroFallbackImage} 
              alt="Hero Fallback" 
              className="w-full h-full object-cover object-center"
            />
          )}
        </div>

        {/* 2. Gradient Overlays for High Contrast & Text Readability */}
        <div className="absolute inset-0 z-10 bg-gradient-to-r from-black/60 via-black/20 to-transparent pointer-events-none" />
        <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/40 via-transparent to-transparent pointer-events-none" />

        {/* 3. Left-Weighted Content Container */}
        <div className="relative z-20 max-w-7xl w-full mx-auto px-6 sm:px-12 lg:px-16 pt-28 pb-12 flex flex-col items-start justify-center">
          
          {/* Translucent Glass Pill Badge */}
          <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/30 text-xs sm:text-sm font-medium tracking-wide text-white mb-6">
            {heroBadge}
          </div>

          {/* Hero Main Display Title */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.15] max-w-2xl mb-6 text-left whitespace-pre-line">
            {heroTitle}
          </h1>

          {/* Subtitle Body Text */}
          <p className="text-base sm:text-lg text-white/90 font-normal leading-relaxed max-w-xl mb-8 text-left">
            {heroSubtitle}
          </p>

          {/* CTA Action Button */}
          <div className="flex items-center gap-4">
            <Link 
              to={primaryCtaLink}
              className="inline-flex px-8 py-3.5 rounded-full bg-[#800040] hover:bg-[#600030] text-white font-medium text-sm sm:text-base shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
            >
              {primaryCtaText}
            </Link>
          </div>
        </div>
      </section>

      {/* ==================================================
          SECTION 2: PLAN THE TRIP OF A LIFETIME & MAP
      ================================================== */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-8 items-center reveal-on-scroll">
            
            {/* LEFT SIDE: Content & Cards */}
            <div className="flex flex-col items-start text-left">
              <h2 className="text-3xl lg:text-4xl font-semibold text-gray-900 tracking-tight leading-[1.2] mb-6">
                {planHeading}
              </h2>
              
              <p className="text-[#475569] text-lg max-w-lg mb-10 leading-relaxed">
                {planDescription}
              </p>
              
              <Link 
                to={planCtaLink}
                className="inline-flex items-center justify-center px-9 py-4 rounded-full bg-[#800040] hover:bg-[#600030] text-white font-medium text-base shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 mb-14"
              >
                {planCtaText}
              </Link>
              
              {/* Destination Image Cards */}
              <div className="flex gap-5 w-full overflow-x-auto pb-4" style={{ scrollbarWidth: 'none' }}>
                {destinations.slice(0, 2).map((dest: any) => (
                  <Link 
                    key={dest.id} 
                    to={`/packages?destination=${dest.slug}`}
                    className="group relative flex-none w-52 sm:w-60 aspect-[4/5] rounded-3xl overflow-hidden shadow-md hover:shadow-2xl transition-all border border-slate-100"
                  >
                    <img src={dest.image} alt={dest.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a]/90 via-[#0f172a]/20 to-transparent"></div>
                    <div className="absolute bottom-5 left-5 right-5">
                      <h4 className="text-white font-bold text-xl leading-tight">{dest.name}</h4>
                      <span className="text-white/80 text-sm mt-1 block">Explore Packages</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* RIGHT SIDE: Map & Dots */}
            <div className="relative w-full h-full min-h-[350px] sm:min-h-[450px] flex items-center justify-center">
              <div className="relative w-full aspect-[2/1] lg:scale-125 lg:origin-center">
                {/* 1. Base Map Background Layer */}
                <img 
                  src={mapBgImage} 
                  alt="World Travel Map" 
                  className="w-full h-auto opacity-[0.25] pointer-events-none select-none"
                />
                
                {/* 2. Route Connection Lines */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 100 100" preserveAspectRatio="none">
                  {mapDotsToRender.map((dot: any, i: number) => {
                    if (i === mapDotsToRender.length - 1) return null;
                    const next = mapDotsToRender[i + 1];
                    const x1 = dot.x;
                    const y1 = dot.y;
                    const x2 = next.x;
                    const y2 = next.y;
                    
                    // Control point for quadratic bezier (arch upwards)
                    const cx = (x1 + x2) / 2;
                    const cy = Math.min(y1, y2) - 15;

                    return (
                      <path 
                        key={`route-${i}`}
                        d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`}
                        fill="none"
                        stroke="#800040"
                        strokeWidth="1.5"
                        strokeDasharray="4 6"
                        vectorEffect="non-scaling-stroke"
                        className="opacity-50"
                      />
                    );
                  })}
                </svg>

                {/* 3. Destination Markers Layer */}
                <div className="absolute inset-0 z-20 pointer-events-none">
                  {mapDotsToRender.map((dot: any, i: number) => {
                    const leftPos = dot.x;
                    const topPos = dot.y;
                    
                    const dotContent = (
                      <div className="relative flex items-center justify-center">
                        <div className="absolute w-5 h-5 sm:w-7 sm:h-7 bg-[#800040]/30 rounded-full animate-ping"></div>
                        <div className="relative w-2.5 h-2.5 sm:w-3 sm:h-3 bg-[#800040] rounded-full border-[1.5px] border-white shadow-md cursor-pointer group-hover:scale-150 transition-transform"></div>
                        
                        {/* Interactive Tooltip */}
                        <div className="absolute bottom-full mb-2 hidden group-hover:block w-max bg-[#0f172a] text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-xl z-50">
                          {dot.title}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#0f172a]"></div>
                        </div>
                      </div>
                    );

                    return (
                      <div 
                        key={dot.id || i} 
                        className="absolute group pointer-events-auto"
                        style={{ left: `${leftPos}%`, top: `${topPos}%`, transform: 'translate(-50%, -50%)' }}
                      >
                        {dot.link ? (
                          <Link to={dot.link}>{dotContent}</Link>
                        ) : (
                          dotContent
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </section>

      {/* ==================================================
          SECTION 3: PACKAGE CARDS GRID (3 Columns)
      ================================================== */}
      <section className="pb-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 reveal-on-scroll reveal-delay-100">
            {(() => {
              const managedPkgs = (dyn.homePackages || []).filter((p: any) => p.enabled);
              if (managedPkgs.length > 0) {
                return managedPkgs.map((item: any, idx: number) => (
                  <div key={item.id || idx} onClick={() => navigate('/packages/' + (item.package?.slug || item.packageSlug || item.packageId || item.id))} className="group bg-white rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.05)] hover:shadow-[0_10px_40px_rgba(0,0,0,0.1)] transition-all duration-300 border border-slate-100 flex flex-col h-full cursor-pointer">
                    <div className="relative h-64 overflow-hidden">
                      <img src={item.image || 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=800&auto=format&fit=crop'} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-[#e11d48] hover:bg-rose-50 transition-colors shadow-sm cursor-pointer" onClick={(e) => e.stopPropagation()}>
                        <Heart className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="p-6 flex flex-col flex-grow">
                      <div className="flex items-center text-[11px] font-bold text-[#881337] uppercase tracking-wider mb-3">
                        <MapPin className="w-3.5 h-3.5 mr-1.5" /> {item.destination || 'Multiple Destinations'}
                      </div>
                      <h3 className="text-xl font-bold text-[#0f172a] group-hover:text-[#881337] transition-colors mb-3 line-clamp-2">{item.title}</h3>
                      
                      <div className="flex items-center gap-4 text-sm text-[#475569] mb-6 font-medium">
                        <div className="flex items-center"><Clock className="w-4 h-4 mr-1.5 text-[#ec4899]" /> {item.durationDays}D / {item.durationNights}N</div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-5 border-t border-slate-100 mt-auto">
                        <div>
                          <span className="block text-[11px] text-[#475569] font-medium mb-0.5">Price</span>
                          <span className="text-xl font-bold text-[#0f172a]">
                            {item.basePrice ? (isNaN(Number(item.basePrice)) ? item.basePrice : `₹${Number(item.basePrice).toLocaleString()}`) : 'On Request'}
                          </span>
                        </div>
                        <div className="px-6 py-2.5 bg-[#881337] group-hover:bg-[#9f1239] text-white text-sm font-semibold rounded-xl transition-colors shadow-sm">
                          View Details
                        </div>
                      </div>
                    </div>
                  </div>
                ));
              }

              // Fallback to original packages array
              return packages.slice(0, 6).map((item: any) => {
                const imgUrl = item.images?.[0]?.url || 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=800&auto=format&fit=crop';
                return (
                  <div key={item.id} onClick={() => navigate(`/packages/${item.slug || item.id}`)} className="group bg-white rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.05)] hover:shadow-[0_10px_40px_rgba(0,0,0,0.1)] transition-all duration-300 border border-slate-100 flex flex-col h-full cursor-pointer">
                    <div className="relative h-64 overflow-hidden">
                      <img src={imgUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-[#e11d48] hover:bg-rose-50 transition-colors shadow-sm cursor-pointer" onClick={(e) => e.stopPropagation()}>
                        <Heart className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="p-6 flex flex-col flex-grow">
                      <div className="flex items-center text-[11px] font-bold text-[#881337] uppercase tracking-wider mb-3">
                        <MapPin className="w-3.5 h-3.5 mr-1.5" /> {item.destination?.name || 'Multiple Destinations'}
                      </div>
                      <h3 className="text-xl font-bold text-[#0f172a] group-hover:text-[#881337] transition-colors mb-3 line-clamp-2">{item.title}</h3>
                      
                      <div className="flex items-center gap-4 text-sm text-[#475569] mb-6 font-medium">
                        <div className="flex items-center"><Clock className="w-4 h-4 mr-1.5 text-[#ec4899]" /> {item.durationDays}D / {item.durationNights}N</div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-5 border-t border-slate-100 mt-auto">
                        <div>
                          <span className="block text-[11px] text-[#475569] font-medium mb-0.5">Price</span>
                          <span className="text-xl font-bold text-[#0f172a]">
                            {item.basePrice ? `₹${item.basePrice.toLocaleString()}` : 'On Request'}
                          </span>
                        </div>
                        <div className="px-6 py-2.5 bg-[#881337] group-hover:bg-[#9f1239] text-white text-sm font-semibold rounded-xl transition-colors shadow-sm">
                          View Details
                        </div>
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
          <div className="mt-12 text-center">
            <Link to="/packages" className="inline-flex items-center justify-center px-8 py-3.5 border-2 border-[#881337] text-[#881337] hover:bg-[#881337] hover:text-white font-bold rounded-full transition-all text-sm">
              View All Packages
            </Link>
          </div>
        </div>
      </section>

      {/* ==================================================
          SECTION 4: START YOUR VACATION NOW & SEARCH WIDGET
      ================================================== */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0">
          <img 
            src={searchBgImage} 
            alt="Search Background" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-[#7a288a]/70 mix-blend-multiply"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#50156b]/80 via-[#9d36a3]/60 to-[#50156b]/80"></div>
        </div>
        
        <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10 text-center reveal-on-scroll">
          <h2 className="text-2xl md:text-[32px] font-bold text-white mb-3 tracking-normal">
            {searchHeading}
          </h2>
          <p className="text-white/95 mb-10 text-[13px] md:text-sm font-normal max-w-2xl mx-auto leading-relaxed">
            {searchSubtitle}
          </p>
          
          <form onSubmit={handleSearch} className="max-w-[950px] mx-auto flex flex-col md:flex-row bg-white rounded-lg md:rounded-xl p-1 shadow-xl">
            
            {/* Field: Destination */}
            <div className="flex-[1.2] flex items-center px-4 py-2 hover:bg-slate-50 rounded-lg md:rounded-l-lg md:rounded-r-none transition-colors cursor-text">
              <Search className="w-4 h-4 text-[#881337] mr-2.5 flex-shrink-0" />
              <input 
                type="text" 
                placeholder="Search destinations..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent focus:outline-none text-slate-800 placeholder-slate-400 p-0 text-sm border-none focus:ring-0"
              />
            </div>

            {/* Field: All Destinations (Visual Only) */}
            <div className="flex-1 flex items-center px-4 py-2 hover:bg-slate-50 transition-colors cursor-pointer md:border-l border-slate-200">
              <MapPin className="w-4 h-4 text-[#881337] mr-2.5 flex-shrink-0 fill-[#881337]" />
              <input 
                type="text" 
                placeholder="All Destinations" 
                className="w-full bg-transparent focus:outline-none text-slate-400 placeholder-slate-400 p-0 text-sm border-none focus:ring-0 cursor-pointer"
                readOnly
              />
            </div>
            
            {/* Field: All Typologies (Visual Only) */}
            <div className="flex-1 flex items-center px-4 py-2 hover:bg-slate-50 transition-colors cursor-pointer md:border-l border-slate-200">
              <svg className="w-4 h-4 text-[#881337] mr-2.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                <circle cx="2" cy="6" r="1" fill="currentColor" stroke="none" />
                <circle cx="2" cy="12" r="1" fill="currentColor" stroke="none" />
                <circle cx="2" cy="18" r="1" fill="currentColor" stroke="none" />
              </svg>
              <select className="w-full bg-transparent focus:outline-none text-slate-400 p-0 text-sm border-none focus:ring-0 appearance-none cursor-pointer">
                <option value="">All Typologies</option>
                <option value="honeymoon">Honeymoon</option>
                <option value="adventure">Adventure</option>
              </select>
            </div>

            {/* Submit Button */}
            <div className="p-0.5 md:ml-1 w-full md:w-auto">
              <button 
                type="submit" 
                className="w-full md:w-32 h-full min-h-[40px] md:min-h-[44px] bg-[#9a1b55] hover:bg-[#800040] text-white px-6 rounded-md md:rounded-lg font-medium text-sm transition-all flex items-center justify-center whitespace-nowrap"
              >
                Search
              </button>
            </div>
            
          </form>
        </div>
      </section>

      {/* ==================================================
          SECTION 5: TRAVEL DESTINATIONS WORLDWIDE & STATS
      ================================================== */}
      <section className="pt-24 bg-white">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="mb-14 reveal-on-scroll">
            <h2 className="text-4xl md:text-5xl lg:text-[44px] font-black text-black leading-[1.2] mb-6 tracking-tight whitespace-pre-line">
              {destHeading}
            </h2>
            <p className="text-slate-500 max-w-[800px] text-base md:text-lg leading-relaxed">
              {destSubtitle}
            </p>
          </div>
          
          {/* 8-Column Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4 mb-20 reveal-on-scroll reveal-delay-100">
            {destinations.slice(0, 8).map((dest: any) => (
              <div key={dest.id} className="group relative aspect-[3/4] sm:aspect-[2/3] rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all block cursor-default">
                <img 
                  src={dest.imageUrl || dest.image || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop'} 
                  alt={dest.name} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                />
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/70 transition-colors duration-500"></div>
                <div className="absolute inset-0 p-3 flex flex-col items-center justify-center text-center">
                  <h3 className="text-white font-extrabold text-[16px] leading-tight px-1 transition-transform duration-500 md:group-hover:-translate-y-2">
                    {dest.name}
                  </h3>
                  <div className="mt-2 overflow-hidden transition-all duration-500 opacity-100 max-h-[150px] md:opacity-0 md:max-h-0 md:translate-y-4 md:group-hover:opacity-100 md:group-hover:max-h-[150px] md:group-hover:translate-y-0">
                    <p className="text-white/95 text-[11px] leading-relaxed font-medium px-2">
                      {dest.description || dest.shortDescription || (
                        dest.name.toLowerCase() === 'india' 
                          ? 'Diverse cultures, majestic monuments, and unforgettable journeys.'
                          : dest.name.toLowerCase() === 'united arab emirates' || dest.name.toLowerCase() === 'uae'
                          ? 'Luxury experiences, futuristic architecture, and desert adventures.'
                          : `Explore the beautiful landscapes, rich culture, and amazing experiences of ${dest.name}.`
                      )}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats Footer (Full Width Black Banner) */}
        <div className="w-full bg-black py-6 md:py-8 mt-10 reveal-on-scroll">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap justify-center lg:justify-between items-center gap-10 lg:gap-4">
              
              <div className="flex items-center gap-2.5">
                <span className="text-3xl md:text-[34px] font-black text-[#9a1b55] tracking-tighter">{stat1Value}</span>
                <span className="text-white text-[12px] font-semibold leading-snug tracking-wide whitespace-pre-line">{stat1Label}</span>
              </div>
              
              <div className="flex items-center gap-2.5">
                <span className="text-3xl md:text-[34px] font-black text-[#9a1b55] tracking-tighter">{stat2Value}</span>
                <span className="text-white text-[12px] font-semibold leading-snug tracking-wide whitespace-pre-line">{stat2Label}</span>
              </div>
              
              <div className="flex items-center gap-2.5">
                <span className="text-3xl md:text-[34px] font-black text-[#9a1b55] tracking-tighter">{stat3Value}</span>
                <span className="text-white text-[12px] font-semibold leading-snug tracking-wide whitespace-pre-line">{stat3Label}</span>
              </div>
              
              <div className="flex items-center gap-2.5">
                <span className="text-3xl md:text-[34px] font-black text-[#9a1b55] tracking-tighter">{stat4Value}</span>
                <span className="text-white text-[12px] font-semibold leading-snug tracking-wide whitespace-pre-line">{stat4Label}</span>
              </div>
              
              <div className="flex items-center gap-2.5">
                <span className="text-3xl md:text-[34px] font-black text-[#9a1b55] tracking-tighter">{stat5Value}</span>
                <span className="text-white text-[12px] font-semibold leading-snug tracking-wide whitespace-pre-line">{stat5Label}</span>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ==================================================
          SECTION 6: THE VALUE WE DELIVER (VIDEO SECTION)
      ================================================== */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center reveal-on-scroll">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-[#0f172a] mb-6">{valueHeading}</h2>
              <p className="text-[#475569] mb-8 text-lg">{valueDescription}</p>
              <ul className="space-y-4 mb-8">
                {valuePoints.map((item: string, i: number) => (
                  <li key={i} className="flex items-start sm:items-center text-[#0f172a] font-medium text-sm sm:text-base leading-snug sm:leading-normal">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#fdf2f8] flex items-center justify-center mr-3 shrink-0 mt-0.5 sm:mt-0">
                      <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#ec4899]" />
                    </div>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <button onClick={() => setIsEnquiryModalOpen(true)} className="px-8 py-3.5 bg-[#0f172a] hover:bg-[#1e293b] text-white font-bold rounded-full transition-all text-sm shadow-lg">
                {valueCtaText}
              </button>
            </div>
            <div className="relative rounded-3xl overflow-hidden shadow-2xl group">
              <img src={valueThumbnail} alt="Value We Deliver" className="w-full h-80 object-cover group-hover:scale-105 transition-transform duration-700" />
              <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors pointer-events-none"></div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================
          SECTION 7 & 8: YOUR JOURNEY, OUR PRIORITY
      ================================================== */}
      <section className="py-24 bg-[#f8fafc] overflow-hidden relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-16 items-center reveal-on-scroll">
            <div className="relative">
              <div className="absolute -top-10 -left-10 w-32 h-32 bg-[#ec4899]/10 rounded-full blur-2xl"></div>
              <h2 className="text-3xl md:text-5xl font-bold text-[#0f172a] mb-6 leading-tight whitespace-pre-line">{journeyHeading}</h2>
              <p className="text-[#475569] mb-10 text-lg">{journeySubtitle}</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
                  <ShieldCheck className="w-8 h-8 text-[#881337] mb-3 sm:mb-4" />
                  <h4 className="text-[#0f172a] font-bold text-lg mb-2">{journeyF1Title}</h4>
                  <p className="text-[#475569] text-sm">{journeyF1Desc}</p>
                </div>
                <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
                  <Compass className="w-8 h-8 text-[#881337] mb-3 sm:mb-4" />
                  <h4 className="text-[#0f172a] font-bold text-lg mb-2">{journeyF2Title}</h4>
                  <p className="text-[#475569] text-sm">{journeyF2Desc}</p>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="relative w-full max-w-md mx-auto aspect-[3/4] rounded-t-[10rem] rounded-b-3xl overflow-hidden shadow-2xl border-8 border-white">
                <img src={journeyImage} alt="Journey arch" className="w-full h-full object-cover" />
              </div>
              <div className="absolute -bottom-4 -left-2 sm:-bottom-6 sm:-left-6 bg-white p-3 sm:p-5 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-3 sm:gap-4 animate-bounce" style={{ animationDuration: '3s' }}>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#881337] rounded-full flex items-center justify-center shrink-0">
                  <Star className="w-5 h-5 sm:w-6 sm:h-6 text-white fill-current" />
                </div>
                <div>
                  <div className="text-sm sm:text-lg font-bold text-[#0f172a] whitespace-nowrap">{journeyBadge}</div>
                  <div className="text-xs sm:text-sm text-[#475569] whitespace-nowrap">Custom Itineraries</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================
          SECTION 9: TESTIMONIALS (Unforgettable Travel Experiences)
      ================================================== */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        {/* Background Image & Overlay */}
        <div className="absolute inset-0">
          <img 
            src="https://images.unsplash.com/photo-1508804185872-d7badad00f7d?q=80&w=2000&auto=format&fit=crop" 
            alt="Great Wall of China Background" 
            className="w-full h-full object-cover object-center" 
          />
          <div className="absolute inset-0 bg-[#0f172a]/30 mix-blend-multiply"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-[#081229]/60 via-[#081229]/20 to-[#081229]/40"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Header */}
          <div className="text-center mb-16 md:mb-24 reveal-on-scroll">
            <h2 className="text-3xl md:text-[40px] font-bold text-white mb-6">
              {testimonialHeading}
            </h2>
            <p className="text-white/95 max-w-[850px] mx-auto text-[14px] md:text-[15px] leading-relaxed font-medium">
              {testimonialSubtitle}
            </p>
          </div>
          
          {/* Testimonial Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 max-w-3xl mx-auto md:mx-0 reveal-on-scroll reveal-delay-200">
            {testimonials.map((t: any, i: number) => (
              <div key={i} className="bg-[#9a1b55] p-5 md:p-6 rounded-lg md:rounded-xl shadow-xl flex flex-col justify-between min-h-[180px]">
                <p className="text-white font-bold text-[14px] md:text-[15px] leading-relaxed mb-6">
                  {t.quote}
                </p>
                <div className="flex items-center gap-3.5 mt-auto">
                  <div className="w-10 h-10 bg-white rounded-full flex-shrink-0 shadow-sm"></div>
                  <div className="flex flex-col justify-center">
                    <div className="font-bold text-white text-[12px] md:text-[13px] tracking-wide mb-0.5">{t.author}</div>
                    <div className="text-white/90 text-[10px] md:text-[11px]">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ENQUIRY MODAL */}
      <EnquiryModal
        isOpen={isEnquiryModalOpen}
        onClose={() => { setIsCustomMode(false); setIsEnquiryModalOpen(false); setSelectedPackage(null); }}
        isCustomMode={isCustomMode}
        packageId={selectedPackage?.id}
        packageName={selectedPackage?.title}
      />
    </div>
  );
}
