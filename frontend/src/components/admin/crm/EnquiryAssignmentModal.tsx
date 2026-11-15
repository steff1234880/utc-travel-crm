import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { X, UserCheck, AlertCircle } from 'lucide-react';

interface Executive {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  roleName: string;
  activeLeadsCount: number;
}

interface EnquiryAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  enquiry: {
    id: string;
    referenceNumber: string;
    customer?: { firstName: string; lastName?: string };
    currentAssignee?: { id: string; firstName: string; lastName: string } | null;
  } | null;
}

export default function EnquiryAssignmentModal({
  isOpen,
  onClose,
  onSuccess,
  enquiry
}: EnquiryAssignmentModalProps) {
  const [executives, setExecutives] = useState<Executive[]>([]);
  const [selectedExecutiveId, setSelectedExecutiveId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [fetchingTeam, setFetchingTeam] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && enquiry) {
      setSelectedExecutiveId(enquiry.currentAssignee?.id || '');
      setNotes('');
      setError(null);
      fetchTeamWorkload();
    }
  }, [isOpen, enquiry]);

  const fetchTeamWorkload = async () => {
    setFetchingTeam(true);
    try {
      const res = await api.get('/crm/leads/assignment/overview');
      if (res.data?.success && res.data.data?.executives) {
        setExecutives(res.data.data.executives);
      }
    } catch (err: any) {
      console.error('Failed to fetch team workload:', err);
      try {
        const empRes = await api.get('/hr/employees');
        const emps = empRes.data?.data || empRes.data || [];
        setExecutives(
          emps.map((e: any) => ({
            id: e.id,
            firstName: e.firstName,
            lastName: e.lastName,
            email: e.user?.email || '',
            roleName: e.user?.role?.name || e.designation?.name || 'Sales Executive',
            activeLeadsCount: 0,
          }))
        );
      } catch {
        setError('Failed to load active sales executives.');
      }
    } finally {
      setFetchingTeam(false);
    }
  };

  if (!isOpen || !enquiry) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExecutiveId) {
      setError('Please select a sales executive.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.post(`/enquiries/${enquiry.id}/assign`, {
        employeeId: selectedExecutiveId,
        notes: notes.trim() || undefined
      });

      if (res.data?.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.data?.message || 'Failed to assign enquiry.');
      }
    } catch (err: any) {
      console.error('Assignment error:', err);
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to assign enquiry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 flex flex-col animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base">Assign Enquiry</h3>
              <p className="text-xs text-slate-500 font-medium">Ref: {enquiry.referenceNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Select Sales Representative
            </label>
            {fetchingTeam ? (
              <div className="text-xs text-slate-400 py-3 text-center">Loading team workload...</div>
            ) : (
              <select
                value={selectedExecutiveId}
                onChange={(e) => setSelectedExecutiveId(e.target.value)}
                required
                className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              >
                <option value="">-- Choose Sales Representative --</option>
                {executives.map((exec) => (
                  <option key={exec.id} value={exec.id}>
                    {exec.firstName} {exec.lastName} — {exec.roleName || 'Sales Executive'} ({exec.activeLeadsCount} active leads)
                  </option>
                ))}
              </select>
            )}
            <p className="text-[11px] text-slate-400 mt-1">
              Workload shows currently active leads assigned to each team member.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Assignment Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Assigned by Manager based on destination specialization"
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || fetchingTeam}
              className="px-5 py-2 text-xs font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-sm hover:shadow disabled:opacity-50"
            >
              {loading ? 'Assigning...' : 'Confirm Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

