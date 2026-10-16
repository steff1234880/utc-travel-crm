import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import { 
  ArrowUpRight, ArrowDownRight, DollarSign, Wallet, FileText, 
  AlertCircle, Search, Filter, Loader2, ArrowRightLeft, CreditCard, Trash2
} from 'lucide-react';
import api from '../../../services/api';

interface DashboardSummary {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  pendingPayments: number;
  outstandingBalances: number;
  refundAmounts: number;
  gstCollected: number;
}

export default function AccountingDashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  const [dateRange, setDateRange] = useState('all'); // all, month, year, custom
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (dateRange === 'custom') {
      if (customStart && customEnd) {
        fetchData();
      }
    } else {
      fetchData();
    }
  }, [dateRange, customStart, customEnd]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      let queryParams = '';
      if (dateRange === 'month') {
        const d = new Date();
        const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();
        queryParams = `?startDate=${start}&endDate=${end}`;
      } else if (dateRange === 'year') {
        const d = new Date();
        const start = new Date(d.getFullYear(), 0, 1).toISOString();
        const end = new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999).toISOString();
        queryParams = `?startDate=${start}&endDate=${end}`;
      } else if (dateRange === 'custom') {
        if (customStart) queryParams += `?startDate=${new Date(customStart).toISOString()}`;
        if (customEnd) queryParams += (queryParams ? '&' : '?') + `endDate=${new Date(customEnd + 'T23:59:59.999Z').toISOString()}`;
      }

      if (search) {
        queryParams += (queryParams ? '&' : '?') + `search=${search}`;
      }

      const [summaryRes, trendsRes, transRes] = await Promise.all([
        api.get(`/accounting/dashboard${queryParams}`),
        api.get(`/accounting/trends${queryParams}`),
        api.get(`/accounting/transactions${queryParams}`)
      ]);

      setSummary(summaryRes.data.data);
      setTrends(trendsRes.data.data);
      setTransactions(transRes.data.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to fetch accounting data");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    fetchData(); // In real app, attach search param
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await api.delete(`/accounting/transactions/${deleteTarget.id}`);
      if (res.data.success) {
        setFeedback({ type: 'success', message: 'Transaction deleted successfully.' });
        setDeleteTarget(null);
        fetchData();
      } else {
        setDeleteError(res.data.message || 'Failed to delete transaction.');
      }
    } catch (err: any) {
      console.error('Delete transaction error:', err);
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to delete transaction.';
      setDeleteError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);
  };

  if (loading && !summary) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center shadow-sm">
          <AlertCircle className="w-5 h-5 mr-3" />
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Feedback Banner */}
      {feedback && (
        <div className={`p-4 rounded-xl flex items-center justify-between shadow-sm border ${
          feedback.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 mr-3 shrink-0" />
            <span className="text-sm font-medium">{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-xs font-semibold underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Accounting Overview</h1>
          <p className="text-slate-500 mt-1">Financial performance and transaction management</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
          {['all', 'month', 'year', 'custom'].map(range => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-colors ${
                dateRange === range ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {range === 'all' ? 'All Time' : range === 'custom' ? 'Custom' : `This ${range}`}
            </button>
          ))}
          {dateRange === 'custom' && (
            <div className="flex gap-2 border-l border-slate-200 pl-3">
              <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="text-sm border-slate-200 rounded-lg p-1" />
              <span className="text-slate-400 self-center">to</span>
              <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="text-sm border-slate-200 rounded-lg p-1" />
            </div>
          )}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between group hover:border-blue-300 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-500">Total Revenue</h3>
            <div className="p-2 bg-green-50 text-green-600 rounded-lg group-hover:bg-green-100 transition-colors">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900">{formatCurrency(summary?.totalRevenue || 0)}</h2>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between group hover:border-red-300 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-500">Total Expenses</h3>
            <div className="p-2 bg-red-50 text-red-600 rounded-lg group-hover:bg-red-100 transition-colors">
              <ArrowDownRight className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900">{formatCurrency(summary?.totalExpenses || 0)}</h2>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between group hover:border-blue-300 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-500">Net Profit</h3>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100 transition-colors">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900">{formatCurrency(summary?.netProfit || 0)}</h2>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between group hover:border-orange-300 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-500">Pending & Outstanding</h3>
            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg group-hover:bg-orange-100 transition-colors">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900">
              {formatCurrency((summary?.pendingPayments || 0) + (summary?.outstandingBalances || 0))}
            </h2>
            <p className="text-xs text-slate-500 mt-1 font-medium">{formatCurrency(summary?.outstandingBalances || 0)} from Quotes</p>
          </div>
        </div>
      </div>

      {/* Minor Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex items-center justify-between">
          <div className="flex items-center">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl mr-4">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500">GST Collected</p>
              <h4 className="text-xl font-bold text-slate-900">{formatCurrency(summary?.gstCollected || 0)}</h4>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex items-center justify-between">
          <div className="flex items-center">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl mr-4">
              <ArrowRightLeft className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500">Refund Amounts</p>
              <h4 className="text-xl font-bold text-slate-900">{formatCurrency(summary?.refundAmounts || 0)}</h4>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold text-slate-900 mb-6">Financial Trends (Current Year)</h3>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trends} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val/1000}k`} />
              <Tooltip 
                cursor={{ fill: '#F1F5F9' }} 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value: any) => formatCurrency(value)}
              />
              <Legend iconType="circle" />
              <Bar dataKey="revenue" name="Revenue" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="Expenses" fill="#EF4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-lg font-bold text-slate-900">Recent Transactions</h3>
          <form onSubmit={handleSearch} className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search reference..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </form>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider font-semibold text-slate-500">
                <th className="p-4">Ref Number</th>
                <th className="p-4">Date</th>
                <th className="p-4">Type</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Status</th>
                <th className="p-4">Method</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No transactions found for the selected period.
                  </td>
                </tr>
              ) : (
                transactions.map((tx: any) => (
                  <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <span className="font-medium text-slate-900">{tx.referenceNumber}</span>
                    </td>
                    <td className="p-4 text-slate-600 text-sm">
                      {new Date(tx.date).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        tx.type === 'INCOME' ? 'bg-green-100 text-green-700' :
                        tx.type === 'EXPENSE' ? 'bg-red-100 text-red-700' :
                        tx.type === 'REFUND' ? 'bg-orange-100 text-orange-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-slate-900">
                      {formatCurrency(tx.amount)}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        tx.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                        tx.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center text-slate-600 text-sm">
                        <CreditCard className="w-4 h-4 mr-2" />
                        {tx.paymentMethod || 'N/A'}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => {
                          setDeleteError(null);
                          setDeleteTarget(tx);
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Transaction"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center space-x-3 text-red-600 mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Delete Transaction?</h3>
            </div>
            
            <p className="text-slate-600 text-sm mb-4 leading-relaxed">
              Are you sure you want to delete this transaction? This action cannot be undone.
            </p>

            {/* Transaction Summary Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-6 text-xs space-y-1.5 text-slate-700">
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">Ref Number:</span>
                <span className="font-mono font-medium text-slate-900">{deleteTarget.referenceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">Type:</span>
                <span className="font-semibold text-slate-900">{deleteTarget.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">Amount:</span>
                <span className="font-bold text-slate-900">{formatCurrency(deleteTarget.amount)}</span>
              </div>
            </div>

            {deleteError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center">
                <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
                <span>{deleteError || 'Failed to delete transaction.'}</span>
              </div>
            )}

            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteError(null);
                }}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm transition-colors flex items-center disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
