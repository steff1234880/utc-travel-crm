import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { 
  X, Calendar, Clock, CheckCircle2, XCircle, AlertCircle, 
  TrendingUp, Award, Target, Briefcase, Building2, Mail, 
  UserCheck, BarChart2, Info, ChevronRight, Check
} from 'lucide-react';

interface EmployeeProfileModalProps {
  employeeId: string;
  onClose: () => void;
}

export const EmployeeProfileModal: React.FC<EmployeeProfileModalProps> = ({ employeeId, onClose }) => {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [activeTab, setActiveTab] = useState<'attendance_performance' | 'personal_info'>('attendance_performance');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['employee-attendance-performance', employeeId, selectedMonth, selectedYear],
    queryFn: async () => {
      const res = await api.get(`/hr/employees/${employeeId}/attendance-performance?month=${selectedMonth}&year=${selectedYear}`);
      return res.data.data;
    },
    enabled: !!employeeId,
  });

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

  const emp = data?.employee;
  const attendance = data?.attendance;
  const performance = data?.performance;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6 animate-fadeIn">
      <div 
        className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-slate-900 via-[#24060c] to-[#8b182b] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            {emp?.profilePhoto ? (
              <img 
                src={emp.profilePhoto} 
                alt={`${emp.firstName} ${emp.lastName}`} 
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover border-2 border-white/20 shrink-0 shadow-md"
              />
            ) : (
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/10 text-white border border-white/20 flex items-center justify-center font-black text-lg sm:text-xl shrink-0 shadow-md">
                {emp ? `${emp.firstName?.[0] || ''}${emp.lastName?.[0] || ''}` : 'U'}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-white truncate tracking-tight">
                  {emp ? `${emp.firstName} ${emp.lastName}` : 'Employee Profile'}
                </h2>
                {emp?.status && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase ${
                    emp.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-500/20 text-slate-300'
                  }`}>
                    {emp.status}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5 truncate flex items-center gap-2">
                <span>{emp?.designation || 'Staff'}</span>
                <span className="text-white/40">•</span>
                <span>{emp?.department || 'General'}</span>
                <span className="text-white/40">•</span>
                <span className="font-mono text-amber-300">{emp?.employeeId}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            title="Close"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Tab Controls & Month Selector */}
        <div className="px-4 sm:px-6 py-3 bg-slate-50 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setActiveTab('attendance_performance')}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'attendance_performance'
                  ? 'bg-[#8b182b] text-white shadow-sm shadow-[#8b182b]/30'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 hover:bg-slate-100'
              }`}
            >
              Attendance & Performance
            </button>
            <button
              onClick={() => setActiveTab('personal_info')}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'personal_info'
                  ? 'bg-[#8b182b] text-white shadow-sm shadow-[#8b182b]/30'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 hover:bg-slate-100'
              }`}
            >
              Personal Details
            </button>
          </div>

          {activeTab === 'attendance_performance' && (
            <div className="flex items-center gap-2 ml-auto">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-white border border-slate-200 text-slate-700 text-xs sm:text-sm rounded-xl px-2.5 sm:px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#8b182b]"
              >
                {months.map((m) => (
                  <option key={m.value} value={m.value}>{m.name}</option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-white border border-slate-200 text-slate-700 text-xs sm:text-sm rounded-xl px-2.5 sm:px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#8b182b]"
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {isLoading && (
            <div className="py-20 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#8b182b] mx-auto mb-3"></div>
              <p className="text-sm font-medium text-slate-500">Loading attendance and performance records...</p>
            </div>
          )}

          {isError && (
            <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-[#8b182b]" />
              <div>
                <p className="font-bold">Failed to load records</p>
                <p className="text-xs text-rose-600 mt-1">
                  You may not have the required permissions to inspect this employee’s detailed records, or a network issue occurred.
                </p>
              </div>
            </div>
          )}

          {!isLoading && !isError && activeTab === 'personal_info' && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-6">
              <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">Official Directory Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Employee ID</p>
                  <p className="text-sm font-bold text-slate-800 mt-1">{emp?.employeeId}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Official Email</p>
                  <p className="text-sm font-bold text-slate-800 mt-1">{emp?.email || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">System Role</p>
                  <p className="text-sm font-bold text-slate-800 mt-1">{emp?.role || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Department</p>
                  <p className="text-sm font-bold text-slate-800 mt-1">{emp?.department || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Designation</p>
                  <p className="text-sm font-bold text-slate-800 mt-1">{emp?.designation || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Joining Date</p>
                  <p className="text-sm font-bold text-slate-800 mt-1">
                    {emp?.joiningDate ? new Date(emp.joiningDate).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '-'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {!isLoading && !isError && activeTab === 'attendance_performance' && (
            <>
              {/* Top Summary Banner: Score & Attendance High Level */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Performance Score Card */}
                <div className="bg-gradient-to-br from-[#8b182b] to-[#540d1a] text-white rounded-2xl p-5 shadow-sm flex flex-col justify-between relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-200">Monthly Performance Score</span>
                    <Award className="w-5 h-5 text-amber-400" />
                  </div>
                  {performance?.score !== null && performance?.score !== undefined ? (
                    <div className="my-4 flex items-baseline gap-3">
                      <span className="text-4xl sm:text-5xl font-black tracking-tight">{performance.score}</span>
                      <span className="text-sm text-rose-200 font-bold">/ 100</span>
                      {performance?.scoreGrade && (
                        <span className="ml-auto px-2.5 py-1 rounded-lg text-xs font-bold bg-white/15 border border-white/20 text-white">
                          {performance.scoreGrade}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="my-4 py-1">
                      <span className="text-base sm:text-lg font-bold text-rose-100 block">No performance data available</span>
                      <span className="text-xs text-rose-200/80 block mt-0.5">No tasks, leads, or targets recorded for this month</span>
                    </div>
                  )}
                  <p className="text-xs text-rose-200/90 leading-relaxed">
                    Evaluated fairly according to <span className="font-semibold text-white">{performance?.roleCategory || 'General'}</span> role benchmarks.
                  </p>
                </div>

                {/* Monthly Attendance Rate Card */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Monthly Attendance Rate</span>
                    <UserCheck className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="my-4 flex items-baseline gap-2">
                    {attendance?.attendancePercentage !== null ? (
                      <>
                        <span className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
                          {attendance.attendancePercentage}%
                        </span>
                        <span className="text-xs text-slate-500 font-medium">adherence</span>
                      </>
                    ) : (
                      <span className="text-lg font-bold text-slate-400">No logs for this month</span>
                    )}
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, attendance?.attendancePercentage || 0)}%` }}
                    />
                  </div>
                </div>

                {/* Quick Attendance Breakdown */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Monthly Attendance Days</span>
                  <div className="grid grid-cols-5 gap-1.5 my-3 text-center">
                    <div className="p-1.5 rounded-xl bg-emerald-50 border border-emerald-100">
                      <p className="text-base font-black text-emerald-700">{attendance?.present || 0}</p>
                      <p className="text-[9px] font-bold text-emerald-600 uppercase mt-0.5">Present</p>
                    </div>
                    <div className="p-1.5 rounded-xl bg-amber-50 border border-amber-100">
                      <p className="text-base font-black text-amber-700">{attendance?.late || 0}</p>
                      <p className="text-[9px] font-bold text-amber-600 uppercase mt-0.5">Late</p>
                    </div>
                    <div className="p-1.5 rounded-xl bg-purple-50 border border-purple-100">
                      <p className="text-base font-black text-purple-700">{attendance?.halfDay || 0}</p>
                      <p className="text-[9px] font-bold text-purple-600 uppercase mt-0.5">Half Day</p>
                    </div>
                    <div className="p-1.5 rounded-xl bg-blue-50 border border-blue-100">
                      <p className="text-base font-black text-blue-700">{attendance?.onLeave || 0}</p>
                      <p className="text-[9px] font-bold text-blue-600 uppercase mt-0.5">Leave</p>
                    </div>
                    <div className="p-1.5 rounded-xl bg-rose-50 border border-rose-100">
                      <p className="text-base font-black text-rose-700">{attendance?.absent || 0}</p>
                      <p className="text-[9px] font-bold text-rose-600 uppercase mt-0.5">Absent</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 text-center font-medium">
                    Total recorded days: <span className="font-bold text-slate-700">{attendance?.totalLoggedDays || 0}</span>
                  </p>
                </div>
              </div>

              {/* Role-Specific Performance Metrics */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Role-Specific Performance Summary</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Showing real operational CRM metrics for {data?.period?.monthName} {data?.period?.year}
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-rose-50 text-[#8b182b] border border-rose-100">
                    Category: {performance?.roleCategory}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Sales Metrics (if applicable) */}
                  {performance?.sales?.isApplicable && (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Sales & Enquiries</span>
                        <Target className="w-4 h-4 text-[#8b182b]" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Leads Handled:</span>
                          <span className="font-bold text-slate-800">{performance.sales.leadsHandled}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Deals Won / Converted:</span>
                          <span className="font-bold text-emerald-600">{performance.sales.leadsConverted}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Conversion Rate:</span>
                          <span className="font-bold text-slate-800">
                            {performance.sales.conversionRate !== null ? `${performance.sales.conversionRate}%` : 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Enquiries Assigned:</span>
                          <span className="font-bold text-slate-800">{performance.sales.enquiriesAssigned}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Operational Tasks Metrics (if applicable) */}
                  {performance?.tasks?.isApplicable && (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Operational Tasks</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Tasks Assigned:</span>
                          <span className="font-bold text-slate-800">{performance.tasks.assigned}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Tasks Completed:</span>
                          <span className="font-bold text-emerald-600">{performance.tasks.completed}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Completion Rate:</span>
                          <span className="font-bold text-slate-800">
                            {performance.tasks.completionRate !== null ? `${performance.tasks.completionRate}%` : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Bookings & Tours (if applicable) */}
                  {performance?.bookings?.isApplicable && (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Bookings & Tours</span>
                        <Briefcase className="w-4 h-4 text-purple-600" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Bookings Prepared:</span>
                          <span className="font-bold text-slate-800">{performance.bookings.bookingsPrepared}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Tours Coordinated:</span>
                          <span className="font-bold text-slate-800">{performance.bookings.toursCoordinated}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Targets vs Actual Results */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Monthly Targets</span>
                      <Target className="w-4 h-4 text-amber-600" />
                    </div>
                    {performance?.targets?.hasTargets ? (
                      <div className="space-y-2.5">
                        {performance.targets.items.map((t: any, i: number) => (
                          <div key={i} className="text-xs space-y-1">
                            <div className="flex justify-between">
                              <span className="text-slate-600 font-medium">{t.type.replace('_', ' ')}</span>
                              <span className="font-bold text-slate-900">{t.achieved} / {t.target} {t.unit === 'CURRENCY' ? 'USD' : ''}</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                              <div className="bg-[#8b182b] h-full rounded-full" style={{ width: `${Math.min(100, t.percentage)}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 py-4 text-center italic">
                        No targets configured for this month.
                      </div>
                    )}
                  </div>
                </div>

                {/* Unavailable Metrics Notice */}
                {performance?.unavailableMetrics?.length > 0 && (
                  <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl text-amber-800 text-xs flex items-start gap-2.5 mt-2">
                    <Info className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="font-bold text-amber-900">Unavailable or Unassigned Role Metrics:</p>
                      <ul className="list-disc list-inside space-y-0.5 text-amber-800">
                        {performance.unavailableMetrics.map((msg: string, i: number) => (
                          <li key={i}>{msg}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              {/* Scoring Criteria Breakdown */}
              {performance?.scoringBreakdown?.length > 0 && (
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-3">
                  <h4 className="text-sm font-bold text-slate-900">Transparent Scoring Breakdown</h4>
                  <div className="space-y-2">
                    {performance.scoringBreakdown.map((item: any, idx: number) => (
                      <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs gap-1.5">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800">{item.metric}</p>
                          <p className="text-slate-500 text-[11px] mt-0.5">{item.note}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-slate-400">Weight: {item.weight}%</span>
                          <span className="font-black px-2 py-0.5 rounded-md bg-rose-50 text-[#8b182b] border border-rose-100">
                            {item.score} / {item.maxScore} pts
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Monthly Trend Comparison */}
              {performance?.monthlyTrend?.length > 0 && (
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-3">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#8b182b]" />
                    <span>Performance Trend Across Recent Months</span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {performance.monthlyTrend.map((trend: any, idx: number) => (
                      <div 
                        key={idx} 
                        className={`p-3 rounded-xl border text-center transition-all ${
                          trend.isCurrent 
                            ? 'bg-rose-50/50 border-[#8b182b]/30 shadow-2xs' 
                            : 'bg-slate-50/60 border-slate-100'
                        }`}
                      >
                        <p className="text-xs font-bold text-slate-800 mb-1">{trend.monthName}</p>
                        <div className="text-xs space-y-1">
                          <p className="text-slate-500">
                            Attendance: <span className="font-bold text-slate-800">{trend.attendancePercentage !== null ? `${trend.attendancePercentage}%` : 'N/A'}</span>
                          </p>
                          {trend.tasksCompleted > 0 && (
                            <p className="text-slate-500">
                              Tasks: <span className="font-bold text-emerald-600">{trend.tasksCompleted}</span>
                            </p>
                          )}
                          {trend.leadsConverted > 0 && (
                            <p className="text-slate-500">
                              Deals: <span className="font-bold text-emerald-600">{trend.leadsConverted}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Daily Attendance History Table */}
              <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs space-y-0">
                <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Daily Attendance History</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Logs for {data?.period?.monthName} {data?.period?.year}</p>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">
                    {attendance?.dailyRecords?.length || 0} days recorded
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Day</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Check-in</th>
                        <th className="px-4 py-3">Check-out</th>
                        <th className="px-4 py-3">Hours</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {attendance?.dailyRecords?.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-slate-400 italic">
                            No daily attendance records logged for this employee in {data?.period?.monthName} {data?.period?.year}.
                          </td>
                        </tr>
                      ) : (
                        attendance?.dailyRecords?.map((rec: any) => {
                          let badgeBg = 'bg-slate-100 text-slate-700';
                          if (rec.status === 'PRESENT') badgeBg = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
                          else if (rec.status === 'LATE') badgeBg = 'bg-amber-50 text-amber-700 border border-amber-200';
                          else if (rec.status === 'HALF_DAY') badgeBg = 'bg-purple-50 text-purple-700 border border-purple-200';
                          else if (rec.status === 'ABSENT') badgeBg = 'bg-rose-50 text-rose-700 border border-rose-200';

                          return (
                            <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="px-4 py-3 font-medium text-slate-900">{rec.date}</td>
                              <td className="px-4 py-3 text-slate-500">{rec.dayOfWeek}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${badgeBg}`}>
                                  {rec.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-mono text-slate-600">{rec.checkInTime || '-'}</td>
                              <td className="px-4 py-3 font-mono text-slate-600">{rec.checkOutTime || '-'}</td>
                              <td className="px-4 py-3 font-mono text-slate-600">{rec.workingHours !== null && rec.workingHours !== undefined ? `${rec.workingHours}h` : '-'}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-white border border-slate-200/80 text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
