import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { Plus, Edit2, Trash2, Users, UserCheck, ArrowRightLeft, User, Globe } from 'lucide-react';
import NewLeadModal from '../../../components/admin/crm/NewLeadModal';
import EditLeadModal from '../../../components/admin/crm/EditLeadModal';
import LeadAssignmentOverviewModal from '../../../components/admin/crm/LeadAssignmentOverviewModal';
import LeadAssignmentModal from '../../../components/admin/crm/LeadAssignmentModal';
import { useAuth } from '../../../context/AuthContext';

const LeadKanbanBoard = () => {
  const navigate = useNavigate();
  const { user, hasRole, hasPermission } = useAuth();
  const [stages, setStages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<any>(null);
  const [isOverviewOpen, setIsOverviewOpen] = useState(false);
  const [assigningLead, setAssigningLead] = useState<any>(null);

  // Sales Manager detection and view scope ('personal' | 'all')
  const isSalesManager =
    hasRole(['Sales Manager', 'SALES_MANAGER']) ||
    user?.roleName?.toUpperCase() === 'SALES_MANAGER' ||
    user?.roleName?.toLowerCase().trim() === 'sales manager';

  const [viewScope, setViewScope] = useState<'personal' | 'all'>('personal');

  const canManageSettings = hasRole(['CEO / Super Admin', 'Admin', 'ADMIN', 'SUPER_ADMIN']);
  const canAssignLeads = hasRole(['Sales Manager', 'CEO / Super Admin', 'Admin', 'ADMIN', 'SUPER_ADMIN']) ||
    hasPermission('sales_crm:manage') ||
    hasPermission('sales_crm:assign');

  const canManageLeadCard = (lead: any) => {
    if (canManageSettings || isSalesManager) return true;
    const currentEmployeeId = user?.employee?.id;
    if (!currentEmployeeId || !lead?.assignedToId) return false;
    return lead.assignedToId === currentEmployeeId;
  };

  useEffect(() => {
    fetchPipeline(viewScope);
  }, [viewScope]);

  const fetchPipeline = async (scope: 'personal' | 'all' = viewScope) => {
    try {
      setLoading(true);
      const params: any = {};
      if (isSalesManager) {
        params.scope = scope;
      }
      const { data } = await api.get('/crm/sales/pipeline', { params });
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

  if (loading) return <div className="p-4 sm:p-8 w-full min-w-0 text-center text-gray-500">Loading pipeline...</div>;

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Pipeline</h1>
          <p className="text-xs text-gray-500 mt-0.5">Manage pipeline stages and automatic executive assignments</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Sales Manager Personal / All Leads Toggle */}
          {isSalesManager && (
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setViewScope('personal')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewScope === 'personal'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="View only leads assigned to you"
              >
                <User className="w-3.5 h-3.5" />
                <span>Personal</span>
              </button>
              <button
                type="button"
                onClick={() => setViewScope('all')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewScope === 'all'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="View all team leads across the sales organization"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>All Leads</span>
              </button>
            </div>
          )}

          {canAssignLeads && (
            <button
              onClick={() => setIsOverviewOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm font-semibold shadow-2xs transition-colors"
            >
              <Users className="w-4 h-4 text-blue-600" />
              <span>Assignment Overview</span>
            </button>
          )}
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold shadow-2xs transition-colors"
          >
            <Plus className="w-4 h-4" /> New Lead
          </button>
        </div>
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
                {stage.leads?.map((lead: any) => {
                  const isOwnOrAdmin = canManageLeadCard(lead);
                  return (
                  <div
                    key={lead.id}
                    draggable={isOwnOrAdmin}
                    onDragStart={(e) => {
                      if (isOwnOrAdmin) handleDragStart(e, lead.id);
                    }}
                    onClick={() => {
                      if (isOwnOrAdmin) navigate(`/admin/crm/leads/${lead.id}`);
                    }}
                    className={`bg-white p-4 rounded-lg border border-gray-200 shadow-sm transition-all relative group ${
                      isOwnOrAdmin
                        ? 'cursor-pointer hover:border-blue-300 hover:shadow-md'
                        : 'cursor-default opacity-80'
                    }`}
                  >
                    <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {canAssignLeads && isOwnOrAdmin && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAssigningLead(lead);
                          }}
                          className="text-gray-400 hover:text-blue-600"
                          title={lead.assignedToId ? 'Reassign Lead' : 'Assign Lead'}
                        >
                          <ArrowRightLeft className="w-4 h-4" />
                        </button>
                      )}
                      {isOwnOrAdmin && (
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
                      )}
                      {isOwnOrAdmin && (
                        <button
                          onClick={(e) => handleDeleteLead(e, lead.id)}
                          className="text-gray-400 hover:text-red-600"
                          title="Delete Lead"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <h4 className="font-medium text-gray-900 mb-1 pr-16">{lead.title}</h4>
                    <p className="text-sm text-gray-500 mb-2">{lead.customer?.firstName} {lead.customer?.lastName}</p>

                    {/* Assignee Pill */}
                    <div className="flex items-center justify-between text-xs my-2">
                      {lead.assignedTo ? (
                        <div className="flex items-center gap-1.5 text-slate-700 bg-slate-100/80 px-2 py-0.5 rounded-md font-medium text-[11px]">
                          <div className="w-3.5 h-3.5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-bold">
                            {lead.assignedTo.firstName?.[0]}
                          </div>
                          <span className="truncate max-w-[130px]">
                            {lead.assignedTo.firstName} {lead.assignedTo.lastName}
                          </span>
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          Unassigned
                        </span>
                      )}

                      {lead.assignmentType && lead.assignedTo && (
                        <span className={`text-[10px] font-semibold ${
                          lead.assignmentType === 'AUTOMATIC' ? 'text-emerald-600' : 'text-blue-600'
                        }`}>
                          {lead.assignmentType === 'AUTOMATIC' ? 'Auto' : 'Manual'}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                      <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {lead.priority}
                      </span>
                      {lead.expectedValue && (
                        <span className="text-sm font-semibold text-gray-700">
                          ₹{lead.expectedValue.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                  );
                })}
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
      <LeadAssignmentOverviewModal
        isOpen={isOverviewOpen}
        onClose={() => setIsOverviewOpen(false)}
        canManageSettings={canManageSettings}
        canAssignLeads={canAssignLeads}
        onWorkloadChanged={fetchPipeline}
      />
      <LeadAssignmentModal
        isOpen={!!assigningLead}
        onClose={() => setAssigningLead(null)}
        onSuccess={() => {
          setAssigningLead(null);
          fetchPipeline();
        }}
        lead={assigningLead}
      />
    </div>
  );
};

export default LeadKanbanBoard;
