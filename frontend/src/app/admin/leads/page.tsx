'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import toast, { Toaster } from 'react-hot-toast';
import { useAuthStore } from '@/lib/auth-store';
import { RefreshCw, Download, Users, Mail, Phone, Building2, Clock, CheckCircle, XCircle, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';

const STATUSES = ['ALL', 'NEW', 'CONTACTED', 'CONVERTED', 'CLOSED'];

const STATUS_META: Record<string, { color: string; icon: any }> = {
    NEW: { color: 'bg-blue-100 text-blue-700', icon: Clock },
    CONTACTED: { color: 'bg-yellow-100 text-yellow-700', icon: Mail },
    CONVERTED: { color: 'bg-green-100 text-green-700', icon: CheckCircle },
    CLOSED: { color: 'bg-gray-100 text-gray-500', icon: XCircle },
};

const REFRESH_INTERVAL = 30_000; // auto-refresh every 30s

export default function AdminLeadsPage() {
    const { user } = useAuthStore();
    const [leads, setLeads] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [status, setStatus] = useState('ALL');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selected, setSelected] = useState<any>(null);
    const [notesDraft, setNotesDraft] = useState('');
    const [lastRefresh, setLastRefresh] = useState(new Date());
    const [newCount, setNewCount] = useState<number | null>(null);
    const prevTotalRef = useRef<number>(0);

    const fetchLeads = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);
        try {
            const params: any = { page, limit: 20 };
            if (status !== 'ALL') params.status = status;
            const { data } = await api.get('/leads', { params });
            const incoming = data.data ?? [];
            const incomingTotal = data.total ?? 0;

            // Detect new leads since last fetch
            if (silent && prevTotalRef.current > 0 && incomingTotal > prevTotalRef.current) {
                const diff = incomingTotal - prevTotalRef.current;
                setNewCount(diff);
                toast.success(`🎉 ${diff} new lead${diff > 1 ? 's' : ''} arrived!`, { duration: 5000 });
            }
            prevTotalRef.current = incomingTotal;

            setLeads(incoming);
            setTotal(incomingTotal);
            setLastRefresh(new Date());
        } catch (e: any) {
            if (!silent) toast.error('Failed to load leads');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [page, status]);

    // Initial load
    useEffect(() => { fetchLeads(false); }, [fetchLeads]);

    // Auto-refresh every 30s
    useEffect(() => {
        const id = setInterval(() => fetchLeads(true), REFRESH_INTERVAL);
        return () => clearInterval(id);
    }, [fetchLeads]);

    const handleManualRefresh = () => {
        setNewCount(null);
        fetchLeads(true);
        toast.success('Refreshed!', { duration: 1500 });
    };

    const updateStatus = async (id: string, newStatus: string, notes?: string) => {
        try {
            await api.patch(`/leads/${id}/status`, { status: newStatus, notes });
            toast.success(`Lead marked as ${newStatus}`);
            fetchLeads(true);
            setSelected(null);
        } catch { toast.error('Update failed'); }
    };

    const exportCsv = async () => {
        try {
            const res = await api.get('/leads/export/csv', { responseType: 'blob' });
            const url = URL.createObjectURL(res.data);
            const a = document.createElement('a');
            a.href = url;
            a.download = `leads_${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        } catch { toast.error('Export failed'); }
    };

    const timeSince = (date: Date) => {
        const secs = Math.floor((Date.now() - date.getTime()) / 1000);
        if (secs < 60) return `${secs}s ago`;
        if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
        return `${Math.floor(secs / 3600)}h ago`;
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            <Toaster position="top-center" />
            <div className="max-w-7xl mx-auto">

                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                            <Users className="w-6 h-6 text-green-600" />
                            Contact Leads
                            {newCount && (
                                <span className="ml-2 px-2.5 py-0.5 bg-green-100 text-green-700 text-sm font-bold rounded-full animate-pulse">
                                    +{newCount} new
                                </span>
                            )}
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                            {total} total · refreshes every 30s · last updated {timeSince(lastRefresh)}
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <Link href="/admin"
                            className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                            ← Admin
                        </Link>
                        <button
                            onClick={handleManualRefresh}
                            disabled={refreshing || loading}
                            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 disabled:opacity-60"
                        >
                            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                        <button
                            onClick={exportCsv}
                            className="px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700 transition-colors flex items-center gap-2"
                        >
                            <Download className="w-4 h-4" />
                            Export CSV
                        </button>
                    </div>
                </div>

                {/* Status filters */}
                <div className="flex gap-2 mb-5 flex-wrap">
                    {STATUSES.map(s => (
                        <button
                            key={s}
                            onClick={() => { setStatus(s); setPage(1); setNewCount(null); }}
                            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${status === s
                                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-400'
                                }`}
                        >
                            {s}
                        </button>
                    ))}
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                                <tr>
                                    {['Name & Company', 'Contact', 'Size', 'Use Case', 'Source', 'Status', 'Date', 'Actions'].map(h => (
                                        <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                                {loading ? (
                                    [...Array(5)].map((_, i) => (
                                        <tr key={i}>
                                            {[...Array(8)].map((_, j) => (
                                                <td key={j} className="px-4 py-3">
                                                    <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                ) : leads.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="text-center py-16 text-gray-400 dark:text-gray-500">
                                            <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                            <p className="font-medium">No leads yet</p>
                                            <p className="text-xs mt-1">Leads submitted via the contact form will appear here</p>
                                        </td>
                                    </tr>
                                ) : leads.map(lead => {
                                    const s = STATUS_META[lead.status] || STATUS_META.NEW;
                                    const StatusIcon = s.icon;
                                    return (
                                        <tr key={lead.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="font-semibold text-gray-900 dark:text-white">{lead.name}</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                                                    <Building2 className="w-3 h-3" /> {lead.company}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <a href={`mailto:${lead.email}`} className="text-blue-600 hover:underline flex items-center gap-1 text-xs">
                                                    <Mail className="w-3 h-3" /> {lead.email}
                                                </a>
                                                <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                                                    <Phone className="w-3 h-3" /> {lead.phone}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{lead.company_size || '—'}</td>
                                            <td className="px-4 py-3 text-gray-500 dark:text-gray-400 max-w-[180px]">
                                                <p className="truncate text-xs" title={lead.use_case}>{lead.use_case || '—'}</p>
                                            </td>
                                            <td className="px-4 py-3 text-gray-400 dark:text-gray-500 text-xs capitalize">{lead.source || '—'}</td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${s.color}`}>
                                                    <StatusIcon className="w-3 h-3" />
                                                    {lead.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-400 dark:text-gray-500 text-xs whitespace-nowrap">
                                                {new Date(lead.created_at).toLocaleDateString('en-IN')}
                                            </td>
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() => { setSelected(lead); setNotesDraft(lead.notes || ''); }}
                                                    className="text-xs px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 font-semibold transition-colors"
                                                >
                                                    Manage
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {total > 20 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}
                            </p>
                            <div className="flex gap-2">
                                <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                                    className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-1">
                                    <ChevronLeft className="w-3 h-3" /> Prev
                                </button>
                                <button disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}
                                    className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-1">
                                    Next <ChevronRight className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Lead detail modal */}
            {selected && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-5">
                                <div>
                                    <h2 className="font-black text-lg text-gray-900 dark:text-white">{selected.name}</h2>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{selected.company}</p>
                                </div>
                                <button onClick={() => setSelected(null)}
                                    className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                                    ✕
                                </button>
                            </div>

                            {/* Lead details grid */}
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-5 bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                                <div><span className="text-gray-400 dark:text-gray-500 text-xs uppercase font-semibold">Email</span>
                                    <p><a href={`mailto:${selected.email}`} className="text-blue-600 hover:underline">{selected.email}</a></p>
                                </div>
                                <div><span className="text-gray-400 dark:text-gray-500 text-xs uppercase font-semibold">Phone</span>
                                    <p className="text-gray-800 dark:text-gray-200">{selected.phone}</p>
                                </div>
                                <div><span className="text-gray-400 dark:text-gray-500 text-xs uppercase font-semibold">Company Size</span>
                                    <p className="text-gray-800 dark:text-gray-200">{selected.company_size || '—'}</p>
                                </div>
                                <div><span className="text-gray-400 dark:text-gray-500 text-xs uppercase font-semibold">Source</span>
                                    <p className="text-gray-800 dark:text-gray-200">{selected.source || '—'}</p>
                                </div>
                                {selected.website && (
                                    <div className="col-span-2">
                                        <span className="text-gray-400 dark:text-gray-500 text-xs uppercase font-semibold">Website</span>
                                        <p><a href={selected.website} target="_blank" rel="noopener noreferrer"
                                            className="text-blue-600 hover:underline flex items-center gap-1">
                                            {selected.website} <ExternalLink className="w-3 h-3" />
                                        </a></p>
                                    </div>
                                )}
                                {selected.use_case && (
                                    <div className="col-span-2">
                                        <span className="text-gray-400 dark:text-gray-500 text-xs uppercase font-semibold">Use Case</span>
                                        <p className="text-gray-800 dark:text-gray-200">{selected.use_case}</p>
                                    </div>
                                )}
                            </div>

                            {/* Notes field */}
                            <div className="mb-5">
                                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Internal Notes</label>
                                <textarea
                                    value={notesDraft}
                                    onChange={e => setNotesDraft(e.target.value)}
                                    rows={3}
                                    placeholder="Add notes about this lead..."
                                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                />
                            </div>

                            {/* Status action buttons */}
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    onClick={() => updateStatus(selected.id, 'CONTACTED', notesDraft)}
                                    className="py-2.5 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                                >
                                    ✉ Contacted
                                </button>
                                <button
                                    onClick={() => updateStatus(selected.id, 'CONVERTED', notesDraft)}
                                    className="py-2.5 rounded-xl text-sm font-bold bg-green-600 text-white hover:bg-green-700 transition-colors"
                                >
                                    ✓ Converted
                                </button>
                                <button
                                    onClick={() => updateStatus(selected.id, 'CLOSED', notesDraft)}
                                    className="py-2.5 rounded-xl text-sm font-bold bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                                >
                                    ✕ Close
                                </button>
                            </div>

                            {notesDraft !== (selected.notes || '') && (
                                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 text-center">
                                    💡 Notes will be saved when you click an action button
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
