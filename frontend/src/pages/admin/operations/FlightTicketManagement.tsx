import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Plane,
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
  Ticket
} from 'lucide-react';
import { operationsService, FlightTicket, Tour } from '../../../services/operationsService';

export default function FlightTicketManagement() {
  const [tickets, setTickets] = useState<FlightTicket[]>([]);
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

  // Form State
  const [formData, setFormData] = useState({
    tourId: '',
    passengerName: '',
    tourTravellerId: '',
    bookingReference: '',
    airline: '',
    flightNumber: '',
    departureAirport: '',
    arrivalAirport: '',
    departureDateTime: '',
    arrivalDateTime: '',
    pnr: '',
    ticketNumber: '',
    ticketStatus: 'Requested' as 'Requested' | 'Processing' | 'Confirmed' | 'Issued' | 'Cancelled' | 'Rescheduled',
    internalNotes: '',
  });

  const fetchTickets = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await operationsService.getFlightTickets({
        search,
        status: statusFilter,
        page,
        limit: 10,
      });
      setTickets(data.tickets);
      setPagination(data.pagination);
    } catch (err: any) {
      console.error('Error fetching flight tickets:', err);
      setError('Failed to fetch flight tickets.');
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
  }, [search, statusFilter, page]);

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

  const handleOpenCreateModal = () => {
    loadToursList();
    setEditingId(null);
    setFormData({
      tourId: '',
      passengerName: '',
      tourTravellerId: '',
      bookingReference: '',
      airline: '',
      flightNumber: '',
      departureAirport: '',
      arrivalAirport: '',
      departureDateTime: '',
      arrivalDateTime: '',
      pnr: '',
      ticketNumber: '',
      ticketStatus: 'Requested',
      internalNotes: '',
    });
    setShowModal(true);
  };

  const formatForDatetimeInput = (dateStr?: string | null) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const pad = (num: number) => String(num).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const handleOpenEditModal = (t: FlightTicket) => {
    loadToursList();
    setEditingId(t.id);
    setFormData({
      tourId: t.tourId,
      passengerName: t.passengerName,
      tourTravellerId: t.tourTravellerId || '',
      bookingReference: t.bookingReference || '',
      airline: t.airline,
      flightNumber: t.flightNumber,
      departureAirport: t.departureAirport,
      arrivalAirport: t.arrivalAirport,
      departureDateTime: formatForDatetimeInput(t.departureDateTime),
      arrivalDateTime: formatForDatetimeInput(t.arrivalDateTime),
      pnr: t.pnr,
      ticketNumber: t.ticketNumber || '',
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
    if (!formData.passengerName || !formData.airline || !formData.flightNumber || !formData.pnr) {
      alert('Passenger Name, Airline, Flight Number, and PNR are required');
      return;
    }
    if (!formData.departureAirport || !formData.arrivalAirport) {
      alert('Departure and Arrival Airports are required');
      return;
    }
    if (!formData.departureDateTime || !formData.arrivalDateTime) {
      alert('Departure and Arrival Date/Times are required');
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        await operationsService.updateFlightTicket(editingId, formData);
      } else {
        await operationsService.createFlightTicket(formData);
      }
      setShowModal(false);
      fetchTickets();
    } catch (err: any) {
      console.error('Error saving flight ticket:', err);
      alert(err?.response?.data?.error || 'Failed to save flight ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (ticketId: string) => {
    if (!confirm('Are you sure you want to delete this flight ticket?')) return;
    try {
      await operationsService.deleteFlightTicket(ticketId);
      fetchTickets();
    } catch (err) {
      alert('Failed to delete flight ticket');
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
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-md">
              <Plane className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Flight Ticket Management</h1>
              <p className="text-sm font-medium text-slate-500 mt-0.5">Manage airline tickets, PNRs, flight schedules & passenger manifests</p>
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
            className="flex items-center px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-xl shadow-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5 mr-1.5" />
            Add Flight Ticket
          </button>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
        {/* Filters Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search PNR, passenger, airline, flight #, ticket #, airport, tour..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
          </div>

          <div className="flex items-center space-x-3">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            >
              <option value="ALL">All Ticket Statuses</option>
              <option value="Requested">Requested</option>
              <option value="Processing">Processing</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Issued">Issued</option>
              <option value="Rescheduled">Rescheduled</option>
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

        {/* Table */}
        {loading ? (
          <div className="p-16 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-500">Loading flight tickets...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-16 text-center space-y-4">
            <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto">
              <Plane className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">No Flight Tickets Found</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                No flight ticket records match your filter criteria. Click below to add a flight ticket.
              </p>
            </div>
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-semibold rounded-xl text-sm shadow hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Add Flight Ticket
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px] tracking-wider">
                  <th className="py-3.5 px-4">Airline & Flight</th>
                  <th className="py-3.5 px-4">Passenger</th>
                  <th className="py-3.5 px-4">Tour Reference</th>
                  <th className="py-3.5 px-4">Route</th>
                  <th className="py-3.5 px-4">Schedule (Dep/Arr)</th>
                  <th className="py-3.5 px-4">PNR / Ticket #</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 flex items-center">
                        <Plane className="w-3.5 h-3.5 text-blue-600 mr-1.5" />
                        {t.airline}
                      </div>
                      <div className="text-xs text-slate-500 font-mono">Flight #{t.flightNumber}</div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {t.passengerName}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono">
                      {t.tour ? (
                        <Link to={`/admin/operations/tours/${t.tour.id}`} className="text-blue-600 hover:underline font-bold">
                          {t.tour.tourReference}
                        </Link>
                      ) : (
                        <span className="text-slate-400">N/A</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-semibold text-slate-800">
                      {t.departureAirport} → {t.arrivalAirport}
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      <div>Dep: <strong className="text-slate-800">{new Date(t.departureDateTime).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}</strong></div>
                      <div>Arr: <strong className="text-slate-800">{new Date(t.arrivalDateTime).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}</strong></div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs">
                      <div className="font-bold text-blue-900">PNR: {t.pnr}</div>
                      <div className="text-slate-400">Tkt: {t.ticketNumber || '-'}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusBadgeClass(t.ticketStatus)}`}>
                        {t.ticketStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEditModal(t)}
                        className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg inline-flex items-center"
                        title="Edit Flight Ticket"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg inline-flex items-center"
                        title="Delete Flight Ticket"
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
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-blue-700">
                <Plane className="w-5 h-5" />
                <h2 className="text-lg font-bold text-slate-900">
                  {editingId ? 'Edit Flight Ticket' : 'Add Flight Ticket'}
                </h2>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Tour Link */}
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Select Tour <span className="text-rose-500">*</span></label>
                  <select
                    required
                    value={formData.tourId}
                    onChange={(e) => handleTourSelect(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
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
                  {tours.length === 0 && (
                    <p className="text-[11px] text-amber-600 mt-1">No tours found in system. Please create a Tour first.</p>
                  )}
                </div>

                {/* Passenger Name */}
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Passenger Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={formData.passengerName}
                    onChange={(e) => setFormData({ ...formData, passengerName: e.target.value })}
                    className="w-full px-3.5 py-2 border rounded-xl text-sm"
                  />
                </div>

                {/* Airline */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Airline *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. IndiGo / Air India"
                    value={formData.airline}
                    onChange={(e) => setFormData({ ...formData, airline: e.target.value })}
                    className="w-full px-3.5 py-2 border rounded-xl text-sm"
                  />
                </div>

                {/* Flight Number */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Flight Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 6E-204"
                    value={formData.flightNumber}
                    onChange={(e) => setFormData({ ...formData, flightNumber: e.target.value })}
                    className="w-full px-3.5 py-2 border rounded-xl text-sm font-mono"
                  />
                </div>

                {/* Departure Airport */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Departure Airport *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DEL (Delhi)"
                    value={formData.departureAirport}
                    onChange={(e) => setFormData({ ...formData, departureAirport: e.target.value })}
                    className="w-full px-3.5 py-2 border rounded-xl text-sm"
                  />
                </div>

                {/* Arrival Airport */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Arrival Airport *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. COK (Kochi)"
                    value={formData.arrivalAirport}
                    onChange={(e) => setFormData({ ...formData, arrivalAirport: e.target.value })}
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
                  <label className="block font-bold text-slate-700 mb-1">PNR *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ABC123XYZ"
                    value={formData.pnr}
                    onChange={(e) => setFormData({ ...formData, pnr: e.target.value })}
                    className="w-full px-3.5 py-2 border rounded-xl text-sm font-mono font-bold"
                  />
                </div>

                {/* Ticket Number */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ticket Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 098-1234567890"
                    value={formData.ticketNumber}
                    onChange={(e) => setFormData({ ...formData, ticketNumber: e.target.value })}
                    className="w-full px-3.5 py-2 border rounded-xl text-sm font-mono"
                  />
                </div>

                {/* Booking Reference */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Booking Reference</label>
                  <input
                    type="text"
                    placeholder="e.g. BK-FLT-001"
                    value={formData.bookingReference}
                    onChange={(e) => setFormData({ ...formData, bookingReference: e.target.value })}
                    className="w-full px-3.5 py-2 border rounded-xl text-sm font-mono"
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
                  placeholder="Baggage allowances, seat preferences..."
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
                  className="px-5 py-2.5 text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 rounded-xl shadow-md disabled:opacity-50 flex items-center"
                >
                  {submitting && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                  {editingId ? 'Save Changes' : 'Save Flight Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
