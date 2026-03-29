'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    Wifi, WifiOff, RefreshCw, CheckCircle, XCircle, AlertTriangle,
    Phone, Globe, Star, TrendingUp, Activity, Eye,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import api from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────
interface WabaSummary {
    total: number;
    // backend returns: active | connected
    active?: number;
    connected?: number;
    pending: number;
    // backend returns: suspended | disconnected
    suspended?: number;
    disconnected?: number;
    expiringSoon?: number;
    expired?: number;
}

interface WabaConnection {
    tenant_id: string;
    phone_number: string;
    display_name: string;
    tenant_name?: string;
    phone_number_id: string;
    // backend uses ACTIVE/PENDING_APPROVAL/SUSPENDED; frontend had CONNECTED/PENDING/DISCONNECTED
    status: string;
    quality_rating: string;
    connected_at: string | null;
    token_status?: string;
    days_until_token_expiry?: number | null;
}

// Fallback summary (0s, not fake data)
const EMPTY_SUMMARY: WabaSummary = { total: 0, active: 0, pending: 0, suspended: 0 };

const STATUS_CFG: Record<string, { label: string; cls: string; Icon: any }> = {
    // Backend values
    ACTIVE: { label: 'Active', cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400', Icon: CheckCircle },
    PENDING_APPROVAL: { label: 'Pending', cls: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400', Icon: AlertTriangle },
    SUSPENDED: { label: 'Suspended', cls: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400', Icon: XCircle },
    // Legacy values (kept for safety)
    CONNECTED: { label: 'Connected', cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400', Icon: CheckCircle },
    PENDING: { label: 'Pending', cls: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400', Icon: AlertTriangle },
    DISCONNECTED: { label: 'Disconnected', cls: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400', Icon: XCircle },
    TOKEN_EXPIRED: { label: 'Token Expired', cls: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400', Icon: AlertTriangle },
};

const QUALITY_CFG = {
    GREEN: { label: 'High', dot: 'bg-emerald-400', text: 'text-emerald-600 dark:text-emerald-400' },
    YELLOW: { label: 'Medium', dot: 'bg-amber-400', text: 'text-amber-600 dark:text-amber-400' },
    RED: { label: 'Low', dot: 'bg-red-400', text: 'text-red-600 dark:text-red-400' },
    UNKNOWN: { label: 'Unknown', dot: 'bg-gray-300', text: 'text-gray-400' },
} as const;

// ─── Component ───────────────────────────────────────────────────────────────
// Normalise the backend summary to a consistent shape
function normaliseSummary(raw: any): WabaSummary {
    return {
        total: raw.total ?? 0,
        active: raw.active ?? raw.connected ?? 0,
        pending: raw.pending ?? 0,
        suspended: raw.suspended ?? raw.disconnected ?? 0,
        expiringSoon: raw.expiringSoon ?? 0,
        expired: raw.expired ?? 0,
    };
}

export default function WABAMonitorPage() {
    const [summary, setSummary] = useState<WabaSummary>(EMPTY_SUMMARY);
    const [connections, setConnections] = useState<WabaConnection[]>([]);
    const [loading, setLoading] = useState(true);
    const [apiError, setApiError] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    const load = useCallback(async () => {
        setLoading(true);
        setApiError('');
        try {
            const [summaryRes, connRes] = await Promise.allSettled([
                api.get('/admin/billing/waba/summary'),
                api.get('/admin/billing/waba/connections?limit=100'),
            ]);
            if (summaryRes.status === 'fulfilled') {
                setSummary(normaliseSummary(summaryRes.value.data));
            } else {
                setApiError('WABA summary unavailable — showing 0 counts');
            }
            if (connRes.status === 'fulfilled') {
                const d = connRes.value.data;
                setConnections(Array.isArray(d) ? d : (d?.items || []));
            }
        } catch {
            setApiError('API unreachable');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const filtered = connections.filter(c =>
        statusFilter === 'ALL' || c.status === statusFilter
    );

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            <Toaster position="top-right" />

            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Wifi className="w-6 h-6 text-blue-600" />
                        WABA Monitor
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
                        WhatsApp Business API connection status across all tenants
                    </p>
                </div>
                <button onClick={load}
                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm">
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Demo Notice */}
            {apiError && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl mb-6 text-sm text-amber-700 dark:text-amber-400">
                    <Activity size={14} />
                    {apiError}
                </motion.div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                    { label: 'Total WABA', value: summary.total, icon: Globe, color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' },
                    { label: 'Active', value: summary.active ?? 0, icon: Wifi, color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' },
                    { label: 'Pending Approval', value: summary.pending, icon: AlertTriangle, color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-500' },
                    { label: 'Suspended', value: summary.suspended ?? 0, icon: WifiOff, color: 'bg-red-50 dark:bg-red-900/20 text-red-600' },
                ].map((card, i) => (
                    <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.07 }}
                        className={`${card.color.split(' ').slice(0, 2).join(' ')} rounded-2xl p-5 border border-gray-200/50 dark:border-gray-700`}>
                        <card.icon size={20} className={card.color.split(' ')[2]} />
                        {loading
                            ? <div className="h-7 w-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-3 mb-1" />
                            : <p className="text-3xl font-bold text-gray-900 dark:text-white mt-3">{card.value}</p>}
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{card.label}</p>
                    </motion.div>
                ))}
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-1 w-fit mb-6 shadow-sm">
                {[
                    { key: 'ALL', label: 'All' },
                    { key: 'ACTIVE', label: 'Active' },
                    { key: 'PENDING_APPROVAL', label: 'Pending' },
                    { key: 'SUSPENDED', label: 'Suspended' },
                ].map(({ key, label }) => (
                    <button key={key} onClick={() => setStatusFilter(key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${statusFilter === key
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                        {label}
                        {key !== 'ALL' && (
                            <span className="ml-1 text-gray-400">{connections.filter(c => c.status === key).length}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Connections Table */}
            {loading ? (
                <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 animate-pulse h-16" />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 py-16 text-center">
                    <WifiOff size={40} className="mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-400 text-sm">No WABA connections found</p>
                </div>
            ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                {['Tenant / Business', 'Phone Number', 'Status', 'Quality Rating', 'Connected On'].map(h => (
                                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {filtered.map((conn, i) => {
                                const sc = STATUS_CFG[conn.status] || STATUS_CFG.DISCONNECTED;
                                const qc = QUALITY_CFG[(conn.quality_rating as keyof typeof QUALITY_CFG)] || QUALITY_CFG.UNKNOWN;
                                return (
                                    <motion.tr key={conn.tenant_id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                        transition={{ delay: i * 0.03 }}
                                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="px-5 py-4">
                                            <p className="font-semibold text-gray-900 dark:text-white">{conn.display_name || conn.tenant_name || '—'}</p>
                                            <p className="text-xs text-gray-400 font-mono mt-0.5">{conn.tenant_id?.slice(0, 16)}…</p>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-2">
                                                <Phone size={12} className="text-gray-400" />
                                                <span className="text-gray-700 dark:text-gray-300 font-mono text-xs">{conn.phone_number || '—'}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${sc.cls}`}>
                                                <sc.Icon size={11} />
                                                {sc.label}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className={`flex items-center gap-1.5 ${qc.text}`}>
                                                <div className={`w-2 h-2 rounded-full ${qc.dot}`} />
                                                <span className="text-xs font-medium">{qc.label}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-gray-500 dark:text-gray-400 text-xs">
                                            {conn.connected_at
                                                ? new Date(conn.connected_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                                                : '—'}
                                        </td>
                                    </motion.tr>
                                );
                            })}
                        </tbody>
                    </table>
                </motion.div>
            )}
        </div>
    );
}
