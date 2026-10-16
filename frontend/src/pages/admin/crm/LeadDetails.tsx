import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { Mail, Phone, Calendar, DollarSign, ArrowLeft, Plus, Edit2, Trash2, FileText, Download, Link as LinkIcon } from 'lucide-react';
import FollowUpModal from '../../../components/admin/crm/FollowUpModal';
import { Timeline, TimelineEvent } from '../../../components/common/Timeline';
import { timelineService } from '../../../services/timelineService';

const LeadDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState<any>(null);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [editingFollowUp, setEditingFollowUp] = useState<any>(null);

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
      const [leadRes, timelineRes] = await Promise.all([
        api.get(`/crm/leads/${id}`),
        timelineService.getTimeline('LEAD', id!)
      ]);
      setLead(leadRes.data.data);
      setTimelineEvents(timelineRes);
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

  if (loading) return <div className="p-8 text-center text-gray-500">Loading lead details...</div>;
  if (!lead) return <div className="p-8 text-center text-red-500">Lead not found</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
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
            <div className="flex justify-between items-center mb-4">
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
            <div className="flex justify-between items-center mb-4">
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
      </div>      <FollowUpModal 
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
    </div>
  );
};

export default LeadDetails;
