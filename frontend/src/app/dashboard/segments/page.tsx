'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { segmentsService, Segment } from '@/lib/segments-service';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, Plus, Search, Trash2, ToggleLeft, ToggleRight,
    Loader2, RefreshCw, Tag, CheckCircle, XCircle, Database,
    Upload, X, AlertCircle,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import Link from 'next/link';

// ─── Create Segment Modal ─────────────────────────────────────────────────────
function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (s: Segment) => void }) {
    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');
    const [saving, setSaving] = useState(false);

    const handleCreate = async () => {
        if (!name.trim()) { toast.error('Segment name is required'); return; }
        setSaving(true);
        try {
            const seg = await segmentsService.create({ name: name.trim(), description: desc.trim() || undefined });
            toast.success(`Segment "${seg.name}" created`);
            onCreated(seg);
        } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Failed to create segment');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                            <Tag className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">New Segment</h3>
                            <p className="text-xs text-gray-400">Group contacts for targeted campaigns</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            Segment Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleCreate()}
                            placeholder="e.g., Premium Customers, Diwali Campaign"
                            autoFocus
                            className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            Description <span className="text-gray-400 font-normal">(optional)</span>
                        </label>
                        <textarea
                            value={desc}
                            onChange={e => setDesc(e.target.value)}
                            placeholder="What kind of contacts are in this segment?"
                            rows={3}
                            className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm resize-none"
                        />
                    </div>
                </div>

                <div className="flex gap-3 p-6 border-t border-gray-100 dark:border-gray-700">
                    <button onClick={onClose}
                        className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        Cancel
                    </button>
                    <button onClick={handleCreate} disabled={saving || !name.trim()}
                        className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 transition-all">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        {saving ? 'Creating...' : 'Create Segment'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SegmentsPage() {
    const router = useRouter();
    const { user } = useAuthStore();
    const [segments, setSegments] = useState<Segment[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [toggling, setToggling] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [showCreate, setShowCreate] = useState(false);

    useEffect(() => {
        if (!user) router.push('/login');
    }, [user, router]);

    const fetchSegments = useCallback(async () => {
        setLoading(true);
        try {
            const res = await segmentsService.getAll(page, 20, search || undefined);
            setSegments(res.data || []);
            setTotal(res.total || 0);
        } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Failed to load segments');
        } finally {
            setLoading(false);
        }
    }, [page, search]);

    useEffect(() => { fetchSegments(); }, [fetchSegments]);

    const handleToggle = async (seg: Segment) => {
        setToggling(seg.id);
        try {
            const updated = await segmentsService.toggle(seg.id);
            setSegments(prev => prev.map(s => s.id === seg.id ? updated : s));
            toast.success(`Segment ${updated.isActive ? 'activated' : 'paused'}`);
        } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Failed to toggle segment');
        } finally {
            setToggling(null);
        }
    };

    const handleDelete = async (seg: Segment) => {
        if (!confirm(`Delete segment "${seg.name}"? Contacts won't be deleted.`)) return;
        setDeleting(seg.id);
        try {
            await segmentsService.delete(seg.id);
            setSegments(prev => prev.filter(s => s.id !== seg.id));
            setTotal(t => t - 1);
            toast.success('Segment deleted');
        } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Failed to delete segment');
        } finally {
            setDeleting(null);
        }
    };

    const handleCreated = (seg: Segment) => {
        setSegments(prev => [seg, ...prev]);
        setTotal(t => t + 1);
        setShowCreate(false);
    };

    const totalPages = Math.ceil(total / 20);

    return (
        <DashboardLayout>
            <Toaster position="top-right" />

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <Tag className="w-4 h-4 text-white" />
                        </div>
                        Segments
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Group contacts into targeted audiences for your campaigns
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={fetchSegments} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400 transition-colors">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        id="create-segment-btn"
                        onClick={() => setShowCreate(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:from-blue-700 hover:to-purple-700 shadow-md hover:shadow-lg transition-all">
                        <Plus className="w-4 h-4" /> New Segment
                    </button>
                </div>
            </div>

            {/* Stats bar */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                    { label: 'Total Segments', value: total, icon: Database, color: 'from-blue-500 to-indigo-600' },
                    { label: 'Active', value: segments.filter(s => s.isActive).length, icon: CheckCircle, color: 'from-green-500 to-emerald-600' },
                    { label: 'Paused', value: segments.filter(s => !s.isActive).length, icon: XCircle, color: 'from-orange-500 to-amber-600' },
                ].map(stat => (
                    <div key={stat.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-3">
                        <div className={`w-10 h-10 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                            <stat.icon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Search */}
            <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                    placeholder="Search segments..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                />
            </div>

            {/* Segment List */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
            ) : segments.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-600">
                    <Tag className="w-14 h-14 text-gray-300 dark:text-gray-600 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400 mb-1">
                        {search ? 'No segments match your search' : 'No segments yet'}
                    </h3>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mb-5">
                        Segments let you target specific groups of contacts with campaigns
                    </p>
                    {!search && (
                        <button onClick={() => setShowCreate(true)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
                            <Plus className="w-4 h-4" /> Create First Segment
                        </button>
                    )}
                </motion.div>
            ) : (
                <div className="space-y-3">
                    <AnimatePresence>
                        {segments.map(seg => (
                            <motion.div key={seg.id}
                                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
                                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 flex items-center gap-4 hover:border-blue-300 dark:hover:border-blue-600 transition-colors group">

                                {/* Icon */}
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${seg.isActive ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
                                    <Users className={`w-6 h-6 ${seg.isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">{seg.name}</h3>
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${seg.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${seg.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                                            {seg.isActive ? 'Active' : 'Paused'}
                                        </span>
                                    </div>
                                    {seg.description && (
                                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{seg.description}</p>
                                    )}
                                    <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-400">
                                        <span className="flex items-center gap-1">
                                            <Users className="w-3.5 h-3.5" />
                                            <strong className="text-gray-700 dark:text-gray-300">{(seg.contactCount || 0).toLocaleString()}</strong> contacts
                                        </span>
                                        <span>Created {new Date(seg.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {/* Use in campaign */}
                                    <Link href={`/dashboard/campaigns/create?segmentId=${seg.id}`}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
                                        <Upload className="w-3.5 h-3.5" /> Use in Campaign
                                    </Link>

                                    {/* Toggle */}
                                    <button
                                        onClick={() => handleToggle(seg)}
                                        disabled={toggling === seg.id}
                                        title={seg.isActive ? 'Pause segment' : 'Activate segment'}
                                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50">
                                        {toggling === seg.id
                                            ? <Loader2 className="w-4 h-4 animate-spin" />
                                            : seg.isActive
                                                ? <ToggleRight className="w-5 h-5 text-green-500" />
                                                : <ToggleLeft className="w-5 h-5" />
                                        }
                                    </button>

                                    {/* Delete */}
                                    <button
                                        onClick={() => handleDelete(seg)}
                                        disabled={deleting === seg.id}
                                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50">
                                        {deleting === seg.id
                                            ? <Loader2 className="w-4 h-4 animate-spin" />
                                            : <Trash2 className="w-4 h-4" />
                                        }
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, total)} of {total}
                    </p>
                    <div className="flex gap-2">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                            className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors">
                            Previous
                        </button>
                        <span className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400">
                            {page} / {totalPages}
                        </span>
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                            className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors">
                            Next
                        </button>
                    </div>
                </div>
            )}

            {/* Create Modal */}
            <AnimatePresence>
                {showCreate && (
                    <CreateModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />
                )}
            </AnimatePresence>
        </DashboardLayout>
    );
}
