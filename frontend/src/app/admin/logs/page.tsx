'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import toast, { Toaster } from 'react-hot-toast';
import {
    Activity, Search, CheckCircle, XCircle,
    RefreshCw, Download, ChevronLeft, ChevronRight,
    User, Building2, Database, Shield, MessageSquare, Zap,
} from 'lucide-react';


interface AuditLog {
    id: string;
    tenant_id: string | null;
    user_id: string | null;
    action: string;
    resource_type: string | null;
    resource_id: string | null;
    metadata: Record<string, any> | null;
    ip_address: string | null;
    created_at: string;
}

const ACTION_COLORS: Record<string, string> = {
    CREATE: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
    UPDATE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
    DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
    LOGIN: 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
    LOGIN_FAILED: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
    LOGOUT: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    APPROVE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
    SUSPEND: 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
    IMPORT: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400',
};

const ENTITY_ICONS: Record<string, any> = {
    Segments: Database,
    Contacts: User,
    Template: MessageSquare,
    Campaign: Zap,
    Authentication: Shield,
    Tenant: Building2,
};

export default function LogsPage() {
    const router = useRouter();
    const { user } = useAuthStore();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [limit] = useState(50);
    const [search, setSearch] = useState('');
    const [actionFilter, setActionFilter] = useState('ALL');
    const [entityFilter, setEntityFilter] = useState('ALL');
    const [tenants, setTenants] = useState<Record<string, string>>({});
    const [lastRefresh, setLastRefresh] = useState(new Date());

    const [isReady, setIsReady] = useState(false);

    // Wait for auth store to hydrate — fallback to cookie check
    useEffect(() => {
        // Immediate cookie check before store hydrates
        const token = document.cookie.includes('token=') ||
            (typeof localStorage !== 'undefined' && !!localStorage.getItem('token'));
        if (!token) {
            router.push('/login');
            return;
        }
        // Also check store-level role once hydrated
        if (user !== null) {
            if (user.role !== 'SUPER_ADMIN') {
                router.push('/login');
            } else {
                setIsReady(true);
                fetchTenantNames();
            }
        } else {
            // user is null but token exists → store not hydrated yet, wait
            // Set a timeout fallback
            const t = setTimeout(() => {
                setIsReady(true);
                fetchTenantNames();
            }, 500);
            return () => clearTimeout(t);
        }
    }, [user, router]);


    const fetchTenantNames = async () => {
        try {
            const res = await api.get('/tenants?limit=100');
            const map: Record<string, string> = {};
            (res.data?.data || []).forEach((t: any) => { map[t.id] = t.business_name; });
            setTenants(map);
        } catch { /* ignore — tenant names are display-only */ }
    };

    const fetchLogs = useCallback(async () => {
        if (!isReady) return;
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
            });
            if (actionFilter !== 'ALL') params.append('action', actionFilter);
            if (entityFilter !== 'ALL') params.append('entityType', entityFilter);
            const res = await api.get(`/tenants/audit-logs?${params}`);
            setLogs(res.data?.data || []);
            setTotal(res.data?.total || 0);
            setLastRefresh(new Date());
        } catch (e: any) {
            if (e.response?.status === 401) {
                // interceptor already redirecting — just show message
                toast.error('Session expired — redirecting to login...');
            } else {
                toast.error('Failed to load audit logs');
                console.error('Audit log error:', e);
            }
        } finally {
            setLoading(false);
        }
    }, [isReady, page, actionFilter, entityFilter, limit, router]);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);

    const filteredLogs = search
        ? logs.filter(l =>
            l.action?.toLowerCase().includes(search.toLowerCase()) ||
            l.resource_type?.toLowerCase().includes(search.toLowerCase()) ||
            l.metadata?.userEmail?.toLowerCase().includes(search.toLowerCase()) ||
            l.metadata?.endpoint?.toLowerCase().includes(search.toLowerCase())
        )
        : logs;

    const getActionColor = (action: string) =>
        ACTION_COLORS[action?.toUpperCase()] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';

    const getEntityIcon = (entityType: string | null) => {
        if (!entityType) return Activity;
        return ENTITY_ICONS[entityType] || Activity;
    };

    const totalPages = Math.ceil(total / limit);

    const downloadCSV = () => {
        const headers = ['Time', 'Action', 'Entity', 'User', 'IP', 'Status'];
        const rows = filteredLogs.map(l => [
            new Date(l.created_at).toLocaleString(),
            l.action,
            l.resource_type || '-',
            l.metadata?.userEmail || '-',
            l.ip_address || '-',
            l.metadata?.statusCode || '-',
        ]);
        const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
        const link = document.createElement('a');
        link.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
        link.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <Toaster position="top-right" />
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Activity className="w-6 h-6 text-blue-600" />
                        System Audit Logs
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {total.toLocaleString()} events · Last updated {lastRefresh.toLocaleTimeString()}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={downloadCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Export CSV
                    </button>
                    <button
                        onClick={() => fetchLogs()}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-4">
                <div className="flex flex-wrap gap-3">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by email, action, endpoint..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <select
                        value={actionFilter}
                        onChange={e => { setActionFilter(e.target.value); setPage(1); }}
                        className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="ALL">All Actions</option>
                        <option value="CREATE">Create</option>
                        <option value="UPDATE">Update</option>
                        <option value="DELETE">Delete</option>
                        <option value="LOGIN">Login</option>
                        <option value="LOGIN_FAILED">Login Failed</option>
                        <option value="LOGOUT">Logout</option>
                        <option value="APPROVE">Approve</option>
                        <option value="SUSPEND">Suspend</option>
                        <option value="IMPORT">Import</option>
                    </select>
                    <select
                        value={entityFilter}
                        onChange={e => { setEntityFilter(e.target.value); setPage(1); }}
                        className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="ALL">All Entities</option>
                        <option value="Authentication">Authentication</option>
                        <option value="Segments">Segments</option>
                        <option value="Contacts">Contacts</option>
                        <option value="Template">Templates</option>
                        <option value="Campaign">Campaigns</option>
                        <option value="Tenant">Tenants</option>
                    </select>
                </div>
            </div>

            {/* Log Table */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filteredLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                        <Activity className="w-12 h-12 mb-3 opacity-30" />
                        <p className="font-medium">No audit logs found</p>
                        <p className="text-sm mt-1">Try adjusting filters</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                                <tr>
                                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Time</th>
                                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Action</th>
                                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Entity</th>
                                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">User</th>
                                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Tenant</th>
                                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">IP</th>
                                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {filteredLogs.map(log => {
                                    const EntityIcon = getEntityIcon(log.resource_type);
                                    const status = log.metadata?.statusCode;
                                    const isError = status >= 400;
                                    return (
                                        <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                            <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                                <div>{new Date(log.created_at).toLocaleDateString()}</div>
                                                <div className="text-xs">{new Date(log.created_at).toLocaleTimeString()}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getActionColor(log.action)}`}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1.5">
                                                    <EntityIcon className="w-3.5 h-3.5 text-gray-400" />
                                                    <span className="text-gray-700 dark:text-gray-300">{log.resource_type || '—'}</span>
                                                </div>
                                                {log.metadata?.endpoint && (
                                                    <div className="text-xs text-gray-400 truncate max-w-[180px] mt-0.5">
                                                        {log.metadata.method} {log.metadata.endpoint}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-gray-900 dark:text-white">{log.metadata?.userEmail || '—'}</div>
                                                <div className="text-xs text-gray-400">{log.metadata?.userRole || ''}</div>
                                            </td>
                                            <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                                                {log.tenant_id ? (tenants[log.tenant_id] || log.tenant_id.slice(0, 8) + '…') : 'Platform'}
                                            </td>
                                            <td className="px-4 py-3 text-gray-500 dark:text-gray-400 font-mono text-xs">
                                                {log.ip_address || '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                {status ? (
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${isError ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' : 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'}`}>
                                                        {isError ? <XCircle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                                                        {status}
                                                    </span>
                                                ) : '—'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            Page {page} of {totalPages} · {total} total
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-1.5 rounded border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="p-1.5 rounded border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
