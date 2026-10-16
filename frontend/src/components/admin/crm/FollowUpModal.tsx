import React, { useState, useEffect } from 'react';
import api from '../../../services/api';

interface FollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  leadId: string;
  existingFollowUp?: any;
}

const FollowUpModal: React.FC<FollowUpModalProps> = ({ isOpen, onClose, onSuccess, leadId, existingFollowUp }) => {
  const [formData, setFormData] = useState({
    type: 'Call',
    notes: '',
    scheduledFor: '',
    status: 'PENDING'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (existingFollowUp) {
      // Format datetime-local string (YYYY-MM-DDThh:mm)
      const dateStr = new Date(existingFollowUp.scheduledFor).toISOString().slice(0, 16);
      setFormData({
        type: existingFollowUp.type || 'Call',
        notes: existingFollowUp.notes || '',
        scheduledFor: dateStr,
        status: existingFollowUp.status || 'PENDING'
      });
    } else {
      setFormData({
        type: 'Call',
        notes: '',
        scheduledFor: '',
        status: 'PENDING'
      });
    }
  }, [existingFollowUp, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (existingFollowUp) {
        await api.patch(`/crm/leads/${leadId}/followups/${existingFollowUp.id}`, formData);
      } else {
        await api.post(`/crm/leads/${leadId}/followups`, formData);
      }
      onSuccess();
    } catch (error: any) {
      console.error('Failed to save follow-up', error);
      alert(error.response?.data?.error || 'Failed to save follow-up');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            {existingFollowUp ? 'Edit Follow-up' : 'New Follow-up'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={formData.type}
              onChange={e => setFormData({ ...formData, type: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="Call">Call</option>
              <option value="Email">Email</option>
              <option value="Meeting">Meeting</option>
              <option value="Message">Message</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Date & Time</label>
            <input
              type="datetime-local"
              value={formData.scheduledFor}
              onChange={e => setFormData({ ...formData, scheduledFor: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="What needs to be discussed..."
            />
          </div>

          {existingFollowUp && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="PENDING">Pending</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Follow-up'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FollowUpModal;
