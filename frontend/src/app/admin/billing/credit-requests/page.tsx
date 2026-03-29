'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Send, CheckCircle, XCircle, Clock, AlertCircle, RefreshCw,
    Building2, User, ArrowDownLeft, Search, Filter, IndianRupee,
    TrendingUp, ChevronDown,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const getHeaders = () => ({ Authorization: `Bearer ${Cookies.get('token') || ''}` });

const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n);
const fmtDateTime = (d: string) => new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

interface CreditRequest {
    id: string;
    tenant_id: string;
    amount: number;
    description: string;
    status: 'PENDING' | 'SUCCESS' | 'FAILED';
    created_at: string;
    tenant?: { business_name: string; owner_email: string };
}

export default function CreditRequestsPage() {
    const [requests, setRequests] = useState<CreditRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'SUCCESS' | 'FAILED'>('PENDING');
    const [search, setSearch] = useState('');
    const [actioningId, setActioningId] = useState<string | null>(null);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const status = filter === 'ALL' ? undefined : filter;
            const { data } = await axios.get(`${API}/admin/billing/credit-requests`,
                { headers: getHeaders(), params: { status } });
            setRequests(Array.isArray(data) ? data : []);
        } catch {
            toast.error('Failed to load credit requests');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchRequests(); }, [filter]);

    const approve = async (id: string) => {
        if (!confirm('Approve this credit request and credit the tenant wallet?')) return;
        setActioningId(id);
        try {
            const { data } = await axios.post(`${API}/admin/billing/credit-requests/${id}/approve`,
                {}, { headers: getHeaders() });
            toast.success(`Wallet credited! New balance: ${fmt(data.newBalance)}`);
            fetchRequests();
        } catch (e: any) {
            toast.error(e.response?.data?.message || 'Approval failed');
        } finally {
            setActioningId(null);
        }
    };

    const reject = async (id: string) => {
        const reason = prompt('Reason for rejection:');
        if (reason === null) return;
        setActioningId(id);
        try {
            await axios.post(`${API}/admin/billing/credit-requests/${id}/reject`,
                { reason: reason || 'Rejected by admin' }, { headers: getHeaders() });
            toast.success('Credit request rejected');
            fetchRequests();
        } catch (e: any) {
            toast.error(e.response?.data?.message || 'Rejection failed');
        } finally {
            setActioningId(null);
        }
    };

    const filtered = requests.filter(r => {
        const q = search.toLowerCase();
        return (
            r.description?.toLowerCase().includes(q) ||
            r.tenant?.business_name?.toLowerCase().includes(q) ||
            r.tenant?.owner_email?.toLowerCase().includes(q)
        );
    });

    const pendingCount = requests.filter(r => r.status === 'PENDING').length;
    const totalPending = requests.filter(r => r.status === 'PENDING').reduce((s, r) => s + +r.amount, 0);

    const STATUS_COLORS: Record<string, string> = {
        PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
        SUCCESS: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
        FAILED: 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400',
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            <Toaster position="top-right" />

            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-1">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                        <Send className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Wallet Credit Requests</h1>
                        <p className="text-gray-500 text-sm">Approve or reject manual credit top-up requests from tenants</p>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {[
                    { label: 'Pending Requests', value: pendingCount, Icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                    { label: 'Total Pending Amount', value: fmt(totalPending), Icon: IndianRupee, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                    { label: 'All Requests', value: requests.length, Icon: TrendingUp, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
                ].map(s => (
                    <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
                            <s.Icon className={`w-6 h-6 ${s.color}`} />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">{s.value}</p>
                            <p className="text-xs text-gray-400">{s.label}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="relative flex-1 min-w-48">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Search by tenant or description…"
                            className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500" />
                    </div>
                    <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
                        {(['PENDING', 'SUCCESS', 'FAILED', 'ALL'] as const).map(f => (
                            <button key={f} onClick={() => setFilter(f)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === f ? 'bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                                {f}
                            </button>
                        ))}
                    </div>
                    <button onClick={fetchRequests} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl text-gray-400 hover:text-gray-600">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Rows */}
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <RefreshCw className="w-6 h-6 text-amber-500 animate-spin" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center py-16 text-gray-300">
                        <Send className="w-12 h-12 mb-3" />
                        <p className="text-gray-400 font-medium">No credit requests</p>
                        <p className="text-sm text-gray-400 mt-1">{filter === 'PENDING' ? 'No pending requests at this time.' : 'Try a different filter.'}</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                        {filtered.map((req, i) => (
                            <motion.div key={req.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                                className="flex flex-wrap items-center gap-4 px-6 py-5 hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors">
                                {/* Amount */}
                                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center flex-shrink-0">
                                    <ArrowDownLeft className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                </div>

                                {/* Details */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-lg font-bold text-gray-900 dark:text-white">{fmt(+req.amount)}</p>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[req.status] || STATUS_COLORS.PENDING}`}>
                                            {req.status}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500 mt-0.5 truncate max-w-md">{req.description}</p>
                                    <div className="flex items-center gap-3 mt-1">
                                        {req.tenant && (
                                            <span className="flex items-center gap-1 text-xs text-gray-400">
                                                <Building2 className="w-3 h-3" />
                                                {req.tenant.business_name}
                                            </span>
                                        )}
                                        {req.tenant && (
                                            <span className="flex items-center gap-1 text-xs text-gray-400">
                                                <User className="w-3 h-3" />
                                                {req.tenant.owner_email}
                                            </span>
                                        )}
                                        <span className="text-xs text-gray-400">{fmtDateTime(req.created_at)}</span>
                                    </div>
                                </div>

                                {/* Actions */}
                                {req.status === 'PENDING' && (
                                    <div className="flex gap-2 flex-shrink-0">
                                        <button onClick={() => approve(req.id)} disabled={actioningId === req.id}
                                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
                                            {actioningId === req.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                            Approve
                                        </button>
                                        <button onClick={() => reject(req.id)} disabled={actioningId === req.id}
                                            className="inline-flex items-center gap-1.5 px-4 py-2 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50">
                                            <XCircle className="w-4 h-4" />
                                            Reject
                                        </button>
                                    </div>
                                )}

                                {req.status === 'SUCCESS' && (
                                    <span className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                                        <CheckCircle className="w-4 h-4" /> Credited
                                    </span>
                                )}
                                {req.status === 'FAILED' && (
                                    <span className="flex items-center gap-1.5 text-sm text-red-500 font-medium">
                                        <XCircle className="w-4 h-4" /> Rejected
                                    </span>
                                )}
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
