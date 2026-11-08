import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import {
  X,
  Users,
  Power,
  RefreshCw,
  Clock,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  History,
  Shield,
  Layers,
  Inbox
} from 'lucide-react';
import LeadAssignmentModal from './LeadAssignmentModal';

interface ExecutiveWorkload {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  roleName: string;
  departmentName?: string;
  activeLeadsCount: number;
  wonLeadsCount: number;
  totalLeadsCount: number;
  lastAssignedAt?: string | null;
}

interface UnassignedLead {
  id: string;
  title: string;
  source: string;
  expectedValue?: number | null;
  currency?: string;
  createdAt: string;
  customer?: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
}

interface AssignmentHistoryItem {
  id: string;
  assignmentType: string;
  reason?: string;
  createdAt: string;
  salesLead?: {
    id: string;
    title: string;
    source: string;
    customer?: {
      firstName: string;
      lastName: string;
    };
  };
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  previousAssignee?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  assignedBy?: {
    id: string;
    email: string;
  } | null;
}

interface OverviewData {
  autoAssignEnabled: boolean;
  lastAssignedLeadExecId?: string | null;
  totalActiveWorkload: number;
  totalWonLeads: number;
  unassignedCount: number;
  executives: ExecutiveWorkload[];
  unassignedLeads: UnassignedLead[];
  recentHistory: AssignmentHistoryItem[];
}

interface LeadAssignmentOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  canManageSettings: boolean; // CEO or Admin
  canAssignLeads: boolean;    // Sales Manager, CEO, or Admin
  onWorkloadChanged?: () => void;
}

export default function LeadAssignmentOverviewModal({
  isOpen,
  onClose,
  canManageSettings,
  canAssignLeads,
  onWorkloadChanged
}: LeadAssignmentOverviewModalProps) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [toggling, setToggling] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'team' | 'unassigned' | 'history'>('team');
  const [assigningLead, setAssigningLead] = useState<any | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchOverview();
    }
  }, [isOpen]);

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const res = await api.get('/crm/leads/assignment/overview');
      if (res.data?.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch assignment overview:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAutoAssign = async () => {
    if (!canManageSettings || toggling || !data) return;
    setToggling(true);
    try {
      const newStatus = !data.autoAssignEnabled;
      const res = await api.patch('/crm/leads/assignment/settings', {
        autoAssignLeads: newStatus
      });
      if (res.data?.success) {
        setData(prev => prev ? { ...prev, autoAssignEnabled: newStatus } : null);
        onWorkloadChanged?.();
      }
    } catch (err) {
      console.error('Failed to toggle auto assignment:', err);
      alert('Failed to update automatic assignment setting.');
    } finally {
      setToggling(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[90vh] flex flex-col border border-slate-200/90 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">Lead Assignment & Team Workload</h2>
                <span className="hidden sm:inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                  Hybrid Engine
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Workload balancing, persistent round-robin distribution, and sales manager control
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            {/* Auto Assignment ON/OFF Toggle (CEO & Admin) */}
            {canManageSettings ? (
              <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
                <div className="flex flex-col text-right">
                  <span className="text-[11px] font-bold text-slate-800">Auto-Distribution</span>
                  <span className={`text-[10px] font-semibold ${data?.autoAssignEnabled ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {data?.autoAssignEnabled ? 'Active' : 'Paused'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleToggleAutoAssign}
                  disabled={toggling}
                  aria-label="Toggle Auto Assignment"
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out focus:outline-none ${
                    data?.autoAssignEnabled ? 'bg-emerald-500' : 'bg-slate-300'
                  } ${toggling ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                      data?.autoAssignEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold">
                <Power className="w-3.5 h-3.5 text-emerald-600" />
                <span>Auto-Assignment: {data?.autoAssignEnabled ? 'Active' : 'Off'}</span>
              </div>
            )}

            <button
              onClick={fetchOverview}
              disabled={loading}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-6 border-b border-slate-100 bg-white">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Workload</span>
            <p className="text-2xl font-black text-slate-900 mt-1">{data?.totalActiveWorkload ?? 0}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Excludes Won & Lost</p>
          </div>
          <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/50">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Unassigned Queue</span>
            <p className="text-2xl font-black text-amber-900 mt-1">{data?.unassignedCount ?? 0}</p>
            <p className="text-[11px] text-amber-600 mt-0.5">Awaiting Manager Assignment</p>
          </div>
          <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/50">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Won Leads</span>
            <p className="text-2xl font-black text-emerald-900 mt-1">{data?.totalWonLeads ?? 0}</p>
            <p className="text-[11px] text-emerald-600 mt-0.5">Successfully Converted</p>
          </div>
          <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200/50">
            <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Active Executives</span>
            <p className="text-2xl font-black text-blue-900 mt-1">{data?.executives?.length ?? 0}</p>
            <p className="text-[11px] text-blue-600 mt-0.5">Eligible for Auto-Distribution</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 pt-3 border-b border-slate-100 flex items-center gap-6 bg-slate-50/40 text-xs font-bold">
          <button
            onClick={() => setActiveTab('team')}
            className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'team'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            Executive Workloads ({data?.executives?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('unassigned')}
            className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'unassigned'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Inbox className="w-4 h-4" />
            Unassigned Leads ({data?.unassignedCount || 0})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'history'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            Assignment History Log
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-white min-h-[300px]">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-slate-400 text-xs">
              <RefreshCw className="w-5 h-5 animate-spin mr-2 text-blue-600" />
              Loading workload distribution...
            </div>
          ) : activeTab === 'team' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <p>New leads are assigned in strict sequential Round Robin order among active Sales Executives.</p>
                <span className="text-[11px] font-semibold text-slate-400">
                  Strict Sequential Round Robin
                </span>
              </div>

              {(!data?.executives || data.executives.length === 0) ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
                  <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                  No eligible active Sales Executives found in the system.
                  <p className="mt-1 text-slate-500">
                    Incoming leads will remain in the Unassigned Queue until eligible executives are activated.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(() => {
                    const execs = [...data.executives].sort((a, b) => a.id.localeCompare(b.id));
                    const lastIndex = execs.findIndex(e => e.id === data.lastAssignedLeadExecId);
                    const nextExecId = execs.length > 0
                      ? (lastIndex >= 0 && lastIndex < execs.length - 1 ? execs[lastIndex + 1].id : execs[0].id)
                      : null;

                    return execs.map((exec) => {
                      const isNextInQueue = exec.id === nextExecId;
                      return (
                        <div
                          key={exec.id}
                          className={`p-4 rounded-2xl border transition-all ${
                            isNextInQueue
                              ? 'bg-emerald-50/20 border-emerald-300/80 shadow-2xs'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-black flex items-center justify-center text-sm">
                                {exec.firstName[0]}{exec.lastName[0]}
                              </div>
                              <div>
                                <h4 className="font-bold text-sm text-slate-900 leading-tight">
                                  {exec.firstName} {exec.lastName}
                                </h4>
                                <p className="text-[11px] text-slate-400 truncate max-w-[140px]">{exec.email}</p>
                              </div>
                            </div>
                            {isNextInQueue && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                Next in Queue
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 text-center">
                            <div className="bg-slate-50 p-2 rounded-xl">
                              <span className="text-[10px] text-slate-400 font-bold block">Active</span>
                              <span className="text-base font-black text-slate-900">{exec.activeLeadsCount}</span>
                            </div>
                            <div className="bg-slate-50 p-2 rounded-xl">
                              <span className="text-[10px] text-slate-400 font-bold block">Won</span>
                              <span className="text-base font-black text-emerald-600">{exec.wonLeadsCount}</span>
                            </div>
                            <div className="bg-slate-50 p-2 rounded-xl">
                              <span className="text-[10px] text-slate-400 font-bold block">Total</span>
                              <span className="text-base font-black text-slate-600">{exec.totalLeadsCount}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-2 border-t border-slate-50">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Last assigned:
                            </span>
                            <span className="font-medium text-slate-600">
                              {exec.lastAssignedAt ? new Date(exec.lastAssignedAt).toLocaleDateString() : 'Never'}
                            </span>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
          ) : activeTab === 'unassigned' ? (
            <div className="space-y-3">
              {(!data?.unassignedLeads || data.unassignedLeads.length === 0) ? (
                <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  All leads are actively assigned! No unassigned leads in queue.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                  {data.unassignedLeads.map((lead) => (
                    <div key={lead.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-slate-900">{lead.title}</h4>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Unassigned
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Customer: {lead.customer?.firstName} {lead.customer?.lastName} ({lead.customer?.email})
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Source: <span className="font-semibold text-slate-600">{lead.source}</span> • Created: {new Date(lead.createdAt).toLocaleString()}
                        </p>
                      </div>

                      {canAssignLeads && (
                        <button
                          onClick={() => setAssigningLead(lead)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 flex items-center gap-1.5 transition-colors self-start sm:self-center shrink-0"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          Assign Lead
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {(!data?.recentHistory || data.recentHistory.length === 0) ? (
                <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
                  No assignment history entries recorded yet.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden text-xs">
                  {data.recentHistory.map((item) => (
                    <div key={item.id} className="p-4 hover:bg-slate-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.assignmentType === 'AUTOMATIC'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            {item.assignmentType}
                          </span>
                          <span className="font-bold text-slate-900">
                            {item.salesLead?.title || 'Lead'}
                          </span>
                        </div>
                        <p className="text-slate-600 mt-1">
                          {item.previousAssignee
                            ? `${item.previousAssignee.firstName} ${item.previousAssignee.lastName} → `
                            : 'Unassigned → '}
                          <span className="font-bold text-slate-800">
                            {item.assignedTo ? `${item.assignedTo.firstName} ${item.assignedTo.lastName}` : 'Unassigned'}
                          </span>
                          {item.assignedBy && (
                            <span className="text-slate-400 text-[11px] ml-1.5">
                              (by {item.assignedBy.email})
                            </span>
                          )}
                        </p>
                        {item.reason && (
                          <p className="text-slate-500 text-[11px] mt-0.5 italic">
                            "{item.reason}"
                          </p>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 shrink-0">
                        {new Date(item.createdAt).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-slate-400" />
            <span>Automatic workload assignments run inside PostgreSQL ACID transactions</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors shadow-2xs"
          >
            Close
          </button>
        </div>
      </div>

      {/* Manual Assignment Modal for quick assignment */}
      {assigningLead && (
        <LeadAssignmentModal
          isOpen={!!assigningLead}
          onClose={() => setAssigningLead(null)}
          onSuccess={() => {
            setAssigningLead(null);
            fetchOverview();
            onWorkloadChanged?.();
          }}
          lead={assigningLead}
        />
      )}
    </div>
  );
}

