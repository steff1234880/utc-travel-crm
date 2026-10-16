import React, { useEffect, useState } from 'react';
import api from '../../../services/api';
import { Lock, Shield, Save, CheckCircle2, Clock, Upload, AlertCircle, RefreshCw } from 'lucide-react';

export default function SecuritySettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [settings, setSettings] = useState({
    passwordMinLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    sessionTimeoutMins: 120,
    maxLoginAttempts: 5,
    lockoutDurationMins: 15,
    auditLoggingEnabled: true,
    maxFileUploadMb: 10,
    allowedFileTypes: 'pdf,doc,docx,jpg,jpeg,png,webp,csv,xlsx'
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/security/settings');
      if (data.data) {
        setSettings(data.data);
      }
    } catch (err: any) {
      console.error('Failed to load security settings', err);
      setErrorMsg('Failed to load system security settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const { data } = await api.patch('/security/settings', settings);
      if (data.success) {
        setSuccessMsg('Security configuration policy updated successfully');
        if (data.data) setSettings(data.data);
      }
    } catch (err: any) {
      console.error('Failed to update security settings', err);
      setErrorMsg(err?.response?.data?.error || 'Failed to update security settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto text-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
        <p className="text-gray-500 text-sm">Loading security configuration...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Lock className="w-8 h-8 text-blue-600" /> Security Settings & Policies
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure system password policies, session timeouts, lockout limits, and audit tracking parameters.
          </p>
        </div>
        <button
          onClick={fetchSettings}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg shadow-sm transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {successMsg && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center justify-between">
          <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> {successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="font-bold text-lg">&times;</button>
        </div>
      )}

      {errorMsg && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm flex items-center justify-between">
          <span className="flex items-center gap-2"><AlertCircle className="w-4 h-4 text-red-600" /> {errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="font-bold text-lg">&times;</button>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* Password Policy Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" /> Password Security Policy
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Minimum Password Length</label>
              <input
                type="number"
                min="6"
                max="32"
                value={settings.passwordMinLength}
                onChange={(e) => setSettings({ ...settings, passwordMinLength: Number(e.target.value) })}
                className="w-full max-w-xs px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.requireUppercase}
                  onChange={(e) => setSettings({ ...settings, requireUppercase: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                Require at least one Uppercase letter (A-Z)
              </label>

              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.requireLowercase}
                  onChange={(e) => setSettings({ ...settings, requireLowercase: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                Require at least one Lowercase letter (a-z)
              </label>

              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.requireNumbers}
                  onChange={(e) => setSettings({ ...settings, requireNumbers: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                Require at least one Numeric digit (0-9)
              </label>

              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.requireSpecialChars}
                  onChange={(e) => setSettings({ ...settings, requireSpecialChars: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                Require at least one Special symbol (!@#$%)
              </label>
            </div>
          </div>
        </div>

        {/* Session & Lockout Policy Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600" /> Session Expiry & Login Lockout Policy
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Session Inactivity Timeout (Minutes)</label>
              <input
                type="number"
                min="15"
                max="1440"
                value={settings.sessionTimeoutMins}
                onChange={(e) => setSettings({ ...settings, sessionTimeoutMins: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Max Failed Login Attempts</label>
              <input
                type="number"
                min="3"
                max="10"
                value={settings.maxLoginAttempts}
                onChange={(e) => setSettings({ ...settings, maxLoginAttempts: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Account Lockout Duration (Minutes)</label>
              <input
                type="number"
                min="5"
                max="120"
                value={settings.lockoutDurationMins}
                onChange={(e) => setSettings({ ...settings, lockoutDurationMins: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Audit & Upload Settings */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
            <Upload className="w-5 h-5 text-purple-600" /> Audit Logging & File Upload Rules
          </h2>

          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm text-gray-700 font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={settings.auditLoggingEnabled}
                onChange={(e) => setSettings({ ...settings, auditLoggingEnabled: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              Enable Global System Audit Logging
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Max File Upload Limit (MB)</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={settings.maxFileUploadMb}
                  onChange={(e) => setSettings({ ...settings, maxFileUploadMb: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Allowed File Types</label>
                <input
                  type="text"
                  value={settings.allowedFileTypes}
                  onChange={(e) => setSettings({ ...settings, allowedFileTypes: e.target.value })}
                  placeholder="pdf,doc,docx,jpg,jpeg,png,webp,csv,xlsx"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {saving ? 'Saving Changes...' : 'Save Security Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
