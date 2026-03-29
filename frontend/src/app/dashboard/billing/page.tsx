'use client';

import { useEffect, useState, useRef } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import axios from 'axios';
import Cookies from 'js-cookie';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Wallet, ArrowUpRight, ArrowDownLeft, CreditCard, Clock, CheckCircle,
    XCircle, AlertCircle, RefreshCw, Plus, Send, FileText, ChevronRight,
    TrendingUp, Zap, Shield, Star, X, Eye, EyeOff, Copy, Check,
    Building2, Hash,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const getHeaders = () => ({ Authorization: `Bearer ${Cookies.get('token') || ''}` });

// ─── Types ────────────────────────────────────────────────────────────────────
interface Wallet {
    id: string;
    balance: number;
    currency: string;
    low_balance_threshold: number;
}

interface Transaction {
    id: string;
    type: 'CREDIT' | 'DEBIT';
    amount: number;
    balance_after: number;
    description: string;
    reference_type: string;
    status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'REVERSED';
    created_at: string;
}

interface Invoice {
    id: string;
    invoice_number: string;
    total: number;
    status: 'PENDING' | 'PAID' | 'DPD' | 'CANCELLED' | 'PROCESSING';
    due_date: string;
    currency: string;
    period_start: string;
    period_end: string;
}

interface TenantSettings {
    max_team_members: number;
    max_campaigns_per_day: number;
    max_broadcast_size: number;
    cost_per_message: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);
const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtDateTime = (d: string) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

// Razorpay loader
const loadRazorpay = () => new Promise<boolean>(resolve => {
    if ((window as any).Razorpay) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
});

// ─── Top-Up Amount Selector ───────────────────────────────────────────────────
const TOPUP_AMOUNTS = [500, 1000, 2000, 5000, 10000, 25000];

function TopupModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (newBalance: number) => void }) {
    const [amount, setAmount] = useState(1000);
    const [custom, setCustom] = useState('');
    const [useCustom, setUseCustom] = useState(false);
    const [loading, setLoading] = useState(false);

    const finalAmount = useCustom ? Number(custom) : amount;

    const handlePay = async () => {
        if (!finalAmount || finalAmount < 100) { toast.error('Minimum top-up is ₹100'); return; }
        setLoading(true);
        try {
            const loaded = await loadRazorpay();
            if (!loaded) { toast.error('Razorpay failed to load. Check your connection.'); setLoading(false); return; }

            const { data } = await axios.post(`${API}/billing/wallet/topup/razorpay`,
                { amount: finalAmount, description: 'Wallet top-up' },
                { headers: getHeaders() });

            const options = {
                key: data.key_id,
                amount: finalAmount * 100,
                currency: 'INR',
                name: 'Techaasvik Platform',
                description: 'Wallet Top-up',
                order_id: data.orderId,
                handler: async (resp: any) => {
                    try {
                        const verifyRes = await axios.post(`${API}/billing/wallet/topup/razorpay/verify`, {
                            razorpay_order_id: resp.razorpay_order_id,
                            razorpay_payment_id: resp.razorpay_payment_id,
                            razorpay_signature: resp.razorpay_signature,
                            amount: finalAmount,
                        }, { headers: getHeaders() });
                        toast.success(`₹${finalAmount} added to your wallet!`);
                        onSuccess(verifyRes.data.newBalance);
                    } catch {
                        toast.error('Payment verification failed. Contact support.');
                    }
                },
                prefill: {},
                theme: { color: '#4F46E5' },
            };
            new (window as any).Razorpay(options).open();
        } catch (e: any) {
            toast.error(e.response?.data?.message || 'Failed to initiate top-up');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 dark:border-gray-700">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                            <CreditCard className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">Add Funds</h3>
                            <p className="text-xs text-gray-400">Powered by Razorpay — 100% secure</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5">
                    {/* Preset amounts */}
                    <div>
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Select Amount</p>
                        <div className="grid grid-cols-3 gap-2">
                            {TOPUP_AMOUNTS.map(a => (
                                <button key={a} onClick={() => { setAmount(a); setUseCustom(false); }}
                                    className={`py-2.5 px-3 rounded-xl text-sm font-semibold border-2 transition-all ${!useCustom && amount === a
                                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400'
                                        : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-indigo-300'}`}>
                                    ₹{a.toLocaleString()}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Custom amount */}
                    <div>
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Custom Amount</p>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₹</span>
                            <input
                                type="number" min={100} placeholder="Enter amount (min ₹100)"
                                value={custom}
                                onChange={e => { setCustom(e.target.value); setUseCustom(true); }}
                                onFocus={() => setUseCustom(true)}
                                className={`w-full pl-8 pr-4 py-3 border-2 rounded-xl text-sm focus:outline-none transition-colors ${useCustom
                                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/10'
                                    : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50'} text-gray-900 dark:text-white`}
                            />
                        </div>
                    </div>

                    {/* Summary */}
                    {finalAmount >= 100 && (
                        <div className="bg-gray-50 dark:bg-gray-700/40 rounded-xl p-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Amount</span>
                                <span className="font-medium text-gray-900 dark:text-white">{fmt(finalAmount)}</span>
                            </div>
                            <div className="flex justify-between text-sm mt-1">
                                <span className="text-gray-500">Processing fee</span>
                                <span className="text-emerald-600 font-medium">₹0.00</span>
                            </div>
                            <div className="border-t border-gray-200 dark:border-gray-600 mt-2 pt-2 flex justify-between">
                                <span className="font-semibold text-gray-900 dark:text-white">Total</span>
                                <span className="font-bold text-indigo-600 dark:text-indigo-400">{fmt(finalAmount)}</span>
                            </div>
                        </div>
                    )}

                    {/* Security note */}
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Shield className="w-3.5 h-3.5" />
                        <span>Payments secured by Razorpay. We never store your card details.</span>
                    </div>
                </div>

                <div className="flex gap-3 p-6 border-t border-gray-100 dark:border-gray-700">
                    <button onClick={onClose} className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                        Cancel
                    </button>
                    <button onClick={handlePay} disabled={loading || finalAmount < 100}
                        className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
                        {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                        {loading ? 'Processing…' : `Pay ${finalAmount >= 100 ? fmt(finalAmount) : ''}`}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

// ─── Credit Request Modal ─────────────────────────────────────────────────────
function CreditRequestModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [sending, setSending] = useState(false);

    const handleSend = async () => {
        if (!amount || Number(amount) <= 0) { toast.error('Enter a valid amount'); return; }
        if (!note.trim()) { toast.error('Please provide a note for the admin'); return; }
        setSending(true);
        try {
            await axios.post(`${API}/billing/wallet/credit-request`,
                { amount: Number(amount), note },
                { headers: getHeaders() });
            toast.success('Credit request sent to admin!');
            onSuccess();
        } catch (e: any) {
            toast.error(e.response?.data?.message || 'Failed to send request');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                            <Send className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">Request Credits</h3>
                            <p className="text-xs text-gray-400">Admin will review and approve</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-300">
                        Use this to request platform wallet credits from your Super Admin. Approval is manual and may take up to 24 hours.
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Requested Amount (₹)</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₹</span>
                            <input type="number" min={100} value={amount} onChange={e => setAmount(e.target.value)}
                                placeholder="How much do you need?"
                                className="w-full pl-8 pr-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Note for Admin</label>
                        <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
                            placeholder="Explain why you need these credits (e.g., campaign launch next week)..."
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none" />
                    </div>
                </div>

                <div className="flex gap-3 p-6 border-t border-gray-100 dark:border-gray-700">
                    <button onClick={onClose} className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50">
                        Cancel
                    </button>
                    <button onClick={handleSend} disabled={sending}
                        className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
                        {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        {sending ? 'Sending…' : 'Send Request'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

// ─── Invoice Pay Modal (Razorpay) ─────────────────────────────────────────────
function InvoicePayModal({ invoice, onClose, onPaid }: {
    invoice: Invoice;
    onClose: () => void;
    onPaid: () => void;
}) {
    const [loading, setLoading] = useState(false);

    const pay = async () => {
        setLoading(true);
        try {
            const loaded = await loadRazorpay();
            if (!loaded) { toast.error('Razorpay failed to load'); setLoading(false); return; }

            const { data } = await axios.post(`${API}/billing/invoices/${invoice.id}/razorpay-order`,
                {}, { headers: getHeaders() });

            new (window as any).Razorpay({
                key: data.key_id,
                amount: data.amount * 100,
                currency: data.currency,
                name: 'Techaasvik',
                description: `Invoice ${invoice.invoice_number}`,
                order_id: data.orderId,
                handler: async (resp: any) => {
                    try {
                        await axios.post(`${API}/billing/invoices/${invoice.id}/verify-payment`, {
                            razorpay_order_id: resp.razorpay_order_id,
                            razorpay_payment_id: resp.razorpay_payment_id,
                            razorpay_signature: resp.razorpay_signature,
                        }, { headers: getHeaders() });
                        toast.success('Invoice paid successfully!');
                        onPaid();
                    } catch { toast.error('Payment verification failed'); }
                },
                theme: { color: '#4F46E5' },
            }).open();
        } catch (e: any) {
            toast.error(e.response?.data?.message || 'Failed to initiate payment');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm border border-gray-100 dark:border-gray-700">
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">Pay Invoice</h3>
                            <p className="text-xs text-gray-400">{invoice.invoice_number}</p>
                        </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/40 rounded-xl p-4 mb-5">
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-gray-500">Period</span>
                            <span className="text-gray-700 dark:text-gray-300 text-xs">{fmtDate(invoice.period_start)} – {fmtDate(invoice.period_end)}</span>
                        </div>
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-gray-500">Due Date</span>
                            <span className={`text-xs font-medium ${new Date(invoice.due_date) < new Date() ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>
                                {fmtDate(invoice.due_date)}
                            </span>
                        </div>
                        <div className="border-t border-gray-200 dark:border-gray-600 pt-2 mt-2 flex justify-between font-semibold">
                            <span>Total Due</span>
                            <span className="text-indigo-600 dark:text-indigo-400">{fmt(invoice.total)}</span>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-700 dark:text-gray-300">Cancel</button>
                        <button onClick={pay} disabled={loading}
                            className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
                            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                            {loading ? 'Opening…' : 'Pay Now'}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function BillingPage() {
    const [wallet, setWallet] = useState<Wallet | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [settings, setSettings] = useState<TenantSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const [topupOpen, setTopupOpen] = useState(false);
    const [requestOpen, setRequestOpen] = useState(false);
    const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);

    const fetchData = async () => {
        setLoading(true); setError(false);
        try {
            // Fetch each independently so one failure doesn't break everything
            const [wRes, tRes, iRes, sRes] = await Promise.allSettled([
                axios.get(`${API}/billing/wallet`, { headers: getHeaders() }),
                axios.get(`${API}/billing/transactions?limit=20`, { headers: getHeaders() }),
                axios.get(`${API}/billing/invoices?limit=10`, { headers: getHeaders() }),
                axios.get(`${API}/billing/settings`, { headers: getHeaders() }),
            ]);

            if (wRes.status === 'fulfilled') {
                setWallet(wRes.value.data);
            } else {
                // Show empty wallet when not connected
                setWallet({ id: '', balance: 0, currency: 'INR', low_balance_threshold: 100 });
            }
            if (tRes.status === 'fulfilled') {
                const tData = tRes.value.data;
                setTransactions(Array.isArray(tData) ? tData : (Array.isArray(tData?.data) ? tData.data : []));
            }
            if (iRes.status === 'fulfilled') {
                const iData = iRes.value.data;
                setInvoices(Array.isArray(iData) ? iData : (Array.isArray(iData?.data) ? iData.data : (Array.isArray(iData?.items) ? iData.items : [])));
            }
            if (sRes.status === 'fulfilled' && sRes.value.data) {
                setSettings(sRes.value.data);
            }
        } catch {
            // Only show full error if wallet (core) completely fails
            setError(true);
        } finally {
            setLoading(false);
        }
    };


    useEffect(() => { fetchData(); }, []);

    // ── Derived ───────────────────────────────────────────────────────────────
    const pendingInvoices = invoices.filter(i => ['PENDING', 'DPD'].includes(i.status));
    const paidInvoices = invoices.filter(i => i.status === 'PAID');
    const pendingTxns = transactions.filter(t => t.status === 'PENDING');
    const isLow = wallet ? +wallet.balance < +wallet.low_balance_threshold : false;

    const statusConfig: Record<string, { cls: string; Icon: any; label: string }> = {
        SUCCESS: { cls: 'text-emerald-600 dark:text-emerald-400', Icon: CheckCircle, label: 'Success' },
        FAILED: { cls: 'text-red-500', Icon: XCircle, label: 'Failed' },
        PENDING: { cls: 'text-amber-500', Icon: Clock, label: 'Pending' },
        REVERSED: { cls: 'text-gray-500', Icon: RefreshCw, label: 'Reversed' },
    };

    const invStatusBadge = (s: string) => ({
        PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
        PAID: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
        DPD: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
        CANCELLED: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
        PROCESSING: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
    }[s] || 'bg-gray-100 text-gray-500');

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-full">
                    <div className="text-center space-y-3">
                        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
                        <p className="text-gray-500 text-sm">Loading billing data…</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <Toaster position="top-right" />

            {/* Modals */}
            <AnimatePresence>
                {topupOpen && (
                    <TopupModal onClose={() => setTopupOpen(false)} onSuccess={newBalance => {
                        setWallet(prev => prev ? { ...prev, balance: newBalance } : prev);
                        fetchData();
                        setTopupOpen(false);
                    }} />
                )}
                {requestOpen && (
                    <CreditRequestModal onClose={() => setRequestOpen(false)} onSuccess={() => {
                        fetchData();
                        setRequestOpen(false);
                    }} />
                )}
                {payingInvoice && (
                    <InvoicePayModal invoice={payingInvoice} onClose={() => setPayingInvoice(null)} onPaid={() => {
                        fetchData();
                        setPayingInvoice(null);
                    }} />
                )}
            </AnimatePresence>

            {/* ── Page Header ──────────────────────────────────────────────── */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Billing & Wallet</h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Manage your platform wallet, invoices, and payment history</p>
            </div>

            {/* ── Low Balance Alert ─────────────────────────────────────────── */}
            {isLow && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="mb-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-amber-900 dark:text-amber-400">Low Wallet Balance</p>
                        <p className="text-sm text-amber-700 dark:text-amber-300">Your balance is below the threshold (₹{wallet?.low_balance_threshold}). Top up now to avoid service disruption.</p>
                    </div>
                    <button onClick={() => setTopupOpen(true)} className="flex-shrink-0 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-medium">
                        Top Up
                    </button>
                </motion.div>
            )}

            {/* ── Pending Credit Requests Banner ───────────────────────────── */}
            {pendingTxns.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-center gap-3">
                    <Clock className="w-5 h-5 text-blue-500 flex-shrink-0" />
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                        You have <strong>{pendingTxns.length}</strong> pending credit request{pendingTxns.length > 1 ? 's' : ''} awaiting admin approval.
                    </p>
                </motion.div>
            )}

            {/* ── Wallet Hero ───────────────────────────────────────────────── */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700 rounded-2xl shadow-2xl shadow-indigo-500/20 p-7 mb-6 overflow-hidden">
                {/* Background decoration */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/20 -translate-y-1/2 translate-x-1/4" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white/10 translate-y-1/2 -translate-x-1/4" />
                </div>

                <div className="relative flex flex-wrap items-start justify-between gap-6">
                    {/* Balance */}
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Wallet className="w-5 h-5 text-white/70" />
                            <p className="text-sm text-white/70 font-medium">Platform Wallet</p>
                        </div>
                        <p className="text-4xl font-bold text-white tracking-tight">
                            {fmt(+(wallet?.balance || 0))}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${isLow ? 'bg-red-500/20 text-red-200' : 'bg-emerald-500/20 text-emerald-200'}`}>
                                {isLow ? <AlertCircle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                                {isLow ? 'Low Balance' : 'Balance OK'}
                            </span>
                            <span className="text-xs text-white/50">Alert threshold: {fmt(+(wallet?.low_balance_threshold || 0))}</span>
                        </div>
                    </div>

                    {/* CTA Buttons */}
                    <div className="flex flex-col gap-2">
                        <button onClick={() => setTopupOpen(true)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-white text-indigo-700 font-semibold rounded-xl text-sm hover:bg-indigo-50 shadow-lg transition-all active:scale-95">
                            <Plus className="w-4 h-4" />
                            Add Funds (Razorpay)
                        </button>
                        <button onClick={() => setRequestOpen(true)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-white/10 text-white font-medium rounded-xl text-sm hover:bg-white/20 border border-white/20 transition-all">
                            <Send className="w-4 h-4" />
                            Request from Admin
                        </button>
                    </div>
                </div>

                {/* Usage stats */}
                {settings && (
                    <div className="relative grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/20">
                        {[
                            { label: 'Cost/Message', value: `₹${Number(settings.cost_per_message).toFixed(4)}`, icon: Zap },
                            { label: 'Campaigns/Day', value: settings.max_campaigns_per_day, icon: TrendingUp },
                            { label: 'Team Members', value: settings.max_team_members, icon: Building2 },
                        ].map(s => (
                            <div key={s.label} className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                                    <s.icon className="w-4 h-4 text-white/70" />
                                </div>
                                <div>
                                    <p className="text-lg font-bold text-white">{s.value}</p>
                                    <p className="text-xs text-white/50">{s.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </motion.div>

            {/* ── Stats Row ─────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                    { label: 'Total Credits', value: fmt(transactions.filter(t => t.type === 'CREDIT' && t.status === 'SUCCESS').reduce((s, t) => s + +t.amount, 0)), Icon: ArrowDownLeft, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                    { label: 'Total Debits', value: fmt(transactions.filter(t => t.type === 'DEBIT' && t.status === 'SUCCESS').reduce((s, t) => s + +t.amount, 0)), Icon: ArrowUpRight, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
                    { label: 'Pending Invoices', value: pendingInvoices.length, Icon: FileText, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                    { label: 'Paid Invoices', value: paidInvoices.length, Icon: CheckCircle, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                ].map((s, i) => (
                    <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
                        <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
                            <s.Icon className={`w-5 h-5 ${s.color}`} />
                        </div>
                        <p className="text-xl font-bold text-gray-900 dark:text-white">{s.value}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                    </motion.div>
                ))}
            </div>

            {/* ── Main Content ──────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Transaction History */}
                <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <CreditCard className="w-5 h-5 text-indigo-500" /> Transaction History
                            </h2>
                            <button onClick={fetchData} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400 hover:text-gray-600 transition-colors">
                                <RefreshCw className="w-4 h-4" />
                            </button>
                        </div>

                        {transactions.length === 0 ? (
                            <div className="flex flex-col items-center py-16 text-gray-300">
                                <CreditCard className="w-12 h-12 mb-3" />
                                <p className="text-gray-400 font-medium">No transactions yet</p>
                                <p className="text-gray-400 text-sm mt-1">Add funds to see your transaction history</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                                {transactions.map((t, i) => {
                                    const sc = statusConfig[t.status] || statusConfig.SUCCESS;
                                    return (
                                        <motion.div key={t.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                                            className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${t.type === 'CREDIT' ? 'bg-emerald-100 dark:bg-emerald-900/20' : 'bg-red-100 dark:bg-red-900/20'}`}>
                                                {t.type === 'CREDIT'
                                                    ? <ArrowDownLeft className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                                    : <ArrowUpRight className="w-5 h-5 text-red-500" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{t.description}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <sc.Icon className={`w-3 h-3 ${sc.cls}`} />
                                                    <span className={`text-xs ${sc.cls}`}>{sc.label}</span>
                                                    <span className="text-xs text-gray-400">·</span>
                                                    <span className="text-xs text-gray-400">{fmtDateTime(t.created_at)}</span>
                                                </div>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <p className={`text-sm font-bold ${t.type === 'CREDIT' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                                                    {t.type === 'CREDIT' ? '+' : '–'}{fmt(+t.amount)}
                                                </p>
                                                {t.balance_after != null && (
                                                    <p className="text-xs text-gray-400">Bal: {fmt(+t.balance_after)}</p>
                                                )}
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Invoices Sidebar */}
                <div className="space-y-4">
                    {/* Pending Invoices */}
                    {pendingInvoices.length > 0 && (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
                                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 text-amber-500" />
                                    Pending Invoices
                                </h3>
                            </div>
                            <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                                {pendingInvoices.map(inv => (
                                    <div key={inv.id} className="p-4">
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900 dark:text-white">{inv.invoice_number}</p>
                                                <p className="text-xs text-gray-400 mt-0.5">Due {fmtDate(inv.due_date)}</p>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${invStatusBadge(inv.status)}`}>
                                                {inv.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <p className="font-bold text-gray-900 dark:text-white">{fmt(+inv.total)}</p>
                                            <button onClick={() => setPayingInvoice(inv)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700">
                                                <CreditCard className="w-3.5 h-3.5" /> Pay Now
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* All Invoices */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
                            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <FileText className="w-4 h-4 text-blue-500" />
                                Invoice History
                            </h3>
                        </div>
                        {invoices.length === 0 ? (
                            <div className="p-6 text-center text-gray-400 text-sm">No invoices yet</div>
                        ) : (
                            <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                                {invoices.map(inv => (
                                    <div key={inv.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/20">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">{inv.invoice_number}</p>
                                            <p className="text-xs text-gray-400">{fmtDate(inv.period_start)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{fmt(+inv.total)}</p>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${invStatusBadge(inv.status)}`}>
                                                {inv.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Quick Actions */}
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/50 p-5">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Quick Actions</h3>
                        <div className="space-y-2">
                            <button onClick={() => setTopupOpen(true)}
                                className="w-full flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-indigo-100 dark:border-indigo-800 hover:shadow-md transition-all text-left group">
                                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                                    <Plus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">Add Funds via Razorpay</p>
                                    <p className="text-xs text-gray-400">Instant wallet top-up</p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-300 ml-auto" />
                            </button>
                            <button onClick={() => setRequestOpen(true)}
                                className="w-full flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-amber-100 dark:border-amber-800 hover:shadow-md transition-all text-left group">
                                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center group-hover:bg-amber-200 transition-colors">
                                    <Send className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">Request Credits</p>
                                    <p className="text-xs text-gray-400">Ask admin for manual top-up</p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-300 ml-auto" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
