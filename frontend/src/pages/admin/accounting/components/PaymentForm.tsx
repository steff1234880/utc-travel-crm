import React, { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import api from '../../../../services/api';

interface PaymentFormProps {
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
}

export default function PaymentForm({ onClose, onSuccess, initialData }: PaymentFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [customers, setCustomers] = useState<any[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    customerId: initialData?.customerPayment?.customerId || '',
    quotationId: initialData?.customerPayment?.quotationId || '',
    amount: initialData ? initialData.amount.toString() : '',
    paymentType: initialData?.customerPayment?.paymentType || 'PARTIAL',
    paymentMethod: initialData?.paymentMethod || 'BANK_TRANSFER',
    status: initialData?.status || 'COMPLETED',
    date: initialData?.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    notes: initialData?.notes || ''
  });

  const isEditMode = !!initialData;

  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    fetchCustomers();
    fetchQuotations();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await api.get('/crm/customers');
      if (res.data.success) {
        setCustomers(res.data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchQuotations = async () => {
    try {
      // Use the dedicated payable-quotations endpoint which correctly filters
      // by status 'ACCEPTED' and 'SENT' (the actual valid statuses in this system).
      const res = await api.get(`/accounting/payments/payable-quotations`);
      if (res.data.success) {
        setQuotations(res.data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchBalance = async (quotationId: string) => {
    if (!quotationId) {
      setBalance(null);
      return;
    }
    try {
      const res = await api.get(`/accounting/payments/balance/${quotationId}`);
      if (res.data.success) {
        setBalance(res.data.data.outstandingBalance);
        setFormData(prev => ({ ...prev, amount: res.data.data.outstandingBalance.toString() }));
      }
    } catch (e) {
      console.error(e);
      setBalance(null);
    }
  };

  const handleCustomerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const custId = e.target.value;
    setFormData({ ...formData, customerId: custId, quotationId: '' });
    setBalance(null);
  };

  const handleQuotationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const qId = e.target.value;
    const selectedQuotation = quotations.find((q: any) => q.id === qId);
    
    setFormData({ 
      ...formData, 
      quotationId: qId,
      customerId: selectedQuotation ? selectedQuotation.customerId : formData.customerId
    });
    
    fetchBalance(qId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId || !formData.amount) {
      setError('Customer and Amount are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      let res;
      if (isEditMode) {
        res = await api.put(`/accounting/payments/${initialData.id}`, formData);
      } else {
        res = await api.post('/accounting/payments', formData);
      }
      
      if (res.data.success) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to process payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-900">{isEditMode ? 'Edit Payment' : 'Record New Payment'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Customer *</label>
            <select
              required
              disabled={isEditMode}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
              value={formData.customerId}
              onChange={handleCustomerChange}
            >
              <option value="">Select Customer</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.firstName} {c.lastName} ({c.email})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Linked Quotation (Accepted or Sent)</label>
            <select
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
              value={formData.quotationId}
              onChange={handleQuotationChange}
              disabled={isEditMode}
            >
              <option value="">— No linked quotation —</option>
              {quotations
                .filter(q => formData.customerId ? q.customerId === formData.customerId : true)
                .map(q => (
                <option key={q.id} value={q.id}>
                  {q.quotationNumber} - {q.destination} (${q.finalAmount})
                  {!formData.customerId && ` - Customer ID: ${q.customerId.substring(0,6)}`}
                </option>
              ))}
            </select>
            {balance !== null && (
              <p className="text-sm text-blue-600 mt-1 font-medium">Outstanding Balance: ${balance}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Amount *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                disabled={isEditMode}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
              <input
                type="date"
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Payment Type</label>
              <select
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.paymentType}
                onChange={(e) => setFormData({ ...formData, paymentType: e.target.value })}
              >
                <option value="ADVANCE">Advance</option>
                <option value="PARTIAL">Partial</option>
                <option value="FINAL">Final</option>
                <option value="INCENTIVE">Incentive</option>
                <option value="COMMISSION">Commission</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method</label>
              <select
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
              >
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CREDIT_CARD">Credit Card</option>
                <option value="CASH">Cash</option>
                <option value="CHEQUE">Cheque</option>
                <option value="ONLINE">Online Gateway</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="COMPLETED">Completed</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : isEditMode ? 'Save Changes' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
