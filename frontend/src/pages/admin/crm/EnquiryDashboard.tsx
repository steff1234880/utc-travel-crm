import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Filter, RefreshCcw, Calendar, Phone, Trash2, AlertCircle, CheckCircle2, X, UserCheck, Inbox, ChevronDown, Check } from 'lucide-react';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import EnquiryAssignmentModal from '../../../components/admin/crm/EnquiryAssignmentModal';

const STATUS_COLORS: Record<string, string> = {
  'NEW': 'bg-blue-100 text-blue-800 border-blue-200',
  'CONTACTED': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'FOLLOW_UP': 'bg-orange-100 text-orange-800 border-orange-200',
  'REQUIREMENT_COLLECTION': 'bg-purple-100 text-purple-800 border-purple-200',
  'QUOTATION_PREPARATION': 'bg-indigo-100 text-indigo-800 border-indigo-200',
  'QUOTATION_SENT': 'bg-cyan-100 text-cyan-800 border-cyan-200',
  'CONVERTED': 'bg-green-100 text-green-800 border-green-200',
  'LOST': 'bg-red-100 text-red-800 border-red-200',
  'CLOSED': 'bg-slate-100 text-slate-800 border-slate-200',
};

type StatsData = {
  total: number;
  newEnquiries: number;
  pendingFollowUps: number;
  converted: number;
  conversionRate: string;
  unassignedCount?: number;
};

type Enquiry = {
  id: string;
  referenceNumber: string;
  source: string;
  status: string;
  createdAt: string;
  destination?: string;
  travelDate?: string;
  travellerCount?: number;
  budgetRange?: string;
  customer: { firstName: string; lastName?: string; email: string; phone?: string };
  package?: { title: string; slug: string } | null;
  assignments?: Array<{
    id: string;
    employee: { id: string; firstName: string; lastName: string };
  }>;
  salesLead?: {
    id: string;
    assignedToId?: string | null;
    assignmentType?: string | null;
    assignedTo?: { id: string; firstName: string; lastName: string } | null;
  } | null;
};

type EmployeeOption = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  roleName?: string;
  designationName?: string;
  status?: string;
  isActive?: boolean;
};

export default function EnquiryDashboard() {
  const queryClient = useQueryClient();
  const { hasRole, hasPermission } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'unassigned'>('all');
  const [page, setPage] = useState(1);

  // New Filters: Assigned To & Date Range
  const [assignedToFilter, setAssignedToFilter] = useState<string>(''); // employeeId or ''
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);
  const employeeDropdownRef = useRef<HTMLDivElement>(null);

  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // Close employee dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (employeeDropdownRef.current && !employeeDropdownRef.current.contains(event.target as Node)) {
        setIsEmployeeDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch active sales employees / staff
  const { data: staffList = [] } = useQuery<EmployeeOption[]>({
    queryKey: ['enquiry-staff-list'],
    queryFn: async () => {
      try {
        const res = await api.get('/enquiries/staff');
        if (res.data?.success && Array.isArray(res.data.data)) {
          return res.data.data;
        }
      } catch (err) {
        console.warn('Falling back to /crm/leads/assignment/overview for staff list:', err);
      }
      try {
        const fallbackRes = await api.get('/crm/leads/assignment/overview');
        if (fallbackRes.data?.success && Array.isArray(fallbackRes.data.data?.executives)) {
          return fallbackRes.data.data.executives;
        }
      } catch (e) {
        console.warn('Fallback to /crm/leads/assignment/overview failed:', e);
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Assign modal state
  const [assigningEnquiry, setAssigningEnquiry] = useState<Enquiry | null>(null);

  // Delete modal & feedback states
  const [deleteTarget, setDeleteTarget] = useState<Enquiry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const canManageAssignments =
    hasRole(['CEO / Super Admin', 'SUPER_ADMIN', 'CEO', 'Admin', 'ADMIN', 'Sales Manager', 'SALES_MANAGER']) ||
    hasPermission('enquiries:manage') ||
    hasPermission('sales_crm:manage');

  const { data: stats } = useQuery<StatsData>({
    queryKey: ['enquiry-stats'],
    queryFn: async () => {
      const res = await api.get('/enquiries/stats');
      return res.data.data;
    },
  });

  const { data: enquiryData, isLoading, isError, refetch } = useQuery<{ data: Enquiry[]; pagination: { total: number; pages: number } }>({
    queryKey: ['enquiries', page, searchTerm, statusFilter, activeTab, assignedToFilter, fromDate, toDate],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (searchTerm) params.set('search', searchTerm);
      if (statusFilter) params.set('status', statusFilter);
      if (activeTab === 'unassigned') params.set('unassigned', 'true');
      if (assignedToFilter) params.set('assignedTo', assignedToFilter);
      if (fromDate) params.set('fromDate', fromDate);
      if (toDate) params.set('toDate', toDate);
      const res = await api.get(`/enquiries?${params}`);
      return res.data;
    },
  });

  const enquiries = enquiryData?.data ?? [];
  const pagination = enquiryData?.pagination;

  // Selected employee object
  const selectedEmployee = staffList.find(e => e.id === assignedToFilter);

  // Filtered employees for dropdown
  const filteredStaff = staffList.filter(e => {
    const fullName = `${e.firstName} ${e.lastName}`.toLowerCase();
    const query = employeeSearchTerm.toLowerCase();
    return fullName.includes(query) || (e.roleName && e.roleName.toLowerCase().includes(query));
  });

  // Quick preset helper for Today in Asia/Kolkata
  const handleSelectToday = () => {
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    setFromDate(todayStr);
    setToDate(todayStr);
    setPage(1);
  };

  const handleClearDateRange = () => {
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  const handleClearEmployee = () => {
    setAssignedToFilter('');
    setEmployeeSearchTerm('');
    setPage(1);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await api.delete(`/enquiries/${deleteTarget.id}`);
      if (res.data.success) {
        setFeedback({ type: 'success', message: 'Enquiry deleted successfully.' });
        setDeleteTarget(null);
        refetch();
        queryClient.invalidateQueries({ queryKey: ['enquiry-stats'] });
      } else {
        setDeleteError(res.data.message || 'Failed to delete enquiry.');
      }
    } catch (err: any) {
      console.error('Delete enquiry error:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to delete enquiry. Please try again.';
      setDeleteError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const getAssigneeInfo = (enq: Enquiry) => {
    if (enq.assignments && enq.assignments.length > 0 && enq.assignments[0].employee) {
      return {
        isAssigned: true,
        employee: enq.assignments[0].employee,
        source: 'Enquiry Assignment'
      };
    }
    if (enq.salesLead?.assignedTo) {
      return {
        isAssigned: true,
        employee: enq.salesLead.assignedTo,
        source: enq.salesLead.assignmentType === 'AUTO' ? 'Auto-Assigned' : 'Manual Lead'
      };
    }
    return {
      isAssigned: false,
      employee: null,
      source: 'Unassigned'
    };
  };

  return (
    <div className="p-4 sm:p-6 w-full min-w-0 max-w-7xl mx-auto">
      {/* Feedback Alert */}
      {feedback && (
        <div className={`mb-6 p-4 rounded-xl flex items-center justify-between shadow-sm border ${
          feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          <div className="flex items-center space-x-2">
            {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-rose-600" />}
            <span className="font-medium text-sm">{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Enquiries</h1>
          <p className="text-slate-500 mt-1">Manage leads, track statuses, and schedule follow-ups.</p>
        </div>
        <div className="flex space-x-3">
          <button onClick={() => refetch()} className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 font-medium flex items-center shadow-sm">
            <RefreshCcw className="w-4 h-4 mr-2" /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 mb-8">
        {[
          { label: 'Total Enquiries', value: stats ? String(stats.total) : '…', color: 'text-slate-900' },
          { label: 'New Today', value: stats ? String(stats.newEnquiries) : '…', color: 'text-blue-600' },
          { label: 'Pending Follow-ups', value: stats ? String(stats.pendingFollowUps) : '…', color: 'text-amber-600' },
          { label: 'Conversion Rate', value: stats ? `${stats.conversionRate}%` : '…', color: 'text-emerald-600' },
          ...(canManageAssignments
            ? [{ label: 'Unassigned Queue', value: stats?.unassignedCount !== undefined ? String(stats.unassignedCount) : '…', color: 'text-rose-600' }]
            : []),
        ].map((kpi, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{kpi.label}</p>
            <h3 className={`text-2xl font-black ${kpi.color}`}>{kpi.value}</h3>
          </div>
        ))}
      </div>

      {/* Tabs for All vs Unassigned */}
      {canManageAssignments && (
        <div className="flex border-b border-slate-200 mb-6 gap-6">
          <button
            onClick={() => { setActiveTab('all'); setPage(1); }}
            className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'all'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <span>All Enquiries</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
              {stats?.total ?? 0}
            </span>
          </button>
          <button
            onClick={() => { setActiveTab('unassigned'); setPage(1); }}
            className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'unassigned'
                ? 'border-rose-600 text-rose-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Inbox className="w-4 h-4" />
            <span>Unassigned Queue</span>
            {stats?.unassignedCount !== undefined && stats.unassignedCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
                {stats.unassignedCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center gap-3 bg-slate-50">
          {/* Keyword Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search name, ref, phone, email…"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">All Statuses</option>
            <option value="NEW">New</option>
            <option value="CONTACTED">Contacted</option>
            <option value="FOLLOW_UP">Follow-up Required</option>
            <option value="QUOTATION_SENT">Quotation Sent</option>
            <option value="CONVERTED">Converted</option>
            <option value="LOST">Lost</option>
          </select>

          {/* 1. ASSIGNED TO FILTER (Searchable Dropdown) */}
          <div className="relative" ref={employeeDropdownRef}>
            <button
              type="button"
              onClick={() => setIsEmployeeDropdownOpen(!isEmployeeDropdownOpen)}
              className={`flex items-center justify-between gap-2 border rounded-lg px-3 py-2 text-sm bg-white transition-colors min-w-[200px] text-left ${
                assignedToFilter
                  ? 'border-blue-500 text-blue-900 font-semibold ring-1 ring-blue-500 bg-blue-50/40'
                  : 'border-slate-200 text-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <UserCheck className={`w-4 h-4 shrink-0 ${assignedToFilter ? 'text-blue-600' : 'text-slate-400'}`} />
                <span className="truncate">
                  {selectedEmployee
                    ? `${selectedEmployee.firstName} ${selectedEmployee.lastName}${selectedEmployee.isActive === false || selectedEmployee.status !== 'ACTIVE' ? ' (Inactive)' : ''}`
                    : 'Assigned To: All'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {assignedToFilter && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClearEmployee();
                    }}
                    className="p-0.5 hover:bg-blue-100 rounded text-slate-400 hover:text-slate-700"
                    title="Clear assigned employee"
                  >
                    <X className="w-3.5 h-3.5" />
                  </span>
                )}
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </div>
            </button>

            {isEmployeeDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-72 bg-white rounded-xl shadow-xl border border-slate-200 z-50 p-2 text-sm">
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search employee..."
                    value={employeeSearchTerm}
                    onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                    autoFocus
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="max-h-56 overflow-y-auto divide-y divide-slate-50">
                  <button
                    type="button"
                    onClick={() => {
                      setAssignedToFilter('');
                      setIsEmployeeDropdownOpen(false);
                      setPage(1);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between hover:bg-slate-50 ${
                      !assignedToFilter ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-700'
                    }`}
                  >
                    <span>All Employees</span>
                    {!assignedToFilter && <Check className="w-3.5 h-3.5 text-blue-600" />}
                  </button>

                  {filteredStaff.length === 0 ? (
                    <div className="py-3 text-center text-xs text-slate-400">No employees found</div>
                  ) : (
                    filteredStaff.map((emp) => {
                      const isSelected = assignedToFilter === emp.id;
                      const isInactive = emp.isActive === false || emp.status !== 'ACTIVE';
                      return (
                        <button
                          key={emp.id}
                          type="button"
                          onClick={() => {
                            setAssignedToFilter(emp.id);
                            setIsEmployeeDropdownOpen(false);
                            setPage(1);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between hover:bg-slate-50 ${
                            isSelected ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-700'
                          }`}
                        >
                          <div className="truncate pr-2">
                            <div className="font-medium text-slate-900 flex items-center gap-1.5">
                              <span>{emp.firstName} {emp.lastName}</span>
                              {isInactive && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                                  (Inactive)
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">{emp.roleName || emp.designationName || 'Sales Executive'}</div>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 2. DATE RANGE FILTER (From Date, To Date & Presets) */}
          <div className="flex flex-wrap items-center gap-2 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="font-semibold text-slate-500">From:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(1);
                }}
                className="border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700"
              />
            </div>
            <span className="text-slate-400 text-xs">to</span>
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="font-semibold text-slate-500">To:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(1);
                }}
                className="border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700"
              />
            </div>

            <button
              type="button"
              onClick={handleSelectToday}
              className="px-2 py-1 text-xs font-semibold rounded bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 transition-colors border border-slate-200"
              title="Select today"
            >
              Today
            </button>

            {(fromDate || toDate) && (
              <button
                type="button"
                onClick={handleClearDateRange}
                className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors"
                title="Clear date filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Total Matching Results Badge */}
          <div className="ml-auto flex items-center gap-2">
            {(assignedToFilter || fromDate || toDate || statusFilter || searchTerm) && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('');
                  setAssignedToFilter('');
                  setFromDate('');
                  setToDate('');
                  setPage(1);
                }}
                className="text-xs font-medium text-slate-500 hover:text-rose-600 underline underline-offset-2"
              >
                Reset All Filters
              </button>
            )}
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
              {pagination ? `${pagination.total} matching` : 'Loading…'}
            </span>
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-24 text-slate-400">Loading enquiries from database…</div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-24 text-red-500">
            <p className="font-bold mb-2">Could not connect to the API.</p>
            <p className="text-sm text-slate-500">Ensure the backend server is running on port 5000.</p>
          </div>
        ) : enquiries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-2">
            <Inbox className="w-8 h-8 text-slate-300" />
            <span>{activeTab === 'unassigned' ? 'No unassigned enquiries in the queue.' : 'No enquiries found.'}</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100">
                  <th className="px-6 py-4 font-medium">Reference</th>
                  <th className="px-6 py-4 font-medium">Customer</th>
                  <th className="px-6 py-4 font-medium">Interest</th>
                  <th className="px-6 py-4 font-medium">Assigned To</th>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {enquiries.map((enq) => {
                  const assignee = getAssigneeInfo(enq);
                  return (
                    <tr key={enq.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-slate-900">{enq.referenceNumber}</span>
                        <div className="mt-1">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            enq.source.includes('WhatsApp')
                              ? enq.source.includes('Organic')
                                ? 'bg-slate-100 text-slate-700'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-50 text-slate-600'
                          }`}>
                            {enq.source.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-slate-900 block">{enq.customer.firstName} {enq.customer.lastName ?? ''}</span>
                        <span className="text-xs text-slate-500 flex items-center mt-1"><Phone className="w-3 h-3 mr-1" />{enq.customer.phone ?? 'N/A'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-700 block max-w-[180px] truncate">{enq.package?.title ?? enq.destination ?? '—'}</span>
                        {enq.budgetRange && <span className="text-xs text-slate-500">Budget: {enq.budgetRange}</span>}
                      </td>
                      <td className="px-6 py-4">
                        {assignee.isAssigned && assignee.employee ? (
                          <div>
                            <span className="text-xs font-bold text-slate-800 block">
                              {assignee.employee.firstName} {assignee.employee.lastName}
                            </span>
                            <span className="inline-block mt-0.5 px-2 py-0.2 rounded text-[10px] font-semibold bg-blue-50 text-blue-700">
                              {assignee.source}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-600 flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {new Date(enq.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${STATUS_COLORS[enq.status] ?? 'bg-slate-100 text-slate-700'}`}>
                          {enq.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {canManageAssignments && (
                            <button
                              onClick={() => setAssigningEnquiry(enq)}
                              className="text-slate-700 hover:text-blue-600 text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-1"
                              title="Assign / Reassign"
                            >
                              <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                              <span>{assignee.isAssigned ? 'Reassign' : 'Assign'}</span>
                            </button>
                          )}
                          <Link to={`/admin/enquiries/${enq.id}`} className="text-blue-600 hover:text-blue-800 text-sm font-medium px-2 py-1">
                            Details →
                          </Link>
                          {canManageAssignments && (
                            <button
                              onClick={() => { setDeleteTarget(enq); setDeleteError(null); }}
                              className="text-red-600 hover:text-red-800 text-sm font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors flex items-center gap-1"
                              title="Delete Enquiry"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination && (
          <div className="p-4 border-t border-slate-100 flex justify-between items-center text-sm text-slate-500">
            <div>Showing page {page} of {pagination.pages} ({pagination.total} total)</div>
            <div className="flex space-x-1">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40">Prev</button>
              <button disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Enquiry Assignment Modal */}
      {assigningEnquiry && (
        <EnquiryAssignmentModal
          isOpen={!!assigningEnquiry}
          onClose={() => setAssigningEnquiry(null)}
          onSuccess={() => {
            setFeedback({ type: 'success', message: 'Enquiry assigned successfully.' });
            refetch();
            queryClient.invalidateQueries({ queryKey: ['enquiry-stats'] });
          }}
          enquiry={{
            id: assigningEnquiry.id,
            referenceNumber: assigningEnquiry.referenceNumber,
            customer: assigningEnquiry.customer,
            currentAssignee: getAssigneeInfo(assigningEnquiry).employee,
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 flex flex-col">
            <div className="flex items-center space-x-3 mb-4 text-red-600">
              <div className="p-3 bg-red-100 rounded-full">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Delete Enquiry?</h3>
            </div>

            <p className="text-slate-600 text-sm mb-4 leading-relaxed">
              Are you sure you want to delete this enquiry? This action cannot be undone.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600 mb-6 space-y-1">
              <div><span className="font-semibold text-slate-800">Reference:</span> {deleteTarget.referenceNumber}</div>
              <div><span className="font-semibold text-slate-800">Customer:</span> {deleteTarget.customer.firstName} {deleteTarget.customer.lastName || ''}</div>
              <div><span className="font-semibold text-slate-800">Source:</span> {deleteTarget.source}</div>
            </div>

            {deleteError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-start">
                <AlertCircle className="w-4 h-4 mr-2 mt-0.5 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => { setDeleteTarget(null); setDeleteError(null); }}
                className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 font-medium text-sm transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium text-sm shadow-sm transition-colors flex items-center disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

