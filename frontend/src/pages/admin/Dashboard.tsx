import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { 
  Users, Building2, Briefcase, Wallet, 
  UserPlus, FileText, MessageSquare 
} from 'lucide-react';
import AdminGlobalCalendar from '../../components/admin/AdminGlobalCalendar';
import QuickAttendanceWidget from '../../components/admin/QuickAttendanceWidget';

class DashboardErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: any) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-7xl mx-auto h-full flex flex-col justify-center items-center text-red-600 bg-red-50 rounded-lg m-8 border border-red-200 shadow-sm">
          <h2 className="text-xl font-bold mb-4">Dashboard Render Error</h2>
          <pre className="text-sm bg-white p-4 rounded border border-red-100 overflow-auto max-w-full">
            {this.state.error?.message}
            {'\n'}
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function Dashboard() {
  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      const response = await api.get('/dashboard');
      return response.data.data;
    }
  });

  if (isLoading) {
    return (
      <div className="p-8 max-w-7xl mx-auto h-full flex flex-col justify-center items-center text-slate-500">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-medium">Loading Dashboard Data...</p>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="p-8 max-w-7xl mx-auto text-center">
        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 font-medium">
          Failed to load dashboard data. Please try again later.
        </div>
      </div>
    );
  }

  const { summary, statistics, recentActivity } = dashboardData;

  const StatCard = ({ title, value, icon: Icon, bgClass, iconClass }: any) => (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center justify-between">
      <div>
        <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">{title}</p>
        <h3 className="text-3xl font-black text-slate-900">{value}</h3>
      </div>
      <div className={`p-4 rounded-xl ${bgClass}`}>
        <Icon className={`w-8 h-8 ${iconClass}`} />
      </div>
    </div>
  );

  return (
    <DashboardErrorBoundary>
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Admin Dashboard</h1>
          <p className="text-slate-500 mt-1">Overview and quick insights across your modules.</p>
        </div>

        {/* Employee Attendance Check-In / Check-Out Controls */}
        <QuickAttendanceWidget variant="card" />

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="Total Employees" 
            value={summary.totalEmployees} 
            icon={Users} 
            bgClass="bg-blue-50" 
            iconClass="text-blue-600" 
          />
          <StatCard 
            title="Departments" 
            value={summary.totalDepartments} 
            icon={Building2} 
            bgClass="bg-purple-50" 
            iconClass="text-purple-600" 
          />
          <StatCard 
            title="Designations" 
            value={summary.totalDesignations} 
            icon={Briefcase} 
            bgClass="bg-amber-50" 
            iconClass="text-amber-600" 
          />
          <StatCard 
            title="Monthly Payroll" 
            value={`₹${(summary.totalMonthlyPayroll || 0).toLocaleString()}`} 
            icon={Wallet} 
            bgClass="bg-green-50" 
            iconClass="text-green-600" 
          />
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Department Stats & Recent Payroll */}
          <div className="lg:col-span-1 space-y-8">
            {/* Department Breakdown */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-lg font-bold text-slate-800 flex items-center">
                  <Building2 className="w-5 h-5 mr-2 text-slate-400" />
                  Department Split
                </h2>
              </div>
              <div className="p-5">
                {!statistics.departmentStats || statistics.departmentStats.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">No departments found.</p>
                ) : (
                  <div className="space-y-4">
                    {statistics.departmentStats.map((dept: any, index: number) => {
                      const percentage = summary.totalEmployees > 0 
                        ? Math.round((dept.employeeCount / summary.totalEmployees) * 100) 
                        : 0;
                      return (
                        <div key={index}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-semibold text-slate-700">{dept.name}</span>
                            <span className="text-slate-500">{dept.employeeCount} ({percentage}%)</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2">
                            <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${percentage}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Payroll Slips */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-lg font-bold text-slate-800 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-slate-400" />
                  Recent Payroll Slips
                </h2>
              </div>
              <div className="divide-y divide-slate-50">
                {!recentActivity.recentPayrollSlips || recentActivity.recentPayrollSlips.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-6">No recent payroll slips.</p>
                ) : (
                  recentActivity.recentPayrollSlips.map((slip: any) => (
                    <div key={slip.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold">
                          {slip.employee?.firstName?.[0] || 'U'}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{slip.employee?.firstName} {slip.employee?.lastName}</p>
                          <p className="text-xs text-slate-500 font-medium">Month: {slip.month}/{slip.year}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-slate-900">₹{slip.netSalary}</p>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                          {slip.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Recent Activity & Calendar */}
          <div className="lg:col-span-2 space-y-8">
            <AdminGlobalCalendar />
            {/* Activity Logs */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h2 className="text-lg font-bold text-slate-800 flex items-center">
                  <UserPlus className="w-5 h-5 mr-2 text-slate-400" />
                  Newly Added Employees
                </h2>
              </div>
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-100 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3">Employee</th>
                    <th className="px-6 py-3">Department</th>
                    <th className="px-6 py-3">Designation</th>
                    <th className="px-6 py-3">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {!recentActivity.recentEmployees || recentActivity.recentEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-500">No employees added yet.</td>
                    </tr>
                  ) : (
                    recentActivity.recentEmployees.map((emp: any) => (
                      <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                              {emp.firstName.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900">{emp.firstName} {emp.lastName}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{emp.department?.name || '-'}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{emp.designation?.name || '-'}</td>
                        <td className="px-6 py-4 text-sm text-slate-500">{new Date(emp.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Recent Enquiries */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-lg font-bold text-slate-800 flex items-center">
                  <MessageSquare className="w-5 h-5 mr-2 text-slate-400" />
                  Recent Enquiries
                </h2>
              </div>
              <div className="divide-y divide-slate-50">
                {!recentActivity.recentEnquiries || recentActivity.recentEnquiries.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-8">No recent enquiries.</p>
                ) : (
                  recentActivity.recentEnquiries.map((enq: any) => (
                    <div key={enq.id} className="p-5 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{enq.customerName} <span className="text-slate-400 font-normal">({enq.email})</span></p>
                        <p className="text-sm text-slate-600 mt-1 line-clamp-1">{enq.subject}</p>
                      </div>
                      <div className="flex items-center gap-4 sm:justify-end min-w-[150px]">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          enq.status === 'NEW' ? 'bg-blue-100 text-blue-700' :
                          enq.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {enq.status}
                        </span>
                        <span className="text-xs font-medium text-slate-400">
                          {new Date(enq.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </DashboardErrorBoundary>
  );
}
