import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';
import { Plus, Search, Filter, Edit, Trash2, Briefcase, CheckCircle2, XCircle } from 'lucide-react';

interface Department {
  id: string;
  name: string;
}

interface Designation {
  id: string;
  name: string;
  departmentId: string;
  department: Department;
  isActive: boolean;
  _count: { employees: number };
}

export default function DesignationList() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    departmentId: '',
    isActive: true,
  });

  // Fetch departments for filter dropdown & modal form
  const { data: departmentsData } = useQuery<{ data: Department[] }>({
    queryKey: ['departments'],
    queryFn: async () => {
      const res = await api.get('/hr/departments');
      return res.data;
    },
  });

  // Fetch designations
  const { data: designationsData, isLoading } = useQuery<{ data: Designation[] }>({
    queryKey: ['designations', searchTerm, selectedDeptFilter, selectedStatusFilter],
    queryFn: async () => {
      let query = `/hr/designations?`;
      if (searchTerm) query += `search=${encodeURIComponent(searchTerm)}&`;
      if (selectedDeptFilter) query += `departmentId=${selectedDeptFilter}&`;
      if (selectedStatusFilter) query += `isActive=${selectedStatusFilter === 'ACTIVE'}&`;
      
      const res = await api.get(query);
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (newDesignation: typeof formData) => {
      const res = await api.post('/hr/designations', newDesignation);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['designations'] });
      closeModal();
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to create designation');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (updatedDesignation: typeof formData) => {
      const res = await api.patch(`/hr/designations/${editingId}`, updatedDesignation);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['designations'] });
      closeModal();
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to update designation');
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, currentStatus }: { id: string; currentStatus: boolean }) => {
      const res = await api.patch(`/hr/designations/${id}`, { isActive: !currentStatus });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['designations'] });
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to toggle status');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/hr/designations/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['designations'] });
      alert('Designation deleted successfully');
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to delete designation');
    }
  });

  const closeModal = () => {
    setIsModalOpen(false);
    setIsEditMode(false);
    setEditingId(null);
    setFormData({ name: '', departmentId: '', isActive: true });
  };

  const handleEditClick = (e: React.MouseEvent, desig: Designation) => {
    e.stopPropagation();
    setIsEditMode(true);
    setEditingId(desig.id);
    setFormData({
      name: desig.name,
      departmentId: desig.departmentId,
      isActive: desig.isActive,
    });
    setIsModalOpen(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this designation?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditMode) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const designations = designationsData?.data || [];
  const departments = departmentsData?.data || [];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Designations</h1>
          <p className="text-slate-500 mt-1">Manage company roles and job designations.</p>
        </div>
        <button 
          onClick={() => {
            setIsEditMode(false);
            setFormData({ name: '', departmentId: departments[0]?.id || '', isActive: true });
            setIsModalOpen(true);
          }}
          className="flex items-center px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Designation
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="text"
              placeholder="Search designations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex gap-3 w-full md:w-auto">
            <select
              value={selectedDeptFilter}
              onChange={(e) => setSelectedDeptFilter(e.target.value)}
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>

            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-slate-500">Loading designations...</div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100 text-left text-sm font-bold text-slate-500 uppercase">
              <tr>
                <th className="px-6 py-4">Designation Name</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Employees</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {designations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    No designations found.
                  </td>
                </tr>
              ) : (
                designations.map((desig) => (
                  <tr key={desig.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                          <Briefcase className="w-5 h-5" />
                        </div>
                        <p className="font-bold text-slate-900">{desig.name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">
                      <span className="px-3 py-1 bg-slate-100 rounded-lg text-sm text-slate-700 font-medium">
                        {desig.department?.name || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-bold bg-slate-100 text-slate-700">
                        {desig._count?.employees || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                        desig.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {desig.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={(e) => handleEditClick(e, desig)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Designation"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={(e) => handleDeleteClick(e, desig.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Designation"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                        <button 
                          className={`p-2 rounded-lg transition-colors ${
                            desig.isActive ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50' : 'text-slate-400 hover:text-green-600 hover:bg-green-50'
                          }`}
                          title={desig.isActive ? "Deactivate Designation" : "Activate Designation"}
                          onClick={() => toggleStatusMutation.mutate({ id: desig.id, currentStatus: desig.isActive })}
                        >
                          {desig.isActive ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                {isEditMode ? 'Edit Designation' : 'Add Designation'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Designation Name</label>
                <input 
                  required 
                  type="text" 
                  value={formData.name} 
                  onChange={e => setFormData({ ...formData, name: e.target.value })} 
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Senior Travel Consultant"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Department</label>
                <select 
                  required 
                  value={formData.departmentId} 
                  onChange={e => setFormData({ ...formData, departmentId: e.target.value })} 
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="" disabled>Select Department...</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input 
                  type="checkbox" 
                  id="isActive"
                  checked={formData.isActive}
                  onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-slate-300"
                />
                <label htmlFor="isActive" className="text-sm font-bold text-slate-700">Active Status</label>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : (isEditMode ? 'Update Designation' : 'Save Designation')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
