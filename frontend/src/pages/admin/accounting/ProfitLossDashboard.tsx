import React, { useState, useEffect } from 'react';
import { Loader2, TrendingUp, TrendingDown, DollarSign, ArrowRight, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';

export default function ProfitLossDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('YTD');
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
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
      
      const res = await api.get(`/accounting/pnl/dashboard${query}`);
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

  const isProfitable = data?.profitability?.netProfit >= 0;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Profit & Loss</h1>
          <p className="text-slate-500 mt-1">Financial performance overview</p>
        </div>
        <div className="flex space-x-3 items-center">
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
            onClick={() => navigate('/admin/accounting/pnl/statement')}
            className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium flex items-center"
          >
            Detailed Statement <ArrowRight className="w-4 h-4 ml-2" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-sm font-semibold text-slate-500 mb-1">Total Revenue</p>
          <h2 className="text-2xl font-black text-slate-900">{formatCurrency(data?.revenue?.total)}</h2>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-sm font-semibold text-slate-500 mb-1">Total Expenses</p>
          <h2 className="text-2xl font-black text-amber-600">{formatCurrency(data?.expenses?.total)}</h2>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-sm font-semibold text-slate-500 mb-1">Gross Profit</p>
          <h2 className="text-2xl font-black text-blue-600">{formatCurrency(data?.profitability?.grossProfit)}</h2>
        </div>

        <div className={`p-6 rounded-2xl shadow-sm border ${isProfitable ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex justify-between items-start">
            <div>
              <p className={`text-sm font-semibold mb-1 ${isProfitable ? 'text-emerald-700' : 'text-red-700'}`}>Net Profit</p>
              <h2 className={`text-2xl font-black ${isProfitable ? 'text-emerald-700' : 'text-red-700'}`}>
                {formatCurrency(data?.profitability?.netProfit)}
              </h2>
            </div>
            <div className={`p-2 rounded-lg ${isProfitable ? 'bg-emerald-100' : 'bg-red-100'}`}>
              {isProfitable ? <TrendingUp className="w-5 h-5 text-emerald-700" /> : <TrendingDown className="w-5 h-5 text-red-700" />}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Revenue Breakdown */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Revenue Breakdown</h3>
          <div className="space-y-4">
            {Object.entries(data?.revenue?.breakdown || {}).map(([key, value]: any) => (
              <div key={key} className="flex justify-between items-center">
                <span className="text-slate-600 font-medium capitalize">{key.replace(/_/g, ' ')}</span>
                <span className="font-bold text-slate-900">{formatCurrency(value)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Expense Breakdown */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Top Expense Categories</h3>
          <div className="space-y-4">
            {Object.entries(data?.expenses?.breakdown || {})
              .sort(([,a]: any, [,b]: any) => b - a)
              .slice(0, 5)
              .map(([key, value]: any) => (
              <div key={key} className="flex justify-between items-center">
                <span className="text-slate-600 font-medium truncate pr-4">{key}</span>
                <span className="font-bold text-slate-900">{formatCurrency(value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
