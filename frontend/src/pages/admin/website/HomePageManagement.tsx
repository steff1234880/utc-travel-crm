import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../../services/api';
import {
  Sparkles,
  Save,
  Upload,
  Video,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Compass,
  ArrowRight,
  Play,
  Layers,
  Search,
  ExternalLink,
  ShieldCheck,
  Star,
  Quote,
  RefreshCw,
  BarChart2,
  Info,
  Plane
} from 'lucide-react';
import GlobalLoadingAnimation from '../../../components/common/GlobalLoadingAnimation';

interface TestimonialItem {
  id?: string;
  quote: string;
  author: string;
  role: string;
}

export interface MapDot {
  id: string;
  title: string;
  x: number;
  y: number;
  link: string;
  enabled: boolean;
}

export interface HomePackageCard {
  id: string;
  packageId: string;
  enabled: boolean;
  image: string;
  title: string;
  destination: string;
  durationDays: number;
  durationNights: number;
  basePrice: string;
}

export default function HomePageManagement() {
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'hero' | 'sections' | 'map' | 'stats' | 'value' | 'priority' | 'testimonials' | 'loader'>('hero');

  // Form State matching all sections of the new website Home page
  const [homeForm, setHomeForm] = useState({
    loadingAnimationEnabled: true,
    // 1. Hero Section
    heroBadge: 'Welcome To Universal Travel Company',
    heroTitle: "India's Leading Customized\nTravel Expert",
    heroSubtitle: 'Every itinerary is thoughtfully designed around your lifestyle, preferences, and dreams ensuring a seamless experience from departure to return.',
    heroVideoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    primaryCtaText: 'Explore Tours',
    primaryCtaLink: '/packages',

    // 2. Plan the Trip of a Lifetime Section
    planHeading: 'Plan the trip of a lifetime',
    planDescription: "Whether you're looking for a romantic getaway, a family adventure, or a solo journey of self-discovery, we have the perfect itinerary for you.",
    planCtaText: 'More Info',
    planCtaLink: '/packages',

    // 3. Map Management
    mapBgImage: 'https://upload.wikimedia.org/wikipedia/commons/e/ec/World_map_blank_without_borders.svg',
    mapDots: [] as MapDot[],

    // 3.5 Featured Packages
    homePackages: [] as HomePackageCard[],

    // 4. Start Your Vacation Now & Search Section
    searchHeading: 'Start your Vacation Now',
    searchSubtitle: "Looking for your dream vacation destination but don't know where to start? With the help of experienced and knowledgeable travel agents, you can plan the trip of a lifetime with ease.",
    searchBgImage: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=2000&auto=format&fit=crop',

    // 5. Travel Destinations Worldwide & Stats
    destHeading: 'Travel Destinations Available Worldwide',
    destSubtitle: 'We have compiled a list of top destinations across the globe, scoured the world for the most alluring and fascinating places to visit. From the beautiful beaches of the Caribbean to the majestic mountains of Europe and the vibrant cities of Asia, our destination list has something for everyone.',
    stat1Value: '15+',
    stat1Label: 'Years in Operation',
    stat2Value: '100+',
    stat2Label: 'Travel Packages',
    stat3Value: '15+',
    stat3Label: 'Industry Awards',
    stat4Value: '1M+',
    stat4Label: 'Travelers Served',
    stat5Value: '50+',
    stat5Label: 'Destinations',

    // 6. The Value We Deliver (Video Section)
    valueHeading: 'The Value We Deliver',
    valueDescription: 'We orchestrate seamless travel experiences by handling every detail, so you can focus entirely on enjoying your journey.',
    valueVideoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    valueThumbnail: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=1000&auto=format&fit=crop',
    valuePoints: [
      'Handpicked luxury accommodations',
      'Expert local guides and chauffeurs',
      '24/7 dedicated on-trip support',
      'Fully customizable itineraries'
    ],
    valueCtaText: 'Discover More',

    // 7. Your Journey, Our Priority
    journeyHeading: 'Your Journey,\nOur Priority.',
    journeySubtitle: 'We believe that every journey should be as unique as the traveler. Our dedicated team works tirelessly to craft personalized itineraries that exceed your expectations.',
    journeyF1Title: 'Safe Travels',
    journeyF1Desc: 'Stringent safety protocols and verified partners.',
    journeyF2Title: 'Expert Guides',
    journeyF2Desc: 'Deep local knowledge for authentic experiences.',
    journeyImage: 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?q=80&w=800&auto=format&fit=crop',
    journeyBadge: 'Top Rated Travel Agency',

    // 8. Testimonials Section
    testimonialHeading: 'Unforgettable Travel Experiences',
    testimonialSubtitle: "Our customer's feedback is essential in building a great reputation and maintaining excellent service. By listening to our customer's needs, we can improve our offerings and provide an exceptional travel experience.",
    testimonials: [
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
    ] as TestimonialItem[]
  });

  // Fetch Homepage Content settings
  const { data: homeData, isLoading } = useQuery({
    queryKey: ['homepage-content'],
    queryFn: async () => {
      const res = await api.get('/settings/homepage');
      return res.data;
    },
  });

  const content = homeData?.data?.content;
  const dyn = (content?.dynamicSections as any) || {};

  useEffect(() => {
    if (content) {
      setHomeForm(prev => ({
        ...prev,
        heroBadge: dyn.heroBadge || prev.heroBadge,
        heroTitle: dyn.heroTitle || content.heroTitle || prev.heroTitle,
        heroSubtitle: dyn.heroSubtitle || content.heroSubtitle || prev.heroSubtitle,
        heroVideoUrl: dyn.heroVideoUrl || content.heroVideoUrl || content.videoUrl || prev.heroVideoUrl,
        primaryCtaText: dyn.primaryCtaText || content.primaryCtaText || prev.primaryCtaText,
        primaryCtaLink: dyn.primaryCtaLink || content.primaryCtaLink || prev.primaryCtaLink,

        planHeading: dyn.planHeading || prev.planHeading,
        planDescription: dyn.planDescription || prev.planDescription,
        planCtaText: dyn.planCtaText || prev.planCtaText,
        planCtaLink: dyn.planCtaLink || prev.planCtaLink,

        mapBgImage: dyn.mapBgImage || prev.mapBgImage,
        mapDots: (dyn.mapDots && Array.isArray(dyn.mapDots)) ? dyn.mapDots : prev.mapDots,
        homePackages: (dyn.homePackages && Array.isArray(dyn.homePackages)) ? dyn.homePackages : prev.homePackages,

        searchHeading: dyn.searchHeading || prev.searchHeading,
        searchSubtitle: dyn.searchSubtitle || prev.searchSubtitle,
        searchBgImage: dyn.searchBgImage || prev.searchBgImage,

        destHeading: dyn.destHeading || prev.destHeading,
        destSubtitle: dyn.destSubtitle || prev.destSubtitle,
        stat1Value: dyn.stat1Value || prev.stat1Value,
        stat1Label: dyn.stat1Label || prev.stat1Label,
        stat2Value: dyn.stat2Value || prev.stat2Value,
        stat2Label: dyn.stat2Label || prev.stat2Label,
        stat3Value: dyn.stat3Value || prev.stat3Value,
        stat3Label: dyn.stat3Label || prev.stat3Label,
        stat4Value: dyn.stat4Value || prev.stat4Value,
        stat4Label: dyn.stat4Label || prev.stat4Label,
        stat5Value: dyn.stat5Value || prev.stat5Value,
        stat5Label: dyn.stat5Label || prev.stat5Label,

        valueHeading: dyn.valueHeading || prev.valueHeading,
        valueDescription: dyn.valueDescription || prev.valueDescription,
        valueVideoUrl: dyn.valueVideoUrl || content.videoUrl || prev.valueVideoUrl,
        valueThumbnail: dyn.valueThumbnail || prev.valueThumbnail,
        valuePoints: (dyn.valuePoints && dyn.valuePoints.length > 0) ? dyn.valuePoints : prev.valuePoints,
        valueCtaText: dyn.valueCtaText || prev.valueCtaText,

        journeyHeading: dyn.journeyHeading || prev.journeyHeading,
        journeySubtitle: dyn.journeySubtitle || prev.journeySubtitle,
        journeyF1Title: dyn.journeyF1Title || prev.journeyF1Title,
        journeyF1Desc: dyn.journeyF1Desc || prev.journeyF1Desc,
        journeyF2Title: dyn.journeyF2Title || prev.journeyF2Title,
        journeyF2Desc: dyn.journeyF2Desc || prev.journeyF2Desc,
        journeyImage: dyn.journeyImage || prev.journeyImage,
        journeyBadge: dyn.journeyBadge || prev.journeyBadge,

        testimonialHeading: dyn.testimonialHeading || prev.testimonialHeading,
        testimonialSubtitle: dyn.testimonialSubtitle || prev.testimonialSubtitle,
        testimonials: (dyn.testimonials && dyn.testimonials.length > 0) ? dyn.testimonials : prev.testimonials,
        loadingAnimationEnabled: dyn.loadingAnimationEnabled !== undefined
          ? dyn.loadingAnimationEnabled
          : (content.loadingAnimationEnabled !== undefined ? content.loadingAnimationEnabled : prev.loadingAnimationEnabled),
      }));
    }
  }, [content]);

  // Handle file upload
  const handleFileUpload = async (file: File): Promise<string | null> => {
    setIsUploading(true);
    setFeedback(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post('/packages/upload-media', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setIsUploading(false);
      return res.data?.url || null;
    } catch (err: any) {
      setIsUploading(false);
      setFeedback({ type: 'error', message: err.response?.data?.message || 'File upload failed' });
      return null;
    }
  };

  // Mutation to save Homepage settings
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        heroTitle: homeForm.heroTitle,
        heroSubtitle: homeForm.heroSubtitle,
        heroVideoUrl: homeForm.heroVideoUrl,
        primaryCtaText: homeForm.primaryCtaText,
        primaryCtaLink: homeForm.primaryCtaLink,
        videoUrl: homeForm.valueVideoUrl,
        loadingAnimationEnabled: homeForm.loadingAnimationEnabled,
        dynamicSections: {
          loadingAnimationEnabled: homeForm.loadingAnimationEnabled,
          heroBadge: homeForm.heroBadge,
          heroTitle: homeForm.heroTitle,
          heroSubtitle: homeForm.heroSubtitle,
          heroVideoUrl: homeForm.heroVideoUrl,
          primaryCtaText: homeForm.primaryCtaText,
          primaryCtaLink: homeForm.primaryCtaLink,

          planHeading: homeForm.planHeading,
          planDescription: homeForm.planDescription,
          planCtaText: homeForm.planCtaText,
          planCtaLink: homeForm.planCtaLink,

          mapBgImage: homeForm.mapBgImage,
          mapDots: homeForm.mapDots,
          homePackages: homeForm.homePackages,

          searchHeading: homeForm.searchHeading,
          searchSubtitle: homeForm.searchSubtitle,
          searchBgImage: homeForm.searchBgImage,

          destHeading: homeForm.destHeading,
          destSubtitle: homeForm.destSubtitle,
          stat1Value: homeForm.stat1Value,
          stat1Label: homeForm.stat1Label,
          stat2Value: homeForm.stat2Value,
          stat2Label: homeForm.stat2Label,
          stat3Value: homeForm.stat3Value,
          stat3Label: homeForm.stat3Label,
          stat4Value: homeForm.stat4Value,
          stat4Label: homeForm.stat4Label,
          stat5Value: homeForm.stat5Value,
          stat5Label: homeForm.stat5Label,

          valueHeading: homeForm.valueHeading,
          valueDescription: homeForm.valueDescription,
          valueVideoUrl: homeForm.valueVideoUrl,
          valueThumbnail: homeForm.valueThumbnail,
          valuePoints: homeForm.valuePoints,
          valueCtaText: homeForm.valueCtaText,

          journeyHeading: homeForm.journeyHeading,
          journeySubtitle: homeForm.journeySubtitle,
          journeyF1Title: homeForm.journeyF1Title,
          journeyF1Desc: homeForm.journeyF1Desc,
          journeyF2Title: homeForm.journeyF2Title,
          journeyF2Desc: homeForm.journeyF2Desc,
          journeyImage: homeForm.journeyImage,
          journeyBadge: homeForm.journeyBadge,

          testimonialHeading: homeForm.testimonialHeading,
          testimonialSubtitle: homeForm.testimonialSubtitle,
          testimonials: homeForm.testimonials,
        }
      };

      const res = await api.patch('/settings/homepage', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homepage-content'] });
      setFeedback({ type: 'success', message: 'Home page content saved successfully!' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    onError: (err: any) => {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Failed to save Home page content.' });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-500 font-medium flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-sm font-bold">Loading Home Page Management...</p>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-8 text-slate-900 font-sans">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-800">
        <div>
          <div className="inline-flex items-center space-x-2 bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3 border border-blue-400/30">
            <Compass className="w-3.5 h-3.5" />
            <span>Website Management</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight">Home Page Management</h1>
          <p className="text-sm text-slate-300 font-medium mt-1 max-w-2xl">
            Manage the content, banners, videos, statistics, and text displayed on the public website Home page.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/"
            target="_blank"
            className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-2xl border border-white/20 transition-all flex items-center gap-1.5 uppercase tracking-wider shrink-0"
          >
            <ExternalLink className="w-4 h-4" />
            View Live Home
          </Link>

          <button
            onClick={handleSubmit}
            disabled={saveMutation.isPending || isUploading}
            className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-2xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 uppercase tracking-wider shrink-0 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saveMutation.isPending ? 'Saving...' : 'Save All Changes'}
          </button>
        </div>
      </div>

      {/* Feedback Notification Alert */}
      {feedback && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-bold ${
          feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          <div className="flex items-center space-x-2">
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600 font-bold text-base">×</button>
        </div>
      )}

      {/* Navigation Tabs for Sections */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {[
          { key: 'hero', label: '1. Hero & Banner' },
          { key: 'sections', label: '2. Plan Trip & Search' },
          { key: 'map', label: '3. Map Management' },
          { key: 'stats', label: '4. Destinations & Stats' },
          { key: 'value', label: '5. Value & Image' },
          { key: 'priority', label: '6. Journey & Priority' },
          { key: 'testimonials', label: '7. Testimonials' },
          { key: 'loader', label: '8. Loading Animation' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
              activeTab === tab.key
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">

        {/* TAB 1: HERO & BANNER */}
        {activeTab === 'hero' && (
          <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200 space-y-6">
            <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">Section 1: Hero Banner (Full-Bleed Video)</h2>
                <p className="text-xs text-slate-500 font-medium">Configure the main video background, glass badge, display heading, and primary CTA button on the Home page.</p>
              </div>
              <span className="px-3 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full uppercase tracking-wider border border-blue-200">
                Home Hero
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Glass Badge Text
                  </label>
                  <input
                    type="text"
                    value={homeForm.heroBadge}
                    onChange={(e) => setHomeForm({ ...homeForm, heroBadge: e.target.value })}
                    placeholder="Welcome To Universal Travel Company"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Hero Main Heading *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={homeForm.heroTitle}
                    onChange={(e) => setHomeForm({ ...homeForm, heroTitle: e.target.value })}
                    placeholder="India's Leading Customized Travel Expert"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm font-bold text-slate-900"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Tip: Add a line break where you want the heading to wrap.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Hero Subtitle / Description
                  </label>
                  <textarea
                    rows={3}
                    value={homeForm.heroSubtitle}
                    onChange={(e) => setHomeForm({ ...homeForm, heroSubtitle: e.target.value })}
                    placeholder="Every itinerary is thoughtfully designed..."
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-xs font-medium text-slate-700 leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      CTA Button Label
                    </label>
                    <input
                      type="text"
                      value={homeForm.primaryCtaText}
                      onChange={(e) => setHomeForm({ ...homeForm, primaryCtaText: e.target.value })}
                      placeholder="Explore Tours"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      CTA Button Link
                    </label>
                    <input
                      type="text"
                      value={homeForm.primaryCtaLink}
                      onChange={(e) => setHomeForm({ ...homeForm, primaryCtaLink: e.target.value })}
                      placeholder="/packages"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Video Preview & File Upload */}
              <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Video className="w-4 h-4 text-blue-600" />
                      Hero Background Video
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Direct Video or MP4</span>
                  </div>

                  <div className="relative rounded-2xl overflow-hidden aspect-video bg-black flex items-center justify-center border border-slate-300 shadow-inner mb-4">
                    {homeForm.heroVideoUrl ? (
                      homeForm.heroVideoUrl.includes('youtube.com') || homeForm.heroVideoUrl.includes('youtu.be') ? (
                        <iframe
                          src={`${homeForm.heroVideoUrl.replace('watch?v=', 'embed/')}?autoplay=1&mute=1&loop=1&controls=0`}
                          title="Hero Video Preview"
                          className="w-full h-full border-0 pointer-events-none"
                        />
                      ) : (
                        <video src={homeForm.heroVideoUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                      )
                    ) : (
                      <div className="text-center text-slate-500 text-xs">No video URL set</div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Hero Video URL (MP4 / WebM / YouTube)</label>
                    <input
                      type="url"
                      value={homeForm.heroVideoUrl}
                      onChange={(e) => setHomeForm({ ...homeForm, heroVideoUrl: e.target.value })}
                      placeholder="https://storage.googleapis.com/.../ForBiggerEscapes.mp4"
                      className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Or Upload Video File (Max 50MB)</label>
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const url = await handleFileUpload(file);
                        if (url) setHomeForm({ ...homeForm, heroVideoUrl: url });
                      }
                    }}
                    className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PLAN TRIP & SEARCH WIDGET */}
        {activeTab === 'sections' && (
          <div className="space-y-6">
            {/* Section 2: Plan the Trip of a Lifetime */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200 space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-lg font-black text-slate-900">Section 2: "Plan the trip of a lifetime" & Map</h2>
                <p className="text-xs text-slate-500 font-medium">Text and button displayed alongside the interactive world travel map and destination cards.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Section Heading</label>
                  <input
                    type="text"
                    value={homeForm.planHeading}
                    onChange={(e) => setHomeForm({ ...homeForm, planHeading: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Button Label</label>
                    <input
                      type="text"
                      value={homeForm.planCtaText}
                      onChange={(e) => setHomeForm({ ...homeForm, planCtaText: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Button Link</label>
                    <input
                      type="text"
                      value={homeForm.planCtaLink}
                      onChange={(e) => setHomeForm({ ...homeForm, planCtaLink: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Section Description Paragraph</label>
                  <textarea
                    rows={2}
                    value={homeForm.planDescription}
                    onChange={(e) => setHomeForm({ ...homeForm, planDescription: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Featured Travel Packages Grid */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200 space-y-5">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Section 3: Featured Packages</h2>
                  <p className="text-xs text-slate-500 font-medium">Manage the package cards displayed under the map. Book Now will link to the actual package booking.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newPkg: HomePackageCard = {
                      id: Math.random().toString(36).substring(7),
                      packageId: '',
                      enabled: true,
                      image: '',
                      title: 'New Package',
                      destination: 'Destination',
                      durationDays: 5,
                      durationNights: 4,
                      basePrice: '0'
                    };
                    setHomeForm({ ...homeForm, homePackages: [...homeForm.homePackages, newPkg] });
                  }}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 uppercase tracking-wider"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Package
                </button>
              </div>

              {homeForm.homePackages.length === 0 ? (
                <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-sm font-medium">
                  No packages added yet. Click "Add Package" to start.
                </div>
              ) : (
                <div className="space-y-4">
                  {homeForm.homePackages.map((pkg, index) => (
                    <div key={pkg.id || index} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 relative group">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Package Card #{index + 1}</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const newList = [...homeForm.homePackages];
                              if (index > 0) {
                                [newList[index - 1], newList[index]] = [newList[index], newList[index - 1]];
                                setHomeForm({ ...homeForm, homePackages: newList });
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:bg-slate-200 rounded"
                            title="Move Up"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const newList = [...homeForm.homePackages];
                              if (index < newList.length - 1) {
                                [newList[index], newList[index + 1]] = [newList[index + 1], newList[index]];
                                setHomeForm({ ...homeForm, homePackages: newList });
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:bg-slate-200 rounded"
                            title="Move Down"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const newList = [...homeForm.homePackages];
                              newList[index].enabled = !newList[index].enabled;
                              setHomeForm({ ...homeForm, homePackages: newList });
                            }}
                            className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-colors ${pkg.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}
                          >
                            {pkg.enabled ? 'Enabled' : 'Disabled'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const newList = homeForm.homePackages.filter((_, i) => i !== index);
                              setHomeForm({ ...homeForm, homePackages: newList });
                            }}
                            className="p-1.5 text-rose-500 hover:bg-rose-100 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Target Package ID (For Booking)</label>
                            <input
                              type="text"
                              value={pkg.packageId}
                              onChange={(e) => {
                                const newList = [...homeForm.homePackages];
                                newList[index].packageId = e.target.value;
                                setHomeForm({ ...homeForm, homePackages: newList });
                              }}
                              placeholder="e.g. 1234-abcd..."
                              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
                            />
                            <p className="text-[9px] text-slate-400 mt-0.5">Find this ID in Admin → Package Management</p>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Display Title</label>
                            <input
                              type="text"
                              value={pkg.title}
                              onChange={(e) => {
                                const newList = [...homeForm.homePackages];
                                newList[index].title = e.target.value;
                                setHomeForm({ ...homeForm, homePackages: newList });
                              }}
                              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Destination Name</label>
                            <input
                              type="text"
                              value={pkg.destination}
                              onChange={(e) => {
                                const newList = [...homeForm.homePackages];
                                newList[index].destination = e.target.value;
                                setHomeForm({ ...homeForm, homePackages: newList });
                              }}
                              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                            />
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Days</label>
                              <input
                                type="number"
                                value={pkg.durationDays}
                                onChange={(e) => {
                                  const newList = [...homeForm.homePackages];
                                  newList[index].durationDays = parseInt(e.target.value) || 0;
                                  setHomeForm({ ...homeForm, homePackages: newList });
                                }}
                                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nights</label>
                              <input
                                type="number"
                                value={pkg.durationNights}
                                onChange={(e) => {
                                  const newList = [...homeForm.homePackages];
                                  newList[index].durationNights = parseInt(e.target.value) || 0;
                                  setHomeForm({ ...homeForm, homePackages: newList });
                                }}
                                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Price (String)</label>
                              <input
                                type="text"
                                value={pkg.basePrice}
                                onChange={(e) => {
                                  const newList = [...homeForm.homePackages];
                                  newList[index].basePrice = e.target.value;
                                  setHomeForm({ ...homeForm, homePackages: newList });
                                }}
                                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                              />
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Image URL</label>
                            <input
                              type="url"
                              value={pkg.image}
                              onChange={(e) => {
                                const newList = [...homeForm.homePackages];
                                newList[index].image = e.target.value;
                                setHomeForm({ ...homeForm, homePackages: newList });
                              }}
                              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
                            />
                          </div>
                          
                          <div className="w-full aspect-[4/3] bg-slate-200 rounded-xl overflow-hidden border border-slate-300">
                            {pkg.image && <img src={pkg.image} alt="Preview" className="w-full h-full object-cover" />}
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Upload New Image</label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const url = await handleFileUpload(file);
                                  if (url) {
                                    const newList = [...homeForm.homePackages];
                                    newList[index].image = url;
                                    setHomeForm({ ...homeForm, homePackages: newList });
                                  }
                                }
                              }}
                              className="block w-full text-xs text-slate-500 file:mr-3 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 4: Start Your Vacation Now & Search Banner */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200 space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-lg font-black text-slate-900">Section 4: "Start your Vacation Now" & Search Widget</h2>
                <p className="text-xs text-slate-500 font-medium">Configure banner title, description, and high-resolution background image for the search widget.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Search Heading</label>
                    <input
                      type="text"
                      value={homeForm.searchHeading}
                      onChange={(e) => setHomeForm({ ...homeForm, searchHeading: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Search Subtitle</label>
                    <textarea
                      rows={3}
                      value={homeForm.searchSubtitle}
                      onChange={(e) => setHomeForm({ ...homeForm, searchSubtitle: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Background Image URL</label>
                    <input
                      type="url"
                      value={homeForm.searchBgImage}
                      onChange={(e) => setHomeForm({ ...homeForm, searchBgImage: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <span className="text-xs font-bold text-slate-700 uppercase block">Search Banner Preview</span>
                  <div className="relative rounded-xl overflow-hidden aspect-video bg-slate-900">
                    {homeForm.searchBgImage && (
                      <img src={homeForm.searchBgImage} alt="Search Preview" className="w-full h-full object-cover" />
                    )}
                    <div className="absolute inset-0 bg-purple-900/60 mix-blend-multiply flex items-center justify-center p-4 text-center">
                      <p className="text-white font-bold text-sm drop-shadow">{homeForm.searchHeading}</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Upload New Background Image</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const url = await handleFileUpload(file);
                          if (url) setHomeForm({ ...homeForm, searchBgImage: url });
                        }
                      }}
                      className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2.5: MAP MANAGEMENT */}
        {activeTab === 'map' && (
          <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200 space-y-6">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">Section 3: Map Management</h2>
                <p className="text-xs text-slate-500 font-medium">Manage the background map image and destination dots on the world map.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const newDot: MapDot = {
                    id: Math.random().toString(36).substring(7),
                    title: 'New Destination',
                    x: 50,
                    y: 50,
                    link: '',
                    enabled: true
                  };
                  setHomeForm({ ...homeForm, mapDots: [...homeForm.mapDots, newDot] });
                }}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 uppercase tracking-wider"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Dot
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">Map Background Image</span>
                
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Background Image URL</label>
                  <input
                    type="url"
                    value={homeForm.mapBgImage}
                    onChange={(e) => setHomeForm({ ...homeForm, mapBgImage: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono mb-2"
                  />
                </div>
                
                <div className="relative rounded-xl overflow-hidden aspect-[2/1] bg-slate-100 border border-slate-200 flex items-center justify-center p-2">
                  <img src={homeForm.mapBgImage} alt="Map Background Preview" className="w-full h-full object-contain opacity-50" />
                  <div className="absolute inset-0 pointer-events-none">
                    {homeForm.mapDots.map((dot, idx) => dot.enabled && (
                      <div key={dot.id || idx} className="absolute w-2 h-2 bg-[#800040] rounded-full transform -translate-x-1/2 -translate-y-1/2" style={{ left: `${dot.x}%`, top: `${dot.y}%` }}>
                        <span className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] font-bold bg-white px-1 rounded shadow">{dot.title}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Upload New Background Map File</label>
                  <input
                    type="file"
                    accept="image/*,.svg"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const url = await handleFileUpload(file);
                        if (url) setHomeForm({ ...homeForm, mapBgImage: url });
                      }
                    }}
                    className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-2">Destination Dots ({homeForm.mapDots.length})</span>
                {homeForm.mapDots.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-sm font-medium">
                    No dots added yet. Click "Add Dot" to start.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                    {homeForm.mapDots.map((dot, index) => (
                      <div key={dot.id || index} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 relative group">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Dot #{index + 1}</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const newDots = [...homeForm.mapDots];
                                newDots[index].enabled = !newDots[index].enabled;
                                setHomeForm({ ...homeForm, mapDots: newDots });
                              }}
                              className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-colors ${dot.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}
                            >
                              {dot.enabled ? 'Enabled' : 'Disabled'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const newDots = homeForm.mapDots.filter((_, i) => i !== index);
                                setHomeForm({ ...homeForm, mapDots: newDots });
                              }}
                              className="p-1 text-rose-500 hover:bg-rose-100 rounded transition-colors"
                              title="Delete Dot"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Destination Name</label>
                            <input
                              type="text"
                              value={dot.title}
                              onChange={(e) => {
                                const newDots = [...homeForm.mapDots];
                                newDots[index].title = e.target.value;
                                setHomeForm({ ...homeForm, mapDots: newDots });
                              }}
                              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">X Position (%)</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="range"
                                min="0" max="100" step="0.1"
                                value={dot.x}
                                onChange={(e) => {
                                  const newDots = [...homeForm.mapDots];
                                  newDots[index].x = parseFloat(e.target.value);
                                  setHomeForm({ ...homeForm, mapDots: newDots });
                                }}
                                className="w-full"
                              />
                              <span className="text-[10px] font-mono text-slate-500 w-8">{dot.x}%</span>
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Y Position (%)</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="range"
                                min="0" max="100" step="0.1"
                                value={dot.y}
                                onChange={(e) => {
                                  const newDots = [...homeForm.mapDots];
                                  newDots[index].y = parseFloat(e.target.value);
                                  setHomeForm({ ...homeForm, mapDots: newDots });
                                }}
                                className="w-full"
                              />
                              <span className="text-[10px] font-mono text-slate-500 w-8">{dot.y}%</span>
                            </div>
                          </div>

                          <div className="col-span-2">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Link URL (Optional)</label>
                            <input
                              type="text"
                              value={dot.link || ''}
                              onChange={(e) => {
                                const newDots = [...homeForm.mapDots];
                                newDots[index].link = e.target.value;
                                setHomeForm({ ...homeForm, mapDots: newDots });
                              }}
                              placeholder="/packages?destination=..."
                              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono text-slate-600"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DESTINATIONS & STATS */}
        {activeTab === 'stats' && (
          <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200 space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-lg font-black text-slate-900">Section 5: Travel Destinations Worldwide & Stats Counter</h2>
              <p className="text-xs text-slate-500 font-medium">Headings and 5 statistics displayed on the dark stats footer banner.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Destinations Section Heading</label>
                <input
                  type="text"
                  value={homeForm.destHeading}
                  onChange={(e) => setHomeForm({ ...homeForm, destHeading: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Destinations Section Subtitle</label>
                <textarea
                  rows={2}
                  value={homeForm.destSubtitle}
                  onChange={(e) => setHomeForm({ ...homeForm, destSubtitle: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
                />
              </div>

              {/* 5 Stats Counters */}
              <div className="pt-4 border-t border-slate-100">
                <h3 className="text-xs font-black uppercase text-indigo-600 tracking-wider mb-4 flex items-center gap-1.5">
                  <BarChart2 className="w-4 h-4" />
                  Dark Stats Banner (5 Counters)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  {[
                    { keyVal: 'stat1Value', keyLbl: 'stat1Label', labelNum: 'Stat 1' },
                    { keyVal: 'stat2Value', keyLbl: 'stat2Label', labelNum: 'Stat 2' },
                    { keyVal: 'stat3Value', keyLbl: 'stat3Label', labelNum: 'Stat 3' },
                    { keyVal: 'stat4Value', keyLbl: 'stat4Label', labelNum: 'Stat 4' },
                    { keyVal: 'stat5Value', keyLbl: 'stat5Label', labelNum: 'Stat 5' },
                  ].map((item, idx) => (
                    <div key={idx} className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.labelNum}</span>
                      <div>
                        <label className="block text-[9px] text-slate-400 font-bold uppercase">Counter Value</label>
                        <input
                          type="text"
                          value={(homeForm as any)[item.keyVal]}
                          onChange={(e) => setHomeForm({ ...homeForm, [item.keyVal]: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm font-black text-rose-400"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] text-slate-400 font-bold uppercase">Label Text</label>
                        <input
                          type="text"
                          value={(homeForm as any)[item.keyLbl]}
                          onChange={(e) => setHomeForm({ ...homeForm, [item.keyLbl]: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-semibold text-slate-200"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: THE VALUE WE DELIVER */}
        {activeTab === 'value' && (
          <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200 space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-lg font-black text-slate-900">Section 6: "The Value We Deliver"</h2>
              <p className="text-xs text-slate-500 font-medium">Text, display image, and 4 value bullet items.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Section Heading</label>
                  <input
                    type="text"
                    value={homeForm.valueHeading}
                    onChange={(e) => setHomeForm({ ...homeForm, valueHeading: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Description Paragraph</label>
                  <textarea
                    rows={2}
                    value={homeForm.valueDescription}
                    onChange={(e) => setHomeForm({ ...homeForm, valueDescription: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">CTA Button Label</label>
                  <input
                    type="text"
                    value={homeForm.valueCtaText}
                    onChange={(e) => setHomeForm({ ...homeForm, valueCtaText: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-2">4 Value Bullet Points</label>
                  <div className="space-y-2">
                    {homeForm.valuePoints.map((pt, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-rose-500 shrink-0" />
                        <input
                          type="text"
                          value={pt}
                          onChange={(e) => {
                            const updated = [...homeForm.valuePoints];
                            updated[i] = e.target.value;
                            setHomeForm({ ...homeForm, valuePoints: updated });
                          }}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Display Image */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">Section Image Settings</span>
                
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Image URL</label>
                  <input
                    type="url"
                    value={homeForm.valueThumbnail}
                    onChange={(e) => setHomeForm({ ...homeForm, valueThumbnail: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono mb-2"
                  />
                </div>
                
                <div className="relative rounded-2xl overflow-hidden aspect-video bg-slate-900 border border-slate-300">
                  {homeForm.valueThumbnail && (
                    <img src={homeForm.valueThumbnail} alt="Section Image preview" className="w-full h-full object-cover" />
                  )}
                </div>
                
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Upload New Image File</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const url = await handleFileUpload(file);
                        if (url) setHomeForm({ ...homeForm, valueThumbnail: url });
                      }
                    }}
                    className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: YOUR JOURNEY, OUR PRIORITY */}
        {activeTab === 'priority' && (
          <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200 space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-lg font-black text-slate-900">Section 7: "Your Journey, Our Priority"</h2>
              <p className="text-xs text-slate-500 font-medium">Headings, 2 key feature cards, trust badge, and arch image.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Section Heading</label>
                  <input
                    type="text"
                    value={homeForm.journeyHeading}
                    onChange={(e) => setHomeForm({ ...homeForm, journeyHeading: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Section Subtitle</label>
                  <textarea
                    rows={3}
                    value={homeForm.journeySubtitle}
                    onChange={(e) => setHomeForm({ ...homeForm, journeySubtitle: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
                  />
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase">Feature Card 1 (Safe Travels)</h4>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Card Title</label>
                    <input
                      type="text"
                      value={homeForm.journeyF1Title}
                      onChange={(e) => setHomeForm({ ...homeForm, journeyF1Title: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Card Description</label>
                    <input
                      type="text"
                      value={homeForm.journeyF1Desc}
                      onChange={(e) => setHomeForm({ ...homeForm, journeyF1Desc: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase">Feature Card 2 (Expert Guides)</h4>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Card Title</label>
                    <input
                      type="text"
                      value={homeForm.journeyF2Title}
                      onChange={(e) => setHomeForm({ ...homeForm, journeyF2Title: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Card Description</label>
                    <input
                      type="text"
                      value={homeForm.journeyF2Desc}
                      onChange={(e) => setHomeForm({ ...homeForm, journeyF2Desc: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Arch Image & Badge */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-3">Arch Visual & Trust Badge</span>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Trust Badge Label</label>
                    <input
                      type="text"
                      value={homeForm.journeyBadge}
                      onChange={(e) => setHomeForm({ ...homeForm, journeyBadge: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold"
                    />
                  </div>

                  <div className="mt-4">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Arch Image URL</label>
                    <input
                      type="url"
                      value={homeForm.journeyImage}
                      onChange={(e) => setHomeForm({ ...homeForm, journeyImage: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono mb-3"
                    />
                  </div>

                  <div className="w-40 mx-auto aspect-[3/4] rounded-t-[5rem] rounded-b-2xl overflow-hidden shadow-md border-4 border-white bg-slate-900">
                    {homeForm.journeyImage && (
                      <img src={homeForm.journeyImage} alt="Journey visual" className="w-full h-full object-cover" />
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Upload New Arch Image File</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const url = await handleFileUpload(file);
                        if (url) setHomeForm({ ...homeForm, journeyImage: url });
                      }
                    }}
                    className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: TESTIMONIALS */}
        {activeTab === 'testimonials' && (
          <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200 space-y-6">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">Section 8: Customer Testimonials</h2>
                <p className="text-xs text-slate-500 font-medium">Headings and customer review cards displayed on the Great Wall background.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setHomeForm({
                    ...homeForm,
                    testimonials: [
                      ...homeForm.testimonials,
                      {
                        quote: 'Universal Travel Company provided impeccable service from start to finish.',
                        author: 'Happy Traveler',
                        role: 'Verified Traveler'
                      }
                    ]
                  });
                }}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 uppercase tracking-wider"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Testimonial
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Testimonials Heading</label>
                  <input
                    type="text"
                    value={homeForm.testimonialHeading}
                    onChange={(e) => setHomeForm({ ...homeForm, testimonialHeading: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Testimonials Subtitle</label>
                  <textarea
                    rows={2}
                    value={homeForm.testimonialSubtitle}
                    onChange={(e) => setHomeForm({ ...homeForm, testimonialSubtitle: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3">
                {homeForm.testimonials.map((t, idx) => (
                  <div key={idx} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3 relative group">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Testimonial #{idx + 1}</span>
                      {homeForm.testimonials.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = homeForm.testimonials.filter((_, i) => i !== idx);
                            setHomeForm({ ...homeForm, testimonials: updated });
                          }}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-xs"
                          title="Delete Testimonial"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Quote</label>
                      <textarea
                        rows={3}
                        value={t.quote}
                        onChange={(e) => {
                          const updated = [...homeForm.testimonials];
                          updated[idx] = { ...updated[idx], quote: e.target.value };
                          setHomeForm({ ...homeForm, testimonials: updated });
                        }}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium bg-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Author Name</label>
                        <input
                          type="text"
                          value={t.author}
                          onChange={(e) => {
                            const updated = [...homeForm.testimonials];
                            updated[idx] = { ...updated[idx], author: e.target.value };
                            setHomeForm({ ...homeForm, testimonials: updated });
                          }}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Role / Designation</label>
                        <input
                          type="text"
                          value={t.role}
                          onChange={(e) => {
                            const updated = [...homeForm.testimonials];
                            updated[idx] = { ...updated[idx], role: e.target.value };
                            setHomeForm({ ...homeForm, testimonials: updated });
                          }}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: LOADING ANIMATION CONTROLLER */}
        {activeTab === 'loader' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-5 gap-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
                  <Plane className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-slate-900">Global Website Loading Animation</h2>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      homeForm.loadingAnimationEnabled
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>
                      {homeForm.loadingAnimationEnabled ? 'Enabled (ON)' : 'Disabled (OFF)'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Control whether the luxury UTC airplane ✈️ and cruise ship 🚢 animation shows on the public website during genuinely loading states.
                  </p>
                </div>
              </div>

              {/* ON/OFF Switch */}
              <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-2xl border border-slate-200 self-start sm:self-auto">
                <span className="text-xs font-bold text-slate-800">
                  {homeForm.loadingAnimationEnabled ? 'Loading Animation ON' : 'Loading Animation OFF'}
                </span>
                <button
                  type="button"
                  onClick={() => setHomeForm({ ...homeForm, loadingAnimationEnabled: !homeForm.loadingAnimationEnabled })}
                  className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                    homeForm.loadingAnimationEnabled ? 'bg-rose-600' : 'bg-slate-300'
                  }`}
                  aria-pressed={homeForm.loadingAnimationEnabled}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-md ${
                      homeForm.loadingAnimationEnabled ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Live Interactive Preview & Highlights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900">Brand Animation Specifications:</h3>
                <ul className="text-xs text-slate-600 space-y-2.5 leading-relaxed">
                  <li className="flex items-start gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500 mt-1 shrink-0" />
                    <span><strong>Central "UTC" Emblem:</strong> Luxury typography highlighted with glowing metallic gold & rose gradients.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 mt-1 shrink-0" />
                    <span><strong>Orbital Airplane ✈️:</strong> Jet aircraft banking along a celestial elliptical orbit with trailing flight arc.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-sky-500 mt-1 shrink-0" />
                    <span><strong>Sailing Cruise Ship 🚢:</strong> Glides across undulating waves beneath the brand name.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
                    <span><strong>Automatic Safety Timeout:</strong> 7.5s fail-safe guarantee ensures users are never trapped on loading.</span>
                  </li>
                </ul>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] text-slate-500 leading-normal">
                  💡 <strong>Admin Note:</strong> Toggling this to <em>OFF</em> completely removes the custom travel loader across all public pages. Clicking <em>Save All Changes</em> persists this setting in the database permanently.
                </div>
              </div>

              {/* Live Preview Stage */}
              <div>
                <span className="text-xs font-bold text-slate-700 block mb-2">Live Animation Preview:</span>
                <GlobalLoadingAnimation previewMode={true} />
              </div>
            </div>
          </div>
        )}

        {/* Global Save Button at bottom */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saveMutation.isPending || isUploading}
            className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-2xl shadow-xl shadow-blue-600/30 transition-all flex items-center justify-center gap-2 uppercase tracking-wider disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saveMutation.isPending ? 'Saving All Changes...' : 'Save All Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
