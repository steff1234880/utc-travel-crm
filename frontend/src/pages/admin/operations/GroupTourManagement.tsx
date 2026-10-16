import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  RefreshCw,
  X,
  AlertCircle,
  CheckCircle2,
  Calendar,
  MapPin,
  DollarSign,
  Clock,
  Eye,
  Tag
} from 'lucide-react';
import { groupTourService, AdminGroupTour } from '../../../services/groupTourService';
import api from '../../../services/api';
import TourPricingEditor from '../../../components/admin/TourPricingEditor';

const STATUSES = ['ALL', 'Open', 'Almost Full', 'Full', 'Completed', 'Cancelled'];

interface PackageOption {
  id: string;
  title: string;
  destination?: { name: string };
  basePrice?: number;
}

export default function GroupTourManagement() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [groupTours, setGroupTours] = useState<AdminGroupTour[]>([]);
  const [packages, setPackages] = useState<PackageOption[]>([]);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, limit: 10, totalPages: 1 });

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // View Participants Modal
  const [viewTour, setViewTour] = useState<AdminGroupTour | null>(null);

  const defaultTierPricingVars = [
    { title: 'Essential', adultPrice: 0, child6to17Price: 0, child2to5Price: 0, infantPrice: 0 },
    { title: 'Signature', adultPrice: 0, child6to17Price: 0, child2to5Price: 0, infantPrice: 0 },
    { title: 'Elite', adultPrice: 0, child6to17Price: 0, child2to5Price: 0, infantPrice: 0 }
  ];

  const defaultNormalPricingVars = [
    { title: 'Normal', adultPrice: 0, child6to17Price: 0, child2to5Price: 0, infantPrice: 0 }
  ];

  const [isTierPricing, setIsTierPricing] = useState(true);

  // Form State
  const [formData, setFormData] = useState({
    packageId: '',
    title: '',
    destination: '',
    startDate: '',
    endDate: '',
    pricePerPerson: 0,
    totalSlots: 10,
    bookingDeadline: '',
    description: '',
    imageUrl: '',
    status: 'Open',
    pricingVars: defaultTierPricingVars,
  });

  const fetchGroupTours = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await groupTourService.getAdminGroupTours({
        search,
        status: statusFilter,
        page,
        limit: 10,
      });
      setGroupTours(data.groupTours);
      setPagination(data.pagination);
    } catch (err: any) {
      console.error('Error loading group tours:', err);
      setError('Failed to load group tours list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroupTours();
  }, [search, statusFilter, page]);

  useEffect(() => {
    const fetchPackageOptions = async () => {
      try {
        const res = await api.get('/packages');
        setPackages(res.data.packages || res.data.data || []);
      } catch (err) {
        console.error('Failed to load travel packages list:', err);
      }
    };
    fetchPackageOptions();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setFormData({
      packageId: '',
      title: '',
      destination: '',
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      pricePerPerson: 25000,
      totalSlots: 15,
      bookingDeadline: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
      description: '',
      imageUrl: '',
      status: 'Open',
      pricingVars: isTierPricing ? defaultTierPricingVars : defaultNormalPricingVars,
    });
    setModalError(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (gt: AdminGroupTour) => {
    setEditingId(gt.id);
    const hasNormal = gt.pricing?.some(p => p.title.toLowerCase() === 'normal');
    const isTier = !hasNormal;
    setIsTierPricing(isTier);

    let initialPricing = isTier ? defaultTierPricingVars : defaultNormalPricingVars;
    if (gt.pricing && gt.pricing.length > 0) {
      initialPricing = initialPricing.map(def => {
        const found: any = gt.pricing?.find(p => p.title.toLowerCase() === def.title.toLowerCase());
        return found ? { ...def, ...found, adultPrice: found.adultPrice || found.price || 0 } : def;
      });
    }

    setFormData({
      packageId: gt.packageId || '',
      title: gt.title,
      destination: gt.destination,
      startDate: gt.startDate ? gt.startDate.slice(0, 10) : '',
      endDate: gt.endDate ? gt.endDate.slice(0, 10) : '',
      pricePerPerson: gt.pricePerPerson,
      totalSlots: gt.totalSlots,
      bookingDeadline: gt.bookingDeadline ? gt.bookingDeadline.slice(0, 10) : '',
      description: gt.description || '',
      imageUrl: gt.imageUrl || '',
      status: gt.status,
      pricingVars: initialPricing,
    });
    setModalError(null);
    setShowModal(true);
  };

  const handlePackageSelect = (packageId: string) => {
    const selectedPkg: any = packages.find((p) => p.id === packageId);
    if (selectedPkg) {
      const hasNormal = selectedPkg.pricingVars?.some((p: any) => p.title.toLowerCase() === 'normal');
      const isTier = !hasNormal;
      setIsTierPricing(isTier);

      let initialPricing = isTier ? defaultTierPricingVars : defaultNormalPricingVars;
      if (selectedPkg.pricingVars && selectedPkg.pricingVars.length > 0) {
        initialPricing = initialPricing.map(def => {
          const found: any = selectedPkg.pricingVars.find((p: any) => p.title.toLowerCase() === def.title.toLowerCase());
          return found ? { ...def, ...found, adultPrice: found.adultPrice || found.price || 0 } : def;
        });
      }
      setFormData((prev) => ({
        ...prev,
        packageId,
        title: selectedPkg.title,
        destination: selectedPkg.destination?.name || prev.destination,
        pricePerPerson: selectedPkg.basePrice || prev.pricePerPerson,
        pricingVars: initialPricing,
      }));
    } else {
      setFormData((prev) => ({ ...prev, packageId, pricingVars: isTierPricing ? defaultTierPricingVars : defaultNormalPricingVars }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);
    try {
      if (editingId) {
        await groupTourService.updateGroupTour(editingId, formData);
        setSuccessMsg('Group tour updated successfully.');
      } else {
        await groupTourService.createGroupTour(formData);
        setSuccessMsg('Group tour created successfully.');
      }
      setShowModal(false);
      fetchGroupTours();
    } catch (err: any) {
      console.error('Error saving group tour:', err);
      const msg = err?.response?.data?.error || err?.message || 'Failed to save group tour';
      setModalError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, ref: string) => {
    if (!window.confirm(`Are you sure you want to delete Group Tour ${ref}?`)) return;
    try {
      await groupTourService.deleteGroupTour(id);
      setSuccessMsg(`Group tour ${ref} deleted.`);
      fetchGroupTours();
    } catch (err: any) {
      console.error('Error deleting group tour:', err);
      setError('Failed to delete group tour.');
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Open':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Almost Full':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Full':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'Completed':
        return 'bg-slate-100 text-slate-800 border-slate-300';
      case 'Cancelled':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-md">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Group Tour Management</h1>
            <p className="text-xs font-medium text-slate-500 mt-0.5">
              Schedule group departures, manage seat capacity & view participant bookings
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchGroupTours()}
            className="px-4 py-2.5 bg-white text-slate-700 font-semibold rounded-xl border border-slate-200 shadow-sm hover:bg-slate-50 text-xs flex items-center"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md text-xs flex items-center transition-all"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Schedule Group Tour
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-between">
          <span className="flex items-center"><CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" /> {successMsg}</span>
          <button onClick={() => setSuccessMsg(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center justify-between">
          <span className="flex items-center"><AlertCircle className="w-4 h-4 mr-2 text-rose-600" /> {error}</span>
          <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      <TourPricingEditor />

      {/* Filter Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search group tour ref, title, destination..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s === 'ALL' ? 'All Statuses' : s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 flex items-center justify-center">
            <RefreshCw className="w-4 h-4 mr-2 animate-spin text-indigo-600" /> Loading group tours...
          </div>
        ) : groupTours.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 space-y-2">
            <Users className="w-8 h-8 mx-auto text-slate-300" />
            <p className="font-semibold text-slate-600">No group tours found.</p>
            <p>Schedule a new group tour using the button above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Ref Code</th>
                  <th className="py-3 px-4">Group Tour Title</th>
                  <th className="py-3 px-4">Destination</th>
                  <th className="py-3 px-4">Dates</th>
                  <th className="py-3 px-4">Price / Person</th>
                  <th className="py-3 px-4 text-center">Total / Booked / Available</th>
                  <th className="py-3 px-4">Deadline</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {groupTours.map((gt) => (
                  <tr key={gt.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-600">{gt.groupTourRef}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{gt.title}</td>
                    <td className="py-3 px-4">{gt.destination}</td>
                    <td className="py-3 px-4 text-[11px]">
                      {new Date(gt.startDate).toLocaleDateString()} – {new Date(gt.endDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 font-bold text-indigo-600">₹{gt.pricePerPerson.toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-mono font-bold text-slate-900">
                        {gt.totalSlots} / <span className="text-blue-600">{gt.bookedSlots}</span> / <span className="text-emerald-600">{gt.availableSlots}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[11px] text-slate-500">
                      {new Date(gt.bookingDeadline).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] border ${getStatusBadgeClass(gt.status)}`}>
                        {gt.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5">
                      <button
                        onClick={() => setViewTour(gt)}
                        className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[11px] font-semibold inline-flex items-center"
                        title="View Participants"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" /> View ({gt.bookedSlots})
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(gt)}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold inline-flex items-center"
                      >
                        <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(gt.id, gt.groupTourRef)}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[11px] font-semibold inline-flex items-center border border-rose-200"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">
              Page {page} of {pagination.totalPages} ({pagination.total} total tours)
            </span>
            <div className="flex space-x-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-bold disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page === pagination.totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-bold disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                {editingId ? 'Edit Group Tour' : 'Schedule New Group Tour'}
              </h3>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs font-semibold flex items-center">
                <AlertCircle className="w-4 h-4 mr-2 shrink-0" /> {modalError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Travel Package (Optional Link)</label>
                <select
                  value={formData.packageId}
                  onChange={(e) => handlePackageSelect(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Custom Group Tour (No Package Link) --</option>
                  {packages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.title} ({pkg.destination?.name || 'Various'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tour Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dubai Group Tour 2026"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Destination *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dubai, UAE"
                    value={formData.destination}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Price / Person (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.pricePerPerson}
                    onChange={(e) => setFormData({ ...formData, pricePerPerson: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Total Capacity Slots *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.totalSlots}
                    onChange={(e) => setFormData({ ...formData, totalSlots: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="Open">Open</option>
                    <option value="Almost Full">Almost Full</option>
                    <option value="Full">Full</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Booking Deadline *</label>
                <input
                  type="date"
                  required
                  value={formData.bookingDeadline}
                  onChange={(e) => setFormData({ ...formData, bookingDeadline: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium"
                  placeholder="Highlights, inclusions, meeting points..."
                />
              </div>

              {/* EMBEDDED SECTION: PRICING CONFIGURATION */}
              <div className="border-t border-slate-200 pt-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex flex-col">
                    <h3 className="font-black text-sm uppercase text-slate-800 tracking-wider flex items-center">
                      <DollarSign className="w-4 h-4 mr-1.5 text-amber-500" />
                      Group Tour Pricing Mode
                    </h3>
                    <p className="text-[11px] text-slate-500">Choose between Normal pricing or Tiered pricing for this tour.</p>
                  </div>
                  
                  {/* Pricing Mode Toggle */}
                  <div className="flex items-center space-x-2 bg-slate-100 p-1.5 rounded-lg border border-slate-200 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (isTierPricing) {
                          setIsTierPricing(false);
                          setFormData({ ...formData, pricingVars: defaultNormalPricingVars });
                        }
                      }}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                        !isTierPricing ? 'bg-white text-indigo-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      NORMAL PRICING
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!isTierPricing) {
                          setIsTierPricing(true);
                          setFormData({ ...formData, pricingVars: defaultTierPricingVars });
                        }
                      }}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                        isTierPricing ? 'bg-white text-indigo-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      TIER PRICING
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {formData.pricingVars.map((tier, index) => (
                    <div key={tier.title || index} className="p-3 border border-slate-200 rounded-xl bg-slate-50 shadow-sm space-y-2">
                      <h4 className="font-bold text-xs text-indigo-900 border-b border-slate-200 pb-1.5">
                        {tier.title} Pricing
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Adult (18+)</label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                            <input
                              type="number"
                              value={tier.adultPrice || ''}
                              onChange={(e) => {
                                const newVars = [...formData.pricingVars];
                                newVars[index].adultPrice = Number(e.target.value);
                                setFormData({ ...formData, pricingVars: newVars });
                              }}
                              className="w-full pl-6 pr-2 py-1 text-xs font-bold text-slate-900 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Child (6-17)</label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                            <input
                              type="number"
                              value={tier.child6to17Price || ''}
                              onChange={(e) => {
                                const newVars = [...formData.pricingVars];
                                newVars[index].child6to17Price = Number(e.target.value);
                                setFormData({ ...formData, pricingVars: newVars });
                              }}
                              className="w-full pl-6 pr-2 py-1 text-xs font-bold text-slate-900 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Child (2-5)</label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                            <input
                              type="number"
                              value={tier.child2to5Price || ''}
                              onChange={(e) => {
                                const newVars = [...formData.pricingVars];
                                newVars[index].child2to5Price = Number(e.target.value);
                                setFormData({ ...formData, pricingVars: newVars });
                              }}
                              className="w-full pl-6 pr-2 py-1 text-xs font-bold text-slate-900 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Infant (0-2)</label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                            <input
                              type="number"
                              value={tier.infantPrice || ''}
                              onChange={(e) => {
                                const newVars = [...formData.pricingVars];
                                newVars[index].infantPrice = Number(e.target.value);
                                setFormData({ ...formData, pricingVars: newVars });
                              }}
                              className="w-full pl-6 pr-2 py-1 text-xs font-bold text-slate-900 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingId ? 'Update Group Tour' : 'Create Group Tour'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW PARTICIPANTS MODAL */}
      {viewTour && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{viewTour.title} — Participants</h3>
                <p className="text-xs text-slate-500 font-mono">Ref: {viewTour.groupTourRef} | Total: {viewTour.totalSlots} | Booked: {viewTour.bookedSlots} | Available: {viewTour.availableSlots}</p>
              </div>
              <button onClick={() => setViewTour(null)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            {!viewTour.bookings || viewTour.bookings.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 font-medium">
                No participant bookings joined yet for this group tour.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[350px]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                    <tr>
                      <th className="py-2.5 px-3">Customer Name</th>
                      <th className="py-2.5 px-3">Contact</th>
                      <th className="py-2.5 px-3 text-center">Seats Joined</th>
                      <th className="py-2.5 px-3">Date Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {viewTour.bookings.map((b) => (
                      <tr key={b.id}>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{b.customerName}</td>
                        <td className="py-2.5 px-3">
                          <div>{b.customerEmail}</div>
                          <div className="text-[10px] text-slate-400">{b.customerPhone}</div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-indigo-600">{b.numberOfPeople}</td>
                        <td className="py-2.5 px-3 text-[11px] text-slate-500">{new Date(b.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex items-center justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setViewTour(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
