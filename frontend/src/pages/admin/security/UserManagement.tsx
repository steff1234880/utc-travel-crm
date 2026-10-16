import React, { useEffect, useState } from 'react';
import api from '../../../services/api';
import { 
  Users, Search, UserPlus, Shield, CheckCircle2, XCircle, KeyRound, 
  Eye, Edit, RefreshCw, AlertCircle, Calendar, Mail, Phone, Lock 
} from 'lucide-react';

export default function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [meta, setMeta] = useState<any>({});

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    roleId: '',
    firstName: '',
    lastName: ''
  });

  const [resetPasswordText, setResetPasswordText] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchRoles();
    fetchUsers();
  }, [search, roleFilter, statusFilter]);

  const fetchRoles = async () => {
    try {
      const { data } = await api.get('/roles');
      setRoles(data.data || []);
    } catch (err) {
      console.error('Failed to fetch roles', err);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/users', {
        params: { search, roleId: roleFilter, status: statusFilter }
      });
      setUsers(data.data || []);
      setMeta(data.meta || {});
    } catch (err: any) {
      console.error('Failed to fetch users', err);
      setActionError(err?.response?.data?.error || 'Failed to load user accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);

    if (formData.password !== formData.confirmPassword) {
      setActionError('Password confirmation does not match');
      return;
    }
    if (formData.password.length < 8) {
      setActionError('Password must be at least 8 characters long');
      return;
    }

    try {
      const res = await api.post('/users', formData);
      if (res.data.success) {
        setActionSuccess('User account created successfully');
        setIsCreateModalOpen(false);
        setFormData({ email: '', password: '', confirmPassword: '', roleId: '', firstName: '', lastName: '' });
        fetchUsers();
      }
    } catch (err: any) {
      setActionError(err?.response?.data?.error || 'Failed to create user account');
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await api.patch(`/users/${selectedUser.id}`, {
        email: formData.email,
        roleId: formData.roleId
      });
      if (res.data.success) {
        setActionSuccess('User updated successfully');
        setIsEditModalOpen(false);
        fetchUsers();
      }
    } catch (err: any) {
      setActionError(err?.response?.data?.error || 'Failed to update user');
    }
  };

  const handleToggleStatus = async (user: any) => {
    const newStatus = !user.isActive;
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await api.patch(`/users/${user.id}/status`, { isActive: newStatus });
      if (res.data.success) {
        setActionSuccess(`User ${user.email} ${newStatus ? 'activated' : 'deactivated'} successfully`);
        fetchUsers();
      }
    } catch (err: any) {
      setActionError(err?.response?.data?.error || 'Failed to update user status');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !resetPasswordText) return;
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await api.post(`/users/${selectedUser.id}/reset-password`, {
        newPassword: resetPasswordText
      });
      if (res.data.success) {
        setActionSuccess(`Password reset successfully for ${selectedUser.email}`);
        setIsResetPasswordModalOpen(false);
        setResetPasswordText('');
      }
    } catch (err: any) {
      setActionError(err?.response?.data?.error || 'Failed to reset password');
    }
  };

  const handleViewUser = async (userId: string) => {
    try {
      const { data } = await api.get(`/users/${userId}`);
      setSelectedUser(data.data);
      setIsViewModalOpen(true);
    } catch (err) {
      console.error('Failed to fetch user details', err);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600" /> User Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage system users, assign roles, activate/deactivate accounts, and control platform access.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchUsers}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg shadow-sm transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button
            onClick={() => {
              setActionError(null);
              setFormData({ email: '', password: '', confirmPassword: '', roleId: roles[0]?.id || '', firstName: '', lastName: '' });
              setIsCreateModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg shadow-sm transition-colors"
          >
            <UserPlus className="w-4 h-4" /> Create User
          </button>
        </div>
      </div>

      {/* Action Alerts */}
      {actionSuccess && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center justify-between">
          <span>{actionSuccess}</span>
          <button onClick={() => setActionSuccess(null)} className="font-bold text-lg">&times;</button>
        </div>
      )}

      {actionError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="font-bold text-lg">&times;</button>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by email or employee name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Roles</option>
            {roles.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">User Account</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Employee Ref</th>
                <th className="px-6 py-4">Account Status</th>
                <th className="px-6 py-4">Last Login</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">Loading users...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">No users found.</td></tr>
              ) : (
                users.map((u) => {
                  const empName = u.employee ? `${u.employee.firstName} ${u.employee.lastName}` : null;
                  return (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">{empName || u.email.split('@')[0]}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <Mail className="w-3.5 h-3.5 text-gray-400" /> {u.email}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          <Shield className="w-3.5 h-3.5" /> {u.role?.name || 'No Role Assigned'}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-gray-600 text-xs font-medium">
                        {u.employee ? (
                          <div>
                            <p className="font-bold text-gray-900">{u.employee.employeeId}</p>
                            <p className="text-gray-500">{u.employee.designation?.name || 'Staff'}</p>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Unlinked</span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        {u.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                            <XCircle className="w-3.5 h-3.5" /> Deactivated
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-xs text-gray-500">
                        {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never'}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleViewUser(u.id)}
                            title="View User Details"
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setFormData({ email: u.email, password: '', confirmPassword: '', roleId: u.roleId || '', firstName: '', lastName: '' });
                              setIsEditModalOpen(true);
                            }}
                            title="Edit Role / User"
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setResetPasswordText('');
                              setIsResetPasswordModalOpen(true);
                            }}
                            title="Reset Password"
                            className="p-2 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleToggleStatus(u)}
                            title={u.isActive ? 'Deactivate Account' : 'Activate Account'}
                            className={`p-2 rounded-lg transition-colors ${
                              u.isActive ? 'text-red-500 hover:text-red-700 hover:bg-red-50' : 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50'
                            }`}
                          >
                            {u.isActive ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-600" /> Create System User Account
            </h3>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="user@utctravel.com"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Initial Password *</label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="At least 8 chars with uppercase, number, symbol"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Confirm Password *</label>
                <input
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Re-enter password"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Assign Role *</label>
                <select
                  required
                  value={formData.roleId}
                  onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Select Role</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">First Name (Optional)</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="John"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Last Name (Optional)</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Doe"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">Edit User & Assign Role</h3>
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Assigned System Role</label>
                <select
                  value={formData.roleId}
                  onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {isResetPasswordModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-amber-600" /> Reset Password
            </h3>
            <p className="text-xs text-gray-500 mb-4">Reset user password for <span className="font-semibold text-gray-900">{selectedUser.email}</span></p>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">New Password</label>
                <input
                  type="password"
                  required
                  value={resetPasswordText}
                  onChange={(e) => setResetPasswordText(e.target.value)}
                  placeholder="Enter new strong password"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsResetPasswordModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors"
                >
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View User Modal */}
      {isViewModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-gray-100 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
              <h3 className="text-xl font-bold text-gray-900">User Account Details</h3>
              <button onClick={() => setIsViewModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-lg">&times;</button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-600 text-white font-bold text-lg flex items-center justify-center">
                  {selectedUser.email.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">{selectedUser.email}</h4>
                  <p className="text-xs text-blue-700 font-medium">{selectedUser.role?.name || 'No Role Assigned'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-400 font-bold uppercase">Status</p>
                  <p className={`font-semibold ${selectedUser.isActive ? 'text-emerald-600' : 'text-red-600'}`}>
                    {selectedUser.isActive ? 'Active' : 'Deactivated'}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-400 font-bold uppercase">Created Date</p>
                  <p className="font-medium text-gray-900">{new Date(selectedUser.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              {selectedUser.employee && (
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <h5 className="text-xs font-bold text-gray-500 uppercase mb-2">Linked Employee Profile</h5>
                  <p className="text-sm font-bold text-gray-900">{selectedUser.employee.firstName} {selectedUser.employee.lastName}</p>
                  <p className="text-xs text-gray-500">Employee ID: {selectedUser.employee.employeeId}</p>
                </div>
              )}

              {selectedUser.loginActivities && selectedUser.loginActivities.length > 0 && (
                <div>
                  <h5 className="text-xs font-bold text-gray-500 uppercase mb-2">Recent Login Activity</h5>
                  <div className="space-y-1.5">
                    {selectedUser.loginActivities.map((la: any) => (
                      <div key={la.id} className="p-2 bg-gray-50 rounded text-xs flex justify-between items-center">
                        <span className="font-mono text-gray-700">{la.ipAddress}</span>
                        <span className={`font-semibold ${la.status === 'SUCCESS' ? 'text-emerald-600' : 'text-red-600'}`}>{la.status}</span>
                        <span className="text-gray-400">{new Date(la.createdAt).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100 mt-6">
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
