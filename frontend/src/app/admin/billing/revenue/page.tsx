'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    TrendingUp, TrendingDown, DollarSign, Users, MessageSquare,
    BarChart3, RefreshCw, Calendar, Download, ArrowUpRight, ArrowDownRight,
    IndianRupee, Activity,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import api from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────
interface RevenueStats {
    totalRevenue: number;
    monthlyRevenue: number;
    weeklyRevenue: number;
    totalInvoices: number;
    paidInvoices: number;
    pendingInvoices: number;
    dpdInvoices: number;
    totalTenants: number;
    activeTenants: number;
    totalWalletBalance: number;
    avgWalletBalance: number;
    totalMessages: number;
    totalCampaigns: number;
    planBreakdown: { plan: string; count: number; revenue: number }[];
    recentPayments: { tenant: string; amount: number; date: string; invoice: string }[];
    monthlyTrend: { month: string; revenue: number; invoices: number }[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

// Demo data if API not ready
const DEMO_STATS: RevenueStats = {
    totalRevenue: 847650,
    monthlyRevenue: 124900,
    weeklyRevenue: 31200,
    totalInvoices: 342,
    paidInvoices: 298,
    pendingInvoices: 31,
    dpdInvoices: 13,
    totalTenants: 87,
    activeTenants: 74,
    totalWalletBalance: 284500,
    avgWalletBalance: 3270,
    totalMessages: 2847531,
    totalCampaigns: 1453,
    planBreakdown: [
        { plan: 'Free', count: 24, revenue: 0 },
        { plan: 'Starter', count: 31, revenue: 61969 },
        { plan: 'Growth', count: 19, revenue: 94981 },
        { plan: 'Enterprise', count: 7, revenue: 104993 },
    ],
    recentPayments: [
        { tenant: 'Bloom Retail', amount: 4999, date: new Date().toISOString(), invoice: 'INV-2024-0312' },
        { tenant: 'TechStartup Inc', amount: 14999, date: new Date().toISOString(), invoice: 'INV-2024-0311' },
        { tenant: 'Fashion House', amount: 1999, date: new Date().toISOString(), invoice: 'INV-2024-0310' },
        { tenant: 'EduPlatform', amount: 4999, date: new Date().toISOString(), invoice: 'INV-2024-0309' },
    ],
    monthlyTrend: [
        { month: 'Sep', revenue: 88400, invoices: 28 },
        { month: 'Oct', revenue: 97200, invoices: 31 },
        { month: 'Nov', revenue: 108900, invoices: 35 },
        { month: 'Dec', revenue: 118500, invoices: 38 },
        { month: 'Jan', revenue: 121000, invoices: 39 },
        { month: 'Feb', revenue: 124900, invoices: 42 },
    ],
};

// ─── Component ───────────────────────────────────────────────────────────────
export default function AdminRevenuePage() {
    const [stats, setStats] = useState<RevenueStats>(DEMO_STATS);
    const [isLiveData, setIsLiveData] = useState(false);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/admin/billing/revenue?period=${period}`);
            if (data) {
                setStats(data);
                setIsLiveData(true);
            }
        } catch {
            setIsLiveData(false);
            // Retain demo data silently
        } finally {
            setLoading(false);
        }
    }, [period]);

    useEffect(() => { load(); }, [load]);

    const maxRevenue = Math.max(...stats.monthlyTrend.map(t => t.revenue));

    const statCards = [
        { label: 'Total Revenue', value: fmt(stats.totalRevenue), sub: 'All time', icon: IndianRupee, color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', trend: '+12%' },
        { label: 'This Month', value: fmt(stats.monthlyRevenue), sub: 'vs last month', icon: TrendingUp, color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', trend: '+8%' },
        { label: 'Active Tenants', value: String(stats.activeTenants), sub: `of ${stats.totalTenants} total`, icon: Users, color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400', trend: `${stats.totalTenants - stats.activeTenants} inactive` },
        { label: 'Pending DPD', value: String(stats.dpdInvoices), sub: `${fmt(stats.pendingInvoices * 3000)} at risk`, icon: Activity, color: 'bg-red-500/10 text-red-600 dark:text-red-400', trend: 'needs action' },
        { label: 'Total Messages', value: (stats.totalMessages / 1000000).toFixed(1) + 'M', sub: 'platform-wide', icon: MessageSquare, color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', trend: '' },
        { label: 'Wallet Balances', value: fmt(stats.totalWalletBalance), sub: `avg ${fmt(stats.avgWalletBalance)}/tenant`, icon: DollarSign, color: 'bg-teal-500/10 text-teal-600 dark:text-teal-400', trend: '' },
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            <Toaster position="top-right" />

            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <BarChart3 className="w-6 h-6 text-blue-600" />
                        Revenue & Analytics
                        {!loading && (
                            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold ${isLiveData ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'}`}>
                                {isLiveData ? '● Live' : '○ Demo'}
                            </span>
                        )}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Platform-wide billing and usage metrics</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-1">
                        {(['week', 'month', 'quarter', 'year'] as const).map(p => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${period === p ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                    <button onClick={load} className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all">
                        <RefreshCw size={16} className={`text-gray-500 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
                {statCards.map((card, i) => {
                    const Icon = card.icon;
                    return (
                        <motion.div
                            key={card.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.06 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4"
                        >
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${card.color.split(' ')[0]}`}>
                                <Icon size={18} className={card.color.split(' ').slice(1).join(' ')} />
                            </div>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">{card.value}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{card.label}</p>
                            {card.trend && (
                                <p className="text-xs text-gray-400 mt-0.5">{card.sub}</p>
                            )}
                        </motion.div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

                {/* Revenue Trend Chart */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                    className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6"
                >
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-6">Monthly Revenue Trend</h3>
                    <div className="flex items-end gap-3 h-40">
                        {stats.monthlyTrend.map((t, i) => {
                            const height = maxRevenue > 0 ? (t.revenue / maxRevenue) * 100 : 0;
                            const isLast = i === stats.monthlyTrend.length - 1;
                            return (
                                <div key={t.month} className="flex-1 flex flex-col items-center gap-1">
                                    <span className="text-xs text-gray-500 font-medium">{fmt(t.revenue).replace('₹', '₹').replace(',00,000', 'L')}</span>
                                    <div className="w-full rounded-t-lg transition-all bg-blue-100 dark:bg-blue-900/20 relative" style={{ height: `${Math.max(height, 5)}%` }}>
                                        <div
                                            className={`absolute bottom-0 left-0 right-0 rounded-t-lg ${isLast ? 'bg-blue-600' : 'bg-blue-400 dark:bg-blue-500'}`}
                                            style={{ height: '100%' }}
                                        />
                                    </div>
                                    <span className="text-xs text-gray-400">{t.month}</span>
                                </div>
                            );
                        })}
                    </div>
                </motion.div>

                {/* Plan Breakdown */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                    className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6"
                >
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Plan Distribution</h3>
                    <div className="space-y-3">
                        {stats.planBreakdown.map((pb, i) => {
                            const totalTenants = stats.planBreakdown.reduce((s, p) => s + p.count, 0);
                            const pct = totalTenants > 0 ? Math.round((pb.count / totalTenants) * 100) : 0;
                            const colors = ['bg-gray-400', 'bg-blue-500', 'bg-purple-500', 'bg-emerald-500'];
                            return (
                                <div key={pb.plan}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="font-medium text-gray-700 dark:text-gray-300">{pb.plan}</span>
                                        <span className="text-gray-400">{pb.count} tenants · {pct}%</span>
                                    </div>
                                    <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full ${colors[i]}`} style={{ width: `${pct}%` }} />
                                    </div>
                                    {pb.revenue > 0 && (
                                        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">{fmt(pb.revenue)}/mo</p>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Paid Invoices</span>
                            <span className="text-emerald-600 font-medium">{stats.paidInvoices}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Pending</span>
                            <span className="text-amber-500 font-medium">{stats.pendingInvoices}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Overdue (DPD)</span>
                            <span className="text-red-500 font-medium">{stats.dpdInvoices}</span>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Recent Payments */}
            <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6"
            >
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Recent Payments</h3>
                <div className="space-y-2">
                    {stats.recentPayments.map((pay, i) => (
                        <div key={i} className="flex items-center justify-between py-3 border-b border-gray-50 dark:border-gray-700 last:border-0">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center">
                                    <ArrowUpRight size={14} className="text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{pay.tenant}</p>
                                    <p className="text-xs text-gray-400">{pay.invoice} · {fmtDate(pay.date)}</p>
                                </div>
                            </div>
                            <p className="font-bold text-emerald-600 dark:text-emerald-400">{fmt(pay.amount)}</p>
                        </div>
                    ))}
                </div>
            </motion.div>
        </div>
    );
}
