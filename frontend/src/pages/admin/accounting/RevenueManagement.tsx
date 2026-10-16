import React, { useEffect, useState } from 'react';
import { revenueService } from '../../../services/revenueService';
import RevenueSummary from '../../../components/admin/accounting/RevenueSummary';
import { RevenueTable } from '../../../components/admin/accounting/RevenueTable';
import { RevenueReportTable } from '../../../components/admin/accounting/RevenueReportTable';
import { DateRangeFilter } from '../../../components/admin/accounting/DateRangeFilter';

export const RevenueManagement = () => {
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    gstRevenue: 0,
    nonGstRevenue: 0,
    monthlyRevenue: Array(12).fill(0)
  });
  
  const [records, setRecords] = useState([]);
  const [reportData, setReportData] = useState([]);
  const [reportGroup, setReportGroup] = useState<'package' | 'customer' | 'type'>('package');
  
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(true);

  // Filters for records table
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [revenueType, setRevenueType] = useState('');

  useEffect(() => {
    fetchSummary();
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [startDate, endDate, revenueType]);

  useEffect(() => {
    fetchReports();
  }, [reportGroup]);

  const fetchSummary = async () => {
    try {
      const res = await revenueService.getRevenueSummary();
      if (res.success) {
        setSummary(res.data);
      }
    } catch (err) {
      console.error('Error fetching summary', err);
    }
  };

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (revenueType) params.revenueType = revenueType;

      const res = await revenueService.getRevenueRecords(params);
      if (res.success) {
        setRecords(res.data);
      }
    } catch (err) {
      console.error('Error fetching records', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async () => {
    setReportLoading(true);
    try {
      const res = await revenueService.getRevenueReports(reportGroup);
      if (res.success) {
        setReportData(res.data);
      }
    } catch (err) {
      console.error('Error fetching reports', err);
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Revenue Management</h1>
          <p className="text-slate-500 mt-1">Track and manage recognized revenue and reports.</p>
        </div>
      </div>

      <RevenueSummary summary={summary} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">Revenue Records</h2>
            <div className="flex flex-wrap gap-4 items-center">
              <DateRangeFilter startDate={startDate} endDate={endDate} onChange={(s, e) => { setStartDate(s); setEndDate(e); }} />
              <select 
                value={revenueType} 
                onChange={(e) => setRevenueType(e.target.value)}
                className="border border-slate-300 rounded-md shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All Types</option>
                <option value="PACKAGE">Package</option>
                <option value="CUSTOMIZED_TOUR">Customized Tour</option>
                <option value="BOOKING_SERVICE">Booking Service</option>
                <option value="OTHER_SERVICE">Other Service</option>
              </select>
            </div>
          </div>
          <RevenueTable records={records} isLoading={loading} />
        </div>

        <div className="space-y-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">Reports</h2>
            <select 
              value={reportGroup} 
              onChange={(e) => setReportGroup(e.target.value as any)}
              className="border border-slate-300 rounded-md shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="package">By Package</option>
              <option value="customer">By Customer</option>
              <option value="type">By Type</option>
            </select>
          </div>
          <RevenueReportTable data={reportData} groupBy={reportGroup} isLoading={reportLoading} />
        </div>
      </div>
    </div>
  );
};
