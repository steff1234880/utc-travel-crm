import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Lock, Home } from 'lucide-react';
import { useAuth, getRoleDefaultRoute } from '../../context/AuthContext';

interface UnauthorizedPageProps {
  requiredPermission?: string;
  requiredRole?: string;
}

export default function UnauthorizedPage({ requiredPermission, requiredRole }: UnauthorizedPageProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Send the user back to their own role-appropriate dashboard
  const dashboardRoute = getRoleDefaultRoute(user?.roleName, user?.permissions);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6 bg-slate-50">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-lg w-full p-8 text-center">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <h1 className="text-2xl font-extrabold text-slate-900 mb-2">403 — Access Denied</h1>
        <p className="text-slate-600 text-sm mb-6">
          You do not have permission to access this page. Contact your Administrator if you believe this is an error.
        </p>

        <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-100 text-left space-y-2 text-xs text-slate-700">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-500">Current Account:</span>
            <span className="font-medium text-slate-900">{user?.email || 'Guest'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-500">Assigned Role:</span>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold">
              {user?.roleName || 'No Role'}
            </span>
          </div>
          {requiredPermission && (
            <div className="flex items-center justify-between pt-1 border-t border-slate-200">
              <span className="font-semibold text-red-500 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Required Access:
              </span>
              <span className="font-mono text-slate-800">{requiredPermission}</span>
            </div>
          )}
          {requiredRole && (
            <div className="flex items-center justify-between pt-1 border-t border-slate-200">
              <span className="font-semibold text-red-500 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Required Role:
              </span>
              <span className="font-mono text-slate-800">{requiredRole}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-sm font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Go Back
          </button>
          <Link
            to={dashboardRoute}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm font-semibold shadow-sm transition-colors"
          >
            <Home className="w-4 h-4" /> My Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
