'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { whatsappService, WhatsAppStatus } from '@/lib/whatsapp-service';
import toast, { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import Cookies from 'js-cookie';
import {
    MessageSquare, CheckCircle2, AlertCircle, Loader2, Phone,
    Shield, TrendingUp, ExternalLink, RefreshCw, Settings,
    Lock, Zap, Copy, CheckCheck, WifiOff, XCircle, Info,
} from 'lucide-react';

const RAW_API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_BASE = RAW_API.endsWith('/api') ? RAW_API : `${RAW_API.replace(/\/$/, '')}/api`;

function getAuthHeaders() {
    const token = Cookies.get('token') || localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
}

// ─── Platform Not Configured Banner ──────────────────────────────────────────
function PlatformNotConfiguredCard({ missing }: { missing: string[] }) {
    const [copied, setCopied] = useState('');

    const envLines = [
        'META_APP_ID=your_meta_app_id',
        'META_APP_SECRET=your_meta_app_secret',
        'META_CONFIG_ID=your_embedded_signup_config_id',
        'META_REDIRECT_URI=https://yourdomain.com/api/whatsapp/oauth/callback',
    ].join('\n');

    const copyEnv = () => {
        navigator.clipboard.writeText(envLines);
        setCopied('env');
        setTimeout(() => setCopied(''), 2000);
    };

    return (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto space-y-6">

            {/* Header */}
            <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-2xl mb-4">
                    <Settings className="w-8 h-8 text-amber-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">WhatsApp Setup Required</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                    The platform needs Meta App credentials before you can connect a WhatsApp Business Account.
                    Your Super Admin must configure these first.
                </p>
            </div>

            {/* Missing vars */}
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 p-5">
                <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-3 flex items-center gap-2">
                    <XCircle className="w-4 h-4" /> Missing environment variables:
                </p>
                <div className="space-y-2">
                    {missing.map(v => (
                        <div key={v} className="flex items-center gap-2 text-sm font-mono text-red-800 dark:text-red-300 bg-red-100 dark:bg-red-900/40 rounded-lg px-3 py-2">
                            <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" /> {v}
                        </div>
                    ))}
                </div>
            </div>

            {/* Steps */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-600" /> Admin Setup Steps
                </h3>
                {[
                    { step: '1', title: 'Create a Meta App', desc: 'Go to developers.facebook.com → My Apps → Create App → Business type' },
                    { step: '2', title: 'Get App Credentials', desc: 'Copy your App ID and App Secret from the App Dashboard → Settings → Basic' },
                    { step: '3', title: 'Enable Embedded Signup', desc: 'Add WhatsApp product → Embedded Signup → copy Config ID' },
                    { step: '4', title: 'Set Environment Variables', desc: 'Add the values below to the backend .env file and restart the server' },
                ].map(s => (
                    <div key={s.step} className="flex gap-3">
                        <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                            {s.step}
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{s.title}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{s.desc}</p>
                        </div>
                    </div>
                ))}

                {/* Copyable .env snippet */}
                <div className="mt-2">
                    <div className="flex items-center justify-between mb-1.5">
                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                            backend/.env
                        </p>
                        <button onClick={copyEnv}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
                            {copied === 'env' ? <CheckCheck className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                            {copied === 'env' ? 'Copied!' : 'Copy'}
                        </button>
                    </div>
                    <pre className="bg-gray-900 dark:bg-gray-950 rounded-lg p-4 text-xs font-mono text-green-400 overflow-x-auto whitespace-pre-wrap">
                        {envLines}
                    </pre>
                </div>
            </div>

            {/* External links */}
            <div className="flex gap-3">
                <a href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
                    target="_blank" rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <ExternalLink className="w-4 h-4" /> WhatsApp API Docs
                </a>
                <a href="https://developers.facebook.com/apps/"
                    target="_blank" rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
                    <ExternalLink className="w-4 h-4" /> Open Meta Developer Portal
                </a>
            </div>
        </motion.div>
    );
}

// ─── Connected State ──────────────────────────────────────────────────────────
function ConnectedView({ status, onRefresh }: { status: WhatsAppStatus; onRefresh: () => void }) {
    const router = useRouter();
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-6">
            <div className="mb-2">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">WhatsApp Business API</h1>
                <p className="text-gray-500 dark:text-gray-400">Your account is connected and ready to use</p>
            </div>

            {/* Status card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-xl">
                            <CheckCircle2 className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Connected</h2>
                            <p className="text-sm text-gray-500">{status.status || 'ACTIVE'}</p>
                        </div>
                    </div>
                    <button onClick={onRefresh} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" title="Refresh">
                        <RefreshCw className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {[
                        { icon: Phone, label: 'Phone Number', val: status.phoneNumber || '—' },
                        { icon: MessageSquare, label: 'Display Name', val: status.displayName || '—' },
                        { icon: TrendingUp, label: 'Quality Rating', val: status.qualityRating || 'UNKNOWN' },
                        { icon: Shield, label: 'WABA ID', val: status.wabaId || '—' },
                    ].map(({ icon: Icon, label, val }) => (
                        <div key={label} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                            <div className="flex items-center gap-2 mb-1.5 text-sm text-gray-500">
                                <Icon className="w-4 h-4" /> {label}
                            </div>
                            <p className="font-semibold text-gray-900 dark:text-white text-sm font-mono truncate">{val}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Manage Contacts', desc: 'Add and organize your contacts', href: '/dashboard/contacts', icon: MessageSquare, color: 'text-blue-600' },
                    { label: 'Create Campaign', desc: 'Start your first campaign', href: '/dashboard/campaigns', icon: TrendingUp, color: 'text-purple-600' },
                    { label: 'Meta Business', desc: 'Manage your WABA settings', href: 'https://business.facebook.com/wa/manage/home/', icon: ExternalLink, color: 'text-green-600', external: true },
                ].map(a => (
                    <a key={a.label} href={a.href} target={a.external ? '_blank' : undefined} rel="noopener noreferrer"
                        className="p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all">
                        <a.icon className={`w-7 h-7 ${a.color} mb-3`} />
                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{a.label}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">{a.desc}</p>
                    </a>
                ))}
            </div>
        </motion.div>
    );
}

// ─── Not Connected State ──────────────────────────────────────────────────────
function NotConnectedView({ onConnect, connecting }: { onConnect: () => void; connecting: boolean }) {
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl mb-5">
                    <MessageSquare className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">Connect WhatsApp Business</h1>
                <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
                    Connect your WhatsApp Business Account through Meta's secure OAuth flow to start sending messages and running campaigns.
                </p>
            </div>

            <div className="grid grid-cols-3 gap-5 mb-10">
                {[
                    { icon: MessageSquare, color: 'bg-blue-100 text-blue-600', title: 'Send Messages', desc: 'Template messages, text, and media to your contacts' },
                    { icon: TrendingUp, color: 'bg-purple-100 text-purple-600', title: 'Run Campaigns', desc: 'Create and manage marketing campaigns at scale' },
                    { icon: Shield, color: 'bg-green-100 text-green-600', title: 'Secure & Compliant', desc: 'Meta-verified and fully compliant with WhatsApp policies' },
                ].map(f => (
                    <div key={f.title} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
                        <div className={`w-11 h-11 ${f.color} dark:opacity-80 rounded-lg flex items-center justify-center mb-3`}>
                            <f.icon className="w-5 h-5" />
                        </div>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1 text-sm">{f.title}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{f.desc}</p>
                    </div>
                ))}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 max-w-md mx-auto text-center">
                <Zap className="w-10 h-10 text-blue-600 mx-auto mb-3" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Ready to connect?</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    You'll be redirected to Meta for secure authentication. Takes less than 2 minutes.
                </p>

                <button onClick={onConnect} disabled={connecting}
                    className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-5">
                    {connecting ? <><Loader2 className="w-5 h-5 animate-spin" /> Connecting…</> : <><Lock className="w-4 h-4" /> Connect via Meta OAuth</>}
                </button>

                <div className="text-left p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-200 space-y-1.5">
                    <p className="font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                        <Info className="w-4 h-4" /> Before you connect:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                        <li>You need a verified Meta Business Account</li>
                        <li>Your WhatsApp Business number must not be used in another app</li>
                        <li>You'll be redirected to Meta for authentication</li>
                    </ul>
                </div>
            </div>
        </motion.div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function WhatsAppConnectionPage() {
    const [status, setStatus] = useState<WhatsAppStatus | null>(null);
    const [platformReady, setPlatformReady] = useState<{ ready: boolean; missing: string[] } | null>(null);
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState(false);

    const load = async () => {
        try {
            setLoading(true);
            const [readyRes, statusRes] = await Promise.allSettled([
                axios.get(`${API_BASE}/whatsapp/oauth/platform-ready`, { headers: getAuthHeaders() }),
                axios.get(`${API_BASE}/whatsapp/oauth/status`, { headers: getAuthHeaders() }),
            ]);

            if (readyRes.status === 'fulfilled') {
                setPlatformReady(readyRes.value.data);
            } else {
                setPlatformReady({ ready: false, missing: ['META_APP_ID', 'META_CONFIG_ID', 'META_APP_SECRET'] });
            }

            if (statusRes.status === 'fulfilled') {
                setStatus(statusRes.value.data);
            } else {
                setStatus({ connected: false });
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleConnect = async () => {
        try {
            setConnecting(true);
            const redirectUrl = `${window.location.origin}/dashboard/whatsapp/callback`;
            const { oauthUrl } = await whatsappService.initiateSignup(redirectUrl);
            window.location.href = oauthUrl;
        } catch (err: any) {
            const msg = err?.response?.data?.message || 'Failed to initiate connection';
            toast.error(msg, { duration: 5000 });
            setConnecting(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="text-center space-y-3">
                        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto" />
                        <p className="text-sm text-gray-400">Checking WhatsApp status…</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <Toaster position="top-right" />
            <div className="p-6 min-h-screen">
                <AnimatePresence mode="wait">
                    {/* State 1: Platform credentials not set up */}
                    {platformReady && !platformReady.ready ? (
                        <PlatformNotConfiguredCard key="not-ready" missing={platformReady.missing} />
                    ) : status?.connected ? (
                        /* State 2: Already connected */
                        <ConnectedView key="connected" status={status} onRefresh={load} />
                    ) : (
                        /* State 3: Platform ready but not yet connected */
                        <NotConnectedView key="not-connected" onConnect={handleConnect} connecting={connecting} />
                    )}
                </AnimatePresence>
            </div>
        </DashboardLayout>
    );
}
