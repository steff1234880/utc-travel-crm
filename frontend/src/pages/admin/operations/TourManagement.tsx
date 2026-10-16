import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import TourPricingEditor from '../../../components/admin/TourPricingEditor';
import {
  Compass,
  Plus,
  Search,
  Filter,
  Calendar,
  MapPin,
  Users,
  UserCheck,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  X,
  FileText,
  CheckCircle2,
  Clock,
  Edit,
  Trash2
} from 'lucide-react';
import { operationsService, Tour, CoordinatorEmployee } from '../../../services/operationsService';

export default function TourManagement() {
  const navigate = useNavigate();

  const [tours, setTours] = useState<Tour[]>([]);
  const [coordinators, setCoordinators] = useState<CoordinatorEmployee[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [destinationFilter, setDestinationFilter] = useState('');
  const [coordinatorFilter, setCoordinatorFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, limit: 10, totalPages: 1 });

  // Create/Edit Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTourId, setEditingTourId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    tourReference: '',
    bookingPrepId: '',
    customerId: '',
    packageId: '',
    destination: '',
    startDate: '',
    endDate: '',
    travellerCount: 1,
    coordinatorId: '',
    operationalNotes: '',
    status: 'Upcoming' as Tour['status'],
  });

  const [travellers, setTravellers] = useState<Array<{ name: string; age?: number; gender?: string; phone?: string; email?: string }>>([
    { name: '', age: undefined, gender: 'OTHER', phone: '', email: '' },
  ]);

  const fetchTours = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await operationsService.getTours({
        search,
        status: statusFilter,
        destination: destinationFilter,
        coordinatorId: coordinatorFilter,
        dateFrom,
        dateTo,
        page,
        limit: 10,
      });
      setTours(data.tours);
      setPagination(data.pagination);
    } catch (err: any) {
      console.error('Error fetching tours:', err);
      setError('Failed to fetch tours list.');
    } finally {
      setLoading(false);
    }
  };

  const loadReferenceOptions = async () => {
    try {
      const [coordsRes, custRes, pkgRes, bookRes] = await Promise.allSettled([
        operationsService.getCoordinators(),
        operationsService.getCustomers(),
        operationsService.getPackages(),
        operationsService.getBookingPreparations(),
      ]);

      if (coordsRes.status === 'fulfilled') setCoordinators(coordsRes.value);
      if (custRes.status === 'fulfilled') setCustomers(Array.isArray(custRes.value) ? custRes.value : (custRes.value.customers || []));
      if (pkgRes.status === 'fulfilled') setPackages(Array.isArray(pkgRes.value) ? pkgRes.value : (pkgRes.value.packages || []));
      if (bookRes.status === 'fulfilled') setBookings(Array.isArray(bookRes.value) ? bookRes.value : (bookRes.value.bookings || []));
    } catch (err) {
      console.error('Failed to load reference options:', err);
    }
  };

  useEffect(() => {
    loadReferenceOptions();
  }, []);

  useEffect(() => {
    fetchTours();
  }, [search, statusFilter, destinationFilter, coordinatorFilter, dateFrom, dateTo, page]);

  const handleOpenCreateModal = () => {
    setEditingTourId(null);
    setFormData({
      tourReference: '',
      bookingPrepId: '',
      customerId: '',
      packageId: '',
      destination: '',
      startDate: '',
      endDate: '',
      travellerCount: 1,
      coordinatorId: '',
      operationalNotes: '',
      status: 'Upcoming',
    });
    setTravellers([{ name: '', age: undefined, gender: 'OTHER', phone: '', email: '' }]);
    setModalError(null);
    setShowCreateModal(true);
  };

  const handleOpenEditModal = (tour: Tour) => {
    setEditingTourId(tour.id);
    setFormData({
      tourReference: tour.tourReference || '',
      bookingPrepId: tour.bookingPrepId || '',
      customerId: tour.customerId || '',
      packageId: tour.packageId || '',
      destination: tour.destination || '',
      startDate: tour.startDate ? tour.startDate.slice(0, 10) : '',
      endDate: tour.endDate ? tour.endDate.slice(0, 10) : '',
      travellerCount: tour.travellerCount || 1,
      coordinatorId: tour.coordinatorId || '',
      operationalNotes: tour.operationalNotes || '',
      status: tour.status || 'Upcoming',
    });
    setTravellers(
      tour.travellers && tour.travellers.length > 0
        ? tour.travellers.map((t) => ({
            name: t.name,
            age: t.age || undefined,
            gender: t.gender || 'OTHER',
            phone: t.phone || '',
            email: t.email || '',
          }))
        : [{ name: '', age: undefined, gender: 'OTHER', phone: '', email: '' }]
    );
    setModalError(null);
    setShowCreateModal(true);
  };

  // Delete Modal State
  const [deletingTour, setDeletingTour] = useState<Tour | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleOpenDeleteModal = (tour: Tour) => {
    setDeletingTour(tour);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingTour) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await operationsService.deleteTour(deletingTour.id);
      setSuccessMessage(res.message || 'Tour deleted successfully');
      setDeletingTour(null);
      fetchTours();
    } catch (err: any) {
      console.error('Error deleting tour:', err);
      const msg = err?.response?.data?.error || err.message || 'Failed to delete tour';
      setDeleteError(msg);
    } finally {
      setDeleting(false);
    }
  };

  // When a booking prep is selected in modal, auto-fill customer, destination, package if available
  const handleBookingSelect = (bookingId: string) => {
    const selectedBooking = bookings.find((b) => b.id === bookingId);
    if (selectedBooking) {
      setFormData((prev) => ({
        ...prev,
        bookingPrepId: selectedBooking.id,
        customerId: selectedBooking.customerId || prev.customerId,
        destination: selectedBooking.quotation?.destination || prev.destination,
        packageId: selectedBooking.quotation?.packageId || prev.packageId,
      }));
    } else {
      setFormData((prev) => ({ ...prev, bookingPrepId: bookingId }));
    }
  };

  const handleAddTravellerRow = () => {
    setTravellers((prev) => [...prev, { name: '', age: undefined, gender: 'OTHER', phone: '', email: '' }]);
    setFormData((prev) => ({ ...prev, travellerCount: prev.travellerCount + 1 }));
  };

  const handleRemoveTravellerRow = (index: number) => {
    setTravellers((prev) => prev.filter((_, i) => i !== index));
    setFormData((prev) => ({ ...prev, travellerCount: Math.max(1, prev.travellerCount - 1) }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!formData.bookingPrepId && !formData.customerId) {
      setModalError('Please select a Customer or Link to an existing Booking');
      return;
    }
    if (!formData.bookingPrepId && !formData.destination) {
      setModalError('Please enter Destination');
      return;
    }
    if (!formData.startDate || !formData.endDate) {
      setModalError('Please select valid Travel Start and End Dates');
      return;
    }
    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      setModalError('Travel Start Date cannot be after Travel End Date');
      return;
    }

    setSubmitting(true);
    try {
      const validTravellers = travellers.filter((t) => t.name.trim() !== '');

      const payload = {
        ...formData,
        travellerCount: Math.max(formData.travellerCount, validTravellers.length || 1),
        travellers: validTravellers,
      };

      if (editingTourId) {
        const res = await operationsService.updateTour(editingTourId, payload);
        setSuccessMessage(res.message || 'Tour updated successfully!');
      } else {
        const res = await operationsService.createTour(payload);
        setSuccessMessage(res.message || 'Tour created successfully!');
      }

      setShowCreateModal(false);
      setEditingTourId(null);
      setModalError(null);
      fetchTours();

      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    } catch (err: any) {
      console.error('Error saving tour:', err);
      const msg = err?.response?.data?.error || 'Failed to save tour.';
      setModalError(msg);
    } finally {
      setSubmitting(false);
    }
  };




  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Ongoing':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Confirmed':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Upcoming':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'Preparation':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Completed':
        return 'bg-slate-100 text-slate-800 border-slate-300';
      case 'Cancelled':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'Postponed':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-md">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Tour Management</h1>
              <p className="text-sm font-medium text-slate-500 mt-0.5">Manage operational tours, assigned coordinators & traveller details</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchTours()}
            className="flex items-center px-4 py-2.5 bg-white text-slate-700 font-medium rounded-xl border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="flex items-center px-5 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl shadow-md hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-5 h-5 mr-1.5" />
            Create Tour
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center space-x-3 text-emerald-800 text-sm font-semibold shadow-sm animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      <TourPricingEditor />

      {/* Main Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
        {/* Filters Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50/50 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search tour ref, customer name, destination, booking ref..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
              >
                <option value="ALL">All Statuses</option>
                <option value="Upcoming">Upcoming</option>
                <option value="Preparation">Preparation</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Ongoing">Ongoing</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Postponed">Postponed</option>
              </select>

              <select
                value={coordinatorFilter}
                onChange={(e) => { setCoordinatorFilter(e.target.value); setPage(1); }}
                className="px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
              >
                <option value="">All Coordinators</option>
                {coordinators.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName} ({c.employeeId})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-6 m-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center">
            <AlertCircle className="w-5 h-5 mr-3 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Table Content */}
        {loading ? (
          <div className="p-16 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-500">Loading tour records...</p>
          </div>
        ) : tours.length === 0 ? (
          <div className="p-16 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
              <Compass className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">No Tours Found</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                No tour records match your criteria. Click below to create a new tour record.
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white font-semibold rounded-xl text-sm shadow hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Create Tour
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px] tracking-wider">
                  <th className="py-3.5 px-4">Tour Reference</th>
                  <th className="py-3.5 px-4">Booking Ref</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Destination</th>
                  <th className="py-3.5 px-4">Dates</th>
                  <th className="py-3.5 px-4 text-center">Travellers</th>
                  <th className="py-3.5 px-4">Coordinator</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {tours.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <Link to={`/admin/operations/tours/${t.id}`} className="text-indigo-600 hover:underline">
                        {t.tourReference}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono text-xs">
                      {t.bookingPrep?.bookingRef || '-'}
                    </td>
                    <td className="py-3.5 px-4">
                      {t.customer ? (
                        <div>
                          <div className="font-semibold text-slate-900">{t.customer.firstName} {t.customer.lastName || ''}</div>
                          <div className="text-xs text-slate-400">{t.customer.email}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400">N/A</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      <span className="inline-flex items-center">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 mr-1" />
                        {t.destination}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      <div>{new Date(t.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                      <div className="text-slate-400">to {new Date(t.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-900">
                      <span className="inline-flex items-center px-2.5 py-1 bg-slate-100 rounded-lg">
                        <Users className="w-3.5 h-3.5 mr-1 text-slate-500" />
                        {t.travellerCount}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {t.coordinator ? (
                        <span className="inline-flex items-center text-xs font-semibold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
                          <UserCheck className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                          {t.coordinator.firstName} {t.coordinator.lastName}
                        </span>
                      ) : (
                        <span className="text-xs text-amber-600 font-semibold bg-amber-50 px-2 py-1 rounded-lg">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusBadgeClass(t.status)}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenEditModal(t)}
                        className="inline-flex items-center px-3 py-1.5 bg-slate-100 text-slate-700 font-semibold text-xs rounded-lg hover:bg-slate-200 transition-colors mr-2"
                        title="Edit Tour"
                      >
                        <Edit className="w-3.5 h-3.5 mr-1 text-slate-600" /> Edit
                      </button>
                      <button
                        onClick={() => handleOpenDeleteModal(t)}
                        className="inline-flex items-center px-3 py-1.5 bg-rose-50 text-rose-700 font-semibold text-xs rounded-lg hover:bg-rose-100 transition-colors mr-2"
                        title="Delete Tour"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1 text-rose-600" /> Delete
                      </button>
                      <Link
                        to={`/admin/operations/tours/${t.id}`}
                        className="inline-flex items-center px-3 py-1.5 bg-indigo-50 text-indigo-700 font-semibold text-xs rounded-lg hover:bg-indigo-100 transition-colors"
                      >
                        Details & Checklist <ChevronRight className="w-3.5 h-3.5 ml-1" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {!loading && tours.length > 0 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs font-medium text-slate-600">
            <div>
              Showing <span className="font-bold text-slate-900">{(page - 1) * pagination.limit + 1}</span> to{' '}
              <span className="font-bold text-slate-900">{Math.min(page * pagination.limit, pagination.total)}</span> of{' '}
              <span className="font-bold text-slate-900">{pagination.total}</span> tours
            </div>

            <div className="flex items-center space-x-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 disabled:opacity-40 hover:bg-slate-100 transition-colors"
              >
                Previous
              </button>
              <span className="px-2 font-bold text-slate-800">
                Page {page} of {pagination.totalPages}
              </span>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 disabled:opacity-40 hover:bg-slate-100 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CREATE TOUR MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full my-8 overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                  <Compass className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingTourId ? 'Edit Operational Tour' : 'Create New Operational Tour'}
                </h2>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {modalError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center space-x-2.5 text-rose-800 text-sm font-medium">
                  <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Optional Link to Existing Booking Preparation */}
              <div className="bg-indigo-50/70 p-4 rounded-xl border border-indigo-100 space-y-2">
                <label className="block text-xs font-bold text-indigo-900 uppercase tracking-wider">
                  Link to Confirmed Booking (Optional)
                </label>
                <select
                  value={formData.bookingPrepId}
                  onChange={(e) => handleBookingSelect(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-indigo-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Select Confirmed Booking (or create custom tour) --</option>
                  {bookings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bookingRef} — {b.customer?.firstName} {b.customer?.lastName || ''} — {b.quotation?.destination || 'Tour'} [{b.status || 'CONFIRMED'}]
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-indigo-700">Selecting a booking will auto-fill Customer and Destination details.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Tour Reference */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tour Reference Number <span className="text-slate-400 font-normal">(Auto-generated if empty)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. TOUR-2026-0001"
                    value={formData.tourReference}
                    onChange={(e) => setFormData({ ...formData, tourReference: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Customer */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Customer <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required={!formData.bookingPrepId}
                    value={formData.customerId}
                    onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Select Customer --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.firstName} {c.lastName || ''} ({c.email})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Destination */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Destination <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required={!formData.bookingPrepId}
                    placeholder="e.g. Kerala Backwaters & Munnar"
                    value={formData.destination}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Package (Optional) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Travel Package <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <select
                    value={formData.packageId}
                    onChange={(e) => setFormData({ ...formData, packageId: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- None / Customized --</option>
                    {packages.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title || p.packageName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Travel Start Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Travel Start Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Travel End Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Travel End Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Assign Coordinator */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Assign Coordinator
                  </label>
                  <select
                    value={formData.coordinatorId}
                    onChange={(e) => setFormData({ ...formData, coordinatorId: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Unassigned (Assign later) --</option>
                    {coordinators.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.firstName} {c.lastName} ({c.employeeId})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tour Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                  >
                    <option value="Upcoming">Upcoming</option>
                    <option value="Preparation">Preparation</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Ongoing">Ongoing</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="Postponed">Postponed</option>
                  </select>
                </div>
              </div>


              {/* Operational Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Operational Notes</label>
                <textarea
                  rows={2}
                  placeholder="Special instructions, dietary rules, arrival preferences..."
                  value={formData.operationalNotes}
                  onChange={(e) => setFormData({ ...formData, operationalNotes: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Initial Travellers Section */}
              <div className="border-t border-slate-200 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Traveller List ({travellers.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddTravellerRow}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Traveller
                  </button>
                </div>

                <div className="space-y-2">
                  {travellers.map((t, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                      <span className="font-bold text-slate-400 w-5 text-center">{idx + 1}.</span>
                      <input
                        type="text"
                        placeholder="Full Name *"
                        value={t.name}
                        onChange={(e) => {
                          const updated = [...travellers];
                          updated[idx].name = e.target.value;
                          setTravellers(updated);
                        }}
                        className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-medium text-slate-800"
                      />
                      <input
                        type="number"
                        placeholder="Age"
                        value={t.age || ''}
                        onChange={(e) => {
                          const updated = [...travellers];
                          updated[idx].age = e.target.value ? parseInt(e.target.value, 10) : undefined;
                          setTravellers(updated);
                        }}
                        className="w-16 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800"
                      />
                      <input
                        type="text"
                        placeholder="Phone"
                        value={t.phone || ''}
                        onChange={(e) => {
                          const updated = [...travellers];
                          updated[idx].phone = e.target.value;
                          setTravellers(updated);
                        }}
                        className="w-28 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800"
                      />
                      {travellers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveTravellerRow(idx)}
                          className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl shadow-md disabled:opacity-50 flex items-center"
                >
                  {submitting && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                  {editingTourId ? 'Save Changes' : 'Create Tour & Generate Checklist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingTour && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="p-3 bg-rose-100 rounded-xl">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Delete Tour</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{deletingTour.tourReference}</p>
              </div>
            </div>

            <p className="text-sm font-medium text-slate-700">
              Are you sure you want to delete this tour?
            </p>

            {deleteError && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium space-y-1">
                <div className="font-bold flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1 shrink-0" /> Deletion Blocked / Failed
                </div>
                <div>{deleteError}</div>
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => { setDeletingTour(null); setDeleteError(null); }}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 text-white text-sm font-semibold rounded-xl hover:bg-rose-700 shadow-md transition-colors flex items-center"
                disabled={deleting}
              >
                {deleting && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
