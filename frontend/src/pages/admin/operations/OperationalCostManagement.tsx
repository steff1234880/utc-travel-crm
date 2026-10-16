import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  Edit,
  RefreshCw,
  X,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Building2,
  Compass,
  FileSpreadsheet,
  Trash2
} from 'lucide-react';
import { operationsService, OperationalCost, Vendor, Tour } from '../../../services/operationsService';

const COST_CATEGORIES = [
  'Hotel',
  'Flight',
  'Train',
  'Bus',
  'Transportation',
  'Activity',
  'Vendor',
  'Other',
];

const PAYMENT_STATUSES = ['Pending', 'Partially Paid', 'Paid', 'Cancelled'];

export default function OperationalCostManagement() {
  const [costs, setCosts] = useState<OperationalCost[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [vendorFilter, setVendorFilter] = useState('');
  const [tourFilter, setTourFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, limit: 10, totalPages: 1 });
  const [summary, setSummary] = useState({ totalEstimatedCost: 0, totalActualCost: 0 });

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [editingCostId, setEditingCostId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Delete Modal States
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [costToDelete, setCostToDelete] = useState<OperationalCost | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleOpenDeleteModal = (cost: OperationalCost) => {
    setCostToDelete(cost);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!costToDelete) return;
    setDeleting(true);
    setError(null);
    try {
      await operationsService.deleteOperationalCost(costToDelete.id);
      setSuccessMessage(`Operational cost ${costToDelete.costReference} deleted successfully.`);
      setDeleteModalOpen(false);
      setCostToDelete(null);
      fetchCosts();
    } catch (err: any) {
      console.error('Error deleting operational cost:', err);
      const msg = err?.response?.data?.error || err?.message || 'Failed to delete operational cost';
      setError(msg);
      setDeleteModalOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  // Form State
  const [formData, setFormData] = useState({
    tourId: '',
    vendorId: '',
    costCategory: 'Hotel',
    description: '',
    estimatedCost: 0,
    actualCost: 0,
    paymentStatus: 'Pending',
    costDate: new Date().toISOString().slice(0, 10),
    referenceNumber: '',
    notes: '',
    syncToAccounting: true,
  });

  const fetchCosts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await operationsService.getOperationalCosts({
        search,
        costCategory: categoryFilter,
        paymentStatus: statusFilter,
        vendorId: vendorFilter,
        tourId: tourFilter,
        page,
        limit: 10,
      });
      setCosts(data.costs);
      setPagination(data.pagination);
      if (data.summary) setSummary(data.summary);
    } catch (err: any) {
      console.error('Error fetching operational costs:', err);
      setError('Failed to load operational cost records.');
    } finally {
      setLoading(false);
    }
  };

  const loadDropdowns = async () => {
    try {
      const [vRes, tRes] = await Promise.allSettled([
        operationsService.getVendors({ limit: 100 }),
        operationsService.getTours({ limit: 100 }),
      ]);
      if (vRes.status === 'fulfilled') setVendors(vRes.value.vendors || []);
      if (tRes.status === 'fulfilled') setTours(tRes.value.tours || []);
    } catch (e) {
      console.error('Error loading cost reference options:', e);
    }
  };

  useEffect(() => {
    loadDropdowns();
  }, []);

  useEffect(() => {
    fetchCosts();
  }, [search, categoryFilter, statusFilter, vendorFilter, tourFilter, page]);

  const handleOpenCreateModal = () => {
    setEditingCostId(null);
    setFormData({
      tourId: '',
      vendorId: '',
      costCategory: 'Hotel',
      description: '',
      estimatedCost: 0,
      actualCost: 0,
      paymentStatus: 'Pending',
      costDate: new Date().toISOString().slice(0, 10),
      referenceNumber: '',
      notes: '',
      syncToAccounting: true,
    });
    setModalError(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (cost: OperationalCost) => {
    setEditingCostId(cost.id);
    setFormData({
      tourId: cost.tourId || '',
      vendorId: cost.vendorId || '',
      costCategory: cost.costCategory || 'Hotel',
      description: cost.description || '',
      estimatedCost: cost.estimatedCost || 0,
      actualCost: cost.actualCost || 0,
      paymentStatus: cost.paymentStatus || 'Pending',
      costDate: cost.costDate ? new Date(cost.costDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      referenceNumber: cost.referenceNumber || '',
      notes: cost.notes || '',
      syncToAccounting: false,
    });
    setModalError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);

    try {
      if (editingCostId) {
        await operationsService.updateOperationalCost(editingCostId, formData);
        setSuccessMessage('Operational cost updated successfully.');
      } else {
        await operationsService.createOperationalCost(formData);
        setSuccessMessage('Operational cost recorded successfully.');
      }
      setShowModal(false);
      setTimeout(() => setSuccessMessage(null), 4000);
      fetchCosts();
    } catch (err: any) {
      setModalError(err?.response?.data?.error || 'Failed to save operational cost');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, paymentStatus: string) => {
    try {
      await operationsService.updateCostStatus(id, paymentStatus);
      fetchCosts();
    } catch (err) {
      alert('Failed to update cost payment status');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-lg border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-emerald-400 font-mono text-xs uppercase tracking-wider font-bold">
              <Receipt className="w-4 h-4" /> Operations Management — Part 2
            </div>
            <h1 className="text-2xl font-black tracking-tight mt-1">
              Operational Cost Tracking & Accounting Sync
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Decimal-safe INR cost tracking linked to tours, suppliers, and integrated with Accounting Expenses.
            </p>
          </div>

          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-all shrink-0"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Record Operational Cost
          </button>
        </div>

        {/* Quick Metrics (INR) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-800 text-xs">
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
            <span className="text-slate-400 uppercase text-[10px] font-bold">Total Cost Entries</span>
            <div className="text-lg font-black text-white mt-0.5">{pagination.total}</div>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
            <span className="text-slate-400 uppercase text-[10px] font-bold">Total Estimated (INR)</span>
            <div className="text-lg font-black text-indigo-300 mt-0.5">₹{summary.totalEstimatedCost.toLocaleString('en-IN')}</div>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
            <span className="text-slate-400 uppercase text-[10px] font-bold">Total Actual Cost (INR)</span>
            <div className="text-lg font-black text-emerald-400 mt-0.5">₹{summary.totalActualCost.toLocaleString('en-IN')}</div>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
            <span className="text-slate-400 uppercase text-[10px] font-bold">Cost Variance</span>
            <div className={`text-lg font-black mt-0.5 ${summary.totalActualCost <= summary.totalEstimatedCost ? 'text-emerald-400' : 'text-rose-400'}`}>
              ₹{(summary.totalEstimatedCost - summary.totalActualCost).toLocaleString('en-IN')}
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
              placeholder="Search description, cost ref, vendor, tour..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
            >
              <option value="ALL">All Categories</option>
              {COST_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
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
              <option value="ALL">All Payment Statuses</option>
              {PAYMENT_STATUSES.map((s) => (
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
            <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
            <p className="text-xs font-semibold text-slate-500">Loading operational cost records...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 font-semibold text-xs flex items-center justify-center">
            <AlertCircle className="w-5 h-5 mr-2" /> {error}
          </div>
        ) : costs.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <Receipt className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">No Operational Costs Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No cost records match your filters. Click above to record a new operational cost.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Cost Ref</th>
                  <th className="py-3 px-4">Category & Description</th>
                  <th className="py-3 px-4">Linked Tour</th>
                  <th className="py-3 px-4">Supplier / Vendor</th>
                  <th className="py-3 px-4 text-right">Estimated (₹)</th>
                  <th className="py-3 px-4 text-right">Actual (₹)</th>
                  <th className="py-3 px-4">Payment Status</th>
                  <th className="py-3 px-4 text-center">Accounting Sync</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {costs.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-600">{c.costReference}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{c.description}</div>
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold">
                        {c.costCategory}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {c.tour ? (
                        <div>
                          <div className="font-bold text-indigo-700">{c.tour.tourReference}</div>
                          <div className="text-[10px] text-slate-400">{c.tour.destination}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400">General</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {c.vendor ? (
                        <div className="font-semibold text-slate-900">{c.vendor.companyName}</div>
                      ) : (
                        <span className="text-slate-400">Direct</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-600">
                      ₹{Number(c.estimatedCost).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      ₹{Number(c.actualCost).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={c.paymentStatus}
                        onChange={(e) => handleStatusChange(c.id, e.target.value)}
                        className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg font-bold text-[10px]"
                      >
                        {PAYMENT_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {c.expense ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <FileSpreadsheet className="w-3 h-3 mr-1" /> {c.expense.expenseNumber}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Not Synced</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEditModal(c)}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors inline-flex items-center font-semibold text-[11px]"
                      >
                        <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                      </button>
                      <button
                        onClick={() => handleOpenDeleteModal(c)}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition-colors inline-flex items-center font-semibold text-[11px] border border-rose-200"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
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
              Showing page {page} of {pagination.totalPages} ({pagination.total} records)
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

      {/* CREATE / EDIT COST MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                {editingCostId ? 'Edit Operational Cost' : 'Record Operational Cost'}
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
                <label className="block font-bold text-slate-700 mb-1">Cost Description *</label>
                <input
                  type="text"
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="E.g., Hotel room booking fee, Local guide charges"
                  className="w-full px-3.5 py-2 bg-slate-50 border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category *</label>
                  <select
                    value={formData.costCategory}
                    onChange={(e) => setFormData({ ...formData, costCategory: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border rounded-xl font-medium"
                  >
                    {COST_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payment Status</label>
                  <select
                    value={formData.paymentStatus}
                    onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border rounded-xl font-medium"
                  >
                    {PAYMENT_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
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
                  <label className="block font-bold text-slate-700 mb-1">Linked Vendor (Optional)</label>
                  <select
                    value={formData.vendorId}
                    onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border rounded-xl font-medium"
                  >
                    <option value="">-- Direct Payment / No Vendor --</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.companyName} ({v.vendorCode})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Estimated Cost (INR ₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.estimatedCost}
                    onChange={(e) => setFormData({ ...formData, estimatedCost: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 bg-slate-50 border rounded-xl font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Actual Cost (INR ₹) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={formData.actualCost}
                    onChange={(e) => setFormData({ ...formData, actualCost: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 bg-slate-50 border rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cost Date</label>
                  <input
                    type="date"
                    value={formData.costDate}
                    onChange={(e) => setFormData({ ...formData, costDate: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Vendor Invoice / Ref #</label>
                  <input
                    type="text"
                    value={formData.referenceNumber}
                    onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                    placeholder="Invoice # / Receipt #"
                    className="w-full px-3.5 py-2 bg-slate-50 border rounded-xl"
                  />
                </div>
              </div>

              {!editingCostId && (
                <div className="flex items-center space-x-2 pt-1 bg-indigo-50/60 p-3 rounded-xl border border-indigo-100">
                  <input
                    type="checkbox"
                    id="syncAccountingCheck"
                    checked={formData.syncToAccounting}
                    onChange={(e) => setFormData({ ...formData, syncToAccounting: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <label htmlFor="syncAccountingCheck" className="font-bold text-indigo-900">
                    Sync to Accounting Expenses (No duplicate record created)
                  </label>
                </div>
              )}

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
                  className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-xl disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingCostId ? 'Update Cost' : 'Record Cost'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteModalOpen && costToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-rose-100 text-rose-600 rounded-full">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Delete Operational Cost?</h3>
                <p className="text-xs text-slate-500 font-medium">This action cannot be undone.</p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-1.5 text-slate-700">
              <p><span className="font-semibold text-slate-900">Reference:</span> {costToDelete.costReference}</p>
              <p><span className="font-semibold text-slate-900">Category:</span> {costToDelete.costCategory}</p>
              <p><span className="font-semibold text-slate-900">Description:</span> {costToDelete.description}</p>
              <p><span className="font-semibold text-slate-900">Actual Cost:</span> ₹{Number(costToDelete.actualCost).toLocaleString('en-IN')}</p>
              {costToDelete.expense && (
                <p className="text-amber-700 font-medium pt-1.5 border-t border-slate-200 flex items-center">
                  <AlertCircle className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                  Note: Linked Accounting Expense ({costToDelete.expense.expenseNumber}) will be preserved in Accounting for financial audit compliance.
                </p>
              )}
            </div>

            <p className="text-xs font-semibold text-slate-700">
              Are you sure you want to delete this operational cost?
            </p>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => { setDeleteModalOpen(false); setCostToDelete(null); }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center shadow-md disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    Yes, Delete Cost
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
