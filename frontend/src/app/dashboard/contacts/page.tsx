'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { DashboardLayout } from '@/components/dashboard-layout';
import { motion } from 'framer-motion';
import {
    Users, Upload, Plus, Eye, ToggleLeft, ToggleRight, Trash2,
    Search, ChevronLeft, ChevronRight, Tag, Phone, CheckCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Segment {
    id: string;
    name: string;
    description?: string;
    contactCount: number;
    isActive: boolean;
    source?: string;
    createdAt: string;
}

export default function ContactsPage() {
    const router = useRouter();
    const [segments, setSegments] = useState<Segment[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [toggling, setToggling] = useState<string | null>(null);

    useEffect(() => { loadSegments(); }, [page, search]);

    const loadSegments = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({ page: page.toString(), limit: '10' });
            if (search) params.append('search', search);
            const res = await apiClient.get(`/segments?${params.toString()}`);
            setSegments(res.data.data || []);
            setTotal(res.data.total || 0);
            setTotalPages(res.data.totalPages || 1);
        } catch (err: any) {
            if (err?.response?.status === 401) { router.push('/login'); return; }
            toast.error('Failed to load segments');
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = async (seg: Segment) => {
        setToggling(seg.id);
        try {
            await apiClient.post(`/segments/${seg.id}/toggle`);
            toast.success(seg.isActive ? 'Segment disabled' : 'Segment enabled');
            loadSegments();
        } catch { toast.error('Failed to toggle segment'); }
        finally { setToggling(null); }
    };

    const handleDelete = async (seg: Segment) => {
        if (!confirm(`Delete segment "${seg.name}"?\n\nThis will permanently remove the segment and all its contact data.`)) return;
        setDeleting(seg.id);
        try {
            await apiClient.delete(`/segments/${seg.id}`);
            toast.success('Segment deleted');
            loadSegments();
        } catch { toast.error('Failed to delete segment'); }
        finally { setDeleting(null); }
    };

    const activeCount = segments.filter(s => s.isActive).length;
    const contactTotal = segments.reduce((a, s) => a + s.contactCount, 0);

    return (
        <DashboardLayout>
            <div className="p-6 md:p-8">

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Contacts & Segments</h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">
                            Group contacts into segments and use them in campaigns.
                        </p>
                    </div>
                    <button
                        onClick={() => router.push('/dashboard/contacts/create')}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"
                    >
                        <Plus className="w-5 h-5" />
                        New Segment
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {[
                        { label: 'Total Segments', value: total, icon: Tag, bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600' },
                        { label: 'Active Segments', value: activeCount, icon: CheckCircle, bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-600' },
                        { label: 'Total Contacts', value: contactTotal.toLocaleString(), icon: Users, bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-600' },
                        { label: 'Inactive', value: segments.length - activeCount, icon: ToggleLeft, bg: 'bg-gray-50 dark:bg-gray-700/50', text: 'text-gray-500' },
                    ].map(({ label, value, icon: Icon, bg, text }) => (
                        <div key={label} className={`${bg} rounded-xl p-4 border border-gray-100 dark:border-gray-700`}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</p>
                                    <p className={`text-2xl font-bold mt-1 ${text}`}>{value}</p>
                                </div>
                                <Icon className={`w-8 h-8 ${text} opacity-50`} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Search */}
                <div className="relative mb-6">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search segments by name or description..."
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                        className="w-full pl-11 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                    />
                </div>

                {/* Segments list */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                    {loading ? (
                        <div className="flex items-center justify-center py-24">
                            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : segments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                            <Users className="w-20 h-20 opacity-20 mb-5" />
                            <p className="text-xl font-semibold text-gray-600 dark:text-gray-400">
                                {search ? 'No segments found' : 'No segments yet'}
                            </p>
                            <p className="text-sm mt-2 mb-6 text-gray-400">
                                {search ? 'Try a different search term' : 'Create a segment and import your contacts'}
                            </p>
                            {!search && (
                                <button onClick={() => router.push('/dashboard/contacts/create')}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors">
                                    <Plus className="w-4 h-4" /> Create First Segment
                                </button>
                            )}
                        </div>
                    ) : (
                        <>
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                                    <tr>
                                        {['Segment', 'Contacts', 'Source', 'Status', 'Created', 'Actions'].map(h => (
                                            <th key={h} className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {segments.map((seg, i) => (
                                        <motion.tr
                                            key={seg.id}
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.03 }}
                                            className="hover:bg-gray-50/80 dark:hover:bg-gray-700/30 transition-colors"
                                        >
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="font-semibold text-gray-900 dark:text-white">{seg.name}</p>
                                                    {seg.description && (
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{seg.description}</p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-sm font-semibold rounded-full">
                                                    <Phone className="w-3 h-3" />
                                                    {seg.contactCount.toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 capitalize">{seg.source || 'manual'}</td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${seg.isActive
                                                        ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                                                        : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                                                    }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${seg.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                                                    {seg.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                                {new Date(seg.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5">
                                                    {/* Add more contacts */}
                                                    <button
                                                        onClick={() => router.push(`/dashboard/contacts/import?segmentId=${seg.id}&segmentName=${encodeURIComponent(seg.name)}`)}
                                                        title="Import more contacts"
                                                        className="p-2 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                                                    >
                                                        <Upload className="w-4 h-4" />
                                                    </button>

                                                    {/* Enable / Disable toggle */}
                                                    <button
                                                        onClick={() => handleToggle(seg)}
                                                        disabled={toggling === seg.id}
                                                        title={seg.isActive ? 'Disable segment' : 'Enable segment'}
                                                        className={`p-2 rounded-lg transition-colors ${seg.isActive
                                                                ? 'text-green-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                                                                : 'text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                                                            } ${toggling === seg.id ? 'opacity-50' : ''}`}
                                                    >
                                                        {seg.isActive
                                                            ? <ToggleRight className="w-4 h-4" />
                                                            : <ToggleLeft className="w-4 h-4" />
                                                        }
                                                    </button>

                                                    {/* Delete */}
                                                    <button
                                                        onClick={() => handleDelete(seg)}
                                                        disabled={deleting === seg.id}
                                                        title="Delete segment"
                                                        className={`p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ${deleting === seg.id ? 'opacity-50' : ''}`}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20">
                                    <p className="text-sm text-gray-500">
                                        Showing {segments.length} of {total} segments
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                                            className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>
                                        <span className="px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {page} / {totalPages}
                                        </span>
                                        <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                                            className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
