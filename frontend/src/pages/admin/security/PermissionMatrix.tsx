import React from 'react';
import { Check, Shield } from 'lucide-react';

interface PermissionMatrixProps {
  allPermissions: any[];
  selectedPermissionIds: string[];
  onChange: (updatedIds: string[]) => void;
  disabled?: boolean;
}

export const ACTIONS = [
  'View',
  'Create',
  'Edit',
  'Delete',
  'Approve',
  'Export',
  'Assign',
  'Publish',
  'Manage'
];

export default function PermissionMatrix({
  allPermissions,
  selectedPermissionIds,
  onChange,
  disabled = false
}: PermissionMatrixProps) {
  // Group permissions by module
  const grouped: Record<string, Record<string, any>> = {};
  allPermissions.forEach(p => {
    if (!grouped[p.module]) grouped[p.module] = {};
    grouped[p.module][p.action] = p;
  });

  const modules = Object.keys(grouped).sort();

  const handleTogglePermission = (permId: string) => {
    if (disabled) return;
    if (selectedPermissionIds.includes(permId)) {
      onChange(selectedPermissionIds.filter(id => id !== permId));
    } else {
      onChange([...selectedPermissionIds, permId]);
    }
  };

  const handleToggleModuleAll = (moduleName: string) => {
    if (disabled) return;
    const modulePerms = Object.values(grouped[moduleName] || {});
    const modulePermIds = modulePerms.map(p => p.id);
    const allSelected = modulePermIds.every(id => selectedPermissionIds.includes(id));

    if (allSelected) {
      onChange(selectedPermissionIds.filter(id => !modulePermIds.includes(id)));
    } else {
      const newIds = Array.from(new Set([...selectedPermissionIds, ...modulePermIds]));
      onChange(newIds);
    }
  };

  const handleToggleSelectAll = () => {
    if (disabled) return;
    const allIds = allPermissions.map(p => p.id);
    const allSelected = allIds.every(id => selectedPermissionIds.includes(id));
    if (allSelected) {
      onChange([]);
    } else {
      onChange(allIds);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-gray-200">
        <div>
          <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-600" /> Permission Matrix
          </h4>
          <p className="text-xs text-gray-500">Configure access levels across all platform modules</p>
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={handleToggleSelectAll}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors"
          >
            {allPermissions.every(p => selectedPermissionIds.includes(p.id)) ? 'Deselect All' : 'Select All System Permissions'}
          </button>
        )}
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-xl bg-white shadow-sm">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 uppercase font-semibold">
            <tr>
              <th className="px-4 py-3 min-w-[180px]">Module</th>
              <th className="px-3 py-3 text-center">Module All</th>
              {ACTIONS.map(action => (
                <th key={action} className="px-3 py-3 text-center min-w-[70px]">{action}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {modules.map(moduleName => {
              const modulePerms = Object.values(grouped[moduleName] || {});
              const isModuleAllSelected = modulePerms.length > 0 && modulePerms.every(p => selectedPermissionIds.includes(p.id));

              return (
                <tr key={moduleName} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-4 py-3 font-semibold text-gray-900 bg-gray-50/50">
                    {moduleName}
                  </td>

                  <td className="px-3 py-3 text-center bg-gray-50/30">
                    <input
                      type="checkbox"
                      checked={isModuleAllSelected}
                      onChange={() => handleToggleModuleAll(moduleName)}
                      disabled={disabled}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                    />
                  </td>

                  {ACTIONS.map(action => {
                    const perm = grouped[moduleName]?.[action];
                    if (!perm) {
                      return <td key={action} className="px-3 py-3 text-center text-gray-300">—</td>;
                    }
                    const isChecked = selectedPermissionIds.includes(perm.id);

                    return (
                      <td key={action} className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleTogglePermission(perm.id)}
                          disabled={disabled}
                          title={`${moduleName} - ${action}`}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
