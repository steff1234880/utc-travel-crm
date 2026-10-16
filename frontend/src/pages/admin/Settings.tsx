import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import {
  User,
  Lock,
  Building,
  Save,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Globe,
  MapPin,
  Video,
  Image as ImageIcon,
  Trash2,
  Plus,
  Plane,
  Clock
} from 'lucide-react';
import GlobalLoadingAnimation from '../../components/common/GlobalLoadingAnimation';

interface DestinationItem {
  id: string;
  name: string;
  slug: string;
  tagline?: string | null;
  latitude: number;
  longitude: number;
  isActive: boolean;
}

export default function Settings() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'system' | 'website'>('profile');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Profile Form state
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    avatar: '',
    email: ''
  });

  // Password Form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // System Form state
  const [systemForm, setSystemForm] = useState({
    companyName: '',
    contactEmail: '',
    contactPhone: '',
    whatsappNumber: '',
    currency: 'INR',
    timezone: 'UTC',
    officeStartTime: '09:30',
    officeEndTime: '18:30',
    breakStartTime: '13:00',
    breakEndTime: '14:00',
    gracePeriodMins: 15,
    workingDays: '1,2,3,4,5',
    halfDayHours: 4.5,
    fullDayMinHours: 8.0,
    overtimeMinHours: 9.5
  });

  // Homepage Website Content Form state
  const [homepageForm, setHomepageForm] = useState({
    heroTitle: '',
    heroSubtitle: '',
    heroImage: '',
    heroActive: true,
    videoTitle: '',
    videoDescription: '',
    videoUrl: '',
    videoActive: true,
    mapTitle: '',
    mapSubtitle: '',
    mapActive: true,
    mapImage: '',
    loadingAnimationEnabled: true,
  });

  // Fetch Profile
  const { data: profileData } = useQuery({
    queryKey: ['settings-profile'],
    queryFn: async () => {
      const res = await api.get('/settings/profile');
      return res.data;
    }
  });

  // Fetch System Settings
  const { data: systemData } = useQuery({
    queryKey: ['settings-system'],
    queryFn: async () => {
      const res = await api.get('/settings/system');
      return res.data;
    }
  });

  // Fetch Homepage & Destinations Content
  const { data: homeContentData, refetch: refetchHomeContent } = useQuery({
    queryKey: ['homepage-content'],
    queryFn: async () => {
      const res = await api.get('/settings/homepage');
      return res.data;
    }
  });

  useEffect(() => {
    const user = profileData?.data || profileData?.user;
    if (user) {
      setProfileForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.emergencyContact || '',
        avatar: user.profilePhoto || '',
        email: user.email || ''
      });
    }
  }, [profileData]);

  useEffect(() => {
    if (systemData?.data) {
      setSystemForm({
        companyName: systemData.data.companyName || '',
        contactEmail: systemData.data.contactEmail || systemData.data.supportEmail || '',
        contactPhone: systemData.data.contactPhone || systemData.data.supportPhone || '',
        whatsappNumber: systemData.data.whatsappNumber || '',
        currency: systemData.data.currency || 'USD',
        timezone: systemData.data.timezone || 'UTC+03:00',
        officeStartTime: systemData.data.officeStartTime || '09:30',
        officeEndTime: systemData.data.officeEndTime || '18:30',
        breakStartTime: systemData.data.breakStartTime || '13:00',
        breakEndTime: systemData.data.breakEndTime || '14:00',
        gracePeriodMins: systemData.data.gracePeriodMins !== undefined ? systemData.data.gracePeriodMins : 15,
        workingDays: systemData.data.workingDays || '1,2,3,4,5',
        halfDayHours: systemData.data.halfDayHours !== undefined ? systemData.data.halfDayHours : 4.5,
        fullDayMinHours: systemData.data.fullDayMinHours !== undefined ? systemData.data.fullDayMinHours : 8.0,
        overtimeMinHours: systemData.data.overtimeMinHours !== undefined ? systemData.data.overtimeMinHours : 9.5
      });
    }
  }, [systemData]);

  useEffect(() => {
    if (homeContentData?.data?.content) {
      const c = homeContentData.data.content;
      const dyn = (c.dynamicSections as any) || {};
      const animEnabled = dyn.loadingAnimationEnabled !== undefined
        ? dyn.loadingAnimationEnabled
        : (c.loadingAnimationEnabled !== undefined ? c.loadingAnimationEnabled : true);

      setHomepageForm({
        heroTitle: c.heroTitle || '',
        heroSubtitle: c.heroSubtitle || '',
        heroImage: c.heroImage || '',
        heroActive: c.heroActive !== false,
        videoTitle: c.videoTitle || '',
        videoDescription: c.videoDescription || '',
        videoUrl: c.videoUrl || '',
        videoActive: c.videoActive !== false,
        mapTitle: c.mapTitle || '',
        mapSubtitle: c.mapSubtitle || '',
        mapActive: c.mapActive !== false,
        mapImage: c.mapImage || '',
        loadingAnimationEnabled: animEnabled
      });
    }
  }, [homeContentData]);

  // Handle Loading Animation Instant Toggle
  const handleToggleLoadingAnimation = (enabled: boolean) => {
    setHomepageForm(prev => ({ ...prev, loadingAnimationEnabled: enabled }));
    updateHomepageMutation.mutate({
      ...homepageForm,
      loadingAnimationEnabled: enabled
    });
  };

  // Update Profile Mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof profileForm) => {
      const payload = {
        firstName: data.firstName,
        lastName: data.lastName,
        emergencyContact: data.phone,
        profilePhoto: data.avatar,
      };
      const res = await api.patch('/settings/profile', payload);
      return res.data;
    },
    onSuccess: (data) => {
      setFeedback({ type: 'success', message: data.message || 'Profile updated successfully!' });
      queryClient.invalidateQueries({ queryKey: ['settings-profile'] });
    },
    onError: (err: any) => {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Failed to update profile' });
    }
  });

  // Change Password Mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: typeof passwordForm) => {
      const res = await api.patch('/settings/password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword
      });
      return res.data;
    },
    onSuccess: (data) => {
      setFeedback({ type: 'success', message: data.message || 'Password changed successfully!' });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    },
    onError: (err: any) => {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Failed to change password' });
    }
  });

  // Update System Settings Mutation
  const updateSystemMutation = useMutation({
    mutationFn: async (data: typeof systemForm) => {
      const res = await api.patch('/settings/system', {
        companyName: data.companyName,
        supportEmail: data.contactEmail,
        supportPhone: data.contactPhone,
        whatsappNumber: data.whatsappNumber,
        currency: data.currency,
        timezone: data.timezone,
        officeStartTime: data.officeStartTime,
        officeEndTime: data.officeEndTime,
        breakStartTime: data.breakStartTime,
        breakEndTime: data.breakEndTime,
        gracePeriodMins: Number(data.gracePeriodMins),
        workingDays: data.workingDays,
        halfDayHours: Number(data.halfDayHours),
        fullDayMinHours: Number(data.fullDayMinHours),
        overtimeMinHours: Number(data.overtimeMinHours)
      });
      return res.data;
    },
    onSuccess: (data) => {
      setFeedback({ type: 'success', message: data.message || 'System settings updated successfully!' });
      queryClient.invalidateQueries({ queryKey: ['settings-system'] });
    },
    onError: (err: any) => {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Failed to update system settings' });
    }
  });

  // Update Homepage Content Mutation
  const updateHomepageMutation = useMutation({
    mutationFn: async (data: typeof homepageForm) => {
      const res = await api.patch('/settings/homepage', data);
      return res.data;
    },
    onSuccess: (data) => {
      setFeedback({ type: 'success', message: data.message || 'Public homepage content updated successfully!' });
      queryClient.invalidateQueries({ queryKey: ['homepage-content'] });
    },
    onError: (err: any) => {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Failed to update homepage content' });
    }
  });

  // Update Destination Coordinates Mutation
  const updateDestMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<DestinationItem> }) => {
      const res = await api.patch(`/settings/destinations/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'Destination coordinates updated!' });
      queryClient.invalidateQueries({ queryKey: ['homepage-content'] });
    },
    onError: (err: any) => {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Failed to update destination' });
    }
  });

  const createDestMutation = useMutation({
    mutationFn: async (data: { name: string; latitude: number | null; longitude: number | null }) => {
      const res = await api.post('/settings/destinations', data);
      return res.data;
    },
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'Destination created successfully!' });
      queryClient.invalidateQueries({ queryKey: ['homepage-content'] });
    },
    onError: (err: any) => {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Failed to create destination' });
    }
  });

  const deleteDestMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/settings/destinations/${id}`);
      return res.data;
    },
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'Destination deleted successfully!' });
      queryClient.invalidateQueries({ queryKey: ['homepage-content'] });
    },
    onError: (err: any) => {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Failed to delete destination' });
    }
  });

  const [newDestForm, setNewDestForm] = useState({ name: '', latitude: '', longitude: '' });
  const [isAddingDest, setIsAddingDest] = useState(false);

  const handleCreateDestination = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDestForm.name.trim()) return setFeedback({ type: 'error', message: 'Destination Name is required' });
    
    let lat: number | null = null;
    let lng: number | null = null;
    if (newDestForm.latitude) {
      lat = parseFloat(newDestForm.latitude);
      if (isNaN(lat) || lat < -90 || lat > 90) return setFeedback({ type: 'error', message: 'Latitude must be between -90 and 90' });
    }
    if (newDestForm.longitude) {
      lng = parseFloat(newDestForm.longitude);
      if (isNaN(lng) || lng < -180 || lng > 180) return setFeedback({ type: 'error', message: 'Longitude must be between -180 and 180' });
    }

    createDestMutation.mutate({ name: newDestForm.name, latitude: lat, longitude: lng }, {
      onSuccess: () => {
        setNewDestForm({ name: '', latitude: '', longitude: '' });
        setIsAddingDest(false);
      }
    });
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
      alert(err.response?.data?.message || 'Upload failed');
      return null;
    }
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    updateProfileMutation.mutate(profileForm);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setFeedback({ type: 'error', message: 'New password and confirmation do not match' });
      return;
    }
    changePasswordMutation.mutate(passwordForm);
  };

  const handleSystemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    updateSystemMutation.mutate(systemForm);
  };

  const handleHomepageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    updateHomepageMutation.mutate(homepageForm);
  };

  const destinations: DestinationItem[] = homeContentData?.data?.destinations || [];

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">System & Account Settings</h1>
        <p className="text-slate-500 mt-1">Manage user profile, security preferences, and public website content.</p>
      </div>

      {feedback && (
        <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 text-sm font-semibold ${
          feedback.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {feedback.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-8 space-x-8 overflow-x-auto">
        <button
          onClick={() => { setActiveTab('profile'); setFeedback(null); }}
          className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'profile' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <User className="w-4 h-4" /> Profile Settings
        </button>
        <button
          onClick={() => { setActiveTab('website'); setFeedback(null); }}
          className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'website' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Sparkles className="w-4 h-4 text-indigo-600" /> Website Content Manage
        </button>
        <button
          onClick={() => { setActiveTab('password'); setFeedback(null); }}
          className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'password' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Lock className="w-4 h-4" /> Password & Security
        </button>
        <button
          onClick={() => { setActiveTab('system'); setFeedback(null); }}
          className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'system' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Building className="w-4 h-4" /> Company & System Settings
        </button>
      </div>

      {/* 1. Profile Tab */}
      {activeTab === 'profile' && (
        <form onSubmit={handleProfileSubmit} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-6">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-4">Personal Information</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">First Name</label>
              <input type="text" value={profileForm.firstName} onChange={e => setProfileForm({ ...profileForm, firstName: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. John" />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Last Name</label>
              <input type="text" value={profileForm.lastName} onChange={e => setProfileForm({ ...profileForm, lastName: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Doe" />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Email Address (Read-only)</label>
              <input type="email" disabled value={profileForm.email} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-500 cursor-not-allowed" />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Phone Number</label>
              <input type="text" value={profileForm.phone} onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="+1 234 567 890" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Avatar URL</label>
            <input type="url" value={profileForm.avatar} onChange={e => setProfileForm({ ...profileForm, avatar: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="https://images.unsplash.com/..." />
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button type="submit" disabled={updateProfileMutation.isPending} className="flex items-center px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50">
              <Save className="w-4 h-4 mr-2" />
              {updateProfileMutation.isPending ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      )}

      {/* 2. PUBLIC WEBSITE CONTENT MANAGER TAB */}
      {activeTab === 'website' && (
        <div className="space-y-8">
          
          <div className="flex gap-4 border-b border-slate-200">
            <button className="pb-3 text-sm font-bold border-b-2 border-indigo-600 text-indigo-600 px-2">
              Home Page Content
            </button>
            <Link to="/admin/website/footer" className="pb-3 text-sm font-medium border-b-2 border-transparent text-slate-500 hover:text-slate-700 transition-colors px-2">
              Footer Management
            </Link>
          </div>

          <form onSubmit={handleHomepageSubmit} className="space-y-8">
            
            {/* SECTION: GLOBAL TRAVEL LOADING ANIMATION */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                  <Plane className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-slate-900">Loading Animation</h2>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      homepageForm.loadingAnimationEnabled
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>
                      {homepageForm.loadingAnimationEnabled ? 'Active (ON)' : 'Disabled (OFF)'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Global travel-themed loading screen with "UTC" emblem, orbital airplane ✈️, and sailing cruise ship 🚢.
                  </p>
                </div>
              </div>

              {/* Clear ON/OFF Toggle */}
              <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-200 self-start sm:self-auto">
                <span className="text-xs font-bold text-slate-700">
                  {homepageForm.loadingAnimationEnabled ? 'Animation ON' : 'Animation OFF'}
                </span>
                <button
                  type="button"
                  onClick={() => handleToggleLoadingAnimation(!homepageForm.loadingAnimationEnabled)}
                  className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                    homepageForm.loadingAnimationEnabled ? 'bg-rose-600' : 'bg-slate-300'
                  }`}
                  aria-pressed={homepageForm.loadingAnimationEnabled}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-md ${
                      homepageForm.loadingAnimationEnabled ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Description & Live Interactive Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-800">Animation Highlights:</h3>
                <ul className="text-xs text-slate-600 space-y-2">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                    <span><strong>Central "UTC" Brand:</strong> Prominently displayed in metallic gold and rose gradient.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                    <span><strong>Aerodynamic Airplane ✈️:</strong> Smoothly orbits around the UTC typography.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
                    <span><strong>Ocean Cruise Ship 🚢:</strong> Glides across undulating waves beneath the brand name.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span><strong>Fail-Safe Protection:</strong> Built-in 7.5s safety timeout ensures the screen never freezes.</span>
                  </li>
                </ul>

                <p className="text-[11px] text-slate-400 italic pt-1">
                  Turning this OFF completely disables the custom loading animation on the public website.
                </p>
              </div>

              {/* Live Preview Display */}
              <div>
                <span className="text-xs font-bold text-slate-700 block mb-2">Live Animation Preview</span>
                <GlobalLoadingAnimation previewMode={true} />
              </div>
            </div>
          </div>

          {/* SECTION A: HERO BANNER MANAGEMENT */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">Public Hero Banner Manager</h2>
                  <p className="text-xs text-slate-500">Configure main background image, heading, and subtitle for homepage hero.</p>
                </div>
              </div>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={homepageForm.heroActive}
                  onChange={e => setHomepageForm({ ...homepageForm, heroActive: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span className="text-xs font-bold text-slate-700">Hero Section Active</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Hero Banner Heading</label>
                <input
                  type="text"
                  value={homepageForm.heroTitle}
                  onChange={e => setHomepageForm({ ...homepageForm, heroTitle: e.target.value })}
                  placeholder="e.g. Premium Travel Experiences Tailored For You"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Hero Banner Image URL / Upload</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={homepageForm.heroImage}
                    onChange={e => setHomepageForm({ ...homepageForm, heroImage: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                  />
                  <label className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer shrink-0 flex items-center">
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const url = await handleFileUpload(file);
                          if (url) setHomepageForm({ ...homepageForm, heroImage: url });
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Hero Supporting Text</label>
              <textarea
                rows={2}
                value={homepageForm.heroSubtitle}
                onChange={e => setHomepageForm({ ...homepageForm, heroSubtitle: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
              ></textarea>
            </div>
          </div>

          {/* SECTION B: TRAVEL VIDEO SECTION MANAGEMENT */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">Homepage Video Showcase Manager</h2>
                  <p className="text-xs text-slate-500">Configure travel video title, description, and YouTube embed or video URL.</p>
                </div>
              </div>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={homepageForm.videoActive}
                  onChange={e => setHomepageForm({ ...homepageForm, videoActive: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span className="text-xs font-bold text-slate-700">Video Section Active</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Video Section Title</label>
                <input
                  type="text"
                  value={homepageForm.videoTitle}
                  onChange={e => setHomepageForm({ ...homepageForm, videoTitle: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Video / YouTube URL / File</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={homepageForm.videoUrl}
                    onChange={e => setHomepageForm({ ...homepageForm, videoUrl: e.target.value })}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                  />
                  <label className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer shrink-0 flex items-center">
                    Upload
                    <input
                      type="file"
                      accept="video/mp4,video/webm,video/ogg"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const url = await handleFileUpload(file);
                          if (url) setHomepageForm({ ...homepageForm, videoUrl: url });
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Video Section Description</label>
              <textarea
                rows={2}
                value={homepageForm.videoDescription}
                onChange={e => setHomepageForm({ ...homepageForm, videoDescription: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
              ></textarea>
            </div>
          </div>

          {/* SECTION C: MAP & DESTINATION COORDINATES MANAGEMENT */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">Interactive Map & Destination Coordinates</h2>
                  <p className="text-xs text-slate-500">Configure map titles and destination latitude/longitude pins for public map rendering.</p>
                </div>
              </div>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={homepageForm.mapActive}
                  onChange={e => setHomepageForm({ ...homepageForm, mapActive: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span className="text-xs font-bold text-slate-700">Map Section Active</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Map Section Title</label>
                <input
                  type="text"
                  value={homepageForm.mapTitle}
                  onChange={e => setHomepageForm({ ...homepageForm, mapTitle: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Map Subtitle</label>
                <input
                  type="text"
                  value={homepageForm.mapSubtitle}
                  onChange={e => setHomepageForm({ ...homepageForm, mapSubtitle: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                />
              </div>
            </div>

            {/* MAP IMAGE MANAGEMENT BLOCK */}
            <div className="p-5 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-indigo-600" />
                    Journey Route Visual Map Image
                  </h3>
                  <p className="text-xs text-slate-500">
                    Upload a custom route map graphic for the public "YOUR JOURNEY ROUTE" section. (Supported: JPG, PNG, WEBP • Max 10MB)
                  </p>
                </div>
                {homepageForm.mapImage && (
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-full uppercase tracking-wider border border-emerald-200">
                    Active Map Image
                  </span>
                )}
              </div>

              {homepageForm.mapImage ? (
                <div className="space-y-3">
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm max-h-64 bg-slate-900 group flex items-center justify-center">
                    <img
                      src={homepageForm.mapImage}
                      alt="Journey Route Map Preview"
                      className="max-h-64 w-auto object-contain rounded-xl"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="flex items-center px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700 cursor-pointer transition-colors shadow-xs">
                      <span>Replace Map Image</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/jpg"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
                            if (!validTypes.includes(file.type.toLowerCase())) {
                              alert('Invalid file format. Please upload JPG, PNG, or WEBP.');
                              return;
                            }
                            if (file.size > 10 * 1024 * 1024) {
                              alert('File size exceeds 10MB limit.');
                              return;
                            }
                            const url = await handleFileUpload(file);
                            if (url) {
                              const updatedForm = { ...homepageForm, mapImage: url };
                              setHomepageForm(updatedForm);
                              updateHomepageMutation.mutate(updatedForm);
                            }
                          }
                        }}
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete the Journey Route Map Image? The section will revert to fallback.')) {
                          const updatedForm = { ...homepageForm, mapImage: '' };
                          setHomepageForm(updatedForm);
                          updateHomepageMutation.mutate(updatedForm);
                        }
                      }}
                      className="px-4 py-2 bg-rose-50 text-rose-700 font-bold text-xs rounded-xl hover:bg-rose-100 border border-rose-200 transition-colors"
                    >
                      Delete Map Image
                    </button>
                  </div>
                </div>
              ) : (
                <label className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-all">
                  <ImageIcon className="w-8 h-8 text-indigo-500 mb-2" />
                  <span className="font-bold text-xs text-slate-800">Click to Upload Map Image</span>
                  <span className="text-[11px] text-slate-400 mt-1">JPG, JPEG, PNG, WEBP up to 10MB</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/jpg"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
                        if (!validTypes.includes(file.type.toLowerCase())) {
                          alert('Invalid file format. Please upload JPG, PNG, or WEBP.');
                          return;
                        }
                        if (file.size > 10 * 1024 * 1024) {
                          alert('File size exceeds 10MB limit.');
                          return;
                        }
                        const url = await handleFileUpload(file);
                        if (url) {
                          const updatedForm = { ...homepageForm, mapImage: url };
                          setHomepageForm(updatedForm);
                          updateHomepageMutation.mutate(updatedForm);
                        }
                      }
                    }}
                  />
                </label>
              )}
            </div>

            {/* Destination Coordinates Table */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">Destination Coordinate Pins</h3>
                <button
                  type="button"
                  onClick={() => setIsAddingDest(!isAddingDest)}
                  className="flex items-center text-xs font-bold text-indigo-600 hover:text-indigo-800"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add New Destination
                </button>
              </div>

              {isAddingDest && (
                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl mb-4">
                  <h4 className="font-bold text-sm text-indigo-900 mb-3">Create New Destination</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-indigo-700 uppercase mb-1">Destination Name *</label>
                      <input type="text" required value={newDestForm.name} onChange={e => setNewDestForm({...newDestForm, name: e.target.value})} className="w-full px-3 py-1.5 text-xs bg-white border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-indigo-700 uppercase mb-1">Latitude</label>
                      <input type="number" step="0.0001" min="-90" max="90" value={newDestForm.latitude} onChange={e => setNewDestForm({...newDestForm, latitude: e.target.value})} className="w-full px-3 py-1.5 text-xs bg-white border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-indigo-700 uppercase mb-1">Longitude</label>
                      <input type="number" step="0.0001" min="-180" max="180" value={newDestForm.longitude} onChange={e => setNewDestForm({...newDestForm, longitude: e.target.value})} className="w-full px-3 py-1.5 text-xs bg-white border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                    <button type="button" onClick={() => setIsAddingDest(false)} className="px-4 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-lg">Cancel</button>
                    <button type="button" onClick={handleCreateDestination} disabled={createDestMutation.isPending} className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm">Save Destination</button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {destinations.map((d) => (
                  <div key={d.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center space-x-3 w-full md:w-1/3">
                      <MapPin className="w-5 h-5 text-indigo-600 shrink-0" />
                      <div className="w-full">
                        <input 
                          type="text" 
                          defaultValue={d.name}
                          onBlur={(e) => {
                            if (e.target.value.trim() && e.target.value !== d.name) {
                              updateDestMutation.mutate({ id: d.id, data: { name: e.target.value.trim() } });
                            } else if (!e.target.value.trim()) {
                              e.target.value = d.name;
                            }
                          }}
                          className="font-bold text-sm text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none w-full pb-0.5"
                          title="Click to edit name"
                        />
                        <p className="text-[10px] text-slate-500">{d.slug}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Latitude</span>
                        <input
                          type="number"
                          step="0.0001"
                          min="-90"
                          max="90"
                          defaultValue={d.latitude ?? ''}
                          onBlur={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val)) {
                              if (val >= -90 && val <= 90) {
                                updateDestMutation.mutate({ id: d.id, data: { latitude: val } });
                              } else {
                                setFeedback({ type: 'error', message: 'Latitude must be between -90 and 90' });
                                e.target.value = d.latitude?.toString() || '';
                              }
                            }
                          }}
                          className="w-28 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-mono font-bold"
                        />
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Longitude</span>
                        <input
                          type="number"
                          step="0.0001"
                          min="-180"
                          max="180"
                          defaultValue={d.longitude ?? ''}
                          onBlur={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val)) {
                              if (val >= -180 && val <= 180) {
                                updateDestMutation.mutate({ id: d.id, data: { longitude: val } });
                              } else {
                                setFeedback({ type: 'error', message: 'Longitude must be between -180 and 180' });
                                e.target.value = d.longitude?.toString() || '';
                              }
                            }
                          }}
                          className="w-28 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-mono font-bold"
                        />
                      </div>
                      
                      <button 
                        type="button" 
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete ${d.name}?`)) {
                            deleteDestMutation.mutate(d.id);
                          }
                        }}
                        className="p-1.5 text-rose-500 hover:bg-rose-100 rounded-lg transition-colors ml-2"
                        title="Delete Destination"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={updateHomepageMutation.isPending}
                className="flex items-center px-6 py-2.5 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700 transition-colors shadow-md disabled:opacity-50 uppercase tracking-wider"
              >
                <Save className="w-4 h-4 mr-2" />
                {updateHomepageMutation.isPending ? 'Saving Content...' : 'Save Public Website Content'}
              </button>
            </div>
          </div>

        </form>
        </div>
      )}

      {/* 3. Password Tab */}
      {activeTab === 'password' && (
        <form onSubmit={handlePasswordSubmit} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-6 max-w-xl">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-4">Change Password</h2>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Current Password</label>
            <input required type="password" value={passwordForm.currentPassword} onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">New Password</label>
            <input required type="password" value={passwordForm.newPassword} onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Confirm New Password</label>
            <input required type="password" value={passwordForm.confirmPassword} onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button type="submit" disabled={changePasswordMutation.isPending} className="flex items-center px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50">
              <Save className="w-4 h-4 mr-2" />
              {changePasswordMutation.isPending ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      )}

      {/* 4. System Settings Tab */}
      {activeTab === 'system' && (
        <form onSubmit={handleSystemSubmit} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-6">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-4">Company & Defaults</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Company Name</label>
              <input type="text" value={systemForm.companyName} onChange={e => setSystemForm({ ...systemForm, companyName: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Contact Email</label>
              <input type="email" value={systemForm.contactEmail} onChange={e => setSystemForm({ ...systemForm, contactEmail: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Contact Phone</label>
              <input type="text" value={systemForm.contactPhone} onChange={e => setSystemForm({ ...systemForm, contactPhone: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">WhatsApp Number</label>
              <input type="text" value={systemForm.whatsappNumber} onChange={e => setSystemForm({ ...systemForm, whatsappNumber: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="+919876543210" />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Default Currency</label>
              <select value={systemForm.currency} onChange={e => setSystemForm({ ...systemForm, currency: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">System Timezone</label>
              <input type="text" value={systemForm.timezone} onChange={e => setSystemForm({ ...systemForm, timezone: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="UTC+03:00" />
            </div>
          </div>

          {/* Office Timings & Attendance Rules Section */}
          <div className="pt-6 border-t border-slate-100 space-y-6">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#8b182b]" />
              <h3 className="text-lg font-bold text-slate-900">Office Timings & Attendance Rules</h3>
            </div>
            <p className="text-xs text-slate-500 -mt-4">
              Configure shift hours, break times, late grace period, and attendance rule thresholds for all employees.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Office Start Time</label>
                <input
                  type="time"
                  required
                  value={systemForm.officeStartTime}
                  onChange={e => setSystemForm({ ...systemForm, officeStartTime: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">Expected arrival time</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Office End Time</label>
                <input
                  type="time"
                  required
                  value={systemForm.officeEndTime}
                  onChange={e => setSystemForm({ ...systemForm, officeEndTime: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">Shift finish time</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Break Start Time</label>
                <input
                  type="time"
                  value={systemForm.breakStartTime}
                  onChange={e => setSystemForm({ ...systemForm, breakStartTime: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">e.g. Lunch break start</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Break End Time</label>
                <input
                  type="time"
                  value={systemForm.breakEndTime}
                  onChange={e => setSystemForm({ ...systemForm, breakEndTime: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">e.g. Lunch break end</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Grace Period (Mins)</label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={systemForm.gracePeriodMins}
                  onChange={e => setSystemForm({ ...systemForm, gracePeriodMins: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">Allowed late buffer (mins)</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Half-Day Threshold (h)</label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="12"
                  value={systemForm.halfDayHours}
                  onChange={e => setSystemForm({ ...systemForm, halfDayHours: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">Minimum hours for half day</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Full Day Min (h)</label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="24"
                  value={systemForm.fullDayMinHours}
                  onChange={e => setSystemForm({ ...systemForm, fullDayMinHours: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">Minimum hours for present</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Overtime Threshold (h)</label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="24"
                  value={systemForm.overtimeMinHours}
                  onChange={e => setSystemForm({ ...systemForm, overtimeMinHours: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">Hours before overtime applies</span>
              </div>
            </div>

            {/* Working Days Checkboxes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Configured Working Days</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { day: 1, label: 'Mon' },
                  { day: 2, label: 'Tue' },
                  { day: 3, label: 'Wed' },
                  { day: 4, label: 'Thu' },
                  { day: 5, label: 'Fri' },
                  { day: 6, label: 'Sat' },
                  { day: 0, label: 'Sun' }
                ].map(({ day, label }) => {
                  const daysArr = (systemForm.workingDays || '').split(',').map(s => s.trim());
                  const isChecked = daysArr.includes(String(day));
                  return (
                    <button
                      type="button"
                      key={day}
                      onClick={() => {
                        let newDays: string[];
                        if (isChecked) {
                          newDays = daysArr.filter(d => d !== String(day));
                        } else {
                          newDays = [...daysArr, String(day)].sort((a, b) => Number(a) - Number(b));
                        }
                        setSystemForm({ ...systemForm, workingDays: newDays.join(',') });
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                        isChecked 
                          ? 'bg-[#8b182b] text-white border-[#8b182b] shadow-xs' 
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <span className="text-[11px] text-slate-400 mt-1.5 block">
                Selected days count towards official working days and absence calculations.
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button type="submit" disabled={updateSystemMutation.isPending} className="flex items-center px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50">
              <Save className="w-4 h-4 mr-2" />
              {updateSystemMutation.isPending ? 'Saving...' : 'Save System Settings'}
            </button>
          </div>
        </form>
      )}

    </div>
  );
}
