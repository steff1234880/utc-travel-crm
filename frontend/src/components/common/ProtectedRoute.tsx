import React, { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import UnauthorizedPage from '../../pages/admin/UnauthorizedPage';

interface ProtectedRouteProps {
  requiredPermission?: string;
  requiredRole?: string | string[];
  requiredModule?: string;
  children?: ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  requiredPermission,
  requiredRole,
  requiredModule,
  children
}) => {
  const { user, loading, hasPermission, hasRole, hasModuleAccess } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-3"></div>
      </div>
    );
  }

  // Unauthenticated -> redirect to login
  if (!user && !localStorage.getItem('token')) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role check
  if (requiredRole && !hasRole(requiredRole)) {
    return <UnauthorizedPage requiredRole={Array.isArray(requiredRole) ? requiredRole.join(', ') : requiredRole} />;
  }

  // Permission check
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <UnauthorizedPage requiredPermission={requiredPermission} />;
  }

  // Module check
  if (requiredModule && !hasModuleAccess(requiredModule)) {
    return <UnauthorizedPage requiredPermission={`Module Access: ${requiredModule}`} />;
  }

  return children ? <>{children}</> : null;
};

export default ProtectedRoute;
