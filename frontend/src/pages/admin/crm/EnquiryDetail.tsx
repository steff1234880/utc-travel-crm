import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';
import { 
  ArrowLeft, User, Phone, Mail, Calendar, MapPin, DollarSign, Clock, 
  MessageCircle, Plus, CheckCircle2, XCircle, AlertCircle, Edit, Check, Trash2, Activity 
} from 'lucide-react';
import { Timeline, TimelineEvent } from '../../../components/common/Timeline';
import { timelineService } from '../../../services/timelineService';

interface FollowUpItem {
  id: string;
  type: string;
  notes?: string;
  scheduledFor: string;
  status: string;
  employeeId: string;
  employee?: { id: string; firstName: string; lastName: string };
}

interface EnquiryDetailData {
  id: string;
  referenceNumber: string;
  source: string;
  status: string;
  destination?: string;
  travelDate?: string;
  travellerCount?: number;
  adultCount?: number;
  childCount?: number;
  budgetRange?: string;
  message?: string;
  specialRequests?: string;
  createdAt: string;
  customer: {
    id: string;
    firstName: string;
    lastName?: string;
    email: string;
    phone?: string;
    whatsappNumber?: string;
  };
  package?: { title: string; slug: string; basePrice?: number; currency?: string } | null;
  assignments: Array<{ employee: { firstName: string; lastName: string } }>;
  notes: Array<{ id: string; text: string; createdAt: string; authorId: string }>;
  followUps: FollowUpItem[];
  statusHistory: Array<{ id: string; oldStatus?: string; newStatus: string; createdAt: string; remarks?: string }>;
}

export default function EnquiryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isEditFollowUpMode, setIsEditFollowUpMode] = useState(false);
  const [editingFollowUpId, setEditingFollowUpId] = useState<string | null>(null);

  // Delete modal states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleDeleteConfirm = async () => {
    if (!id) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await api.delete(`/enquiries/${id}`);
      if (res.data.success) {
        queryClient.invalidateQueries({ queryKey: ['enquiries'] });
        queryClient.invalidateQueries({ queryKey: ['enquiry-stats'] });
        navigate('/admin/enquiries', { state: { message: 'Enquiry deleted successfully.' } });
      } else {
        setDeleteError(res.data.message || 'Failed to delete enquiry.');
      }
    } catch (err: any) {
      console.error('Delete enquiry error:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to delete enquiry. Please try again.';
      setDeleteError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const [followUpFormData, setFollowUpFormData] = useState({
    type: 'CALL',
    scheduledFor: '',
    employeeId: '',
    notes: '',
  });

  const [newNoteText, setNewNoteText] = useState('');

  // Fetch enquiry detail
  const { data: enquiryData, isLoading, isError, refetch } = useQuery<{ data: EnquiryDetailData }>({
    queryKey: ['enquiry', id],
    queryFn: async () => {
      const res = await api.get(`/enquiries/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  // Fetch employees for follow-up assignment dropdown
  const { data: employeesData } = useQuery<{ data: Array<{ id: string; firstName: string; lastName: string }> }>({
    queryKey: ['employees-simple'],
    queryFn: async () => {
      const res = await api.get('/hr/employees');
      return res.data;
    },
  });

  const enquiry = enquiryData?.data;
  const employees = employeesData?.data || [];

  const { data: timelineEvents = [], isLoading: isLoadingTimeline } = useQuery<TimelineEvent[]>({
    queryKey: ['timeline', 'ENQUIRY', id],
    queryFn: async () => {
      const res = await timelineService.getTimeline('ENQUIRY', id!);
      return res;
    },
    enabled: !!id,
  });

  // Update Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const res = await api.patch(`/enquiries/${id}/status`, { status: newStatus });
      return res.data;
    },
    onSuccess: (data) => {
      setFeedback({ type: 'success', message: data.message || 'Status updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['enquiry', id] });
      queryClient.invalidateQueries({ queryKey: ['enquiry-stats'] });
    },
    onError: (err: any) => {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Failed to update status' });
    }
  });

  // Add Note Mutation
  const addNoteMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await api.post(`/enquiries/${id}/notes`, { text });
      return res.data;
    },
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'Internal note added successfully' });
      setNewNoteText('');
      setIsNoteModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['enquiry', id] });
    },
    onError: (err: any) => {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Failed to add note' });
    }
  });

  // Schedule Follow-Up Mutation
  const scheduleFollowUpMutation = useMutation({
    mutationFn: async (payload: typeof followUpFormData) => {
      const res = await api.post(`/enquiries/${id}/followups`, payload);
      return res.data;
    },
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'Follow-up scheduled successfully!' });
      closeFollowUpModal();
      queryClient.invalidateQueries({ queryKey: ['enquiry', id] });
      queryClient.invalidateQueries({ queryKey: ['enquiry-stats'] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.errors?.[0]?.message || err.response?.data?.message || 'Failed to schedule follow-up';
      setFeedback({ type: 'error', message: msg });
    }
  });

  // Update / Patch Follow-Up Mutation
  const updateFollowUpMutation = useMutation({
    mutationFn: async ({ followUpId, payload }: { followUpId: string; payload: Partial<typeof followUpFormData> & { status?: string } }) => {
      const res = await api.patch(`/enquiries/followups/${followUpId}`, payload);
      return res.data;
    },
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'Follow-up updated successfully!' });
      closeFollowUpModal();
      queryClient.invalidateQueries({ queryKey: ['enquiry', id] });
      queryClient.invalidateQueries({ queryKey: ['enquiry-stats'] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to update follow-up';
      setFeedback({ type: 'error', message: msg });
    }
  });

  const closeFollowUpModal = () => {
    setIsFollowUpModalOpen(false);
    setIsEditFollowUpMode(false);
    setEditingFollowUpId(null);
    setFollowUpFormData({ type: 'CALL', scheduledFor: '', employeeId: '', notes: '' });
  };

  const handleOpenScheduleModal = () => {
    setIsEditFollowUpMode(false);
    setEditingFollowUpId(null);
    
    // Default to tomorrow 10:00 AM
    const now = new Date();
    now.setDate(now.getDate() + 1);
    now.setHours(10, 0, 0, 0);
    const defaultDatetime = now.toISOString().slice(0, 16);

    setFollowUpFormData({
      type: 'CALL',
      scheduledFor: defaultDatetime,
      employeeId: employees[0]?.id || '',
      notes: '',
    });
    setIsFollowUpModalOpen(true);
  };

  const handleEditFollowUp = (item: FollowUpItem) => {
    setIsEditFollowUpMode(true);
    setEditingFollowUpId(item.id);
    const dateObj = new Date(item.scheduledFor);
    const datetimeLocal = dateObj.toISOString().slice(0, 16);

    setFollowUpFormData({
      type: item.type,
      scheduledFor: datetimeLocal,
      employeeId: item.employeeId || employees[0]?.id || '',
      notes: item.notes || '',
    });
    setIsFollowUpModalOpen(true);
  };

  const handleFollowUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpFormData.scheduledFor) {
      setFeedback({ type: 'error', message: 'Please select a date and time for the follow-up.' });
      return;
    }

    if (isEditFollowUpMode && editingFollowUpId) {
      updateFollowUpMutation.mutate({ followUpId: editingFollowUpId, payload: followUpFormData });
    } else {
      scheduleFollowUpMutation.mutate(followUpFormData);
    }
  };

  if (isLoading) {
    return <div className="p-12 text-center text-slate-500">Loading enquiry details from database...</div>;
  }

  if (isError || !enquiry) {
    return (
      <div className="p-12 text-center text-red-500">
        <AlertCircle className="w-12 h-12 mx-auto mb-3" />
        <h2 className="text-xl font-bold">Failed to load enquiry.</h2>
        <p className="text-slate-500 mt-1 mb-4">Please check your database connection or backend server status.</p>
        <button onClick={() => refetch()} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold">Retry</button>
      </div>
    );
  }

  const now = new Date();
  const followUps = enquiry.followUps || [];

  const overdueFollowUps = followUps.filter(f => f.status === 'PENDING' && new Date(f.scheduledFor) < now);
  const upcomingFollowUps = followUps.filter(f => f.status === 'PENDING' && new Date(f.scheduledFor) >= now);
  const completedFollowUps = followUps.filter(f => f.status !== 'PENDING');

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      
      {/* Toast Feedback */}
      {feedback && (
        <div className={`mb-6 p-4 rounded-xl flex items-center justify-between shadow-sm ${
          feedback.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <div className="flex items-center">
            {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5 mr-3 shrink-0" /> : <AlertCircle className="w-5 h-5 mr-3 shrink-0" />}
            <span className="font-medium text-sm">{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600 font-bold ml-4">✕</button>
        </div>
      )}

      {/* Top Action Bar */}
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Link to="/admin/enquiries" className="flex items-center text-slate-500 hover:text-blue-600 font-medium transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Enquiries
        </Link>
        <div className="flex space-x-3">
          {enquiry.customer.phone && (
            <a 
              href={`https://wa.me/${enquiry.customer.phone.replace(/[^0-9]/g, '')}`} 
              target="_blank" 
              rel="noreferrer" 
              className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium shadow-sm hover:bg-green-700 flex items-center text-sm"
            >
              <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp Client
            </a>
          )}
          <button
            onClick={() => { setIsDeleteModalOpen(true); setDeleteError(null); }}
            className="bg-white border border-red-200 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg font-medium text-sm flex items-center shadow-sm transition-colors"
          >
            <Trash2 className="w-4 h-4 mr-2" /> Delete Enquiry
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        
        {/* Left Column: Details */}
        <div className="w-full md:w-2/3 space-y-6">
          
          {/* Main Info Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">{enquiry.referenceNumber}</h1>
                <p className="text-slate-500 font-medium text-sm mt-0.5">Source: {enquiry.source.replace(/_/g, ' ')}</p>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase">Status:</span>
                <select 
                  value={enquiry.status}
                  onChange={(e) => updateStatusMutation.mutate(e.target.value)}
                  disabled={updateStatusMutation.isPending}
                  className="bg-white border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 font-bold shadow-sm"
                >
                  <option value="NEW">New Lead</option>
                  <option value="CONTACTED">Contacted</option>
                  <option value="FOLLOW_UP">Follow-up Required</option>
                  <option value="REQUIREMENT_COLLECTION">Requirement Collection</option>
                  <option value="QUOTATION_PREPARATION">Quotation Prep</option>
                  <option value="QUOTATION_SENT">Quotation Sent</option>
                  <option value="CONVERTED">Converted (Won)</option>
                  <option value="NOT_INTERESTED">Not Interested</option>
                  <option value="LOST">Lost</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">Customer Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-start"><User className="w-5 h-5 text-slate-400 mr-3 shrink-0"/><div><p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Name</p><p className="font-bold text-slate-900">{enquiry.customer.firstName} {enquiry.customer.lastName || ''}</p></div></div>
                  <div className="flex items-start"><Phone className="w-5 h-5 text-slate-400 mr-3 shrink-0"/><div><p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Phone</p><p className="font-medium text-slate-900">{enquiry.customer.phone || 'N/A'}</p></div></div>
                  <div className="flex items-start"><Mail className="w-5 h-5 text-slate-400 mr-3 shrink-0"/><div><p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Email</p><p className="font-medium text-slate-900">{enquiry.customer.email}</p></div></div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">Travel & Package Requirements</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div className="flex items-start"><MapPin className="w-5 h-5 text-blue-500 mr-3 shrink-0"/><div><p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Package / Destination</p><p className="font-bold text-blue-700">{enquiry.package?.title || enquiry.destination || 'General Enquiry'}</p></div></div>
                  <div className="flex items-start"><Calendar className="w-5 h-5 text-slate-400 mr-3 shrink-0"/><div><p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Travel Date</p><p className="font-medium text-slate-900">{enquiry.travelDate || 'Not specified'}</p></div></div>
                  <div className="flex items-start"><User className="w-5 h-5 text-slate-400 mr-3 shrink-0"/><div><p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Total Travellers</p><p className="font-medium text-slate-900">{enquiry.travellerCount ? `${enquiry.travellerCount} Travellers` : 'Not specified'}</p></div></div>
                  <div className="flex items-start"><DollarSign className="w-5 h-5 text-emerald-600 mr-3 shrink-0"/><div><p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Calculated Budget / Amount</p><p className="font-black text-emerald-600 text-base">{enquiry.budgetRange || 'Not specified'}</p></div></div>
                </div>

                {/* Package Booking Breakdown Summary Card */}
                {enquiry.message && enquiry.message.includes('PACKAGE BOOKING') ? (
                  <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-md space-y-3 mt-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                        Website Package Booking Breakdown
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Payment: PENDING
                      </span>
                    </div>

                    <pre className="text-xs font-mono text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {enquiry.message}
                    </pre>
                  </div>
                ) : enquiry.message ? (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mt-4">
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2">Message / Requirements</p>
                    <p className="text-slate-700 text-sm whitespace-pre-wrap">{enquiry.message}</p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
        
        {/* Right Column: Follow-ups, Assignments, Notes */}
        <div className="w-full md:w-1/3 space-y-6">
          
          {/* Follow-ups Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-blue-600" /> Follow-ups
              </h3>
              <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full">
                {overdueFollowUps.length + upcomingFollowUps.length} Pending
              </span>
            </div>

            <button 
              onClick={handleOpenScheduleModal}
              className="w-full bg-blue-50 border border-blue-200 text-blue-700 font-bold py-2.5 rounded-xl hover:bg-blue-100 transition-colors flex items-center justify-center mb-6 shadow-sm"
            >
              <Plus className="w-4 h-4 mr-2" /> Schedule Follow-up
            </button>

            {/* Overdue Section */}
            {overdueFollowUps.length > 0 && (
              <div className="mb-6 space-y-3">
                <p className="text-xs font-bold text-red-600 uppercase tracking-wider flex items-center">
                  <AlertCircle className="w-3.5 h-3.5 mr-1" /> Overdue ({overdueFollowUps.length})
                </p>
                {overdueFollowUps.map(item => (
                  <div key={item.id} className="bg-red-50 border border-red-200 p-3 rounded-xl space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="px-2 py-0.5 bg-red-200 text-red-800 text-[10px] font-bold rounded uppercase">
                          {item.type}
                        </span>
                        <p className="text-xs font-bold text-red-900 mt-1">
                          {new Date(item.scheduledFor).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button 
                          title="Mark Complete" 
                          onClick={() => updateFollowUpMutation.mutate({ followUpId: item.id, payload: { status: 'COMPLETED' } })}
                          className="p-1 text-slate-500 hover:text-green-700 hover:bg-green-100 rounded"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button 
                          title="Cancel Follow-up" 
                          onClick={() => updateFollowUpMutation.mutate({ followUpId: item.id, payload: { status: 'CANCELLED' } })}
                          className="p-1 text-slate-500 hover:text-red-700 hover:bg-red-100 rounded"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                        <button 
                          title="Edit / Reschedule" 
                          onClick={() => handleEditFollowUp(item)}
                          className="p-1 text-slate-500 hover:text-blue-700 hover:bg-blue-100 rounded"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {item.notes && <p className="text-xs text-red-700">{item.notes}</p>}
                    {item.employee && <p className="text-[11px] text-red-600 font-medium">Assigned: {item.employee.firstName} {item.employee.lastName}</p>}
                  </div>
                ))}
              </div>
            )}

            {/* Upcoming Section */}
            {upcomingFollowUps.length > 0 && (
              <div className="mb-6 space-y-3">
                <p className="text-xs font-bold text-amber-600 uppercase tracking-wider flex items-center">
                  <Calendar className="w-3.5 h-3.5 mr-1" /> Upcoming ({upcomingFollowUps.length})
                </p>
                {upcomingFollowUps.map(item => (
                  <div key={item.id} className="bg-amber-50 border border-amber-200 p-3 rounded-xl space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="px-2 py-0.5 bg-amber-200 text-amber-800 text-[10px] font-bold rounded uppercase">
                          {item.type}
                        </span>
                        <p className="text-xs font-bold text-amber-900 mt-1">
                          {new Date(item.scheduledFor).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button 
                          title="Mark Complete" 
                          onClick={() => updateFollowUpMutation.mutate({ followUpId: item.id, payload: { status: 'COMPLETED' } })}
                          className="p-1 text-slate-500 hover:text-green-700 hover:bg-green-100 rounded"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button 
                          title="Cancel Follow-up" 
                          onClick={() => updateFollowUpMutation.mutate({ followUpId: item.id, payload: { status: 'CANCELLED' } })}
                          className="p-1 text-slate-500 hover:text-red-700 hover:bg-red-100 rounded"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                        <button 
                          title="Edit / Reschedule" 
                          onClick={() => handleEditFollowUp(item)}
                          className="p-1 text-slate-500 hover:text-blue-700 hover:bg-blue-100 rounded"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {item.notes && <p className="text-xs text-amber-800">{item.notes}</p>}
                    {item.employee && <p className="text-[11px] text-amber-700 font-medium">Assigned: {item.employee.firstName} {item.employee.lastName}</p>}
                  </div>
                ))}
              </div>
            )}

            {/* Completed Section */}
            {completedFollowUps.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Completed / History ({completedFollowUps.length})</p>
                {completedFollowUps.map(item => (
                  <div key={item.id} className="bg-slate-50 border border-slate-200 p-3 rounded-xl opacity-75">
                    <div className="flex justify-between items-center">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                        item.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {item.status} ({item.type})
                      </span>
                      <span className="text-[10px] text-slate-500">{new Date(item.scheduledFor).toLocaleDateString()}</span>
                    </div>
                    {item.notes && <p className="text-xs text-slate-600 mt-1">{item.notes}</p>}
                  </div>
                ))}
              </div>
            )}

            {followUps.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-4">No follow-ups scheduled yet.</p>
            )}
          </div>

          {/* Internal Notes Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center justify-between">
              Internal Notes 
              <button onClick={() => setIsNoteModalOpen(true)} className="text-xs text-blue-600 font-bold hover:underline">+ Add Note</button>
            </h3>
            <div className="space-y-4 max-h-60 overflow-y-auto">
              {enquiry.notes.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-2">No notes added yet.</p>
              ) : (
                enquiry.notes.map((note) => (
                  <div key={note.id} className="border-l-2 border-blue-500 pl-4 py-1">
                    <p className="text-[11px] text-slate-400">{new Date(note.createdAt).toLocaleString()}</p>
                    <p className="text-sm text-slate-700 mt-0.5 whitespace-pre-wrap">{note.text}</p>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Unified Timeline */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-600" /> Activity Timeline
          </h3>
        </div>
        <div className="p-6 max-h-[600px] overflow-y-auto bg-slate-900">
          <Timeline events={timelineEvents} loading={isLoadingTimeline} />
        </div>
      </div>

      {/* Schedule / Edit Follow-Up Modal */}
      {isFollowUpModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                {isEditFollowUpMode ? 'Edit / Reschedule Follow-up' : 'Schedule Follow-up'}
              </h2>
            </div>
            
            <form onSubmit={handleFollowUpSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Follow-up Type</label>
                <select 
                  value={followUpFormData.type} 
                  onChange={e => setFollowUpFormData({ ...followUpFormData, type: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="CALL">Phone Call</option>
                  <option value="WHATSAPP">WhatsApp Message</option>
                  <option value="EMAIL">Email</option>
                  <option value="MEETING">Meeting</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Scheduled Date & Time</label>
                <input 
                  required
                  type="datetime-local" 
                  value={followUpFormData.scheduledFor}
                  onChange={e => setFollowUpFormData({ ...followUpFormData, scheduledFor: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Assign to Employee</label>
                <select 
                  value={followUpFormData.employeeId} 
                  onChange={e => setFollowUpFormData({ ...followUpFormData, employeeId: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Default (Auto-assign)</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Notes / Action Details</label>
                <textarea 
                  rows={3}
                  value={followUpFormData.notes}
                  onChange={e => setFollowUpFormData({ ...followUpFormData, notes: e.target.value })}
                  placeholder="e.g. Call regarding package quotation feedback"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                ></textarea>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={closeFollowUpModal} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg">Cancel</button>
                <button type="submit" disabled={scheduleFollowUpMutation.isPending || updateFollowUpMutation.isPending} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {scheduleFollowUpMutation.isPending || updateFollowUpMutation.isPending ? 'Saving...' : (isEditFollowUpMode ? 'Save Changes' : 'Schedule Follow-up')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Internal Note Modal */}
      {isNoteModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Add Internal Note</h2>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); if (newNoteText.trim()) addNoteMutation.mutate(newNoteText); }} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Note Text</label>
                <textarea 
                  required
                  rows={4}
                  value={newNoteText}
                  onChange={e => setNewNoteText(e.target.value)}
                  placeholder="Type internal notes regarding this lead..."
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                ></textarea>
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsNoteModalOpen(false)} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg">Cancel</button>
                <button type="submit" disabled={addNoteMutation.isPending} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {addNoteMutation.isPending ? 'Saving...' : 'Add Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 flex flex-col">
            <div className="flex items-center space-x-3 mb-4 text-red-600">
              <div className="p-3 bg-red-100 rounded-full">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Delete Enquiry?</h3>
            </div>

            <p className="text-slate-600 text-sm mb-4 leading-relaxed">
              Are you sure you want to delete this enquiry? This action cannot be undone.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600 mb-6 space-y-1">
              <div><span className="font-semibold text-slate-800">Reference:</span> {enquiry.referenceNumber}</div>
              <div><span className="font-semibold text-slate-800">Customer:</span> {enquiry.customer.firstName} {enquiry.customer.lastName || ''}</div>
              <div><span className="font-semibold text-slate-800">Source:</span> {enquiry.source}</div>
            </div>

            {deleteError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-start">
                <AlertCircle className="w-4 h-4 mr-2 mt-0.5 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => { setIsDeleteModalOpen(false); setDeleteError(null); }}
                className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 font-medium text-sm transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium text-sm shadow-sm transition-colors flex items-center disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
