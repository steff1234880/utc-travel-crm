import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../../services/api';
import { Save, CheckCircle2, LayoutTemplate, Plus, Trash2, GripVertical } from 'lucide-react';
import GlobalLoadingAnimation from '../../../components/common/GlobalLoadingAnimation';

export default function FooterManagement() {
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [form, setForm] = useState({
    companyBio: '',
    logoText: '',
    logoSubtext: '',
    address: '',
    supportPhone: '',
    whatsappNumber: '',
    supportEmail: '',
    facebookUrl: '',
    instagramUrl: '',
    youtubeUrl: '',
    twitterUrl: '',
    linkedinUrl: '',
    copyrightText: '',
    navColumns: {
      packages: [
        { label: 'Family Packages', url: '/packages' },
        { label: 'Honeymoon Packages', url: '/packages' },
        { label: 'Luxury Packages', url: '/packages' },
        { label: 'Group Tours', url: '/packages' },
        { label: 'View All Packages', url: '/packages' },
      ],
      support: [
        { label: 'About Universal Travel Company', url: '/about' },
        { label: 'Why Choose Us', url: '/about' },
        { label: 'Travel Blog', url: '/blog' },
        { label: 'Contact Us', url: '/contact' },
      ]
    }
  });

  const { data: footerData, isLoading } = useQuery({
    queryKey: ['footer-management'],
    queryFn: async () => {
      const res = await api.get('/settings/footer').catch(() => null);
      return res?.data?.data || null;
    }
  });

  useEffect(() => {
    if (footerData) {
      setForm({
        companyBio: footerData.companyBio || '',
        logoText: footerData.logoText || '',
        logoSubtext: footerData.logoSubtext || '',
        address: footerData.address || '',
        supportPhone: footerData.supportPhone || '',
        whatsappNumber: footerData.whatsappNumber || '',
        supportEmail: footerData.supportEmail || '',
        facebookUrl: footerData.facebookUrl || '',
        instagramUrl: footerData.instagramUrl || '',
        youtubeUrl: footerData.youtubeUrl || '',
        twitterUrl: footerData.twitterUrl || '',
        linkedinUrl: footerData.linkedinUrl || '',
        copyrightText: footerData.copyrightText || '',
        navColumns: footerData.navColumns || {
          packages: [
            { label: 'Family Packages', url: '/packages' },
            { label: 'Honeymoon Packages', url: '/packages' },
            { label: 'Luxury Packages', url: '/packages' },
            { label: 'Group Tours', url: '/packages' },
            { label: 'View All Packages', url: '/packages' },
          ],
          support: [
            { label: 'About Universal Travel Company', url: '/about' },
            { label: 'Why Choose Us', url: '/about' },
            { label: 'Travel Blog', url: '/blog' },
            { label: 'Contact Us', url: '/contact' },
          ]
        }
      });
    }
  }, [footerData]);

  const updateMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await api.patch('/settings/footer', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['footer-management'] });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      setIsSaving(false);
    },
    onError: (error) => {
      console.error('Failed to update footer', error);
      setIsSaving(false);
    }
  });

  const handleSave = () => {
    setIsSaving(true);
    updateMutation.mutate(form);
  };

  const handleLinkChange = (section: 'packages' | 'support', index: number, field: 'label' | 'url', value: string) => {
    const updated = [...form.navColumns[section]];
    updated[index] = { ...updated[index], [field]: value };
    setForm(prev => ({ ...prev, navColumns: { ...prev.navColumns, [section]: updated } }));
  };

  const handleAddLink = (section: 'packages' | 'support') => {
    setForm(prev => ({ 
      ...prev, 
      navColumns: { 
        ...prev.navColumns, 
        [section]: [...prev.navColumns[section], { label: '', url: '' }] 
      } 
    }));
  };

  const handleRemoveLink = (section: 'packages' | 'support', index: number) => {
    const updated = [...form.navColumns[section]];
    updated.splice(index, 1);
    setForm(prev => ({ ...prev, navColumns: { ...prev.navColumns, [section]: updated } }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  if (isLoading) return <GlobalLoadingAnimation />;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center">
            <LayoutTemplate className="w-6 h-6 mr-2 text-blue-600" />
            Website Content Manage
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage public website footer content.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center disabled:opacity-50"
        >
          {isSaving ? (
            <span className="flex items-center"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div> Saving...</span>
          ) : (
            <span className="flex items-center"><Save className="w-4 h-4 mr-2" /> Save Changes</span>
          )}
        </button>
      </div>

      <div className="flex gap-4 border-b border-slate-200">
        <Link to="/admin/settings" className="pb-3 text-sm font-medium border-b-2 border-transparent text-slate-500 hover:text-slate-700 transition-colors px-2">
          Home Page Content
        </Link>
        <button className="pb-3 text-sm font-bold border-b-2 border-indigo-600 text-indigo-600 px-2">
          Footer Management
        </button>
      </div>

      {saveSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center shadow-sm">
          <CheckCircle2 className="w-5 h-5 mr-2 shrink-0" />
          <span className="text-sm font-medium">Footer content updated successfully. Changes are now live.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Brand Info */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">Brand Identity</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Logo Text</label>
              <input
                type="text"
                name="logoText"
                value={form.logoText}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Logo Subtext</label>
              <input
                type="text"
                name="logoSubtext"
                value={form.logoSubtext}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Company Description / Bio</label>
            <textarea
              name="companyBio"
              value={form.companyBio}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            />
          </div>
          
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Copyright Text</label>
            <input
              type="text"
              name="copyrightText"
              value={form.copyrightText}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">Contact Information</h2>
          
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Address</label>
            <textarea
              name="address"
              value={form.address}
              onChange={handleInputChange}
              rows={2}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Support Phone</label>
              <input
                type="text"
                name="supportPhone"
                value={form.supportPhone}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">WhatsApp Number</label>
              <input
                type="text"
                name="whatsappNumber"
                value={form.whatsappNumber}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Support Email</label>
            <input
              type="email"
              name="supportEmail"
              value={form.supportEmail}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white"
            />
          </div>
        </div>

        {/* Social Links */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5 lg:col-span-2">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">Social Media Links</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Facebook URL</label>
              <input
                type="url"
                name="facebookUrl"
                value={form.facebookUrl}
                onChange={handleInputChange}
                placeholder="https://facebook.com/..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Instagram URL</label>
              <input
                type="url"
                name="instagramUrl"
                value={form.instagramUrl}
                onChange={handleInputChange}
                placeholder="https://instagram.com/..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">YouTube URL</label>
              <input
                type="url"
                name="youtubeUrl"
                value={form.youtubeUrl}
                onChange={handleInputChange}
                placeholder="https://youtube.com/..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Twitter/X URL</label>
              <input
                type="url"
                name="twitterUrl"
                value={form.twitterUrl}
                onChange={handleInputChange}
                placeholder="https://twitter.com/..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">LinkedIn URL</label>
              <input
                type="url"
                name="linkedinUrl"
                value={form.linkedinUrl}
                onChange={handleInputChange}
                placeholder="https://linkedin.com/..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* Navigation Links UI */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5 lg:col-span-2">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">Footer Links (Packages & Support)</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Packages Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[13px] font-bold text-slate-800">Packages Section Links</h3>
                <button onClick={() => handleAddLink('packages')} className="text-[11px] font-medium bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg flex items-center hover:bg-blue-100 transition-colors">
                  <Plus className="w-3 h-3 mr-1" /> Add Link
                </button>
              </div>
              
              <div className="space-y-3">
                {form.navColumns.packages.map((link, idx) => (
                  <div key={idx} className="flex items-start gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 group">
                    <GripVertical className="w-4 h-4 text-slate-400 mt-2 cursor-grab" />
                    <div className="flex-1 space-y-2">
                      <input 
                        type="text" 
                        value={link.label}
                        onChange={(e) => handleLinkChange('packages', idx, 'label', e.target.value)}
                        placeholder="Label (e.g. Family Packages)"
                        className="w-full px-2 py-1.5 border border-slate-200 rounded text-[12px] focus:ring-1 focus:ring-blue-500"
                      />
                      <input 
                        type="text" 
                        value={link.url}
                        onChange={(e) => handleLinkChange('packages', idx, 'url', e.target.value)}
                        placeholder="URL (e.g. /packages)"
                        className="w-full px-2 py-1.5 border border-slate-200 rounded text-[12px] focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <button onClick={() => handleRemoveLink('packages', idx)} className="text-slate-400 hover:text-red-500 p-1.5 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Support Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[13px] font-bold text-slate-800">About & Support Links</h3>
                <button onClick={() => handleAddLink('support')} className="text-[11px] font-medium bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg flex items-center hover:bg-blue-100 transition-colors">
                  <Plus className="w-3 h-3 mr-1" /> Add Link
                </button>
              </div>
              
              <div className="space-y-3">
                {form.navColumns.support.map((link, idx) => (
                  <div key={idx} className="flex items-start gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 group">
                    <GripVertical className="w-4 h-4 text-slate-400 mt-2 cursor-grab" />
                    <div className="flex-1 space-y-2">
                      <input 
                        type="text" 
                        value={link.label}
                        onChange={(e) => handleLinkChange('support', idx, 'label', e.target.value)}
                        placeholder="Label (e.g. About Universal Travel Company)"
                        className="w-full px-2 py-1.5 border border-slate-200 rounded text-[12px] focus:ring-1 focus:ring-blue-500"
                      />
                      <input 
                        type="text" 
                        value={link.url}
                        onChange={(e) => handleLinkChange('support', idx, 'url', e.target.value)}
                        placeholder="URL (e.g. /about)"
                        className="w-full px-2 py-1.5 border border-slate-200 rounded text-[12px] focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <button onClick={() => handleRemoveLink('support', idx)} className="text-slate-400 hover:text-red-500 p-1.5 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
