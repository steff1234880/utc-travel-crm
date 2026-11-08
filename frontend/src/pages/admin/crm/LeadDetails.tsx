import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import {
  Mail,
  Phone,
  Calendar,
  DollarSign,
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  FileText,
  Download,
  Link as LinkIcon,
  UserCheck,
  ShieldCheck,
  History,
  ArrowRightLeft
} from 'lucide-react';
import FollowUpModal from '../../../components/admin/crm/FollowUpModal';
import LeadAssignmentModal from '../../../components/admin/crm/LeadAssignmentModal';
import { Timeline, TimelineEvent } from '../../../components/common/Timeline';
import { timelineService } from '../../../services/timelineService';
import { useAuth } from '../../../context/AuthContext';

const LeadDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasRole, hasPermission } = useAuth();
  const [lead, setLead] = useState<any>(null);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [editingFollowUp, setEditingFollowUp] = useState<any>(null);
  const [assignmentHistories, setAssignmentHistories] = useState<any[]>([]);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  const canAssignLeads = hasRole(['Sales Manager', 'CEO / Super Admin', 'Admin', 'ADMIN', 'SUPER_ADMIN']) ||
    hasPermission('sales_crm:manage') ||
    hasPermission('sales_crm:assign');

  const handleEditFollowUp = (followUp: any) => {
    setEditingFollowUp(followUp);
    setIsFollowUpModalOpen(true);
  };

  const handleDeleteFollowUp = async (followUpId: string) => {
    if (!confirm('Are you sure you want to delete this follow-up?')) return;
    try {
      await api.delete(`/crm/leads/${id}/followups/${followUpId}`);
      fetchLead();
    } catch (error) {
      console.error('Failed to delete follow-up', error);
      alert('Failed to delete follow-up');
    }
  };

  useEffect(() => {
    fetchLead();
    fetchQuotations();
  }, [id]);

  const fetchQuotations = async () => {
    try {
      const { data } = await api.get(`/crm/quotations/lead/${id}`);
      setQuotations(data.data);
    } catch (error) {
      console.error('Failed to fetch quotations', error);
    }
  };

  const fetchLead = async () => {
    try {
      const [leadRes, timelineRes, historyRes] = await Promise.all([
        api.get(`/crm/leads/${id}`),
        timelineService.getTimeline('LEAD', id!),
        api.get(`/crm/leads/${id}/assignment-history`).catch(() => ({ data: { data: [] } }))
      ]);
      setLead(leadRes.data.data);
      setTimelineEvents(timelineRes);
      setAssignmentHistories(historyRes.data?.data || []);
    } catch (error) {
      console.error('Failed to fetch lead', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuotation = async (quoteId: string) => {
    if (!confirm('Are you sure you want to delete this quotation?')) return;
    try {
      await api.delete(`/crm/quotations/${quoteId}`);
      fetchQuotations();
    } catch (error) {
      console.error('Failed to delete quotation', error);
      alert('Failed to delete quotation');
    }
  };

  const handleDownloadPdf = async (quote: any) => {
    try {
      const response = await api.post(`/crm/quotations/${quote.id}/generate-pdf`, {}, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${quote.quotationNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
    } catch (error) {
      console.error('Failed to download PDF', error);
      alert('Failed to download PDF');
    }
  };

  const handleStatusChange = async (quoteId: string, newStatus: string) => {
    try {
      await api.patch(`/crm/quotations/${quoteId}/status`, { status: newStatus, remarks: 'Status updated from Lead Details' });
      fetchQuotations();
    } catch (error) {
      console.error('Failed to update status', error);
      alert('Failed to update status');
    }
  };

  const handleCopyLink = (quoteId: string) => {
    const url = `${window.location.origin}/quote/${quoteId}`;
    navigator.clipboard.writeText(url);
    alert('Client review link copied to clipboard!');
  };

  const handleConvertToBooking = async (quoteId: string) => {
    if (!confirm('Convert this accepted quotation into a booking?')) return;
    try {
      const { data } = await api.post(`/crm/quotations/${quoteId}/convert`);
      alert(`Success! Booking ${data.data.bookingRef} created successfully.`);
      
      // Refresh local state so UI shows "Converted" and timeline is updated
      await fetchQuotations();
      await fetchLead();
    } catch (error: any) {
      console.error('Failed to convert to booking', error);
      alert(error.response?.data?.error || 'Failed to convert to booking');
    }
  };

  if (loading) return <div className="p-4 sm:p-8 w-full min-w-0 text-center text-gray-500">Loading lead details...</div>;
  if (!lead) return <div className="p-4 sm:p-8 w-full min-w-0 text-center text-red-500">Lead not found</div>;

  return (
    <div className="p-4 sm:p-8 w-full min-w-0 max-w-7xl mx-auto">
      <button 
        onClick={() => navigate('/admin/crm/pipeline')}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Pipeline
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Details */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <div className="mb-4">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${lead.priority === 'HIGH' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                {lead.priority} PRIORITY
              </span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{lead.title}</h1>
            <p className="text-gray-500 text-sm mb-6">Source: {lead.source}</p>

            <div className="space-y-4">
              <div className="flex items-center gap-3 text-gray-700">
                <DollarSign className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Expected Value</p>
                  <p className="font-medium">₹{lead.expectedValue?.toLocaleString() || 0}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-gray-700">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Created At</p>
                  <p className="font-medium">{new Date(lead.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Assignment & Ownership Card */}
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-600" /> Ownership
              </h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                lead.assignmentType === 'AUTOMATIC'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : lead.assignmentType === 'MANUAL'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                {lead.assignmentType === 'AUTOMATIC' ? 'Auto-Assigned' : lead.assignmentType === 'MANUAL' ? 'Manually Assigned' : 'Unassigned'}
              </span>
            </div>

            {lead.assignedTo ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm shrink-0">
                    {lead.assignedTo.firstName?.[0]}{lead.assignedTo.lastName?.[0]}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-gray-900">
                      {lead.assignedTo.firstName} {lead.assignedTo.lastName}
                    </p>
                    <p className="text-xs text-gray-400">Sales Executive</p>
                  </div>
                </div>
                {lead.assignedAt && (
                  <p className="text-[11px] text-gray-400">
                    Assigned on: {new Date(lead.assignedAt).toLocaleString()}
                  </p>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                This lead is currently unassigned and awaiting manager distribution.
              </div>
            )}

            {canAssignLeads && (
              <button
                onClick={() => setIsAssignModalOpen(true)}
                className="w-full mt-4 flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
              >
                <ArrowRightLeft className="w-4 h-4" />
                {lead.assignedTo ? 'Reassign Lead' : 'Assign to Executive'}
              </button>
            )}
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Customer Details</h2>
            <div className="font-medium text-gray-900 mb-2">
              {lead.customer?.firstName} {lead.customer?.lastName}
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="w-4 h-4 text-gray-400" />
                {lead.customer?.email}
              </div>
              {lead.customer?.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="w-4 h-4 text-gray-400" />
                  {lead.customer?.phone}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Activity & Requirements */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Activity History</h2>
            <div className="space-y-4">
              {lead.activities?.length === 0 ? (
                <p className="text-gray-500 text-sm">No activity recorded yet.</p>
              ) : (
                lead.activities?.map((activity: any) => (
                  <div key={activity.id} className="flex gap-4 border-b border-gray-50 pb-4 last:border-0">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
                      {activity.employee?.firstName?.[0] || 'U'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {activity.employee?.firstName} {activity.action.replace('_', ' ')}
                      </p>
                      {activity.description && <p className="text-sm text-gray-500 mt-1">{activity.description}</p>}
                      <p className="text-xs text-gray-400 mt-1">{new Date(activity.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm mt-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
              <h2 className="text-lg font-bold text-gray-900">Scheduled Follow-ups</h2>
              <button 
                onClick={() => {
                  setEditingFollowUp(null);
                  setIsFollowUpModalOpen(true);
                }}
                className="flex items-center gap-1 text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Follow-up
              </button>
            </div>
            <div className="space-y-4">
              {!lead.followUps || lead.followUps.length === 0 ? (
                <p className="text-gray-500 text-sm">No follow-ups scheduled yet.</p>
              ) : (
                lead.followUps.map((followUp: any) => (
                  <div key={followUp.id} className="flex items-center justify-between border-b border-gray-50 pb-4 last:border-0">
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
                        F
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {followUp.type} - {followUp.status}
                        </p>
                        {followUp.notes && <p className="text-sm text-gray-500 mt-1">{followUp.notes}</p>}
                        <p className="text-xs text-gray-400 mt-1">
                          Scheduled for: {new Date(followUp.scheduledFor).toLocaleString()}
                          {followUp.employee && ` | Assigned to: ${followUp.employee.firstName} ${followUp.employee.lastName || ''}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleEditFollowUp(followUp)} className="text-gray-400 hover:text-blue-600">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteFollowUp(followUp.id)} className="text-gray-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm mt-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
              <h2 className="text-lg font-bold text-gray-900">Quotations</h2>
              <button 
                onClick={() => navigate(`/admin/crm/leads/${id}/quote`)}
                className="flex items-center gap-1 text-sm font-medium text-green-600 bg-green-50 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors"
              >
                <Plus className="w-4 h-4" /> Create Quotation
              </button>
            </div>
            <div className="space-y-4">
              {quotations.length === 0 ? (
                <p className="text-gray-500 text-sm">No quotations created yet.</p>
              ) : (
                quotations.map((quote: any) => (
                  <div key={quote.id} className="flex flex-col gap-3 border-b border-gray-50 pb-4 last:border-0">
                    <div className="flex items-center justify-between">
                      <div className="flex gap-4 items-center">
                        <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">
                            {quote.quotationNumber}
                          </p>
                          <p className="text-xs text-gray-500">
                            Total: ${quote.finalAmount?.toLocaleString()} | Valid until: {new Date(quote.validityDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <select 
                          className="text-xs px-2 py-1 rounded border border-gray-200 outline-none"
                          value={quote.status}
                          onChange={(e) => handleStatusChange(quote.id, e.target.value)}
                        >
                          <option value="DRAFT">Draft</option>
                          <option value="SENT">Sent</option>
                          <option value="ACCEPTED">Accepted</option>
                          <option value="REJECTED">Rejected</option>
                          <option value="EXPIRED">Expired</option>
                        </select>
                        {quote.status === 'ACCEPTED' && !quote.bookingPrep && (
                          <button 
                            onClick={() => handleConvertToBooking(quote.id)} 
                            className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded font-medium hover:bg-green-200"
                            title="Convert to Booking"
                          >
                            Convert to Booking
                          </button>
                        )}
                        {quote.status === 'ACCEPTED' && quote.bookingPrep && (
                          <span 
                            className="text-xs font-semibold text-emerald-600 px-2 py-1 bg-emerald-50 rounded"
                            title="Booking created for this quotation"
                          >
                            Converted (Ref: {quote.bookingPrep.bookingRef})
                          </span>
                        )}
                        <button onClick={() => handleCopyLink(quote.id)} className="text-gray-400 hover:text-indigo-600" title="Copy Client Link">
                          <LinkIcon className="w-4 h-4" />
                        </button>
                        <button onClick={() => navigate(`/admin/crm/leads/${id}/quote/${quote.id}`)} className="text-gray-400 hover:text-blue-600">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteQuotation(quote.id)} className="text-gray-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDownloadPdf(quote)} className="text-gray-400 hover:text-green-600">
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Unified Timeline */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-8">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            Activity Timeline
          </h3>
        </div>
        <div className="p-6 max-h-[600px] overflow-y-auto bg-slate-900">
          <Timeline events={timelineEvents} loading={loading} />
        </div>
      </div>

      {/* Assignment Audit History */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-6">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <History className="w-4 h-4 text-slate-500" />
            Lead Assignment Audit History
          </h3>
          <span className="text-xs text-gray-400 font-medium">
            {assignmentHistories.length} record{assignmentHistories.length === 1 ? '' : 's'}
          </span>
        </div>
        <div className="p-6">
          {assignmentHistories.length === 0 ? (
            <p className="text-gray-500 text-sm">No assignment history recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {assignmentHistories.map((hist) => (
                <div key={hist.id} className="p-3.5 bg-slate-50/70 border border-slate-200/60 rounded-xl text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      hist.assignmentType === 'AUTOMATIC'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {hist.assignmentType}
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      {new Date(hist.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-slate-700 font-medium">
                    {hist.previousAssignee
                      ? `${hist.previousAssignee.firstName} ${hist.previousAssignee.lastName} → `
                      : 'Unassigned → '}
                    <span className="font-bold text-slate-900">
                      {hist.assignedTo ? `${hist.assignedTo.firstName} ${hist.assignedTo.lastName}` : 'Unassigned'}
                    </span>
                    {hist.assignedBy && (
                      <span className="text-slate-400 font-normal ml-1">
                        (by {hist.assignedBy.email})
                      </span>
                    )}
                  </p>
                  {hist.reason && (
                    <p className="text-slate-500 text-[11px] italic">
                      "{hist.reason}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <FollowUpModal 
        isOpen={isFollowUpModalOpen}
        onClose={() => {
          setIsFollowUpModalOpen(false);
          setEditingFollowUp(null);
        }}
        onSuccess={() => {
          setIsFollowUpModalOpen(false);
          setEditingFollowUp(null);
          fetchLead();
        }}
        leadId={id!}
        existingFollowUp={editingFollowUp}
      />

      <LeadAssignmentModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        onSuccess={() => {
          setIsAssignModalOpen(false);
          fetchLead();
        }}
        lead={lead}
      />
    </div>
  );
};

export default LeadDetails;
