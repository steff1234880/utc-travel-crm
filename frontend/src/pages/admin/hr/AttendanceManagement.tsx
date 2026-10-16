import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';
import { 
  Clock, Calendar, UserCheck, CheckCircle2, XCircle, 
  AlertCircle, Filter, Edit, Search, ArrowRight, ShieldAlert,
  LogIn, LogOut as LogOutIcon, RefreshCw
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { EmployeeProfileModal } from '../../../components/admin/EmployeeProfileModal';

export default function AttendanceManagement() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const now = new Date();

  // Self-Service vs Admin All View
  const isHRAdmin = ['ADMIN', 'SUPER_ADMIN', 'CEO / Super Admin', 'HR_MANAGER'].some(
    r => (user?.roleName || '').toUpperCase().includes(r.replace('_', ' ')) || (user?.roleName || '').toUpperCase() === r
  );

  const [activeTab, setActiveTab] = useState<'all' | 'my'>(isHRAdmin ? 'all' : 'my');
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('');
  
  // Correction Modal
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [correctionForm, setCorrectionForm] = useState({
    status: '',
    checkInTime: '',
    checkOutTime: '',
    workingHours: '',
    reason: '',
    notes: ''
  });

  // Profile Modal
  const [selectedProfileEmpId, setSelectedProfileEmpId] = useState<string | null>(null);

  // 1. Employee Today Attendance
  const { data: todayData, isLoading: isTodayLoading } = useQuery({
    queryKey: ['attendance-today'],
    queryFn: async () => {
      const res = await api.get('/hr/attendance/today');
      return res.data.data;
    }
  });

  // 2. Check In Mutation
  const checkInMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/hr/attendance/check-in', {});
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-all'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-my-history'] });
      alert(data.message || 'Checked in successfully!');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Check-in failed');
    }
  });

  // 3. Check Out Mutation
  const checkOutMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/hr/attendance/check-out', {});
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-all'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-my-history'] });
      alert(data.message || 'Checked out successfully!');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Check-out failed');
    }
  });

  // 4. Admin All Attendance Query
  const { data: allData, isLoading: isAllLoading } = useQuery({
    queryKey: ['attendance-all', selectedMonth, selectedYear, selectedDept, selectedEmployee, dateFilter],
    queryFn: async () => {
      let url = `/hr/attendance?month=${selectedMonth}&year=${selectedYear}`;
      if (selectedDept && selectedDept !== 'ALL') url += `&departmentId=${selectedDept}`;
      if (selectedEmployee && selectedEmployee !== 'ALL') url += `&employeeId=${selectedEmployee}`;
      if (dateFilter) url += `&date=${dateFilter}`;
      const res = await api.get(url);
      return res.data.data;
    },
    enabled: isHRAdmin && activeTab === 'all'
  });

  // 5. My Attendance History Query
  const { data: myData, isLoading: isMyLoading } = useQuery({
    queryKey: ['attendance-my-history', selectedMonth, selectedYear],
    queryFn: async () => {
      const res = await api.get(`/hr/attendance/my-history?month=${selectedMonth}&year=${selectedYear}`);
      return res.data.data;
    },
    enabled: activeTab === 'my'
  });

  // 6. Departments & Employees Filter
  const { data: departmentsData } = useQuery<{ data: { id: string; name: string }[] }>({
    queryKey: ['departments'],
    queryFn: async () => {
      const res = await api.get('/hr/departments');
      return res.data;
    },
    enabled: isHRAdmin
  });

  const { data: employeesData } = useQuery<{ data: { id: string; firstName: string; lastName: string; employeeId: string }[] }>({
    queryKey: ['employees-minimal'],
    queryFn: async () => {
      const res = await api.get('/hr/employees');
      return res.data;
    },
    enabled: isHRAdmin
  });

  // 7. Correction Mutation
  const correctMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await api.patch(`/hr/attendance/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-all'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-my-history'] });
      setEditingRecord(null);
      alert('Attendance record corrected successfully with audit log.');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to correct attendance');
    }
  });

  const handleOpenCorrection = (record: any) => {
    setEditingRecord(record);
    setCorrectionForm({
      status: record.status || 'PRESENT',
      checkInTime: record.checkInTime || '',
      checkOutTime: record.checkOutTime || '',
      workingHours: record.workingHours ? String(record.workingHours) : '',
      reason: '',
      notes: record.notes || ''
    });
  };

  const handleSaveCorrection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionForm.reason) {
      alert('Audit trail reason is required for administrative corrections');
      return;
    }
    correctMutation.mutate({
      id: editingRecord.id,
      data: {
        status: correctionForm.status,
        workingHours: correctionForm.workingHours ? Number(correctionForm.workingHours) : undefined,
        reason: correctionForm.reason,
        notes: correctionForm.notes
      }
    });
  };

  const months = [
    { value: 1, name: 'January' }, { value: 2, name: 'February' }, { value: 3, name: 'March' },
    { value: 4, name: 'April' }, { value: 5, name: 'May' }, { value: 6, name: 'June' },
    { value: 7, name: 'July' }, { value: 8, name: 'August' }, { value: 9, name: 'September' },
    { value: 10, name: 'October' }, { value: 11, name: 'November' }, { value: 12, name: 'December' },
  ];

  const todayRecord = todayData?.record;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Attendance Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time biometric and self-service check-in, tracking, and compliance logs.
          </p>
        </div>

        {/* View Toggle */}
        {isHRAdmin && (
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Employees Attendance
            </button>
            <button
              onClick={() => setActiveTab('my')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'my' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              My Attendance
            </button>
          </div>
        )}
      </div>

      {/* TODAY'S CHECK-IN / CHECK-OUT BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-[#24060c] to-[#8b182b] text-white rounded-2xl p-5 sm:p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shrink-0">
            <Clock className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-wider text-rose-200">Today's Work Log</span>
              <span className="text-xs text-white/50">•</span>
              <span className="text-xs font-mono text-white/90">{now.toLocaleDateString(undefined, { dateStyle: 'full' })}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-0.5">
              {todayRecord?.checkInTime ? (
                todayRecord.checkOutTime ? (
                  <span>Checked Out • {todayRecord.workingHours || 0} Hours Logged</span>
                ) : (
                  <span>Working • Checked In at {new Date(todayRecord.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                )
              ) : (
                <span>Not Checked In Yet</span>
              )}
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              {todayData?.officeTimings ? (
                <>
                  Office shift: <span className="font-semibold text-white">{todayData.officeTimings.officeStartTime} – {todayData.officeTimings.officeEndTime}</span>
                  {todayData.officeTimings.gracePeriodMins > 0 && (
                    <> • Grace period: <span className="text-amber-300 font-semibold">{todayData.officeTimings.gracePeriodMins} mins</span></>
                  )}
                  {todayData.officeTimings.breakStartTime && todayData.officeTimings.breakEndTime && (
                    <> • Break: <span className="text-slate-300">{todayData.officeTimings.breakStartTime} – {todayData.officeTimings.breakEndTime}</span></>
                  )}
                </>
              ) : (
                'Standard shift: 09:30 AM – 06:30 PM. Arrivals after grace period are logged as Late.'
              )}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {!todayRecord?.checkInTime ? (
            <button
              onClick={() => checkInMutation.mutate()}
              disabled={checkInMutation.isPending}
              className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md transition-all disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              <span>{checkInMutation.isPending ? 'Checking In...' : 'Check In Now'}</span>
            </button>
          ) : !todayRecord?.checkOutTime ? (
            <button
              onClick={() => checkOutMutation.mutate()}
              disabled={checkOutMutation.isPending}
              className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-md transition-all disabled:opacity-50"
            >
              <LogOutIcon className="w-4 h-4" />
              <span>{checkOutMutation.isPending ? 'Checking Out...' : 'Check Out Now'}</span>
            </button>
          ) : (
            <div className="px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-xs font-bold text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Shift Completed</span>
            </div>
          )}
        </div>
      </div>

      {/* FILTER CONTROLS FOR ATTENDANCE LOGS */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Month / Year */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none"
            >
              {months.map(m => <option key={m.value} value={m.value}>{m.name}</option>)}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none"
            >
              {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {/* Department Filter (Admin only) */}
          {activeTab === 'all' && isHRAdmin && (
            <>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 rounded-xl px-3 py-2 focus:outline-none"
              >
                <option value="ALL">All Departments</option>
                {departmentsData?.data?.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>

              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 rounded-xl px-3 py-2 focus:outline-none"
              >
                <option value="ALL">All Employees</option>
                {employeesData?.data?.map(e => (
                  <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.employeeId})</option>
                ))}
              </select>

              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                placeholder="Specific date"
                className="bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 rounded-xl px-3 py-1.5 focus:outline-none"
              />
              {dateFilter && (
                <button
                  onClick={() => setDateFilter('')}
                  className="text-xs text-rose-600 hover:underline font-semibold"
                >
                  Clear Date
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* SUMMARY STATS BAR */}
      {activeTab === 'all' && allData?.summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Logs</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{allData.summary.totalRecords}</p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Present</p>
            <p className="text-2xl font-black text-emerald-700 mt-1">{allData.summary.present}</p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600">Late</p>
            <p className="text-2xl font-black text-amber-700 mt-1">{allData.summary.late}</p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-purple-600">Half Day</p>
            <p className="text-2xl font-black text-purple-700 mt-1">{allData.summary.halfDay}</p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600">On Leave</p>
            <p className="text-2xl font-black text-blue-700 mt-1">{allData.summary.onLeave}</p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-rose-600">Missing Check-Out</p>
            <p className="text-2xl font-black text-rose-700 mt-1">{allData.summary.missingCheckOut}</p>
          </div>
        </div>
      )}

      {activeTab === 'my' && myData?.summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Attendance Rate</p>
            <p className="text-2xl font-black text-[#8b182b] mt-1">{myData.summary.percentage !== null ? `${myData.summary.percentage}%` : 'N/A'}</p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Present</p>
            <p className="text-2xl font-black text-emerald-700 mt-1">{myData.summary.present}</p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600">Late</p>
            <p className="text-2xl font-black text-amber-700 mt-1">{myData.summary.late}</p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-purple-600">Half Day</p>
            <p className="text-2xl font-black text-purple-700 mt-1">{myData.summary.halfDay}</p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600">On Leave</p>
            <p className="text-2xl font-black text-blue-700 mt-1">{myData.summary.onLeave}</p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-rose-600">Absent</p>
            <p className="text-2xl font-black text-rose-700 mt-1">{myData.summary.absent}</p>
          </div>
        </div>
      )}

      {/* ATTENDANCE TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">
            {activeTab === 'all' ? 'All Employees Daily Attendance Records' : 'My Monthly Attendance Log'}
          </h3>
          <span className="text-xs text-slate-400 font-semibold">
            {activeTab === 'all' ? `${allData?.records?.length || 0} records` : `${myData?.records?.length || 0} records`}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Date</th>
                {activeTab === 'all' && <th className="px-4 py-3">Employee</th>}
                {activeTab === 'all' && <th className="px-4 py-3">Department</th>}
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Check-In</th>
                <th className="px-4 py-3">Check-Out</th>
                <th className="px-4 py-3">Working Hours</th>
                <th className="px-4 py-3">Notes</th>
                {activeTab === 'all' && isHRAdmin && <th className="px-4 py-3 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {activeTab === 'all' ? (
                allData?.records?.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-400 italic">
                      No attendance records found for this period.
                    </td>
                  </tr>
                ) : (
                  allData?.records?.map((r: any) => {
                    let badge = 'bg-slate-100 text-slate-700';
                    if (r.status === 'PRESENT') badge = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
                    else if (r.status === 'LATE') badge = 'bg-amber-50 text-amber-700 border border-amber-200';
                    else if (r.status === 'HALF_DAY') badge = 'bg-purple-50 text-purple-700 border border-purple-200';
                    else if (r.status === 'ON_LEAVE') badge = 'bg-blue-50 text-blue-700 border border-blue-200';
                    else if (r.status === 'ABSENT') badge = 'bg-rose-50 text-rose-700 border border-rose-200';

                    return (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-900">{r.date}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setSelectedProfileEmpId(r.employeeId)}
                            className="font-bold text-slate-900 hover:text-[#8b182b] text-left transition-colors"
                          >
                            {r.employeeName}
                            <span className="block text-[10px] text-slate-400 font-mono">{r.employeeNumber}</span>
                          </button>
                        </td>
                        <td className="px-4 py-3">{r.department}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${badge}`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-700">{r.checkInTime || '-'}</td>
                        <td className="px-4 py-3 font-mono text-slate-700">
                          {r.checkOutTime || (
                            <span className="text-amber-600 font-semibold italic text-[11px]">Missing</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono">{r.workingHours !== null && r.workingHours !== undefined ? `${r.workingHours}h` : '-'}</td>
                        <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{r.notes || '-'}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleOpenCorrection(r)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-[#8b182b] hover:bg-rose-50 transition-colors"
                            title="Admin Correction"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )
              ) : (
                myData?.records?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400 italic">
                      No personal attendance records found for this period.
                    </td>
                  </tr>
                ) : (
                  myData?.records?.map((r: any) => {
                    let badge = 'bg-slate-100 text-slate-700';
                    if (r.status === 'PRESENT') badge = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
                    else if (r.status === 'LATE') badge = 'bg-amber-50 text-amber-700 border border-amber-200';
                    else if (r.status === 'HALF_DAY') badge = 'bg-purple-50 text-purple-700 border border-purple-200';
                    else if (r.status === 'ON_LEAVE') badge = 'bg-blue-50 text-blue-700 border border-blue-200';
                    else if (r.status === 'ABSENT') badge = 'bg-rose-50 text-rose-700 border border-rose-200';

                    return (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-900">{r.date}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${badge}`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono">{r.checkInTime || '-'}</td>
                        <td className="px-4 py-3 font-mono">{r.checkOutTime || '-'}</td>
                        <td className="px-4 py-3 font-mono">{r.workingHours !== null && r.workingHours !== undefined ? `${r.workingHours}h` : '-'}</td>
                        <td className="px-4 py-3 text-slate-500">{r.notes || '-'}</td>
                      </tr>
                    );
                  })
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADMIN CORRECTION MODAL WITH AUDIT TRAIL */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-[#8b182b]" />
                <h3 className="font-bold text-slate-900 text-base">Authorized Attendance Correction</h3>
              </div>
              <button onClick={() => setEditingRecord(null)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <p className="text-xs text-slate-500">
              Editing attendance for <strong className="text-slate-800">{editingRecord.employeeName}</strong> on <span className="font-mono">{editingRecord.date}</span>.
              All changes are logged in security audit trails.
            </p>

            <form onSubmit={handleSaveCorrection} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Status</label>
                <select
                  value={correctionForm.status}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, status: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#8b182b]"
                >
                  <option value="PRESENT">PRESENT</option>
                  <option value="LATE">LATE</option>
                  <option value="HALF_DAY">HALF_DAY</option>
                  <option value="ON_LEAVE">ON_LEAVE</option>
                  <option value="ABSENT">ABSENT</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Working Hours</label>
                <input
                  type="number"
                  step="0.5"
                  value={correctionForm.workingHours}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, workingHours: e.target.value })}
                  placeholder="e.g. 8.5"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#8b182b]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Correction Reason <span className="text-rose-500">* (Audit Required)</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={correctionForm.reason}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, reason: e.target.value })}
                  placeholder="e.g. Employee forgot to punch out due to on-site tour coordination"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#8b182b]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={correctMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-[#8b182b] text-white font-bold hover:bg-[#731323] transition-colors"
                >
                  {correctMutation.isPending ? 'Saving...' : 'Save Correction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Employee Profile Modal */}
      {selectedProfileEmpId && (
        <EmployeeProfileModal
          employeeId={selectedProfileEmpId}
          onClose={() => setSelectedProfileEmpId(null)}
        />
      )}
    </div>
  );
}
