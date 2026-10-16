import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';
import { 
  Users, UserCheck, UserMinus, Building2, Trophy, 
  Award, Calendar, Filter, ChevronRight, UserCircle, 
  TrendingUp, CheckCircle, Info, Star
} from 'lucide-react';
import { EmployeeProfileModal } from '../../../components/admin/EmployeeProfileModal';

interface HRStats {
  totalEmployees: number;
  activeEmployees: number;
  inactiveEmployees: number;
  departments: number;
  recentEmployees: any[];
}

interface TopPerformersResponse {
  period: { month: number; year: number; monthName: string };
  hasActivityData: boolean;
  topPerformer: any;
  rankings: any[];
  scoringCriteria: { role: string; weights: string }[];
}

export default function HRDashboard() {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  const months = [
    { value: 1, name: 'January' },
    { value: 2, name: 'February' },
    { value: 3, name: 'March' },
    { value: 4, name: 'April' },
    { value: 5, name: 'May' },
    { value: 6, name: 'June' },
    { value: 7, name: 'July' },
    { value: 8, name: 'August' },
    { value: 9, name: 'September' },
    { value: 10, name: 'October' },
    { value: 11, name: 'November' },
    { value: 12, name: 'December' },
  ];

  const years = [2025, 2026, 2027];

  const { data: stats, isLoading: isStatsLoading, isError: isStatsError } = useQuery<HRStats>({
    queryKey: ['hr-stats'],
    queryFn: async () => {
      const res = await api.get('/hr/stats');
      return res.data.data;
    },
  });

  const { data: departmentsData } = useQuery<{ data: { id: string; name: string }[] }>({
    queryKey: ['departments'],
    queryFn: async () => {
      const res = await api.get('/hr/departments');
      return res.data;
    },
  });

  const { data: rolesData } = useQuery<{ data: { id: string; name: string }[] }>({
    queryKey: ['roles'],
    queryFn: async () => {
      const res = await api.get('/roles');
      return res.data;
    },
  });

  const { 
    data: performersData, 
    isLoading: isPerformersLoading, 
    isError: isPerformersError 
  } = useQuery<TopPerformersResponse>({
    queryKey: ['monthly-top-performers', selectedMonth, selectedYear, selectedDept, selectedRole],
    queryFn: async () => {
      let url = `/hr/monthly-top-performers?month=${selectedMonth}&year=${selectedYear}`;
      if (selectedDept && selectedDept !== 'ALL') url += `&departmentId=${selectedDept}`;
      if (selectedRole && selectedRole !== 'ALL') url += `&role=${encodeURIComponent(selectedRole)}`;
      const res = await api.get(url);
      return res.data.data;
    },
  });

  if (isStatsLoading) return <div className="p-8 text-center text-slate-500">Loading HR Dashboard...</div>;
  if (isStatsError) return <div className="p-8 text-center text-red-500">Failed to load HR stats</div>;

  const topPerformer = performersData?.topPerformer;
  const rankings = performersData?.rankings || [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">HR & Employee Management</h1>
          <p className="text-sm text-slate-500 mt-1">Overview of your workforce, monthly attendance, and staff performance.</p>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[
          { label: 'Total Employees', value: stats?.totalEmployees || 0, icon: Users, colorClass: 'bg-blue-50 text-blue-600' },
          { label: 'Active Employees', value: stats?.activeEmployees || 0, icon: UserCheck, colorClass: 'bg-emerald-50 text-emerald-600' },
          { label: 'Inactive Employees', value: stats?.inactiveEmployees || 0, icon: UserMinus, colorClass: 'bg-amber-50 text-amber-600' },
          { label: 'Departments', value: stats?.departments || 0, icon: Building2, colorClass: 'bg-purple-50 text-purple-600' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white p-5 sm:p-6 rounded-2xl shadow-xs border border-slate-200/80 flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-semibold text-slate-500 mb-1">{stat.label}</p>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900">{stat.value}</h3>
            </div>
            <div className={`p-3.5 rounded-xl ${stat.colorClass}`}>
              <stat.icon className="w-6 h-6" />
            </div>
          </div>
        ))}
      </div>

      {/* ========================================================= */}
      {/* MONTHLY TOP PERFORMING EMPLOYEE & RANKINGS SECTION        */}
      {/* ========================================================= */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Section Header with Month/Year/Filters */}
        <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50/60 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#8b182b] text-white flex items-center justify-center shadow-md shadow-[#8b182b]/20 shrink-0">
              <Trophy className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Monthly Top Performers</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Role-based rankings using real attendance, deals, tasks, and bookings.
              </p>
            </div>
          </div>

          {/* Month, Year, Department, Role Filters */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 bg-white border border-slate-200/80 rounded-xl px-2.5 py-1.5 shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none"
              >
                {months.map((m) => (
                  <option key={m.value} value={m.value}>{m.name}</option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none"
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="bg-white border border-slate-200/80 text-xs font-semibold text-slate-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8b182b] shadow-2xs"
            >
              <option value="ALL">All Departments</option>
              {departmentsData?.data?.map((dept) => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>

            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="bg-white border border-slate-200/80 text-xs font-semibold text-slate-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8b182b] shadow-2xs"
            >
              <option value="ALL">All Roles</option>
              {rolesData?.data?.map((r) => (
                <option key={r.id} value={r.name}>{r.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-5 sm:p-6 space-y-6">
          {isPerformersLoading && (
            <div className="py-16 text-center">
              <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-[#8b182b] mx-auto mb-3"></div>
              <p className="text-xs sm:text-sm font-medium text-slate-500">Calculating monthly rankings...</p>
            </div>
          )}

          {isPerformersError && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-medium">
              Failed to load top performers. Please ensure you have permission to view HR rankings.
            </div>
          )}

          {!isPerformersLoading && !isPerformersError && (
            <>
              {/* Highlighted Top Performer Card */}
              {topPerformer ? (
                <div className="bg-gradient-to-r from-slate-900 via-[#2d0710] to-[#8b182b] rounded-2xl p-5 sm:p-6 text-white shadow-md relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
                  {/* Decorative background star */}
                  <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-6">
                    <Trophy className="w-64 h-64 text-amber-300" />
                  </div>

                  <div className="flex items-center gap-4 sm:gap-5 z-10">
                    <div className="relative">
                      {topPerformer.profilePhoto ? (
                        <img
                          src={topPerformer.profilePhoto}
                          alt={`${topPerformer.firstName} ${topPerformer.lastName}`}
                          className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-amber-400/80 shadow-lg"
                        />
                      ) : (
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-amber-400 text-slate-950 font-black text-2xl flex items-center justify-center border-2 border-amber-300 shadow-lg">
                          {topPerformer.firstName[0]}{topPerformer.lastName[0]}
                        </div>
                      )}
                      <div className="absolute -bottom-2 -right-2 bg-amber-400 text-slate-950 text-[10px] font-black uppercase px-2 py-0.5 rounded-full shadow-md flex items-center gap-1">
                        <Star className="w-3 h-3 fill-slate-950" />
                        <span>#1 Top</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                          {performersData?.period?.monthName} {performersData?.period?.year} Employee of the Month
                        </span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
                        {topPerformer.firstName} {topPerformer.lastName}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-300 mt-1">
                        {topPerformer.designation} • {topPerformer.department} ({topPerformer.employeeId})
                      </p>
                    </div>
                  </div>

                  {/* Metrics and Action */}
                  <div className="flex items-center gap-4 sm:gap-6 flex-wrap z-10">
                    <div className="text-center bg-white/10 backdrop-blur-xs border border-white/15 px-4 py-2.5 rounded-xl">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-rose-200">Score</p>
                      <p className="text-2xl sm:text-3xl font-black text-amber-300">{topPerformer.score}<span className="text-xs font-bold text-white/70">/100</span></p>
                    </div>

                    <div className="text-center bg-white/10 backdrop-blur-xs border border-white/15 px-4 py-2.5 rounded-xl">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-rose-200">Attendance</p>
                      <p className="text-2xl sm:text-3xl font-black text-white">
                        {topPerformer.attendancePercentage !== null ? `${topPerformer.attendancePercentage}%` : 'N/A'}
                      </p>
                    </div>

                    <button
                      onClick={() => setSelectedEmployeeId(topPerformer.id)}
                      className="px-4 py-2.5 rounded-xl bg-amber-400 text-slate-950 hover:bg-amber-300 font-bold text-xs sm:text-sm transition-all shadow-md flex items-center gap-2 ml-auto md:ml-0"
                    >
                      <span>View Profile</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 text-center text-slate-500 text-xs sm:text-sm space-y-1">
                  <p className="font-bold text-slate-700">No Top Performer Identified</p>
                  <p className="text-slate-400">
                    No active performance or attendance records were found for {performersData?.period?.monthName} {performersData?.period?.year} under the current filters.
                  </p>
                </div>
              )}

              {/* Full Ranked List Table */}
              <div className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs">
                <div className="p-4 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">
                    Employee Monthly Performance Rankings
                  </h3>
                  <span className="text-xs text-slate-500 font-semibold">
                    {rankings.length} employees ranked
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Rank</th>
                        <th className="px-4 py-3">Employee</th>
                        <th className="px-4 py-3">Department / Role</th>
                        <th className="px-4 py-3 text-center">Score</th>
                        <th className="px-4 py-3 text-center">Attendance %</th>
                        <th className="px-4 py-3">Key Output</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {rankings.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-slate-400 italic">
                            No employees match the selected criteria for this period.
                          </td>
                        </tr>
                      ) : (
                        rankings.map((emp) => {
                          let rankBadge = 'bg-slate-100 text-slate-700';
                          if (emp.rank === 1) rankBadge = 'bg-amber-100 text-amber-800 border border-amber-300 font-black';
                          else if (emp.rank === 2) rankBadge = 'bg-slate-200 text-slate-800 font-bold';
                          else if (emp.rank === 3) rankBadge = 'bg-orange-100 text-orange-800 font-bold';

                          return (
                            <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="px-4 py-3">
                                {emp.rank !== null ? (
                                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs ${rankBadge}`}>
                                    #{emp.rank}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-xs italic pl-1">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0">
                                    {emp.firstName[0]}{emp.lastName[0]}
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-900">{emp.firstName} {emp.lastName}</p>
                                    <p className="text-[11px] text-slate-400 font-mono">{emp.employeeId}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <p className="font-semibold text-slate-800">{emp.designation}</p>
                                <p className="text-slate-500 text-[11px]">{emp.department}</p>
                              </td>
                              <td className="px-4 py-3 text-center">
                                {emp.score !== null ? (
                                  <div className="inline-flex flex-col items-center">
                                    <span className="font-black text-sm text-[#8b182b]">{emp.score}</span>
                                    <span className="text-[10px] font-semibold text-slate-400 uppercase">{emp.scoreGrade}</span>
                                  </div>
                                ) : (
                                  <div className="inline-flex flex-col items-center">
                                    <span className="text-xs font-semibold text-slate-400">N/A</span>
                                    <span className="text-[9px] text-slate-400">No activity data</span>
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`font-bold ${
                                  (emp.attendancePercentage || 0) >= 90 ? 'text-emerald-600' :
                                  (emp.attendancePercentage || 0) >= 75 ? 'text-amber-600' : 'text-slate-500'
                                }`}>
                                  {emp.attendancePercentage !== null ? `${emp.attendancePercentage}%` : 'N/A'}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-[11px] space-y-0.5 text-slate-600">
                                  {emp.roleCategory === 'SALES' && (
                                    <span>{emp.leadsConverted} conversions ({emp.leadsHandled} leads)</span>
                                  )}
                                  {emp.roleCategory === 'OPERATIONS' && (
                                    <span>{emp.tasksCompleted} tasks • {emp.bookingsPrepared} bookings</span>
                                  )}
                                  {emp.roleCategory === 'GENERAL' && (
                                    <span>{emp.tasksCompleted > 0 ? `${emp.tasksCompleted} tasks completed` : 'General Operations'}</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  onClick={() => setSelectedEmployeeId(emp.id)}
                                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#8b182b] hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors"
                                >
                                  View Profile
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Transparent Scoring Criteria Note */}
                <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-500 gap-2">
                  <div className="flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-[#8b182b] shrink-0" />
                    <span>Fair scoring method handles ties equally without fabricating missing data.</span>
                  </div>
                  <div className="text-slate-400">
                    Weights: Sales (45% conv, 25% tasks, 15% att, 15% targets) • Ops (45% tasks, 30% tours, 25% att)
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* RECENT EMPLOYEES DIRECTORY (Existing, enhanced with modal)*/}
      {/* ========================================================= */}
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xs border border-slate-200/80 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Recent Employees Directory</h3>
          <span className="text-xs text-slate-400 font-semibold">Click row to inspect profile</span>
        </div>
        <div className="divide-y divide-slate-100">
          {stats?.recentEmployees?.length === 0 ? (
            <div className="p-6 text-center text-slate-500">No employees registered yet.</div>
          ) : (
            stats?.recentEmployees?.map((emp) => (
              <div 
                key={emp.id} 
                onClick={() => setSelectedEmployeeId(emp.id)}
                className="p-4 sm:p-5 flex items-center justify-between hover:bg-rose-50/40 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-slate-200 flex items-center justify-center font-bold text-slate-700 text-sm">
                    {emp.firstName[0]}{emp.lastName[0]}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 hover:text-[#8b182b] transition-colors">{emp.firstName} {emp.lastName}</p>
                    <p className="text-xs text-slate-500">{emp.designation?.name || 'No Designation'} • {emp.department?.name || 'No Department'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    emp.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {emp.status}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Employee Profile Modal */}
      {selectedEmployeeId && (
        <EmployeeProfileModal
          employeeId={selectedEmployeeId}
          onClose={() => setSelectedEmployeeId(null)}
        />
      )}
    </div>
  );
}
