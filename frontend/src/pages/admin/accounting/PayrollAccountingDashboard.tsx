import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, Clock, AlertCircle, Plus, X } from 'lucide-react';
import api from '../../../services/api';
import toast from 'react-hot-toast';

interface Employee { id: string; firstName: string; lastName: string; }

interface IncentiveForm {
  employeeId: string;
  type: 'INCENTIVE' | 'COMMISSION';
  amount: string;
  reason: string;
  period: string;
  notes: string;
}

const defaultForm: IncentiveForm = {
  employeeId: '',
  type: 'INCENTIVE',
  amount: '',
  reason: '',
  period: '',
  notes: '',
};

export default function PayrollAccountingDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [form, setForm] = useState<IncentiveForm>(defaultForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchDashboard();
    fetchEmployees();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.get('/accounting/payroll/dashboard');
      setData(res.data.data);
    } catch (error: any) {
      toast.error('Failed to load payroll accounting dashboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/hr/employees');
      setEmployees(res.data.data || res.data || []);
    } catch {
      // non-fatal
    }
  };

  const handlePay = async (id: string, category: string) => {
    try {
      setProcessingId(id);
      let endpoint = '';
      if (category === 'SALARY') endpoint = `/accounting/payroll/salary/${id}/pay`;
      else if (category === 'BONUS') endpoint = `/accounting/payroll/bonus/${id}/pay`;
      else if (category === 'INCENTIVE') endpoint = `/accounting/payroll/incentive/${id}/pay`;

      await api.patch(endpoint, { paymentMethod: 'BANK_TRANSFER' });
      toast.success(`${category} payment processed and accounted successfully`);
      fetchDashboard();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Payment failed');
    } finally {
      setProcessingId(null);
    }
  };

  const handleCreateIncentive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employeeId || !form.amount || !form.reason) {
      toast.error('Please fill in all required fields.');
      return;
    }
    try {
      setSubmitting(true);
      await api.post('/accounting/payroll/incentive/create', {
        employeeId: form.employeeId,
        type: form.type,
        amount: parseFloat(form.amount),
        reason: form.reason,
        period: form.period || undefined,
        notes: form.notes || undefined,
      });
      toast.success(`${form.type === 'INCENTIVE' ? 'Incentive' : 'Commission'} record created successfully`);
      setForm(defaultForm);
      setShowForm(false);
      fetchDashboard();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create record');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);
  };

  if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Payroll Accounting</h1>
          <p className="text-slate-500 mt-1">Review, process, and record payroll liabilities</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Incentive / Commission
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-amber-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-semibold text-amber-700 mb-1">Unpaid Liabilities</p>
              <h2 className="text-3xl font-black text-amber-700">{formatCurrency(data?.metrics?.unpaidLiability)}</h2>
              <p className="text-xs text-amber-600 mt-2">Approved salaries, bonuses, and commissions pending payment.</p>
            </div>
            <div className="p-3 bg-amber-100 rounded-xl">
              <Clock className="w-6 h-6 text-amber-700" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-semibold text-emerald-700 mb-1">Total Paid (All Time)</p>
              <h2 className="text-3xl font-black text-emerald-700">{formatCurrency(data?.metrics?.paidTotal)}</h2>
              <p className="text-xs text-emerald-600 mt-2">Fully processed and ledgered payroll expenses.</p>
            </div>
            <div className="p-3 bg-emerald-100 rounded-xl">
              <CheckCircle2 className="w-6 h-6 text-emerald-700" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pending Actions */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 bg-slate-50">
            <h3 className="font-bold text-slate-900 flex items-center">
              <AlertCircle className="w-5 h-5 text-amber-500 mr-2" /> Pending Payments
            </h3>
          </div>
          <div className="p-0 overflow-y-auto max-h-[500px]">
            {data?.pendingItems?.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No pending payroll liabilities.</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {data?.pendingItems?.map((item: any) => (
                  <li key={item.id} className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-900">{item.employee}</p>
                      <div className="flex gap-2 text-xs font-medium mt-1">
                        <span className={`px-2 py-0.5 rounded-md ${item.category === 'INCENTIVE' ? 'bg-purple-100 text-purple-700' : item.category === 'BONUS' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>{item.type}</span>
                        <span className="text-slate-500">Date: {new Date(item.date).toLocaleDateString()}</span>
                      </div>
                      {item.description && <p className="text-xs text-slate-400 mt-1 truncate max-w-[200px]">{item.description}</p>}
                    </div>
                    <div className="text-right">
                      <p className="font-black text-slate-900">{formatCurrency(item.amount)}</p>
                      {['APPROVED', 'PENDING', 'PROCESSED', 'DRAFT'].includes(item.status) ? (
                        <button
                          onClick={() => handlePay(item.id, item.category)}
                          disabled={processingId === item.id}
                          className="mt-2 text-xs px-3 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors"
                        >
                          {processingId === item.id ? 'Processing...' : 'Mark Paid & Ledger'}
                        </button>
                      ) : (
                        <span className="mt-2 block text-xs text-slate-500 uppercase tracking-wider">{item.status}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Recently Paid */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 bg-slate-50">
            <h3 className="font-bold text-slate-900 flex items-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 mr-2" /> Recently Ledgered
            </h3>
          </div>
          <div className="p-0 overflow-y-auto max-h-[500px]">
            {data?.paidItems?.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No history found.</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {data?.paidItems?.map((item: any) => (
                  <li key={item.id} className="p-4 flex justify-between items-center opacity-80">
                    <div>
                      <p className="font-bold text-slate-900">{item.employee}</p>
                      <div className="flex gap-2 text-xs font-medium mt-1">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">{item.type}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-emerald-700">{formatCurrency(item.amount)}</p>
                      <p className="text-xs text-slate-500 mt-1">Ledgered</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Add Incentive / Commission Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Add Incentive / Commission</h2>
                <p className="text-sm text-slate-500 mt-0.5">Create a new incentive or commission record for an employee</p>
              </div>
              <button onClick={() => { setShowForm(false); setForm(defaultForm); }} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateIncentive} className="p-6 space-y-5">
              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Type <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-2 gap-3">
                  {(['INCENTIVE', 'COMMISSION'] as const).map(t => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setForm(f => ({ ...f, type: t }))}
                      className={`py-2.5 rounded-xl border-2 font-semibold text-sm transition-all ${form.type === t ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                    >
                      {t === 'INCENTIVE' ? '🎯 Incentive' : '💰 Commission'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Employee */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Employee / Recipient <span className="text-red-500">*</span></label>
                <select
                  required
                  value={form.employeeId}
                  onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="">Select employee...</option>
                  {employees.map((emp: Employee) => (
                    <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount (₹) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  required
                  min="1"
                  step="0.01"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-semibold"
                />
              </div>

              {/* Reason / Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Reason / Description <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q3 Sales Commission, Performance Bonus"
                  value={form.reason}
                  onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              {/* Period (optional) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Period (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. September 2026, Q3 2026"
                  value={form.period}
                  onChange={e => setForm(f => ({ ...f, period: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              {/* Notes (optional) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes (optional)</label>
                <textarea
                  rows={2}
                  placeholder="Additional notes..."
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setForm(defaultForm); }}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {submitting ? 'Saving...' : 'Create Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
