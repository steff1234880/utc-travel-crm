import React, { useState, useEffect } from 'react';
import { Settings, FileText, CheckCircle, AlertCircle, Loader2, Download, Search, Filter } from 'lucide-react';
import api from '../../../services/api';
import GSTConfigModal from './components/GSTConfigModal';

interface GSTConfig {
  isEnabled: boolean;
  defaultGstRate: number;
  gstin?: string;
  companyName?: string;
  invoicePrefix?: string;
}

export default function GSTManagement() {
  const [config, setConfig] = useState<GSTConfig | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<any>(null);
  
  const [dateRange, setDateRange] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [configRes, dashRes] = await Promise.all([
        api.get('/accounting/gst/config'),
        api.get(`/accounting/gst/dashboard?dateRange=${dateRange}`)
      ]);
      setConfig(configRes.data.data);
      setDashboard(dashRes.data.data);
    } catch (err) {
      console.error('Failed to fetch GST data', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);
  };

  if (loading && !dashboard) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">GST & Taxes</h1>
          <p className="text-slate-500 mt-1">Manage GST configurations, reports, and taxable revenue</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setShowConfig(true)}
            className="flex items-center px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
          >
            <Settings className="w-4 h-4 mr-2" />
            GST Settings
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <p className="text-sm font-semibold text-slate-500 mb-2">Total Taxable Amount</p>
          <h2 className="text-3xl font-black text-slate-900">{formatCurrency(dashboard?.totalTaxable || 0)}</h2>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <p className="text-sm font-semibold text-slate-500 mb-2">CGST Collected</p>
          <h2 className="text-3xl font-black text-slate-900">{formatCurrency(dashboard?.totalCgst || 0)}</h2>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <p className="text-sm font-semibold text-slate-500 mb-2">SGST Collected</p>
          <h2 className="text-3xl font-black text-slate-900">{formatCurrency(dashboard?.totalSgst || 0)}</h2>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <p className="text-sm font-semibold text-slate-500 mb-2">Total GST Collected</p>
          <h2 className="text-3xl font-black text-blue-600">{formatCurrency(dashboard?.totalGst || 0)}</h2>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-lg font-bold text-slate-900">GST Transactions</h3>
          <div className="flex items-center space-x-2">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600">
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider font-semibold text-slate-500">
                <th className="p-4">Transaction Ref</th>
                <th className="p-4">Date</th>
                <th className="p-4">Type</th>
                <th className="p-4">Taxable</th>
                <th className="p-4">CGST</th>
                <th className="p-4">SGST</th>
                <th className="p-4">IGST</th>
                <th className="p-4 text-right">Total GST</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dashboard?.records?.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">No GST records found</td>
                </tr>
              ) : (
                dashboard?.records?.map((record: any) => (
                  <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-medium text-slate-900">{record.transaction?.referenceNumber}</td>
                    <td className="p-4 text-slate-600 text-sm">{record.invoiceDate ? new Date(record.invoiceDate).toLocaleDateString() : 'N/A'}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold">
                        {record.transaction?.type || 'INCOME'}
                      </span>
                    </td>
                    <td className="p-4 text-slate-900">{formatCurrency(record.taxableAmount)}</td>
                    <td className="p-4 text-slate-600">{formatCurrency(record.cgst)}</td>
                    <td className="p-4 text-slate-600">{formatCurrency(record.sgst)}</td>
                    <td className="p-4 text-slate-600">{formatCurrency(record.igst)}</td>
                    <td className="p-4 text-right font-bold text-slate-900">{formatCurrency(record.totalGst)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showConfig && (
        <GSTConfigModal 
          onClose={() => setShowConfig(false)} 
          onSuccess={() => { setShowConfig(false); fetchData(); }} 
          initialData={config}
        />
      )}
    </div>
  );
}
