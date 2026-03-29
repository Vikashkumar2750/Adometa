'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import {
    Megaphone, Plus, Search, Play, Pause, Eye, Edit, Trash2,
    ChevronRight, Calendar, Users, Send, CheckCircle, Clock,
    XCircle, BarChart3, Loader2, Target, RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';
import axios from 'axios';
import Cookies from 'js-cookie';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const getHeaders = () => ({ Authorization: `Bearer ${Cookies.get('token') || ''}` });

interface Campaign {
    id: string;
    name: string;
    description?: string;
    templateName?: string;
    segmentName?: string;
    status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'failed';
    scheduledAt?: string;
    startedAt?: string;
    completedAt?: string;
    totalRecipients: number;
    sentCount: number;
    deliveredCount: number;
    readCount: number;
    failedCount: number;
    createdAt: string;
}

const statusConfig: Record<string, { label: string; dot: string; badge: string; icon: any }> = {
    completed: { label: 'Completed', dot: 'bg-green-400', badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
    running: { label: 'Running', dot: 'bg-blue-400 animate-pulse', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Play },
    scheduled: { label: 'Scheduled', dot: 'bg-purple-400', badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: Clock },
    paused: { label: 'Paused', dot: 'bg-orange-400', badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: Pause },
    failed: { label: 'Failed', dot: 'bg-red-400', badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
    draft: { label: 'Draft', dot: 'bg-gray-400', badge: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400', icon: Edit },
};

function DeliveryBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
    const pct = total > 0 ? Math.round((value / total) * 100) : 0;
    return (
        <div>
            <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-500 dark:text-gray-400">{label}</span>
                <span className="font-semibold text-gray-900 dark:text-white">{value.toLocaleString()} <span className="text-gray-400 font-normal">({pct}%)</span></span>
            </div>
            <div className="h-2 bg-gray-100 dark:bg-gray-600 rounded-full overflow-hidden">
                <motion.div className={`h-full ${color} rounded-full`} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: 'easeOut' }} />
            </div>
        </div>
    );
}

export default function CampaignsPage() {
    const router = useRouter();
    const { user } = useAuthStore();
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selected, setSelected] = useState<Campaign | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        if (!user) { router.push('/login'); }
    }, [user, router]);

    const fetchCampaigns = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: '1', limit: '100' });
            if (statusFilter !== 'all') params.set('status', statusFilter);
            if (search) params.set('search', search);
            const res = await axios.get(`${API}/campaigns?${params}`, { headers: getHeaders() });
            const data = res.data;
            // Backend returns { data, total, page, limit } or plain array
            const list: Campaign[] = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
            setCampaigns(list);
            // Keep selected in sync
            if (selected) {
                const updated = list.find(c => c.id === selected.id);
                setSelected(updated || null);
            }
        } catch (err: any) {
            const msg = err?.response?.data?.message || 'Failed to load campaigns';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    }, [statusFilter, search]);

    useEffect(() => {
        fetchCampaigns();
    }, [fetchCampaigns]);

    const handleStart = async (id: string) => {
        setActionLoading(id);
        try {
            await axios.post(`${API}/campaigns/${id}/start`, {}, { headers: getHeaders() });
            toast.success('Campaign started!');
            await fetchCampaigns();
        } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Failed to start campaign');
        } finally {
            setActionLoading(null);
        }
    };

    const handleResume = async (id: string) => {
        setActionLoading(id);
        try {
            await axios.post(`${API}/campaigns/${id}/resume`, {}, { headers: getHeaders() });
            toast.success('Campaign resumed!');
            await fetchCampaigns();
        } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Failed to resume campaign');
        } finally {
            setActionLoading(null);
        }
    };

    const handlePause = async (id: string) => {
        setActionLoading(id);
        try {
            await axios.post(`${API}/campaigns/${id}/pause`, {}, { headers: getHeaders() });
            toast.success('Campaign paused');
            await fetchCampaigns();
        } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Failed to pause campaign');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this campaign? This cannot be undone.')) return;
        setActionLoading(id);
        try {
            await axios.delete(`${API}/campaigns/${id}`, { headers: getHeaders() });
            toast.success('Campaign deleted');
            if (selected?.id === id) setSelected(null);
            await fetchCampaigns();
        } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Failed to delete campaign');
        } finally {
            setActionLoading(null);
        }
    };

    const filtered = campaigns.filter(c => {
        const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || (c.description || '').toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === 'all' || c.status === statusFilter;
        return matchSearch && matchStatus;
    });

    return (
        <DashboardLayout>
            <Toaster position="top-right" />
            <div className="flex gap-5 h-full" style={{ height: 'calc(100vh - 120px)' }}>
                {/* LEFT: Campaign List */}
                <div className="w-80 flex-shrink-0 flex flex-col bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {/* List Header */}
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Megaphone className="w-5 h-5 text-blue-600" /> Campaigns
                            </h2>
                            <div className="flex items-center gap-1.5">
                                <button onClick={fetchCampaigns} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400" title="Refresh">
                                    <RefreshCw className="w-3.5 h-3.5" />
                                </button>
                                <Link href="/dashboard/campaigns/create"
                                    className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg text-xs font-medium hover:from-blue-700 hover:to-purple-700 transition-all">
                                    <Plus className="w-3.5 h-3.5" /> New
                                </Link>
                            </div>
                        </div>
                        <div className="relative mb-2">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
                                className="w-full pl-8 pr-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white" />
                        </div>
                        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="all">All Status</option>
                            <option value="draft">Draft</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="running">Running</option>
                            <option value="paused">Paused</option>
                            <option value="completed">Completed</option>
                            <option value="failed">Failed</option>
                        </select>
                    </div>

                    {/* Campaign List */}
                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center py-16">
                                <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="p-8 text-center">
                                <Megaphone className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                                <p className="text-sm text-gray-400">
                                    {campaigns.length === 0 ? 'No campaigns yet' : 'No campaigns match filters'}
                                </p>
                                {campaigns.length === 0 && (
                                    <Link href="/dashboard/campaigns/create"
                                        className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700">
                                        <Plus className="w-3.5 h-3.5" /> Create First Campaign
                                    </Link>
                                )}
                            </div>
                        ) : (
                            filtered.map(c => {
                                const sc = statusConfig[c.status] || statusConfig.draft;
                                const isActive = selected?.id === c.id;
                                const isProcessing = actionLoading === c.id;
                                return (
                                    <button key={c.id} onClick={() => setSelected(c)}
                                        className={`w-full p-4 text-left border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${isActive ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-600' : ''} ${isProcessing ? 'opacity-60' : ''}`}>
                                        <div className="flex items-start justify-between mb-1.5">
                                            <span className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1 flex-1">{c.name}</span>
                                            <ChevronRight className={`w-4 h-4 text-gray-400 flex-shrink-0 ml-1 transition-transform ${isActive ? 'rotate-90 text-blue-600' : ''}`} />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${sc.badge}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                                                {sc.label}
                                            </span>
                                            <span className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        {(c.totalRecipients ?? 0) > 0 && (
                                            <div className="mt-2 text-xs text-gray-400 flex items-center gap-2">
                                                <Users className="w-3 h-3" /> {(c.totalRecipients ?? 0).toLocaleString()} recipients
                                            </div>
                                        )}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* RIGHT: Detail Panel */}
                <div className="flex-1 overflow-hidden">
                    <AnimatePresence mode="wait">
                        {!selected ? (
                            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="h-full flex flex-col items-center justify-center bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-12 text-center">
                                <Megaphone className="w-16 h-16 text-gray-200 dark:text-gray-600 mb-4" />
                                <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400 mb-2">Select a Campaign</h3>
                                <p className="text-sm text-gray-400 dark:text-gray-500 mb-6 max-w-xs">Click on any campaign from the list to view its details and performance metrics</p>
                                <Link href="/dashboard/campaigns/create"
                                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:from-blue-700 hover:to-purple-700 transition-all">
                                    <Plus className="w-4 h-4" /> Create New Campaign
                                </Link>
                            </motion.div>
                        ) : (
                            <motion.div key={selected.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                className="h-full overflow-y-auto bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                                {/* Detail Header */}
                                <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="min-w-0">
                                            <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate">{selected.name}</h2>
                                            {selected.description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{selected.description}</p>}
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            {actionLoading === selected.id && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
                                            {selected.status === 'scheduled' && (
                                                <button onClick={() => handleStart(selected.id)} disabled={!!actionLoading}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
                                                    <Play className="w-4 h-4" /> Start
                                                </button>
                                            )}
                                            {selected.status === 'paused' && (
                                                <button onClick={() => handleResume(selected.id)} disabled={!!actionLoading}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
                                                    <Play className="w-4 h-4" /> Resume
                                                </button>
                                            )}
                                            {selected.status === 'running' && (
                                                <button onClick={() => handlePause(selected.id)} disabled={!!actionLoading}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors">
                                                    <Pause className="w-4 h-4" /> Pause
                                                </button>
                                            )}
                                            {(selected.status === 'draft') && (
                                                <Link href={`/dashboard/campaigns/${selected.id}/edit`}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                                                    <Edit className="w-4 h-4" /> Edit
                                                </Link>
                                            )}
                                            {(selected.status === 'draft' || selected.status === 'failed') && (
                                                <button onClick={() => handleDelete(selected.id)} disabled={!!actionLoading}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 mt-3">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${(statusConfig[selected.status] || statusConfig.draft).badge}`}>
                                            <span className={`w-2 h-2 rounded-full ${(statusConfig[selected.status] || statusConfig.draft).dot}`} />
                                            {(statusConfig[selected.status] || statusConfig.draft).label}
                                        </span>
                                        {selected.scheduledAt && (
                                            <span className="flex items-center gap-1 text-xs text-gray-400">
                                                <Calendar className="w-3.5 h-3.5" /> {new Date(selected.scheduledAt).toLocaleString()}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="p-6 space-y-6">
                                    {/* Delivery Stats */}
                                    {(selected.totalRecipients ?? 0) > 0 ? (
                                        <div>
                                            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                                                <BarChart3 className="w-4 h-4 text-blue-600" /> Delivery Stats
                                            </h3>
                                            <div className="grid grid-cols-4 gap-4 mb-6">
                                                {[
                                                    { label: 'Recipients', value: selected.totalRecipients ?? 0, color: 'text-gray-900 dark:text-white' },
                                                    { label: 'Sent', value: selected.sentCount ?? 0, color: 'text-blue-600' },
                                                    { label: 'Delivered', value: selected.deliveredCount ?? 0, color: 'text-green-600' },
                                                    { label: 'Read', value: selected.readCount ?? 0, color: 'text-purple-600' },
                                                ].map(s => (
                                                    <div key={s.label} className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 text-center">
                                                        <div className={`text-2xl font-bold ${s.color}`}>{s.value.toLocaleString()}</div>
                                                        <div className="text-xs text-gray-400 mt-1">{s.label}</div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="space-y-3">
                                                <DeliveryBar label="Sent" value={selected.sentCount ?? 0} total={selected.totalRecipients ?? 0} color="bg-blue-500" />
                                                <DeliveryBar label="Delivered" value={selected.deliveredCount ?? 0} total={selected.totalRecipients ?? 0} color="bg-green-500" />
                                                <DeliveryBar label="Read" value={selected.readCount ?? 0} total={selected.totalRecipients ?? 0} color="bg-purple-500" />
                                                {(selected.failedCount ?? 0) > 0 && (
                                                    <DeliveryBar label="Failed" value={selected.failedCount ?? 0} total={selected.totalRecipients ?? 0} color="bg-red-400" />
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 bg-gray-50 dark:bg-gray-700 rounded-xl">
                                            <Target className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                                            <p className="text-sm text-gray-400">No delivery stats yet</p>
                                        </div>
                                    )}

                                    {/* Meta Info */}
                                    <div className="grid grid-cols-2 gap-4">
                                        {selected.templateName && (
                                            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                                                <p className="text-xs text-gray-400 mb-1">Template</p>
                                                <p className="font-medium text-gray-900 dark:text-white text-sm">{selected.templateName}</p>
                                            </div>
                                        )}
                                        {selected.segmentName && (
                                            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                                                <p className="text-xs text-gray-400 mb-1">Audience Segment</p>
                                                <p className="font-medium text-gray-900 dark:text-white text-sm flex items-center gap-1.5">
                                                    <Users className="w-4 h-4 text-blue-500" /> {selected.segmentName}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Timeline */}
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-blue-600" /> Timeline
                                        </h3>
                                        <div className="space-y-2">
                                            {[
                                                { label: 'Created', date: selected.createdAt, color: 'bg-gray-400' },
                                                ...(selected.scheduledAt ? [{ label: 'Scheduled', date: selected.scheduledAt, color: 'bg-purple-400' }] : []),
                                                ...(selected.startedAt ? [{ label: 'Started', date: selected.startedAt, color: 'bg-blue-500' }] : []),
                                                ...(selected.completedAt ? [{ label: 'Completed', date: selected.completedAt, color: 'bg-green-500' }] : []),
                                            ].map((item, i) => (
                                                <div key={i} className="flex items-center gap-3 text-sm">
                                                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${item.color}`} />
                                                    <span className="text-gray-500 dark:text-gray-400 w-20 text-xs">{item.label}</span>
                                                    <span className="text-gray-900 dark:text-white text-xs">{new Date(item.date).toLocaleString()}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </DashboardLayout>
    );
}
