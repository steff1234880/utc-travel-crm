import React, { useState, useEffect } from 'react';
import {
  Bus,
  Plus,
  Search,
  Filter,
  Edit,
  RefreshCw,
  X,
  AlertCircle,
  CheckCircle2,
  MapPin,
  Calendar,
  Users,
  Building2,
  Clock,
  Car
} from 'lucide-react';
import { operationsService, TransportReservation, Vendor, Tour } from '../../../services/operationsService';

const TRANSPORT_TYPES = ['Car', 'Bus', 'Van', 'Train transfer', 'Other'];
const STATUSES = ['Requested', 'Pending', 'Confirmed', 'Modified', 'Cancelled', 'Completed'];

export default function TransportManagement() {
  const [reservations, setReservations] = useState<TransportReservation[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [transportTypeFilter, setTransportTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, limit: 10, totalPages: 1 });

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    tourId: '',
    customerId: '',
    vendorId: '',
    transportType: 'Car',
    vehicleServiceNumber: '',
    pickupLocation: '',
    dropLocation: '',
    pickupDateTime: '',
    dropDateTime: '',
    passengerCount: 1,
    bookingReference: '',
    confirmationNumber: '',
    reservationStatus: 'Requested',
    estimatedCost: 0,
    actualCost: 0,
    internalNotes: '',
  });

  const fetchReservations = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await operationsService.getTransportReservations({
        search,
        transportType: transportTypeFilter,
        status: statusFilter,
        page,
        limit: 10,
      });
      setReservations(data.reservations);
      setPagination(data.pagination);
    } catch (err: any) {
      console.error('Error fetching transport reservations:', err);
      setError('Failed to load transport reservations.');
    } finally {
      setLoading(false);
    }
  };

  const loadDropdowns = async () => {
    try {
      const [vRes, tRes, cRes] = await Promise.allSettled([
        operationsService.getVendors({ limit: 100 }),
        operationsService.getTours({ limit: 100 }),
        operationsService.getCustomers(),
      ]);
      if (vRes.status === 'fulfilled') setVendors(vRes.value.vendors || []);
      if (tRes.status === 'fulfilled') setTours(tRes.value.tours || []);
      if (cRes.status === 'fulfilled') setCustomers(cRes.value || []);
    } catch (e) {
      console.error('Error loading dropdown options:', e);
    }
  };

  useEffect(() => {
    loadDropdowns();
  }, []);

  useEffect(() => {
    fetchReservations();
  }, [search, transportTypeFilter, statusFilter, page]);

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setFormData({
      tourId: '',
      customerId: '',
      vendorId: '',
      transportType: 'Car',
      vehicleServiceNumber: '',
      pickupLocation: '',
      dropLocation: '',
      pickupDateTime: new Date().toISOString().slice(0, 16),
      dropDateTime: '',
      passengerCount: 1,
      bookingReference: '',
      confirmationNumber: '',
      reservationStatus: 'Requested',
      estimatedCost: 0,
      actualCost: 0,
      internalNotes: '',
    });
    setModalError(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (r: TransportReservation) => {
    setEditingId(r.id);
    setFormData({
      tourId: r.tourId || '',
      customerId: r.customerId || '',
      vendorId: r.vendorId || '',
      transportType: r.transportType || 'Car',
      vehicleServiceNumber: r.vehicleServiceNumber || '',
      pickupLocation: r.pickupLocation || '',
      dropLocation: r.dropLocation || '',
      pickupDateTime: r.pickupDateTime ? new Date(r.pickupDateTime).toISOString().slice(0, 16) : '',
      dropDateTime: r.dropDateTime ? new Date(r.dropDateTime).toISOString().slice(0, 16) : '',
      passengerCount: r.passengerCount || 1,
      bookingReference: r.bookingReference || '',
      confirmationNumber: r.confirmationNumber || '',
      reservationStatus: r.reservationStatus || 'Requested',
      estimatedCost: r.estimatedCost || 0,
      actualCost: r.actualCost || 0,
      internalNotes: r.internalNotes || '',
    });
    setModalError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);

    try {
      if (editingId) {
        await operationsService.updateTransportReservation(editingId, formData);
        setSuccessMessage('Transport reservation updated successfully.');
      } else {
        await operationsService.createTransportReservation(formData);
        setSuccessMessage('Transport reservation created successfully.');
      }
      setShowModal(false);
      setTimeout(() => setSuccessMessage(null), 4000);
      fetchReservations();
    } catch (err: any) {
      setModalError(err?.response?.data?.error || 'Failed to save transport reservation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await operationsService.updateTransportStatus(id, status);
      fetchReservations();
    } catch (err) {
      alert('Failed to update transport status');
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
      case 'Cancelled':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-lg border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-blue-400 font-mono text-xs uppercase tracking-wider font-bold">
              <Car className="w-4 h-4" /> Operations Management — Part 2
            </div>
            <h1 className="text-2xl font-black tracking-tight mt-1 flex items-center">
              Transport Reservation Management
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Manage car, bus, van, and transfer pick-ups/drop-offs with vendor assignments and confirmation tracking.
            </p>
          </div>

          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition-all shrink-0"
          >
            <Plus className="w-4 h-4 mr-1.5" /> New Transport Reservation
          </button>
        </div>

        {/* Quick Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-800 text-xs">
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
            <span className="text-slate-400 uppercase text-[10px] font-bold">Total Reservations</span>
            <div className="text-lg font-black text-white mt-0.5">{pagination.total}</div>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
            <span className="text-slate-400 uppercase text-[10px] font-bold">Confirmed Pickups</span>
            <div className="text-lg font-black text-emerald-400 mt-0.5">
              {reservations.filter((r) => r.reservationStatus === 'Confirmed').length}
            </div>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
            <span className="text-slate-400 uppercase text-[10px] font-bold">Pending Confirmation</span>
            <div className="text-lg font-black text-amber-300 mt-0.5">
              {reservations.filter((r) => ['Requested', 'Pending'].includes(r.reservationStatus)).length}
            </div>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
            <span className="text-slate-400 uppercase text-[10px] font-bold">Assigned Vendors</span>
            <div className="text-lg font-black text-indigo-300 mt-0.5">
              {reservations.filter((r) => r.vendorId).length}
            </div>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center shadow-sm">
          <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600 shrink-0" />
          {successMessage}
        </div>
      )}

      {/* Main Content Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-3 md:space-y-0 md:flex md:items-center md:justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search pickup, drop location, ref, tour, vendor..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={transportTypeFilter}
              onChange={(e) => {
                setTransportTypeFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
            >
              <option value="ALL">All Vehicle Types</option>
              {TRANSPORT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
            >
              <option value="ALL">All Statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table View */}
        {loading ? (
          <div className="p-16 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
            <p className="text-xs font-semibold text-slate-500">Loading transport reservations...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 font-semibold text-xs flex items-center justify-center">
            <AlertCircle className="w-5 h-5 mr-2" /> {error}
          </div>
        ) : reservations.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <Car className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">No Transport Reservations Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No transport records match your search criteria. Click above to create a new reservation.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Reservation Ref</th>
                  <th className="py-3 px-4">Vehicle & Type</th>
                  <th className="py-3 px-4">Pickup / Drop Location</th>
                  <th className="py-3 px-4">Pickup Date & Time</th>
                  <th className="py-3 px-4">Tour / Customer</th>
                  <th className="py-3 px-4">Vendor</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {reservations.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-600">{r.reservationNumber}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{r.transportType}</div>
                      {r.vehicleServiceNumber && <div className="text-[10px] font-mono text-slate-500">{r.vehicleServiceNumber}</div>}
                    </td>
                    <td className="py-3 px-4 space-y-0.5">
                      <div className="font-semibold text-slate-900 flex items-center">
                        <MapPin className="w-3 h-3 text-rose-500 mr-1 shrink-0" /> {r.pickupLocation}
                      </div>
                      <div className="text-slate-500 flex items-center">
                        <MapPin className="w-3 h-3 text-blue-500 mr-1 shrink-0" /> {r.dropLocation}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">
                      <div>{new Date(r.pickupDateTime).toLocaleDateString('en-GB')}</div>
                      <div className="text-slate-400">{new Date(r.pickupDateTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td className="py-3 px-4">
                      {r.tour && <div className="font-bold text-indigo-700">{r.tour.tourReference}</div>}
                      {r.customer && <div className="text-slate-600 font-medium">{r.customer.firstName} {r.customer.lastName || ''}</div>}
                    </td>
                    <td className="py-3 px-4">
                      {r.vendor ? (
                        <div className="font-semibold text-slate-900">{r.vendor.companyName}</div>
                      ) : (
                        <span className="text-xs text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={r.reservationStatus}
                        onChange={(e) => handleStatusChange(r.id, e.target.value)}
                        className={`px-2.5 py-1 rounded-lg font-bold text-[10px] border ${getStatusBadgeClass(r.reservationStatus)}`}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenEditModal(r)}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors inline-flex items-center font-semibold text-[11px]"
                      >
                        <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">
              Showing page {page} of {pagination.totalPages} ({pagination.total} reservations)
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

      {/* CREATE / EDIT TRANSPORT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                {editingId ? 'Edit Transport Reservation' : 'New Transport Reservation'}
              </h3>
              <button onClick={() => setShowModal(false)}>
                <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Transport Type *</label>
                  <select
                    value={formData.transportType}
                    onChange={(e) => setFormData({ ...formData, transportType: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border rounded-xl font-medium"
                  >
                    {TRANSPORT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Vehicle / Service #</label>
                  <input
                    type="text"
                    value={formData.vehicleServiceNumber}
                    onChange={(e) => setFormData({ ...formData, vehicleServiceNumber: e.target.value })}
                    placeholder="E.g., MH02-AB1234, Tempo Traveller"
                    className="w-full px-3.5 py-2 bg-slate-50 border rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Pickup Location *</label>
                  <input
                    type="text"
                    required
                    value={formData.pickupLocation}
                    onChange={(e) => setFormData({ ...formData, pickupLocation: e.target.value })}
                    placeholder="Airport, Railway station, Hotel..."
                    className="w-full px-3.5 py-2 bg-slate-50 border rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Drop Location *</label>
                  <input
                    type="text"
                    required
                    value={formData.dropLocation}
                    onChange={(e) => setFormData({ ...formData, dropLocation: e.target.value })}
                    placeholder="Hotel, Resort, Sightseeing location..."
                    className="w-full px-3.5 py-2 bg-slate-50 border rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Pickup Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.pickupDateTime}
                    onChange={(e) => setFormData({ ...formData, pickupDateTime: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Drop Date & Time (Optional)</label>
                  <input
                    type="datetime-local"
                    value={formData.dropDateTime}
                    onChange={(e) => setFormData({ ...formData, dropDateTime: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Linked Tour (Optional)</label>
                  <select
                    value={formData.tourId}
                    onChange={(e) => setFormData({ ...formData, tourId: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border rounded-xl font-medium"
                  >
                    <option value="">-- No Specific Tour --</option>
                    {tours.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.tourReference} ({t.destination})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Assigned Transport Vendor</label>
                  <select
                    value={formData.vendorId}
                    onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border rounded-xl font-medium"
                  >
                    <option value="">-- Unassigned / Direct --</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.companyName} ({v.serviceType})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Passenger Count</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.passengerCount}
                    onChange={(e) => setFormData({ ...formData, passengerCount: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3.5 py-2 bg-slate-50 border rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Estimated Cost (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.estimatedCost}
                    onChange={(e) => setFormData({ ...formData, estimatedCost: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 bg-slate-50 border rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Actual Cost (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.actualCost}
                    onChange={(e) => setFormData({ ...formData, actualCost: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 bg-slate-50 border rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Booking Reference</label>
                  <input
                    type="text"
                    value={formData.bookingReference}
                    onChange={(e) => setFormData({ ...formData, bookingReference: e.target.value })}
                    placeholder="Vendor booking ref..."
                    className="w-full px-3.5 py-2 bg-slate-50 border rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Confirmation Number</label>
                  <input
                    type="text"
                    value={formData.confirmationNumber}
                    onChange={(e) => setFormData({ ...formData, confirmationNumber: e.target.value })}
                    placeholder="Confirmation / Voucher #"
                    className="w-full px-3.5 py-2 bg-slate-50 border rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Internal Driver / Transfer Notes</label>
                <textarea
                  rows={2}
                  value={formData.internalNotes}
                  onChange={(e) => setFormData({ ...formData, internalNotes: e.target.value })}
                  placeholder="Driver name, contact number, vehicle model..."
                  className="w-full px-3.5 py-2 bg-slate-50 border rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3">
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
                  className="px-5 py-2 bg-blue-600 text-white font-bold rounded-xl disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingId ? 'Update Reservation' : 'Create Reservation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
