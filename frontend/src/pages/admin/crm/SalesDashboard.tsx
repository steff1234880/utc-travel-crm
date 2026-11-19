import React, { useEffect, useState } from 'react';
import { Activity, DollarSign, Users, Briefcase, TrendingUp, XCircle, Layers, Trash2 } from 'lucide-react';
import api from '../../../services/api';
import QuickAttendanceWidget from '../../../components/admin/QuickAttendanceWidget';
import LeadAssignmentOverviewModal from '../../../components/admin/crm/LeadAssignmentOverviewModal';
import { useAuth } from '../../../context/AuthContext';

const SalesDashboard = () => {
  const { hasRole, hasPermission } = useAuth();
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isOverviewOpen, setIsOverviewOpen] = useState(false);

  const canManageSettings = hasRole(['CEO / Super Admin', 'Admin', 'ADMIN', 'SUPER_ADMIN']);
  const canAssignLeads = hasRole(['Sales Manager', 'CEO / Super Admin', 'Admin', 'ADMIN', 'SUPER_ADMIN']) ||
    hasPermission('sales_crm:manage') ||
    hasPermission('sales_crm:assign');

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const { data } = await api.get('/crm/sales/dashboard');
      setMetrics(data.data);
    } catch (error) {
      console.error('Failed to fetch sales metrics', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-4 sm:p-8 w-full min-w-0 text-center text-gray-500">Loading metrics...</div>;

  return (
    <div className="p-4 sm:p-8 w-full min-w-0 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sales Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Real-time overview of pipeline, leads, and sales conversion.</p>
        </div>
        {canAssignLeads && (
          <button
            onClick={() => setIsOverviewOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 text-xs font-bold shadow-2xs transition-colors self-start sm:self-auto"
          >
            <Users className="w-4 h-4 text-blue-600" />
            <span>Lead Assignment Overview</span>
          </button>
        )}
      </div>

      {/* Employee Attendance Check-In / Check-Out Controls */}
      <QuickAttendanceWidget variant="card" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Total Revenue</p>
            <p className="text-2xl font-bold text-gray-900">₹{metrics?.totalRevenue?.toLocaleString() || 0}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Active Leads</p>
            <p className="text-2xl font-bold text-gray-900">{metrics?.activeLeads || 0}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center">
            <Users className="w-6 h-6 text-purple-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Won Leads</p>
            <p className="text-2xl font-bold text-gray-900">{metrics?.wonLeads || 0}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
            <Briefcase className="w-6 h-6 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Lost Leads</p>
            <p className="text-2xl font-bold text-gray-900">{metrics?.lostLeads || 0}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
            <XCircle className="w-6 h-6 text-red-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Conversion Rate</p>
            <p className="text-2xl font-bold text-gray-900">{metrics?.conversionRate?.toFixed(1) || 0}%</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Add charts or tables here later */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-gray-500" /> Recent Sales Activity
        </h2>
        {metrics?.recentActivity?.length > 0 ? (
          <div className="space-y-4">
            {metrics.recentActivity.map((activity: any) => {
              const isDeletion = activity.type === 'LEAD_DELETED' || activity.type === 'DELETE' || (activity.description && activity.description.toLowerCase().includes('deleted lead'));
              return (
                <div key={activity.id} className={`flex items-start gap-4 p-4 border rounded-xl transition-colors ${isDeletion ? 'border-red-100 bg-red-50/30 hover:bg-red-50/50' : 'border-gray-50 bg-gray-50/50 hover:bg-gray-50'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isDeletion ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                    {isDeletion ? <Trash2 className="w-5 h-5" /> : <Activity className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${isDeletion ? 'text-red-950' : 'text-gray-900'}`}>{activity.description}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                      <span className={`flex items-center gap-1 font-medium px-2 py-0.5 rounded-full ${isDeletion ? 'text-red-700 bg-red-100' : 'text-blue-600 bg-blue-50'}`}>
                        {activity.type}
                      </span>
                      <span>By: <span className="font-medium text-gray-700">{activity.actor}</span></span>
                      <span>Target: <span className="font-medium text-gray-700">{activity.target}</span></span>
                      <span className="text-gray-400">•</span>
                      <span>{new Date(activity.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-gray-500 text-sm text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            Pipeline and recent activity will be displayed here.
          </div>
        )}
      </div>

      <LeadAssignmentOverviewModal
        isOpen={isOverviewOpen}
        onClose={() => setIsOverviewOpen(false)}
        canManageSettings={canManageSettings}
        canAssignLeads={canAssignLeads}
        onWorkloadChanged={fetchMetrics}
      />
    </div>
  );
};

export default SalesDashboard;
