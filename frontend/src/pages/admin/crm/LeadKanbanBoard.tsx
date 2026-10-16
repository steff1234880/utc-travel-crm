import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import NewLeadModal from '../../../components/admin/crm/NewLeadModal';
import EditLeadModal from '../../../components/admin/crm/EditLeadModal';

const LeadKanbanBoard = () => {
  const navigate = useNavigate();
  const [stages, setStages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<any>(null);

  useEffect(() => {
    fetchPipeline();
  }, []);

  const fetchPipeline = async () => {
    try {
      const { data } = await api.get('/crm/sales/pipeline');
      setStages(data.data);
    } catch (error) {
      console.error('Failed to fetch pipeline', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLead = async (e: React.MouseEvent, leadId: string) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this lead? This action cannot be undone.')) {
      return;
    }
    
    try {
      await api.delete(`/crm/leads/${leadId}`);
      fetchPipeline();
    } catch (error: any) {
      console.error('Failed to delete lead', error);
      alert(error.response?.data?.error || 'Failed to delete lead. Please try again.');
    }
  };

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('leadId', leadId);
  };

  const handleDrop = async (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('leadId');
    if (!leadId) return;

    try {
      await api.patch(`/crm/leads/${leadId}/stage`, { pipelineStageId: stageId });
      fetchPipeline();
    } catch (error) {
      console.error('Failed to move lead', error);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading pipeline...</div>;

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sales Pipeline</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> New Lead
        </button>
      </div>

      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-6 h-full pb-4 items-start">
          {stages.map((stage) => (
            <div
              key={stage.id}
              className="flex-shrink-0 w-80 bg-gray-50 rounded-xl p-4 flex flex-col"
              style={{ minHeight: '500px' }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }}></span>
                  {stage.name}
                </h3>
                <span className="bg-white text-gray-500 text-xs px-2 py-1 rounded-full border border-gray-200">
                  {stage.leads?.length || 0}
                </span>
              </div>

              <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
                {stage.leads?.map((lead: any) => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, lead.id)}
                    onClick={() => navigate(`/admin/crm/leads/${lead.id}`)}
                    className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:border-blue-300 hover:shadow-md transition-all relative group"
                  >
                    <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingLead(lead);
                          setIsEditModalOpen(true);
                        }}
                        className="text-gray-400 hover:text-blue-600"
                        title="Edit Lead"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteLead(e, lead.id)}
                        className="text-gray-400 hover:text-red-600"
                        title="Delete Lead"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <h4 className="font-medium text-gray-900 mb-1 pr-12">{lead.title}</h4>
                    <p className="text-sm text-gray-500 mb-3">{lead.customer?.firstName} {lead.customer?.lastName}</p>
                    
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                      <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {lead.priority}
                      </span>
                      {lead.expectedValue && (
                        <span className="text-sm font-semibold text-gray-700">
                          ${lead.expectedValue.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <NewLeadModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
          fetchPipeline();
        }}
      />
      <EditLeadModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingLead(null);
        }}
        onSuccess={() => {
          setIsEditModalOpen(false);
          setEditingLead(null);
          fetchPipeline();
        }}
        lead={editingLead}
      />
    </div>
  );
};

export default LeadKanbanBoard;
