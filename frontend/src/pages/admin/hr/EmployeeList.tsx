import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';
import { Plus, Search, Filter, Edit, Trash2, Eye } from 'lucide-react';
import { EmployeeProfileModal } from '../../../components/admin/EmployeeProfileModal';

interface Employee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  status: string;
  department: { id: string; name: string } | null;
  designation: { name: string } | null;
  user: { email: string, role?: { name: string } } | null;
}

export default function EmployeeList() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [selectedProfileEmpId, setSelectedProfileEmpId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    employeeId: '',
    status: 'ACTIVE',
    role: '',
    designation: '',
    departmentId: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const { data: rolesData } = useQuery<{ data: { id: string; name: string }[] }>({
    queryKey: ['roles'],
    queryFn: async () => {
      const res = await api.get('/roles');
      return res.data;
    },
  });

  const { data: departmentsData, isLoading: isDeptsLoading, isError: isDeptsError } = useQuery<{ data: { id: string, name: string }[] }>({
    queryKey: ['departments'],
    queryFn: async () => {
      const res = await api.get('/hr/departments');
      return res.data;
    },
  });

  const { data: designationsData } = useQuery<{ data: { id: string, name: string, departmentId: string }[] }>({
    queryKey: ['designations', formData.departmentId],
    queryFn: async () => {
      const url = `/hr/designations?isActive=true${formData.departmentId ? `&departmentId=${formData.departmentId}` : ''}`;
      const res = await api.get(url);
      return res.data;
    },
  });

  const { data, isLoading } = useQuery<{ data: Employee[] }>({
    queryKey: ['employees', searchTerm],
    queryFn: async () => {
      const res = await api.get(`/hr/employees${searchTerm ? `?search=${searchTerm}` : ''}`);
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (newEmployee: typeof formData) => {
      const res = await api.post('/hr/employees', newEmployee);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setFormSuccess('Employee and user account created successfully!');
      setTimeout(() => {
        closeModal();
      }, 1200);
    },
    onError: (error: any) => {
      setFormError(error.response?.data?.message || error.response?.data?.error || 'Failed to create employee');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (updatedEmployee: typeof formData) => {
      const res = await api.patch(`/hr/employees/${editingId}`, updatedEmployee);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setFormSuccess('Employee updated successfully!');
      setTimeout(() => {
        closeModal();
      }, 1200);
    },
    onError: (error: any) => {
      setFormError(error.response?.data?.message || error.response?.data?.error || 'Failed to update employee');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/hr/employees/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      setIsDeleteModalOpen(false);
      setEmployeeToDelete(null);
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to delete employee');
    }
  });

  const closeModal = () => {
    setIsModalOpen(false);
    setIsEditMode(false);
    setEditingId(null);
    setFormError(null);
    setFormSuccess(null);
    setFormData({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '', employeeId: '', status: 'ACTIVE', role: '', designation: '', departmentId: '' });
  };

  const handleEditClick = (e: React.MouseEvent, emp: Employee) => {
    e.stopPropagation();
    setIsEditMode(true);
    setEditingId(emp.id);
    setFormData({
      firstName: emp.firstName,
      lastName: emp.lastName,
      email: emp.user?.email || '',
      password: '',
      confirmPassword: '',
      employeeId: emp.employeeId,
      status: emp.status,
      role: emp.user?.role?.name || '',
      designation: emp.designation?.name || '',
      departmentId: emp.department?.id || '',
    });
    setIsModalOpen(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, emp: Employee) => {
    e.stopPropagation();
    setEmployeeToDelete(emp);
    setIsDeleteModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!isEditMode) {
      if (!formData.role) {
        setFormError('Role is required');
        return;
      }
      if (!formData.password) {
        setFormError('Password is required');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setFormError('Password confirmation does not match');
        return;
      }
      if (formData.password.length < 8) {
        setFormError('Password must be at least 8 characters long');
        return;
      }
      createMutation.mutate(formData);
    } else {
      updateMutation.mutate(formData);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Employees</h1>
          <p className="text-slate-500 mt-1">Manage your workforce directory.</p>
        </div>
        <button 
          onClick={() => {
            setIsEditMode(false);
            setFormError(null);
            setFormSuccess(null);
            setFormData({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '', employeeId: '', status: 'ACTIVE', role: '', designation: '', departmentId: '' });
            setIsModalOpen(true);
          }}
          className="flex items-center px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Employee
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="text"
              placeholder="Search by name or ID..."
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
          <div className="p-8 text-center text-slate-500">Loading employees...</div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100 text-left text-sm font-bold text-slate-500 uppercase">
              <tr>
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Role / Dept</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.data?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    No employees found.
                  </td>
                </tr>
              ) : (
                data?.data?.map((emp) => (
                  <tr 
                    key={emp.id} 
                    onClick={() => setSelectedProfileEmpId(emp.id)}
                    className="hover:bg-rose-50/30 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600">
                          {emp.firstName[0]}{emp.lastName[0]}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 hover:text-[#8b182b] transition-colors">{emp.firstName} {emp.lastName}</p>
                          <p className="text-sm text-slate-500">{emp.user?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">
                      {emp.employeeId}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-900">{emp.designation?.name || '-'}</p>
                      <p className="text-sm text-slate-500">{emp.department?.name || '-'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        emp.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {emp.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button 
                          className="p-2 text-slate-400 hover:text-[#8b182b] hover:bg-rose-50 rounded-lg transition-colors"
                          title="View Attendance & Performance"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProfileEmpId(emp.id);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Employee"
                          onClick={(e) => handleEditClick(e, emp as any)}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Employee"
                          onClick={(e) => handleDeleteClick(e, emp as any)}
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
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            
            <div className="px-6 py-4 border-b border-slate-100 shrink-0">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">{isEditMode ? 'Edit Employee' : 'Add Employee'}</h2>
            </div>
            
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                {formSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium rounded-lg">
                    {formSuccess}
                  </div>
                )}
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-sm font-medium rounded-lg">
                    {formError}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">First Name *</label>
                    <input required type="text" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Last Name *</label>
                    <input required type="text" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Work Email *</label>
                    <input required={!isEditMode} disabled={isEditMode} type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500" placeholder="employee@utctravel.com" />
                    {isEditMode && <p className="text-xs text-slate-500 mt-1">Email cannot be changed.</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Employee ID *</label>
                    <input required type="text" value={formData.employeeId} onChange={e => setFormData({...formData, employeeId: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. EMP0005" />
                  </div>

                  {!isEditMode && (
                    <>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Password *</label>
                        <input required type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="At least 8 chars, 1 uppercase, 1 symbol" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Confirm Password *</label>
                        <input required type="password" value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Re-enter password" />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Role *</label>
                    <select required value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="" disabled>Select a role...</option>
                      {rolesData?.data?.map(role => (
                        <option key={role.id} value={role.name}>{role.name}</option>
                      ))}
                      {(!rolesData?.data || rolesData.data.length === 0) && (
                        <>
                          <option value="CEO / Super Admin">CEO / Super Admin</option>
                          <option value="Admin">Admin</option>
                          <option value="HR Manager">HR Manager</option>
                          <option value="Sales Manager">Sales Manager</option>
                          <option value="Sales Executive">Sales Executive</option>
                          <option value="Accountant">Accountant</option>
                          <option value="Operations Manager">Operations Manager</option>
                          <option value="Reservation Executive">Reservation Executive</option>
                          <option value="Tour Coordinator">Tour Coordinator</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Department</label>
                    <select value={formData.departmentId} onChange={e => setFormData({...formData, departmentId: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50" disabled={isDeptsLoading || isDeptsError}>
                      <option value="">Select a department...</option>
                      {isDeptsLoading && <option disabled>Loading departments...</option>}
                      {isDeptsError && <option disabled>Error loading departments</option>}
                      {!isDeptsLoading && !isDeptsError && departmentsData?.data?.length === 0 && (
                        <option disabled>No departments available</option>
                      )}
                      {departmentsData?.data?.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Designation</label>
                    <select 
                      value={formData.designation} 
                      onChange={e => setFormData({...formData, designation: e.target.value})} 
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a designation...</option>
                      {designationsData?.data?.map(desig => (
                        <option key={desig.id} value={desig.name}>{desig.name}</option>
                      ))}
                      {(!designationsData?.data || designationsData.data.length === 0) && (
                        <>
                          <option value="CEO">CEO</option>
                          <option value="HR Manager">HR Manager</option>
                          <option value="Sales Manager">Sales Manager</option>
                          <option value="Sales Executive">Sales Executive</option>
                          <option value="Accountant">Accountant</option>
                          <option value="Operations Manager">Operations Manager</option>
                          <option value="Travel Consultant">Travel Consultant</option>
                          <option value="Other">Other</option>
                        </>
                      )}
                    </select>
                  </div>
                  
                  {isEditMode && (
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Status</label>
                      <select 
                        value={formData.status} 
                        onChange={e => setFormData({...formData, status: e.target.value})} 
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="INACTIVE">INACTIVE</option>
                        <option value="ON_LEAVE">ON_LEAVE</option>
                        <option value="RESIGNED">RESIGNED</option>
                        <option value="TERMINATED">TERMINATED</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 shrink-0 flex justify-end gap-3">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : (isEditMode ? 'Update Employee' : 'Save Employee')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDeleteModalOpen && employeeToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 text-center shadow-2xl">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Delete Employee?</h2>
            <p className="text-slate-500 mb-6">
              Are you sure you want to delete <strong>{employeeToDelete.firstName} {employeeToDelete.lastName}</strong>? 
              This will remove them from active directories, but preserve their historical payroll slips.
            </p>
            <div className="flex gap-3 justify-center">
              <button 
                onClick={() => setIsDeleteModalOpen(false)} 
                className="px-6 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition-colors"
                disabled={deleteMutation.isPending}
              >
                Cancel
              </button>
              <button 
                onClick={() => deleteMutation.mutate(employeeToDelete.id)} 
                className="px-6 py-2.5 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Employee Profile Modal with Attendance & Performance */}
      {selectedProfileEmpId && (
        <EmployeeProfileModal
          employeeId={selectedProfileEmpId}
          onClose={() => setSelectedProfileEmpId(null)}
        />
      )}
    </div>
  );
}
