import React, { useState, useEffect } from 'react';
import { Plus, Search, Loader2, RefreshCcw, X, User, DollarSign, FileText, Ban } from 'lucide-react';
import api from '../../../services/api';
import RefundForm from './components/RefundForm';
import PaymentReceipt from './components/PaymentReceipt';

export default function RefundManagement() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);

  const [showRefundForm, setShowRefundForm] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);

  // Stats
  const [stats, setStats] = useState({
    totalAmount: 0,
    totalCount: 0,
    completedCount: 0,
    cancelledCount: 0
  });

  // Debounce customer search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (customerSearch.trim() && !selectedCustomer) {
        api.get(`/crm/customers?search=${encodeURIComponent(customerSearch)}`).then(res => {
          setCustomers(res.data.data || []);
          setShowCustomerDropdown(true);
        }).catch(err => console.error(err));
      } else {
        setCustomers([]);
        setShowCustomerDropdown(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearch, selectedCustomer]);

  useEffect(() => {
    fetchRefunds();
  }, [page, statusFilter, selectedCustomer]);

  const fetchRefunds = async () => {
    try {
      setLoading(true);
      
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '15'
      });
      if (search) queryParams.append('search', search);
      if (statusFilter) queryParams.append('status', statusFilter);
      if (selectedCustomer) queryParams.append('customerId', selectedCustomer.id);

      const res = await api.get(`/accounting/payments/refunds?${queryParams.toString()}`);
      
      if (res.data.success) {
        const data = res.data.data || [];
        setTransactions(data);
        setTotalPages(res.data.pagination?.totalPages || 1);

        // Calculate summary stats
        let sum = 0;
        let completed = 0;
        let cancelled = 0;
        data.forEach((t: any) => {
          if (t.status === 'COMPLETED') {
            sum += t.amount || 0;
            completed++;
          } else if (t.status === 'CANCELLED') {
            cancelled++;
          }
        });
        setStats({
          totalAmount: sum,
          totalCount: res.data.pagination?.total || data.length,
          completedCount: completed,
          cancelledCount: cancelled
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch refunds');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchRefunds();
  };

  const handleCancelRefund = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel this refund? The transaction status will be marked as CANCELLED.')) return;
    try {
      const res = await api.patch(`/accounting/payments/refunds/${id}/cancel`);
      if (res.data.success) {
        fetchRefunds();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to cancel refund');
    }
  };

  const handleSuccess = () => {
    setShowRefundForm(false);
    fetchRefunds();
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Refund Management</h1>
          <p className="text-slate-500 mt-1">Process customer refunds, track refund history, and issue receipts.</p>
        </div>
        
        <div className="flex space-x-3">
          <button 
            onClick={() => setShowRefundForm(true)}
            className="px-4 py-2 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-colors flex items-center shadow-sm shadow-orange-200"
          >
            <RefreshCcw className="w-4 h-4 mr-2" />
            Process Refund
          </button>
        </div>
      </div>

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500">Total Refunded</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{formatCurrency(stats.totalAmount)}</h3>
          </div>
          <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500">Total Refund Records</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.totalCount}</h3>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <RefreshCcw className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500">Cancelled Refunds</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.cancelledCount}</h3>
          </div>
          <div className="p-3 bg-red-50 text-red-600 rounded-xl">
            <Ban className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center gap-4">
          <form onSubmit={handleSearch} className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search ref or reason..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </form>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="w-full md:w-48 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
          >
            <option value="">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="PENDING">Pending</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <div className="relative w-full md:w-80">
            {selectedCustomer ? (
              <div className="flex items-center justify-between w-full pl-4 pr-2 py-2 border border-orange-200 bg-orange-50 rounded-lg text-sm">
                <div className="flex items-center text-orange-800">
                  <User className="w-4 h-4 mr-2" />
                  <span className="font-medium">{selectedCustomer.firstName} {selectedCustomer.lastName}</span>
                </div>
                <button 
                  onClick={() => {
                    setSelectedCustomer(null);
                    setCustomerSearch('');
                  }}
                  className="p-1 hover:bg-orange-100 rounded-md text-orange-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Filter by customer..."
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  onFocus={() => { if (customers.length > 0) setShowCustomerDropdown(true); }}
                />
                
                {showCustomerDropdown && customers.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden max-h-60 overflow-y-auto">
                    {customers.map(c => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setSelectedCustomer(c);
                          setShowCustomerDropdown(false);
                          setCustomerSearch('');
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium text-slate-900 text-sm">{c.firstName} {c.lastName}</p>
                          <p className="text-xs text-slate-500">{c.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-600 border-b border-red-100 text-sm font-medium">
            {error}
          </div>
        )}

        {loading && transactions.length === 0 ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider font-semibold text-slate-500">
                  <th className="p-4">Reference</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Quotation Ref</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Reason</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Date</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500">
                      No refund records found matching the selected criteria.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx: any) => {
                    const customer = tx.refund?.customer;
                    const quotation = tx.refund?.quotation;
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4">
                          <span className="font-medium text-slate-900">{tx.referenceNumber}</span>
                        </td>
                        <td className="p-4">
                          {customer ? (
                            <div>
                              <p className="font-medium text-slate-900">{customer.firstName} {customer.lastName}</p>
                              <p className="text-xs text-slate-500">{customer.email}</p>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Unknown</span>
                          )}
                        </td>
                        <td className="p-4 text-sm text-slate-600">
                          {quotation ? quotation.quotationNumber : <span className="text-slate-400">N/A</span>}
                        </td>
                        <td className="p-4 font-bold text-orange-700">
                          {formatCurrency(tx.amount)}
                        </td>
                        <td className="p-4 text-sm text-slate-600 max-w-xs truncate" title={tx.notes || tx.refund?.reason}>
                          {tx.notes || tx.refund?.reason || 'N/A'}
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
                        <td className="p-4 text-slate-600 text-sm">
                          {new Date(tx.date).toLocaleDateString()}
                        </td>
                        <td className="p-4 text-right space-x-1">
                          <button 
                            onClick={() => setSelectedReceipt(tx)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex items-center text-xs font-medium"
                            title="View Receipt"
                          >
                            <FileText className="w-4 h-4 mr-1" />
                            Receipt
                          </button>
                          {tx.status === 'COMPLETED' && (
                            <button
                              onClick={() => handleCancelRefund(tx.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-flex items-center text-xs font-medium"
                              title="Cancel Refund"
                            >
                              <Ban className="w-4 h-4 mr-1" />
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
        
        <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
          <span className="text-sm text-slate-600 font-medium">
            Page {page} of {totalPages || 1}
          </span>
          <div className="space-x-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 bg-white border border-slate-200 text-slate-600 rounded-md text-sm font-medium disabled:opacity-50 hover:bg-slate-50 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1 bg-white border border-slate-200 text-slate-600 rounded-md text-sm font-medium disabled:opacity-50 hover:bg-slate-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {showRefundForm && (
        <RefundForm 
          onClose={() => setShowRefundForm(false)} 
          onSuccess={handleSuccess} 
        />
      )}

      {selectedReceipt && (
        <PaymentReceipt 
          payment={selectedReceipt} 
          onClose={() => setSelectedReceipt(null)} 
        />
      )}
    </div>
  );
}
