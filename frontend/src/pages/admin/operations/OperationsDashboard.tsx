import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Compass, 
  Calendar, 
  CheckSquare, 
  Ticket, 
  Building, 
  Search, 
  Filter, 
  Plus, 
  ChevronRight, 
  UserCheck, 
  AlertCircle, 
  Clock, 
  MapPin, 
  Users, 
  RefreshCw,
  ArrowUpDown,
  Briefcase,
  Truck,
  FileText,
  DollarSign,
  ShieldAlert
} from 'lucide-react';
import { operationsService, Tour, CoordinatorEmployee } from '../../../services/operationsService';
import QuickAttendanceWidget from '../../../components/admin/QuickAttendanceWidget';

export default function OperationsDashboard() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<{
    upcomingTours: number;
    ongoingTours: number;
    completedTours: number;
    cancelledTours: number;
    todayDepartures: number;
    upcomingDepartures: number;
    pendingTasks: number;
    pendingTickets: number;
    pendingHotels: number;
    activeVendors?: number;
    pendingTransport?: number;
    documentAlerts?: { expiringSoon: number; expired: number; pendingVerification: number };
    costSummary?: { totalEstimated: number; totalActual: number; totalProfitMargin: number };
  }>({
    upcomingTours: 0,
    ongoingTours: 0,
    completedTours: 0,
    cancelledTours: 0,
    todayDepartures: 0,
    upcomingDepartures: 0,
    pendingTasks: 0,
    pendingTickets: 0,
    pendingHotels: 0,
    activeVendors: 0,
    pendingTransport: 0,
    documentAlerts: { expiringSoon: 0, expired: 0, pendingVerification: 0 },
    costSummary: { totalEstimated: 0, totalActual: 0, totalProfitMargin: 0 },
  });

  const [tours, setTours] = useState<Tour[]>([]);
  const [coordinators, setCoordinators] = useState<CoordinatorEmployee[]>([]);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [destinationFilter, setDestinationFilter] = useState('');
  const [coordinatorFilter, setCoordinatorFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('startDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, limit: 10, totalPages: 1 });

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await operationsService.getDashboardStats({
        search,
        status: statusFilter,
        destination: destinationFilter,
        coordinatorId: coordinatorFilter,
        dateFrom,
        dateTo,
        sortBy,
        sortOrder,
        page,
        limit: 10,
      });

      setSummary(data.summary);
      setTours(data.tours);
      setPagination(data.pagination);
    } catch (err: any) {
      console.error('Error loading operations dashboard:', err);
      setError('Failed to load operations dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchCoordinatorsList = async () => {
      try {
        const coords = await operationsService.getCoordinators();
        setCoordinators(coords);
      } catch (err) {
        console.error('Failed to load coordinators list', err);
      }
    };
    fetchCoordinatorsList();
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [search, statusFilter, destinationFilter, coordinatorFilter, dateFrom, dateTo, sortBy, sortOrder, page]);

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Ongoing':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Confirmed':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Upcoming':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'Preparation':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Completed':
        return 'bg-slate-100 text-slate-800 border-slate-300';
      case 'Cancelled':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'Postponed':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-md">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Operations Dashboard</h1>
              <p className="text-sm font-medium text-slate-500 mt-0.5">Real-time overview of active tours, departures, tasks & reservations</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchDashboardData()}
            className="flex items-center px-4 py-2.5 bg-white text-slate-700 font-medium rounded-xl border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <Link
            to="/admin/operations/tours"
            className="flex items-center px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-xl shadow-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5 mr-1.5" />
            Create Tour
          </Link>
        </div>
      </div>

      {/* Employee Attendance Check-In / Check-Out Controls */}
      <QuickAttendanceWidget variant="card" />

      {/* Dashboard KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Upcoming Tours</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-slate-900">{summary.upcomingTours}</span>
            <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">Confirmed/Prep</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ongoing Tours</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Compass className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-emerald-600">{summary.ongoingTours}</span>
            <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">Live on field</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Today's Departures</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-blue-600">{summary.todayDepartures}</span>
            <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full">Starting today</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Operational Tasks</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <CheckSquare className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-amber-600">{summary.pendingTasks}</span>
            <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">Action items</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Ticket Bookings</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
              <Ticket className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-rose-600">{summary.pendingTickets}</span>
            <span className="text-xs font-medium text-rose-700 bg-rose-50 px-2 py-1 rounded-full">Flight/Train/Bus</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Hotel Reservations</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <Building className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-purple-600">{summary.pendingHotels}</span>
            <Link to="/admin/operations/hotels" className="text-xs font-semibold text-purple-600 hover:underline flex items-center">
              View Hotels <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </Link>
          </div>
        </div>

        {/* Part 2 Metric Cards */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Vendors</span>
            <div className="p-2 bg-cyan-50 text-cyan-600 rounded-lg">
              <Briefcase className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-cyan-700">{summary.activeVendors || 0}</span>
            <Link to="/admin/operations/vendors" className="text-xs font-semibold text-cyan-600 hover:underline flex items-center">
              Manage Vendors <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </Link>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Transport</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-amber-700">{summary.pendingTransport || 0}</span>
            <Link to="/admin/operations/transport" className="text-xs font-semibold text-amber-600 hover:underline flex items-center">
              Transfers <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </Link>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Document Alerts</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-black text-rose-600">{summary.documentAlerts?.expiringSoon || 0}</span>
              <span className="text-xs text-slate-500 ml-1">expiring</span>
              {(summary.documentAlerts?.pendingVerification || 0) > 0 && (
                <span className="ml-2 text-xs font-semibold text-amber-600">({summary.documentAlerts?.pendingVerification} pending)</span>
              )}
            </div>
            <Link to="/admin/operations/documents" className="text-xs font-semibold text-rose-600 hover:underline flex items-center">
              Vault <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </Link>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Operational Costs (Actual)</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-700">₹{(summary.costSummary?.totalActual || 0).toLocaleString('en-IN')}</span>
            <Link to="/admin/operations/costs" className="text-xs font-semibold text-emerald-600 hover:underline flex items-center">
              Cost Tracker <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main Tour Operations Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
        {/* Filters Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50/50 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search tour ref, customer, destination, booking ref..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Tour Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              >
                <option value="ALL">All Statuses</option>
                <option value="Upcoming">Upcoming</option>
                <option value="Preparation">Preparation</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Ongoing">Ongoing</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Postponed">Postponed</option>
              </select>

              {/* Coordinator Filter */}
              <select
                value={coordinatorFilter}
                onChange={(e) => { setCoordinatorFilter(e.target.value); setPage(1); }}
                className="px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              >
                <option value="">All Coordinators</option>
                {coordinators.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName} ({c.employeeId})
                  </option>
                ))}
              </select>

              {/* Sort selector */}
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="flex items-center px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100 shadow-sm"
                title="Toggle sort order"
              >
                <ArrowUpDown className="w-4 h-4 mr-1.5 text-slate-500" />
                {sortOrder.toUpperCase()}
              </button>
            </div>
          </div>

          {/* Date & Destination Filters Row */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600">
            <div className="flex items-center space-x-2">
              <span className="text-slate-500">Destination:</span>
              <input
                type="text"
                placeholder="Filter destination..."
                value={destinationFilter}
                onChange={(e) => { setDestinationFilter(e.target.value); setPage(1); }}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-slate-500">From:</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-slate-500">To:</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {(search || statusFilter !== 'ALL' || destinationFilter || coordinatorFilter || dateFrom || dateTo) && (
              <button
                onClick={() => {
                  setSearch('');
                  setStatusFilter('ALL');
                  setDestinationFilter('');
                  setCoordinatorFilter('');
                  setDateFrom('');
                  setDateTo('');
                  setPage(1);
                }}
                className="text-blue-600 hover:underline font-semibold ml-auto"
              >
                Clear all filters
              </button>
            )}
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-6 m-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center">
            <AlertCircle className="w-5 h-5 mr-3 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="p-16 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-500">Loading tour operations data...</p>
          </div>
        ) : tours.length === 0 ? (
          /* Empty State */
          <div className="p-16 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
              <Compass className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">No Tours Found</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                No active or upcoming tour records match your current filters. Click below to create a new operational tour.
              </p>
            </div>
            <Link
              to="/admin/operations/tours"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-semibold rounded-xl text-sm shadow hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Create Tour
            </Link>
          </div>
        ) : (
          /* Tours Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px] tracking-wider">
                  <th className="py-3.5 px-4">Tour Reference</th>
                  <th className="py-3.5 px-4">Booking Ref</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Destination</th>
                  <th className="py-3.5 px-4">Travel Dates</th>
                  <th className="py-3.5 px-4 text-center">Travellers</th>
                  <th className="py-3.5 px-4">Coordinator</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {tours.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <Link to={`/admin/operations/tours/${t.id}`} className="text-blue-600 hover:underline">
                        {t.tourReference}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono text-xs">
                      {t.bookingPrep?.bookingRef || '-'}
                    </td>
                    <td className="py-3.5 px-4">
                      {t.customer ? (
                        <div>
                          <div className="font-semibold text-slate-900">{t.customer.firstName} {t.customer.lastName || ''}</div>
                          <div className="text-xs text-slate-400">{t.customer.email}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400">N/A</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      <span className="inline-flex items-center">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 mr-1" />
                        {t.destination}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      <div>{new Date(t.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                      <div className="text-slate-400">to {new Date(t.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-900">
                      <span className="inline-flex items-center px-2.5 py-1 bg-slate-100 rounded-lg">
                        <Users className="w-3.5 h-3.5 mr-1 text-slate-500" />
                        {t.travellerCount}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {t.coordinator ? (
                        <span className="inline-flex items-center text-xs font-semibold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
                          <UserCheck className="w-3.5 h-3.5 mr-1 text-blue-600" />
                          {t.coordinator.firstName} {t.coordinator.lastName}
                        </span>
                      ) : (
                        <span className="text-xs text-amber-600 font-semibold bg-amber-50 px-2 py-1 rounded-lg">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusBadgeClass(t.status)}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        to={`/admin/operations/tours/${t.id}`}
                        className="inline-flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 font-semibold text-xs rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        View & Manage <ChevronRight className="w-3.5 h-3.5 ml-1" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {!loading && tours.length > 0 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs font-medium text-slate-600">
            <div>
              Showing <span className="font-bold text-slate-900">{(page - 1) * pagination.limit + 1}</span> to{' '}
              <span className="font-bold text-slate-900">{Math.min(page * pagination.limit, pagination.total)}</span> of{' '}
              <span className="font-bold text-slate-900">{pagination.total}</span> tours
            </div>

            <div className="flex items-center space-x-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 disabled:opacity-40 hover:bg-slate-100 transition-colors"
              >
                Previous
              </button>
              <span className="px-2 font-bold text-slate-800">
                Page {page} of {pagination.totalPages}
              </span>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 disabled:opacity-40 hover:bg-slate-100 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
