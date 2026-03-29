'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Wallet, FileText, Settings, Plus, RefreshCw, Ban,
    CheckCircle, X, Save, AlertTriangle, DollarSign,
    ChevronDown, ChevronRight, TrendingUp, TrendingDown,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import api from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────
interface TenantWallet {
    tenant_id: string;
    balance: string;
    currency: string;
    low_balance_threshold: string;
    tenant?: { business_name?: string };
}

interface Invoice {
    id: string;
    invoice_number: string;
    tenant_id: string;
    total: string;
    status: 'PENDING' | 'PAID' | 'DPD' | 'CANCELLED';
    due_date: string;
    days_overdue: number;
}

interface TenantSettings {
    tenant_id: string;
    max_api_rpm: number;
    max_campaigns_per_day: number;
    max_broadcast_size: number;
    cost_per_message: number;
    is_enabled: boolean;
    disabled_reason?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);

const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const STATUS = {
    PAID: { label: 'Paid', cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' },
    PENDING: { label: 'Pending', cls: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' },
    DPD: { label: 'Overdue', cls: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400' },
    CANCELLED: { label: 'Cancelled', cls: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400' },
} as const;

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminBillingPage() {
    const [wallets, setWallets] = useState<TenantWallet[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [allSettings, setAllSettings] = useState<TenantSettings[]>([]);
    const [loading, setLoading] = useState(true);
    const [apiError, setApiError] = useState('');
    const [activeSection, setActiveSection] = useState<'wallets' | 'invoices' | 'settings'>('wallets');

    // Modals
    const [creditModal, setCreditModal] = useState<{ tenantId: string; name: string } | null>(null);
    const [creditAmount, setCreditAmount] = useState('');
    const [creditDesc, setCreditDesc] = useState('');
    const [settingsModal, setSettingsModal] = useState<TenantSettings | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setApiError('');
        try {
            const [walletRes, invRes, settingsRes] = await Promise.allSettled([
                api.get('/admin/billing/wallets'),
                api.get('/admin/billing/invoices?limit=100'),
                api.get('/admin/billing/settings'),
            ]);
            if (walletRes.status === 'fulfilled') {
                setWallets(Array.isArray(walletRes.value.data) ? walletRes.value.data : []);
            } else {
                console.warn('Wallets API failed:', (walletRes as any).reason?.response?.data);
                setWallets([]);
            }
            if (invRes.status === 'fulfilled') {
                const d = invRes.value.data;
                setInvoices(Array.isArray(d) ? d : (Array.isArray(d?.items) ? d.items : []));
            } else {
                setInvoices([]);
            }
            if (settingsRes.status === 'fulfilled') {
                setAllSettings(Array.isArray(settingsRes.value.data) ? settingsRes.value.data : []);
            } else {
                setAllSettings([]);
            }
        } catch (err: any) {
            const msg = err?.response?.data?.message || 'Failed to load billing data. Check if server is running.';
            setApiError(msg);
            toast.error('Could not reach billing API');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleCredit = async () => {
        if (!creditModal || !creditAmount || !creditDesc) return;
        try {
            await api.post(`/admin/billing/wallets/${creditModal.tenantId}/credit`, {
                amount: parseFloat(creditAmount),
                description: creditDesc,
            });
            toast.success(`Credited ₹${creditAmount} to ${creditModal.name}`);
            setCreditModal(null); setCreditAmount(''); setCreditDesc('');
            load();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Credit failed');
        }
    };

    const handleToggleEnabled = async (tenantId: string, currentEnabled: boolean) => {
        const reason = currentEnabled ? prompt('Reason for disabling tenant?') : undefined;
        if (currentEnabled && reason === null) return;
        try {
            await api.post(`/admin/billing/settings/${tenantId}/enable`, { enabled: !currentEnabled, reason });
            toast.success(`Tenant ${!currentEnabled ? 'enabled' : 'disabled'}`);
            load();
        } catch (err: any) {
            toast.error('Failed to update tenant status');
        }
    };

    const handleSaveSettings = async (tenantId: string, s: Partial<TenantSettings>) => {
        try {
            await api.patch(`/admin/billing/settings/${tenantId}`, s);
            toast.success('Settings saved');
            setSettingsModal(null);
            load();
        } catch (err: any) {
            toast.error('Failed to save settings');
        }
    };

    const handleRunDpd = async () => {
        try {
            const { data } = await api.post('/admin/billing/invoices/dpd/update');
            toast.success(data.message || 'DPD update done');
            load();
        } catch {
            toast.error('DPD update failed');
        }
    };

    const SECTIONS = [
        { key: 'wallets' as const, label: 'Wallets', icon: Wallet, count: wallets.length },
        { key: 'invoices' as const, label: 'Invoices', icon: FileText, count: invoices.length },
        { key: 'settings' as const, label: 'Rate Limits', icon: Settings, count: allSettings.length },
    ];

    // ── Summary stats for wallets
    const lowBalanceCount = wallets.filter(w => +w.balance <= +w.low_balance_threshold).length;
    const totalWalletBal = wallets.reduce((s, w) => s + +w.balance, 0);
    const dpdCount = invoices.filter(i => i.status === 'DPD').length;
    const pendingCount = invoices.filter(i => i.status === 'PENDING').length;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            <Toaster position="top-right" />

            {/* ── Header ─────────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <DollarSign className="w-6 h-6 text-blue-600" />
                        Billing Control
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
                        Credit management, invoices, and tenant rate limits
                    </p>
                </div>
                <button
                    onClick={load}
                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* ── API Error Banner ────────────────────────────────────────────── */}
            {apiError && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl mb-6">
                    <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-red-700 dark:text-red-400 font-medium text-sm">Cannot load billing data</p>
                        <p className="text-red-600/80 dark:text-red-300/70 text-xs mt-0.5">{apiError}</p>
                    </div>
                    <button onClick={load} className="ml-auto text-xs text-red-600 hover:text-red-800 underline">Retry</button>
                </motion.div>
            )}

            {/* ── Summary Cards ───────────────────────────────────────────────── */}
            {!apiError && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {[
                        { label: 'Total Wallet Balance', value: fmt(totalWalletBal), sub: `${wallets.length} tenants`, color: 'bg-blue-50 dark:bg-blue-900/20', iconCls: 'text-blue-600', Icon: Wallet },
                        { label: 'Low Balance Alerts', value: String(lowBalanceCount), sub: 'need top-up', color: lowBalanceCount > 0 ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-gray-50 dark:bg-gray-800', iconCls: lowBalanceCount > 0 ? 'text-orange-500' : 'text-gray-400', Icon: TrendingDown },
                        { label: 'Pending Invoices', value: String(pendingCount), sub: 'awaiting payment', color: 'bg-amber-50 dark:bg-amber-900/20', iconCls: 'text-amber-600', Icon: FileText },
                        { label: 'Overdue (DPD)', value: String(dpdCount), sub: 'immediate action', color: dpdCount > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-50 dark:bg-gray-800', iconCls: dpdCount > 0 ? 'text-red-600' : 'text-gray-400', Icon: AlertTriangle },
                    ].map((card, i) => (
                        <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.07 }}
                            className={`${card.color} rounded-2xl p-5 border border-gray-200/50 dark:border-gray-700`}>
                            <card.Icon size={20} className={`${card.iconCls} mb-3`} />
                            {loading
                                ? <div className="h-7 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1" />
                                : <p className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p>}
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{card.label}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{card.sub}</p>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* ── Section Tabs ─────────────────────────────────────────────────── */}
            <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-1 w-fit mb-6 shadow-sm">
                {SECTIONS.map(s => (
                    <button key={s.key} onClick={() => setActiveSection(s.key)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeSection === s.key
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}>
                        <s.icon size={14} />
                        {s.label}
                        {!loading && s.count > 0 && (
                            <span className={`px-1.5 py-0.5 rounded-full text-xs ${activeSection === s.key ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                                {s.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* ── Loading Skeleton ─────────────────────────────────────────────── */}
            {loading && (
                <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 animate-pulse">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-xl" />
                                    <div>
                                        <div className="h-4 w-32 bg-gray-100 dark:bg-gray-700 rounded mb-1.5" />
                                        <div className="h-3 w-24 bg-gray-100 dark:bg-gray-700 rounded" />
                                    </div>
                                </div>
                                <div className="h-8 w-20 bg-gray-100 dark:bg-gray-700 rounded-lg" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════
                SECTION: Wallets
            ═══════════════════════════════════════════════════════════════════ */}
            {!loading && activeSection === 'wallets' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                    {wallets.length === 0 ? (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 py-16 text-center">
                            <Wallet size={40} className="mx-auto mb-3 text-gray-300" />
                            <p className="text-gray-400 text-sm">No tenant wallets found</p>
                            <p className="text-gray-300 text-xs mt-1">Wallets are created automatically when tenants sign up</p>
                        </div>
                    ) : wallets.map((w, i) => {
                        const isLow = +w.balance <= +w.low_balance_threshold;
                        const name = (w as any).tenant?.business_name || w.tenant_id.slice(0, 12) + '…';
                        return (
                            <motion.div key={w.tenant_id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.04 }}
                                className={`bg-white dark:bg-gray-800 rounded-2xl border p-4 flex items-center justify-between ${isLow
                                    ? 'border-orange-200 dark:border-orange-800/50'
                                    : 'border-gray-200 dark:border-gray-700'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isLow ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-blue-50 dark:bg-blue-900/20'}`}>
                                        <Wallet size={18} className={isLow ? 'text-orange-500' : 'text-blue-600'} />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900 dark:text-white text-sm">{name}</p>
                                        <p className="text-xs text-gray-400 font-mono">{w.tenant_id.slice(0, 16)}…</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <p className={`text-lg font-bold ${isLow ? 'text-orange-600 dark:text-orange-400' : 'text-gray-900 dark:text-white'}`}>
                                            {fmt(+w.balance)}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {isLow && <span className="text-orange-500 font-medium">Low · </span>}
                                            Threshold: {fmt(+w.low_balance_threshold)}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setCreditModal({ tenantId: w.tenant_id, name })}
                                        className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg font-medium transition-all">
                                        <Plus size={12} /> Credit
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })}
                </motion.div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════
                SECTION: Invoices
            ═══════════════════════════════════════════════════════════════════ */}
            {!loading && activeSection === 'invoices' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className="flex justify-end mb-4">
                        <button onClick={handleRunDpd}
                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm">
                            <RefreshCw size={14} /> Run DPD Sweep
                        </button>
                    </div>
                    {invoices.length === 0 ? (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 py-16 text-center">
                            <FileText size={40} className="mx-auto mb-3 text-gray-300" />
                            <p className="text-gray-400 text-sm">No invoices found</p>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-700/50">
                                    <tr>
                                        {['Invoice', 'Tenant', 'Amount', 'Due Date', 'Status'].map(h => (
                                            <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {invoices.map((inv, i) => {
                                        const cfg = STATUS[inv.status] || STATUS.PENDING;
                                        return (
                                            <motion.tr key={inv.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                                transition={{ delay: i * 0.03 }}
                                                className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                <td className="px-5 py-4 font-mono text-gray-900 dark:text-white text-xs">{inv.invoice_number}</td>
                                                <td className="px-5 py-4 text-gray-500 dark:text-gray-400 text-xs">{inv.tenant_id.slice(0, 12)}…</td>
                                                <td className="px-5 py-4 font-semibold text-gray-900 dark:text-white">{fmt(+inv.total)}</td>
                                                <td className="px-5 py-4 text-gray-500 dark:text-gray-400 text-xs">
                                                    {fmtDate(inv.due_date)}
                                                    {inv.status === 'DPD' && inv.days_overdue > 0 && (
                                                        <span className="ml-1 text-red-500">({inv.days_overdue}d overdue)</span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.cls}`}>
                                                        {cfg.label}
                                                    </span>
                                                </td>
                                            </motion.tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </motion.div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════
                SECTION: Settings / Rate Limits
            ═══════════════════════════════════════════════════════════════════ */}
            {!loading && activeSection === 'settings' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                    {allSettings.length === 0 ? (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 py-16 text-center">
                            <Settings size={40} className="mx-auto mb-3 text-gray-300" />
                            <p className="text-gray-400 text-sm">No tenant settings found</p>
                            <p className="text-gray-300 text-xs mt-1">Settings are auto-created on first API request per tenant</p>
                        </div>
                    ) : allSettings.map((s, i) => (
                        <motion.div key={s.tenant_id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04 }}
                            className={`bg-white dark:bg-gray-800 rounded-2xl border p-5 ${!s.is_enabled
                                ? 'border-red-200 dark:border-red-800/50'
                                : 'border-gray-200 dark:border-gray-700'}`}>
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <p className="font-semibold text-gray-900 dark:text-white text-sm font-mono">{s.tenant_id.slice(0, 20)}…</p>
                                    {!s.is_enabled && (
                                        <p className="text-red-500 text-xs mt-0.5 flex items-center gap-1">
                                            <Ban size={10} /> Disabled: {s.disabled_reason}
                                        </p>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setSettingsModal(s)}
                                        className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs rounded-lg font-medium transition-all">
                                        Edit Limits
                                    </button>
                                    <button onClick={() => handleToggleEnabled(s.tenant_id, s.is_enabled)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${s.is_enabled
                                            ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400'
                                            : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400'}`}>
                                        {s.is_enabled ? <><Ban size={11} /> Disable</> : <><CheckCircle size={11} /> Enable</>}
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                {[
                                    { label: 'API Req/Min', value: s.max_api_rpm?.toLocaleString() },
                                    { label: 'Campaigns/Day', value: s.max_campaigns_per_day?.toLocaleString() },
                                    { label: 'Broadcast Size', value: s.max_broadcast_size?.toLocaleString() },
                                    { label: 'Cost/Message', value: `₹${s.cost_per_message}` },
                                ].map(f => (
                                    <div key={f.label} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
                                        <p className="text-gray-400 mb-1">{f.label}</p>
                                        <p className="font-bold text-gray-900 dark:text-white">{f.value ?? '—'}</p>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            )}

            {/* ─── Credit Modal ──────────────────────────────────────────────────── */}
            <AnimatePresence>
                {creditModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                        onClick={() => setCreditModal(null)}>
                        <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl"
                            onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Manual Credit</h3>
                                <button onClick={() => setCreditModal(null)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                                    <X size={16} className="text-gray-500" />
                                </button>
                            </div>
                            <p className="text-gray-500 text-sm mb-5">
                                Adding credits to: <span className="font-semibold text-gray-900 dark:text-white">{creditModal.name}</span>
                            </p>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Amount (₹)</label>
                                    <input type="number" value={creditAmount} onChange={e => setCreditAmount(e.target.value)}
                                        placeholder="e.g. 1000"
                                        className="w-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
                                    <input type="text" value={creditDesc} onChange={e => setCreditDesc(e.target.value)}
                                        placeholder="e.g. Manual top-up by admin"
                                        className="w-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div className="flex gap-3 pt-1">
                                    <button onClick={() => setCreditModal(null)}
                                        className="flex-1 py-2.5 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium text-sm transition-all">
                                        Cancel
                                    </button>
                                    <button onClick={handleCredit} disabled={!creditAmount || !creditDesc}
                                        className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-semibold text-sm transition-all">
                                        Credit ₹{creditAmount || '0'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── Settings Edit Modal ───────────────────────────────────────────── */}
            <AnimatePresence>
                {settingsModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                        onClick={() => setSettingsModal(null)}>
                        <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl"
                            onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-1">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Rate Limit Settings</h3>
                                <button onClick={() => setSettingsModal(null)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                                    <X size={16} className="text-gray-500" />
                                </button>
                            </div>
                            <p className="text-xs text-gray-400 font-mono mb-5">{settingsModal.tenant_id}</p>
                            <div className="space-y-4">
                                {[
                                    { key: 'max_api_rpm', label: 'Max API requests per minute', min: 1 },
                                    { key: 'max_campaigns_per_day', label: 'Max campaigns per day', min: 1 },
                                    { key: 'max_broadcast_size', label: 'Max broadcast size (contacts)', min: 1 },
                                    { key: 'cost_per_message', label: 'Cost per message (₹)', min: 0, step: 0.01 },
                                ].map(field => (
                                    <div key={field.key}>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{field.label}</label>
                                        <input type="number" min={field.min} step={(field as any).step || 1}
                                            value={(settingsModal as any)[field.key]}
                                            onChange={e => setSettingsModal(prev => prev ? { ...prev, [field.key]: parseFloat(e.target.value) } : null)}
                                            className="w-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    </div>
                                ))}
                                <div className="flex gap-3 pt-1">
                                    <button onClick={() => setSettingsModal(null)}
                                        className="flex-1 py-2.5 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium text-sm transition-all">
                                        Cancel
                                    </button>
                                    <button onClick={() => handleSaveSettings(settingsModal.tenant_id, {
                                        max_api_rpm: settingsModal.max_api_rpm,
                                        max_campaigns_per_day: settingsModal.max_campaigns_per_day,
                                        max_broadcast_size: settingsModal.max_broadcast_size,
                                        cost_per_message: settingsModal.cost_per_message,
                                    })} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-all">
                                        <Save size={14} /> Save Changes
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
