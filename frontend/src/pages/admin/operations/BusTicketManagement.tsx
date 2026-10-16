import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Bus,
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
  Trash2,
  Edit,
  Clock,
  Ticket,
  Eye,
  CheckCircle2
} from 'lucide-react';
import { operationsService, BusTicket, Tour } from '../../../services/operationsService';

export default function BusTicketManagement() {
  const [tickets, setTickets] = useState<BusTicket[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [tourFilter, setTourFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, limit: 10, totalPages: 1 });

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [viewingTicket, setViewingTicket] = useState<BusTicket | null>(null);

  // Delete Confirmation Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    tourId: '',
    passengerName: '',
    tourTravellerId: '',
    operator: '',
    busNumber: '',
    departureLocation: '',
    arrivalLocation: '',
    departureDateTime: '',
    arrivalDateTime: '',
    pnr: '',
    seatNumber: '',
    busClass: '',
    ticketStatus: 'Requested' as 'Requested' | 'Processing' | 'Confirmed' | 'Issued' | 'Cancelled' | 'Rescheduled',
    internalNotes: '',
  });

  const fetchTickets = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await operationsService.getBusTickets({
        search,
        status: statusFilter,
        tourId: tourFilter,
        dateFrom,
        dateTo,
        page,
        limit: 10,
      });
      setTickets(data.tickets || []);
      setPagination(data.pagination || { total: 0, limit: 10, totalPages: 1 });
    } catch (err: any) {
      console.error('Error fetching bus tickets:', err);
      setError('Failed to fetch bus tickets list.');
    } finally {
      setLoading(false);
    }
  };

  const loadToursList = async () => {
    try {
      const data = await operationsService.getTours({ limit: 100 });
      const tourArray = Array.isArray(data) ? data : (data?.tours || data?.data || []);
      setTours(tourArray);
    } catch (err) {
      console.error('Failed to load tours list:', err);
    }
  };

  useEffect(() => {
    loadToursList();
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [search, statusFilter, tourFilter, dateFrom, dateTo, page]);

  const handleTourSelect = (selectedTourId: string) => {
    const selectedTour = tours.find((t) => t.id === selectedTourId);
    if (selectedTour) {
      setFormData((prev) => ({
        ...prev,
        tourId: selectedTour.id,
        passengerName: prev.passengerName || (selectedTour.customer ? `${selectedTour.customer.firstName} ${selectedTour.customer.lastName || ''}`.trim() : ''),
      }));
    } else {
      setFormData((prev) => ({ ...prev, tourId: selectedTourId }));
    }
  };

  const formatForDatetimeInput = (dateStr?: string | null) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const pad = (num: number) => String(num).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const handleOpenCreateModal = () => {
    loadToursList();
    setEditingId(null);
    setFormData({
      tourId: '',
      passengerName: '',
      tourTravellerId: '',
      operator: '',
      busNumber: '',
      departureLocation: '',
      arrivalLocation: '',
      departureDateTime: '',
      arrivalDateTime: '',
      pnr: '',
      seatNumber: '',
      busClass: '',
      ticketStatus: 'Requested',
      internalNotes: '',
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (t: BusTicket) => {
    loadToursList();
    setEditingId(t.id);
    setFormData({
      tourId: t.tourId,
      passengerName: t.passengerName,
      tourTravellerId: t.tourTravellerId || '',
      operator: t.operator,
      busNumber: t.busNumber || '',
      departureLocation: t.departureLocation,
      arrivalLocation: t.arrivalLocation,
      departureDateTime: formatForDatetimeInput(t.departureDateTime),
      arrivalDateTime: formatForDatetimeInput(t.arrivalDateTime),
      pnr: t.pnr,
      seatNumber: t.seatNumber || '',
      busClass: t.busClass || '',
      ticketStatus: t.ticketStatus,
      internalNotes: t.internalNotes || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tourId) {
      alert('Please select a Tour');
      return;
    }
    if (!formData.passengerName || !formData.operator || !formData.pnr) {
      alert('Passenger Name, Operator, and PNR are required');
      return;
    }
    if (!formData.departureLocation || !formData.arrivalLocation) {
      alert('Departure and Arrival Locations are required');
      return;
    }
    if (!formData.departureDateTime || !formData.arrivalDateTime) {
      alert('Departure and Arrival Date/Times are required');
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        await operationsService.updateBusTicket(editingId, formData);
      } else {
        await operationsService.createBusTicket(formData);
      }
      setShowModal(false);
      fetchTickets();
    } catch (err: any) {
      console.error('Error saving bus ticket:', err);
      alert(err?.response?.data?.error || 'Failed to save bus ticket');
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
      await operationsService.deleteBusTicket(deletingId);
      setDeleteModalOpen(false);
      setDeletingId(null);
      fetchTickets();
    } catch (err: any) {
      console.error('Error deleting bus ticket:', err);
      alert(err?.response?.data?.error || 'Failed to delete bus ticket');
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Issued':
      case 'Confirmed':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Processing':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Requested':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'Rescheduled':
        return 'bg-amber-100 text-amber-800 border-amber-300';
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
            <div className="p-2.5 bg-purple-600 text-white rounded-xl shadow-md">
              <Bus className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Bus Ticket Management</h1>
              <p className="text-sm font-medium text-slate-500 mt-0.5">Manage bus operators, PNRs, boarding points & seats</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchTickets()}
            className="flex items-center px-4 py-2.5 bg-white text-slate-700 font-medium rounded-xl border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="flex items-center px-5 py-2.5 bg-purple-600 text-white font-semibold rounded-xl shadow-md hover:bg-purple-700 transition-colors"
          >
            <Plus className="w-5 h-5 mr-1.5" />
            Add Bus Ticket
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
        {/* Filters Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50/50 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search bus #, PNR, passenger, operator, boarding point..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
              >
                <option value="ALL">All Statuses</option>
                <option value="Requested">Requested</option>
                <option value="Processing">Processing</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Issued">Issued</option>
                <option value="Rescheduled">Rescheduled</option>
                <option value="Cancelled">Cancelled</option>
              </select>

              <select
                value={tourFilter}
                onChange={(e) => { setTourFilter(e.target.value); setPage(1); }}
                className="px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm max-w-xs"
              >
                <option value="">All Tours</option>
                {tours.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.tourReference} ({t.destination})
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
            <RefreshCw className="w-8 h-8 text-purple-600 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-500">Loading bus ticket records...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-16 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
              <Bus className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">No Bus Tickets Found</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                No bus tickets match your filter criteria. Click below to add a new bus ticket.
              </p>
            </div>
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white font-semibold rounded-xl text-sm shadow hover:bg-purple-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Add Bus Ticket
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px] tracking-wider">
                  <th className="py-3.5 px-4">Operator / Bus #</th>
                  <th className="py-3.5 px-4">Passenger</th>
                  <th className="py-3.5 px-4">Tour / Customer</th>
                  <th className="py-3.5 px-4">Route</th>
                  <th className="py-3.5 px-4">Travel Date & Time</th>
                  <th className="py-3.5 px-4">PNR / Seat</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <div>{t.operator}</div>
                      {t.busNumber && <div className="text-xs text-purple-700 font-mono">Bus #{t.busNumber}</div>}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{t.passengerName}</div>
                      {t.busClass && <div className="text-xs text-slate-400">Class: {t.busClass}</div>}
                    </td>
                    <td className="py-3.5 px-4">
                      {t.tour ? (
                        <div>
                          <Link to={`/admin/operations/tours/${t.tour.id}`} className="font-semibold text-indigo-600 hover:underline">
                            {t.tour.tourReference}
                          </Link>
                          {t.tour.customer && (
                            <div className="text-xs text-slate-400">{t.tour.customer.firstName} {t.tour.customer.lastName || ''}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">N/A</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium">
                      <span className="inline-flex items-center text-slate-800">
                        {t.departureLocation} → {t.arrivalLocation}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      <div>Dep: {new Date(t.departureDateTime).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                      <div className="text-slate-400">Arr: {new Date(t.arrivalDateTime).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono font-bold text-slate-900">
                      <div className="text-purple-700">{t.pnr}</div>
                      {t.seatNumber && <div className="text-slate-500 font-normal">Seat: {t.seatNumber}</div>}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusBadgeClass(t.ticketStatus)}`}>
                        {t.ticketStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1.5">
                      <button
                        onClick={() => setViewingTicket(t)}
                        className="p-1.5 text-slate-600 hover:text-purple-600 hover:bg-slate-100 rounded-lg inline-flex items-center"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(t)}
                        className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-slate-100 rounded-lg inline-flex items-center"
                        title="Edit Ticket"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenDeleteModal(t.id)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg inline-flex items-center"
                        title="Delete Ticket"
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
        {!loading && tickets.length > 0 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs font-medium text-slate-600">
            <div>
              Showing <span className="font-bold text-slate-900">{(page - 1) * pagination.limit + 1}</span> to{' '}
              <span className="font-bold text-slate-900">{Math.min(page * pagination.limit, pagination.total)}</span> of{' '}
              <span className="font-bold text-slate-900">{pagination.total}</span> tickets
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
            <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-purple-600 text-white rounded-lg">
                  <Bus className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editingId ? 'Edit Bus Ticket' : 'Add New Bus Ticket'}
                </h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Link to Tour */}
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Link to Tour *</label>
                  <select
                    required
                    value={formData.tourId}
                    onChange={(e) => handleTourSelect(e.target.value)}
                    className="w-full px-3.5 py-2 border rounded-xl text-sm font-semibold focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">-- Select Tour * --</option>
                    {tours.map((t) => {
                      const custName = t.customer ? `${t.customer.firstName} ${t.customer.lastName || ''}`.trim() : 'No Customer';
                      const startStr = t.startDate ? new Date(t.startDate).toLocaleDateString('en-GB') : '';
                      const endStr = t.endDate ? new Date(t.endDate).toLocaleDateString('en-GB') : '';
                      return (
                        <option key={t.id} value={t.id}>
                          {t.tourReference} — {custName} — {t.destination} ({startStr} to {endStr}) [{t.status}]
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Passenger Name */}
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Passenger Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Smith"
                    value={formData.passengerName}
                    onChange={(e) => setFormData({ ...formData, passengerName: e.target.value })}
                    className="w-full px-3.5 py-2 border rounded-xl text-sm"
                  />
                </div>

                {/* Operator */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Bus Operator *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Volvo Sleeper / SRS Travels"
                    value={formData.operator}
                    onChange={(e) => setFormData({ ...formData, operator: e.target.value })}
                    className="w-full px-3.5 py-2 border rounded-xl text-sm"
                  />
                </div>

                {/* Bus Number */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Bus Number / Reg</label>
                  <input
                    type="text"
                    placeholder="e.g. KA-01-F-1234"
                    value={formData.busNumber}
                    onChange={(e) => setFormData({ ...formData, busNumber: e.target.value })}
                    className="w-full px-3.5 py-2 border rounded-xl text-sm font-mono"
                  />
                </div>

                {/* Departure Location */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Boarding Point / Departure *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Majestic Bus Station"
                    value={formData.departureLocation}
                    onChange={(e) => setFormData({ ...formData, departureLocation: e.target.value })}
                    className="w-full px-3.5 py-2 border rounded-xl text-sm"
                  />
                </div>

                {/* Arrival Location */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Dropoff Point / Arrival *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Panaji Bus Stand"
                    value={formData.arrivalLocation}
                    onChange={(e) => setFormData({ ...formData, arrivalLocation: e.target.value })}
                    className="w-full px-3.5 py-2 border rounded-xl text-sm"
                  />
                </div>

                {/* Departure Date & Time */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Departure Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.departureDateTime}
                    onChange={(e) => setFormData({ ...formData, departureDateTime: e.target.value })}
                    className="w-full px-3.5 py-2 border rounded-xl text-sm"
                  />
                </div>

                {/* Arrival Date & Time */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Arrival Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.arrivalDateTime}
                    onChange={(e) => setFormData({ ...formData, arrivalDateTime: e.target.value })}
                    className="w-full px-3.5 py-2 border rounded-xl text-sm"
                  />
                </div>

                {/* PNR */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">PNR / Reference *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BUS-982104"
                    value={formData.pnr}
                    onChange={(e) => setFormData({ ...formData, pnr: e.target.value })}
                    className="w-full px-3.5 py-2 border rounded-xl text-sm font-mono font-bold"
                  />
                </div>

                {/* Seat Number */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Seat Number</label>
                  <input
                    type="text"
                    placeholder="e.g. A12 (Upper Berth)"
                    value={formData.seatNumber}
                    onChange={(e) => setFormData({ ...formData, seatNumber: e.target.value })}
                    className="w-full px-3.5 py-2 border rounded-xl text-sm font-mono"
                  />
                </div>

                {/* Class */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Bus Class / Type</label>
                  <input
                    type="text"
                    placeholder="e.g. AC Sleeper / Multi-Axle Volvo"
                    value={formData.busClass}
                    onChange={(e) => setFormData({ ...formData, busClass: e.target.value })}
                    className="w-full px-3.5 py-2 border rounded-xl text-sm"
                  />
                </div>

                {/* Ticket Status */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ticket Status</label>
                  <select
                    value={formData.ticketStatus}
                    onChange={(e) => setFormData({ ...formData, ticketStatus: e.target.value as any })}
                    className="w-full px-3.5 py-2 border rounded-xl text-sm font-bold"
                  >
                    <option value="Requested">Requested</option>
                    <option value="Processing">Processing</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Issued">Issued</option>
                    <option value="Rescheduled">Rescheduled</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Internal Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Internal Notes</label>
                <textarea
                  rows={2}
                  placeholder="Boarding point landmarks, luggage notes..."
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
                  className="px-5 py-2.5 text-sm font-semibold bg-purple-600 text-white hover:bg-purple-700 rounded-xl shadow-md disabled:opacity-50 flex items-center"
                >
                  {submitting && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                  {editingId ? 'Save Changes' : 'Save Bus Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
      {viewingTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-purple-600 text-white rounded-lg">
                  <Bus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Bus Ticket Details</h3>
                  <p className="text-xs text-slate-500 font-mono">{viewingTicket.pnr}</p>
                </div>
              </div>
              <button onClick={() => setViewingTicket(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <div className="text-slate-400 font-semibold">Operator / Bus</div>
                  <div className="font-bold text-slate-900">{viewingTicket.operator}</div>
                  {viewingTicket.busNumber && <div className="font-mono text-purple-700">Bus #{viewingTicket.busNumber}</div>}
                </div>

                <div>
                  <div className="text-slate-400 font-semibold">PNR / Reference</div>
                  <div className="font-mono font-bold text-slate-900 text-sm">{viewingTicket.pnr}</div>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeClass(viewingTicket.ticketStatus)}`}>
                      {viewingTicket.ticketStatus}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="text-slate-400 font-semibold">Passenger Name</div>
                  <div className="font-bold text-slate-800">{viewingTicket.passengerName}</div>
                </div>

                <div>
                  <div className="text-slate-400 font-semibold">Seat & Type</div>
                  <div className="font-bold text-slate-800">
                    {viewingTicket.seatNumber || 'N/A'} {viewingTicket.busClass ? `(${viewingTicket.busClass})` : ''}
                  </div>
                </div>

                <div className="col-span-2">
                  <div className="text-slate-400 font-semibold">Boarding → Dropoff Route</div>
                  <div className="font-bold text-slate-900">{viewingTicket.departureLocation} → {viewingTicket.arrivalLocation}</div>
                </div>

                <div>
                  <div className="text-slate-400 font-semibold">Departure Time</div>
                  <div className="font-medium text-slate-800">{new Date(viewingTicket.departureDateTime).toLocaleString('en-GB')}</div>
                </div>

                <div>
                  <div className="text-slate-400 font-semibold">Arrival Time</div>
                  <div className="font-medium text-slate-800">{new Date(viewingTicket.arrivalDateTime).toLocaleString('en-GB')}</div>
                </div>

                {viewingTicket.tour && (
                  <div className="col-span-2 pt-2 border-t border-slate-200">
                    <div className="text-slate-400 font-semibold">Linked Tour</div>
                    <div className="font-bold text-indigo-600">{viewingTicket.tour.tourReference} — {viewingTicket.tour.destination}</div>
                  </div>
                )}

                {viewingTicket.internalNotes && (
                  <div className="col-span-2 pt-2 border-t border-slate-200">
                    <div className="text-slate-400 font-semibold">Internal Notes</div>
                    <div className="text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200">{viewingTicket.internalNotes}</div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setViewingTicket(null)}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-100"
              >
                Close
              </button>
            </div>
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
              <h3 className="text-lg font-bold text-slate-900">Delete Bus Ticket?</h3>
              <p className="text-sm text-slate-600">
                Are you sure you want to delete this bus ticket?
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
