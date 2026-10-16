import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Package,
  MapPin,
  DollarSign,
  Star,
  Calendar as CalendarIcon,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Video,
  Image as ImageIcon,
  Upload,
  X,
  CheckCircle2,
  Map,
  Save,
  Link as LinkIcon,
  Layers,
  AlertCircle,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import AdminCalendarModal from '../../components/admin/AdminCalendarModal';
import AdminPackageMediaModal from '../../components/admin/AdminPackageMediaModal';

interface Destination {
  id: string;
  name: string;
}

interface TopHighlightItem {
  id?: string;
  title: string;
  description?: string | null;
  image?: string | null;
  displayOrder: number;
  isActive: boolean;
}

interface PackagePricingItem {
  id?: string;
  title: string;
  adultPrice: number;
  child6to17Price: number;
  child2to5Price: number;
  infantPrice: number;
}

interface TravelPackageData {
  id: string;
  title: string;
  slug: string;
  overview: string;
  durationDays: number;
  durationNights: number;
  basePrice?: number;
  currency?: string;
  status: string;
  isFeatured: boolean;
  destination: Destination;
  images?: Array<{ url: string }>;
  heroImage?: string | null;
  mapImage?: string | null;
  highlightsVideo?: string | null;
  topHighlights?: TopHighlightItem[];
  pricingVars?: PackagePricingItem[];
  itineraryDays?: any[];
}

export default function PackageManagement() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [activeMainTab, setActiveMainTab] = useState<'packages' | 'banner'>('packages');
  const [bannerFeedback, setBannerFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isBannerUploading, setIsBannerUploading] = useState(false);

  const [packagesPageForm, setPackagesPageForm] = useState({
    heroTitle: 'Into The Heart of Ceylon',
    heroSubtitle: 'Tea trails, scenic train journeys, wildlife safaris and coastal charm across Sri Lanka.',
    heroImage: 'https://images.unsplash.com/photo-1546708973-b339540b5162?q=80&w=1600&auto=format&fit=crop',
    heroActive: true,
    heroMediaType: 'IMAGE' as 'IMAGE' | 'VIDEO',
    heroVideoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    primaryCtaText: 'Plan My Trip',
    primaryCtaLink: '#date-selection',
    secondaryCtaText: 'Customise This Journey',
    secondaryCtaLink: '#date-selection',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    mapImage: 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?q=80&w=1200',
    mapActive: true,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);

  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [calendarPackageId, setCalendarPackageId] = useState<string | null>(null);
  const [calendarPackageTitle, setCalendarPackageTitle] = useState('');

  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [mediaPackageId, setMediaPackageId] = useState<string | null>(null);
  const [mediaPackageSlug, setMediaPackageSlug] = useState('');
  const [mediaPackageTitle, setMediaPackageTitle] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    overview: '',
    durationDays: 7,
    durationNights: 6,
    destinationId: '',
    basePrice: 1000,
    currency: 'INR',
    status: 'PUBLISHED',
    isFeatured: false,
    image: '',
    heroImage: '',
    mapImage: '',
    highlightsVideo: '',
  });

  const defaultPricingVars: PackagePricingItem[] = [
    { title: 'Essential', adultPrice: 0, child6to17Price: 0, child2to5Price: 0, infantPrice: 0 },
    { title: 'Signature', adultPrice: 0, child6to17Price: 0, child2to5Price: 0, infantPrice: 0 },
    { title: 'Elite', adultPrice: 0, child6to17Price: 0, child2to5Price: 0, infantPrice: 0 }
  ];

  const [pricingVars, setPricingVars] = useState<PackagePricingItem[]>(defaultPricingVars);

  const [topHighlights, setTopHighlights] = useState<TopHighlightItem[]>([]);
  const [isHighlightFormOpen, setIsHighlightFormOpen] = useState(false);
  const [editingHighlightIndex, setEditingHighlightIndex] = useState<number | null>(null);
  const [highlightForm, setHighlightForm] = useState({
    title: '',
    description: '',
    image: '',
    isActive: true
  });

  const [itineraryDays, setItineraryDays] = useState<any[]>([]);
  const [isItineraryFormOpen, setIsItineraryFormOpen] = useState(false);
  const [editingItineraryIndex, setEditingItineraryIndex] = useState<number | null>(null);
  const [itineraryForm, setItineraryForm] = useState({
    dayNumber: 1,
    title: '',
    description: '',
    image: ''
  });

  const { data: destsData } = useQuery<{ data: Destination[] }>({
    queryKey: ['admin-destinations'],
    queryFn: async () => {
      const res = await api.get('/packages/destinations');
      return res.data;
    }
  });

  const { data: pkgsData, isLoading } = useQuery<{ data: TravelPackageData[] }>({
    queryKey: ['admin-packages', searchTerm, statusFilter],
    queryFn: async () => {
      let query = `/packages?`;
      if (searchTerm) query += `search=${encodeURIComponent(searchTerm)}&`;
      if (statusFilter) query += `status=${statusFilter}&`;
      const res = await api.get(query);
      return res.data;
    }
  });

  // Query and mutation for Packages Page Banner & Route Map settings
  const { data: packagesPageData, isLoading: isPkgPageLoading } = useQuery({
    queryKey: ['admin-packages-page-settings'],
    queryFn: async () => {
      const res = await api.get('/settings/packages-page');
      return res.data;
    }
  });

  const pkgPageContent = packagesPageData?.data?.content;

  useEffect(() => {
    if (pkgPageContent) {
      setPackagesPageForm({
        heroTitle: pkgPageContent.heroTitle || 'Into The Heart of Ceylon',
        heroSubtitle: pkgPageContent.heroSubtitle || 'Tea trails, scenic train journeys, wildlife safaris and coastal charm across Sri Lanka.',
        heroImage: pkgPageContent.heroImage || 'https://images.unsplash.com/photo-1546708973-b339540b5162?q=80&w=1600&auto=format&fit=crop',
        heroActive: pkgPageContent.heroActive !== false,
        heroMediaType: (pkgPageContent.heroMediaType as 'IMAGE' | 'VIDEO') || 'IMAGE',
        heroVideoUrl: pkgPageContent.heroVideoUrl || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        primaryCtaText: pkgPageContent.primaryCtaText || 'Plan My Trip',
        primaryCtaLink: pkgPageContent.primaryCtaLink || '#date-selection',
        secondaryCtaText: pkgPageContent.secondaryCtaText || 'Customise This Journey',
        secondaryCtaLink: pkgPageContent.secondaryCtaLink || '#date-selection',
        videoUrl: pkgPageContent.videoUrl || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        mapImage: pkgPageContent.mapImage || 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?q=80&w=1200',
        mapActive: pkgPageContent.mapActive !== false,
      });
    }
  }, [pkgPageContent]);

  const savePackagesPageMutation = useMutation({
    mutationFn: async (data: typeof packagesPageForm) => {
      const res = await api.patch('/settings/packages-page', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-packages-page-settings'] });
      queryClient.invalidateQueries({ queryKey: ['packages-page-content'] });
      setBannerFeedback({ type: 'success', message: 'Packages page banner and route map settings updated successfully!' });
    },
    onError: (err: any) => {
      setBannerFeedback({ type: 'error', message: err.response?.data?.message || 'Failed to update settings.' });
    }
  });

  const invalidateAllQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-packages'] });
    if (editingSlug) {
      queryClient.invalidateQueries({ queryKey: ['package-detail', editingSlug] });
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post('/packages/upload-media', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return res.data?.url;
    } catch (err: any) {
      alert(err.response?.data?.message || 'File upload failed');
      return null;
    }
  };

  const createMutation = useMutation({
    mutationFn: async (newPkg: typeof formData) => {
      const res = await api.post('/packages', { ...newPkg, pricingVars, itineraryDays });
      const createdPkg = res.data?.data || res.data;
      
      // If top highlights were configured, save them for the new package
      if (createdPkg?.id && topHighlights.length > 0) {
        for (const h of topHighlights) {
          await api.post(`/packages/${createdPkg.id}/top-highlights`, h);
        }
      }
      return createdPkg;
    },
    onSuccess: () => {
      invalidateAllQueries();
      closeModal();
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to create package');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (updatedPkg: typeof formData) => {
      const res = await api.patch(`/packages/${editingId}`, { ...updatedPkg, pricingVars, itineraryDays });
      
      // Save / update top highlights for this package
      if (editingId) {
        for (const [idx, h] of topHighlights.entries()) {
          const payload = { ...h, displayOrder: idx + 1 };
          if (h.id) {
            await api.patch(`/packages/${editingId}/top-highlights/${h.id}`, payload);
          } else {
            await api.post(`/packages/${editingId}/top-highlights`, payload);
          }
        }
      }
      return res.data;
    },
    onSuccess: () => {
      invalidateAllQueries();
      closeModal();
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to update package');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/packages/${id}`);
      return res.data;
    },
    onSuccess: () => {
      invalidateAllQueries();
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to delete package');
    }
  });

  const closeModal = () => {
    setIsModalOpen(false);
    setIsEditMode(false);
    setEditingId(null);
    setEditingSlug(null);
    setFormData({
      title: '', overview: '', durationDays: 7, durationNights: 6,
      destinationId: '', basePrice: 1000, currency: 'INR', status: 'PUBLISHED', isFeatured: false,
      image: '', heroImage: '', mapImage: '', highlightsVideo: ''
    });
    setTopHighlights([]);
    setPricingVars(defaultPricingVars);
    setIsHighlightFormOpen(false);
    setEditingHighlightIndex(null);
    setItineraryDays([]);
    setIsItineraryFormOpen(false);
    setEditingItineraryIndex(null);
  };

  const handleEditClick = async (e: React.MouseEvent, pkg: TravelPackageData) => {
    e.stopPropagation();
    setIsEditMode(true);
    setEditingId(pkg.id);
    setEditingSlug(pkg.slug);

    try {
      const res = await api.get(`/packages/${pkg.slug}`);
      const fullPkg = res.data?.data || res.data;
      setFormData({
        title: fullPkg.title || pkg.title,
        overview: fullPkg.overview || '',
        durationDays: fullPkg.durationDays || pkg.durationDays,
        durationNights: fullPkg.durationNights || pkg.durationNights,
        destinationId: fullPkg.destination?.id || pkg.destination?.id || '',
        basePrice: fullPkg.basePrice || pkg.basePrice || 1000,
        currency: fullPkg.currency || pkg.currency || 'INR',
        status: fullPkg.status || pkg.status,
        isFeatured: Boolean(fullPkg.isFeatured),
        image: fullPkg.images?.[0]?.url || pkg.images?.[0]?.url || '',
        heroImage: fullPkg.heroImage || '',
        mapImage: fullPkg.mapImage || '',
        highlightsVideo: fullPkg.highlightsVideo || '',
      });
      setTopHighlights(fullPkg.topHighlights || []);
      setItineraryDays(fullPkg.itineraryDays || []);
      
      if (fullPkg.pricingVars && fullPkg.pricingVars.length > 0) {
        // Find or create the Normal pricing entry
        const normalEntry = fullPkg.pricingVars.find((p: any) =>
          p.title === 'Normal' || p.title === 'normal'
        ) || fullPkg.pricingVars[0]; // fallback: use the first existing entry
        setPricingVars([{
          title: 'Normal',
          adultPrice: normalEntry.adultPrice || normalEntry.price || 0,
          child6to17Price: normalEntry.child6to17Price || 0,
          child2to5Price: normalEntry.child2to5Price || 0,
          infantPrice: normalEntry.infantPrice || 0,
        }]);
      } else {
        setPricingVars(defaultPricingVars);
      }
    } catch (err) {
      setFormData({
        title: pkg.title,
        overview: pkg.overview || '',
        durationDays: pkg.durationDays,
        durationNights: pkg.durationNights,
        destinationId: pkg.destination?.id || '',
        basePrice: pkg.basePrice || 1000,
        currency: pkg.currency || 'INR',
        status: pkg.status,
        isFeatured: pkg.isFeatured,
        image: pkg.images?.[0]?.url || '',
        heroImage: pkg.heroImage || '',
        mapImage: pkg.mapImage || '',
        highlightsVideo: pkg.highlightsVideo || '',
      });
      setTopHighlights(pkg.topHighlights || []);
      setItineraryDays(pkg.itineraryDays || []);
      setPricingVars(pkg.pricingVars && pkg.pricingVars.length > 0 ? pkg.pricingVars : defaultPricingVars);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditMode) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleSaveHighlightForm = () => {
    if (!highlightForm.title.trim()) {
      alert('Highlight title is required');
      return;
    }

    if (editingHighlightIndex !== null) {
      const updated = [...topHighlights];
      updated[editingHighlightIndex] = {
        ...updated[editingHighlightIndex],
        title: highlightForm.title.trim(),
        description: highlightForm.description.trim() || null,
        image: highlightForm.image.trim() || null,
        isActive: highlightForm.isActive
      };
      setTopHighlights(updated);
    } else {
      const newItem: TopHighlightItem = {
        title: highlightForm.title.trim(),
        description: highlightForm.description.trim() || null,
        image: highlightForm.image.trim() || null,
        displayOrder: topHighlights.length + 1,
        isActive: highlightForm.isActive
      };
      setTopHighlights([...topHighlights, newItem]);
    }

    setHighlightForm({ title: '', description: '', image: '', isActive: true });
    setEditingHighlightIndex(null);
    setIsHighlightFormOpen(false);
  };

  const moveHighlight = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= topHighlights.length) return;
    const updated = [...topHighlights];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setTopHighlights(updated.map((item, idx) => ({ ...item, displayOrder: idx + 1 })));
  };

  const handleDeleteHighlight = async (index: number) => {
    const target = topHighlights[index];
    if (target?.id && editingId) {
      if (!confirm(`Delete highlight "${target.title}"?`)) return;
      try {
        await api.delete(`/packages/${editingId}/top-highlights/${target.id}`);
      } catch (err) {
        console.error('Delete highlight error:', err);
      }
    }
    setTopHighlights(topHighlights.filter((_, i) => i !== index));
  };

  const handleSaveItineraryForm = () => {
    if (!itineraryForm.title.trim()) {
      alert('Day title is required');
      return;
    }

    if (editingItineraryIndex !== null) {
      const updated = [...itineraryDays];
      updated[editingItineraryIndex] = {
        ...updated[editingItineraryIndex],
        dayNumber: itineraryForm.dayNumber,
        title: itineraryForm.title.trim(),
        description: itineraryForm.description.trim(),
        image: itineraryForm.image.trim() || null,
      };
      // Sort by day number
      updated.sort((a, b) => a.dayNumber - b.dayNumber);
      setItineraryDays(updated);
    } else {
      const newItem = {
        dayNumber: itineraryForm.dayNumber,
        title: itineraryForm.title.trim(),
        description: itineraryForm.description.trim(),
        image: itineraryForm.image.trim() || null,
      };
      const updated = [...itineraryDays, newItem];
      updated.sort((a, b) => a.dayNumber - b.dayNumber);
      setItineraryDays(updated);
    }

    setItineraryForm({ dayNumber: itineraryDays.length + 2, title: '', description: '', image: '' });
    setEditingItineraryIndex(null);
    setIsItineraryFormOpen(false);
  };

  const handleDeleteItineraryDay = (index: number) => {
    if (!confirm('Delete this itinerary day?')) return;
    setItineraryDays(itineraryDays.filter((_, i) => i !== index));
  };

  const packages = pkgsData?.data || [];
  const destinations = destsData?.data || [];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div>
          <div className="inline-flex items-center space-x-2 bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 border border-indigo-200">
            <Package className="w-3.5 h-3.5" />
            <span>Catalog & Packages</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Package Management</h1>
          <p className="text-slate-500 mt-1 text-sm font-medium">
            Manage public travel packages, pricing tiers, itineraries, calendar dates, and Packages page banner & route map.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/packages"
            target="_blank"
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all flex items-center gap-1.5 uppercase tracking-wider shrink-0"
          >
            <ExternalLink className="w-4 h-4" />
            View Live Packages
          </Link>

          {activeMainTab === 'packages' && (
            <button 
              onClick={() => {
                setIsEditMode(false);
                setFormData({
                  title: '', overview: '', durationDays: 7, durationNights: 6,
                  destinationId: destinations[0]?.id || '', basePrice: 1500, currency: 'INR',
                  status: 'PUBLISHED', isFeatured: false, image: '', heroImage: '', mapImage: '', highlightsVideo: ''
                });
                setTopHighlights([]);
                setIsModalOpen(true);
              }}
              className="flex items-center px-4 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm text-xs uppercase tracking-wider shrink-0"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add Package
            </button>
          )}

          {activeMainTab === 'banner' && (
            <button
              onClick={() => savePackagesPageMutation.mutate(packagesPageForm)}
              disabled={savePackagesPageMutation.isPending || isBannerUploading}
              className="flex items-center px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm text-xs uppercase tracking-wider shrink-0 disabled:opacity-50"
            >
              <Save className="w-4 h-4 mr-1.5" />
              {savePackagesPageMutation.isPending ? 'Saving...' : 'Save Banner Settings'}
            </button>
          )}
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveMainTab('packages')}
          className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeMainTab === 'packages'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Package className="w-4 h-4" />
          1. Travel Packages (Catalog & Tours)
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('banner')}
          className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeMainTab === 'banner'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Map className="w-4 h-4 text-emerald-400" />
          2. Packages Page Banner & Route Map
        </button>
      </div>

      {/* TAB 1: TRAVEL PACKAGES CATALOG */}
      {activeMainTab === 'packages' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input 
                type="text" 
                placeholder="Search packages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
            </select>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-slate-500">Loading packages...</div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100 text-left text-sm font-bold text-slate-500 uppercase">
                <tr>
                  <th className="px-6 py-4">Package</th>
                  <th className="px-6 py-4">Destination</th>
                  <th className="px-6 py-4">Duration</th>
                  <th className="px-6 py-4">Price</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {packages.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                      No packages found.
                    </td>
                  </tr>
                ) : (
                  packages.map((pkg) => (
                    <tr key={pkg.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-slate-200 overflow-hidden shrink-0">
                            {pkg.heroImage || pkg.images?.[0]?.url ? (
                              <img src={pkg.heroImage || pkg.images?.[0]?.url} alt={pkg.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-xs">PKG</div>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{pkg.title}</p>
                            <p className="text-xs text-slate-500">{pkg.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-700 font-medium">
                        {pkg.destination?.name || '-'}
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium">
                        {pkg.durationDays}D / {pkg.durationNights}N
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900">
                        {pkg.basePrice ? `₹${pkg.basePrice.toLocaleString()}` : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          pkg.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {pkg.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => {
                              setMediaPackageId(pkg.id);
                              setMediaPackageSlug(pkg.slug);
                              setMediaPackageTitle(pkg.title);
                              setIsMediaModalOpen(true);
                            }}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Manage Media & Highlights"
                          >
                            <Sparkles className="w-5 h-5 text-indigo-600" />
                          </button>
                          <button 
                            onClick={() => {
                              setCalendarPackageId(pkg.id);
                              setCalendarPackageTitle(pkg.title);
                              setIsCalendarModalOpen(true);
                            }}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Manage Calendar"
                          >
                            <CalendarIcon className="w-5 h-5" />
                          </button>
                          <button 
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Package"
                            onClick={(e) => handleEditClick(e, pkg)}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Package"
                            onClick={() => { if (confirm('Delete this package?')) deleteMutation.mutate(pkg.id); }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* TAB 2: PACKAGES PAGE BANNER & ROUTE MAP */}
      {activeMainTab === 'banner' && (
        <div className="space-y-6">
          {bannerFeedback && (
            <div className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-bold ${
              bannerFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}>
              <div className="flex items-center space-x-2">
                {bannerFeedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
                <span>{bannerFeedback.message}</span>
              </div>
              <button onClick={() => setBannerFeedback(null)} className="text-slate-400 hover:text-slate-600 font-bold text-base">×</button>
            </div>
          )}

          {/* Section A: Hero Banner */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200 space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-black text-slate-900">1. Packages Page Featured Hero Banner</h2>
              <p className="text-xs text-slate-500 font-medium">Manage featured journey title, subtitle overview, and action buttons shown on the public Packages page.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Featured Journey Title *
                </label>
                <input
                  type="text"
                  required
                  value={packagesPageForm.heroTitle}
                  onChange={(e) => setPackagesPageForm({ ...packagesPageForm, heroTitle: e.target.value })}
                  placeholder="e.g. Into The Heart of Ceylon"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Overview / Subtitle Description
                </label>
                <textarea
                  rows={3}
                  value={packagesPageForm.heroSubtitle}
                  onChange={(e) => setPackagesPageForm({ ...packagesPageForm, heroSubtitle: e.target.value })}
                  placeholder="Tea trails, scenic train journeys, wildlife safaris..."
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-medium text-slate-800 leading-relaxed"
                ></textarea>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center">
                    <LinkIcon className="w-3.5 h-3.5 mr-1.5 text-blue-600" /> Primary CTA Button
                  </h4>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Button Label</label>
                    <input
                      type="text"
                      value={packagesPageForm.primaryCtaText}
                      onChange={(e) => setPackagesPageForm({ ...packagesPageForm, primaryCtaText: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Button Link / Hash</label>
                    <input
                      type="text"
                      value={packagesPageForm.primaryCtaLink}
                      onChange={(e) => setPackagesPageForm({ ...packagesPageForm, primaryCtaLink: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono font-bold bg-white"
                    />
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center">
                    <LinkIcon className="w-3.5 h-3.5 mr-1.5 text-indigo-600" /> Secondary CTA Button
                  </h4>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Button Label</label>
                    <input
                      type="text"
                      value={packagesPageForm.secondaryCtaText}
                      onChange={(e) => setPackagesPageForm({ ...packagesPageForm, secondaryCtaText: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Button Link / Hash</label>
                    <input
                      type="text"
                      value={packagesPageForm.secondaryCtaLink}
                      onChange={(e) => setPackagesPageForm({ ...packagesPageForm, secondaryCtaLink: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono font-bold bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section B: Hero Media (Image vs Video Mode) */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">2. Featured Banner Media</h2>
                  <p className="text-xs text-slate-500 font-medium">Background image and background video for the Packages page header.</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPackagesPageForm({ ...packagesPageForm, heroMediaType: 'IMAGE' })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    packagesPageForm.heroMediaType === 'IMAGE' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  Image Mode
                </button>
                <button
                  type="button"
                  onClick={() => setPackagesPageForm({ ...packagesPageForm, heroMediaType: 'VIDEO' })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    packagesPageForm.heroMediaType === 'VIDEO' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  Video Mode
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Image Box */}
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-800 uppercase block">Hero Background Image</span>
                <div className="relative rounded-xl overflow-hidden aspect-video bg-slate-900">
                  {packagesPageForm.heroImage ? (
                    <img src={packagesPageForm.heroImage} alt="Hero Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">No image set</div>
                  )}
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Image URL</label>
                  <input
                    type="url"
                    value={packagesPageForm.heroImage}
                    onChange={(e) => setPackagesPageForm({ ...packagesPageForm, heroImage: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Or Upload New Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const url = await handleFileUpload(file);
                        if (url) setPackagesPageForm({ ...packagesPageForm, heroImage: url });
                      }
                    }}
                    className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                  />
                </div>
              </div>

              {/* Video Box */}
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-800 uppercase block">Hero Background Video</span>
                <div className="relative rounded-xl overflow-hidden aspect-video bg-slate-900">
                  {packagesPageForm.heroVideoUrl ? (
                    packagesPageForm.heroVideoUrl.includes('youtube.com') || packagesPageForm.heroVideoUrl.includes('youtu.be') ? (
                      <iframe
                        src={`${packagesPageForm.heroVideoUrl.replace('watch?v=', 'embed/')}?autoplay=0`}
                        title="Video Preview"
                        className="w-full h-full border-0"
                      />
                    ) : (
                      <video src={packagesPageForm.heroVideoUrl} controls className="w-full h-full object-cover" />
                    )
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">No video URL set</div>
                  )}
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Video URL (YouTube / MP4)</label>
                  <input
                    type="url"
                    value={packagesPageForm.heroVideoUrl}
                    onChange={(e) => setPackagesPageForm({ ...packagesPageForm, heroVideoUrl: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono bg-white mb-2"
                  />
                  <input
                    type="file"
                    accept="video/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const url = await handleFileUpload(file);
                        if (url) setPackagesPageForm({ ...packagesPageForm, heroVideoUrl: url });
                      }
                    }}
                    className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Package Explainer Video URL</label>
                  <input
                    type="url"
                    value={packagesPageForm.videoUrl}
                    onChange={(e) => setPackagesPageForm({ ...packagesPageForm, videoUrl: e.target.value })}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono bg-white mb-2"
                  />
                  <input
                    type="file"
                    accept="video/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const url = await handleFileUpload(file);
                        if (url) setPackagesPageForm({ ...packagesPageForm, videoUrl: url });
                      }
                    }}
                    className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section C: Route Map Image Management */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl">
                  <Map className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">3. Route Map Image</h2>
                  <p className="text-xs text-slate-500 font-medium">Add, upload, preview, edit, or toggle the Route Map image on the public Packages page.</p>
                </div>
              </div>

              <label className="flex items-center space-x-2 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                <input
                  type="checkbox"
                  checked={packagesPageForm.mapActive}
                  onChange={(e) => setPackagesPageForm({ ...packagesPageForm, mapActive: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {packagesPageForm.mapActive ? 'Map Visible' : 'Map Hidden'}
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Map Preview</span>
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm aspect-video bg-slate-950 flex items-center justify-center p-2">
                  {packagesPageForm.mapImage ? (
                    <img src={packagesPageForm.mapImage} alt="Route Map Preview" className="w-full h-full object-contain rounded-xl" />
                  ) : (
                    <div className="text-center text-slate-500 text-xs">No map image set</div>
                  )}
                </div>
              </div>

              <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">Upload / Replace Map Image</span>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Direct Map Image URL</label>
                  <input
                    type="url"
                    value={packagesPageForm.mapImage}
                    onChange={(e) => setPackagesPageForm({ ...packagesPageForm, mapImage: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Or Upload Map Image File</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const url = await handleFileUpload(file);
                        if (url) setPackagesPageForm({ ...packagesPageForm, mapImage: url });
                      }
                    }}
                    className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Save Action */}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => savePackagesPageMutation.mutate(packagesPageForm)}
              disabled={savePackagesPageMutation.isPending || isBannerUploading}
              className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-2xl shadow-xl shadow-blue-600/30 transition-all flex items-center justify-center gap-2 uppercase tracking-wider disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {savePackagesPageMutation.isPending ? 'Saving...' : 'Save Packages Page Banner & Map'}
            </button>
          </div>
        </div>
      )}

      {/* ADD / EDIT PACKAGE SCROLLABLE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
              <h2 className="text-xl font-black tracking-tight">
                {isEditMode ? 'Edit Package' : 'Add Package'}
              </h2>
              <button onClick={closeModal} className="p-1.5 text-slate-400 hover:text-white rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Modal Form Scrollable Area */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
              
              {/* BASIC PACKAGE INFORMATION */}
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase text-indigo-600 tracking-wider">Basic Package Information</h3>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Package Title *</label>
                  <input required type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Ultimate Swiss Alps Ski Adventure" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Destination *</label>
                  <select required value={formData.destinationId} onChange={e => setFormData({ ...formData, destinationId: e.target.value })} className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="" disabled>Select Destination...</option>
                    {destinations.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Duration Days *</label>
                    <input required type="number" min={1} value={formData.durationDays} onChange={e => setFormData({ ...formData, durationDays: Number(e.target.value) })} className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Duration Nights *</label>
                    <input required type="number" min={0} value={formData.durationNights} onChange={e => setFormData({ ...formData, durationNights: Number(e.target.value) })} className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Base Price (₹) *</label>
                  <input required type="number" value={formData.basePrice} onChange={e => setFormData({ ...formData, basePrice: Number(e.target.value) })} className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Default Cover Image URL</label>
                  <input type="url" value={formData.image} onChange={e => setFormData({ ...formData, image: e.target.value })} className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="https://images.unsplash.com/..." />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Overview / Description</label>
                  <textarea rows={3} value={formData.overview} onChange={e => setFormData({ ...formData, overview: e.target.value })} className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Detailed package overview for travelers..."></textarea>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                  <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="PUBLISHED">PUBLISHED</option>
                    <option value="DRAFT">DRAFT</option>
                  </select>
                </div>
              </div>

              {/* EMBEDDED SECTION: PACKAGE MEDIA & HIGHLIGHTS */}
              <div className="border-t border-slate-200 pt-6 space-y-6">
                <div className="bg-slate-900 text-white p-4 rounded-2xl flex items-center space-x-3">
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                  <div>
                    <h3 className="font-black text-sm uppercase tracking-wider">PACKAGE MEDIA & HIGHLIGHTS</h3>
                    <p className="text-[11px] text-slate-400">Manage hero image, video player, and top highlights for the public package details page.</p>
                  </div>
                </div>

                {/* 1. HERO IMAGE */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
                      <ImageIcon className="w-4 h-4 mr-1.5 text-indigo-600" /> Hero Image
                    </label>
                    {formData.heroImage && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200 flex items-center">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Custom Hero Configured
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                    <div className="h-32 rounded-xl bg-slate-200 overflow-hidden relative border border-slate-300">
                      {formData.heroImage ? (
                        <>
                          <img src={formData.heroImage} alt="Hero Preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, heroImage: '' })}
                            className="absolute top-2 right-2 p-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 shadow-md"
                            title="Remove Hero Image"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-xs font-bold p-2 text-center">
                          No Custom Hero Image
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <input
                        type="url"
                        value={formData.heroImage || ''}
                        onChange={(e) => setFormData({ ...formData, heroImage: e.target.value })}
                        placeholder="Hero Image URL (https://...)"
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium bg-white"
                      />
                      <label className="block w-full">
                        <span className="sr-only">Choose File</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/jpg"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const url = await handleFileUpload(file);
                              if (url) setFormData({ ...formData, heroImage: url });
                            }
                          }}
                          className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
                        />
                      </label>
                    </div>
                  </div>
                </div>


                {/* 1.5. ROUTE MAP IMAGE */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
                      <Map className="w-4 h-4 mr-1.5 text-indigo-600" /> Route Map Image
                    </label>
                    {formData.mapImage && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200 flex items-center">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Route Map Configured
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                    <div className="h-32 rounded-xl bg-slate-200 overflow-hidden relative border border-slate-300">
                      {formData.mapImage ? (
                        <>
                          <img src={formData.mapImage} alt="Route Map Preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, mapImage: '' })}
                            className="absolute top-2 right-2 p-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 shadow-md"
                            title="Remove Route Map Image"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-xs font-bold p-2 text-center">
                          No Route Map Image
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <input
                        type="url"
                        value={formData.mapImage || ''}
                        onChange={(e) => setFormData({ ...formData, mapImage: e.target.value })}
                        placeholder="Route Map URL (https://...)"
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium bg-white"
                      />
                      <label className="block w-full">
                        <span className="sr-only">Choose File</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/jpg"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const url = await handleFileUpload(file);
                              if (url) setFormData({ ...formData, mapImage: url });
                            }
                          }}
                          className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* 2. PACKAGE HIGHLIGHTS VIDEO */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
                      <Video className="w-4 h-4 mr-1.5 text-indigo-600" /> Package Highlights Video
                    </label>
                    {formData.highlightsVideo && (
                      <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full border border-indigo-200 flex items-center">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Video Configured
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                    <div className="h-32 rounded-xl bg-slate-900 overflow-hidden relative border border-slate-300">
                      {formData.highlightsVideo ? (
                        <>
                          {formData.highlightsVideo.includes('youtube.com') || formData.highlightsVideo.includes('youtu.be') ? (
                            <iframe src={formData.highlightsVideo.replace('watch?v=', 'embed/')} title="Video Preview" className="w-full h-full border-0"></iframe>
                          ) : (
                            <video src={formData.highlightsVideo} controls className="w-full h-full object-cover"></video>
                          )}
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, highlightsVideo: '' })}
                            className="absolute top-2 right-2 p-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 shadow-md"
                            title="Remove Video"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-xs font-bold p-2 text-center">
                          No Video Configured
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <input
                        type="url"
                        value={formData.highlightsVideo || ''}
                        onChange={(e) => setFormData({ ...formData, highlightsVideo: e.target.value })}
                        placeholder="Video / YouTube URL (https://...)"
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium bg-white"
                      />
                      <label className="block w-full">
                        <span className="sr-only">Upload Video File</span>
                        <input
                          type="file"
                          accept="video/mp4,video/webm,video/ogg"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const url = await handleFileUpload(file);
                              if (url) setFormData({ ...formData, highlightsVideo: url });
                            }
                          }}
                          className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* 3. TOP HIGHLIGHTS */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
                      <Sparkles className="w-4 h-4 mr-1.5 text-indigo-600" /> Top Highlights
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setHighlightForm({ title: '', description: '', image: '', isActive: true });
                        setEditingHighlightIndex(null);
                        setIsHighlightFormOpen(true);
                      }}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Highlight</span>
                    </button>
                  </div>

                  {/* Inline Form inside modal */}
                  {isHighlightFormOpen && (
                    <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl space-y-3">
                      <h5 className="font-bold text-indigo-950 text-xs uppercase">
                        {editingHighlightIndex !== null ? 'Edit Highlight' : 'New Highlight'}
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Title *</label>
                          <input
                            type="text"
                            value={highlightForm.title}
                            onChange={(e) => setHighlightForm({ ...highlightForm, title: e.target.value })}
                            placeholder="e.g. Scenic Alpine Railway"
                            className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Image URL / Upload</label>
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              value={highlightForm.image}
                              onChange={(e) => setHighlightForm({ ...highlightForm, image: e.target.value })}
                              placeholder="Image URL"
                              className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <label className="px-2.5 py-1.5 bg-slate-200 text-slate-700 font-bold text-[11px] rounded-lg cursor-pointer shrink-0">
                              Upload
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const url = await handleFileUpload(file);
                                    if (url) setHighlightForm({ ...highlightForm, image: url });
                                  }
                                }}
                              />
                            </label>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Short Description</label>
                        <input
                          type="text"
                          value={highlightForm.description}
                          onChange={(e) => setHighlightForm({ ...highlightForm, description: e.target.value })}
                          placeholder="Brief highlight details..."
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={highlightForm.isActive}
                            onChange={(e) => setHighlightForm({ ...highlightForm, isActive: e.target.checked })}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                          />
                          <span className="text-xs font-bold text-slate-700">Active</span>
                        </label>

                        <div className="flex space-x-2">
                          <button
                            type="button"
                            onClick={() => {
                              setIsHighlightFormOpen(false);
                              setEditingHighlightIndex(null);
                            }}
                            className="px-3 py-1 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-lg"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveHighlightForm}
                            className="px-3.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-sm"
                          >
                            Save Highlight
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* List of top highlights */}
                  {topHighlights.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No custom top highlights added yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {topHighlights.map((h, idx) => (
                        <div key={h.id || idx} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden border border-slate-200 shrink-0">
                              {h.image ? <img src={h.image} alt={h.title} className="w-full h-full object-cover" /> : <Sparkles className="w-4 h-4 m-3 text-slate-400" />}
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="text-[10px] font-mono font-bold text-slate-400">#{idx + 1}</span>
                                <h5 className="font-bold text-xs text-slate-900">{h.title}</h5>
                                {!h.isActive && <span className="text-[9px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded">Inactive</span>}
                              </div>
                              {h.description && <p className="text-[11px] text-slate-500 line-clamp-1">{h.description}</p>}
                            </div>
                          </div>
                          <div className="flex items-center space-x-1">
                            <button type="button" onClick={() => moveHighlight(idx, 'up')} disabled={idx === 0} className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"><ArrowUp className="w-3.5 h-3.5" /></button>
                            <button type="button" onClick={() => moveHighlight(idx, 'down')} disabled={idx === topHighlights.length - 1} className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"><ArrowDown className="w-3.5 h-3.5" /></button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingHighlightIndex(idx);
                                setHighlightForm({
                                  title: h.title,
                                  description: h.description || '',
                                  image: h.image || '',
                                  isActive: h.isActive
                                });
                                setIsHighlightFormOpen(true);
                              }}
                              className="p-1 text-slate-400 hover:text-indigo-600"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button type="button" onClick={() => handleDeleteHighlight(idx)} className="p-1 text-slate-400 hover:text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* EMBEDDED SECTION: DAY-WISE ITINERARY */}
              <div className="border-t border-slate-200 pt-6 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <Map className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-black text-sm uppercase tracking-wider text-slate-900">Day-wise Detailed Itinerary</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setItineraryForm({ dayNumber: itineraryDays.length + 1, title: '', description: '', image: '' });
                      setEditingItineraryIndex(null);
                      setIsItineraryFormOpen(true);
                    }}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Itinerary Day</span>
                  </button>
                </div>

                {isItineraryFormOpen && (
                  <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl space-y-3">
                    <h5 className="font-bold text-indigo-950 text-xs uppercase">
                      {editingItineraryIndex !== null ? 'Edit Itinerary Day' : 'New Itinerary Day'}
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Day Number *</label>
                        <input
                          type="number"
                          min={1}
                          value={itineraryForm.dayNumber}
                          onChange={(e) => setItineraryForm({ ...itineraryForm, dayNumber: Number(e.target.value) })}
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Day Title *</label>
                        <input
                          type="text"
                          value={itineraryForm.title}
                          onChange={(e) => setItineraryForm({ ...itineraryForm, title: e.target.value })}
                          placeholder="e.g. Arrival in Kandy"
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Detailed Description</label>
                      <textarea
                        value={itineraryForm.description}
                        onChange={(e) => setItineraryForm({ ...itineraryForm, description: e.target.value })}
                        rows={2}
                        placeholder="Day's activities..."
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Day Image (URL / Upload)</label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={itineraryForm.image}
                          onChange={(e) => setItineraryForm({ ...itineraryForm, image: e.target.value })}
                          placeholder="Image URL"
                          className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <label className="px-2.5 py-1.5 bg-slate-200 text-slate-700 font-bold text-[11px] rounded-lg cursor-pointer shrink-0">
                          Upload
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const url = await handleFileUpload(file);
                                if (url) setItineraryForm({ ...itineraryForm, image: url });
                              }
                            }}
                          />
                        </label>
                      </div>
                    </div>
                    <div className="flex space-x-2 pt-2">
                      <button
                        type="button"
                        onClick={handleSaveItineraryForm}
                        className="px-3.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-sm"
                      >
                        Save Day
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsItineraryFormOpen(false);
                          setEditingItineraryIndex(null);
                        }}
                        className="px-3 py-1 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-lg"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {itineraryDays.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No itinerary days added yet.</p>
                ) : (
                  <div className="space-y-2">
                    {itineraryDays.map((day, idx) => (
                      <div key={idx} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden border border-slate-200 shrink-0">
                            {day.image ? <img src={day.image} alt={day.title} className="w-full h-full object-cover" /> : <ImageIcon className="w-5 h-5 m-3.5 text-slate-400" />}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-[10px] font-mono font-bold bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded">Day {day.dayNumber}</span>
                              <h5 className="font-bold text-xs text-slate-900">{day.title}</h5>
                            </div>
                            {day.description && <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{day.description}</p>}
                          </div>
                        </div>
                        <div className="flex items-center space-x-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingItineraryIndex(idx);
                              setItineraryForm({
                                dayNumber: day.dayNumber,
                                title: day.title,
                                description: day.description || '',
                                image: day.image || ''
                              });
                              setIsItineraryFormOpen(true);
                            }}
                            className="p-1 text-slate-400 hover:text-indigo-600"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" onClick={() => handleDeleteItineraryDay(idx)} className="p-1 text-slate-400 hover:text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* EMBEDDED SECTION: PRICING (DESTINATION / PACKAGE SPECIFIC) */}
              <div className="border-t border-slate-200 pt-6 space-y-6">
                <div className="bg-slate-900 text-white p-4 rounded-2xl flex items-center space-x-3">
                  <DollarSign className="w-5 h-5 text-amber-400" />
                  <div>
                    <h3 className="font-black text-sm uppercase tracking-wider">Pricing Configuration</h3>
                    <p className="text-[11px] text-slate-400">Set the Normal age-specific prices for this specific package/destination.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 space-y-4">
                  {pricingVars.map((tier, index) => (
                    <div key={tier.title || index} className="p-4 border border-slate-200 rounded-2xl bg-white shadow-sm space-y-3">
                      <h4 className="font-bold text-indigo-900 flex items-center border-b border-slate-100 pb-2">
                        <Star className="w-4 h-4 mr-2 text-amber-400 fill-amber-400" />
                        Normal Pricing (Group Tour)
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Adult (18+)</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                            <input
                              type="number"
                              value={tier.adultPrice || ''}
                              onChange={(e) => {
                                const newVars = [...pricingVars];
                                newVars[index].adultPrice = Number(e.target.value);
                                setPricingVars(newVars);
                              }}
                              className="w-full pl-7 pr-3 py-1.5 text-sm font-bold text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Child (6-17)</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                            <input
                              type="number"
                              value={tier.child6to17Price || ''}
                              onChange={(e) => {
                                const newVars = [...pricingVars];
                                newVars[index].child6to17Price = Number(e.target.value);
                                setPricingVars(newVars);
                              }}
                              className="w-full pl-7 pr-3 py-1.5 text-sm font-bold text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Child (2-5)</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                            <input
                              type="number"
                              value={tier.child2to5Price || ''}
                              onChange={(e) => {
                                const newVars = [...pricingVars];
                                newVars[index].child2to5Price = Number(e.target.value);
                                setPricingVars(newVars);
                              }}
                              className="w-full pl-7 pr-3 py-1.5 text-sm font-bold text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Infant (0-2)</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                            <input
                              type="number"
                              value={tier.infantPrice || ''}
                              onChange={(e) => {
                                const newVars = [...pricingVars];
                                newVars[index].infantPrice = Number(e.target.value);
                                setPricingVars(newVars);
                              }}
                              className="w-full pl-7 pr-3 py-1.5 text-sm font-bold text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Form Buttons */}
              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 sticky bottom-0 bg-white py-2 z-10">
                <button type="button" onClick={closeModal} className="px-5 py-2 text-slate-600 font-bold text-xs hover:bg-slate-100 rounded-xl">Cancel</button>
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="px-6 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700 disabled:opacity-50 shadow-md">
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : (isEditMode ? 'Update Package & Media' : 'Save Package & Media')}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      <AdminCalendarModal 
        isOpen={isCalendarModalOpen}
        onClose={() => {
          setIsCalendarModalOpen(false);
          setCalendarPackageId(null);
        }}
        packageId={calendarPackageId}
        packageTitle={calendarPackageTitle}
      />

      <AdminPackageMediaModal
        isOpen={isMediaModalOpen}
        onClose={() => {
          setIsMediaModalOpen(false);
          setMediaPackageId(null);
        }}
        packageId={mediaPackageId}
        packageSlug={mediaPackageSlug}
        packageTitle={mediaPackageTitle}
      />
    </div>
  );
}
