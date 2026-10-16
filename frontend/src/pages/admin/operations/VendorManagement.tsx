import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Plus,
  Search,
  Filter,
  Edit,
  Power,
  RefreshCw,
  X,
  AlertCircle,
  CheckCircle2,
  FileText,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Building,
  Bus,
  Receipt
} from 'lucide-react';
import { operationsService, Vendor } from '../../../services/operationsService';

const SERVICE_TYPES = [
  'Hotel',
  'Transport Provider',
  'Airline',
  'Activity Provider',
  'Local Guide',
  'Other Supplier',
];

export default function VendorManagement() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [serviceTypeFilter, setServiceTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, limit: 10, totalPages: 1 });

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
  const [selectedVendorHistory, setSelectedVendorHistory] = useState<Vendor | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Status toggle confirmation modal
  const [vendorToToggle, setVendorToToggle] = useState<Vendor | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    companyName: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    serviceType: 'Hotel',
    paymentTerms: '',
    internalNotes: '',
    isActive: true,
  });

  const fetchVendors = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await operationsService.getVendors({
        search,
        serviceType: serviceTypeFilter,
        status: statusFilter,
        page,
        limit: 10,
      });
      setVendors(data.vendors);
      setPagination(data.pagination);
    } catch (err: any) {
      console.error('Error fetching vendors:', err);
      setError('Failed to load vendors list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, [search, serviceTypeFilter, statusFilter, page]);

  const handleOpenCreateModal = () => {
    setEditingVendorId(null);
    setFormData({
      companyName: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      serviceType: 'Hotel',
      paymentTerms: 'Net 30',
      internalNotes: '',
      isActive: true,
    });
    setModalError(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (vendor: Vendor) => {
    setEditingVendorId(vendor.id);
    setFormData({
      companyName: vendor.companyName || '',
      contactPerson: vendor.contactPerson || '',
      phone: vendor.phone || '',
      email: vendor.email || '',
      address: vendor.address || '',
      serviceType: vendor.serviceType || 'Hotel',
      paymentTerms: vendor.paymentTerms || '',
      internalNotes: vendor.internalNotes || '',
      isActive: vendor.isActive,
    });
    setModalError(null);
    setShowModal(true);
  };

  const handleOpenHistoryModal = async (id: string) => {
    try {
      const details = await operationsService.getVendorById(id);
      setSelectedVendorHistory(details);
      setShowHistoryModal(true);
    } catch (err) {
      alert('Failed to load vendor history details.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);

    try {
      if (editingVendorId) {
        await operationsService.updateVendor(editingVendorId, formData);
        setSuccessMessage('Vendor updated successfully.');
      } else {
        await operationsService.createVendor(formData);
        setSuccessMessage('Vendor created successfully.');
      }
      setShowModal(false);
      setTimeout(() => setSuccessMessage(null), 4000);
      fetchVendors();
    } catch (err: any) {
      setModalError(err?.response?.data?.error || 'Failed to save vendor');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmToggleStatus = async () => {
    if (!vendorToToggle) return;
    try {
      await operationsService.updateVendorStatus(vendorToToggle.id, !vendorToToggle.isActive);
      setSuccessMessage(`Vendor ${!vendorToToggle.isActive ? 'activated' : 'deactivated'} successfully.`);
      setTimeout(() => setSuccessMessage(null), 4000);
      setVendorToToggle(null);
      fetchVendors();
    } catch (err) {
      alert('Failed to toggle vendor status');
    }
  };

  const activeVendorsCount = vendors.filter((v) => v.isActive).length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-lg border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-blue-400 font-mono text-xs uppercase tracking-wider font-bold">
              <Building2 className="w-4 h-4" /> Operations Management — Part 2
            </div>
            <h1 className="text-2xl font-black tracking-tight mt-1 flex items-center">
              Vendor Management & Supplier Registry
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Maintain active hotel, transport, guide, and activity supplier directory with complete history tracking.
            </p>
          </div>

          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md transition-all shrink-0"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Add Vendor Record
          </button>
        </div>

        {/* Quick Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-800 text-xs">
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
            <span className="text-slate-400 uppercase text-[10px] font-bold">Total Vendors</span>
            <div className="text-lg font-black text-white mt-0.5">{pagination.total}</div>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
            <span className="text-slate-400 uppercase text-[10px] font-bold">Active Suppliers</span>
            <div className="text-lg font-black text-emerald-400 mt-0.5">{activeVendorsCount}</div>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
            <span className="text-slate-400 uppercase text-[10px] font-bold">Hotel Vendors</span>
            <div className="text-lg font-black text-amber-300 mt-0.5">
              {vendors.filter((v) => v.serviceType === 'Hotel').length}
            </div>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
            <span className="text-slate-400 uppercase text-[10px] font-bold">Transport Vendors</span>
            <div className="text-lg font-black text-blue-300 mt-0.5">
              {vendors.filter((v) => v.serviceType === 'Transport Provider').length}
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
        {/* Search & Filters */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-3 md:space-y-0 md:flex md:items-center md:justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search company name, code, contact, email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-bold text-slate-500">Service:</span>
              <select
                value={serviceTypeFilter}
                onChange={(e) => {
                  setServiceTypeFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Service Types</option>
                {SERVICE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-500">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active Only</option>
                <option value="INACTIVE">Inactive Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table View */}
        {loading ? (
          <div className="p-16 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
            <p className="text-xs font-semibold text-slate-500">Loading vendor records...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 font-semibold text-xs flex items-center justify-center">
            <AlertCircle className="w-5 h-5 mr-2" /> {error}
          </div>
        ) : vendors.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">No Vendors Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No vendor records match your search criteria. Click above to add a new supplier.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Vendor Code</th>
                  <th className="py-3 px-4">Company Name</th>
                  <th className="py-3 px-4">Service Type</th>
                  <th className="py-3 px-4">Contact Info</th>
                  <th className="py-3 px-4 text-center">Linked Records</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {vendors.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-600">{v.vendorCode}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{v.companyName}</div>
                      {v.paymentTerms && <div className="text-[10px] text-slate-400">Terms: {v.paymentTerms}</div>}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold text-[10px]">
                        {v.serviceType}
                      </span>
                    </td>
                    <td className="py-3 px-4 space-y-0.5">
                      {v.contactPerson && <div className="font-semibold text-slate-900">{v.contactPerson}</div>}
                      {v.phone && <div className="text-slate-500 flex items-center"><Phone className="w-3 h-3 mr-1 text-slate-400" />{v.phone}</div>}
                      {v.email && <div className="text-blue-600 flex items-center"><Mail className="w-3 h-3 mr-1 text-blue-400" />{v.email}</div>}
                    </td>
                    <td className="py-3 px-4 text-center text-[11px] font-semibold text-slate-600">
                      <button
                        onClick={() => handleOpenHistoryModal(v.id)}
                        className="inline-flex items-center px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors font-bold text-[10px]"
                      >
                        History ({ (v._count?.hotelReservations || 0) + (v._count?.transportReservations || 0) + (v._count?.operationalCosts || 0) })
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase border ${
                          v.isActive ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        {v.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEditModal(v)}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors inline-flex items-center font-semibold text-[11px]"
                      >
                        <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                      </button>
                      <button
                        onClick={() => setVendorToToggle(v)}
                        className={`p-1.5 rounded-lg transition-colors inline-flex items-center font-semibold text-[11px] ${
                          v.isActive ? 'bg-amber-50 hover:bg-amber-100 text-amber-700' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        <Power className="w-3.5 h-3.5 mr-1" /> {v.isActive ? 'Deactivate' : 'Activate'}
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
              Showing page {page} of {pagination.totalPages} ({pagination.total} total vendors)
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

      {/* CREATE / EDIT VENDOR MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                {editingVendorId ? 'Edit Vendor Record' : 'Add New Vendor'}
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
              <div>
                <label className="block font-bold text-slate-700 mb-1">Company / Vendor Name *</label>
                <input
                  type="text"
                  required
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder="E.g., Grand Hyatt Regency, Himalayan Treks Pvt Ltd"
                  className="w-full px-3.5 py-2 bg-slate-50 border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Service Type *</label>
                  <select
                    value={formData.serviceType}
                    onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border rounded-xl"
                  >
                    {SERVICE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    placeholder="Key contact name..."
                    className="w-full px-3.5 py-2 bg-slate-50 border rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full px-3.5 py-2 bg-slate-50 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="vendor@company.com"
                    className="w-full px-3.5 py-2 bg-slate-50 border rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Office / Billing Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Full office address..."
                  className="w-full px-3.5 py-2 bg-slate-50 border rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Terms</label>
                <input
                  type="text"
                  value={formData.paymentTerms}
                  onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                  placeholder="E.g., 50% Advance, Net 30 days"
                  className="w-full px-3.5 py-2 bg-slate-50 border rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Internal Remarks</label>
                <textarea
                  rows={2}
                  value={formData.internalNotes}
                  onChange={(e) => setFormData({ ...formData, internalNotes: e.target.value })}
                  placeholder="Internal notes (never visible to public)..."
                  className="w-full px-3.5 py-2 bg-slate-50 border rounded-xl"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="vendorActiveCheck"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <label htmlFor="vendorActiveCheck" className="font-bold text-slate-700">
                  Active Vendor
                </label>
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
                  className="px-5 py-2 bg-indigo-600 text-white font-bold rounded-xl disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingVendorId ? 'Update Vendor' : 'Create Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VENDOR HISTORY DETAILS MODAL */}
      {showHistoryModal && selectedVendorHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center">
                  <Building2 className="w-5 h-5 mr-2 text-indigo-600" />
                  {selectedVendorHistory.companyName} ({selectedVendorHistory.vendorCode})
                </h3>
                <p className="text-xs text-slate-500">{selectedVendorHistory.serviceType} Supplier Details & Activity History</p>
              </div>
              <button onClick={() => setShowHistoryModal(false)}>
                <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            {/* Linked Hotel Reservations */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase flex items-center">
                <Building className="w-4 h-4 mr-1.5 text-amber-600" /> Linked Hotel Reservations ({selectedVendorHistory.hotelReservations?.length || 0})
              </h4>
              {selectedVendorHistory.hotelReservations?.length === 0 ? (
                <p className="text-xs text-slate-400 bg-slate-50 p-3 rounded-xl">No hotel reservations linked to this vendor.</p>
              ) : (
                <div className="divide-y divide-slate-100 bg-slate-50 p-3 rounded-xl text-xs space-y-2">
                  {selectedVendorHistory.hotelReservations?.map((h) => (
                    <div key={h.id} className="pt-2 flex justify-between">
                      <div>
                        <div className="font-bold text-slate-800">{h.hotelName} ({h.destination})</div>
                        <div className="text-slate-400">Tour: {h.tour?.tourReference || 'N/A'} | Customer: {h.customer?.firstName} {h.customer?.lastName}</div>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-0.5 rounded font-bold bg-amber-100 text-amber-800 text-[10px]">{h.reservationStatus}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Linked Transport Reservations */}
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase flex items-center">
                <Bus className="w-4 h-4 mr-1.5 text-blue-600" /> Linked Transport Reservations ({selectedVendorHistory.transportReservations?.length || 0})
              </h4>
              {selectedVendorHistory.transportReservations?.length === 0 ? (
                <p className="text-xs text-slate-400 bg-slate-50 p-3 rounded-xl">No transport reservations linked to this vendor.</p>
              ) : (
                <div className="divide-y divide-slate-100 bg-slate-50 p-3 rounded-xl text-xs space-y-2">
                  {selectedVendorHistory.transportReservations?.map((tr) => (
                    <div key={tr.id} className="pt-2 flex justify-between">
                      <div>
                        <div className="font-bold text-slate-800">{tr.transportType}: {tr.pickupLocation} → {tr.dropLocation}</div>
                        <div className="text-slate-400">Tour: {tr.tour?.tourReference || 'N/A'} | Ref: {tr.reservationNumber}</div>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-0.5 rounded font-bold bg-blue-100 text-blue-800 text-[10px]">{tr.reservationStatus}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Linked Operational Costs */}
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase flex items-center">
                <Receipt className="w-4 h-4 mr-1.5 text-emerald-600" /> Recorded Operational Costs ({selectedVendorHistory.operationalCosts?.length || 0})
              </h4>
              {selectedVendorHistory.operationalCosts?.length === 0 ? (
                <p className="text-xs text-slate-400 bg-slate-50 p-3 rounded-xl">No cost records linked to this vendor.</p>
              ) : (
                <div className="divide-y divide-slate-100 bg-slate-50 p-3 rounded-xl text-xs space-y-2">
                  {selectedVendorHistory.operationalCosts?.map((c) => (
                    <div key={c.id} className="pt-2 flex justify-between">
                      <div>
                        <div className="font-bold text-slate-800">{c.costReference}: {c.description} ({c.costCategory})</div>
                        <div className="text-slate-400">Tour: {c.tour?.tourReference || 'N/A'}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-900">₹{Number(c.actualCost).toLocaleString('en-IN')}</div>
                        <span className="px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800 text-[10px]">{c.paymentStatus}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ACTIVATE/DEACTIVATE CONFIRMATION POPUP */}
      {vendorToToggle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto font-bold text-lg">
              !
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {vendorToToggle.isActive ? 'Deactivate Vendor?' : 'Activate Vendor?'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to {vendorToToggle.isActive ? 'deactivate' : 'activate'} "{vendorToToggle.companyName}"?
              </p>
            </div>
            <div className="flex items-center justify-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setVendorToToggle(null)}
                className="w-1/2 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmToggleStatus}
                className="w-1/2 py-2 bg-red-600 text-white font-bold rounded-xl text-xs hover:bg-red-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
