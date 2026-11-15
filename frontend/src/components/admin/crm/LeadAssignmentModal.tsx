import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { X, UserCheck, AlertCircle, ShieldCheck, ArrowRightLeft } from 'lucide-react';

interface Executive {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  roleName: string;
  activeLeadsCount: number;
}

interface LeadAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  lead: {
    id: string;
    title: string;
    assignedToId?: string | null;
    assignedTo?: {
      id: string;
      firstName: string;
      lastName: string;
    } | null;
    assignmentType?: string;
  } | null;
}

export default function LeadAssignmentModal({
  isOpen,
  onClose,
  onSuccess,
  lead
}: LeadAssignmentModalProps) {
  const [executives, setExecutives] = useState<Executive[]>([]);
  const [selectedExecutiveId, setSelectedExecutiveId] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [fetchingTeam, setFetchingTeam] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && lead) {
      setSelectedExecutiveId(lead.assignedToId || '');
      setReason('');
      setError(null);
      fetchTeamWorkload();
    }
  }, [isOpen, lead]);

  const fetchTeamWorkload = async () => {
    setFetchingTeam(true);
    try {
      const res = await api.get('/crm/leads/assignment/overview');
      if (res.data?.success && res.data.data?.executives) {
        setExecutives(res.data.data.executives);
      }
    } catch (err: any) {
      console.error('Failed to fetch team workload:', err);
      setError(err.response?.data?.error || 'Failed to load sales executives.');
    } finally {
      setFetchingTeam(false);
    }
  };

  if (!isOpen || !lead) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.post(`/crm/leads/${lead.id}/assign`, {
        employeeId: selectedExecutiveId || null,
        reason: reason.trim() || undefined
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to assign lead:', err);
      setError(err.response?.data?.error || 'Failed to assign lead. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isReassigning = !!lead.assignedToId && lead.assignedToId !== selectedExecutiveId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {lead.assignedToId ? 'Reassign Lead' : 'Assign Lead'}
              </h3>
              <p className="text-xs text-slate-500 truncate max-w-[280px]">{lead.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Current Assignee Card */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-slate-600 space-y-1">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Current Assignee</span>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                lead.assignmentType === 'AUTOMATIC'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : lead.assignmentType === 'MANUAL'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                {lead.assignmentType || 'UNASSIGNED'}
              </span>
            </div>
            <p className="font-bold text-sm text-slate-800">
              {lead.assignedTo ? `${lead.assignedTo.firstName} ${lead.assignedTo.lastName}` : 'Unassigned'}
            </p>
          </div>

          {/* Executive Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Select Sales Representative</span>
              <span className="text-[11px] font-normal text-slate-400">
                Active Sales Team
              </span>
            </label>
            {fetchingTeam ? (
              <div className="p-3 text-center text-xs text-slate-400 border border-slate-200 rounded-xl">
                Loading sales team...
              </div>
            ) : (
              <select
                value={selectedExecutiveId}
                onChange={(e) => setSelectedExecutiveId(e.target.value)}
                className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="">-- Unassigned (Keep in Queue) --</option>
                {executives.map((exec) => (
                  <option key={exec.id} value={exec.id}>
                    {exec.firstName} {exec.lastName} — {exec.roleName || 'Sales Executive'} ({exec.activeLeadsCount} active lead{exec.activeLeadsCount === 1 ? '' : 's'})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Reason Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Reason / Manager Notes <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Reassigned to specialist for Europe destination; balancing weekend workload"
              rows={3}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
            />
          </div>

          {/* Notice about manual protection */}
          <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 text-[11px] text-blue-700 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Manual assignments are protected and will never be automatically redistributed by the system. Complete assignment history is audited.
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || fetchingTeam}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-xs transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <UserCheck className="w-4 h-4" />
              {loading ? 'Saving...' : isReassigning ? 'Confirm Reassignment' : 'Confirm Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

