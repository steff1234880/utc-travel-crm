import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Building,
  Plus,
  Search,
  Filter,
  Calendar,
  MapPin,
  Users,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  X,
  FileText,
  Trash2,
  Edit,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { operationsService, HotelReservation, Tour } from '../../../services/operationsService';

export default function HotelManagement() {
  const [reservations, setReservations] = useState<HotelReservation[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, limit: 10, totalPages: 1 });

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Delete Confirmation Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState({
    tourId: '',
    customerId: '',
    hotelName: '',
    destination: '',
    vendorReference: '',
    bookingReference: '',
    roomType: '',
    numberOfRooms: 1,
    numberOfGuests: 1,
    checkInDate: '',
    checkOutDate: '',
    mealPlan: '',
    confirmationNumber: '',
    reservationStatus: 'Requested' as const,
    internalNotes: '',
  });

  const fetchReservations = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await operationsService.getHotelReservations({
        search,
        status: statusFilter,
        page,
        limit: 10,
      });
      setReservations(data.reservations);
      setPagination(data.pagination);
    } catch (err: any) {
      console.error('Error fetching hotel reservations:', err);
      setError('Failed to fetch hotel reservations.');
    } finally {
      setLoading(false);
    }
  };

  const loadReferenceData = async () => {
    try {
      const [custRes, toursRes] = await Promise.allSettled([
        operationsService.getCustomers(),
        operationsService.getTours({ limit: 100 }),
      ]);
      if (custRes.status === 'fulfilled') {
        const val = custRes.value;
        const list = Array.isArray(val) ? val : (val?.data || val?.customers || []);
        setCustomers(list);
      }
      if (toursRes.status === 'fulfilled') {
        const val = toursRes.value;
        const list = Array.isArray(val) ? val : (val?.tours || []);
        setTours(list);
      }
    } catch (err) {
      console.error('Error loading reference data:', err);
    }
  };

  useEffect(() => {
    loadReferenceData();
  }, []);

  useEffect(() => {
    fetchReservations();
  }, [search, statusFilter, page]);

  const handleTourSelect = (tourId: string) => {
    const selectedTour = tours.find((t) => t.id === tourId);
    if (selectedTour) {
      setFormData((prev) => ({
        ...prev,
        tourId: selectedTour.id,
        customerId: selectedTour.customerId || prev.customerId,
        destination: selectedTour.destination || prev.destination,
      }));
    } else {
      setFormData((prev) => ({ ...prev, tourId: '' }));
    }
  };

  const handleOpenCreateModal = () => {
    loadReferenceData();
    setEditingId(null);
    setFormData({
      tourId: '',
      customerId: '',
      hotelName: '',
      destination: '',
      vendorReference: '',
      bookingReference: '',
      roomType: '',
      numberOfRooms: 1,
      numberOfGuests: 1,
      checkInDate: '',
      checkOutDate: '',
      mealPlan: '',
      confirmationNumber: '',
      reservationStatus: 'Requested',
      internalNotes: '',
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (h: HotelReservation) => {
    loadReferenceData();
    setEditingId(h.id);
    setFormData({
      tourId: h.tourId || '',
      customerId: h.customerId,
      hotelName: h.hotelName,
      destination: h.destination,
      vendorReference: h.vendorReference || '',
      bookingReference: h.bookingReference || '',
      roomType: h.roomType || '',
      numberOfRooms: h.numberOfRooms || 1,
      numberOfGuests: h.numberOfGuests || 1,
      checkInDate: h.checkInDate ? h.checkInDate.substring(0, 10) : '',
      checkOutDate: h.checkOutDate ? h.checkOutDate.substring(0, 10) : '',
      mealPlan: h.mealPlan || '',
      confirmationNumber: h.confirmationNumber || '',
      reservationStatus: h.reservationStatus as any,
      internalNotes: h.internalNotes || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId) {
      alert('Please select a Customer');
      return;
    }
    if (!formData.hotelName || !formData.destination) {
      alert('Hotel Name and Destination are required');
      return;
    }
    if (!formData.checkInDate || !formData.checkOutDate) {
      alert('Check-in and Check-out dates are required');
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        await operationsService.updateHotelReservation(editingId, formData);
      } else {
        await operationsService.createHotelReservation(formData);
      }
      setShowModal(false);
      fetchReservations();
    } catch (err: any) {
      console.error('Error saving hotel reservation:', err);
      alert(err?.response?.data?.error || 'Failed to save hotel reservation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDeleteModal = (id: string) => {
    setDeletingId(id);
    setDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    if (deleting) return;
    setDeleteModalOpen(false);
    setDeletingId(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingId || deleting) return;
    setDeleting(true);
    try {
      await operationsService.deleteHotelReservation(deletingId);
      setDeleteModalOpen(false);
      setDeletingId(null);
      fetchReservations();
    } catch (err: any) {
      console.error('Error deleting hotel reservation:', err);
      alert(err?.response?.data?.error || 'Failed to delete reservation');
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Confirmed':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Completed':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Pending':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Requested':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'Modified':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'Cancelled':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-600 text-white rounded-xl shadow-md">
              <Building className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Hotel Reservation Management</h1>
              <p className="text-sm font-medium text-slate-500 mt-0.5">Manage hotel bookings, room allocations & confirmation numbers</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchReservations()}
            className="flex items-center px-4 py-2.5 bg-white text-slate-700 font-medium rounded-xl border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="flex items-center px-5 py-2.5 bg-amber-600 text-white font-semibold rounded-xl shadow-md hover:bg-amber-700 transition-colors"
          >
            <Plus className="w-5 h-5 mr-1.5" />
            New Reservation
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
        {/* Filters Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search hotel name, destination, confirmation number, customer..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
            />
          </div>

          <div className="flex items-center space-x-3">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
            >
              <option value="ALL">All Reservation Statuses</option>
              <option value="Requested">Requested</option>
              <option value="Pending">Pending</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Modified">Modified</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
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
            <RefreshCw className="w-8 h-8 text-amber-600 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-500">Loading hotel reservations...</p>
          </div>
        ) : reservations.length === 0 ? (
          <div className="p-16 text-center space-y-4">
            <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto">
              <Building className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">No Hotel Reservations Found</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                No reservation records match your filter criteria. Click below to add a new reservation.
              </p>
            </div>
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center px-4 py-2 bg-amber-600 text-white font-semibold rounded-xl text-sm shadow hover:bg-amber-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-1.5" /> New Reservation
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px] tracking-wider">
                  <th className="py-3.5 px-4">Hotel Name</th>
                  <th className="py-3.5 px-4">Destination</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Tour Reference</th>
                  <th className="py-3.5 px-4">Check-in / Check-out</th>
                  <th className="py-3.5 px-4">Rooms / Guests</th>
                  <th className="py-3.5 px-4">Confirmation #</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {reservations.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {h.hotelName}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      <span className="inline-flex items-center">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 mr-1" />
                        {h.destination}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {h.customer ? (
                        <div>
                          <div className="font-semibold text-slate-900">{h.customer.firstName} {h.customer.lastName || ''}</div>
                          <div className="text-xs text-slate-400">{h.customer.email}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400">N/A</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono">
                      {h.tour ? (
                        <Link to={`/admin/operations/tours/${h.tour.id}`} className="text-blue-600 hover:underline font-bold">
                          {h.tour.tourReference}
                        </Link>
                      ) : (
                        <span className="text-slate-400">Standalone</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      <div>In: <strong className="text-slate-800">{new Date(h.checkInDate).toLocaleDateString('en-GB')}</strong></div>
                      <div>Out: <strong className="text-slate-800">{new Date(h.checkOutDate).toLocaleDateString('en-GB')}</strong></div>
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      <div>{h.numberOfRooms} Room(s)</div>
                      <div className="text-slate-400">{h.numberOfGuests} Guest(s) • {h.mealPlan || 'CP'}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs font-bold text-amber-900">
                      {h.confirmationNumber || '-'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusBadgeClass(h.reservationStatus)}`}>
                        {h.reservationStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEditModal(h)}
                        className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-slate-100 rounded-lg inline-flex items-center"
                        title="Edit Reservation"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenDeleteModal(h.id)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg inline-flex items-center"
                        title="Delete Reservation"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {!loading && reservations.length > 0 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs font-medium text-slate-600">
            <div>
              Showing <span className="font-bold text-slate-900">{(page - 1) * pagination.limit + 1}</span> to{' '}
              <span className="font-bold text-slate-900">{Math.min(page * pagination.limit, pagination.total)}</span> of{' '}
              <span className="font-bold text-slate-900">{pagination.total}</span> reservations
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

      {/* CREATE / EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full my-8 overflow-hidden">
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-amber-700">
                <Building className="w-5 h-5" />
                <h2 className="text-lg font-bold text-slate-900">
                  {editingId ? 'Edit Hotel Reservation' : 'Create Hotel Reservation'}
                </h2>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Link to Tour */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Link to Tour <span className="text-slate-400 font-normal">(Optional)</span></label>
                  <select
                    value={formData.tourId}
                    onChange={(e) => handleTourSelect(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
                  >
                    <option value="">-- No Tour Linked (Standalone Reservation) --</option>
                    {tours.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.tourReference} — {t.customer ? `${t.customer.firstName} ${t.customer.lastName || ''}` : 'No Customer'} — {t.destination} ({new Date(t.startDate).toLocaleDateString('en-GB')} to {new Date(t.endDate).toLocaleDateString('en-GB')})
                      </option>
                    ))}
                  </select>
                  {tours.length === 0 && (
                    <p className="text-[11px] text-amber-600 mt-1">No tours found in system.</p>
                  )}
                </div>

                {/* Customer */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Customer <span className="text-rose-500">*</span></label>
                  <select
                    required
                    value={formData.customerId}
                    onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
                  >
                    <option value="">-- Select Customer * --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.firstName} {c.lastName || ''} ({c.email || c.phone || 'No Email'})
                      </option>
                    ))}
                  </select>
                  {customers.length === 0 && (
                    <p className="text-[11px] text-amber-600 mt-1">No customers loaded. Please check system customers.</p>
                  )}
                </div>

                {/* Hotel Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Hotel Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Taj Lake Palace"
                    value={formData.hotelName}
                    onChange={(e) => setFormData({ ...formData, hotelName: e.target.value })}
                    className="w-full px-3.5 py-2 border rounded-xl text-sm"
                  />
                </div>

                {/* Destination */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Destination *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Udaipur, Rajasthan"
                    value={formData.destination}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    className="w-full px-3.5 py-2 border rounded-xl text-sm"
                  />
                </div>

                {/* Check-in */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Check-in Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.checkInDate}
                    onChange={(e) => setFormData({ ...formData, checkInDate: e.target.value })}
                    className="w-full px-3.5 py-2 border rounded-xl text-sm"
                  />
                </div>

                {/* Check-out */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Check-out Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.checkOutDate}
                    onChange={(e) => setFormData({ ...formData, checkOutDate: e.target.value })}
                    className="w-full px-3.5 py-2 border rounded-xl text-sm"
                  />
                </div>

                {/* Room Type */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Room Type</label>
                  <input
                    type="text"
                    placeholder="e.g. Deluxe Sea View King"
                    value={formData.roomType}
                    onChange={(e) => setFormData({ ...formData, roomType: e.target.value })}
                    className="w-full px-3.5 py-2 border rounded-xl text-sm"
                  />
                </div>

                {/* Meal Plan */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Meal Plan</label>
                  <input
                    type="text"
                    placeholder="e.g. CP (Breakfast Included)"
                    value={formData.mealPlan}
                    onChange={(e) => setFormData({ ...formData, mealPlan: e.target.value })}
                    className="w-full px-3.5 py-2 border rounded-xl text-sm"
                  />
                </div>

                {/* Number of Rooms */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Number of Rooms</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.numberOfRooms}
                    onChange={(e) => setFormData({ ...formData, numberOfRooms: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3.5 py-2 border rounded-xl text-sm"
                  />
                </div>

                {/* Number of Guests */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Number of Guests</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.numberOfGuests}
                    onChange={(e) => setFormData({ ...formData, numberOfGuests: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3.5 py-2 border rounded-xl text-sm"
                  />
                </div>

                {/* Confirmation Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Confirmation Number</label>
                  <input
                    type="text"
                    placeholder="e.g. HTL-998811"
                    value={formData.confirmationNumber}
                    onChange={(e) => setFormData({ ...formData, confirmationNumber: e.target.value })}
                    className="w-full px-3.5 py-2 border rounded-xl text-sm font-mono"
                  />
                </div>

                {/* Reservation Status */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Reservation Status</label>
                  <select
                    value={formData.reservationStatus}
                    onChange={(e) => setFormData({ ...formData, reservationStatus: e.target.value as any })}
                    className="w-full px-3.5 py-2 border rounded-xl text-sm font-bold"
                  >
                    <option value="Requested">Requested</option>
                    <option value="Pending">Pending</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Modified">Modified</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Internal Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Internal Notes</label>
                <textarea
                  rows={2}
                  placeholder="Special requests, early check-in notes..."
                  value={formData.internalNotes}
                  onChange={(e) => setFormData({ ...formData, internalNotes: e.target.value })}
                  className="w-full px-3.5 py-2 border rounded-xl text-sm"
                />
              </div>

              <div className="pt-3 border-t flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 text-sm font-semibold bg-amber-600 text-white hover:bg-amber-700 rounded-xl shadow-md disabled:opacity-50 flex items-center"
                >
                  {submitting && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                  {editingId ? 'Save Changes' : 'Create Reservation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
          onClick={handleCloseDeleteModal}
        >
          <div
            className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-center border border-slate-100 animate-in fade-in zoom-in duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Delete Reservation?</h3>
              <p className="text-sm text-slate-600">
                Are you sure you want to delete this hotel reservation?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={handleCloseDeleteModal}
                disabled={deleting}
                className="w-full px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="w-full px-4 py-2.5 bg-rose-600 text-white text-sm font-semibold rounded-xl hover:bg-rose-700 transition-colors shadow-sm disabled:opacity-50 inline-flex items-center justify-center"
              >
                {deleting ? <RefreshCw className="w-4 h-4 animate-spin mr-1.5" /> : null}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
