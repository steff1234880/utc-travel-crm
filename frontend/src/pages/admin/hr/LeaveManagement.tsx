import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';
import { 
  Calendar, CheckCircle2, XCircle, Clock, AlertCircle, 
  Plus, Filter, FileText, Check, X, ShieldAlert, Info
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

export default function LeaveManagement() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const isHRAdmin = ['ADMIN', 'SUPER_ADMIN', 'CEO / Super Admin', 'HR_MANAGER'].some(
    r => (user?.roleName || '').toUpperCase().includes(r.replace('_', ' ')) || (user?.roleName || '').toUpperCase() === r
  );

  const [activeTab, setActiveTab] = useState<'my' | 'admin'>(isHRAdmin ? 'admin' : 'my');
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [applyForm, setApplyForm] = useState({
    leaveType: 'CASUAL',
    startDate: '',
    endDate: '',
    reason: ''
  });

  // Action on request modal (Approve / Reject)
  const [actionModalRequest, setActionModalRequest] = useState<any | null>(null);
  const [actionType, setActionType] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [actionNotes, setActionNotes] = useState('');

  // Admin filter
  const [statusFilter, setStatusFilter] = useState('ALL');

  // 1. Employee Leave Balances and Requests
  const { data: myData, isLoading: isMyLoading } = useQuery({
    queryKey: ['leaves-my'],
    queryFn: async () => {
      const res = await api.get('/hr/leaves/my');
      return res.data.data;
    }
  });

  // 2. Admin All Requests
  const { data: adminData, isLoading: isAdminLoading } = useQuery({
    queryKey: ['leaves-all', statusFilter],
    queryFn: async () => {
      let url = '/hr/leaves';
      if (statusFilter !== 'ALL') url += `?status=${statusFilter}`;
      const res = await api.get(url);
      return res.data.data;
    },
    enabled: isHRAdmin && activeTab === 'admin'
  });

  // 3. Apply Mutation
  const applyMutation = useMutation({
    mutationFn: async (payload: typeof applyForm) => {
      const res = await api.post('/hr/leaves/apply', payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leaves-my'] });
      queryClient.invalidateQueries({ queryKey: ['leaves-all'] });
      setIsApplyModalOpen(false);
      setApplyForm({ leaveType: 'CASUAL', startDate: '', endDate: '', reason: '' });
      alert(data.message || 'Leave applied successfully!');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to submit leave application');
    }
  });

  // 4. Cancel Mutation
  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/hr/leaves/${id}/cancel`, {});
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leaves-my'] });
      queryClient.invalidateQueries({ queryKey: ['leaves-all'] });
      alert(data.message || 'Leave request cancelled.');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to cancel leave request');
    }
  });

  // 5. Admin Action Mutation (Approve/Reject)
  const actionMutation = useMutation({
    mutationFn: async ({ id, action, actionNotes }: { id: string; action: string; actionNotes: string }) => {
      const res = await api.post(`/hr/leaves/${id}/action`, { action, actionNotes });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leaves-all'] });
      queryClient.invalidateQueries({ queryKey: ['leaves-my'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-all'] });
      setActionModalRequest(null);
      setActionNotes('');
      alert(data.message || 'Leave decision recorded successfully.');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to process leave action');
    }
  });

  const handleApplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyForm.startDate || !applyForm.endDate || !applyForm.reason) {
      alert('Please fill out all fields');
      return;
    }
    applyMutation.mutate(applyForm);
  };

  const handleActionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionModalRequest) return;
    actionMutation.mutate({
      id: actionModalRequest.id,
      action: actionType,
      actionNotes
    });
  };

  const balances = myData?.balances || [];
  const myRequests = myData?.requests || [];
  const adminRequests = adminData || [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Leave Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            Apply for leave, track balances, review employee absence requests, and manage approvals.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsApplyModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-[#8b182b] hover:bg-[#731323] text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Apply for Leave</span>
          </button>

          {isHRAdmin && (
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
              <button
                onClick={() => setActiveTab('admin')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'admin' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Approval Queue
              </button>
              <button
                onClick={() => setActiveTab('my')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'my' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                My Leaves
              </button>
            </div>
          )}
        </div>
      </div>

      {/* LEAVE BALANCE CARDS (Casual, Sick, Earned) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {balances.map((b: any) => (
          <div key={b.leaveType} className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {b.leaveType} LEAVE
              </span>
              <Calendar className="w-4 h-4 text-[#8b182b]" />
            </div>
            <div className="my-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 tracking-tight">{b.remainingDays}</span>
              <span className="text-xs text-slate-500 font-medium">days remaining / {b.totalDays} total</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-[#8b182b] h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, (b.remainingDays / b.totalDays) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* ADMIN APPROVAL QUEUE OR MY LEAVE HISTORY */}
      {activeTab === 'admin' && isHRAdmin ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Leave Approval Requests</h3>
              <p className="text-xs text-slate-400 mt-0.5">Approved leaves are automatically scheduled into daily attendance.</p>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 rounded-xl px-3 py-1.5 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending Only</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3 text-center">Days</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {adminRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400 italic">
                      No leave requests found under the selected filter.
                    </td>
                  </tr>
                ) : (
                  adminRequests.map((r: any) => {
                    let badge = 'bg-amber-50 text-amber-700 border border-amber-200';
                    if (r.status === 'APPROVED') badge = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
                    else if (r.status === 'REJECTED') badge = 'bg-rose-50 text-rose-700 border border-rose-200';
                    else if (r.status === 'CANCELLED') badge = 'bg-slate-100 text-slate-600';

                    return (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-900">{r.employeeName}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{r.employeeNumber} • {r.department}</p>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-800">{r.leaveType}</td>
                        <td className="px-4 py-3 font-mono">
                          {r.startDate} to {r.endDate}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-slate-900">{r.daysCount}</td>
                        <td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={r.reason}>{r.reason}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${badge}`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {r.status === 'PENDING' ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => { setActionModalRequest(r); setActionType('APPROVED'); }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-bold transition-colors"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => { setActionModalRequest(r); setActionType('REJECTED'); }}
                                className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 font-bold transition-colors"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Completed</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">My Leave Applications & History</h3>
            <span className="text-xs text-slate-400 font-semibold">{myRequests.length} applications</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3 text-center">Working Days</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {myRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400 italic">
                      No leave requests submitted yet.
                    </td>
                  </tr>
                ) : (
                  myRequests.map((r: any) => {
                    let badge = 'bg-amber-50 text-amber-700 border border-amber-200';
                    if (r.status === 'APPROVED') badge = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
                    else if (r.status === 'REJECTED') badge = 'bg-rose-50 text-rose-700 border border-rose-200';
                    else if (r.status === 'CANCELLED') badge = 'bg-slate-100 text-slate-600';

                    return (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-900">{r.leaveType}</td>
                        <td className="px-4 py-3 font-mono">{r.startDate} to {r.endDate}</td>
                        <td className="px-4 py-3 text-center font-bold">{r.daysCount}</td>
                        <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{r.reason}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${badge}`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {r.status === 'PENDING' ? (
                            <button
                              onClick={() => cancelMutation.mutate(r.id)}
                              disabled={cancelMutation.isPending}
                              className="px-2.5 py-1 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 font-semibold transition-colors"
                            >
                              Cancel
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">{r.actionNotes || '-'}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* APPLY FOR LEAVE MODAL */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Apply for Leave</h3>
              <button onClick={() => setIsApplyModalOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleApplySubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Leave Type</label>
                <select
                  value={applyForm.leaveType}
                  onChange={(e) => setApplyForm({ ...applyForm, leaveType: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#8b182b]"
                >
                  <option value="CASUAL">Casual Leave</option>
                  <option value="SICK">Sick Leave</option>
                  <option value="EARNED">Earned Leave</option>
                  <option value="UNPAID">Unpaid Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={applyForm.startDate}
                    onChange={(e) => setApplyForm({ ...applyForm, startDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#8b182b]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={applyForm.endDate}
                    onChange={(e) => setApplyForm({ ...applyForm, endDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#8b182b]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reason for Leave</label>
                <textarea
                  required
                  rows={3}
                  value={applyForm.reason}
                  onChange={(e) => setApplyForm({ ...applyForm, reason: e.target.value })}
                  placeholder="Specify brief reason for absence..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#8b182b]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsApplyModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={applyMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-[#8b182b] text-white font-bold hover:bg-[#731323] transition-colors"
                >
                  {applyMutation.isPending ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN ACTION MODAL (Approve or Reject with Notes) */}
      {actionModalRequest && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                {actionType === 'APPROVED' ? 'Approve Leave Request' : 'Reject Leave Request'}
              </h3>
              <button onClick={() => setActionModalRequest(null)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <p className="text-xs text-slate-600">
              Employee: <strong>{actionModalRequest.employeeName}</strong> ({actionModalRequest.employeeNumber})<br />
              Period: <span className="font-mono">{actionModalRequest.startDate}</span> to <span className="font-mono">{actionModalRequest.endDate}</span> ({actionModalRequest.daysCount} working days).
            </p>

            <form onSubmit={handleActionSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Administrative Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder={actionType === 'APPROVED' ? 'Approval remarks...' : 'Reason for rejection...'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#8b182b]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActionModalRequest(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionMutation.isPending}
                  className={`px-5 py-2 rounded-xl text-white font-bold transition-colors ${
                    actionType === 'APPROVED' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {actionMutation.isPending ? 'Processing...' : `Confirm ${actionType}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
