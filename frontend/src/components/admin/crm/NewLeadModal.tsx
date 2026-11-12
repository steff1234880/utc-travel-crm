import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { X, UserCheck } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

interface NewLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Executive {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  roleName: string;
  designationName?: string;
  departmentName?: string;
}

const NewLeadModal: React.FC<NewLeadModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { hasRole, hasPermission } = useAuth();
  const [loading, setLoading] = useState(false);
  const [stages, setStages] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [executives, setExecutives] = useState<Executive[]>([]);
  const [loadingExecutives, setLoadingExecutives] = useState(false);
  
  const canAssignManually = hasRole(['Sales Manager', 'CEO / Super Admin', 'Admin', 'ADMIN', 'SUPER_ADMIN']) ||
    hasPermission('sales_crm:manage') ||
    hasPermission('sales_crm:assign');

  const [formData, setFormData] = useState({
    title: '',
    source: 'Manual Entry',
    status: 'NEW',
    expectedValue: 0,
    priority: 'MEDIUM',
    destination: '',
    pipelineStage: 'New',
    customerId: '', // if existing
    assignedToId: '', // '' indicates Auto Assign (Round Robin)
    
    // For new customer
    isNewCustomer: true,
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchStages();
      fetchCustomers();
      fetchExecutives();
    }
  }, [isOpen]);

  const fetchStages = async () => {
    // Retained for any future usage, but stage select is now hardcoded.
  };

  const fetchExecutives = async () => {
    setLoadingExecutives(true);
    try {
      // Fetch active, eligible Sales Executives
      const res = await api.get('/crm/leads/assignment/executives');
      if (res.data?.success && Array.isArray(res.data.data)) {
        setExecutives(res.data.data);
      } else {
        // Fallback to overview endpoint if available
        const overviewRes = await api.get('/crm/leads/assignment/overview');
        if (overviewRes.data?.success && Array.isArray(overviewRes.data.data?.executives)) {
          setExecutives(overviewRes.data.data.executives);
        }
      }
    } catch (err) {
      console.error('Failed to load eligible executives:', err);
      try {
        const overviewRes = await api.get('/crm/leads/assignment/overview');
        if (overviewRes.data?.success && Array.isArray(overviewRes.data.data?.executives)) {
          setExecutives(overviewRes.data.data.executives);
        }
      } catch (fallbackErr) {
        console.error('Fallback executive fetch also failed:', fallbackErr);
      }
    } finally {
      setLoadingExecutives(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data } = await api.get('/crm/customers');
      setCustomers(data.data);
    } catch (error) {
      console.error('Failed to fetch customers', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let finalCustomerId = formData.customerId;
      
      if (formData.isNewCustomer) {
        const { data: customerData } = await api.post('/crm/customers', {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone
        });
        finalCustomerId = customerData.data.id;
      }

      await api.post('/crm/leads', {
        title: formData.title,
        source: formData.source,
        status: formData.status,
        expectedValue: formData.expectedValue,
        priority: formData.priority,
        destination: formData.destination,
        pipelineStage: formData.pipelineStage,
        customerId: finalCustomerId,
        assignedToId: formData.assignedToId && formData.assignedToId.trim() !== '' ? formData.assignedToId : undefined
      });
      
      onSuccess();
    } catch (error: any) {
      console.error('Failed to create lead', error);
      alert(error.response?.data?.error || 'Failed to create lead');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Create New Lead</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Customer Selection */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Customer Details</h3>
            <div className="flex gap-4 mb-4">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input 
                  type="radio" 
                  checked={formData.isNewCustomer} 
                  onChange={() => setFormData({...formData, isNewCustomer: true})}
                  className="text-blue-600 focus:ring-blue-500"
                />
                New Customer
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input 
                  type="radio" 
                  checked={!formData.isNewCustomer} 
                  onChange={() => setFormData({...formData, isNewCustomer: false})}
                  className="text-blue-600 focus:ring-blue-500"
                />
                Existing Customer
              </label>
            </div>

            {formData.isNewCustomer ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">First Name *</label>
                  <input required type="text" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                    value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Last Name</label>
                  <input type="text" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                    value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Email *</label>
                  <input required type="email" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                    value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Phone</label>
                  <input type="text" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                    value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Select Customer *</label>
                <select 
                  required={!formData.isNewCustomer}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.customerId}
                  onChange={e => setFormData({...formData, customerId: e.target.value})}
                >
                  <option value="">-- Select Customer --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.firstName} {c.lastName} ({c.email})</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <hr className="border-gray-100" />

          {/* Lead Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Lead Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Lead Title *</label>
                <input required type="text" placeholder="e.g. Summer Vacation in Dubai" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                  value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
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
                <label className="block text-xs text-gray-500 mb-1">Destination</label>
                <input type="text" placeholder="e.g. Dubai" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                  value={formData.destination} onChange={e => setFormData({...formData, destination: e.target.value})} />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Expected Value (₹)</label>
                <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                  value={formData.expectedValue} onChange={e => setFormData({...formData, expectedValue: Number(e.target.value)})} />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Priority</label>
                <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})}>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Status</label>
                <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                  <option value="NEW">New</option>
                  <option value="IN_PROGRESS">In Progress</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1 flex items-center justify-between">
                  <span>Assign To</span>
                  {canAssignManually && (
                    <span className="text-[10px] text-blue-600 font-medium">Manual assignment authorized</span>
                  )}
                </label>
                <select 
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  value={formData.assignedToId} 
                  onChange={e => setFormData({...formData, assignedToId: e.target.value})}
                  disabled={!canAssignManually && executives.length > 0}
                >
                  <option value="">Auto Assign (Round Robin)</option>
                  {executives.map(exec => (
                    <option key={exec.id} value={exec.id}>
                      {exec.firstName} {exec.lastName} ({exec.roleName || exec.designationName || 'Sales Executive'})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-400 mt-1">
                  {formData.assignedToId 
                    ? 'This lead will be manually assigned to the selected Sales Executive.' 
                    : 'Default: Lead will be automatically assigned in strict sequential round-robin order.'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Creating...' : 'Create Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewLeadModal;
