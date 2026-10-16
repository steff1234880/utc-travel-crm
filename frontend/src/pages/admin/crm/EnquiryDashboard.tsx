import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Filter, RefreshCcw, Calendar, Phone, Trash2, AlertCircle, CheckCircle2, X } from 'lucide-react';
import api from '../../../services/api';

const STATUS_COLORS: Record<string, string> = {
  'NEW': 'bg-blue-100 text-blue-800 border-blue-200',
  'CONTACTED': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'FOLLOW_UP': 'bg-orange-100 text-orange-800 border-orange-200',
  'REQUIREMENT_COLLECTION': 'bg-purple-100 text-purple-800 border-purple-200',
  'QUOTATION_PREPARATION': 'bg-indigo-100 text-indigo-800 border-indigo-200',
  'QUOTATION_SENT': 'bg-cyan-100 text-cyan-800 border-cyan-200',
  'CONVERTED': 'bg-green-100 text-green-800 border-green-200',
  'LOST': 'bg-red-100 text-red-800 border-red-200',
  'CLOSED': 'bg-slate-100 text-slate-800 border-slate-200',
};

type StatsData = { total: number; newEnquiries: number; pendingFollowUps: number; converted: number; conversionRate: string };
type Enquiry = {
  id: string;
  referenceNumber: string;
  source: string;
  status: string;
  createdAt: string;
  destination?: string;
  travelDate?: string;
  travellerCount?: number;
  budgetRange?: string;
  customer: { firstName: string; lastName?: string; email: string; phone?: string };
  package?: { title: string; slug: string } | null;
};

export default function EnquiryDashboard() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  // Delete modal & feedback states
  const [deleteTarget, setDeleteTarget] = useState<Enquiry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const { data: stats } = useQuery<StatsData>({
    queryKey: ['enquiry-stats'],
    queryFn: async () => {
      const res = await api.get('/enquiries/stats');
      return res.data.data;
    },
  });

  const { data: enquiryData, isLoading, isError, refetch } = useQuery<{ data: Enquiry[]; pagination: { total: number; pages: number } }>({
    queryKey: ['enquiries', page, searchTerm, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (searchTerm) params.set('search', searchTerm);
      if (statusFilter) params.set('status', statusFilter);
      const res = await api.get(`/enquiries?${params}`);
      return res.data;
    },
  });

  const enquiries = enquiryData?.data ?? [];
  const pagination = enquiryData?.pagination;

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await api.delete(`/enquiries/${deleteTarget.id}`);
      if (res.data.success) {
        setFeedback({ type: 'success', message: 'Enquiry deleted successfully.' });
        setDeleteTarget(null);
        refetch();
        queryClient.invalidateQueries({ queryKey: ['enquiry-stats'] });
      } else {
        setDeleteError(res.data.message || 'Failed to delete enquiry.');
      }
    } catch (err: any) {
      console.error('Delete enquiry error:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to delete enquiry. Please try again.';
      setDeleteError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Feedback Alert */}
      {feedback && (
        <div className={`mb-6 p-4 rounded-xl flex items-center justify-between shadow-sm border ${
          feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          <div className="flex items-center space-x-2">
            {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-rose-600" />}
            <span className="font-medium text-sm">{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Enquiries</h1>
          <p className="text-slate-500 mt-1">Manage leads, track statuses, and schedule follow-ups.</p>
        </div>
        <div className="flex space-x-3">
          <button onClick={() => refetch()} className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 font-medium flex items-center shadow-sm">
            <RefreshCcw className="w-4 h-4 mr-2" /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Total Enquiries', value: stats ? String(stats.total) : '…' },
          { label: 'New Today', value: stats ? String(stats.newEnquiries) : '…' },
          { label: 'Pending Follow-ups', value: stats ? String(stats.pendingFollowUps) : '…' },
          { label: 'Conversion Rate', value: stats ? `${stats.conversionRate}%` : '…' },
        ].map((kpi, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-sm font-medium text-slate-500 mb-2">{kpi.label}</p>
            <h3 className="text-3xl font-bold text-slate-900">{kpi.value}</h3>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-wrap gap-3 bg-slate-50">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search name, ref, phone, email…"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">All Statuses</option>
            <option value="NEW">New</option>
            <option value="CONTACTED">Contacted</option>
            <option value="FOLLOW_UP">Follow-up Required</option>
            <option value="QUOTATION_SENT">Quotation Sent</option>
            <option value="CONVERTED">Converted</option>
            <option value="LOST">Lost</option>
          </select>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-24 text-slate-400">Loading enquiries from database…</div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-24 text-red-500">
            <p className="font-bold mb-2">Could not connect to the API.</p>
            <p className="text-sm text-slate-500">Ensure the backend server is running on port 5000.</p>
          </div>
        ) : enquiries.length === 0 ? (
          <div className="flex items-center justify-center py-24 text-slate-400">No enquiries found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100">
                  <th className="px-6 py-4 font-medium">Reference</th>
                  <th className="px-6 py-4 font-medium">Customer</th>
                  <th className="px-6 py-4 font-medium">Interest</th>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {enquiries.map((enq) => (
                  <tr key={enq.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-slate-900">{enq.referenceNumber}</span>
                      <span className="block text-xs text-slate-500">{enq.source.replace(/_/g, ' ')}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-900 block">{enq.customer.firstName} {enq.customer.lastName ?? ''}</span>
                      <span className="text-xs text-slate-500 flex items-center mt-1"><Phone className="w-3 h-3 mr-1" />{enq.customer.phone ?? 'N/A'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-700 block max-w-[200px] truncate">{enq.package?.title ?? enq.destination ?? '—'}</span>
                      {enq.budgetRange && <span className="text-xs text-slate-500">Budget: {enq.budgetRange}</span>}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600 flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {new Date(enq.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${STATUS_COLORS[enq.status] ?? 'bg-slate-100 text-slate-700'}`}>
                        {enq.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-3">
                        <Link to={`/admin/enquiries/${enq.id}`} className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                          View Details →
                        </Link>
                        <button
                          onClick={() => { setDeleteTarget(enq); setDeleteError(null); }}
                          className="text-red-600 hover:text-red-800 text-sm font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors flex items-center gap-1"
                          title="Delete Enquiry"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination && (
          <div className="p-4 border-t border-slate-100 flex justify-between items-center text-sm text-slate-500">
            <div>Showing page {page} of {pagination.pages} ({pagination.total} total)</div>
            <div className="flex space-x-1">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40">Prev</button>
              <button disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 flex flex-col">
            <div className="flex items-center space-x-3 mb-4 text-red-600">
              <div className="p-3 bg-red-100 rounded-full">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Delete Enquiry?</h3>
            </div>

            <p className="text-slate-600 text-sm mb-4 leading-relaxed">
              Are you sure you want to delete this enquiry? This action cannot be undone.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600 mb-6 space-y-1">
              <div><span className="font-semibold text-slate-800">Reference:</span> {deleteTarget.referenceNumber}</div>
              <div><span className="font-semibold text-slate-800">Customer:</span> {deleteTarget.customer.firstName} {deleteTarget.customer.lastName || ''}</div>
              <div><span className="font-semibold text-slate-800">Source:</span> {deleteTarget.source}</div>
            </div>

            {deleteError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-start">
                <AlertCircle className="w-4 h-4 mr-2 mt-0.5 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => { setDeleteTarget(null); setDeleteError(null); }}
                className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 font-medium text-sm transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium text-sm shadow-sm transition-colors flex items-center disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

