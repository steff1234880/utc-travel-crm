import React, { useEffect, useState } from 'react';
import api from '../../../services/api';
import { FileText, Search, Shield, Eye, RefreshCw, KeyRound, Globe, Clock, User, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

export default function AuditLogViewer() {
  const [activeTab, setActiveTab] = useState<'audit' | 'login'>('audit');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loginActivities, setLoginActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [meta, setMeta] = useState<any>({});

  // Detail Modal
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  useEffect(() => {
    if (activeTab === 'audit') {
      fetchAuditLogs();
    } else {
      fetchLoginActivities();
    }
  }, [activeTab, search, moduleFilter, statusFilter]);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/audit-logs', {
        params: { search, module: moduleFilter, status: statusFilter }
      });
      setAuditLogs(data.data || []);
      setMeta(data.meta || {});
    } catch (err) {
      console.error('Failed to fetch audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLoginActivities = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/audit-logs/login-activities', {
        params: { search, status: statusFilter }
      });
      setLoginActivities(data.data || []);
      setMeta(data.meta || {});
    } catch (err) {
      console.error('Failed to fetch login activities', err);
    } finally {
      setLoading(false);
    }
  };

  const formatJson = (val: string | null) => {
    if (!val) return 'None';
    try {
      const parsed = JSON.parse(val);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return val;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600" /> Security & Audit Logs
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Track all administrative actions, data changes, permission modifications, and user authentication events.
          </p>
        </div>
        <button
          onClick={activeTab === 'audit' ? fetchAuditLogs : fetchLoginActivities}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg shadow-sm transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6 gap-6">
        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'audit'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Shield className="w-4 h-4" /> System Audit Logs
        </button>
        <button
          onClick={() => setActiveTab('login')}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'login'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <KeyRound className="w-4 h-4" /> Login History & Authentication Logs
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={activeTab === 'audit' ? "Search by email, action, module, record ID..." : "Search by email or IP address..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {activeTab === 'audit' && (
            <input
              type="text"
              placeholder="Filter by Module..."
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="SUCCESS">Success</option>
            <option value="FAILURE">Failure</option>
            <option value="FORBIDDEN">Forbidden</option>
          </select>
        </div>
      </div>

      {/* Audit Logs Table */}
      {activeTab === 'audit' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">Module</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">Loading audit log entries...</td></tr>
                ) : auditLogs.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">No audit logs match your search.</td></tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-xs text-gray-500 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        {new Date(log.createdAt).toLocaleString()}
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">{log.userEmail || 'System'}</div>
                        {log.userRole && (
                          <span className="inline-flex text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                            {log.userRole}
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 font-semibold text-blue-700">
                        {log.action}
                      </td>

                      <td className="px-6 py-4 text-gray-700">
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200">
                          {log.module}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        {log.status === 'SUCCESS' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Success
                          </span>
                        ) : log.status === 'FORBIDDEN' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                            <AlertTriangle className="w-3.5 h-3.5" /> Forbidden
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200">
                            <XCircle className="w-3.5 h-3.5" /> Failed
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-semibold transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Login Activity Table */
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Account Email</th>
                  <th className="px-6 py-4">IP Address</th>
                  <th className="px-6 py-4">Authentication Status</th>
                  <th className="px-6 py-4">User Agent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Loading authentication logs...</td></tr>
                ) : loginActivities.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No login activity records found.</td></tr>
                ) : (
                  loginActivities.map((la) => (
                    <tr key={la.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-xs text-gray-500 font-medium">
                        {new Date(la.createdAt).toLocaleString()}
                      </td>

                      <td className="px-6 py-4 font-semibold text-gray-900">
                        {la.email}
                      </td>

                      <td className="px-6 py-4 text-xs font-mono text-gray-600">
                        <span className="inline-flex items-center gap-1 bg-gray-50 px-2 py-1 rounded border border-gray-200">
                          <Globe className="w-3 h-3 text-gray-400" /> {la.ipAddress || '127.0.0.1'}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        {la.status === 'SUCCESS' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Login Success
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200">
                            <XCircle className="w-3.5 h-3.5" /> {la.status}
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-xs text-gray-400 truncate max-w-xs" title={la.userAgent}>
                        {la.userAgent || 'Browser Client'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" /> Audit Log Detail
              </h3>
              <button onClick={() => setSelectedLog(null)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">&times;</button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase">Action</p>
                  <p className="font-bold text-blue-700 mt-0.5">{selectedLog.action}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase">Module</p>
                  <p className="font-bold text-gray-900 mt-0.5">{selectedLog.module}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase">User</p>
                  <p className="font-semibold text-gray-900 mt-0.5">{selectedLog.userEmail || 'System'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase">IP Address</p>
                  <p className="font-mono text-xs text-gray-700 mt-0.5">{selectedLog.ipAddress}</p>
                </div>
              </div>

              {selectedLog.details && (
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase mb-1">Details / Summary</p>
                  <p className="p-3 bg-blue-50/50 rounded-lg border border-blue-100 text-gray-800 text-xs">{selectedLog.details}</p>
                </div>
              )}

              {selectedLog.previousValue && (
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase mb-1">Previous State (Before Change)</p>
                  <pre className="bg-slate-900 text-emerald-400 p-3 rounded-lg text-xs overflow-x-auto font-mono">
                    {formatJson(selectedLog.previousValue)}
                  </pre>
                </div>
              )}

              {selectedLog.newValue && (
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase mb-1">New State (After Change)</p>
                  <pre className="bg-slate-900 text-emerald-400 p-3 rounded-lg text-xs overflow-x-auto font-mono">
                    {formatJson(selectedLog.newValue)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100 mt-6">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
