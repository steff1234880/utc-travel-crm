import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import {
  X,
  Upload,
  Image as ImageIcon,
  Video,
  Sparkles,
  Trash2,
  Edit2,
  Plus,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface TopHighlightItem {
  id: string;
  title: string;
  description?: string | null;
  image?: string | null;
  displayOrder: number;
  isActive: boolean;
}

interface AdminPackageMediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  packageId: string | null;
  packageSlug?: string;
  packageTitle: string;
}

export default function AdminPackageMediaModal({
  isOpen,
  onClose,
  packageId,
  packageSlug,
  packageTitle
}: AdminPackageMediaModalProps) {
  const queryClient = useQueryClient();

  const [heroInput, setHeroInput] = useState('');
  const [videoInput, setVideoInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Top Highlight inline form state
  const [editingHighlightId, setEditingHighlightId] = useState<string | null>(null);
  const [highlightForm, setHighlightForm] = useState({
    title: '',
    description: '',
    image: '',
    isActive: true
  });
  const [isHighlightFormOpen, setIsHighlightFormOpen] = useState(false);

  // Fetch single package details
  const { data: pkgData, refetch: refetchPkg } = useQuery({
    queryKey: ['admin-package-media', packageId],
    queryFn: async () => {
      if (!packageId) return null;
      // Fetch full package by ID or slug
      const res = await api.get(`/packages/${packageSlug || packageId}`);
      return res.data?.data || res.data;
    },
    enabled: Boolean(isOpen && packageId)
  });

  // Fetch top highlights
  const { data: highlightsData, refetch: refetchHighlights } = useQuery({
    queryKey: ['admin-top-highlights', packageId],
    queryFn: async () => {
      if (!packageId) return [];
      const res = await api.get(`/packages/${packageId}/top-highlights`);
      return res.data?.data || [];
    },
    enabled: Boolean(isOpen && packageId)
  });

  const highlights: TopHighlightItem[] = highlightsData || [];
  const heroImage = pkgData?.heroImage || pkgData?.images?.[0]?.url || '';
  const highlightsVideo = pkgData?.highlightsVideo || pkgData?.videos?.[0]?.url || '';
  const mapImage = pkgData?.mapImage || '';

  const invalidateAll = () => {
    refetchPkg();
    refetchHighlights();
    queryClient.invalidateQueries({ queryKey: ['admin-packages'] });
    if (packageSlug) {
      queryClient.invalidateQueries({ queryKey: ['package-detail', packageSlug] });
    }
  };

  // Upload file helper
  const handleFileUpload = async (file: File) => {
    // File validation
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      alert('Invalid file format. Please upload JPG, PNG, or WEBP.');
      return null;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds 10MB limit.');
      return null;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/packages/upload-media', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setIsUploading(false);
      return res.data?.url;
    } catch (err: any) {
      setIsUploading(false);
      alert(err.response?.data?.message || 'Upload failed');
      return null;
    }
  };

  // Save Hero Image
  const saveHeroMutation = useMutation({
    mutationFn: async (url: string) => {
      const res = await api.patch(`/packages/${packageId}`, { heroImage: url });
      return res.data;
    },
    onSuccess: () => {
      invalidateAll();
      setHeroInput('');
    }
  });

  // Delete Hero Image
  const deleteHeroMutation = useMutation({
    mutationFn: async () => {
      const res = await api.delete(`/packages/${packageId}/hero`);
      return res.data;
    },
    onSuccess: () => {
      invalidateAll();
    }
  });

  // Save Map Image
  const saveMapMutation = useMutation({
    mutationFn: async (url: string) => {
      const res = await api.patch(`/packages/${packageId}`, { mapImage: url });
      return res.data;
    },
    onSuccess: () => {
      invalidateAll();
    }
  });

  // Delete Map Image
  const deleteMapMutation = useMutation({
    mutationFn: async () => {
      const res = await api.patch(`/packages/${packageId}`, { mapImage: null });
      return res.data;
    },
    onSuccess: () => {
      invalidateAll();
    }
  });

  // Save Package Video
  const saveVideoMutation = useMutation({
    mutationFn: async (url: string) => {
      const res = await api.patch(`/packages/${packageId}`, { highlightsVideo: url });
      return res.data;
    },
    onSuccess: () => {
      invalidateAll();
      setVideoInput('');
    }
  });

  // Delete Package Video
  const deleteVideoMutation = useMutation({
    mutationFn: async () => {
      const res = await api.delete(`/packages/${packageId}/video`);
      return res.data;
    },
    onSuccess: () => {
      invalidateAll();
    }
  });

  // Highlight CRUD mutations
  const createHighlightMutation = useMutation({
    mutationFn: async (data: typeof highlightForm) => {
      const res = await api.post(`/packages/${packageId}/top-highlights`, data);
      return res.data;
    },
    onSuccess: () => {
      invalidateAll();
      resetHighlightForm();
    }
  });

  const updateHighlightMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TopHighlightItem> }) => {
      const res = await api.patch(`/packages/${packageId}/top-highlights/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      invalidateAll();
      resetHighlightForm();
    }
  });

  const deleteHighlightMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/packages/${packageId}/top-highlights/${id}`);
      return res.data;
    },
    onSuccess: () => {
      invalidateAll();
    }
  });

  const reorderHighlightsMutation = useMutation({
    mutationFn: async (items: Array<{ id: string; displayOrder: number }>) => {
      const res = await api.patch(`/packages/${packageId}/top-highlights/reorder`, { items });
      return res.data;
    },
    onSuccess: () => {
      invalidateAll();
    }
  });

  const resetHighlightForm = () => {
    setEditingHighlightId(null);
    setHighlightForm({ title: '', description: '', image: '', isActive: true });
    setIsHighlightFormOpen(false);
  };

  const handleEditHighlightClick = (h: TopHighlightItem) => {
    setEditingHighlightId(h.id);
    setHighlightForm({
      title: h.title,
      description: h.description || '',
      image: h.image || '',
      isActive: h.isActive
    });
    setIsHighlightFormOpen(true);
  };

  const moveHighlight = (index: number, direction: 'up' | 'down') => {
    const newItems = [...highlights];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newItems.length) return;

    const temp = newItems[index];
    newItems[index] = newItems[targetIdx];
    newItems[targetIdx] = temp;

    const payload = newItems.map((item, idx) => ({
      id: item.id,
      displayOrder: idx + 1
    }));

    reorderHighlightsMutation.mutate(payload);
  };

  if (!isOpen || !packageId) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-slate-100">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-600 rounded-2xl">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">PACKAGE MEDIA & HIGHLIGHTS</h2>
              <p className="text-xs text-slate-400 font-medium">{packageTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scroll Content */}
        <div className="p-6 overflow-y-auto space-y-8 divide-y divide-slate-100 flex-1">
          
          {/* SECTION 1: HERO IMAGE MANAGEMENT */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ImageIcon className="w-5 h-5 text-indigo-600" />
                <h3 className="font-black text-slate-900 text-base">1. Hero Image Management</h3>
              </div>
              {heroImage && (
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Custom Hero Active
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* Preview Box */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 relative group aspect-video shadow-inner">
                {heroImage ? (
                  <>
                    <img src={heroImage} alt="Hero Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-3">
                      <button
                        onClick={() => deleteHeroMutation.mutate()}
                        className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-lg flex items-center space-x-1.5"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete Hero</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center space-y-2">
                    <ImageIcon className="w-10 h-10 text-slate-300" />
                    <p className="text-xs font-bold">No Custom Hero Image Uploaded</p>
                    <p className="text-[11px] text-slate-400">Public page will automatically use package gallery cover.</p>
                  </div>
                )}
              </div>

              {/* Upload / URL Input */}
              <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200/80">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Upload File (JPG, PNG, WEBP)</label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/jpg"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const url = await handleFileUpload(file);
                        if (url) saveHeroMutation.mutate(url);
                      }
                    }}
                    className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
                  />
                </div>

                <div className="relative flex items-center py-1">
                  <div className="flex-grow border-t border-slate-200"></div>
                  <span className="flex-shrink mx-2 text-[10px] text-slate-400 font-bold uppercase">Or Direct URL</span>
                  <div className="flex-grow border-t border-slate-200"></div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="url"
                    value={heroInput}
                    onChange={(e) => setHeroInput(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="flex-1 px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                  <button
                    onClick={() => {
                      if (heroInput.trim()) saveHeroMutation.mutate(heroInput.trim());
                    }}
                    disabled={!heroInput.trim()}
                    className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 disabled:opacity-50"
                  >
                    Save URL
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 1B: JOURNEY ROUTE MAP IMAGE MANAGEMENT */}
          <div className="space-y-4 pt-6 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ImageIcon className="w-5 h-5 text-indigo-600" />
                <h3 className="font-black text-slate-900 text-base">Journey Route Map Image</h3>
              </div>
              {mapImage && (
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Active Route Map
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* Map Image Preview Box */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-900 relative group max-h-60 shadow-inner flex items-center justify-center p-2">
                {mapImage ? (
                  <>
                    <img src={mapImage} alt="Route Map Preview" className="max-h-56 w-auto object-contain rounded-xl" />
                    <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-3">
                      <button
                        onClick={() => deleteMapMutation.mutate()}
                        className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-lg flex items-center space-x-1.5"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete Map Image</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-40 flex flex-col items-center justify-center text-slate-400 p-6 text-center space-y-2">
                    <ImageIcon className="w-8 h-8 text-slate-500" />
                    <p className="text-xs font-bold text-slate-300">No Custom Route Map Uploaded</p>
                    <p className="text-[11px] text-slate-400">Section will fall back to default map visual.</p>
                  </div>
                )}
              </div>

              {/* Upload Controls */}
              <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200/80">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Upload Map Image (JPG, PNG, WEBP • Max 10MB)</label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/jpg"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const url = await handleFileUpload(file);
                        if (url) saveMapMutation.mutate(url);
                      }
                    }}
                    className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: PACKAGE HIGHLIGHTS VIDEO */}
          <div className="space-y-4 pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Video className="w-5 h-5 text-indigo-600" />
                <h3 className="font-black text-slate-900 text-base">2. Package Highlights Video</h3>
              </div>
              {highlightsVideo && (
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200 flex items-center">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Video Active
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* Video Preview Box */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-900 relative group aspect-video shadow-inner">
                {highlightsVideo ? (
                  <>
                    {highlightsVideo.includes('youtube.com') || highlightsVideo.includes('youtu.be') ? (
                      <iframe
                        src={highlightsVideo.replace('watch?v=', 'embed/')}
                        title="Highlight Video"
                        className="w-full h-full border-0"
                        allowFullScreen
                      ></iframe>
                    ) : (
                      <video src={highlightsVideo} controls className="w-full h-full object-cover"></video>
                    )}
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => deleteVideoMutation.mutate()}
                        className="p-2 bg-rose-600 text-white font-bold text-xs rounded-xl shadow-lg hover:bg-rose-700"
                        title="Delete Video"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center space-y-2">
                    <Video className="w-10 h-10 text-slate-600" />
                    <p className="text-xs font-bold text-slate-300">No Video Configured</p>
                    <p className="text-[11px] text-slate-500">Public page displays clean visual highlights card.</p>
                  </div>
                )}
              </div>

              {/* Upload / URL Input */}
              <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200/80">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Upload Video File (MP4, WEBM, max 50MB)</label>
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/ogg"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const url = await handleFileUpload(file);
                        if (url) saveVideoMutation.mutate(url);
                      }
                    }}
                    className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
                  />
                </div>

                <div className="relative flex items-center py-1">
                  <div className="flex-grow border-t border-slate-200"></div>
                  <span className="flex-shrink mx-2 text-[10px] text-slate-400 font-bold uppercase">Or Video / YouTube URL</span>
                  <div className="flex-grow border-t border-slate-200"></div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="url"
                    value={videoInput}
                    onChange={(e) => setVideoInput(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="flex-1 px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                  <button
                    onClick={() => {
                      if (videoInput.trim()) saveVideoMutation.mutate(videoInput.trim());
                    }}
                    disabled={!videoInput.trim()}
                    className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 disabled:opacity-50"
                  >
                    Save URL
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: TOP HIGHLIGHTS MANAGEMENT */}
          <div className="space-y-4 pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <h3 className="font-black text-slate-900 text-base">3. Top Highlights Manager</h3>
              </div>
              <button
                onClick={() => {
                  resetHighlightForm();
                  setIsHighlightFormOpen(true);
                }}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add Top Highlight</span>
              </button>
            </div>

            {/* Inline Form */}
            {isHighlightFormOpen && (
              <div className="bg-indigo-50/70 border border-indigo-200 p-5 rounded-2xl space-y-4">
                <h4 className="font-black text-indigo-950 text-xs uppercase tracking-wider">
                  {editingHighlightId ? 'Edit Top Highlight' : 'New Top Highlight'}
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Highlight Title *</label>
                    <input
                      type="text"
                      value={highlightForm.title}
                      onChange={(e) => setHighlightForm({ ...highlightForm, title: e.target.value })}
                      placeholder="e.g. Scenic Mountain Railway"
                      className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Image URL / Upload</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={highlightForm.image}
                        onChange={(e) => setHighlightForm({ ...highlightForm, image: e.target.value })}
                        placeholder="https://images.unsplash.com/..."
                        className="flex-1 px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                      />
                      <label className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl cursor-pointer shrink-0">
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Short Description</label>
                  <textarea
                    rows={2}
                    value={highlightForm.description}
                    onChange={(e) => setHighlightForm({ ...highlightForm, description: e.target.value })}
                    placeholder="Brief highlight details for public card..."
                    className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  ></textarea>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={highlightForm.isActive}
                      onChange={(e) => setHighlightForm({ ...highlightForm, isActive: e.target.checked })}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span className="text-xs font-bold text-slate-700">Active / Published</span>
                  </label>

                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={resetHighlightForm}
                      className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!highlightForm.title.trim()) return alert('Title is required');
                        if (editingHighlightId) {
                          updateHighlightMutation.mutate({ id: editingHighlightId, data: highlightForm });
                        } else {
                          createHighlightMutation.mutate(highlightForm);
                        }
                      }}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm"
                    >
                      {editingHighlightId ? 'Update Highlight' : 'Save Highlight'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* List of Highlights */}
            {highlights.length === 0 ? (
              <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl text-center space-y-2">
                <Sparkles className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-600">No Custom Top Highlights Yet</p>
                <p className="text-[11px] text-slate-400">Add highlights to showcase top package attractions on the public website.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {highlights.map((h, idx) => (
                  <div
                    key={h.id}
                    className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between shadow-sm hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-center space-x-4">
                      {/* Drag / Order controls */}
                      <div className="flex flex-col space-y-1">
                        <button
                          disabled={idx === 0}
                          onClick={() => moveHighlight(idx, 'up')}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          disabled={idx === highlights.length - 1}
                          onClick={() => moveHighlight(idx, 'down')}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Image Thumbnail */}
                      <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                        {h.image ? (
                          <img src={h.image} alt={h.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <ImageIcon className="w-5 h-5" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-[10px] font-bold text-slate-400">#{idx + 1}</span>
                          <h4 className="font-bold text-slate-900 text-sm">{h.title}</h4>
                          {!h.isActive && (
                            <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full">
                              Inactive
                            </span>
                          )}
                        </div>
                        {h.description && (
                          <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{h.description}</p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEditHighlightClick(h)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete highlight "${h.title}"?`)) {
                            deleteHighlightMutation.mutate(h.id);
                          }
                        }}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 shadow-md"
          >
            Done & Close
          </button>
        </div>

      </div>
    </div>
  );
}
