import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';
import { Mail, Phone, Calendar, MessageSquare, Trash2, X, Eye } from 'lucide-react';

interface FeedbackEnquiry {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
}

export default function FeedbackEnquiries() {
  const queryClient = useQueryClient();
  const [selectedEnquiry, setSelectedEnquiry] = useState<FeedbackEnquiry | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<{type: 'success'|'error', message: string} | null>(null);

  const { data: enquiries, isLoading, isError } = useQuery({
    queryKey: ['feedback-enquiries'],
    queryFn: async () => {
      const res = await api.get('/contact');
      return res.data as FeedbackEnquiry[];
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await api.patch(`/contact/${id}/status`, { status });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback-enquiries'] });
      setFeedback({ type: 'success', message: 'Status updated successfully' });
      setIsModalOpen(false);
    },
    onError: () => {
      setFeedback({ type: 'error', message: 'Failed to update status' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/contact/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback-enquiries'] });
      setFeedback({ type: 'success', message: 'Feedback enquiry deleted' });
      setIsModalOpen(false);
    },
    onError: () => {
      setFeedback({ type: 'error', message: 'Failed to delete feedback' });
    }
  });

  const openEnquiry = (enquiry: FeedbackEnquiry) => {
    setSelectedEnquiry(enquiry);
    setIsModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'NEW': return <span className="px-2.5 py-1 text-xs font-bold bg-blue-100 text-blue-700 rounded-full">New</span>;
      case 'READ': return <span className="px-2.5 py-1 text-xs font-bold bg-amber-100 text-amber-700 rounded-full">Read</span>;
      case 'RESOLVED': return <span className="px-2.5 py-1 text-xs font-bold bg-emerald-100 text-emerald-700 rounded-full">Resolved</span>;
      default: return <span className="px-2.5 py-1 text-xs font-bold bg-slate-100 text-slate-700 rounded-full">{status}</span>;
    }
  };

  if (isLoading) return <div className="p-8 text-center text-slate-500 font-bold">Loading feedback...</div>;
  if (isError) return <div className="p-8 text-center text-rose-500 font-bold">Failed to load feedback enquiries.</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Feedback Enquiries</h1>
          <p className="text-slate-500 mt-1">Manage customer messages and feedback from the website.</p>
        </div>
      </div>

      {feedback && (
        <div className={`mb-6 p-4 rounded-xl flex items-center font-bold text-sm ${feedback.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {feedback.message}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {(!enquiries || enquiries.length === 0) ? (
          <div className="p-12 text-center flex flex-col items-center">
            <MessageSquare className="w-12 h-12 text-slate-300 mb-3" />
            <p className="text-slate-500 font-bold">No feedback enquiries found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500">
                  <th className="p-4 font-bold">Customer Details</th>
                  <th className="p-4 font-bold">Subject</th>
                  <th className="p-4 font-bold">Date</th>
                  <th className="p-4 font-bold">Status</th>
                  <th className="p-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {enquiries.map((enq) => (
                  <tr key={enq.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-900">{enq.name}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {enq.email}</span>
                        {enq.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {enq.phone}</span>}
                      </div>
                    </td>
                    <td className="p-4 text-sm font-semibold text-slate-700">
                      {enq.subject}
                    </td>
                    <td className="p-4 text-xs font-bold text-slate-500">
                      {new Date(enq.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-4">
                      {getStatusBadge(enq.status)}
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => openEnquiry(enq)}
                        className="px-3 py-1.5 text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg transition-colors inline-flex items-center"
                      >
                        <Eye className="w-4 h-4 mr-1.5" /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && selectedEnquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-xl font-black text-slate-900">Feedback Details</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Customer Name</p>
                  <p className="font-bold text-slate-900">{selectedEnquiry.name}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Contact Details</p>
                  <p className="text-sm font-bold text-slate-700 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {selectedEnquiry.email}</p>
                  {selectedEnquiry.phone && (
                    <p className="text-sm font-bold text-slate-700 flex items-center gap-1.5 mt-1"><Phone className="w-3.5 h-3.5" /> {selectedEnquiry.phone}</p>
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Date Submitted</p>
                  <p className="text-sm font-bold text-slate-700 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {new Date(selectedEnquiry.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Current Status</p>
                  <div>{getStatusBadge(selectedEnquiry.status)}</div>
                </div>
              </div>

              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Subject</p>
                <p className="font-bold text-slate-900 mb-4">{selectedEnquiry.subject}</p>
                
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Complete Message</p>
                <div className="text-slate-700 whitespace-pre-wrap text-sm leading-relaxed">
                  {selectedEnquiry.message}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if(confirm('Are you sure you want to delete this enquiry?')) {
                      deleteMutation.mutate(selectedEnquiry.id);
                    }
                  }}
                  disabled={deleteMutation.isPending}
                  className="px-4 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg flex items-center transition-colors"
                >
                  <Trash2 className="w-4 h-4 mr-1.5" /> Delete
                </button>
              </div>
              <div className="flex gap-2">
                {selectedEnquiry.status !== 'NEW' && (
                  <button
                    onClick={() => updateStatusMutation.mutate({ id: selectedEnquiry.id, status: 'NEW' })}
                    disabled={updateStatusMutation.isPending}
                    className="px-4 py-2 text-xs font-bold text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors"
                  >
                    Mark as New
                  </button>
                )}
                {selectedEnquiry.status !== 'READ' && (
                  <button
                    onClick={() => updateStatusMutation.mutate({ id: selectedEnquiry.id, status: 'READ' })}
                    disabled={updateStatusMutation.isPending}
                    className="px-4 py-2 text-xs font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors"
                  >
                    Mark as Read
                  </button>
                )}
                {selectedEnquiry.status !== 'RESOLVED' && (
                  <button
                    onClick={() => updateStatusMutation.mutate({ id: selectedEnquiry.id, status: 'RESOLVED' })}
                    disabled={updateStatusMutation.isPending}
                    className="px-4 py-2 text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors"
                  >
                    Mark as Resolved
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
