'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { motion } from 'framer-motion';
import {
    BarChart3, TrendingUp, Users, Send, MessageSquare,
    CheckCheck, Eye, ArrowUpRight, ArrowDownRight,
    RefreshCw, Loader2, AlertCircle, Calendar,
    Download, Filter, XCircle, MousePointerClick,
    Wifi, WifiOff, Star, Zap, Activity,
} from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

function getHeaders() {
    const token = Cookies.get('token') || localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface CampaignStats {
    total: number;
    draft: number;
    running: number;
    completed: number;
    paused: number;
    scheduled: number;
    failed: number;
}
interface ContactStats {
    total: number;
    active: number;
    blocked: number;
    unsubscribed: number;
    recentlyAdded: number;
}
interface Campaign {
    id: string;
    name: string;
    status: string;
    totalRecipients: number;
    sentCount: number;
    deliveredCount: number;
    readCount: number;
    failedCount: number;
    ctaCount: number;
    createdAt: string;
}

// WhatsApp phone/tier details from Meta
interface WaPhoneDetails {
    verified_name: string;
    display_phone_number: string;
    quality_rating: 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN';
    messaging_limit_tier: string; // e.g. 'TIER_1K' | 'TIER_10K' | 'TIER_100K' | 'TIER_UNLIMITED'
}

// Messaging tier → daily limit map (Meta Business Policy)
const TIER_DAILY_LIMIT: Record<string, string> = {
    TIER_NOT_STARTED: '250',
    TIER_50: '250',
    TIER_250: '250',
    TIER_1K: '1,000',
    TIER_10K: '10,000',
    TIER_100K: '100,000',
    TIER_UNLIMITED: 'Unlimited',
};

const QUALITY_CFG: Record<string, { label: string; dot: string; badge: string }> = {
    GREEN: { label: 'High Quality', dot: 'bg-emerald-400', badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' },
    YELLOW: { label: 'Medium Quality', dot: 'bg-amber-400', badge: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' },
    RED: { label: 'Low Quality', dot: 'bg-red-400', badge: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400' },
    UNKNOWN: { label: 'Not Connected', dot: 'bg-gray-300', badge: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400' },
};

type Period = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'halfyearly' | 'yearly';
const PERIODS: { value: Period; label: string }[] = [
    { value: 'daily', label: 'Today' },
    { value: 'weekly', label: 'Last 7 days' },
    { value: 'monthly', label: 'Last 30 days' },
    { value: 'quarterly', label: 'Last 3 months' },
    { value: 'halfyearly', label: 'Last 6 months' },
    { value: 'yearly', label: 'Last year' },
];

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, color, change, up, loading }: {
    label: string; value: string | number; sub?: string;
    icon: any; color: string; change?: string; up?: boolean; loading: boolean;
}) {
    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-5 h-5 text-white" />
                </div>
                {change && (
                    <span className={`flex items-center text-xs font-semibold ${up ? 'text-green-600' : 'text-red-500'}`}>
                        {up ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                        {change}
                    </span>
                )}
            </div>
            {loading
                ? <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1" />
                : <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {typeof value === 'number' ? value.toLocaleString() : value}
                </div>}
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{label}</div>
            {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
        </motion.div>
    );
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────
function SimpleBarChart({ data, labels, colors }: { data: number[]; labels: string[]; colors?: string[] }) {
    const max = Math.max(...data, 1);
    return (
        <div className="flex items-end gap-2 h-40">
            {data.map((val, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                    <div className="text-xs text-gray-500 font-medium">{val}</div>
                    <div
                        className={`w-full rounded-t-md transition-all duration-500 ${colors?.[i] || 'bg-gradient-to-t from-blue-600 to-purple-500'}`}
                        style={{ height: `${Math.round((val / max) * 100)}%`, minHeight: val > 0 ? '4px' : '0' }}
                    />
                    <div className="text-xs text-gray-400 truncate w-full text-center">{labels[i]}</div>
                </div>
            ))}
        </div>
    );
}

// ─── Status badge ─────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
    COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    RUNNING: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    SCHEDULED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    PAUSED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    FAILED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
    const [campaignStats, setCampaignStats] = useState<CampaignStats | null>(null);
    const [contactStats, setContactStats] = useState<ContactStats | null>(null);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [waPhone, setWaPhone] = useState<WaPhoneDetails | null>(null);
    const [monthlySent, setMonthlySent] = useState(0);
    const [monthlyLimit, setMonthlyLimit] = useState(0); // from plan/settings
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [period, setPeriod] = useState<Period>('monthly');
    const [downloading, setDownloading] = useState(false);
    const [statusFilter, setStatusFilter] = useState('ALL');

    const load = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            const [cs, ct, camps] = await Promise.all([
                axios.get(`${API_BASE}/campaigns/statistics`, { headers: getHeaders() }),
                axios.get(`${API_BASE}/contacts/statistics`, { headers: getHeaders() }),
                axios.get(`${API_BASE}/campaigns?limit=200`, { headers: getHeaders() }),
            ]);
            setCampaignStats(cs.data);
            setContactStats(ct.data);
            const allCampaigns: Campaign[] = camps.data.data || [];
            setCampaigns(allCampaigns);

            // ── Monthly sent count from campaigns created in current month
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const thisMonthSent = allCampaigns
                .filter(c => new Date(c.createdAt) >= startOfMonth)
                .reduce((s, c) => s + (c.sentCount || 0), 0);
            setMonthlySent(thisMonthSent);
        } catch (e: any) {
            setError(e?.response?.data?.message || 'Failed to load analytics');
        } finally {
            setLoading(false);
        }
    }, []);

    // ── Separately fetch WA phone details (may fail if not connected)
    useEffect(() => {
        axios.get(`${API_BASE}/whatsapp/messages/phone-details`, { headers: getHeaders() })
            .then(r => setWaPhone(r.data))
            .catch(() => {/* not connected is fine */ });

        // Fetch user's plan monthly message limit
        axios.get(`${API_BASE}/billing/notifications`, { headers: getHeaders() })
            .catch(() => { });
    }, []);

    useEffect(() => { load(); }, [load]);

    // Aggregates
    const totalSent = campaigns.reduce((s, c) => s + (c.sentCount || 0), 0);
    const totalDelivered = campaigns.reduce((s, c) => s + (c.deliveredCount || 0), 0);
    const totalRead = campaigns.reduce((s, c) => s + (c.readCount || 0), 0);
    const totalFailed = campaigns.reduce((s, c) => s + (c.failedCount || 0), 0);
    const totalCta = campaigns.reduce((s, c) => s + (c.ctaCount || 0), 0);

    const deliveryRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0;
    const readRate = totalDelivered > 0 ? Math.round((totalRead / totalDelivered) * 100) : 0;
    const failedRate = totalSent > 0 ? Math.round((totalFailed / totalSent) * 100) : 0;
    const ctaRate = totalSent > 0 ? Math.round((totalCta / totalSent) * 100) : 0;

    // Status filter
    const filteredCampaigns = campaigns.filter(c =>
        statusFilter === 'ALL' || c.status === statusFilter
    );

    // Chart — last 7 sent campaigns
    const chartCampaigns = [...campaigns].filter(c => c.sentCount > 0).slice(-7);

    // Download CSV
    const downloadReport = async () => {
        try {
            setDownloading(true);
            const res = await axios.get(`${API_BASE}/campaigns/analytics/report?period=${period}`,
                { headers: getHeaders(), responseType: 'blob' });
            const url = URL.createObjectURL(res.data);
            const link = document.createElement('a');
            link.href = url;
            link.download = `campaign-analytics-${period}-${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            URL.revokeObjectURL(url);
            toast.success('Report downloaded!');
        } catch { toast.error('Download failed'); }
        finally { setDownloading(false); }
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">

                {/* ── Header ──────────────────────────────────────────────── */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <BarChart3 className="w-7 h-7 text-blue-600" /> Analytics
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">Campaign performance & audience insights</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={load} disabled={loading}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" title="Refresh">
                            <RefreshCw className={`w-5 h-5 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* ── Error ───────────────────────────────────────────────── */}
                {error && (
                    <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}
                    </div>
                )}

                {/* ── Stat Cards ──────────────────────────────────────────── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard loading={loading} label="Total Campaigns" value={campaignStats?.total ?? 0}
                        sub={`${campaignStats?.running ?? 0} running`}
                        icon={BarChart3} color="from-blue-500 to-blue-600" />
                    <StatCard loading={loading} label="Total Contacts" value={contactStats?.total ?? 0}
                        sub={`${contactStats?.active ?? 0} active`}
                        icon={Users} color="from-green-500 to-green-600" />
                    <StatCard loading={loading} label="Messages Sent" value={totalSent}
                        sub={`${deliveryRate}% delivery`}
                        icon={Send} color="from-purple-500 to-purple-600" />
                    <StatCard loading={loading} label="Read Rate" value={`${readRate}%`}
                        sub={`${totalRead.toLocaleString()} reads`}
                        icon={Eye} color="from-orange-500 to-orange-600" />
                </div>

                {/* ── Extra Metrics ────────────────────────────────────────── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard loading={loading} label="Failed Messages" value={totalFailed}
                        sub={`${failedRate}% of sent`}
                        icon={XCircle} color="from-red-500 to-red-600" />
                    <StatCard loading={loading} label="CTA Clicks" value={totalCta}
                        sub={`${ctaRate}% click rate`}
                        icon={MousePointerClick} color="from-teal-500 to-cyan-600" />
                    <StatCard loading={loading} label="Delivered" value={totalDelivered}
                        sub={`${deliveryRate}% of sent`}
                        icon={CheckCheck} color="from-emerald-500 to-emerald-600" />
                    <StatCard loading={loading} label="Campaigns Running" value={campaignStats?.running ?? 0}
                        sub={`${campaignStats?.scheduled ?? 0} scheduled`}
                        icon={MessageSquare} color="from-violet-500 to-violet-600" />
                </div>

                {/* ── WhatsApp API Health + Monthly Message Usage ──────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                    {/* Monthly Usage */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                        className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-purple-600" />Monthly Message Usage
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4">
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Sent this month</p>
                                {loading
                                    ? <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                                    : <p className="text-2xl font-bold text-gray-900 dark:text-white">{monthlySent.toLocaleString()}</p>}
                                <p className="text-xs text-purple-600 dark:text-purple-400 mt-0.5">messages sent</p>
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Daily limit (WhatsApp tier)</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {waPhone ? (TIER_DAILY_LIMIT[waPhone.messaging_limit_tier] || waPhone.messaging_limit_tier) : '—'}
                                </p>
                                <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">unique users/day</p>
                            </div>
                        </div>
                        {waPhone?.messaging_limit_tier && (
                            <p className="text-xs text-gray-400 mt-3 flex items-center gap-1.5">
                                <Zap size={10} className="text-amber-500" />
                                Tier: <span className="font-semibold text-gray-600 dark:text-gray-300">
                                    {waPhone.messaging_limit_tier.replace('TIER_', '').replace('K', ',000').replace('NOT_STARTED', 'Getting Started')}
                                </span>
                                &nbsp;·&nbsp;Increase tier by maintaining high-quality rating consistently
                            </p>
                        )}
                    </motion.div>

                    {/* WhatsApp API Quality */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                        className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Wifi className="w-5 h-5 text-emerald-600" />WhatsApp API Status
                            <span className="ml-auto text-xs text-gray-400">Live from Meta</span>
                        </h3>
                        {!waPhone ? (
                            <div className="flex flex-col items-center justify-center py-6 text-center">
                                <WifiOff className="w-10 h-10 text-gray-300 mb-2" />
                                <p className="text-gray-400 text-sm">WhatsApp not connected</p>
                                <p className="text-gray-300 text-xs mt-0.5">Connect your WhatsApp Business number in Settings</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Business Identity */}
                                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                    <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center text-white font-bold text-sm">
                                        {waPhone.verified_name?.[0] || 'W'}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900 dark:text-white text-sm">{waPhone.verified_name}</p>
                                        <p className="text-xs text-gray-400">{waPhone.display_phone_number}</p>
                                    </div>
                                    <CheckCheck className="ml-auto w-4 h-4 text-emerald-500" />
                                </div>

                                {/* Quality rating */}
                                {(() => {
                                    const q = QUALITY_CFG[waPhone.quality_rating] || QUALITY_CFG.UNKNOWN;
                                    return (
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-600 dark:text-gray-400">Quality Rating</span>
                                            <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${q.badge}`}>
                                                <span className={`w-2 h-2 rounded-full ${q.dot}`} />
                                                {q.label}
                                            </span>
                                        </div>
                                    );
                                })()}

                                {/* Messaging tier */}
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Messaging Tier</span>
                                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                        {waPhone.messaging_limit_tier?.replace('TIER_', '').replace('K', ',000') || '—'} / day
                                    </span>
                                </div>

                                {/* Quality info */}
                                {waPhone.quality_rating === 'RED' && (
                                    <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-400">
                                        <AlertCircle size={12} className="shrink-0 mt-0.5" />
                                        Low quality rating may restrict sending. Reduce spam and improve message relevance.
                                    </div>
                                )}
                                {waPhone.quality_rating === 'YELLOW' && (
                                    <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-700 dark:text-amber-400">
                                        <AlertCircle size={12} className="shrink-0 mt-0.5" />
                                        Medium quality — monitor block rate and opt-outs to prevent downgrade.
                                    </div>
                                )}
                            </div>
                        )}
                    </motion.div>
                </div>

                {/* ── Chart + Funnel ───────────────────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                        className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-semibold text-gray-900 dark:text-white">Messages Sent per Campaign</h3>
                            <TrendingUp className="w-5 h-5 text-blue-600" />
                        </div>
                        {loading ? <div className="h-40 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
                            : chartCampaigns.length === 0
                                ? <div className="h-40 flex items-center justify-center text-gray-400 text-sm">No data yet — create and run campaigns</div>
                                : <SimpleBarChart
                                    data={chartCampaigns.map(c => c.sentCount)}
                                    labels={chartCampaigns.map(c => c.name.slice(0, 6) + (c.name.length > 6 ? '…' : ''))}
                                />}
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                        className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-6">Delivery Funnel</h3>
                        {loading ? <div className="space-y-4">{[1, 2, 3, 4, 5].map(i => <div key={i} className="h-7 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />)}</div>
                            : (
                                <div className="space-y-4">
                                    {[
                                        { label: 'Sent', value: totalSent, pct: 100, color: 'bg-blue-500' },
                                        { label: 'Delivered', value: totalDelivered, pct: deliveryRate, color: 'bg-green-500' },
                                        { label: 'Read', value: totalRead, pct: readRate, color: 'bg-purple-500' },
                                        { label: 'CTA', value: totalCta, pct: ctaRate, color: 'bg-teal-500' },
                                        { label: 'Failed', value: totalFailed, pct: failedRate, color: 'bg-red-400' },
                                    ].map(item => (
                                        <div key={item.label}>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="text-gray-600 dark:text-gray-400">{item.label}</span>
                                                <span className="font-semibold text-gray-900 dark:text-white">
                                                    {item.value.toLocaleString()} <span className="text-gray-400 font-normal">({item.pct}%)</span>
                                                </span>
                                            </div>
                                            <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                                <motion.div className={`h-full ${item.color} rounded-full`}
                                                    initial={{ width: 0 }} animate={{ width: `${item.pct}%` }}
                                                    transition={{ duration: 0.8, delay: 0.5 }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                    </motion.div>
                </div>

                {/* ── Status Breakdown ─────────────────────────────────────── */}
                {campaignStats && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
                        className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                        {[
                            { label: 'Draft', value: campaignStats.draft, color: 'text-gray-600 bg-gray-100 dark:bg-gray-700' },
                            { label: 'Scheduled', value: campaignStats.scheduled, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
                            { label: 'Running', value: campaignStats.running, color: 'text-green-600 bg-green-50 dark:bg-green-900/20' },
                            { label: 'Paused', value: campaignStats.paused, color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20' },
                            { label: 'Completed', value: campaignStats.completed, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' },
                            { label: 'Failed', value: campaignStats.failed, color: 'text-red-600 bg-red-50 dark:bg-red-900/20' },
                        ].map(s => (
                            <div key={s.label} className={`p-4 rounded-xl ${s.color.split(' ').slice(1).join(' ')} text-center cursor-pointer hover:opacity-80 transition-opacity`}
                                onClick={() => setStatusFilter(statusFilter === s.label.toUpperCase() ? 'ALL' : s.label.toUpperCase())}>
                                <div className={`text-2xl font-bold ${s.color.split(' ')[0]}`}>{s.value}</div>
                                <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mt-0.5">{s.label}</div>
                            </div>
                        ))}
                    </motion.div>
                )}

                {/* ── Campaign Performance Table ───────────────────────────── */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                    className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">

                    {/* Table Header Bar */}
                    <div className="p-5 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-white">Campaign Performance</h3>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {statusFilter !== 'ALL' ? `Filtered: ${statusFilter}` : `${filteredCampaigns.length} campaigns`}
                                    {statusFilter !== 'ALL' && (
                                        <button onClick={() => setStatusFilter('ALL')} className="ml-2 text-blue-500 hover:underline">Clear</button>
                                    )}
                                </p>
                            </div>

                            {/* Period Filter + Download */}
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                    <Filter className="w-4 h-4 text-gray-400" />
                                    <select value={period} onChange={e => setPeriod(e.target.value as Period)}
                                        className="text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                        {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                                    </select>
                                </div>
                                <button onClick={downloadReport} disabled={downloading}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 disabled:opacity-60 shadow-sm transition-all">
                                    {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                    Download CSV
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    {['Campaign', 'Status', 'Recipients', 'Sent', 'Delivered', 'Read', 'Failed', 'CTA', 'Read Rate', 'CTA Rate'].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {loading ? (
                                    Array.from({ length: 4 }).map((_, i) => (
                                        <tr key={i}>
                                            {Array.from({ length: 10 }).map((_, j) => (
                                                <td key={j} className="px-4 py-4">
                                                    <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded animate-pulse" />
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                ) : filteredCampaigns.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="px-6 py-12 text-center text-gray-400">
                                            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                            No campaigns found
                                        </td>
                                    </tr>
                                ) : filteredCampaigns.map(row => {
                                    const sent = row.sentCount || 0;
                                    const dlv = row.deliveredCount || 0;
                                    const failed = row.failedCount || 0;
                                    const cta = row.ctaCount || 0;
                                    const readR = dlv > 0 ? `${Math.round((row.readCount / dlv) * 100)}%` : '—';
                                    const ctaR = sent > 0 ? `${Math.round((cta / sent) * 100)}%` : '—';
                                    const failBad = sent > 0 && (failed / sent) > 0.1;

                                    return (
                                        <motion.tr key={row.id}
                                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                            className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <td className="px-4 py-4 font-medium text-gray-900 dark:text-white max-w-[180px] truncate" title={row.name}>{row.name}</td>
                                            <td className="px-4 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[row.status] || STATUS_COLORS.DRAFT}`}>
                                                    {row.status.charAt(0) + row.status.slice(1).toLowerCase()}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-gray-600 dark:text-gray-400">{(row.totalRecipients || 0).toLocaleString()}</td>
                                            <td className="px-4 py-4 text-gray-600 dark:text-gray-400">{sent.toLocaleString()}</td>
                                            <td className="px-4 py-4 text-gray-600 dark:text-gray-400">{dlv.toLocaleString()}</td>
                                            <td className="px-4 py-4 text-gray-600 dark:text-gray-400">{(row.readCount || 0).toLocaleString()}</td>
                                            {/* Failed — highlight red if > 10% */}
                                            <td className={`px-4 py-4 font-medium ${failed > 0 ? failBad ? 'text-red-600 dark:text-red-400' : 'text-orange-500 dark:text-orange-400' : 'text-gray-400'}`}>
                                                <div className="flex items-center gap-1">
                                                    {failed > 0 && <XCircle className="w-3.5 h-3.5" />}
                                                    {failed.toLocaleString()}
                                                </div>
                                            </td>
                                            {/* CTA clicks */}
                                            <td className={`px-4 py-4 font-medium ${cta > 0 ? 'text-teal-600 dark:text-teal-400' : 'text-gray-400'}`}>
                                                <div className="flex items-center gap-1">
                                                    {cta > 0 && <MousePointerClick className="w-3.5 h-3.5" />}
                                                    {cta.toLocaleString()}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 font-semibold text-gray-900 dark:text-white">{readR}</td>
                                            <td className="px-4 py-4">
                                                {ctaR !== '—'
                                                    ? <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400">{ctaR}</span>
                                                    : <span className="text-gray-400">—</span>}
                                            </td>
                                        </motion.tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Aggregate footer */}
                    {!loading && filteredCampaigns.length > 0 && (
                        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex flex-wrap gap-6 text-xs text-gray-600 dark:text-gray-400">
                            <span>Total Sent: <strong className="text-gray-900 dark:text-white">{filteredCampaigns.reduce((s, c) => s + (c.sentCount || 0), 0).toLocaleString()}</strong></span>
                            <span>Total Failed: <strong className="text-red-600 dark:text-red-400">{filteredCampaigns.reduce((s, c) => s + (c.failedCount || 0), 0).toLocaleString()}</strong></span>
                            <span>Total CTA: <strong className="text-teal-600 dark:text-teal-400">{filteredCampaigns.reduce((s, c) => s + (c.ctaCount || 0), 0).toLocaleString()}</strong></span>
                            <span>Avg. Read Rate: <strong className="text-purple-600 dark:text-purple-400">{readRate}%</strong></span>
                        </div>
                    )}
                </motion.div>
            </div>
        </DashboardLayout>
    );
}
