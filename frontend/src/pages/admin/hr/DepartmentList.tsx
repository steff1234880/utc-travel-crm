import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';
import { Plus, Search, Filter, Edit, Trash2, Building2 } from 'lucide-react';

interface Department {
  id: string;
  name: string;
  description: string;
  _count: { employees: number };
}

export default function DepartmentList() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  const { data, isLoading } = useQuery<{ data: Department[] }>({
    queryKey: ['departments', searchTerm],
    queryFn: async () => {
      const res = await api.get(`/hr/departments${searchTerm ? `?search=${searchTerm}` : ''}`);
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (newDept: typeof formData) => {
      const res = await api.post('/hr/departments', newDept);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      closeModal();
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to create department');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (updatedDept: typeof formData) => {
      const res = await api.patch(`/hr/departments/${editingId}`, updatedDept);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      closeModal();
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to update department');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/hr/departments/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to delete department');
    }
  });

  const closeModal = () => {
    setIsModalOpen(false);
    setIsEditMode(false);
    setEditingId(null);
    setFormData({ name: '', description: '' });
  };

  const handleEditClick = (e: React.MouseEvent, dept: Department) => {
    e.stopPropagation();
    setIsEditMode(true);
    setEditingId(dept.id);
    setFormData({
      name: dept.name,
      description: dept.description || '',
    });
    setIsModalOpen(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to deactivate/delete this department?')) {
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

  // Basic client-side search filter
  const filteredDepartments = data?.data?.filter(dept => 
    dept.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Departments</h1>
          <p className="text-slate-500 mt-1">Manage company organizational structure.</p>
        </div>
        <button 
          onClick={() => {
            setIsEditMode(false);
            setFormData({ name: '', description: '' });
            setIsModalOpen(true);
          }}
          className="flex items-center px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Department
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="text"
              placeholder="Search departments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button className="flex items-center px-4 py-2 text-slate-600 font-medium border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            <Filter className="w-5 h-5 mr-2" />
            Filters
          </button>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-slate-500">Loading departments...</div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100 text-left text-sm font-bold text-slate-500 uppercase">
              <tr>
                <th className="px-6 py-4">Department Name</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4">Employees</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDepartments.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                    No departments found.
                  </td>
                </tr>
              ) : (
                filteredDepartments.map((dept) => (
                  <tr key={dept.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <p className="font-bold text-slate-900">{dept.name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">
                      {dept.description || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-bold bg-slate-100 text-slate-700">
                        {dept._count?.employees || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Department"
                          onClick={(e) => handleEditClick(e, dept)}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          className={`p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ${dept._count?.employees > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                          title={dept._count?.employees > 0 ? "Cannot delete: has assigned employees" : "Delete Department"}
                          onClick={(e) => dept._count?.employees === 0 && handleDeleteClick(e, dept.id)}
                          disabled={dept._count?.employees > 0}
                        >
                          <Trash2 className="w-4 h-4" />
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
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">{isEditMode ? 'Edit Department' : 'Add Department'}</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Department Name</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Description</label>
                <textarea rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : (isEditMode ? 'Update Department' : 'Save Department')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
