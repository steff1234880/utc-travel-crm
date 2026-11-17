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
      phoneNumberId?: string;
      wabaId?: string;
      hasAccessToken?: boolean;
      accessTokenMasked?: string;
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

  // WhatsApp Cloud API Form State
  const [waPhoneNumberId, setWaPhoneNumberId] = useState('');
  const [waWabaId, setWaWabaId] = useState('');
  const [waAccessToken, setWaAccessToken] = useState('');
  const [waConfigId, setWaConfigId] = useState('whatsapp_embedded_signup');
  const [waTestStatus, setWaTestStatus] = useState<any | null>(null);

  // Quick Action / Testing states
  const [testPhone, setTestPhone] = useState('+18005558821');
  const [testMsg, setTestMsg] = useState('Hello from UTC Travel CRM! Your holiday inquiry is in progress.');
  const [testLeadName, setTestLeadName] = useState('John Doe');
  const [testLeadEmail, setTestLeadEmail] = useState('johndoe@example.com');
  const [testLeadPhone, setTestLeadPhone] = useState('+14155550199');
  const [testPlatform, setTestPlatform] = useState<'FACEBOOK' | 'INSTAGRAM'>('FACEBOOK');
  const [isEmbeddedSigningUp, setIsEmbeddedSigningUp] = useState(false);
  const [isConnectingInstagram, setIsConnectingInstagram] = useState(false);
  const [isConnectingFacebook, setIsConnectingFacebook] = useState(false);

  // Real Meta OAuth flow for Facebook Page (Lead Ads & Messenger)
  const launchFacebookOAuth = async () => {
    if (!appId) {
      setNotification({ type: 'error', message: 'Meta App ID must be configured in settings before connecting Facebook Page.' });
      return;
    }

    setIsConnectingFacebook(true);
    try {
      const redirectUri = typeof window !== 'undefined' ? `${window.location.origin}/admin/settings?tab=meta` : '';
      const res = await api.get(`/meta/oauth/url?platform=FACEBOOK&redirectUri=${encodeURIComponent(redirectUri)}`);
      if (res.data.success && res.data.data.authUrl) {
        const authUrl = res.data.data.authUrl;
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;
        const popup = window.open(
          authUrl,
          'MetaOAuthPopup',
          `toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=yes, resizable=yes, copyhistory=no, width=${width}, height=${height}, top=${top}, left=${left}`
        );

        if (!popup) {
          window.location.href = authUrl;
          return;
        }

        const pollTimer = window.setInterval(() => {
          try {
            if (popup.closed) {
              window.clearInterval(pollTimer);
              setIsConnectingFacebook(false);
              queryClient.invalidateQueries({ queryKey: ['meta-config'] });
            }
          } catch (e) {
            // Cross-origin restriction while browsing Meta
          }
        }, 1000);
      } else {
        setNotification({ type: 'error', message: res.data.message || 'Failed to generate Facebook authorization URL.' });
        setIsConnectingFacebook(false);
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err?.response?.data?.message || 'Error initializing Facebook OAuth.' });
      setIsConnectingFacebook(false);
    }
  };

  // Real Meta OAuth flow for Instagram Professional Account
  const launchInstagramOAuth = async () => {
    if (!appId) {
      setNotification({ type: 'error', message: 'Meta App ID must be configured before connecting Instagram.' });
      return;
    }

    setIsConnectingInstagram(true);
    try {
      const redirectUri = typeof window !== 'undefined' ? `${window.location.origin}/admin/settings?tab=meta` : '';
      const res = await api.get(`/meta/oauth/url?platform=INSTAGRAM&redirectUri=${encodeURIComponent(redirectUri)}`);
      if (res.data.success && res.data.data.authUrl) {
        const authUrl = res.data.data.authUrl;
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;
        const popup = window.open(
          authUrl,
          'MetaOAuthPopup',
          `toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=yes, resizable=yes, copyhistory=no, width=${width}, height=${height}, top=${top}, left=${left}`
        );

        if (!popup) {
          window.location.href = authUrl;
          return;
        }

        const pollTimer = window.setInterval(() => {
          try {
            if (popup.closed) {
              window.clearInterval(pollTimer);
              setIsConnectingInstagram(false);
              queryClient.invalidateQueries({ queryKey: ['meta-config'] });
            }
          } catch (e) {
            // Cross-origin restriction while browsing Meta
          }
        }, 1000);
      } else {
        setNotification({ type: 'error', message: res.data.message || 'Failed to generate Instagram authorization URL.' });
        setIsConnectingInstagram(false);
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err?.response?.data?.message || 'Error initializing Instagram OAuth.' });
      setIsConnectingInstagram(false);
    }
  };

  // Meta JavaScript SDK / Embedded Signup Launcher
  const launchEmbeddedSignup = () => {
    if (!appId) {
      setNotification({ type: 'error', message: 'Meta App ID is required before launching Embedded Signup. Please save your Meta App ID in the settings above.' });
      return;
    }

    setIsEmbeddedSigningUp(true);

    // Ensure Meta FB SDK script is present
    const initAndLogin = () => {
      const fb = (window as any).FB;
      if (!fb) {
        setNotification({ type: 'error', message: 'Meta JavaScript SDK failed to load. Please check your browser connection or content blocker.' });
        setIsEmbeddedSigningUp(false);
        return;
      }

      try {
        fb.init({
          appId: appId,
          autoLogAppEvents: true,
          xfbml: true,
          version: 'v21.0',
        });

        fb.login(
          (response: any) => {
            if (response?.authResponse?.code) {
              // Send authorization code to backend for token exchange and WABA discovery
              api.post('/meta/oauth/callback', {
                code: response.authResponse.code,
                platform: 'WHATSAPP',
                state: 'state_' + Date.now(),
              })
              .then((res: any) => {
                setNotification({
                  type: 'success',
                  message: `WhatsApp Embedded Signup successful! Connected Phone: ${res.data?.data?.phoneNumber || 'Ready'}`
                });
                queryClient.invalidateQueries({ queryKey: ['meta-config'] });
              })
              .catch((err: any) => {
                setNotification({
                  type: 'error',
                  message: err.response?.data?.message || 'Embedded Signup exchange failed. Please ensure the Meta App ID and Secret are configured.'
                });
              })
              .finally(() => setIsEmbeddedSigningUp(false));
            } else {
              setIsEmbeddedSigningUp(false);
              if (response?.status !== 'connected') {
                setNotification({ type: 'info', message: 'WhatsApp Embedded Signup was closed or cancelled.' });
              }
            }
          },
          {
            config_id: waConfigId || 'whatsapp_embedded_signup',
            response_type: 'code',
            override_default_response_type: true,
            extras: {
              setup: {
                coexistence: true,
              }
            }
          }
        );
      } catch (sdkInitErr: any) {
        setIsEmbeddedSigningUp(false);
        setNotification({ type: 'error', message: sdkInitErr?.message || 'Failed to initialize Meta Facebook SDK' });
      }
    };

    if (!(window as any).FB) {
      const existingScript = document.getElementById('facebook-jssdk');
      if (existingScript) {
        existingScript.remove();
      }
      const script = document.createElement('script');
      script.id = 'facebook-jssdk';
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setTimeout(initAndLogin, 50);
      };
      script.onerror = () => {
        setNotification({ type: 'error', message: 'Failed to load Meta JavaScript SDK script. Please disable ad-blockers and try again.' });
        setIsEmbeddedSigningUp(false);
      };
      document.body.appendChild(script);
    } else {
      initAndLogin();
    }
  };

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
      if (res.data.data.connections?.whatsapp) {
        const wa = res.data.data.connections.whatsapp;
        if (wa.phoneNumberId) setWaPhoneNumberId(wa.phoneNumberId);
        if (wa.wabaId) setWaWabaId(wa.wabaId);
      }
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
        const metadata: any = {};
        if (platform === 'WHATSAPP') {
          if (waPhoneNumberId) metadata.phone_number_id = waPhoneNumberId;
          if (waWabaId) metadata.waba_id = waWabaId;
        }
        return await api.post('/meta/connect', {
          platform,
          accountId: platform === 'WHATSAPP' && waWabaId ? waWabaId : `${platform.toLowerCase()}_utc_${Date.now().toString().slice(-4)}`,
          accountName: platform === 'WHATSAPP' ? 'UTC WhatsApp Cloud API' : `UTC Travel ${platform.charAt(0) + platform.slice(1).toLowerCase()} Account`,
          accessToken: platform === 'WHATSAPP' && waAccessToken ? waAccessToken : undefined,
          metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
        });
      } else {
        return await api.post('/meta/disconnect', { platform });
      }
    },
    onSuccess: (_, vars) => {
      setNotification({
        type: 'success',
        message: `${vars.platform} account ${vars.connect ? 'configured & connected' : 'disconnected'} successfully.`,
      });
      if (vars.platform === 'WHATSAPP') setWaAccessToken('');
      queryClient.invalidateQueries({ queryKey: ['meta-config'] });
    },
    onError: (err: any) => {
      setNotification({ type: 'error', message: err?.response?.data?.message || 'Account action failed.' });
    }
  });

  // 3.1 Mutation: Test WhatsApp Cloud API Connection
  const testWaConnectionMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/meta/whatsapp/test-connection', {
        phoneNumberId: waPhoneNumberId || undefined,
        accessToken: waAccessToken || undefined,
      });
      return res.data;
    },
    onSuccess: (res: any) => {
      setWaTestStatus(res.data);
      setNotification({
        type: 'success',
        message: `WhatsApp Connection Verified! Phone: ${res.data.phoneNumber || 'N/A'}, Quality: ${res.data.qualityRating || 'N/A'}`
      });
      queryClient.invalidateQueries({ queryKey: ['meta-config'] });
    },
    onError: (err: any) => {
      setWaTestStatus(null);
      setNotification({
        type: 'error',
        message: err?.response?.data?.message || 'WhatsApp Cloud API connectivity test failed.'
      });
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
    <div className="space-y-6 sm:space-y-8 max-w-5xl w-full min-w-0">
      {/* Header & Mode Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm">
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
            {connections?.facebook?.connected ? (
              <button
                onClick={() => toggleAccountMutation.mutate({ platform: 'FACEBOOK', connect: false })}
                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-colors bg-rose-50 text-rose-600 hover:bg-rose-100"
              >
                Disconnect
              </button>
            ) : (
              <button
                onClick={launchFacebookOAuth}
                disabled={isConnectingFacebook}
                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-colors bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5"
              >
                <ExternalLink className={`w-3 h-3 ${isConnectingFacebook ? 'animate-spin' : ''}`} />
                {isConnectingFacebook ? 'Connecting...' : 'Connect Page'}
              </button>
            )}
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
            {connections?.instagram?.connected ? (
              <button
                onClick={() => toggleAccountMutation.mutate({ platform: 'INSTAGRAM', connect: false })}
                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-colors bg-rose-50 text-rose-600 hover:bg-rose-100"
              >
                Disconnect
              </button>
            ) : (
              <button
                onClick={launchInstagramOAuth}
                disabled={isConnectingInstagram}
                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-colors bg-gradient-to-r from-pink-600 to-purple-600 text-white hover:opacity-95 disabled:opacity-50 flex items-center gap-1.5"
              >
                <ExternalLink className={`w-3 h-3 ${isConnectingInstagram ? 'animate-spin' : ''}`} />
                {isConnectingInstagram ? 'Connecting...' : 'Connect Instagram'}
              </button>
            )}
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

            {/* Quick credentials overview */}
            <div className="mt-3 space-y-1 text-[11px] text-slate-600 font-mono bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <div>Phone ID: {connections?.whatsapp?.phoneNumberId || waPhoneNumberId || 'Not set'}</div>
              <div>WABA ID: {connections?.whatsapp?.wabaId || waWabaId || 'Not set'}</div>
              <div>Token: {connections?.whatsapp?.hasAccessToken ? connections.whatsapp.accessTokenMasked : 'Not configured'}</div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              {connections?.whatsapp?.connected ? 'Cloud API Ready' : 'Offline'}
            </span>
            {connections?.whatsapp?.connected ? (
              <button
                onClick={() => toggleAccountMutation.mutate({ platform: 'WHATSAPP', connect: false })}
                disabled={toggleAccountMutation.isPending}
                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-colors bg-rose-50 text-rose-600 hover:bg-rose-100 disabled:opacity-50"
              >
                {toggleAccountMutation.isPending ? 'Disconnecting...' : 'Disconnect'}
              </button>
            ) : (
              <button
                onClick={launchEmbeddedSignup}
                disabled={isEmbeddedSigningUp}
                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-colors bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
              >
                <ExternalLink className={`w-3 h-3 ${isEmbeddedSigningUp ? 'animate-spin' : ''}`} />
                {isEmbeddedSigningUp ? 'Launching Signup...' : 'Connect WhatsApp'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* WhatsApp Cloud API & Coexistence Management Card */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-emerald-100 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">WhatsApp Cloud API Configuration</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure official Meta Cloud API credentials and manage WhatsApp Business App coexistence.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={launchEmbeddedSignup}
              disabled={isEmbeddedSigningUp}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              <ExternalLink className={`w-3.5 h-3.5 ${isEmbeddedSigningUp ? 'animate-spin' : ''}`} />
              {isEmbeddedSigningUp ? 'Launching Signup...' : 'Launch Meta Embedded Signup'}
            </button>

            <button
              type="button"
              onClick={() => testWaConnectionMutation.mutate()}
              disabled={testWaConnectionMutation.isPending}
              className="px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testWaConnectionMutation.isPending ? 'animate-spin' : ''}`} />
              {testWaConnectionMutation.isPending ? 'Testing...' : 'Test WhatsApp Connection'}
            </button>
          </div>
        </div>

        {/* Coexistence Advisory Note */}
        <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4 text-xs space-y-1.5">
          <div className="flex items-center gap-2 text-blue-900 font-bold">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span>WhatsApp Business App Coexistence Support</span>
          </div>
          <p className="text-blue-800/90 leading-relaxed">
            Meta Cloud API allows using the <strong>same phone number</strong> on both the UTC CRM Cloud API and the mobile WhatsApp Business App simultaneously (where Meta eligibility and regional roll-out allow). Ensure your phone number is registered within Meta Business Manager under Coexistence mode.
          </p>
        </div>

        {/* Cloud API Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              WhatsApp Phone Number ID
            </label>
            <input
              type="text"
              value={waPhoneNumberId}
              onChange={(e) => setWaPhoneNumberId(e.target.value)}
              placeholder="e.g. 109827364519283"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              WhatsApp Business Account ID (WABA ID)
            </label>
            <input
              type="text"
              value={waWabaId}
              onChange={(e) => setWaWabaId(e.target.value)}
              placeholder="e.g. 192837465019284"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Embedded Signup Config ID
            </label>
            <input
              type="text"
              value={waConfigId}
              onChange={(e) => setWaConfigId(e.target.value)}
              placeholder="whatsapp_embedded_signup"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Permanent Token {connections?.whatsapp?.hasAccessToken && <span className="text-emerald-600 text-[10px]">({connections.whatsapp.accessTokenMasked})</span>}
            </label>
            <input
              type="password"
              value={waAccessToken}
              onChange={(e) => setWaAccessToken(e.target.value)}
              placeholder={connections?.whatsapp?.hasAccessToken ? 'Enter new token to update' : 'EAA...'}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Test Result Card */}
        {waTestStatus && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Verified WhatsApp Cloud API Endpoint</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-700 font-mono text-[11px]">
              <div>Phone: <span className="font-bold text-slate-900">{waTestStatus.phoneNumber || 'N/A'}</span></div>
              <div>Name: <span className="font-bold text-slate-900">{waTestStatus.verifiedName || 'N/A'}</span></div>
              <div>Quality: <span className="font-bold text-emerald-700">{waTestStatus.qualityRating || 'N/A'}</span></div>
              <div>Verification: <span className="font-bold text-emerald-700">{waTestStatus.codeVerificationStatus || 'VERIFIED'}</span></div>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={() => toggleAccountMutation.mutate({ platform: 'WHATSAPP', connect: true })}
            disabled={toggleAccountMutation.isPending}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors disabled:opacity-50 shadow-sm"
          >
            {toggleAccountMutation.isPending ? 'Saving...' : 'Save WhatsApp API Credentials'}
          </button>
        </div>
      </div>

      {/* 2. Webhook & Endpoint Details */}
      <div className="bg-slate-900 text-slate-200 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-800 shadow-md w-full min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
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
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-2xs space-y-6 w-full min-w-0">
        <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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

        <div className="flex flex-col sm:flex-row justify-end pt-2 gap-3">
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
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-2xs space-y-4 w-full min-w-0">
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
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-2xs space-y-4 w-full min-w-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Meta Lead Ad Simulator</h3>
          </div>
          <p className="text-xs text-slate-500">
            Simulate a Facebook / Instagram Lead Ad submission to test auto-import and assignment.
          </p>

          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-2xs space-y-4 w-full min-w-0">
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

