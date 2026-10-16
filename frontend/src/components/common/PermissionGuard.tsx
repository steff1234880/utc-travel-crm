import React, { ReactNode } from 'react';
import { useAuth } from '../../context/AuthContext';

interface PermissionGuardProps {
  permission?: string;
  module?: string;
  roles?: string[];
  fallback?: ReactNode;
  children: ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  permission,
  module: moduleName,
  roles,
  fallback = null,
  children
}) => {
  const { hasPermission, hasModuleAccess, hasRole } = useAuth();

  if (roles && !hasRole(roles)) {
    return <>{fallback}</>;
  }

  if (permission && !hasPermission(permission)) {
    return <>{fallback}</>;
  }

  if (moduleName && !hasModuleAccess(moduleName)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default PermissionGuard;
