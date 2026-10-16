import React, { useState, useEffect } from 'react';
import { Loader2, Download, Printer } from 'lucide-react';
import api from '../../../services/api';

export default function ProfitLossStatement() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('ALL');

  useEffect(() => {
    fetchStatement();
  }, [dateRange]);

  const fetchStatement = async () => {
    try {
      setLoading(true);
      let query = '';
      const today = new Date();
      if (dateRange === 'MTD') {
        const start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
        query = `?startDate=${start}`;
      } else if (dateRange === 'YTD') {
        const start = new Date(today.getFullYear(), 0, 1).toISOString();
        query = `?startDate=${start}`;
      }
      
      const res = await api.get(`/accounting/pnl/statement${query}`);
      setData(res.data.data);
    } catch (error) {
      console.error('Failed to load P&L', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);
  };

  if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Profit & Loss Statement</h1>
          <p className="text-slate-500 mt-1">Detailed financial breakdown</p>
        </div>
        <div className="flex gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Time</option>
            <option value="YTD">Year to Date</option>
            <option value="MTD">Month to Date</option>
          </select>
          <button 
            onClick={() => window.print()}
            className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg font-medium flex items-center"
          >
            <Printer className="w-4 h-4 mr-2" /> Print
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 print:shadow-none print:border-none">
        <h2 className="text-center text-xl font-bold uppercase tracking-wider text-slate-900 mb-2">Universal Travel Company CRM</h2>
        <h3 className="text-center text-slate-500 mb-8">Profit & Loss Statement ({dateRange})</h3>

        {/* REVENUE SECTION */}
        <div className="mb-6">
          <div className="bg-slate-100 px-4 py-2 font-bold text-slate-800">INCOME</div>
          <div className="divide-y divide-slate-100">
            {Object.entries(data?.revenue?.breakdown || {}).map(([key, val]: any) => (
              <div key={key} className="flex justify-between px-4 py-3">
                <span className="text-slate-600 capitalize">{key.replace(/_/g, ' ')}</span>
                <span className="font-medium text-slate-900">{formatCurrency(val)}</span>
              </div>
            ))}
            <div className="flex justify-between px-4 py-3 bg-slate-50 font-bold border-t-2 border-slate-200">
              <span className="text-slate-800">Total Income</span>
              <span className="text-slate-900">{formatCurrency(data?.revenue?.total)}</span>
            </div>
          </div>
        </div>

        {/* DIRECT EXPENSES SECTION */}
        <div className="mb-6">
          <div className="bg-slate-100 px-4 py-2 font-bold text-slate-800">DIRECT EXPENSES (COGS)</div>
          <div className="divide-y divide-slate-100">
            {/* Mocked splitting of Direct Expenses if we had the breakdown separated, but we grouped them in backend */}
            <div className="flex justify-between px-4 py-3">
              <span className="text-slate-600">Vendor & Direct Costs</span>
              <span className="font-medium text-slate-900">{formatCurrency(data?.expenses?.directTotal)}</span>
            </div>
            <div className="flex justify-between px-4 py-3 bg-slate-50 font-bold border-t-2 border-slate-200">
              <span className="text-slate-800">Total Direct Expenses</span>
              <span className="text-slate-900">{formatCurrency(data?.expenses?.directTotal)}</span>
            </div>
          </div>
        </div>

        {/* GROSS PROFIT */}
        <div className="flex justify-between px-4 py-4 bg-blue-50 font-black text-blue-900 border-t-2 border-b-2 border-blue-200 mb-8 text-lg">
          <span>Gross Profit</span>
          <span>{formatCurrency(data?.profitability?.grossProfit)}</span>
        </div>

        {/* OPERATING EXPENSES SECTION */}
        <div className="mb-6">
          <div className="bg-slate-100 px-4 py-2 font-bold text-slate-800">OPERATING EXPENSES</div>
          <div className="divide-y divide-slate-100">
            {Object.entries(data?.expenses?.breakdown || {})
               .filter(([key]) => !['Vendor Payments', 'Transport', 'Accommodation', 'Booking-related Expenses'].includes(key))
               .map(([key, val]: any) => (
              <div key={key} className="flex justify-between px-4 py-3">
                <span className="text-slate-600">{key}</span>
                <span className="font-medium text-slate-900">{formatCurrency(val)}</span>
              </div>
            ))}
            <div className="flex justify-between px-4 py-3 bg-slate-50 font-bold border-t-2 border-slate-200">
              <span className="text-slate-800">Total Operating Expenses</span>
              <span className="text-slate-900">{formatCurrency(data?.expenses?.operatingTotal)}</span>
            </div>
          </div>
        </div>

        {/* NET PROFIT */}
        <div className={`flex justify-between px-4 py-4 font-black border-t-2 border-b-2 text-xl ${data?.profitability?.netProfit >= 0 ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-red-50 text-red-900 border-red-200'}`}>
          <span>Net Profit</span>
          <span>{formatCurrency(data?.profitability?.netProfit)}</span>
        </div>
        
        <div className="text-right mt-4 text-slate-500 font-medium">
          Profit Margin: {data?.profitability?.profitMargin}%
        </div>
      </div>
    </div>
  );
}
