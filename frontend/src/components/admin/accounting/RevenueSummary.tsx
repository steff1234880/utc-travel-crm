import React from 'react';
import { IndianRupee, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';

interface RevenueSummaryProps {
  summary: {
    totalRevenue: number;
    gstRevenue: number;
    nonGstRevenue: number;
    monthlyRevenue: number[];
  };
}

const RevenueSummary: React.FC<RevenueSummaryProps> = ({ summary }) => {
  const currentMonth = new Date().getMonth();
  const currentMonthRevenue = summary.monthlyRevenue?.[currentMonth] || 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-sm font-medium text-slate-500">Total Recognized Revenue</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">₹{summary.totalRevenue.toLocaleString()}</h3>
          </div>
          <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
            <IndianRupee className="w-5 h-5" />
          </div>
        </div>
        <p className="text-sm text-slate-500 mt-auto">All time collected</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-sm font-medium text-slate-500">This Month's Revenue</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">₹{currentMonthRevenue.toLocaleString()}</h3>
          </div>
          <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
        <p className="text-sm text-slate-500 mt-auto">Current month total</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-sm font-medium text-slate-500">GST Revenue</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">₹{summary.gstRevenue.toLocaleString()}</h3>
          </div>
          <div className="p-3 rounded-lg bg-purple-50 text-purple-600">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>
        <p className="text-sm text-slate-500 mt-auto">Revenue with GST included</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-sm font-medium text-slate-500">Non-GST Revenue</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">₹{summary.nonGstRevenue.toLocaleString()}</h3>
          </div>
          <div className="p-3 rounded-lg bg-orange-50 text-orange-600">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
        <p className="text-sm text-slate-500 mt-auto">B2B or Non-GST services</p>
      </div>
    </div>
  );
};

export default RevenueSummary;
