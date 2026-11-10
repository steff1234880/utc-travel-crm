import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Award, TrendingUp, CheckCircle, XCircle, Clock, AlertCircle, 
  RefreshCw, Search, IndianRupee, Eye,
  ShieldAlert, User, Check, Edit2, Calendar
} from 'lucide-react';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';

interface DepartmentMetric {
  name: string;
  weight: number;
  score: number;
  maxScore: number;
  rawAchieved: number;
  rawTotal: number;
  unit: string;
  note: string;
}

interface PerformanceScoreItem {
  id: string;
  employeeId: string;
  employeeName: string;
  email: string;
  department: string;
  designation: string;
  month: number;
  year: number;
  score: number | null;
  grade: string | null;
  hasData: boolean;
  summary: string;
  metrics: DepartmentMetric[];
  unavailableMetrics: string[];
  calculatedAt: string;
  incentive: any;
}

interface IncentivePayoutItem {
  id: string;
  employeeId: string;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    department?: { name: string };
    designation?: { name: string };
  };
  amount: number;
  type: string;
  reason: string;
  period: string;
  month: number;
  year: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID' | 'DRAFT';
  notes?: string;
  rejectionReason?: string;
  paymentMethod?: string;
  paymentReference?: string;
  paidAt?: string;
  transactionId?: string;
  transaction?: any;
  scoreSnapshot?: {
    score: number;
    grade: string;
  };
  createdAt: string;
}

const DEPARTMENTS = ['ALL', 'Sales', 'Operations', 'Reservations', 'Tour Coordinator', 'HR', 'Accounting'];

export default function IncentiveManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const userRole = (user?.roleName || '').toLowerCase();
  const isCeoOrAdmin = userRole.includes('ceo') || userRole.includes('admin') || userRole.includes('super');
  const isAccountant = isCeoOrAdmin || userRole.includes('accountant') || userRole.includes('finance');

  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<'overview' | 'approvals' | 'payouts' | 'my-performance'>(
    isCeoOrAdmin ? 'overview' : 'my-performance'
  );

  // Modal / Drawer states
  const [selectedScoreDetail, setSelectedScoreDetail] = useState<PerformanceScoreItem | null>(null);
  const [incentiveModalEmployee, setIncentiveModalEmployee] = useState<PerformanceScoreItem | null>(null);
  const [incentiveAmount, setIncentiveAmount] = useState<string>('');
  const [incentiveReason, setIncentiveReason] = useState<string>('');
  const [incentiveNotes, setIncentiveNotes] = useState<string>('');

  // Approval / Rejection modal state
  const [approvalModalItem, setApprovalModalItem] = useState<IncentivePayoutItem | null>(null);
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [rejectionReasonInput, setRejectionReasonInput] = useState<string>('');

  // Payout modal state
  const [payoutModalItem, setPayoutModalItem] = useState<IncentivePayoutItem | null>(null);
  const [payoutMethod, setPayoutMethod] = useState<string>('BANK_TRANSFER');
  const [payoutReference, setPayoutReference] = useState<string>('');

  // 1. Fetch Performance Scores
  const {
    data: performanceData,
    isLoading: isLoadingScores,
    isFetching: isFetchingScores,
    refetch: refetchScores
  } = useQuery({
    queryKey: ['performance-scores', selectedMonth, selectedYear, selectedDept],
    queryFn: async () => {
      const res = await api.get('/incentives/performance', {
        params: {
          month: selectedMonth,
          year: selectedYear,
          department: selectedDept
        }
      });
      return res.data.data;
    },
    enabled: isCeoOrAdmin || activeTab === 'overview'
  });

  // 2. Fetch Incentive Records for Approvals / Liabilities (includes all unreviewed pending across all months)
  const {
    data: payoutsData,
    isLoading: isLoadingPayouts,
    refetch: refetchPayouts
  } = useQuery({
    queryKey: ['incentive-payouts', selectedMonth, selectedYear],
    queryFn: async () => {
      const res = await api.get('/incentives/payouts', {
        params: {
          month: selectedMonth,
          year: selectedYear,
          includePendingAll: true
        }
      });
      return res.data.data as IncentivePayoutItem[];
    },
    enabled: isCeoOrAdmin || isAccountant || activeTab === 'approvals' || activeTab === 'payouts'
  });

  // 3. Fetch Personal Performance (Employee Self-Service)
  const {
    data: myPerformanceData,
    isLoading: isLoadingMyPerf
  } = useQuery({
    queryKey: ['my-performance'],
    queryFn: async () => {
      const res = await api.get('/incentives/my-performance');
      return res.data.data;
    }
  });

  // Mutations
  const setIncentiveMutation = useMutation({
    mutationFn: async (payload: { employeeId: string; amount: number; month: number; year: number; reason: string; notes?: string }) => {
      const res = await api.post('/incentives/create-or-update', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-scores'] });
      queryClient.invalidateQueries({ queryKey: ['incentive-payouts'] });
      setIncentiveModalEmployee(null);
      setIncentiveAmount('');
      setIncentiveReason('');
      setIncentiveNotes('');
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (payload: { id: string; status: 'APPROVED' | 'REJECTED'; rejectionReason?: string }) => {
      const res = await api.patch(`/incentives/${payload.id}/status`, {
        status: payload.status,
        rejectionReason: payload.rejectionReason
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-scores'] });
      queryClient.invalidateQueries({ queryKey: ['incentive-payouts'] });
      setApprovalModalItem(null);
      setRejectionReasonInput('');
    }
  });

  const processPayoutMutation = useMutation({
    mutationFn: async (payload: { id: string; paymentMethod: string; referenceNumber?: string }) => {
      const res = await api.post(`/incentives/${payload.id}/payout`, {
        paymentMethod: payload.paymentMethod,
        referenceNumber: payload.referenceNumber
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-scores'] });
      queryClient.invalidateQueries({ queryKey: ['incentive-payouts'] });
      queryClient.invalidateQueries({ queryKey: ['my-performance'] });
      setPayoutModalItem(null);
      setPayoutReference('');
    }
  });

  // Filtered scores
  const filteredScores = useMemo(() => {
    if (!performanceData?.scores) return [];
    return performanceData.scores.filter((s: PerformanceScoreItem) => {
      const matchSearch =
        s.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.designation.toLowerCase().includes(searchTerm.toLowerCase());
      return matchSearch;
    });
  }, [performanceData, searchTerm]);

  // KPI Calculations
  const metricsSummary = useMemo(() => {
    const list: PerformanceScoreItem[] = performanceData?.scores || [];
    const withScores = list.filter(s => s.score !== null);
    const avgScore = withScores.length > 0
      ? Math.round(withScores.reduce((acc, s) => acc + (s.score || 0), 0) / withScores.length)
      : 0;

    const payouts: IncentivePayoutItem[] = payoutsData || [];
    const pendingCount = payouts.filter(p => p.status === 'PENDING').length;
    const approvedCount = payouts.filter(p => p.status === 'APPROVED').length;
    const totalApprovedLiability = payouts
      .filter(p => p.status === 'APPROVED')
      .reduce((acc, p) => acc + p.amount, 0);
    const totalPaidAmount = payouts
      .filter(p => p.status === 'PAID')
      .reduce((acc, p) => acc + p.amount, 0);

    return {
      totalEmployees: list.length,
      avgScore,
      pendingApprovals: pendingCount,
      approvedCount,
      totalApprovedLiability,
      totalPaidAmount
    };
  }, [performanceData, payoutsData]);

  const handleOpenIncentiveModal = (emp: PerformanceScoreItem) => {
    setIncentiveModalEmployee(emp);
    if (emp.incentive) {
      setIncentiveAmount(emp.incentive.amount?.toString() || '');
      setIncentiveReason(emp.incentive.reason || `Performance incentive for ${selectedMonth}/${selectedYear}`);
      setIncentiveNotes(emp.incentive.notes || '');
    } else {
      setIncentiveAmount('');
      setIncentiveReason(`Performance incentive for ${selectedMonth}/${selectedYear}`);
      setIncentiveNotes('');
    }
  };

  const handleSaveIncentive = (e: React.FormEvent) => {
    e.preventDefault();
    if (!incentiveModalEmployee) return;
    const amt = parseFloat(incentiveAmount);
    if (isNaN(amt) || amt < 0) {
      alert('Please enter a valid non-negative amount');
      return;
    }

    setIncentiveMutation.mutate({
      employeeId: incentiveModalEmployee.employeeId,
      amount: amt,
      month: selectedMonth,
      year: selectedYear,
      reason: incentiveReason,
      notes: incentiveNotes
    });
  };

  const handleStatusSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvalModalItem) return;

    updateStatusMutation.mutate({
      id: approvalModalItem.id,
      status: actionType === 'APPROVE' ? 'APPROVED' : 'REJECTED',
      rejectionReason: actionType === 'REJECT' ? rejectionReasonInput : undefined
    });
  };

  const handlePayoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutModalItem) return;

    processPayoutMutation.mutate({
      id: payoutModalItem.id,
      paymentMethod: payoutMethod,
      referenceNumber: payoutReference
    });
  };

  const getGradeBadge = (grade: string | null) => {
    if (!grade) return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-500">N/A</span>;
    switch (grade) {
      case 'A+':
      case 'A':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Grade {grade}</span>;
      case 'B':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">Grade {grade}</span>;
      case 'C':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">Grade {grade}</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">Grade {grade}</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">PAID</span>;
      case 'APPROVED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">APPROVED</span>;
      case 'PENDING':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">PENDING REVIEW</span>;
      case 'REJECTED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">REJECTED</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-rose-50 text-[#8b182b] rounded-lg">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Employee Performance & Incentive Management</h1>
              <p className="text-sm text-slate-500">
                Department-specific performance scoring, executive incentive awards, and accounting payouts
              </p>
            </div>
          </div>
        </div>

        {/* Period Selector & Recalculate */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-sm px-3 py-1.5 text-sm">
            <Calendar className="h-4 w-4 text-slate-400 mr-2" />
            <select
              aria-label="Filter by month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="bg-transparent border-none text-slate-700 font-medium focus:ring-0 cursor-pointer pr-2"
            >
              {[
                { v: 1, l: 'Jan' }, { v: 2, l: 'Feb' }, { v: 3, l: 'Mar' }, { v: 4, l: 'Apr' },
                { v: 5, l: 'May' }, { v: 6, l: 'Jun' }, { v: 7, l: 'Jul' }, { v: 8, l: 'Aug' },
                { v: 9, l: 'Sep' }, { v: 10, l: 'Oct' }, { v: 11, l: 'Nov' }, { v: 12, l: 'Dec' }
              ].map(m => (
                <option key={m.v} value={m.v}>{m.l}</option>
              ))}
            </select>
            <select
              aria-label="Filter by year"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="bg-transparent border-none text-slate-700 font-medium focus:ring-0 cursor-pointer"
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {isCeoOrAdmin && (
            <button
              onClick={() => refetchScores()}
              disabled={isFetchingScores}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium shadow-sm transition"
            >
              <RefreshCw className={`h-4 w-4 text-slate-500 ${isFetchingScores ? 'animate-spin' : ''}`} />
              <span>{isFetchingScores ? 'Computing...' : 'Recalculate'}</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Row */}
      {isCeoOrAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Average Performance</span>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">{metricsSummary.avgScore}/100</span>
              <span className="text-xs text-slate-500">across {metricsSummary.totalEmployees} employees</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">Department benchmarks weighted</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pending CEO Review</span>
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                <Clock className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">{metricsSummary.pendingApprovals}</span>
              <span className="text-xs text-amber-600 font-medium">Awaiting decision</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">Manual incentive proposals</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Approved Liability</span>
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <IndianRupee className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">
                ₹{metricsSummary.totalApprovedLiability.toLocaleString('en-IN')}
              </span>
              <span className="text-xs text-indigo-600 font-medium">Pending Payout</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">{metricsSummary.approvedCount} approved awards</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Paid Disbursed</span>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <CheckCircle className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">
                ₹{metricsSummary.totalPaidAmount.toLocaleString('en-IN')}
              </span>
              <span className="text-xs text-emerald-600 font-medium">Accounting Closed</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">Linked to financial ledger</p>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200 bg-white rounded-t-xl px-4 shadow-sm flex flex-wrap gap-2">
        {isCeoOrAdmin && (
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-4 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'border-[#8b182b] text-[#8b182b]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            <span>Monthly Performance Scores</span>
          </button>
        )}

        {isCeoOrAdmin && (
          <button
            onClick={() => setActiveTab('approvals')}
            className={`py-3 px-4 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'approvals'
                ? 'border-[#8b182b] text-[#8b182b]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <ShieldAlert className="h-4 w-4" />
            <span>Incentive Approvals & Reviews</span>
            {metricsSummary.pendingApprovals > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-xs bg-amber-500 text-white font-bold">
                {metricsSummary.pendingApprovals}
              </span>
            )}
          </button>
        )}

        {(isCeoOrAdmin || isAccountant) && (
          <button
            onClick={() => setActiveTab('payouts')}
            className={`py-3 px-4 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'payouts'
                ? 'border-[#8b182b] text-[#8b182b]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <IndianRupee className="h-4 w-4" />
            <span>Accounting & Payouts</span>
            {metricsSummary.approvedCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-xs bg-blue-600 text-white font-bold">
                {metricsSummary.approvedCount}
              </span>
            )}
          </button>
        )}

        <button
          onClick={() => setActiveTab('my-performance')}
          className={`py-3 px-4 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'my-performance'
              ? 'border-[#8b182b] text-[#8b182b]'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <User className="h-4 w-4" />
          <span>My Performance & Incentives</span>
        </button>
      </div>

      {/* TAB 1: Monthly Performance Scores Overview */}
      {activeTab === 'overview' && (
        <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm p-6 space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold uppercase text-slate-400">Department:</span>
              <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                {DEPARTMENTS.map(dept => (
                  <button
                    key={dept}
                    onClick={() => setSelectedDept(dept)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                      selectedDept === dept
                        ? 'bg-[#8b182b] text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {dept}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search staff or role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#8b182b]"
              />
            </div>
          </div>

          {/* Table */}
          {isLoadingScores ? (
            <div className="py-12 text-center text-slate-500">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-[#8b182b]" />
              <p className="text-sm">Calculating genuine department metrics and scores...</p>
            </div>
          ) : filteredScores.length === 0 ? (
            <div className="py-12 text-center text-slate-400 border border-dashed rounded-lg">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">No employee performance records found for this period and filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-semibold border-y border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Department / Role</th>
                    <th className="py-3 px-4">Performance Score</th>
                    <th className="py-3 px-4">Grade</th>
                    <th className="py-3 px-4">Awarded Incentive</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredScores.map((row: PerformanceScoreItem) => (
                    <tr key={row.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{row.employeeName}</div>
                        <div className="text-xs text-slate-400">{row.email}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800">{row.department}</div>
                        <div className="text-xs text-slate-500">{row.designation}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        {row.score !== null ? (
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-base">{row.score}</span>
                            <span className="text-xs text-slate-400">/ 100</span>
                            <div className="w-20 bg-slate-100 rounded-full h-2">
                              <div
                                className="bg-[#8b182b] h-2 rounded-full"
                                style={{ width: `${Math.min(100, row.score)}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No activity recorded</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {getGradeBadge(row.grade)}
                      </td>
                      <td className="py-3.5 px-4">
                        {row.incentive ? (
                          <div className="font-semibold text-slate-900">
                            ₹{row.incentive.amount.toLocaleString('en-IN')}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Not set</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {row.incentive ? (
                          getStatusBadge(row.incentive.status)
                        ) : (
                          <span className="text-xs text-slate-400">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedScoreDetail(row)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                            title="View Score Breakdown"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          {isCeoOrAdmin && (
                            <button
                              onClick={() => handleOpenIncentiveModal(row)}
                              className="px-2.5 py-1 text-xs font-medium bg-[#8b182b] text-white hover:bg-[#6e1322] rounded-lg shadow-sm transition flex items-center gap-1"
                            >
                              <Edit2 className="h-3 w-3" />
                              <span>{row.incentive ? 'Edit Amount' : 'Set Incentive'}</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Incentive Approvals & Reviews (CEO / Admin) */}
      {activeTab === 'approvals' && (
        <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Executive Incentive Approvals</h2>
              <p className="text-xs text-slate-500">
                Review proposed incentive amounts. The CEO / Admin decides the final award based on performance scores.
              </p>
            </div>
            <button
              onClick={() => refetchPayouts()}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
          </div>

          {isLoadingPayouts ? (
            <div className="py-8 text-center text-slate-400">Loading requests...</div>
          ) : !payoutsData || payoutsData.length === 0 ? (
            <div className="py-12 text-center text-slate-400 border border-dashed rounded-lg">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">No incentive awards have been entered for this period.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-semibold border-y border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Monthly Score</th>
                    <th className="py-3 px-4">Incentive Amount</th>
                    <th className="py-3 px-4">Reason / Notes</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Approval Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payoutsData.map((item: IncentivePayoutItem) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {item.employee.firstName} {item.employee.lastName}
                        <div className="text-xs text-slate-400 font-normal">{item.employee.email}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        {item.employee.department?.name || 'Operations'}
                      </td>
                      <td className="py-3.5 px-4">
                        {item.scoreSnapshot ? (
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{item.scoreSnapshot.score}/100</span>
                            {getGradeBadge(item.scoreSnapshot.grade)}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No score snapshot</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 text-base">
                        ₹{item.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs text-xs text-slate-600">
                        <div className="font-medium text-slate-800">{item.reason}</div>
                        {item.notes && <div className="text-slate-400 truncate">{item.notes}</div>}
                        {item.rejectionReason && (
                          <div className="text-rose-600 font-medium mt-0.5">Reason: {item.rejectionReason}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {getStatusBadge(item.status)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {item.status === 'PENDING' && isCeoOrAdmin ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setApprovalModalItem(item);
                                setActionType('APPROVE');
                              }}
                              className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 rounded shadow-sm transition"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                setApprovalModalItem(item);
                                setActionType('REJECT');
                              }}
                              className="px-2.5 py-1 text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 rounded transition border border-rose-200"
                            >
                              Reject
                            </button>
                          </div>
                        ) : item.status === 'APPROVED' ? (
                          <span className="text-xs text-blue-600 font-medium">Ready for Accountant</span>
                        ) : item.status === 'PAID' ? (
                          <span className="text-xs text-emerald-600 font-medium">Payment Complete</span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Accounting & Payouts (Accountant / Admin) */}
      {activeTab === 'payouts' && (
        <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Incentive Liabilities & Payout Ledger</h2>
              <p className="text-xs text-slate-500">
                Approved incentives appear as liabilities for Accountant disbursement. Processing creates an official FinancialTransaction.
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400">Total Unpaid Approved: </span>
              <span className="text-sm font-bold text-[#8b182b]">
                ₹{metricsSummary.totalApprovedLiability.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {isLoadingPayouts ? (
            <div className="py-8 text-center text-slate-400">Loading ledger...</div>
          ) : !payoutsData || payoutsData.length === 0 ? (
            <div className="py-12 text-center text-slate-400 border border-dashed rounded-lg">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">No payout records found for this period.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-semibold border-y border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Period</th>
                    <th className="py-3 px-4">Incentive Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Payment Method</th>
                    <th className="py-3 px-4">Transaction / Ref</th>
                    <th className="py-3 px-4 text-right">Accounting Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payoutsData.map((item: IncentivePayoutItem) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {item.employee.firstName} {item.employee.lastName}
                        <div className="text-xs text-slate-400 font-normal">{item.employee.department?.name}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        {item.period || `${item.month}/${item.year}`}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 text-base">
                        ₹{item.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4">
                        {getStatusBadge(item.status)}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-700">
                        {item.paymentMethod || item.transaction?.paymentMethod || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        {item.transaction?.referenceNumber ? (
                          <div className="font-mono text-slate-800">{item.transaction.referenceNumber}</div>
                        ) : item.paymentReference ? (
                          <div className="font-mono text-slate-800">{item.paymentReference}</div>
                        ) : (
                          <span className="text-slate-400 italic">Pending Payout</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {item.status === 'APPROVED' ? (
                          <button
                            onClick={() => {
                              setPayoutModalItem(item);
                              setPayoutMethod('BANK_TRANSFER');
                              setPayoutReference(`REF-${Date.now().toString().slice(-6)}`);
                            }}
                            className="px-3 py-1 text-xs font-semibold bg-[#8b182b] text-white hover:bg-[#6e1322] rounded shadow-sm transition"
                          >
                            Process Payment
                          </button>
                        ) : item.status === 'PAID' ? (
                          <span className="text-xs text-emerald-600 font-bold flex items-center justify-end gap-1">
                            <Check className="h-3.5 w-3.5" /> Disbursed
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Not approved yet</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Employee Self-Service (My Performance & Incentives) */}
      {activeTab === 'my-performance' && (
        <div className="space-y-6">
          {isLoadingMyPerf ? (
            <div className="bg-white rounded-xl p-12 text-center text-slate-400 border border-slate-200">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-[#8b182b]" />
              <p className="text-sm">Loading your performance metrics and incentive history...</p>
            </div>
          ) : !myPerformanceData ? (
            <div className="bg-white rounded-xl p-8 text-center text-slate-400 border border-slate-200">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">No linked employee record found for your user account.</p>
            </div>
          ) : (
            <>
              {/* Scorecard Hero */}
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-md">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-300">
                      My Monthly Performance
                    </span>
                    <h2 className="text-2xl font-bold mt-1">
                      {myPerformanceData.employee.name}
                    </h2>
                    <p className="text-sm text-slate-300 mt-0.5">
                      {myPerformanceData.employee.department} • {myPerformanceData.employee.designation}
                    </p>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <span className="text-xs text-slate-400 uppercase tracking-wider">Performance Score</span>
                      <div className="text-3xl font-extrabold text-white mt-0.5">
                        {myPerformanceData.currentPerformance?.score !== null
                          ? `${myPerformanceData.currentPerformance?.score}/100`
                          : 'N/A'}
                      </div>
                    </div>
                    <div className="p-3 bg-white/10 rounded-xl border border-white/20 backdrop-blur-sm">
                      <div className="text-2xl font-black text-rose-300">
                        {myPerformanceData.currentPerformance?.grade || '—'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-700/60 text-xs text-slate-300">
                  {myPerformanceData.currentPerformance?.summary}
                </div>
              </div>

              {/* Department Metric Breakdown Cards */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
                <h3 className="text-base font-bold text-slate-900">Department Performance Breakdown</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(myPerformanceData.currentPerformance?.metrics || []).map((m: DepartmentMetric, idx: number) => (
                    <div key={idx} className="p-4 rounded-lg border border-slate-100 bg-slate-50/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-slate-800">{m.name}</span>
                        <span className="text-xs font-bold text-[#8b182b]">
                          {m.score} / {m.maxScore} pts ({m.weight}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-[#8b182b] h-2 rounded-full"
                          style={{ width: `${Math.min(100, (m.score / (m.maxScore || 1)) * 100)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Achieved: {m.rawAchieved} {m.unit}</span>
                        <span>Total: {m.rawTotal}</span>
                      </div>
                      <p className="text-xs text-slate-600 italic mt-1">{m.note}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Incentive History & Payment Status */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
                <h3 className="text-base font-bold text-slate-900">Awarded Incentives & Payment Status</h3>
                {myPerformanceData.incentives?.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">No incentives recorded yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                      <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-semibold border-y border-slate-200">
                        <tr>
                          <th className="py-2.5 px-4">Period</th>
                          <th className="py-2.5 px-4">Awarded Amount</th>
                          <th className="py-2.5 px-4">Reason / Remarks</th>
                          <th className="py-2.5 px-4">Payment Status</th>
                          <th className="py-2.5 px-4">Reference</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {myPerformanceData.incentives.map((inc: any) => (
                          <tr key={inc.id}>
                            <td className="py-3 px-4 font-medium text-slate-900">{inc.period || 'Monthly'}</td>
                            <td className="py-3 px-4 font-bold text-slate-900 text-base">
                              ₹{inc.amount.toLocaleString('en-IN')}
                            </td>
                            <td className="py-3 px-4 text-xs text-slate-700">{inc.reason}</td>
                            <td className="py-3 px-4">{getStatusBadge(inc.status)}</td>
                            <td className="py-3 px-4 text-xs font-mono text-slate-600">
                              {inc.transaction?.referenceNumber || inc.paymentReference || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* MODAL 1: Detail Scorecard Drawer/Modal */}
      {selectedScoreDetail && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {selectedScoreDetail.employeeName} — Performance Breakdown
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedScoreDetail.department} Department • {selectedMonth}/{selectedYear}
                </p>
              </div>
              <button
                onClick={() => setSelectedScoreDetail(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div>
                <span className="text-xs uppercase text-slate-400 font-bold">Calculated Score</span>
                <div className="text-3xl font-black text-slate-900">
                  {selectedScoreDetail.score !== null ? `${selectedScoreDetail.score}/100` : 'No Data'}
                </div>
              </div>
              <div>{getGradeBadge(selectedScoreDetail.grade)}</div>
            </div>

            <p className="text-xs text-slate-600 italic bg-amber-50/60 p-3 rounded-lg border border-amber-100">
              {selectedScoreDetail.summary}
            </p>

            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Evaluation Metrics</h4>
              {selectedScoreDetail.metrics.map((m, idx) => (
                <div key={idx} className="p-3 bg-white border border-slate-200 rounded-lg space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold text-slate-800">{m.name}</span>
                    <span className="font-bold text-[#8b182b]">
                      {m.score} / {m.maxScore} pts ({m.weight}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div
                      className="bg-[#8b182b] h-1.5 rounded-full"
                      style={{ width: `${Math.min(100, (m.score / (m.maxScore || 1)) * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500">{m.note}</p>
                </div>
              ))}
            </div>

            {selectedScoreDetail.unavailableMetrics?.length > 0 && (
              <div className="pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Unavailable Metrics (Weight safely redistributed)
                </h4>
                <ul className="text-xs text-slate-500 list-disc list-inside space-y-0.5">
                  {selectedScoreDetail.unavailableMetrics.map((um, i) => (
                    <li key={i}>{um}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 text-right">
              <button
                onClick={() => setSelectedScoreDetail(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Set / Edit Incentive Amount (CEO/Admin Only) */}
      {incentiveModalEmployee && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveIncentive}
            className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Award Performance Incentive</h3>
                <p className="text-xs text-slate-500">{incentiveModalEmployee.employeeName}</p>
              </div>
              <button
                type="button"
                onClick={() => setIncentiveModalEmployee(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-400">Monthly Score:</span>{' '}
                <span className="font-bold text-slate-800">{incentiveModalEmployee.score}/100</span>
              </div>
              <div>
                <span className="text-slate-400">Grade:</span>{' '}
                <span className="font-bold text-[#8b182b]">{incentiveModalEmployee.grade || 'N/A'}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Incentive Amount (₹ INR) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">₹</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  placeholder="e.g. 5000"
                  value={incentiveAmount}
                  onChange={(e) => setIncentiveAmount(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8b182b]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reason / Benchmark Description *</label>
              <input
                type="text"
                required
                value={incentiveReason}
                onChange={(e) => setIncentiveReason(e.target.value)}
                placeholder="e.g. Exceeded Q4 Sales Conversion Target"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8b182b]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">CEO Notes (Optional)</label>
              <textarea
                rows={2}
                value={incentiveNotes}
                onChange={(e) => setIncentiveNotes(e.target.value)}
                placeholder="Optional administrative feedback or notes"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8b182b]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIncentiveModalEmployee(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={setIncentiveMutation.isPending}
                className="px-4 py-1.5 text-xs font-semibold bg-[#8b182b] text-white hover:bg-[#6e1322] rounded-lg shadow-sm transition"
              >
                {setIncentiveMutation.isPending ? 'Saving...' : 'Submit Incentive'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: Approve / Reject Decision */}
      {approvalModalItem && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <form
            onSubmit={handleStatusSubmit}
            className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {actionType === 'APPROVE' ? 'Approve Incentive Award' : 'Reject Incentive Award'}
              </h3>
              <button
                type="button"
                onClick={() => setApprovalModalItem(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="text-sm text-slate-700">
              Are you sure you want to {actionType.toLowerCase()} an incentive of{' '}
              <strong className="text-slate-900">₹{approvalModalItem.amount.toLocaleString('en-IN')}</strong> for{' '}
              <strong>
                {approvalModalItem.employee.firstName} {approvalModalItem.employee.lastName}
              </strong>
              ?
            </div>

            {actionType === 'REJECT' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Rejection *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Provide reason for rejection..."
                  value={rejectionReasonInput}
                  onChange={(e) => setRejectionReasonInput(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setApprovalModalItem(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updateStatusMutation.isPending}
                className={`px-4 py-1.5 text-xs font-semibold text-white rounded-lg shadow-sm transition ${
                  actionType === 'APPROVE' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {updateStatusMutation.isPending ? 'Processing...' : `Confirm ${actionType}`}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 4: Payout Processing (Accountant) */}
      {payoutModalItem && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <form
            onSubmit={handlePayoutSubmit}
            className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Process Accounting Payout</h3>
                <p className="text-xs text-slate-500">
                  {payoutModalItem.employee.firstName} {payoutModalItem.employee.lastName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPayoutModalItem(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase">Payout Amount:</span>
              <span className="text-2xl font-bold text-slate-900">
                ₹{payoutModalItem.amount.toLocaleString('en-IN')}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
              <select
                aria-label="Payment method"
                value={payoutMethod}
                onChange={(e) => setPayoutMethod(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8b182b]"
              >
                <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS/IMPS)</option>
                <option value="CHEQUE">Cheque</option>
                <option value="UPI">UPI</option>
                <option value="CASH">Cash</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">UTR / Cheque / Bank Reference</label>
              <input
                type="text"
                placeholder="e.g. UTR12349876"
                value={payoutReference}
                onChange={(e) => setPayoutReference(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8b182b]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPayoutModalItem(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={processPayoutMutation.isPending}
                className="px-4 py-1.5 text-xs font-semibold bg-[#8b182b] text-white hover:bg-[#6e1322] rounded-lg shadow-sm transition"
              >
                {processPayoutMutation.isPending ? 'Executing Payment...' : 'Record Payment & Close Liability'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
