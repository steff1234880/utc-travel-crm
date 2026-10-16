import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Search, Loader2, RefreshCcw, X, User, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '../../../services/api';
import PaymentForm from './components/PaymentForm';
import RefundForm from './components/RefundForm';
import PaymentTable from './components/PaymentTable';
import PaymentReceipt from './components/PaymentReceipt';

export default function PaymentManagement() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialSearch = searchParams.get('search') || '';

  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [search, setSearch] = useState(initialSearch);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [paymentTypeFilter, setPaymentTypeFilter] = useState('');

  // Delete & feedback states
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
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
  
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [editingPayment, setEditingPayment] = useState<any | null>(null);
  const [showRefundForm, setShowRefundForm] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);

  useEffect(() => {
    const handlePopState = () => {
      if (selectedReceipt) {
        setSelectedReceipt(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedReceipt]);

  const handleViewReceipt = (receipt: any) => {
    setSelectedReceipt(receipt);
    window.history.pushState({ receiptOpen: true }, '', window.location.href);
  };

  const handleCloseReceipt = () => {
    setSelectedReceipt(null);
    if (window.history.state?.receiptOpen) {
      window.history.back();
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [page, paymentTypeFilter]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '15'
      });
      if (search) queryParams.append('search', search);
      if (selectedCustomer) queryParams.append('customerId', selectedCustomer.id);
      if (paymentTypeFilter) queryParams.append('paymentType', paymentTypeFilter);
      
      const res = await api.get(`/accounting/transactions?${queryParams.toString()}`);
      
      if (res.data.success) {
        const filtered = res.data.data.filter((t: any) => t.type === 'INCOME' || t.type === 'REFUND');
        setTransactions(filtered);
        setTotalPages(res.data.pagination?.totalPages || 1);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch payments');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchPayments();
  };

  useEffect(() => {
    setPage(1);
    fetchPayments();
  }, [selectedCustomer, paymentTypeFilter]);

  const handleSuccess = () => {
    setShowPaymentForm(false);
    setEditingPayment(null);
    setShowRefundForm(false);
    fetchPayments();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await api.delete(`/accounting/payments/${deleteTarget.id}`);
      if (res.data.success) {
        setFeedback({ type: 'success', message: 'Financial transaction deleted successfully.' });
        setDeleteTarget(null);
        fetchPayments();
      } else {
        setDeleteError(res.data.message || 'Failed to delete transaction.');
      }
    } catch (err: any) {
      console.error('Delete transaction error:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to delete transaction. Please try again.';
      setDeleteError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Toast Feedback */}
      {feedback && (
        <div className={`p-4 rounded-xl flex items-center justify-between shadow-sm border ${
          feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          <div className="flex items-center space-x-2">
            {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-rose-600" />}
            <span className="font-medium text-sm">{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600 font-bold">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Payment Management</h1>
          <p className="text-slate-500 mt-1">Record payments, process refunds, and generate receipts.</p>
        </div>
        
        <div className="flex space-x-3">
          <button 
            onClick={() => setShowRefundForm(true)}
            className="px-4 py-2 bg-orange-100 text-orange-700 font-medium rounded-lg hover:bg-orange-200 transition-colors flex items-center"
          >
            <RefreshCcw className="w-4 h-4 mr-2" />
            Process Refund
          </button>
          <button 
            onClick={() => setShowPaymentForm(true)}
            className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center shadow-sm shadow-blue-200"
          >
            <Plus className="w-5 h-5 mr-2" />
            Record Payment
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center gap-4">
          <form onSubmit={handleSearch} className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search ref or notes..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </form>

          <select
            value={paymentTypeFilter}
            onChange={(e) => setPaymentTypeFilter(e.target.value)}
            className="w-full md:w-48 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">All Payment Types</option>
            <option value="ADVANCE">Advance</option>
            <option value="PARTIAL">Partial</option>
            <option value="FINAL">Final</option>
            <option value="INCENTIVE">Incentive</option>
            <option value="COMMISSION">Commission</option>
            <option value="OTHER">Other</option>
          </select>

          <div className="relative w-full md:w-80">
            {selectedCustomer ? (
              <div className="flex items-center justify-between w-full pl-4 pr-2 py-2 border border-blue-200 bg-blue-50 rounded-lg text-sm">
                <div className="flex items-center text-blue-700">
                  <User className="w-4 h-4 mr-2" />
                  <span className="font-medium">{selectedCustomer.firstName} {selectedCustomer.lastName}</span>
                </div>
                <button 
                  onClick={() => {
                    setSelectedCustomer(null);
                    setCustomerSearch('');
                  }}
                  className="p-1 hover:bg-blue-100 rounded-md text-blue-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Filter by customer name..."
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <PaymentTable 
            transactions={transactions} 
            onViewReceipt={handleViewReceipt} 
            onEditTransaction={(tx) => { setEditingPayment(tx); setShowPaymentForm(true); }}
            onDeleteTransaction={(tx) => { setDeleteTarget(tx); setDeleteError(null); }}
          />
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

      {showPaymentForm && (
        <PaymentForm 
          onClose={() => { setShowPaymentForm(false); setEditingPayment(null); }} 
          onSuccess={handleSuccess} 
          initialData={editingPayment}
        />
      )}

      {showRefundForm && (
        <RefundForm 
          onClose={() => setShowRefundForm(false)} 
          onSuccess={handleSuccess} 
        />
      )}

      {selectedReceipt && (
        <PaymentReceipt 
          payment={selectedReceipt} 
          onClose={handleCloseReceipt} 
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 flex flex-col">
            <div className="flex items-center space-x-3 mb-4 text-red-600">
              <div className="p-3 bg-red-100 rounded-full">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Delete Financial Transaction?</h3>
            </div>

            <p className="text-slate-600 text-sm mb-4 leading-relaxed">
              Are you sure you want to delete this transaction?
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600 mb-6 space-y-1">
              <div><span className="font-semibold text-slate-800">Reference:</span> {deleteTarget.referenceNumber}</div>
              <div>
                <span className="font-semibold text-slate-800">Customer:</span> {
                  deleteTarget.customerPayment?.customer 
                    ? `${deleteTarget.customerPayment.customer.firstName} ${deleteTarget.customerPayment.customer.lastName || ''}` 
                    : 'N/A'
                }
              </div>
              <div><span className="font-semibold text-slate-800">Amount:</span> ₹{Number(deleteTarget.amount || 0).toLocaleString('en-IN')}</div>
              <div><span className="font-semibold text-slate-800">Type:</span> {deleteTarget.type} ({deleteTarget.customerPayment?.paymentType || 'Payment'})</div>
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

