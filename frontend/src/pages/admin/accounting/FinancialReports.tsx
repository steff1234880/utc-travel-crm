import React, { useState } from 'react';
import { Download, FileText, PieChart, Banknote, ShieldAlert } from 'lucide-react';
import api from '../../../services/api';

export default function FinancialReports() {
  const [dateRange, setDateRange] = useState('YTD');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const handleDownload = (type: string) => {
    let query = `?type=${type}`;
    const today = new Date();

    if (dateRange === 'MTD') {
      query += `&startDate=${new Date(today.getFullYear(), today.getMonth(), 1).toISOString()}`;
    } else if (dateRange === 'YTD') {
      query += `&startDate=${new Date(today.getFullYear(), 0, 1).toISOString()}`;
    } else if (dateRange === 'CUSTOM') {
      if (customStart) query += `&startDate=${new Date(customStart).toISOString()}`;
      if (customEnd) query += `&endDate=${new Date(customEnd).toISOString()}`;
    }

    fetchDownload(type, query);
  };

  const fetchDownload = async (type: string, query: string) => {
    try {
      const res = await api.get(`/accounting/reports/export${query}`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${type}_REPORT_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Export error', error);
      alert(error.response?.data?.error || 'Failed to generate export. Please try again.');
    }
  };

  const reports = [
    { title: 'Revenue Report', type: 'REVENUE', icon: Banknote, desc: 'Detailed breakdown of collected revenue by source and customer.' },
    { title: 'Expense Report', type: 'EXPENSE', icon: PieChart, desc: 'Ledgered direct and operating expenses categorized by vendor.' },
    { title: 'Payroll Disbursements', type: 'PAYROLL', icon: FileText, desc: 'Export of all processed salaries, bonuses, and commissions.' },
    { title: 'Customer Payments', type: 'PAYMENTS', icon: ShieldAlert, desc: 'Transaction log of all successful customer payments and receipts.' }
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Financial Reports</h1>
          <p className="text-slate-500 mt-1">Export raw accounting datasets securely</p>
        </div>
        <div className="flex flex-wrap gap-3 items-center bg-white p-2 rounded-xl shadow-sm border border-slate-200">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 bg-transparent border-none focus:ring-0 font-medium text-slate-700"
          >
            <option value="ALL">All Time</option>
            <option value="YTD">Year to Date</option>
            <option value="MTD">Month to Date</option>
            <option value="CUSTOM">Custom Range</option>
          </select>

          {dateRange === 'CUSTOM' && (
            <div className="flex gap-2 border-l border-slate-200 pl-3">
              <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="text-sm border-slate-200 rounded-lg" />
              <span className="text-slate-400 self-center">to</span>
              <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="text-sm border-slate-200 rounded-lg" />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {reports.map((report) => (
          <div key={report.type} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
              <report.icon className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">{report.title}</h3>
            <p className="text-sm text-slate-500 mb-6 h-10">{report.desc}</p>
            
            <button 
              onClick={() => handleDownload(report.type)}
              className="w-full flex justify-center items-center px-4 py-3 bg-slate-900 text-white hover:bg-slate-800 rounded-xl font-medium transition-colors"
            >
              <Download className="w-4 h-4 mr-2" /> Export to CSV
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
