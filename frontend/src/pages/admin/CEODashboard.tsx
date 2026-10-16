import React, { useState, useEffect } from 'react';
import {
  TrendingUp, TrendingDown, Users, Package, Calendar, DollarSign,
  Briefcase, CheckCircle, Clock, AlertTriangle, FileText, Download,
  Filter, RefreshCw, Layers, Compass, ArrowUpRight, BarChart3, XCircle,
  Activity, MapPin, UserCheck, PhoneCall, Ban, EyeOff, Award, Building, Bus, Plane
} from 'lucide-react';
import api from '../../services/api';

// Metric Card Component
const MetricCard = ({
  title,
  value,
  previousValue,
  changePercentage,
  hasComparison,
  icon: Icon,
  formatAsCurrency = false,
  color = 'blue'
}: any) => {
  const isPositive = changePercentage !== null && changePercentage >= 0;

  const colorStyles: Record<string, { bg: string; text: string; iconBg: string }> = {
    blue: { bg: 'bg-blue-50/50 border-blue-100', text: 'text-blue-600', iconBg: 'bg-blue-100 text-blue-600' },
    emerald: { bg: 'bg-emerald-50/50 border-emerald-100', text: 'text-emerald-600', iconBg: 'bg-emerald-100 text-emerald-600' },
    amber: { bg: 'bg-amber-50/50 border-amber-100', text: 'text-amber-600', iconBg: 'bg-amber-100 text-amber-600' },
    rose: { bg: 'bg-rose-50/50 border-rose-100', text: 'text-rose-600', iconBg: 'bg-rose-100 text-rose-600' },
    indigo: { bg: 'bg-indigo-50/50 border-indigo-100', text: 'text-indigo-600', iconBg: 'bg-indigo-100 text-indigo-600' },
    purple: { bg: 'bg-purple-50/50 border-purple-100', text: 'text-purple-600', iconBg: 'bg-purple-100 text-purple-600' },
    slate: { bg: 'bg-slate-50/50 border-slate-200', text: 'text-slate-600', iconBg: 'bg-slate-100 text-slate-600' },
  };

  const currentStyle = colorStyles[color] || colorStyles.blue;

  return (
    <div className={`p-5 rounded-2xl border ${currentStyle.bg} bg-white shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between`}>
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</span>
          <div className={`p-2 rounded-xl ${currentStyle.iconBg}`}>
            <Icon className="w-4 h-4" />
          </div>
        </div>

        <div className="flex items-baseline justify-between">
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">
            {formatAsCurrency ? `₹${Number(value || 0).toLocaleString('en-IN')}` : Number(value || 0).toLocaleString()}
          </h3>

          {hasComparison && changePercentage !== null ? (
            <div className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-md ${isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
              {isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
              {Math.abs(changePercentage)}%
            </div>
          ) : (
            <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded">N/A</span>
          )}
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100 text-xs flex items-center justify-between text-slate-500">
        <span>Prev Period</span>
        {hasComparison && previousValue !== null && previousValue !== undefined ? (
          <span className="font-semibold text-slate-700">
            {formatAsCurrency ? `₹${Number(previousValue).toLocaleString('en-IN')}` : Number(previousValue).toLocaleString()}
          </span>
        ) : (
          <span className="text-slate-400 italic">No comparison data</span>
        )}
      </div>
    </div>
  );
};

export default function CEODashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'sales' | 'packages' | 'financials' | 'employees' | 'operations'>('overview');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [period, setPeriod] = useState<string>('this_month');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [selectedPackage, setSelectedPackage] = useState<string>('');
  const [selectedDestination, setSelectedDestination] = useState<string>('');
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [selectedCoordinator, setSelectedCoordinator] = useState<string>('');
  const [selectedTourStatus, setSelectedTourStatus] = useState<string>('');
  const [selectedGroupTour, setSelectedGroupTour] = useState<string>('');

  // Options State
  const [filterOptions, setFilterOptions] = useState<any>({ employees: [], coordinators: [], packages: [], groupTours: [], destinations: [], sources: [], tourStatuses: [] });

  // Data States
  const [overviewData, setOverviewData] = useState<any>(null);
  const [salesData, setSalesData] = useState<any>(null);
  const [packageData, setPackageData] = useState<any>(null);
  const [financialData, setFinancialData] = useState<any>(null);
  const [employeeData, setEmployeeData] = useState<any>(null);
  const [operationsData, setOperationsData] = useState<any>(null);

  // Fetch Filter Options once
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const res = await api.get('/analytics/filters');
        if (res.data.success) {
          setFilterOptions(res.data.data);
        }
      } catch (err) {
        console.error('Error fetching filter options:', err);
      }
    };
    fetchFilters();
  }, []);

  // Main Data Fetcher
  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('period', period);
      if (period === 'custom' && customStartDate && customEndDate) {
        queryParams.append('startDate', customStartDate);
        queryParams.append('endDate', customEndDate);
      }
      if (selectedPackage) queryParams.append('packageId', selectedPackage);
      if (selectedDestination) queryParams.append('destination', selectedDestination);
      if (selectedSource) queryParams.append('source', selectedSource);
      if (selectedCoordinator) queryParams.append('coordinatorId', selectedCoordinator);
      if (selectedTourStatus) queryParams.append('tourStatus', selectedTourStatus);
      if (selectedGroupTour) queryParams.append('groupTourId', selectedGroupTour);

      const queryString = queryParams.toString();

      // Parallel data fetching for instant executive dashboard load
      const [overviewRes, salesRes, pkgRes, finRes, empRes, opsRes] = await Promise.all([
        api.get(`/analytics/overview?${queryString}`),
        api.get(`/analytics/sales?${queryString}`),
        api.get(`/analytics/packages?${queryString}`),
        api.get(`/analytics/financials?${queryString}`),
        api.get(`/analytics/employees?${queryString}`),
        api.get(`/analytics/operations?${queryString}`),
      ]);

      setOverviewData(overviewRes.data?.data);
      setSalesData(salesRes.data?.data);
      setPackageData(pkgRes.data?.data);
      setFinancialData(finRes.data?.data);
      setEmployeeData(empRes.data?.data);
      setOperationsData(opsRes.data?.data);
    } catch (err: any) {
      console.error('Error loading CEO dashboard:', err);
      setError(err.response?.data?.message || 'Failed to load CEO dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [period, selectedPackage, selectedDestination, selectedSource, selectedCoordinator, selectedTourStatus, selectedGroupTour]);

  const handleExportCSV = async () => {
    try {
      const res = await api.get(`/analytics/export?module=${activeTab}&period=${period}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `utc_ceo_${activeTab}_export.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('CSV Export failed:', err);
      alert('CSV Export failed. Please try again.');
    }
  };

  const summary = overviewData?.summary || {};
  const comparisons = overviewData?.comparisons || {};

  // Safe Gross Margin calculation for Financial Health section
  const grossMarginText = summary.totalRevenue && summary.totalRevenue > 0
    ? `${((summary.netProfit / summary.totalRevenue) * 100).toFixed(1)}%`
    : 'N/A (No revenue data)';

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">CEO Executive Dashboard</h1>
            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-1 rounded-full uppercase">Real Database Data</span>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Centralized Business Overview, Financial Performance, Sales & Operations Analytics
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDashboardData}
            className="flex items-center px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 transition-colors shadow-sm text-sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center px-4 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-sm text-sm"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Report (CSV)
          </button>
        </div>
      </div>

      {/* Global Filter Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
            <Filter className="w-4 h-4 text-blue-600" />
            Global Dashboard Filters
          </div>
          <span className="text-xs text-slate-400">Filters affect all period-based metrics dynamically</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4">
          {/* Period Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Time Period</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="today">Today</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="previous_month">Previous Month</option>
              <option value="this_year">This Year</option>
              <option value="previous_year">Previous Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Package Filter (for non-operations tabs) */}
          {activeTab !== 'operations' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Package</label>
              <select
                value={selectedPackage}
                onChange={(e) => setSelectedPackage(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Packages</option>
                {filterOptions.packages?.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Coordinator</label>
              <select
                value={selectedCoordinator}
                onChange={(e) => setSelectedCoordinator(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Coordinators</option>
                {filterOptions.coordinators?.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Destination Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Destination</label>
            <select
              value={selectedDestination}
              onChange={(e) => setSelectedDestination(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Destinations</option>
              {filterOptions.destinations?.map((d: any) => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Group Tour Filter (for Operations tab) */}
          {activeTab === 'operations' && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Group Tour</label>
              <select
                value={selectedGroupTour}
                onChange={(e) => setSelectedGroupTour(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Group Tours</option>
                {filterOptions.groupTours?.map((gt: any) => (
                  <option key={gt.id} value={gt.id}>{gt.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Source Filter (for non-operations tabs) OR Tour Status Filter (for operations tab) */}
          {activeTab !== 'operations' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Enquiry Source</label>
              <select
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Sources</option>
                {filterOptions.sources?.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Tour Status</label>
              <select
                value={selectedTourStatus}
                onChange={(e) => setSelectedTourStatus(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                {filterOptions.tourStatuses?.map((s: string) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}

          {/* Reset Filters */}
          <div className="flex items-end">
            <button
              onClick={() => {
                setPeriod('this_month');
                setSelectedPackage('');
                setSelectedDestination('');
                setSelectedSource('');
                setSelectedCoordinator('');
                setSelectedTourStatus('');
                setSelectedGroupTour('');
              }}
              className="w-full bg-slate-100 text-slate-700 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-slate-200 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 space-x-2 overflow-x-auto">
        {[
          { id: 'overview', label: 'Business Overview', icon: Layers },
          { id: 'sales', label: 'Sales Analytics', icon: BarChart3 },
          { id: 'packages', label: 'Package Analytics', icon: Package },
          { id: 'financials', label: 'Financial Analytics', icon: DollarSign },
          { id: 'employees', label: 'Employee Analytics', icon: Users },
          { id: 'operations', label: 'Operations Analytics', icon: Compass },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center px-5 py-3 border-b-2 font-bold text-sm transition-colors whitespace-nowrap ${
                isActive
                  ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-xl'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <Icon className={`w-4 h-4 mr-2 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex items-center text-rose-700 text-sm font-medium">
          <AlertTriangle className="w-5 h-5 mr-3 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Loading Overlay */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 text-sm font-medium">Fetching real-time executive metrics...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: BUSINESS OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* OVERVIEW KPI CARDS LAYER (13 Cards Grid) */}
              <div>
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center">
                  <DollarSign className="w-4 h-4 mr-1 text-emerald-600" /> Financial Overview & Balance
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  <MetricCard
                    title="Total Revenue"
                    value={summary.totalRevenue}
                    previousValue={comparisons.revenue?.previousValue}
                    changePercentage={comparisons.revenue?.changePercentage}
                    hasComparison={comparisons.revenue?.hasComparison}
                    icon={DollarSign}
                    formatAsCurrency={true}
                    color="blue"
                  />
                  <MetricCard
                    title="Total Expenses"
                    value={summary.totalExpenses}
                    previousValue={comparisons.expenses?.previousValue}
                    changePercentage={comparisons.expenses?.changePercentage}
                    hasComparison={comparisons.expenses?.hasComparison}
                    icon={TrendingDown}
                    formatAsCurrency={true}
                    color="amber"
                  />
                  <MetricCard
                    title="Net Profit"
                    value={summary.netProfit}
                    previousValue={comparisons.profit?.previousValue}
                    changePercentage={comparisons.profit?.changePercentage}
                    hasComparison={comparisons.profit?.hasComparison}
                    icon={TrendingUp}
                    formatAsCurrency={true}
                    color="emerald"
                  />
                  <MetricCard
                    title="Outstanding Balance"
                    value={summary.outstandingPayments}
                    previousValue={null}
                    changePercentage={null}
                    hasComparison={false}
                    icon={AlertTriangle}
                    formatAsCurrency={true}
                    color="rose"
                  />
                </div>
              </div>

              <div>
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center">
                  <BarChart3 className="w-4 h-4 mr-1 text-indigo-600" /> Sales & Booking Performance
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  <MetricCard
                    title="Total Enquiries"
                    value={summary.totalEnquiries}
                    previousValue={comparisons.enquiries?.previousValue}
                    changePercentage={comparisons.enquiries?.changePercentage}
                    hasComparison={comparisons.enquiries?.hasComparison}
                    icon={Users}
                    color="indigo"
                  />
                  <MetricCard
                    title="Total Bookings"
                    value={summary.totalBookings}
                    previousValue={comparisons.bookings?.previousValue}
                    changePercentage={comparisons.bookings?.changePercentage}
                    hasComparison={comparisons.bookings?.hasComparison}
                    icon={CheckCircle}
                    color="emerald"
                  />
                  <MetricCard
                    title="Confirmed Bookings"
                    value={summary.confirmedBookings}
                    previousValue={null}
                    changePercentage={null}
                    hasComparison={false}
                    icon={CheckCircle}
                    color="blue"
                  />
                  <MetricCard
                    title="Cancelled Bookings"
                    value={summary.cancelledBookings}
                    previousValue={null}
                    changePercentage={null}
                    hasComparison={false}
                    icon={XCircle}
                    color="rose"
                  />
                </div>
              </div>

              <div>
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center">
                  <Compass className="w-4 h-4 mr-1 text-purple-600" /> Operational Tour Status & CRM
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
                  <MetricCard
                    title="Upcoming Tours"
                    value={summary.upcomingTours}
                    previousValue={null}
                    changePercentage={null}
                    hasComparison={false}
                    icon={Calendar}
                    color="purple"
                  />
                  <MetricCard
                    title="Ongoing Tours"
                    value={summary.ongoingTours}
                    previousValue={null}
                    changePercentage={null}
                    hasComparison={false}
                    icon={Clock}
                    color="emerald"
                  />
                  <MetricCard
                    title="Completed Tours"
                    value={summary.completedTours}
                    previousValue={null}
                    changePercentage={null}
                    hasComparison={false}
                    icon={CheckCircle}
                    color="slate"
                  />
                  <MetricCard
                    title="Total Customers"
                    value={summary.totalCustomers}
                    previousValue={null}
                    changePercentage={null}
                    hasComparison={false}
                    icon={Briefcase}
                    color="blue"
                  />
                  <MetricCard
                    title="Pending Quotations"
                    value={summary.pendingQuotations}
                    previousValue={null}
                    changePercentage={null}
                    hasComparison={false}
                    icon={FileText}
                    color="amber"
                  />
                </div>
              </div>

              {/* LOWER SUMMARY SECTIONS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-200">
                {/* Tour Status Overview */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
                    <span className="flex items-center">
                      <Compass className="w-5 h-5 text-blue-600 mr-2" /> Tour Status Overview
                    </span>
                    <span className="text-xs font-semibold text-slate-400">Live Status</span>
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm font-medium">
                      <span className="text-slate-600">Upcoming Tours</span>
                      <span className="bg-purple-100 text-purple-800 font-bold px-2.5 py-0.5 rounded-full text-xs">{summary.upcomingTours || 0}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-medium">
                      <span className="text-slate-600">Ongoing Tours</span>
                      <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full text-xs">{summary.ongoingTours || 0}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-medium">
                      <span className="text-slate-600">Completed Tours</span>
                      <span className="bg-slate-100 text-slate-800 font-bold px-2.5 py-0.5 rounded-full text-xs">{summary.completedTours || 0}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-medium">
                      <span className="text-slate-600">Cancelled Tours</span>
                      <span className="bg-rose-100 text-rose-800 font-bold px-2.5 py-0.5 rounded-full text-xs">{summary.cancelledBookings || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Sales Pipeline Snapshot */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
                    <span className="flex items-center">
                      <FileText className="w-5 h-5 text-indigo-600 mr-2" /> Sales Pipeline Snapshot
                    </span>
                    <span className="text-xs font-semibold text-slate-400">Current Pipeline</span>
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm font-medium">
                      <span className="text-slate-600">Active Enquiries</span>
                      <span className="font-bold text-slate-900">{summary.totalEnquiries || 0}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-medium">
                      <span className="text-slate-600">Pending Quotations</span>
                      <span className="bg-amber-100 text-amber-800 font-bold px-2.5 py-0.5 rounded-full text-xs">{summary.pendingQuotations || 0}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-medium">
                      <span className="text-slate-600">Confirmed Bookings</span>
                      <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full text-xs">{summary.confirmedBookings || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Financial Health */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
                    <span className="flex items-center">
                      <DollarSign className="w-5 h-5 text-emerald-600 mr-2" /> Financial Health
                    </span>
                    <span className="text-xs font-semibold text-slate-400">Accounting Metrics</span>
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm font-medium">
                      <span className="text-slate-600">Gross Margin</span>
                      <span className="font-bold text-emerald-600">{grossMarginText}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-medium">
                      <span className="text-slate-600">Outstanding Balance</span>
                      <span className="font-bold text-rose-600">₹{Number(summary.outstandingPayments || 0).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SALES ANALYTICS */}
          {activeTab === 'sales' && (
            <div className="space-y-8 font-sans">
              {/* QUOTATION & CONVERSION KPI CARDS */}
              <div>
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center">
                  <FileText className="w-4 h-4 mr-1 text-blue-600" /> Quotation & Conversion Overview
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
                  <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm">
                    <span className="text-xs font-semibold text-slate-400 uppercase">Conversion Rate</span>
                    <h3 className="text-2xl font-black text-emerald-600 mt-1">{salesData?.summary?.conversionRate || 0}%</h3>
                    <p className="text-xs text-slate-500 mt-2">Enquiries converted to bookings</p>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm">
                    <span className="text-xs font-semibold text-slate-400 uppercase">Accepted Quotes</span>
                    <h3 className="text-2xl font-black text-blue-600 mt-1">{salesData?.summary?.acceptedQuotations || 0}</h3>
                    <p className="text-xs text-slate-500 mt-2">Approved by customers</p>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-rose-100 shadow-sm">
                    <span className="text-xs font-semibold text-slate-400 uppercase">Rejected Quotes</span>
                    <h3 className="text-2xl font-black text-rose-600 mt-1">{salesData?.summary?.rejectedQuotations || 0}</h3>
                    <p className="text-xs text-slate-500 mt-2">Declined by customers</p>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm">
                    <span className="text-xs font-semibold text-slate-400 uppercase">Expired Quotes</span>
                    <h3 className="text-2xl font-black text-amber-600 mt-1">{salesData?.summary?.expiredQuotations || 0}</h3>
                    <p className="text-xs text-slate-500 mt-2">Passed validity date</p>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-indigo-100 shadow-sm">
                    <span className="text-xs font-semibold text-slate-400 uppercase">Pending Quotes</span>
                    <h3 className="text-2xl font-black text-indigo-600 mt-1">{salesData?.summary?.pendingQuotations || 0}</h3>
                    <p className="text-xs text-slate-500 mt-2">Awaiting response</p>
                  </div>
                </div>
              </div>

              {/* CONVERSION FUNNEL & SOURCE DISTRIBUTION */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="text-base font-black text-slate-900 flex items-center">
                    <Activity className="w-5 h-5 text-blue-600 mr-2" /> Enquiry Conversion Funnel
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    {salesData?.funnel?.map((step: any, idx: number) => (
                      <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center relative">
                        <span className="text-xs font-bold text-blue-600 uppercase">Stage {idx + 1}</span>
                        <h4 className="text-xs font-bold text-slate-800 mt-1">{step.stage}</h4>
                        <div className="text-2xl font-black text-slate-900 mt-2">{step.count}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="text-base font-black text-slate-900 flex items-center">
                    <Filter className="w-5 h-5 text-indigo-600 mr-2" /> Source Distribution
                  </h3>
                  <div className="space-y-3">
                    {salesData?.sourceDistribution?.length > 0 ? (
                      salesData.sourceDistribution.map((src: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center text-sm p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="font-semibold text-slate-700">{src.source}</span>
                          <span className="bg-blue-100 text-blue-800 font-bold px-2.5 py-0.5 rounded-full text-xs">{src.count}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-400 text-xs italic py-4 text-center">No source distribution data available.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* TIMELINE: ENQUIRIES & BOOKINGS OVER TIME */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-base font-black text-slate-900 flex items-center justify-between">
                  <span className="flex items-center">
                    <TrendingUp className="w-5 h-5 text-emerald-600 mr-2" /> Enquiries & Bookings Over Time
                  </span>
                  <span className="text-xs font-semibold text-slate-400">Daily Timeline Breakdown</span>
                </h3>

                {salesData?.timelineData?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <div className="min-w-[600px] flex items-end gap-3 h-40 pt-6 px-4 border-b border-slate-200">
                      {salesData.timelineData.map((item: any, idx: number) => (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                          <div className="w-full flex items-end justify-center gap-1 h-28">
                            <div
                              style={{ height: `${Math.min(100, item.enquiries * 20)}%` }}
                              className="w-1/2 bg-blue-500 rounded-t hover:bg-blue-600 transition-all min-h-[4px]"
                              title={`Enquiries: ${item.enquiries}`}
                            />
                            <div
                              style={{ height: `${Math.min(100, item.bookings * 20)}%` }}
                              className="w-1/2 bg-emerald-500 rounded-t hover:bg-emerald-600 transition-all min-h-[4px]"
                              title={`Bookings: ${item.bookings}`}
                            />
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium truncate w-full text-center">{item.date.split('-').slice(1).join('/')}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-center gap-6 mt-3 text-xs font-semibold text-slate-600">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 bg-blue-500 rounded-sm" /> Enquiries Over Time
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 bg-emerald-500 rounded-sm" /> Confirmed Bookings Over Time
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-400 text-xs italic py-6 text-center">No timeline activity data for this period.</p>
                )}
              </div>

              {/* SALESPERSON PERFORMANCE TABLE */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                  <div>
                    <h3 className="text-base font-black text-slate-900 flex items-center">
                      <UserCheck className="w-5 h-5 text-indigo-600 mr-2" /> Salesperson Performance
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">Real representative metrics from CRM lead assignments & follow-ups</p>
                  </div>
                </div>
                {salesData?.salespersonPerformance?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm font-medium text-slate-700">
                      <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b border-slate-200">
                        <tr>
                          <th className="px-6 py-4">Salesperson</th>
                          <th className="px-6 py-4">Enquiries Handled</th>
                          <th className="px-6 py-4">Follow-ups Done</th>
                          <th className="px-6 py-4">Quotations Created</th>
                          <th className="px-6 py-4">Confirmed Bookings</th>
                          <th className="px-6 py-4">Conversion Rate</th>
                          <th className="px-6 py-4">Revenue Generated</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {salesData.salespersonPerformance.map((emp: any) => (
                          <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-bold text-slate-900">{emp.name}</td>
                            <td className="px-6 py-4">{emp.enquiriesHandled}</td>
                            <td className="px-6 py-4">{emp.followUpsCompleted}</td>
                            <td className="px-6 py-4">{emp.quotationsCreated}</td>
                            <td className="px-6 py-4 font-bold text-blue-600">{emp.confirmedBookings}</td>
                            <td className="px-6 py-4">
                              <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full">
                                {emp.conversionRate}%
                              </span>
                            </td>
                            <td className="px-6 py-4 font-bold text-emerald-600">₹{Number(emp.revenueGenerated || 0).toLocaleString('en-IN')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-400 text-sm font-medium italic">
                    No salesperson data available for this period.
                  </div>
                )}
              </div>

              {/* SALES BY PACKAGE TABLE */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200">
                  <h3 className="text-base font-black text-slate-900 flex items-center">
                    <Package className="w-5 h-5 text-blue-600 mr-2" /> Sales by Package
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Package revenue, enquiry interest & conversion breakdown</p>
                </div>
                {salesData?.salesByPackage?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm font-medium text-slate-700">
                      <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b border-slate-200">
                        <tr>
                          <th className="px-6 py-4">Package Title</th>
                          <th className="px-6 py-4">Destination</th>
                          <th className="px-6 py-4">Enquiries</th>
                          <th className="px-6 py-4">Bookings</th>
                          <th className="px-6 py-4">Confirmed Bookings</th>
                          <th className="px-6 py-4">Est. Revenue</th>
                          <th className="px-6 py-4">Conversion Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {salesData.salesByPackage.map((pkg: any) => (
                          <tr key={pkg.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-bold text-slate-900">{pkg.title}</td>
                            <td className="px-6 py-4 text-slate-600">{pkg.destination}</td>
                            <td className="px-6 py-4">{pkg.enquiryCount}</td>
                            <td className="px-6 py-4">{pkg.bookingCount}</td>
                            <td className="px-6 py-4 font-bold text-blue-600">{pkg.confirmedBookings}</td>
                            <td className="px-6 py-4 font-bold text-emerald-600">₹{Number(pkg.revenue || 0).toLocaleString('en-IN')}</td>
                            <td className="px-6 py-4">
                              <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full">
                                {pkg.conversionRate}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-400 text-sm font-medium italic">
                    No package sales data available.
                  </div>
                )}
              </div>

              {/* SALES BY DESTINATION TABLE */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200">
                  <h3 className="text-base font-black text-slate-900 flex items-center">
                    <MapPin className="w-5 h-5 text-purple-600 mr-2" /> Sales by Destination
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Geographic performance and demand trends</p>
                </div>
                {salesData?.salesByDestination?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm font-medium text-slate-700">
                      <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b border-slate-200">
                        <tr>
                          <th className="px-6 py-4">Destination</th>
                          <th className="px-6 py-4">Enquiries</th>
                          <th className="px-6 py-4">Bookings</th>
                          <th className="px-6 py-4">Confirmed Bookings</th>
                          <th className="px-6 py-4">Est. Revenue</th>
                          <th className="px-6 py-4">Conversion Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {salesData.salesByDestination.map((dest: any) => (
                          <tr key={dest.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-bold text-slate-900">{dest.name}</td>
                            <td className="px-6 py-4">{dest.enquiryCount}</td>
                            <td className="px-6 py-4">{dest.bookingCount}</td>
                            <td className="px-6 py-4 font-bold text-blue-600">{dest.confirmedBookings}</td>
                            <td className="px-6 py-4 font-bold text-emerald-600">₹{Number(dest.revenue || 0).toLocaleString('en-IN')}</td>
                            <td className="px-6 py-4">
                              <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2.5 py-1 rounded-full">
                                {dest.conversionRate}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-400 text-sm font-medium italic">
                    No destination sales data available.
                  </div>
                )}
              </div>

              {/* FOLLOW-UP PERFORMANCE & LOST LEAD ANALYSIS CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Follow-up Performance */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
                    <span className="flex items-center">
                      <PhoneCall className="w-5 h-5 text-blue-600 mr-2" /> Follow-up Performance
                    </span>
                    <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                      {salesData?.followUpPerformance?.completionRate || 0}% Completion
                    </span>
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm font-medium">
                      <span className="text-slate-600">Total Follow-ups</span>
                      <span className="font-bold text-slate-900">{salesData?.followUpPerformance?.totalFollowUps || 0}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-medium">
                      <span className="text-slate-600">Completed Follow-ups</span>
                      <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full text-xs">{salesData?.followUpPerformance?.completedFollowUps || 0}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-medium">
                      <span className="text-slate-600">Pending Follow-ups</span>
                      <span className="bg-amber-100 text-amber-800 font-bold px-2.5 py-0.5 rounded-full text-xs">{salesData?.followUpPerformance?.pendingFollowUps || 0}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-medium">
                      <span className="text-slate-600">Overdue Follow-ups</span>
                      <span className="bg-rose-100 text-rose-800 font-bold px-2.5 py-0.5 rounded-full text-xs">{salesData?.followUpPerformance?.overdueFollowUps || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Lost Lead Analysis */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
                    <span className="flex items-center">
                      <Ban className="w-5 h-5 text-rose-600 mr-2" /> Lost Lead Analysis
                    </span>
                    <span className="bg-rose-100 text-rose-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                      {salesData?.lostLeadAnalysis?.lostLeadPercentage || 0}% Lost Rate
                    </span>
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm font-medium">
                      <span className="text-slate-600">Total Lost / Cancelled Leads</span>
                      <span className="font-bold text-rose-600">{salesData?.lostLeadAnalysis?.totalLostLeads || 0}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-medium">
                      <span className="text-slate-600">Lost Reasons Status</span>
                      <span className="text-xs text-slate-400 italic">{salesData?.lostLeadAnalysis?.reasonNote || 'Lost reason data not available'}</span>
                    </div>
                    <div className="pt-2">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Lost Leads by Source</span>
                      {salesData?.lostLeadAnalysis?.lostBySource?.length > 0 ? (
                        <div className="space-y-1.5">
                          {salesData.lostLeadAnalysis.lostBySource.map((ls: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded-lg">
                              <span className="text-slate-700">{ls.source}</span>
                              <span className="font-bold text-rose-700">{ls.count}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">No lost leads recorded for this period.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PACKAGE ANALYTICS (EXTENDED REVIEW FIX) */}
          {activeTab === 'packages' && (
            <div className="space-y-8 font-sans">
              {/* 1. PACKAGE PERFORMANCE SUMMARY CARDS */}
              <div>
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center">
                  <Package className="w-4 h-4 mr-1 text-blue-600" /> Package Performance Summary
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm">
                    <span className="text-xs font-semibold text-slate-400 uppercase">Total Packages</span>
                    <h3 className="text-2xl font-black text-slate-900 mt-1">{packageData?.summary?.totalPackages || 0}</h3>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-indigo-100 shadow-sm">
                    <span className="text-xs font-semibold text-slate-400 uppercase">Total Enquiries</span>
                    <h3 className="text-2xl font-black text-indigo-600 mt-1">{packageData?.summary?.totalPackageEnquiries || 0}</h3>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm">
                    <span className="text-xs font-semibold text-slate-400 uppercase">Total Bookings</span>
                    <h3 className="text-2xl font-black text-emerald-600 mt-1">{packageData?.summary?.totalPackageBookings || 0}</h3>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm">
                    <span className="text-xs font-semibold text-slate-400 uppercase">Total Revenue</span>
                    <h3 className="text-2xl font-black text-blue-600 mt-1">₹{Number(packageData?.summary?.totalPackageRevenue || 0).toLocaleString('en-IN')}</h3>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-sm">
                    <span className="text-xs font-semibold text-slate-400 uppercase">Avg Booking Value</span>
                    <h3 className="text-2xl font-black text-purple-600 mt-1">
                      {packageData?.summary?.avgBookingValue !== null && packageData?.summary?.avgBookingValue !== undefined
                        ? `₹${Number(packageData.summary.avgBookingValue).toLocaleString('en-IN')}`
                        : 'N/A'}
                    </h3>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm">
                    <span className="text-xs font-semibold text-slate-400 uppercase">Conversion Rate</span>
                    <h3 className="text-2xl font-black text-emerald-600 mt-1">
                      {packageData?.summary?.overallConversionRate !== null && packageData?.summary?.overallConversionRate !== undefined
                        ? `${packageData.summary.overallConversionRate}%`
                        : 'N/A'}
                    </h3>
                  </div>
                </div>
              </div>

              {/* 2. TOP PACKAGE RANKINGS & DESTINATION PERFORMANCE */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Package Rankings */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="text-base font-black text-slate-900 flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="flex items-center">
                      <Award className="w-5 h-5 text-amber-500 mr-2" /> Top Performing Packages
                    </span>
                    <span className="text-xs text-slate-400 italic">Ranked by Real DB Revenue</span>
                  </h3>
                  <div className="space-y-3">
                    {packageData?.topRankings?.highestRevenue?.length > 0 ? (
                      packageData.topRankings.highestRevenue.map((pkg: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <div>
                            <span className="font-bold text-slate-900 text-sm">{idx + 1}. {pkg.title}</span>
                            <p className="text-xs text-slate-400">{pkg.destination} • {pkg.enquiryCount} Enquiries • {pkg.confirmedBookings} Bookings</p>
                          </div>
                          <span className="font-bold text-emerald-600 text-sm">₹{Number(pkg.revenue || 0).toLocaleString('en-IN')}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-400 text-xs italic py-4 text-center">No top package data available.</p>
                    )}
                  </div>
                </div>

                {/* Destination Performance Summary */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="text-base font-black text-slate-900 flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="flex items-center">
                      <MapPin className="w-5 h-5 text-purple-600 mr-2" /> Destination Demand & Revenue
                    </span>
                    <span className="text-xs text-slate-400 italic">Geographic Demand</span>
                  </h3>
                  <div className="space-y-3">
                    {packageData?.destinationPerformance?.length > 0 ? (
                      packageData.destinationPerformance.map((dest: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 text-sm">
                          <div>
                            <span className="font-bold text-slate-900">{dest.destination}</span>
                            <p className="text-xs text-slate-400">{dest.enquiryCount} Enquiries • {dest.confirmedBookings} Bookings</p>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-emerald-600 block">₹{Number(dest.revenue || 0).toLocaleString('en-IN')}</span>
                            <span className="text-[11px] font-semibold text-purple-700">{dest.conversionRate !== null ? `${dest.conversionRate}% Conv` : 'N/A'}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-400 text-xs italic py-4 text-center">No destination performance data available.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* VIEW TRACKING STATUS FLAG */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-between text-xs text-slate-500 font-medium">
                <span className="flex items-center">
                  <EyeOff className="w-4 h-4 text-slate-400 mr-2" />
                  Most Viewed Packages Page-View Analytics Status:
                </span>
                <span className="bg-slate-200 text-slate-700 font-bold px-2.5 py-1 rounded-md uppercase">
                  {packageData?.viewTrackingNote || "View tracking unavailable"}
                </span>
              </div>

              {/* 3. MAIN PACKAGE PERFORMANCE & PROFITABILITY TABLE */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                  <div>
                    <h3 className="text-base font-black text-slate-900 flex items-center">
                      <Package className="w-5 h-5 text-blue-600 mr-2" /> Package Performance & Profitability Table
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">Real-database package metrics, average booking value, and cost analysis</p>
                  </div>
                </div>

                {packageData?.packagePerformance?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm font-medium text-slate-700">
                      <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b border-slate-200">
                        <tr>
                          <th className="px-6 py-4">Package</th>
                          <th className="px-6 py-4">Destination</th>
                          <th className="px-6 py-4">Base Price</th>
                          <th className="px-6 py-4">Enquiries</th>
                          <th className="px-6 py-4">Bookings</th>
                          <th className="px-6 py-4">Revenue</th>
                          <th className="px-6 py-4">Avg Booking Value</th>
                          <th className="px-6 py-4">Conversion Rate</th>
                          <th className="px-6 py-4">Package Cost</th>
                          <th className="px-6 py-4">Gross Profit</th>
                          <th className="px-6 py-4">Margin %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {packageData.packagePerformance.map((pkg: any) => (
                          <tr key={pkg.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-bold text-slate-900">{pkg.title}</td>
                            <td className="px-6 py-4 text-slate-600">{pkg.destination}</td>
                            <td className="px-6 py-4 font-semibold text-slate-900">₹{pkg.basePrice.toLocaleString('en-IN')}</td>
                            <td className="px-6 py-4">{pkg.enquiryCount}</td>
                            <td className="px-6 py-4 font-bold text-blue-600">{pkg.confirmedBookings}</td>
                            <td className="px-6 py-4 font-bold text-emerald-600">
                              {pkg.confirmedBookings > 0 ? `₹${pkg.revenue.toLocaleString('en-IN')}` : '₹0'}
                            </td>
                            <td className="px-6 py-4 font-semibold text-slate-800">
                              {pkg.avgBookingValue !== null ? `₹${pkg.avgBookingValue.toLocaleString('en-IN')}` : 'N/A'}
                            </td>
                            <td className="px-6 py-4">
                              {pkg.conversionRate !== null ? (
                                <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full">
                                  {pkg.conversionRate}%
                                </span>
                              ) : (
                                <span className="text-slate-400 text-xs italic">N/A</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-xs font-medium">
                              {pkg.cost !== null ? `₹${pkg.cost.toLocaleString('en-IN')}` : <span className="text-slate-400 italic">Cost data unavailable</span>}
                            </td>
                            <td className="px-6 py-4 text-xs font-semibold">
                              {pkg.profit !== null ? (
                                <span className={pkg.profit >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                                  ₹{pkg.profit.toLocaleString('en-IN')}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">N/A</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-xs font-semibold">
                              {pkg.margin !== null ? (
                                <span className="bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded">
                                  {pkg.margin}%
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">N/A</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-400 text-sm font-medium italic">
                    No package sales data available for this period.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: FINANCIAL ANALYTICS (EXTENDED REVIEW FIX) */}
          {activeTab === 'financials' && (
            <div className="space-y-8 font-sans">
              {/* 1. FINANCIAL KPI CARDS GRID (6 CARDS) */}
              <div>
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center">
                  <DollarSign className="w-4 h-4 mr-1 text-emerald-600" /> Executive Financial KPI Overview
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm">
                    <span className="text-xs font-semibold text-slate-400 uppercase">Total Revenue</span>
                    <h3 className="text-2xl font-black text-blue-600 mt-1">₹{Number(financialData?.summary?.totalRevenue || 0).toLocaleString('en-IN')}</h3>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm">
                    <span className="text-xs font-semibold text-slate-400 uppercase">Total Expenses</span>
                    <h3 className="text-2xl font-black text-amber-600 mt-1">₹{Number(financialData?.summary?.totalExpense || 0).toLocaleString('en-IN')}</h3>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm">
                    <span className="text-xs font-semibold text-slate-400 uppercase">Net Profit</span>
                    <h3 className="text-2xl font-black text-emerald-600 mt-1">₹{Number(financialData?.summary?.netProfit || 0).toLocaleString('en-IN')}</h3>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-indigo-100 shadow-sm">
                    <span className="text-xs font-semibold text-slate-400 uppercase">GST Collected</span>
                    <h3 className="text-2xl font-black text-indigo-600 mt-1">₹{Number(financialData?.summary?.gstCollected || 0).toLocaleString('en-IN')}</h3>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-rose-100 shadow-sm">
                    <span className="text-xs font-semibold text-slate-400 uppercase">Outstanding Payments</span>
                    <h3 className="text-2xl font-black text-rose-600 mt-1">₹{Number(financialData?.summary?.outstandingPayments || 0).toLocaleString('en-IN')}</h3>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-sm">
                    <span className="text-xs font-semibold text-slate-400 uppercase">Refunds</span>
                    <h3 className="text-2xl font-black text-purple-600 mt-1">₹{Number(financialData?.summary?.refundAmount || 0).toLocaleString('en-IN')}</h3>
                  </div>
                </div>
              </div>

              {/* 2. MONTHLY REVENUE VS EXPENSES & PROFIT TREND CHARTS */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Chart 1: Monthly Revenue vs Expenses */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="text-base font-black text-slate-900 flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="flex items-center">
                      <BarChart3 className="w-5 h-5 text-blue-600 mr-2" /> Monthly Revenue vs Expenses
                    </span>
                    <span className="text-xs text-slate-400 italic">Real DB Monthly Breakdown</span>
                  </h3>

                  {financialData?.monthlyTrend?.length > 0 ? (
                    <div className="overflow-x-auto">
                      <div className="min-w-[400px] flex items-end gap-3 h-48 pt-6 px-4 border-b border-slate-200">
                        {financialData.monthlyTrend.map((item: any, idx: number) => {
                          const maxVal = Math.max(...financialData.monthlyTrend.map((m: any) => Math.max(m.revenue, m.expenses)), 1);
                          const revHeight = Math.max(4, (item.revenue / maxVal) * 100);
                          const expHeight = Math.max(4, (item.expenses / maxVal) * 100);
                          return (
                            <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                              <div className="w-full flex items-end justify-center gap-1.5 h-36">
                                <div
                                  style={{ height: `${revHeight}%` }}
                                  className="w-1/2 bg-blue-500 rounded-t hover:bg-blue-600 transition-all min-h-[4px]"
                                  title={`Revenue: ₹${item.revenue.toLocaleString('en-IN')}`}
                                />
                                <div
                                  style={{ height: `${expHeight}%` }}
                                  className="w-1/2 bg-amber-500 rounded-t hover:bg-amber-600 transition-all min-h-[4px]"
                                  title={`Expenses: ₹${item.expenses.toLocaleString('en-IN')}`}
                                />
                              </div>
                              <span className="text-[11px] text-slate-500 font-bold truncate w-full text-center">{item.month}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-center gap-6 mt-4 text-xs font-semibold text-slate-600">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 bg-blue-500 rounded-sm" /> Monthly Revenue
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 bg-amber-500 rounded-sm" /> Monthly Expenses
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-400 text-xs italic py-8 text-center">No monthly trend data available for this filter period.</p>
                  )}
                </div>

                {/* Chart 2: Profit Trend (Revenue - Expenses) */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="text-base font-black text-slate-900 flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="flex items-center">
                      <TrendingUp className="w-5 h-5 text-emerald-600 mr-2" /> Net Profit Trend
                    </span>
                    <span className="text-xs text-slate-400 italic">Decimal-Safe (Revenue - Expenses)</span>
                  </h3>

                  {financialData?.monthlyTrend?.length > 0 ? (
                    <div className="overflow-x-auto">
                      <div className="min-w-[400px] flex items-end gap-3 h-48 pt-6 px-4 border-b border-slate-200">
                        {financialData.monthlyTrend.map((item: any, idx: number) => {
                          const maxProfit = Math.max(...financialData.monthlyTrend.map((m: any) => Math.abs(m.profit)), 1);
                          const profHeight = Math.max(4, (Math.abs(item.profit) / maxProfit) * 100);
                          const isProf = item.profit >= 0;
                          return (
                            <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                              <div className="w-full flex items-end justify-center h-36">
                                <div
                                  style={{ height: `${profHeight}%` }}
                                  className={`w-3/4 rounded-t transition-all min-h-[4px] ${isProf ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600'}`}
                                  title={`Net Profit: ₹${item.profit.toLocaleString('en-IN')}`}
                                />
                              </div>
                              <span className="text-[11px] text-slate-500 font-bold truncate w-full text-center">{item.month}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-center gap-6 mt-4 text-xs font-semibold text-slate-600">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 bg-emerald-500 rounded-sm" /> Positive Net Profit
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 bg-rose-500 rounded-sm" /> Negative Net Loss
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-400 text-xs italic py-8 text-center">No profit trend data available for this filter period.</p>
                  )}
                </div>
              </div>

              {/* 3. PAYMENT COLLECTION & P&L SUMMARY CARDS */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Payment Collection Breakdown */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
                    <span className="flex items-center">
                      <Activity className="w-5 h-5 text-blue-600 mr-2" /> Payment Collection Breakdown
                    </span>
                    <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                      Reused Accounting Logic
                    </span>
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="font-semibold text-slate-700">Total Collected</span>
                      <span className="font-bold text-emerald-600 text-base">
                        ₹{Number(financialData?.paymentCollection?.totalCollected || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="font-semibold text-slate-700">Pending Payments</span>
                      <span className="font-bold text-amber-600 text-base">
                        ₹{Number(financialData?.paymentCollection?.pendingPayments || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="font-semibold text-slate-700">Outstanding Balance</span>
                      <span className="font-bold text-rose-600 text-base">
                        ₹{Number(financialData?.paymentCollection?.outstandingBalance || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="font-semibold text-slate-700">Advance Payments</span>
                      <span className="font-bold text-indigo-600 text-base">
                        ₹{Number(financialData?.paymentCollection?.advancePayments || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="font-semibold text-slate-700">Refunds Processed</span>
                      <span className="font-bold text-purple-600 text-base">
                        ₹{Number(financialData?.paymentCollection?.refunds || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* P&L Summary Section */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
                    <span className="flex items-center">
                      <FileText className="w-5 h-5 text-emerald-600 mr-2" /> Executive P&L Summary
                    </span>
                    <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                      Actual Accounting Data
                    </span>
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                      <span className="font-bold text-slate-800">Gross Business Revenue</span>
                      <span className="font-black text-blue-700 text-base">
                        ₹{Number(financialData?.pnlSummary?.revenue || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm p-3 bg-amber-50/50 rounded-xl border border-amber-100">
                      <span className="font-bold text-slate-800">Less: Total Approved Expenses</span>
                      <span className="font-black text-amber-700 text-base">
                        - ₹{Number(financialData?.pnlSummary?.expenses || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                      <span className="font-black text-slate-900 uppercase tracking-wide">Net Profit</span>
                      <span className="font-black text-emerald-700 text-lg">
                        = ₹{Number(financialData?.pnlSummary?.netProfit || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="pt-2 grid grid-cols-3 gap-2 text-center text-xs font-semibold">
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-slate-400 block text-[10px] uppercase">GST Collected</span>
                        <span className="text-indigo-600 font-bold">
                          {financialData?.pnlSummary?.gstCollected ? `₹${Number(financialData.pnlSummary.gstCollected).toLocaleString('en-IN')}` : 'N/A'}
                        </span>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-slate-400 block text-[10px] uppercase">Refunds</span>
                        <span className="text-purple-600 font-bold">
                          {financialData?.pnlSummary?.refunds ? `₹${Number(financialData.pnlSummary.refunds).toLocaleString('en-IN')}` : '₹0'}
                        </span>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-slate-400 block text-[10px] uppercase">Outstanding</span>
                        <span className="text-rose-600 font-bold">
                          {financialData?.pnlSummary?.outstandingAmount ? `₹${Number(financialData.pnlSummary.outstandingAmount).toLocaleString('en-IN')}` : '₹0'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. GST ANALYTICS SECTION */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
                  <span className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-indigo-600 mr-2" /> GST Analytics & ITC Breakdown
                  </span>
                  <span className="text-xs text-slate-400 italic">
                    {financialData?.gstAnalytics?.hasGstData ? 'Real GST Database Records' : 'No GST Records for Period'}
                  </span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                    <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wider block mb-1">Output GST Collected</span>
                    <div className="text-2xl font-black text-indigo-900">
                      {financialData?.gstAnalytics?.gstCollected !== undefined && financialData?.gstAnalytics?.gstCollected !== null
                        ? `₹${Number(financialData.gstAnalytics.gstCollected).toLocaleString('en-IN')}`
                        : 'N/A'}
                    </div>
                    <p className="text-xs text-indigo-600 mt-2">GST collected from customer invoices</p>
                  </div>

                  <div className="p-5 bg-amber-50/50 rounded-2xl border border-amber-100">
                    <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider block mb-1">GST Adjustments / Input Tax Credit</span>
                    <div className="text-2xl font-black text-amber-900">
                      {financialData?.gstAnalytics?.gstAdjustments !== undefined && financialData?.gstAnalytics?.gstAdjustments !== null
                        ? `₹${Number(financialData.gstAnalytics.gstAdjustments).toLocaleString('en-IN')}`
                        : 'N/A'}
                    </div>
                    <p className="text-xs text-amber-600 mt-2">GST paid on business vendor expenses</p>
                  </div>

                  <div className="p-5 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                    <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider block mb-1">Net GST Liability</span>
                    <div className="text-2xl font-black text-emerald-900">
                      {financialData?.gstAnalytics?.netGst !== undefined && financialData?.gstAnalytics?.netGst !== null
                        ? `₹${Number(financialData.gstAnalytics.netGst).toLocaleString('en-IN')}`
                        : 'N/A'}
                    </div>
                    <p className="text-xs text-emerald-600 mt-2">Output GST minus Input Tax Credit</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: EMPLOYEE ANALYTICS (EXTENDED REVIEW FIX) */}
          {activeTab === 'employees' && (
            <div className="space-y-8 font-sans">
              {/* 1. EMPLOYEE SUMMARY KPI CARDS */}
              <div>
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center">
                  <Users className="w-4 h-4 mr-1 text-blue-600" /> Executive HR & Workforce Overview
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm">
                    <span className="text-xs font-semibold text-slate-400 uppercase">Total Employees</span>
                    <h3 className="text-3xl font-black text-slate-900 mt-1">{employeeData?.summary?.totalEmployees || 0}</h3>
                    <p className="text-xs text-slate-500 mt-2">Registered workforce records</p>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-emerald-100 shadow-sm">
                    <span className="text-xs font-semibold text-slate-400 uppercase">Active Staff</span>
                    <h3 className="text-3xl font-black text-emerald-600 mt-1">{employeeData?.summary?.activeEmployees || 0}</h3>
                    <p className="text-xs text-slate-500 mt-2">Currently active employees</p>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-rose-100 shadow-sm">
                    <span className="text-xs font-semibold text-slate-400 uppercase">Inactive / Resigned</span>
                    <h3 className="text-3xl font-black text-rose-600 mt-1">{employeeData?.summary?.inactiveEmployees || 0}</h3>
                    <p className="text-xs text-slate-500 mt-2">Inactive or parted staff</p>
                  </div>
                </div>
              </div>

              {/* 2. DEPARTMENT DISTRIBUTION & PAYROLL SUMMARY */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Department-Wise Distribution */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="text-base font-black text-slate-900 flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="flex items-center">
                      <Layers className="w-5 h-5 text-indigo-600 mr-2" /> Department-Wise Employee Distribution
                    </span>
                    <span className="text-xs text-slate-400 italic">HR Department Mapping</span>
                  </h3>
                  <div className="space-y-3">
                    {employeeData?.departmentDistribution?.length > 0 ? (
                      employeeData.departmentDistribution.map((dept: any) => (
                        <div key={dept.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 text-sm">
                          <div>
                            <span className="font-bold text-slate-900">{dept.name}</span>
                            <span className="text-xs text-slate-400 block">{dept.activeCount} Active Members</span>
                          </div>
                          <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-3 py-1 rounded-full">
                            {dept.totalCount} Staff
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-400 text-xs italic py-4 text-center">No department distribution data available.</p>
                    )}
                  </div>
                </div>

                {/* Payroll Summary */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="text-base font-black text-slate-900 flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="flex items-center">
                      <DollarSign className="w-5 h-5 text-emerald-600 mr-2" /> Payroll & Compensation Summary
                    </span>
                    <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                      Reused HR Payroll Data
                    </span>
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-xs font-semibold text-slate-400 uppercase">Total Payroll</span>
                      <div className="text-xl font-black text-emerald-600 mt-1">
                        {employeeData?.payrollSummary?.totalPayroll !== null && employeeData?.payrollSummary?.totalPayroll !== undefined
                          ? `₹${Number(employeeData.payrollSummary.totalPayroll).toLocaleString('en-IN')}`
                          : 'N/A'}
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-xs font-semibold text-slate-400 uppercase">Average Salary</span>
                      <div className="text-xl font-black text-blue-600 mt-1">
                        {employeeData?.payrollSummary?.averageSalary !== null && employeeData?.payrollSummary?.averageSalary !== undefined
                          ? `₹${Number(employeeData.payrollSummary.averageSalary).toLocaleString('en-IN')}`
                          : 'N/A'}
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-xs font-semibold text-slate-400 uppercase">Total Incentives</span>
                      <div className="text-xl font-black text-purple-600 mt-1">
                        {employeeData?.payrollSummary?.totalIncentives !== null && employeeData?.payrollSummary?.totalIncentives !== undefined
                          ? `₹${Number(employeeData.payrollSummary.totalIncentives).toLocaleString('en-IN')}`
                          : 'N/A'}
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-xs font-semibold text-slate-400 uppercase">Total Bonuses</span>
                      <div className="text-xl font-black text-amber-600 mt-1">
                        {employeeData?.payrollSummary?.totalBonuses !== null && employeeData?.payrollSummary?.totalBonuses !== undefined
                          ? `₹${Number(employeeData.payrollSummary.totalBonuses).toLocaleString('en-IN')}`
                          : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. MONTHLY PAYROLL TREND CHART */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-base font-black text-slate-900 flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="flex items-center">
                    <TrendingUp className="w-5 h-5 text-blue-600 mr-2" /> Monthly Payroll Trend
                  </span>
                  <span className="text-xs text-slate-400 italic">Filter-Based Payroll Expenditure</span>
                </h3>

                {employeeData?.monthlyPayrollTrend?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <div className="min-w-[500px] flex items-end gap-3 h-44 pt-6 px-4 border-b border-slate-200">
                      {employeeData.monthlyPayrollTrend.map((item: any, idx: number) => {
                        const maxPayroll = Math.max(...employeeData.monthlyPayrollTrend.map((m: any) => m.payroll), 1);
                        const pHeight = Math.max(4, (item.payroll / maxPayroll) * 100);
                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                            <div className="w-full flex items-end justify-center h-32">
                              <div
                                style={{ height: `${pHeight}%` }}
                                className="w-1/2 bg-indigo-500 rounded-t hover:bg-indigo-600 transition-all min-h-[4px]"
                                title={`Payroll Expenditure: ₹${item.payroll.toLocaleString('en-IN')}`}
                              />
                            </div>
                            <span className="text-[11px] text-slate-500 font-bold truncate w-full text-center">{item.month}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-center gap-6 mt-3 text-xs font-semibold text-slate-600">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 bg-indigo-500 rounded-sm" /> Monthly Net Payroll (INR)
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-400 text-xs italic py-6 text-center">No payroll trend data for this filter period.</p>
                )}
              </div>

              {/* 4. ENHANCED EMPLOYEE PERFORMANCE LEADERBOARD & SALES ACTIVITY TABLE */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                  <div>
                    <h3 className="text-base font-black text-slate-900 flex items-center">
                      <UserCheck className="w-5 h-5 text-indigo-600 mr-2" /> Employee Performance & Activity Leaderboard
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">Real-time enquiries, follow-ups, quotations, bookings, and revenue breakdown per employee</p>
                  </div>
                </div>
                {employeeData?.performance?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm font-medium text-slate-700">
                      <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b border-slate-200">
                        <tr>
                          <th className="px-6 py-4">Employee</th>
                          <th className="px-6 py-4">Department</th>
                          <th className="px-6 py-4">Designation</th>
                          <th className="px-6 py-4">Enquiries</th>
                          <th className="px-6 py-4">Follow-ups</th>
                          <th className="px-6 py-4">Quotations</th>
                          <th className="px-6 py-4">Bookings</th>
                          <th className="px-6 py-4">Conversion Rate</th>
                          <th className="px-6 py-4">Revenue Generated</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {employeeData.performance.map((emp: any) => (
                          <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-bold text-slate-900">{emp.name}</div>
                              <span className="text-xs text-slate-400">{emp.employeeId || emp.id.slice(0, 8)}</span>
                            </td>
                            <td className="px-6 py-4 text-slate-600">{emp.department}</td>
                            <td className="px-6 py-4 text-slate-600">{emp.designation}</td>
                            <td className="px-6 py-4 font-semibold text-slate-900">{emp.enquiriesHandled}</td>
                            <td className="px-6 py-4">{emp.followUpsCount !== undefined ? emp.followUpsCount : emp.followUpsCompleted}</td>
                            <td className="px-6 py-4">{emp.quotationsCreated}</td>
                            <td className="px-6 py-4 font-bold text-blue-600">{emp.confirmedBookings}</td>
                            <td className="px-6 py-4">
                              <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full">
                                {emp.conversionRate}%
                              </span>
                            </td>
                            <td className="px-6 py-4 font-bold text-emerald-600">
                              ₹{Number(emp.revenueGenerated || 0).toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-400 text-sm font-medium italic">
                    No employee performance data available.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: OPERATIONS ANALYTICS */}
          {activeTab === 'operations' && (
            <div className="space-y-8 font-sans">
              {/* 1. TOUR STATUS METRICS */}
              <div>
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center">
                  <Compass className="w-4 h-4 mr-1 text-purple-600" /> Tour Status Overview
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  <MetricCard
                    title="Upcoming Tours"
                    value={operationsData?.summary?.upcomingTours ?? 0}
                    previousValue={null}
                    changePercentage={null}
                    hasComparison={false}
                    icon={Calendar}
                    color="blue"
                  />
                  <MetricCard
                    title="Ongoing Tours"
                    value={operationsData?.summary?.ongoingTours ?? 0}
                    previousValue={null}
                    changePercentage={null}
                    hasComparison={false}
                    icon={Clock}
                    color="emerald"
                  />
                  <MetricCard
                    title="Completed Tours"
                    value={operationsData?.summary?.completedTours ?? 0}
                    previousValue={null}
                    changePercentage={null}
                    hasComparison={false}
                    icon={CheckCircle}
                    color="purple"
                  />
                  <MetricCard
                    title="Cancelled Tours"
                    value={operationsData?.summary?.cancelledTours ?? 0}
                    previousValue={null}
                    changePercentage={null}
                    hasComparison={false}
                    icon={XCircle}
                    color="rose"
                  />
                </div>
              </div>

              {/* 2. OPERATIONAL TASK & RESERVATION METRICS */}
              <div>
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center">
                  <Activity className="w-4 h-4 mr-1 text-amber-600" /> Pending Operational Work & Reservations
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
                  <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-400 uppercase">Pending Tasks</span>
                        <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
                          <CheckCircle className="w-4 h-4" />
                        </div>
                      </div>
                      <h3 className="text-2xl font-black text-slate-900">
                        {operationsData?.operationalWork?.pendingOperationalTasks ?? 'N/A'}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">Pending & in-progress checklist items</p>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-indigo-100 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-400 uppercase">Pending Tickets</span>
                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                          <Plane className="w-4 h-4" />
                        </div>
                      </div>
                      <h3 className="text-2xl font-black text-slate-900">
                        {operationsData?.operationalWork?.pendingTicketBookings ?? 'N/A'}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
                      Flights ({operationsData?.operationalWork?.pendingFlightTickets || 0}) / Trains ({operationsData?.operationalWork?.pendingTrainTickets || 0}) / Buses ({operationsData?.operationalWork?.pendingBusTickets || 0})
                    </p>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-400 uppercase">Pending Hotels</span>
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                          <Building className="w-4 h-4" />
                        </div>
                      </div>
                      <h3 className="text-2xl font-black text-slate-900">
                        {operationsData?.operationalWork?.pendingHotelReservations ?? 'N/A'}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">Hotel reservations awaiting confirmation</p>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-cyan-100 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-400 uppercase">Pending Transport</span>
                        <div className="p-2 bg-cyan-100 text-cyan-600 rounded-xl">
                          <Bus className="w-4 h-4" />
                        </div>
                      </div>
                      <h3 className="text-2xl font-black text-slate-900">
                        {operationsData?.operationalWork?.pendingTransportReservations ?? 'N/A'}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">Vehicle / transport bookings requested</p>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-rose-100 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-400 uppercase">Missing Documents</span>
                        <div className="p-2 bg-rose-100 text-rose-600 rounded-xl">
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                      </div>
                      <h3 className="text-2xl font-black text-rose-600">
                        {operationsData?.operationalWork?.missingCustomerDocuments ?? 'N/A'}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">Customer IDs/passports pending verification</p>
                  </div>
                </div>
              </div>

              {/* 3. TOUR COMPLETION STATUS (VISUAL CHART / PROGRESS BREAKDOWN) */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-base font-black text-slate-900 flex items-center">
                    <BarChart3 className="w-5 h-5 text-indigo-600 mr-2" /> Tour Completion & Status Health
                  </h3>
                  <span className="text-xs font-semibold text-slate-400">
                    Total Tours: {operationsData?.tourCompletionStatus?.total || 0}
                  </span>
                </div>

                {operationsData?.tourCompletionStatus?.total > 0 ? (
                  <div className="space-y-4">
                    {/* Visual Segmented Progress Bar */}
                    <div className="w-full h-5 bg-slate-100 rounded-xl overflow-hidden flex shadow-inner">
                      {operationsData.tourCompletionStatus.upcoming.percentage > 0 && (
                        <div
                          style={{ width: `${operationsData.tourCompletionStatus.upcoming.percentage}%` }}
                          className="bg-blue-500 h-full transition-all flex items-center justify-center text-[10px] font-bold text-white"
                          title={`Upcoming: ${operationsData.tourCompletionStatus.upcoming.count} (${operationsData.tourCompletionStatus.upcoming.percentage}%)`}
                        >
                          {operationsData.tourCompletionStatus.upcoming.percentage > 8 ? `${operationsData.tourCompletionStatus.upcoming.percentage}%` : ''}
                        </div>
                      )}
                      {operationsData.tourCompletionStatus.ongoing.percentage > 0 && (
                        <div
                          style={{ width: `${operationsData.tourCompletionStatus.ongoing.percentage}%` }}
                          className="bg-emerald-500 h-full transition-all flex items-center justify-center text-[10px] font-bold text-white"
                          title={`Ongoing: ${operationsData.tourCompletionStatus.ongoing.count} (${operationsData.tourCompletionStatus.ongoing.percentage}%)`}
                        >
                          {operationsData.tourCompletionStatus.ongoing.percentage > 8 ? `${operationsData.tourCompletionStatus.ongoing.percentage}%` : ''}
                        </div>
                      )}
                      {operationsData.tourCompletionStatus.completed.percentage > 0 && (
                        <div
                          style={{ width: `${operationsData.tourCompletionStatus.completed.percentage}%` }}
                          className="bg-purple-500 h-full transition-all flex items-center justify-center text-[10px] font-bold text-white"
                          title={`Completed: ${operationsData.tourCompletionStatus.completed.count} (${operationsData.tourCompletionStatus.completed.percentage}%)`}
                        >
                          {operationsData.tourCompletionStatus.completed.percentage > 8 ? `${operationsData.tourCompletionStatus.completed.percentage}%` : ''}
                        </div>
                      )}
                      {operationsData.tourCompletionStatus.cancelled.percentage > 0 && (
                        <div
                          style={{ width: `${operationsData.tourCompletionStatus.cancelled.percentage}%` }}
                          className="bg-rose-500 h-full transition-all flex items-center justify-center text-[10px] font-bold text-white"
                          title={`Cancelled: ${operationsData.tourCompletionStatus.cancelled.count} (${operationsData.tourCompletionStatus.cancelled.percentage}%)`}
                        >
                          {operationsData.tourCompletionStatus.cancelled.percentage > 8 ? `${operationsData.tourCompletionStatus.cancelled.percentage}%` : ''}
                        </div>
                      )}
                    </div>

                    {/* Status Legend Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                      <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 bg-blue-500 rounded-full" />
                          <span className="text-xs font-bold text-slate-700">Upcoming</span>
                        </div>
                        <span className="text-xs font-black text-blue-700">
                          {operationsData.tourCompletionStatus.upcoming.count} ({operationsData.tourCompletionStatus.upcoming.percentage}%)
                        </span>
                      </div>

                      <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 bg-emerald-500 rounded-full" />
                          <span className="text-xs font-bold text-slate-700">Ongoing</span>
                        </div>
                        <span className="text-xs font-black text-emerald-700">
                          {operationsData.tourCompletionStatus.ongoing.count} ({operationsData.tourCompletionStatus.ongoing.percentage}%)
                        </span>
                      </div>

                      <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 bg-purple-500 rounded-full" />
                          <span className="text-xs font-bold text-slate-700">Completed</span>
                        </div>
                        <span className="text-xs font-black text-purple-700">
                          {operationsData.tourCompletionStatus.completed.count} ({operationsData.tourCompletionStatus.completed.percentage}%)
                        </span>
                      </div>

                      <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 bg-rose-500 rounded-full" />
                          <span className="text-xs font-bold text-slate-700">Cancelled</span>
                        </div>
                        <span className="text-xs font-black text-rose-700">
                          {operationsData.tourCompletionStatus.cancelled.count} ({operationsData.tourCompletionStatus.cancelled.percentage}%)
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-400 text-xs italic py-6 text-center">
                    No tour status records found for this filter period.
                  </p>
                )}
              </div>

              {/* 4. COORDINATOR WORKLOAD TABLE */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                  <div>
                    <h3 className="text-base font-black text-slate-900 flex items-center">
                      <UserCheck className="w-5 h-5 text-indigo-600 mr-2" /> Coordinator Workload & Tour Assignment
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">Real-time regular & group tour assignments, active status breakdown, and pending tasks per coordinator</p>
                  </div>
                </div>

                {operationsData?.coordinatorWorkload?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm font-medium text-slate-700">
                      <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b border-slate-200">
                        <tr>
                          <th className="px-6 py-4">Coordinator</th>
                          <th className="px-6 py-4">Total Assigned</th>
                          <th className="px-6 py-4">Regular Tours</th>
                          <th className="px-6 py-4">Group Tours</th>
                          <th className="px-6 py-4">Upcoming</th>
                          <th className="px-6 py-4">Ongoing</th>
                          <th className="px-6 py-4">Pending Tasks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {operationsData.coordinatorWorkload.map((coord: any) => (
                          <tr key={coord.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-bold text-slate-900">{coord.name}</td>
                            <td className="px-6 py-4 font-bold text-blue-600">{coord.assignedTours}</td>
                            <td className="px-6 py-4 text-slate-700">{coord.regularToursAssigned ?? coord.assignedTours}</td>
                            <td className="px-6 py-4 text-purple-600 font-semibold">{coord.groupToursAssigned ?? 0}</td>
                            <td className="px-6 py-4">{coord.upcomingTours}</td>
                            <td className="px-6 py-4">{coord.ongoingTours}</td>
                            <td className="px-6 py-4">
                              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                                coord.pendingWork > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {coord.pendingWork} pending
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-400 text-sm font-medium italic">
                    No coordinator workload data available for this filter period.
                  </div>
                )}
              </div>

              {/* 5. GROUP TOUR OPERATIONS SECTION */}
              <div className="pt-6 border-t-2 border-slate-200/80 space-y-8">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center">
                        <Users className="w-6 h-6 mr-2 text-blue-600" /> Group Tour Operations & Departures
                      </h2>
                      <p className="text-xs text-slate-500 mt-1">Real-time group departures, capacity utilization, participant counts & demand analytics</p>
                    </div>
                    <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full uppercase">
                      Real Group Tour Data
                    </span>
                  </div>

                  {/* Summary Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    <MetricCard
                      title="Upcoming Group Departures"
                      value={operationsData?.groupTourOperations?.summary?.upcomingGroupDepartures ?? 0}
                      previousValue={null}
                      changePercentage={null}
                      hasComparison={false}
                      icon={Calendar}
                      color="blue"
                    />
                    <MetricCard
                      title="Fully Booked Group Tours"
                      value={operationsData?.groupTourOperations?.summary?.fullyBookedGroupTours ?? 0}
                      previousValue={null}
                      changePercentage={null}
                      hasComparison={false}
                      icon={CheckCircle}
                      color="emerald"
                    />
                    <MetricCard
                      title="Total Group Participants"
                      value={operationsData?.groupTourOperations?.summary?.totalParticipants ?? 0}
                      previousValue={null}
                      changePercentage={null}
                      hasComparison={false}
                      icon={Users}
                      color="indigo"
                    />
                    <MetricCard
                      title="Available Group Seats"
                      value={operationsData?.groupTourOperations?.summary?.totalAvailableSeats ?? 0}
                      previousValue={null}
                      changePercentage={null}
                      hasComparison={false}
                      icon={Briefcase}
                      color="cyan"
                    />
                  </div>
                </div>

                {/* Upcoming Group Departures Table */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                    <div>
                      <h3 className="text-base font-black text-slate-900 flex items-center">
                        <Calendar className="w-5 h-5 text-blue-600 mr-2" /> Upcoming Group Departures
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">Scheduled group departure slots, seat booking status & capacity</p>
                    </div>
                  </div>

                  {operationsData?.groupTourOperations?.upcomingDepartures?.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm font-medium text-slate-700">
                        <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b border-slate-200">
                          <tr>
                            <th className="px-6 py-4">Ref & Title</th>
                            <th className="px-6 py-4">Destination</th>
                            <th className="px-6 py-4">Travel Dates</th>
                            <th className="px-6 py-4">Capacity (Booked/Total)</th>
                            <th className="px-6 py-4">Available Seats</th>
                            <th className="px-6 py-4">Est. Revenue</th>
                            <th className="px-6 py-4">Booking Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {operationsData.groupTourOperations.upcomingDepartures.map((gt: any) => (
                            <tr key={gt.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4">
                                <div className="font-bold text-slate-900">{gt.title}</div>
                                <span className="text-xs text-blue-600 font-semibold">{gt.groupTourRef}</span>
                              </td>
                              <td className="px-6 py-4 font-medium text-slate-700">{gt.destination}</td>
                              <td className="px-6 py-4 text-xs font-medium text-slate-600">
                                {new Date(gt.startDate).toLocaleDateString()} - {new Date(gt.endDate).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 font-bold text-slate-900">
                                {gt.bookedSlots} / {gt.totalSlots}
                              </td>
                              <td className="px-6 py-4">
                                <span className={`font-bold ${gt.availableSlots === 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                  {gt.availableSlots} seats
                                </span>
                              </td>
                              <td className="px-6 py-4 font-bold text-emerald-600">
                                ₹{Number(gt.estimatedRevenue || 0).toLocaleString('en-IN')}
                              </td>
                              <td className="px-6 py-4">
                                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                                  gt.status === 'Full' ? 'bg-rose-100 text-rose-800' :
                                  gt.status === 'Almost Full' ? 'bg-amber-100 text-amber-800' :
                                  gt.status === 'Completed' ? 'bg-slate-100 text-slate-800' :
                                  'bg-emerald-100 text-emerald-800'
                                }`}>
                                  {gt.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-400 text-sm font-medium italic">
                      No group departures found for this filter period.
                    </div>
                  )}
                </div>

                {/* Group Tour Capacity Breakdown & Status Chart */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h3 className="text-base font-black text-slate-900 flex items-center">
                        <Activity className="w-5 h-5 text-indigo-600 mr-2" /> Group Tour Capacity & Seat Utilization
                      </h3>
                      <span className="text-xs font-semibold text-slate-400">
                        Total Capacity: {operationsData?.groupTourOperations?.capacitySummary?.totalCapacity || 0}
                      </span>
                    </div>

                    {operationsData?.groupTourOperations?.capacitySummary?.totalCapacity > 0 ? (
                      <div className="space-y-4">
                        {/* Capacity Utilization Progress Bar */}
                        <div className="w-full h-5 bg-slate-100 rounded-xl overflow-hidden flex shadow-inner">
                          {operationsData.groupTourOperations.capacitySummary.totalBooked > 0 && (
                            <div
                              style={{
                                width: `${Math.round((operationsData.groupTourOperations.capacitySummary.totalBooked / operationsData.groupTourOperations.capacitySummary.totalCapacity) * 100)}%`
                              }}
                              className="bg-indigo-600 h-full transition-all flex items-center justify-center text-[10px] font-bold text-white"
                              title={`Booked Seats: ${operationsData.groupTourOperations.capacitySummary.totalBooked}`}
                            >
                              {Math.round((operationsData.groupTourOperations.capacitySummary.totalBooked / operationsData.groupTourOperations.capacitySummary.totalCapacity) * 100)}% Booked
                            </div>
                          )}
                          {operationsData.groupTourOperations.capacitySummary.totalAvailable > 0 && (
                            <div
                              style={{
                                width: `${Math.round((operationsData.groupTourOperations.capacitySummary.totalAvailable / operationsData.groupTourOperations.capacitySummary.totalCapacity) * 100)}%`
                              }}
                              className="bg-emerald-400 h-full transition-all flex items-center justify-center text-[10px] font-bold text-white"
                              title={`Available Seats: ${operationsData.groupTourOperations.capacitySummary.totalAvailable}`}
                            >
                              Available
                            </div>
                          )}
                        </div>

                        {/* Capacity Stats Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                          <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700">Total Booked</span>
                            <span className="text-xs font-black text-indigo-700">
                              {operationsData.groupTourOperations.capacitySummary.totalBooked}
                            </span>
                          </div>
                          <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700">Total Available</span>
                            <span className="text-xs font-black text-emerald-700">
                              {operationsData.groupTourOperations.capacitySummary.totalAvailable}
                            </span>
                          </div>
                          <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-100 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700">Fully Booked</span>
                            <span className="text-xs font-black text-rose-700">
                              {operationsData.groupTourOperations.capacitySummary.fullyBookedCount} tours
                            </span>
                          </div>
                          <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700">Partially Available</span>
                            <span className="text-xs font-black text-amber-700">
                              {operationsData.groupTourOperations.capacitySummary.partiallyAvailableCount} tours
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-400 text-xs italic py-6 text-center">
                        No capacity data available for this filter period.
                      </p>
                    )}
                  </div>

                  {/* Group Tour Destination Demand Table */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
                    <div>
                      <h3 className="text-base font-black text-slate-900 flex items-center border-b border-slate-100 pb-3">
                        <MapPin className="w-5 h-5 text-purple-600 mr-2" /> Group Tour Destination Demand
                      </h3>

                      {operationsData?.groupTourOperations?.destinationDemand?.length > 0 ? (
                        <div className="space-y-3 mt-4">
                          {operationsData.groupTourOperations.destinationDemand.map((dest: any, idx: number) => {
                            const occupancy = dest.capacity > 0 ? Math.round((dest.booked / dest.capacity) * 100) : 0;
                            return (
                              <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                                <div className="flex justify-between items-center text-xs font-bold">
                                  <span className="text-slate-900">{dest.destination}</span>
                                  <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                                    {dest.departuresCount} {dest.departuresCount === 1 ? 'departure' : 'departures'}
                                  </span>
                                </div>
                                <div className="flex justify-between text-xs text-slate-500">
                                  <span>Booked: <strong className="text-slate-800">{dest.booked}/{dest.capacity}</strong> ({occupancy}%)</span>
                                  <span>Available: <strong className="text-emerald-600">{dest.available}</strong></span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-slate-400 text-xs italic py-6 text-center">
                          No destination demand data for this filter period.
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 text-xs text-slate-400 flex justify-between items-center">
                      <span>Group Revenue Est:</span>
                      <span className="font-bold text-emerald-600 text-sm">
                        ₹{Number(operationsData?.groupTourOperations?.summary?.totalEstimatedRevenue || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
