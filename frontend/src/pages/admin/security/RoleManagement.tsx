import React, { useEffect, useState } from 'react';
import api from '../../../services/api';
import { Shield, Plus, Lock, Users, Edit3, Trash2, CheckCircle2, RefreshCw } from 'lucide-react';
import PermissionMatrix from './PermissionMatrix';

export default function RoleManagement() {
  const [roles, setRoles] = useState<any[]>([]);
  const [allPermissions, setAllPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<any | null>(null);

  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        api.get('/roles'),
        api.get('/permissions')
      ]);
      setRoles(rolesRes.data.data || []);
      setAllPermissions(permsRes.data.data || []);
    } catch (err: any) {
      console.error('Failed to load roles/permissions', err);
      setActionError('Failed to load system roles');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingRole(null);
    setRoleName('');
    setRoleDescription('');
    setSelectedPermissionIds([]);
    setActionError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (role: any) => {
    setEditingRole(role);
    setRoleName(role.name);
    setRoleDescription(role.description || '');
    const currentPermIds = role.permissions?.map((p: any) => p.id) || [];
    setSelectedPermissionIds(currentPermIds);
    setActionError(null);
    setIsModalOpen(true);
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);

    try {
      if (editingRole) {
        const res = await api.patch(`/roles/${editingRole.id}`, {
          name: roleName,
          description: roleDescription,
          permissionIds: selectedPermissionIds
        });
        if (res.data.success) {
          setActionSuccess(`Role '${roleName}' updated successfully`);
          setIsModalOpen(false);
          fetchData();
        }
      } else {
        const res = await api.post('/roles', {
          name: roleName,
          description: roleDescription,
          permissionIds: selectedPermissionIds
        });
        if (res.data.success) {
          setActionSuccess(`Custom role '${roleName}' created successfully`);
          setIsModalOpen(false);
          fetchData();
        }
      }
    } catch (err: any) {
      setActionError(err?.response?.data?.error || 'Failed to save role');
    }
  };

  const handleDeleteRole = async (role: any) => {
    if (role.isSystem) {
      alert('Protected system roles cannot be deleted.');
      return;
    }

    if (!confirm(`Are you sure you want to delete custom role '${role.name}'?`)) return;

    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await api.delete(`/roles/${role.id}`);
      if (res.data.success) {
        setActionSuccess(`Role '${role.name}' deleted successfully`);
        fetchData();
      }
    } catch (err: any) {
      setActionError(err?.response?.data?.error || 'Failed to delete role');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-600" /> Role & Permission Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure system roles, fine-tune module permission matrices, and enforce access control policies.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg shadow-sm transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> Create Custom Role
          </button>
        </div>
      </div>

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

      {/* Role Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {loading ? (
          <div className="col-span-full text-center py-12 text-gray-500">Loading roles...</div>
        ) : (
          roles.map(role => {
            const userCount = role._count?.users || 0;
            const permCount = role._count?.permissions || role.permissions?.length || 0;

            return (
              <div key={role.id} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-base text-gray-900 flex items-center gap-2">
                      {role.name}
                    </span>
                    {role.isSystem ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        <Lock className="w-3 h-3" /> Protected System Role
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        Custom Role
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-gray-500 mb-4 min-h-[32px]">
                    {role.description || 'System access role with configured permission matrix.'}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-gray-600 bg-gray-50 p-3 rounded-xl mb-4 border border-gray-100">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Users className="w-4 h-4 text-blue-600" /> {userCount} User(s)
                    </div>
                    <div className="flex items-center gap-1.5 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {permCount} Permission(s)
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => handleOpenEditModal(role)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit Permissions
                  </button>
                  {!role.isSystem && (
                    <button
                      onClick={() => handleDeleteRole(role)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Role Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Shield className="w-6 h-6 text-blue-600" />
                {editingRole ? `Edit Role: ${editingRole.name}` : 'Create New Custom Role'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">&times;</button>
            </div>

            <form onSubmit={handleSaveRole} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Role Name *</label>
                  <input
                    type="text"
                    required
                    disabled={editingRole?.isSystem}
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    placeholder="e.g. Senior Regional Accountant"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Description</label>
                  <input
                    type="text"
                    value={roleDescription}
                    onChange={(e) => setRoleDescription(e.target.value)}
                    placeholder="Brief description of role responsibilities"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Permission Matrix Component */}
              <PermissionMatrix
                allPermissions={allPermissions}
                selectedPermissionIds={selectedPermissionIds}
                onChange={setSelectedPermissionIds}
              />

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Save Role & Permissions
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
