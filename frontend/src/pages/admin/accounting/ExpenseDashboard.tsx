import React, { useState, useEffect } from 'react';
import { Loader2, DollarSign, Clock, CheckCircle, Receipt, RefreshCcw, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function ExpenseDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.get('/accounting/expenses/dashboard');
      setData(res.data.data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);
  };

  if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Expense Dashboard</h1>
          <p className="text-slate-500 mt-1">Overview of company expenses and approvals</p>
        </div>
        <div className="space-x-3">
          <button 
            onClick={() => navigate('/admin/accounting/expenses/categories')}
            className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg font-medium"
          >
            Manage Categories
          </button>
          <button 
            onClick={() => navigate('/admin/accounting/expenses')}
            className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium flex items-center inline-flex"
          >
            All Expenses <ArrowRight className="w-4 h-4 ml-2" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-semibold text-slate-500 mb-1">Total Expenses</p>
              <h2 className="text-2xl font-black text-slate-900">{formatCurrency(data?.totalAmount)}</h2>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><DollarSign className="w-5 h-5" /></div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-semibold text-slate-500 mb-1">Pending Approval</p>
              <h2 className="text-2xl font-black text-amber-600">{formatCurrency(data?.pendingAmount)}</h2>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-lg"><Clock className="w-5 h-5" /></div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-semibold text-slate-500 mb-1">Approved (Unpaid)</p>
              <h2 className="text-2xl font-black text-indigo-600">{formatCurrency(data?.outstandingAmount)}</h2>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><Receipt className="w-5 h-5" /></div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-semibold text-slate-500 mb-1">Paid Expenses</p>
              <h2 className="text-2xl font-black text-emerald-600">{formatCurrency(data?.paidAmount)}</h2>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg"><CheckCircle className="w-5 h-5" /></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-900 mb-4">GST vs Non-GST</h3>
          <div className="h-64 flex items-center justify-center text-slate-400">
            {/* Minimal mockup for chart */}
            <div className="w-full h-full flex flex-col justify-end items-center gap-4 px-8 pb-4">
              <div className="flex w-full h-4/5 items-end justify-around">
                <div className="w-1/3 bg-blue-500 rounded-t-lg" style={{ height: '70%' }}></div>
                <div className="w-1/3 bg-slate-300 rounded-t-lg" style={{ height: '30%' }}></div>
              </div>
              <div className="flex w-full justify-around text-sm font-medium">
                <span>GST: {formatCurrency(data?.totalGstAmount)}</span>
                <span>Non-GST: {formatCurrency(data?.totalNonGstAmount)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => navigate('/admin/accounting/expenses?status=SUBMITTED')}
              className="p-4 border border-slate-200 rounded-xl hover:bg-slate-50 flex flex-col items-center justify-center gap-2 text-slate-700 font-medium"
            >
              <Clock className="w-6 h-6 text-amber-500" />
              Review Pending
            </button>
            <button 
              onClick={() => navigate('/admin/accounting/expenses?status=APPROVED')}
              className="p-4 border border-slate-200 rounded-xl hover:bg-slate-50 flex flex-col items-center justify-center gap-2 text-slate-700 font-medium"
            >
              <Receipt className="w-6 h-6 text-indigo-500" />
              Pay Approved
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
