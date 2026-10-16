import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';
import { DollarSign, Users, Play, CheckCircle2, Clock, Edit2, X, AlertCircle } from 'lucide-react';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  department?: { name: string };
  designation?: { name: string };
}

interface SalaryStructure {
  id: string;
  employeeId: string;
  baseSalary: number;
  hra: number;
  transportAllowance: number;
  medicalAllowance: number;
  specialAllowance: number;
  taxDeduction: number;
  pfDeduction: number;
  otherDeductions: number;
  netSalary: number;
  employee?: Employee;
}

interface PayrollRecord {
  id: string;
  employeeId: string;
  month: number;
  year: number;
  baseSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  status: string;
  paidAt?: string;
  employee?: Employee;
}

interface Toast {
  id: number;
  type: 'success' | 'error';
  message: string;
}

let toastIdCounter = 0;

export default function PayrollManagement() {
  const queryClient = useQueryClient();
  const [activeSubTab, setActiveSubTab] = useState<'records' | 'structures'>('records');
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [isStructureModalOpen, setIsStructureModalOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const [processForm, setProcessForm] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });

  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedEmployeeName, setSelectedEmployeeName] = useState('');
  const [structureForm, setStructureForm] = useState({
    baseSalary: 3000,
    hra: 500,
    transportAllowance: 200,
    medicalAllowance: 150,
    specialAllowance: 150,
    taxDeduction: 300,
    pfDeduction: 200,
    otherDeductions: 0
  });

  const showToast = (type: 'success' | 'error', message: string) => {
    const id = ++toastIdCounter;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const dismissToast = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));

  // Live net salary preview
  const netPreview =
    structureForm.baseSalary +
    structureForm.hra +
    structureForm.transportAllowance +
    structureForm.medicalAllowance +
    structureForm.specialAllowance -
    structureForm.taxDeduction -
    structureForm.pfDeduction -
    structureForm.otherDeductions;

  // Fetch Summary & Records
  const { data: payrollData, isLoading: isPayrollLoading } = useQuery({
    queryKey: ['payroll-dashboard'],
    queryFn: async () => {
      const res = await api.get('/hr/payroll');
      return res.data;
    }
  });

  // Fetch Structures
  const { data: structuresData, isLoading: isStructuresLoading } = useQuery({
    queryKey: ['payroll-structures'],
    queryFn: async () => {
      const res = await api.get('/hr/payroll/structures');
      return res.data;
    }
  });

  // Fetch Employees for dropdown
  const { data: employeesData } = useQuery({
    queryKey: ['admin-employees-dropdown'],
    queryFn: async () => {
      const res = await api.get('/hr/employees');
      return res.data;
    }
  });

  // Process Payroll Mutation
  const processMutation = useMutation({
    mutationFn: async (data: typeof processForm) => {
      const res = await api.post('/hr/payroll/process', data);
      return res.data;
    },
    onSuccess: (data) => {
      showToast('success', data.message || 'Payroll processed successfully!');
      queryClient.invalidateQueries({ queryKey: ['payroll-dashboard'] });
      setIsProcessModalOpen(false);
    },
    onError: (err: any) => {
      showToast('error', err.response?.data?.message || 'Failed to process payroll');
    }
  });

  // Save Structure Mutation — sends flat fields matching the backend Zod schema
  const structureMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        employeeId: selectedEmployeeId,
        baseSalary: structureForm.baseSalary,
        hra: structureForm.hra,
        transportAllowance: structureForm.transportAllowance,
        medicalAllowance: structureForm.medicalAllowance,
        specialAllowance: structureForm.specialAllowance,
        taxDeduction: structureForm.taxDeduction,
        pfDeduction: structureForm.pfDeduction,
        otherDeductions: structureForm.otherDeductions,
      };
      const res = await api.post('/hr/payroll/structure', payload);
      return res.data;
    },
    onSuccess: (data) => {
      showToast('success', data.message || 'Salary structure saved successfully!');
      queryClient.invalidateQueries({ queryKey: ['payroll-structures'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-dashboard'] });
      setIsStructureModalOpen(false);
      setFormError(null);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to save salary structure';
      setFormError(msg);
      showToast('error', msg);
    }
  });

  // Mark Paid Mutation
  const markPaidMutation = useMutation({
    mutationFn: async (recordId: string) => {
      const res = await api.patch(`/hr/payroll/records/${recordId}`, { status: 'PAID' });
      return res.data;
    },
    onSuccess: () => {
      showToast('success', 'Payment status updated to PAID');
      queryClient.invalidateQueries({ queryKey: ['payroll-dashboard'] });
    },
    onError: (err: any) => {
      showToast('error', err.response?.data?.message || 'Failed to update record status');
    }
  });

  const summary = payrollData?.summary || { totalMonthlyPayroll: 0, processedCount: 0, pendingCount: 0, employeeCount: 0 };
  const records: PayrollRecord[] = payrollData?.records || [];
  const structures: SalaryStructure[] = structuresData?.data || [];
  const employees: Employee[] = employeesData?.data || employeesData || [];

  const handleOpenStructureModal = (emp: Employee) => {
    setSelectedEmployeeId(emp.id);
    setSelectedEmployeeName(`${emp.firstName} ${emp.lastName}`);
    setFormError(null);
    const existing = structures.find(s => s.employeeId === emp.id);
    if (existing) {
      setStructureForm({
        baseSalary: existing.baseSalary,
        hra: existing.hra,
        transportAllowance: existing.transportAllowance,
        medicalAllowance: existing.medicalAllowance,
        specialAllowance: existing.specialAllowance,
        taxDeduction: existing.taxDeduction,
        pfDeduction: existing.pfDeduction,
        otherDeductions: existing.otherDeductions
      });
    } else {
      setStructureForm({
        baseSalary: 3500,
        hra: 500,
        transportAllowance: 200,
        medicalAllowance: 150,
        specialAllowance: 150,
        taxDeduction: 300,
        pfDeduction: 200,
        otherDeductions: 0
      });
    }
    setIsStructureModalOpen(true);
  };

  const handleStructureSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedEmployeeId) {
      setFormError('No employee selected. Please close and try again.');
      return;
    }
    if (structureForm.baseSalary <= 0) {
      setFormError('Base salary must be greater than 0.');
      return;
    }
    if (netPreview < 0) {
      setFormError('Net salary cannot be negative. Please review deductions.');
      return;
    }

    structureMutation.mutate();
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold pointer-events-auto transition-all
              ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}
          >
            {toast.type === 'success'
              ? <CheckCircle2 className="w-4 h-4 shrink-0" />
              : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{toast.message}</span>
            <button onClick={() => dismissToast(toast.id)} className="ml-1 opacity-75 hover:opacity-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">HR Payroll Management</h1>
          <p className="text-slate-500 mt-1">Configure employee salary structures and run monthly payroll batch processing.</p>
        </div>
        <button
          onClick={() => setIsProcessModalOpen(true)}
          className="flex items-center px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-md"
        >
          <Play className="w-4 h-4 mr-2 fill-current" />
          Run Monthly Payroll
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Monthly Payroll</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">₹{summary.totalMonthlyPayroll.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Processed Slips</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{summary.processedCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Pending Approvals</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{summary.pendingCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Employees</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{summary.employeeCount}</p>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200 mb-6 space-x-8">
        <button
          onClick={() => setActiveSubTab('records')}
          className={`pb-4 text-sm font-bold border-b-2 transition-colors ${
            activeSubTab === 'records' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Payroll Slips &amp; History
        </button>
        <button
          onClick={() => setActiveSubTab('structures')}
          className={`pb-4 text-sm font-bold border-b-2 transition-colors ${
            activeSubTab === 'structures' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Employee Salary Structures
        </button>
      </div>

      {/* Payroll Records Sub-Tab */}
      {activeSubTab === 'records' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {isPayrollLoading ? (
            <div className="p-8 text-center text-slate-500">Loading payroll history...</div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100 text-left text-sm font-bold text-slate-500 uppercase">
                <tr>
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Pay Period</th>
                  <th className="px-6 py-4">Base Salary</th>
                  <th className="px-6 py-4">Allowances</th>
                  <th className="px-6 py-4">Deductions</th>
                  <th className="px-6 py-4">Net Salary</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
                      No payroll records found. Click <strong>"Run Monthly Payroll"</strong> to process salary slips.
                    </td>
                  </tr>
                ) : (
                  records.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900">
                          {rec.employee ? `${rec.employee.firstName} ${rec.employee.lastName}` : 'Employee'}
                        </p>
                        <p className="text-xs text-slate-500">{rec.employee?.email}</p>
                      </td>
                      <td className="px-6 py-4 text-slate-700 font-medium text-sm">
                        {monthNames[rec.month - 1]} {rec.year}
                      </td>
                      <td className="px-6 py-4 text-slate-700 font-medium">₹{rec.baseSalary.toLocaleString()}</td>
                      <td className="px-6 py-4 text-green-600 font-medium">+₹{rec.allowances.toLocaleString()}</td>
                      <td className="px-6 py-4 text-red-500 font-medium">-₹{rec.deductions.toLocaleString()}</td>
                      <td className="px-6 py-4 font-black text-slate-900">₹{rec.netSalary.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          rec.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {rec.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {rec.status !== 'PAID' && (
                          <button
                            onClick={() => markPaidMutation.mutate(rec.id)}
                            disabled={markPaidMutation.isPending}
                            className="px-3 py-1 bg-green-600 text-white font-bold text-xs rounded-lg hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50"
                          >
                            Mark Paid
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Salary Structures Sub-Tab */}
      {activeSubTab === 'structures' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {isStructuresLoading ? (
            <div className="p-8 text-center text-slate-500">Loading salary structures...</div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100 text-left text-sm font-bold text-slate-500 uppercase">
                <tr>
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Base Salary</th>
                  <th className="px-6 py-4">HRA + Allowances</th>
                  <th className="px-6 py-4">Deductions</th>
                  <th className="px-6 py-4">Net Monthly Pay</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map((emp) => {
                  const struct = structures.find(s => s.employeeId === emp.id);
                  const base = struct?.baseSalary || 0;
                  const allowances = (struct?.hra || 0) + (struct?.transportAllowance || 0) + (struct?.medicalAllowance || 0) + (struct?.specialAllowance || 0);
                  const deductions = (struct?.taxDeduction || 0) + (struct?.pfDeduction || 0) + (struct?.otherDeductions || 0);
                  const net = struct?.netSalary || (base + allowances - deductions);

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900">{emp.firstName} {emp.lastName}</p>
                        <p className="text-xs text-slate-500">{emp.designation?.name || 'Staff'} • {emp.department?.name || 'General'}</p>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800">₹{base.toLocaleString()}</td>
                      <td className="px-6 py-4 text-green-600 font-medium">+₹{allowances.toLocaleString()}</td>
                      <td className="px-6 py-4 text-red-500 font-medium">-₹{deductions.toLocaleString()}</td>
                      <td className="px-6 py-4 font-black text-slate-900">₹{net.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleOpenStructureModal(emp)}
                          className="px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-600 font-bold text-xs rounded-lg transition-colors inline-flex items-center"
                        >
                          <Edit2 className="w-3.5 h-3.5 mr-1" />
                          {struct ? 'Edit Salary' : 'Add Salary'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Run Monthly Payroll Modal */}
      {isProcessModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Run Batch Monthly Payroll</h2>
              <button onClick={() => setIsProcessModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); processMutation.mutate(processForm); }} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Select Month</label>
                <select
                  value={processForm.month}
                  onChange={e => setProcessForm({ ...processForm, month: Number(e.target.value) })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {monthNames.map((m, idx) => (
                    <option key={idx} value={idx + 1}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Select Year</label>
                <input
                  type="number"
                  value={processForm.year}
                  onChange={e => setProcessForm({ ...processForm, year: Number(e.target.value) })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsProcessModalOpen(false)} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg">Cancel</button>
                <button type="submit" disabled={processMutation.isPending} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {processMutation.isPending ? 'Processing...' : 'Process Payroll'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit / Add Salary Structure Modal */}
      {isStructureModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Configure Salary Structure</h2>
                {selectedEmployeeName && (
                  <p className="text-sm text-slate-500 mt-0.5">
                    Employee: <span className="font-semibold text-slate-700">{selectedEmployeeName}</span>
                  </p>
                )}
              </div>
              <button
                onClick={() => { setIsStructureModalOpen(false); setFormError(null); }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleStructureSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">

              {/* Inline error banner */}
              {formError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Base Salary (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="number"
                  min="1"
                  step="any"
                  value={structureForm.baseSalary}
                  onChange={e => setStructureForm({ ...structureForm, baseSalary: Number(e.target.value) })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">HRA (₹)</label>
                  <input
                    type="number" min="0" step="any"
                    value={structureForm.hra}
                    onChange={e => setStructureForm({ ...structureForm, hra: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Transport Allowance (₹)</label>
                  <input
                    type="number" min="0" step="any"
                    value={structureForm.transportAllowance}
                    onChange={e => setStructureForm({ ...structureForm, transportAllowance: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Medical Allowance (₹)</label>
                  <input
                    type="number" min="0" step="any"
                    value={structureForm.medicalAllowance}
                    onChange={e => setStructureForm({ ...structureForm, medicalAllowance: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Special Allowance (₹)</label>
                  <input
                    type="number" min="0" step="any"
                    value={structureForm.specialAllowance}
                    onChange={e => setStructureForm({ ...structureForm, specialAllowance: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tax Deduction (₹)</label>
                  <input
                    type="number" min="0" step="any"
                    value={structureForm.taxDeduction}
                    onChange={e => setStructureForm({ ...structureForm, taxDeduction: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">PF Deduction (₹)</label>
                  <input
                    type="number" min="0" step="any"
                    value={structureForm.pfDeduction}
                    onChange={e => setStructureForm({ ...structureForm, pfDeduction: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Other Deductions (₹)</label>
                  <input
                    type="number" min="0" step="any"
                    value={structureForm.otherDeductions}
                    onChange={e => setStructureForm({ ...structureForm, otherDeductions: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Live Net Salary Preview */}
              <div className={`flex items-center justify-between p-4 rounded-xl border-2 ${
                netPreview >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
              }`}>
                <span className="text-sm font-bold text-slate-600">Net Monthly Salary (Preview)</span>
                <span className={`text-xl font-black ${netPreview >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  ${netPreview.toLocaleString()}
                </span>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setIsStructureModalOpen(false); setFormError(null); }}
                  className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={structureMutation.isPending || netPreview < 0}
                  className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {structureMutation.isPending ? 'Saving...' : 'Save Structure'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
