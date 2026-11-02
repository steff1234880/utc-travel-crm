import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';
import {
  Share2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Power,
  Key,
  ShieldCheck,
  Send,
  MessageCircle,
  BarChart3,
  ExternalLink,
  Info,
  Clock,
  Sparkles,
  ChevronRight,
  Database
} from 'lucide-react';

interface MetaConfigResponse {
  config: {
    appId: string;
    appSecretMasked: string;
    hasAppSecret: boolean;
    verifyToken: string;
    pixelId: string;
    capiTokenMasked: string;
    hasCapiToken: boolean;
    testEventCode: string;
    isLive: boolean;
    autoSyncLeads: boolean;
    trackPixel: boolean;
    trackCapi: boolean;
    lastSyncAt: string | null;
    webhookStatus: string;
    webhookLastError: string | null;
  };
  connections: {
    facebook: {
      connected: boolean;
      account: any | null;
    };
    instagram: {
      connected: boolean;
      account: any | null;
    };
    whatsapp: {
      connected: boolean;
      account: any | null;
    };
  };
  accounts: any[];
}

export default function MetaIntegrationTab() {
  const queryClient = useQueryClient();

  // Local configuration form state
  const [appId, setAppId] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [pixelId, setPixelId] = useState('');
  const [capiAccessToken, setCapiAccessToken] = useState('');
  const [testEventCode, setTestEventCode] = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  const [isLive, setIsLive] = useState(false);
  const [autoSyncLeads, setAutoSyncLeads] = useState(true);
  const [trackPixel, setTrackPixel] = useState(true);
  const [trackCapi, setTrackCapi] = useState(true);

  // Quick Action / Testing states
  const [testPhone, setTestPhone] = useState('+18005558821');
  const [testMsg, setTestMsg] = useState('Hello from UTC Travel CRM! Your holiday inquiry is in progress.');
  const [testLeadName, setTestLeadName] = useState('John Doe');
  const [testLeadEmail, setTestLeadEmail] = useState('johndoe@example.com');
  const [testLeadPhone, setTestLeadPhone] = useState('+14155550199');
  const [testPlatform, setTestPlatform] = useState<'FACEBOOK' | 'INSTAGRAM'>('FACEBOOK');

  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // 1. Fetch Meta config & status
  const { data, isLoading, refetch } = useQuery<{ data: MetaConfigResponse }>({
    queryKey: ['meta-config'],
    queryFn: async () => {
      const res = await api.get('/meta/config');
      const cfg = res.data.data.config;
      setAppId(cfg.appId || '');
      setPixelId(cfg.pixelId || '');
      setTestEventCode(cfg.testEventCode || '');
      setVerifyToken(cfg.verifyToken || '');
      setIsLive(cfg.isLive);
      setAutoSyncLeads(cfg.autoSyncLeads);
      setTrackPixel(cfg.trackPixel);
      setTrackCapi(cfg.trackCapi);
      return res.data;
    },
  });

  // 2. Mutation: Save Config
  const saveConfigMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        appId,
        pixelId,
        testEventCode,
        verifyToken,
        isLive,
        autoSyncLeads,
        trackPixel,
        trackCapi,
      };
      if (appSecret) payload.appSecret = appSecret;
      if (capiAccessToken) payload.capiAccessToken = capiAccessToken;
      return await api.patch('/meta/config', payload);
    },
    onSuccess: () => {
      setNotification({ type: 'success', message: 'Meta integration settings saved successfully.' });
      setAppSecret('');
      setCapiAccessToken('');
      queryClient.invalidateQueries({ queryKey: ['meta-config'] });
    },
    onError: (err: any) => {
      setNotification({ type: 'error', message: err?.response?.data?.message || 'Failed to update configuration.' });
    }
  });

  // 3. Mutation: Connect / Disconnect Account
  const toggleAccountMutation = useMutation({
    mutationFn: async ({ platform, connect }: { platform: string; connect: boolean }) => {
      if (connect) {
        return await api.post('/meta/connect', {
          platform,
          accountId: `${platform.toLowerCase()}_utc_${Date.now().toString().slice(-4)}`,
          accountName: `UTC Travel ${platform.charAt(0) + platform.slice(1).toLowerCase()} Account`,
        });
      } else {
        return await api.post('/meta/disconnect', { platform });
      }
    },
    onSuccess: (_, vars) => {
      setNotification({
        type: 'success',
        message: `${vars.platform} account ${vars.connect ? 'connected' : 'disconnected'} successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ['meta-config'] });
    },
    onError: (err: any) => {
      setNotification({ type: 'error', message: err?.response?.data?.message || 'Account action failed.' });
    }
  });

  // 4. Mutation: Send WhatsApp Test Message
  const sendWhatsAppMutation = useMutation({
    mutationFn: async () => {
      return await api.post('/meta/whatsapp/send', {
        to: testPhone,
        text: testMsg,
      });
    },
    onSuccess: () => {
      setNotification({ type: 'success', message: 'WhatsApp test message dispatched successfully!' });
    },
    onError: (err: any) => {
      setNotification({ type: 'error', message: err?.response?.data?.message || 'WhatsApp dispatch error' });
    }
  });

  // 5. Mutation: Simulate Meta Lead Ingestion
  const simulateLeadMutation = useMutation({
    mutationFn: async () => {
      return await api.post('/meta/simulate-lead', {
        platform: testPlatform,
        fullName: testLeadName,
        email: testLeadEmail,
        phone: testLeadPhone,
        destination: 'Sri Lanka Coastal Charm & Safari',
      });
    },
    onSuccess: (res: any) => {
      setNotification({
        type: 'success',
        message: `Lead imported successfully! Ref Number: ${res.data.data.referenceNumber}. Check Enquiry Management.`,
      });
      queryClient.invalidateQueries({ queryKey: ['meta-analytics'] });
    },
    onError: (err: any) => {
      setNotification({ type: 'error', message: err?.response?.data?.message || 'Simulation error' });
    }
  });

  const configData = data?.data?.config;
  const connections = data?.data?.connections;

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header & Mode Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-6 rounded-3xl shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <Share2 className="w-6 h-6 text-blue-300" />
            <h2 className="text-xl font-black tracking-tight">Meta Business Suite Integration</h2>
          </div>
          <p className="text-blue-100/80 text-xs mt-1">
            Production-ready bridge for Facebook Lead Ads, Messenger, Instagram Business, WhatsApp Cloud API & Conversions API.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 ${
            isLive ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
            {isLive ? 'LIVE MODE' : 'DEMO / TEST MODE'}
          </div>

          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-white"
            title="Refresh status"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Notifications Banner */}
      {notification && (
        <div className={`p-4 rounded-2xl flex items-center justify-between text-xs font-bold ${
          notification.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
          notification.type === 'error' ? 'bg-rose-50 text-rose-800 border border-rose-200' :
          'bg-blue-50 text-blue-800 border border-blue-200'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600">×</button>
        </div>
      )}

      {/* 1. Account Connections Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Facebook */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-blue-600">Facebook Page</span>
              <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                connections?.facebook?.connected ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
              }`}>
                {connections?.facebook?.connected ? 'Connected' : 'Not Connected'}
              </span>
            </div>
            <p className="text-sm font-bold text-slate-800">
              {connections?.facebook?.account?.accountName || 'UTC Travel Facebook Page'}
            </p>
            <p className="text-xs text-slate-500 mt-1">Lead Ads, Messenger & Page Engagement</p>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              {connections?.facebook?.connected ? 'Auto-sync active' : 'Offline'}
            </span>
            <button
              onClick={() => toggleAccountMutation.mutate({ platform: 'FACEBOOK', connect: !connections?.facebook?.connected })}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                connections?.facebook?.connected
                  ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {connections?.facebook?.connected ? 'Disconnect' : 'Connect Page'}
            </button>
          </div>
        </div>

        {/* Instagram */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-pink-600">Instagram Business</span>
              <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                connections?.instagram?.connected ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
              }`}>
                {connections?.instagram?.connected ? 'Connected' : 'Not Connected'}
              </span>
            </div>
            <p className="text-sm font-bold text-slate-800">
              {connections?.instagram?.account?.accountName || '@utctravel.official'}
            </p>
            <p className="text-xs text-slate-500 mt-1">Direct Messages & Story Lead Ads</p>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              {connections?.instagram?.connected ? 'Auto-sync active' : 'Offline'}
            </span>
            <button
              onClick={() => toggleAccountMutation.mutate({ platform: 'INSTAGRAM', connect: !connections?.instagram?.connected })}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                connections?.instagram?.connected
                  ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                  : 'bg-gradient-to-r from-pink-600 to-purple-600 text-white hover:opacity-95'
              }`}
            >
              {connections?.instagram?.connected ? 'Disconnect' : 'Connect Instagram'}
            </button>
          </div>
        </div>

        {/* WhatsApp */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-600">WhatsApp Business</span>
              <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                connections?.whatsapp?.connected ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
              }`}>
                {connections?.whatsapp?.connected ? 'Connected' : 'Not Connected'}
              </span>
            </div>
            <p className="text-sm font-bold text-slate-800">
              {connections?.whatsapp?.account?.accountName || 'UTC WhatsApp Cloud API'}
            </p>
            <p className="text-xs text-slate-500 mt-1">2-Way Messaging & Approved Templates</p>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              {connections?.whatsapp?.connected ? 'Cloud API Ready' : 'Offline'}
            </span>
            <button
              onClick={() => toggleAccountMutation.mutate({ platform: 'WHATSAPP', connect: !connections?.whatsapp?.connected })}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                connections?.whatsapp?.connected
                  ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
            >
              {connections?.whatsapp?.connected ? 'Disconnect' : 'Connect WhatsApp'}
            </button>
          </div>
        </div>
      </div>

      {/* 2. Webhook & Endpoint Details */}
      <div className="bg-slate-900 text-slate-200 rounded-3xl p-6 border border-slate-800 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Meta App & Webhook Endpoints</h3>
          </div>
          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
            configData?.webhookStatus === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
          }`}>
            Webhook: {configData?.webhookStatus || 'INACTIVE'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
            <span className="text-slate-400 block mb-1">Webhook Callback URL:</span>
            <code className="text-indigo-300 font-mono text-[11px] select-all break-all">
              {typeof window !== 'undefined' ? `${window.location.origin}/api/meta/webhook` : 'https://api.utctravel.com/api/meta/webhook'}
            </code>
          </div>
          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
            <span className="text-slate-400 block mb-1">Webhook Verification Token:</span>
            <code className="text-emerald-300 font-mono text-[11px] select-all break-all">
              {verifyToken || 'utc_travel_meta_verify_token_2026'}
            </code>
          </div>
        </div>
        <p className="text-[11px] text-slate-400 mt-3 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-slate-300" />
          Configure these values inside Meta App Dashboard → Webhooks (Subscribe to: <code className="text-slate-200">leadgen</code>, <code className="text-slate-200">messages</code>, <code className="text-slate-200">message_reads</code>).
        </p>
      </div>

      {/* 3. Meta App Configuration Form */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-6">
        <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Meta App & Tracking Credentials</h3>
            <p className="text-xs text-slate-500 mt-0.5">Secure server-side storage for App IDs, Secrets and Conversions API tokens.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">Production Live Mode:</span>
            <input
              type="checkbox"
              checked={isLive}
              onChange={(e) => setIsLive(e.target.checked)}
              className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Meta App ID</label>
            <input
              type="text"
              value={appId}
              onChange={(e) => setAppId(e.target.value)}
              placeholder="e.g. 104928374619283"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Meta App Secret {configData?.hasAppSecret && <span className="text-emerald-600 text-[10px]">(Configured: {configData.appSecretMasked})</span>}
            </label>
            <input
              type="password"
              value={appSecret}
              onChange={(e) => setAppSecret(e.target.value)}
              placeholder={configData?.hasAppSecret ? 'Enter new secret to replace' : 'Enter Meta App Secret'}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Meta Dataset / Pixel ID</label>
            <input
              type="text"
              value={pixelId}
              onChange={(e) => setPixelId(e.target.value)}
              placeholder="e.g. 883920194857261"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Conversions API (CAPI) System User Token {configData?.hasCapiToken && <span className="text-emerald-600 text-[10px]">(Configured: {configData.capiTokenMasked})</span>}
            </label>
            <input
              type="password"
              value={capiAccessToken}
              onChange={(e) => setCapiAccessToken(e.target.value)}
              placeholder={configData?.hasCapiToken ? 'Enter new token to replace' : 'EAA...'}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">CAPI Test Event Code (Optional)</label>
            <input
              type="text"
              value={testEventCode}
              onChange={(e) => setTestEventCode(e.target.value)}
              placeholder="e.g. TEST12345 (from Meta Events Manager)"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Custom Webhook Verify Token</label>
            <input
              type="text"
              value={verifyToken}
              onChange={(e) => setVerifyToken(e.target.value)}
              placeholder="utc_travel_meta_verify_token_2026"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Feature Toggles */}
        <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-6 text-xs font-bold text-slate-700">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoSyncLeads}
              onChange={(e) => setAutoSyncLeads(e.target.checked)}
              className="w-4 h-4 accent-blue-600 rounded"
            />
            Auto-Sync Lead Ads to CRM Enquiries
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={trackPixel}
              onChange={(e) => setTrackPixel(e.target.checked)}
              className="w-4 h-4 accent-blue-600 rounded"
            />
            Browser Meta Pixel Tracking
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={trackCapi}
              onChange={(e) => setTrackCapi(e.target.checked)}
              className="w-4 h-4 accent-blue-600 rounded"
            />
            Server-Side Conversions API (CAPI) Deduplication
          </label>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={() => saveConfigMutation.mutate()}
            disabled={saveConfigMutation.isPending}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors disabled:opacity-50"
          >
            {saveConfigMutation.isPending ? 'Saving...' : 'Save Meta Configuration'}
          </button>
        </div>
      </div>

      {/* 4. Live Testing & Sandbox Tools (For verifying without client credentials) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* WhatsApp Dispatch Test */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">WhatsApp Dispatch Test</h3>
          </div>
          <p className="text-xs text-slate-500">
            Dispatch a test WhatsApp message using the configured phone number ID or simulated sandbox.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Recipient Phone Number</label>
              <input
                type="text"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Message Content</label>
              <textarea
                value={testMsg}
                onChange={(e) => setTestMsg(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
            <button
              onClick={() => sendWhatsAppMutation.mutate()}
              disabled={sendWhatsAppMutation.isPending}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {sendWhatsAppMutation.isPending ? 'Sending...' : 'Send WhatsApp Message'}
            </button>
          </div>
        </div>

        {/* Lead Ingestion Simulator */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Meta Lead Ad Simulator</h3>
          </div>
          <p className="text-xs text-slate-500">
            Simulate a Facebook / Instagram Lead Ad submission to test auto-import and assignment.
          </p>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Platform</label>
                <select
                  value={testPlatform}
                  onChange={(e) => setTestPlatform(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                >
                  <option value="FACEBOOK">Facebook Lead Ad</option>
                  <option value="INSTAGRAM">Instagram Lead Ad</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Lead Name</label>
                <input
                  type="text"
                  value={testLeadName}
                  onChange={(e) => setTestLeadName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Email</label>
                <input
                  type="email"
                  value={testLeadEmail}
                  onChange={(e) => setTestLeadEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Phone</label>
                <input
                  type="text"
                  value={testLeadPhone}
                  onChange={(e) => setTestLeadPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </div>

            <button
              onClick={() => simulateLeadMutation.mutate()}
              disabled={simulateLeadMutation.isPending}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Share2 className="w-3.5 h-3.5" />
              {simulateLeadMutation.isPending ? 'Simulating...' : 'Simulate Incoming Lead'}
            </button>
          </div>
        </div>
      </div>

      {/* 5. Client Setup & Onboarding Instructions */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Key className="w-4 h-4 text-slate-600" />
          Instructions for Client Meta Business Account Connection
        </h3>
        <ol className="list-decimal list-inside space-y-2 text-xs text-slate-600 leading-relaxed">
          <li>Create or open your Meta App at <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="text-blue-600 font-semibold underline inline-flex items-center gap-0.5">developers.facebook.com <ExternalLink className="w-3 h-3" /></a> with Business type.</li>
          <li>In <strong>App Settings → Basic</strong>, copy your <strong>App ID</strong> and <strong>App Secret</strong> into the fields above.</li>
          <li>Add <strong>Webhooks</strong> to your Meta App, enter the Callback URL and Verify Token above, and subscribe to <code>leadgen</code>, <code>messages</code>, and <code>messaging_postbacks</code>.</li>
          <li>Under <strong>WhatsApp → API Setup</strong>, generate your System User Token and Phone Number ID to enable direct WhatsApp messaging.</li>
          <li>Under <strong>Events Manager</strong>, generate your Conversions API Access Token and copy the Dataset/Pixel ID.</li>
          <li>Once client credentials are saved, toggle <strong>Production Live Mode</strong> to start live automated data flow!</li>
        </ol>
      </div>
    </div>
  );
}

