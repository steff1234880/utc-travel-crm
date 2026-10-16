import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import api from '../../../../services/api';

interface RefundFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function RefundForm({ onClose, onSuccess }: RefundFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [customers, setCustomers] = useState<any[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    customerId: '',
    quotationId: '',
    amount: '',
    reason: '',
    date: new Date().toISOString().split('T')[0]
  });

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
      const res = await api.get(`/crm/quotations`);
      if (res.data.success) {
        setQuotations(res.data.data.filter((q: any) => q.status === 'APPROVED'));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const [maxRefundable, setMaxRefundable] = useState<number | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);
  };

  const fetchBalance = async (quotationId: string) => {
    if (!quotationId) {
      setMaxRefundable(null);
      return;
    }
    try {
      const res = await api.get(`/accounting/payments/balance/${quotationId}`);
      if (res.data.success) {
        const { totalPaid, totalRefunded } = res.data.data;
        const refundable = Math.max(0, totalPaid - totalRefunded);
        setMaxRefundable(refundable);
      }
    } catch (e) {
      console.error(e);
      setMaxRefundable(null);
    }
  };

  const handleCustomerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const custId = e.target.value;
    setFormData({ ...formData, customerId: custId, quotationId: '' });
    setMaxRefundable(null);
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
    if (!formData.customerId || !formData.amount || !formData.reason) {
      setError('Customer, Amount, and Reason are required');
      return;
    }

    const numAmount = parseFloat(formData.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Refund amount must be a positive number greater than 0');
      return;
    }

    if (maxRefundable !== null && numAmount > maxRefundable) {
      setError(`Refund amount cannot exceed eligible refundable amount of ${formatCurrency(maxRefundable)}`);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await api.post('/accounting/payments/refunds', formData);
      if (res.data.success) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to process refund');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-orange-50">
          <h2 className="text-xl font-bold text-orange-900">Process Refund</h2>
          <button onClick={onClose} className="text-orange-400 hover:text-orange-600 transition-colors">
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
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
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
            <label className="block text-sm font-medium text-slate-700 mb-1">Approved Quotation / Booking</label>
            <select
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-slate-50 disabled:text-slate-500"
              value={formData.quotationId}
              onChange={handleQuotationChange}
              disabled={quotations.length === 0}
            >
              <option value="">Select Quotation</option>
              {quotations
                .filter(q => formData.customerId ? q.customerId === formData.customerId : true)
                .map(q => (
                <option key={q.id} value={q.id}>
                  {q.quotationNumber} - {formatCurrency(q.finalAmount)}
                  {!formData.customerId && ` - Customer ID: ${q.customerId.substring(0,6)}`}
                </option>
              ))}
            </select>
            {maxRefundable !== null && (
              <p className="text-sm text-orange-600 mt-1 font-medium">Max Refundable: {formatCurrency(maxRefundable)}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Refund Amount *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
              <input
                type="date"
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Reason for Refund *</label>
            <textarea
              required
              rows={3}
              placeholder="Provide a detailed reason for processing this refund..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
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
              className="px-6 py-2 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Process Refund'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
