import React, { useState, useEffect } from 'react';
import api from '../../../services/api';

interface EditLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  lead: any;
}

const EditLeadModal: React.FC<EditLeadModalProps> = ({ isOpen, onClose, onSuccess, lead }) => {
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    source: '',
    pipelineStage: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    followUpDate: '',
    notes: ''
  });

  useEffect(() => {
    if (isOpen && lead) {
      setFormData({
        title: lead.title || '',
        source: lead.source || '',
        pipelineStage: lead.pipelineStage?.name || '',
        firstName: lead.customer?.firstName || '',
        lastName: lead.customer?.lastName || '',
        email: lead.customer?.email || '',
        phone: lead.customer?.phone || '',
        followUpDate: '',
        notes: ''
      });
    }
  }, [isOpen, lead]);

  if (!isOpen || !lead) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.patch(`/crm/leads/${lead.id}`, formData);
      onSuccess();
    } catch (error: any) {
      console.error('Failed to update lead', error);
      alert(error.response?.data?.error || 'Failed to update lead');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Edit Lead</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Lead Name / Title *</label>
              <input type="text" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Source</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.source} onChange={e => setFormData({...formData, source: e.target.value})}>
                <option value="Manual Entry">Manual Entry</option>
                <option value="Website Enquiry">Website Enquiry</option>
                <option value="Referral">Referral</option>
                <option value="Social Media">Social Media</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">First Name *</label>
              <input type="text" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} required />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Last Name</label>
              <input type="text" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Email</label>
              <input type="email" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Phone</label>
              <input type="tel" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Pipeline Stage</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900"
                value={formData.pipelineStage} onChange={e => setFormData({...formData, pipelineStage: e.target.value})}>
                <option value="New">New</option>
                <option value="Contacted">Contacted</option>
                <option value="Qualified">Qualified</option>
                <option value="Proposal Sent">Proposal Sent</option>
                <option value="Negotiation">Negotiation</option>
                <option value="Won">Won</option>
                <option value="Lost">Lost</option>
              </select>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick Follow-up (Optional)</h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Follow-up Date & Time</label>
                <input type="datetime-local" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                  value={formData.followUpDate} onChange={e => setFormData({...formData, followUpDate: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Notes</label>
                <textarea rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                  value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="E.g. Discussed pricing..." />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditLeadModal;
