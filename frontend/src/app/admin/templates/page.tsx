'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import toast, { Toaster } from 'react-hot-toast';
import {
    FileText, Search, CheckCircle, XCircle, Clock,
    Eye, Edit, ChevronRight, Building2, RefreshCw,
    LayoutGrid, List,
} from 'lucide-react';
import Link from 'next/link';

interface Template {
    id: string;
    name: string;
    category: string;
    language: string;
    status: string;
    bodyText: string;
    headerType?: string;
    headerMediaUrl?: string;
    tenantId: string;
    createdAt: string;
    metaStatus?: string;
    rejectionReason?: string;
}

interface TenantSummary {
    id: string;
    name: string;
    total: number;
    approved: number;
    pending: number;
    rejected: number;
    draft: number;
}

interface Stats {
    totalTemplates: number;
    approvedTemplates: number;
    pendingTemplates: number;
    rejectedTemplates: number;
    draftTemplates?: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
    APPROVED: { label: 'Approved', color: 'bg-green-100 text-green-700', icon: CheckCircle },
    PENDING: { label: 'Pending', color: 'bg-amber-100 text-amber-700', icon: Clock },
    REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: XCircle },
    DRAFT: { label: 'Draft', color: 'bg-gray-100 text-gray-600', icon: Edit },
};

function StatusBadge({ status }: { status: string }) {
    const s = (status || 'DRAFT').toUpperCase();
    const cfg = STATUS_CONFIG[s] || STATUS_CONFIG.DRAFT;
    const Icon = cfg.icon;
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.color}`}>
            <Icon className="w-3 h-3" />
            {cfg.label}
        </span>
    );
}

export default function TemplatesPage() {
    const [allTemplates, setAllTemplates] = useState<Template[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [tenants, setTenants] = useState<TenantSummary[]>([]);
    const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [categoryFilter, setCategoryFilter] = useState('ALL');
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: page.toString(), limit: '50' });
            if (statusFilter !== 'ALL') params.append('status', statusFilter);
            if (categoryFilter !== 'ALL') params.append('category', categoryFilter);
            if (searchQuery) params.append('search', searchQuery);

            const [tRes, sRes] = await Promise.all([
                api.get(`/admin/templates?${params.toString()}`),
                api.get('/admin/templates/stats'),
            ]);

            const templates: Template[] = tRes.data.data || [];
            setAllTemplates(templates);
            setTotal(tRes.data.total || 0);
            setStats(sRes.data);

            // Build tenant summary from templates
            const tenantMap: Record<string, TenantSummary> = {};
            templates.forEach(t => {
                if (!t.tenantId) return; // skip templates with no tenantId
                if (!tenantMap[t.tenantId]) {
                    tenantMap[t.tenantId] = { id: t.tenantId, name: t.tenantId, total: 0, approved: 0, pending: 0, rejected: 0, draft: 0 };
                }
                const s = (t.status || '').toUpperCase();
                tenantMap[t.tenantId].total++;
                if (s === 'APPROVED') tenantMap[t.tenantId].approved++;
                else if (s === 'PENDING') tenantMap[t.tenantId].pending++;
                else if (s === 'REJECTED') tenantMap[t.tenantId].rejected++;
                else tenantMap[t.tenantId].draft++;
            });

            // Try to fetch tenant names
            try {
                const tenantsRes = await api.get('/tenants?limit=200');
                const tenantList: any[] = tenantsRes.data?.data || [];
                tenantList.forEach(tn => {
                    if (tenantMap[tn.id]) {
                        // API may return business_name or businessName
                        const displayName = tn.business_name || tn.businessName || tn.name;
                        if (displayName) tenantMap[tn.id].name = displayName;
                    }
                });
            } catch { /* tenant names are display-only */ }

            setTenants(Object.values(tenantMap).filter(t => !!t.id).sort((a, b) => b.total - a.total));
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to load templates');
        } finally {
            setLoading(false);
        }
    }, [page, statusFilter, categoryFilter, searchQuery]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Filtered templates for current view
    const visibleTemplates = allTemplates.filter(t => {
        if (selectedTenantId && t.tenantId !== selectedTenantId) return false;
        if (searchQuery && !t.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
            !t.bodyText?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    const selectedTenantName = selectedTenantId
        ? (tenants.find(t => t.id === selectedTenantId)?.name || selectedTenantId.slice(0, 8) + '...')
        : null;

    return (
        <div className="p-6 min-h-screen bg-gray-50 dark:bg-gray-900">
            <Toaster position="top-right" />

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                        <FileText className="w-6 h-6 text-blue-600" />
                        Templates
                        {selectedTenantName && (
                            <>
                                <ChevronRight className="w-5 h-5 text-gray-400" />
                                <span className="text-blue-600">{selectedTenantName}</span>
                            </>
                        )}
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        {selectedTenantId
                            ? `${visibleTemplates.length} templates for this tenant`
                            : `${total} templates across ${tenants.length} tenants`}
                    </p>
                </div>
                <div className="flex gap-2">
                    {selectedTenantId && (
                        <button
                            onClick={() => setSelectedTenantId(null)}
                            className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-300"
                        >
                            ← All Tenants
                        </button>
                    )}
                    <button
                        onClick={fetchData}
                        className="px-3 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-1.5"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
                    </button>
                </div>
            </div>

            {/* Overall stats row */}
            {!selectedTenantId && stats && (
                <div className="grid grid-cols-4 gap-4 mb-6">
                    {[
                        { label: 'Total', value: stats.totalTemplates, color: 'text-gray-900 dark:text-white', icon: FileText, bg: 'bg-blue-50 dark:bg-blue-900/20' },
                        { label: 'Approved', value: stats.approvedTemplates, color: 'text-green-600', icon: CheckCircle, bg: 'bg-green-50 dark:bg-green-900/20' },
                        { label: 'Pending', value: stats.pendingTemplates, color: 'text-amber-600', icon: Clock, bg: 'bg-amber-50 dark:bg-amber-900/20' },
                        { label: 'Rejected', value: stats.rejectedTemplates, color: 'text-red-600', icon: XCircle, bg: 'bg-red-50 dark:bg-red-900/20' },
                    ].map(s => {
                        const Icon = s.icon;
                        return (
                            <div key={s.label} className={`${s.bg} rounded-xl p-4 border border-gray-200/50 dark:border-gray-700`}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{s.label}</p>
                                        <p className={`text-2xl font-black mt-1 ${s.color}`}>{s.value ?? 0}</p>
                                    </div>
                                    <Icon className={`w-7 h-7 opacity-60 ${s.color}`} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="flex gap-5">
                {/* LEFT: Tenant sidebar */}
                <div className="w-72 flex-shrink-0">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Tenants</span>
                            <span className="ml-auto text-xs text-gray-400">{tenants.length}</span>
                        </div>

                        {/* All tenants option */}
                        <button
                            onClick={() => setSelectedTenantId(null)}
                            className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors border-b border-gray-50 dark:border-gray-700/50 ${!selectedTenantId
                                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-semibold'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                                }`}
                        >
                            <span className="flex items-center gap-2">
                                <LayoutGrid className="w-4 h-4" /> All Tenants
                            </span>
                            <span className="text-xs font-bold bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
                                {total}
                            </span>
                        </button>

                        {/* Per-tenant rows */}
                        <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
                            {loading && tenants.length === 0 ? (
                                [...Array(4)].map((_, i) => (
                                    <div key={i} className="px-4 py-3 border-b border-gray-50 dark:border-gray-700/50">
                                        <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded animate-pulse mb-1.5" />
                                        <div className="h-3 w-20 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
                                    </div>
                                ))
                            ) : tenants.length === 0 ? (
                                <div className="px-4 py-8 text-center text-gray-400 text-sm">No tenants found</div>
                            ) : (
                                tenants.map(tenant => (
                                    <button
                                        key={tenant.id}
                                        onClick={() => setSelectedTenantId(tenant.id)}
                                        className={`w-full flex items-start justify-between px-4 py-3 text-left text-sm transition-colors border-b border-gray-50 dark:border-gray-700/50 ${selectedTenantId === tenant.id
                                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-semibold'
                                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                                            }`}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium truncate text-sm">{((tenant.name || tenant.id) || '').length > 20 ? (tenant.name || tenant.id).slice(0, 20) + '…' : (tenant.name || tenant.id)}</p>
                                            <div className="flex gap-2 mt-1">
                                                {tenant.approved > 0 && <span className="text-green-600 text-xs">✓{tenant.approved}</span>}
                                                {tenant.pending > 0 && <span className="text-amber-600 text-xs">⏱{tenant.pending}</span>}
                                                {tenant.rejected > 0 && <span className="text-red-600 text-xs">✗{tenant.rejected}</span>}
                                                {tenant.draft > 0 && <span className="text-gray-500 text-xs">✎{tenant.draft}</span>}
                                            </div>
                                        </div>
                                        <span className={`ml-2 flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded-full mt-0.5 ${selectedTenantId === tenant.id
                                            ? 'bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                            }`}>
                                            {tenant.total}
                                        </span>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT: Templates table */}
            <div className="flex-1">
                {/* Filters */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 mb-4 flex gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name or body text..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                    </div>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white">
                        <option value="ALL">All Status</option>
                        <option value="DRAFT">Draft</option>
                        <option value="PENDING">Pending</option>
                        <option value="APPROVED">Approved</option>
                        <option value="REJECTED">Rejected</option>
                    </select>
                    <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white">
                        <option value="ALL">All Categories</option>
                        <option value="MARKETING">Marketing</option>
                        <option value="UTILITY">Utility</option>
                        <option value="AUTHENTICATION">Authentication</option>
                    </select>
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {loading ? (
                        <div className="divide-y divide-gray-100 dark:divide-gray-700">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="flex items-center gap-4 px-5 py-4">
                                    <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded animate-pulse flex-shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 w-40 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
                                        <div className="h-3 w-64 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : visibleTemplates.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500">
                            <FileText className="w-14 h-14 mb-3 opacity-30" />
                            <p className="font-semibold text-gray-500 dark:text-gray-400">No templates found</p>
                            <p className="text-sm mt-1">
                                {selectedTenantId ? 'This tenant has no templates yet' : 'No templates across any tenant'}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                                    <tr>
                                        {['Template Name', 'Category', 'Language', 'Status', 'Created', 'Actions'].map(h => (
                                            <th key={h} className="px-5 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                                    {visibleTemplates.map(template => (
                                        <tr key={template.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-2">
                                                    {template.headerType === 'IMAGE' && template.headerMediaUrl ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img src={template.headerMediaUrl} alt="" className="w-8 h-8 object-cover rounded flex-shrink-0 border border-gray-200" />
                                                    ) : (
                                                        <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/20 rounded flex items-center justify-center flex-shrink-0">
                                                            <FileText className="w-4 h-4 text-blue-500" />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="font-semibold text-gray-900 dark:text-white">{template.name}</p>
                                                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[220px]">
                                                            {template.bodyText ? template.bodyText.substring(0, 60) + (template.bodyText.length > 60 ? '…' : '') : '—'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3 text-gray-600 dark:text-gray-400 text-xs font-medium">{template.category}</td>
                                            <td className="px-5 py-3 text-gray-500 dark:text-gray-400 text-xs">{template.language}</td>
                                            <td className="px-5 py-3"><StatusBadge status={template.status} /></td>
                                            <td className="px-5 py-3 text-gray-400 dark:text-gray-500 text-xs whitespace-nowrap">
                                                {new Date(template.createdAt).toLocaleDateString('en-IN')}
                                            </td>
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-2">
                                                    <Link href={`/admin/templates/${template.id}`}
                                                        className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                        title="View">
                                                        <Eye className="w-4 h-4" />
                                                    </Link>
                                                    <Link href={`/admin/templates/${template.id}/edit`}
                                                        className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                                        title="Edit">
                                                        <Edit className="w-4 h-4" />
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
