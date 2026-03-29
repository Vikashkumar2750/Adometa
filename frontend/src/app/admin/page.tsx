'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { motion } from 'framer-motion';
import axios from 'axios';
import Cookies from 'js-cookie';

import {
    Users,
    CheckCircle,
    XCircle,
    Clock,
    TrendingUp,
    AlertCircle,
    RefreshCw,
    Building2,
    Ban,
    Activity,
    Loader2,
} from 'lucide-react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface PlatformStats {
    totalTenants: number;
    activeTenants: number;
    pendingTenants: number;
    suspendedTenants: number;
    deletedTenants: number;
    planBreakdown: Record<string, number>;
}

interface Tenant {
    id: string;
    business_name: string;
    status: string;
    plan: string;
    owner_email: string;
    created_at: string;
}

export default function AdminDashboard() {
    const router = useRouter();
    const { user } = useAuthStore();
    const [stats, setStats] = useState<PlatformStats | null>(null);
    const [recentTenants, setRecentTenants] = useState<Tenant[]>([]);
    const [pendingTenants, setPendingTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [lastRefresh, setLastRefresh] = useState(new Date());

    useEffect(() => {
        if (!user || user.role !== 'SUPER_ADMIN') {
            router.push('/login');
        } else {
            loadDashboard();
        }
    }, [user, router]);

    const loadDashboard = async () => {
        try {
            setLoading(true);
            setError('');
            const token = Cookies.get('token') || '';
            const headers = { Authorization: `Bearer ${token}` };

            const [statsRes, allTenantsRes, pendingRes] = await Promise.all([
                axios.get(`${API}/tenants/platform/stats`, { headers }),
                axios.get(`${API}/tenants?limit=8&page=1`, { headers }),
                axios.get(`${API}/tenants?status=PENDING_APPROVAL&limit=5`, { headers }),
            ]);

            setStats(statsRes.data);
            setRecentTenants(allTenantsRes.data.data || []);
            setPendingTenants(pendingRes.data.data || []);
            setLastRefresh(new Date());
        } catch (err: any) {
            console.error('Dashboard load error:', err);
            setError(err.response?.data?.message || 'Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const handleQuickApprove = async (tenantId: string) => {
        try {
            const token = Cookies.get('token') || '';
            await axios.post(`${API}/tenants/${tenantId}/approve`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            loadDashboard();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to approve tenant');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ACTIVE': return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
            case 'PENDING_APPROVAL': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400';
            case 'SUSPENDED': return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
            case 'REJECTED': return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    if (!user || user.role !== 'SUPER_ADMIN') return null;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        Super Admin Dashboard
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        Real-time platform overview • Last refreshed: {lastRefresh.toLocaleTimeString()}
                    </p>
                </div>
                <button
                    onClick={loadDashboard}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <p className="text-red-700 dark:text-red-400">{error}</p>
                </div>
            )}

            {/* Stats Grid — REAL DATA */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                {[
                    {
                        label: 'Total Tenants',
                        value: stats?.totalTenants ?? 0,
                        icon: Users,
                        color: 'blue',
                        href: '/admin/tenants',
                    },
                    {
                        label: 'Active',
                        value: stats?.activeTenants ?? 0,
                        icon: CheckCircle,
                        color: 'green',
                        href: '/admin/tenants?status=ACTIVE',
                    },
                    {
                        label: 'Pending Approval',
                        value: stats?.pendingTenants ?? 0,
                        icon: Clock,
                        color: 'yellow',
                        href: '/admin/tenants?status=PENDING_APPROVAL',
                    },
                    {
                        label: 'Suspended',
                        value: stats?.suspendedTenants ?? 0,
                        icon: Ban,
                        color: 'red',
                        href: '/admin/tenants?status=SUSPENDED',
                    },
                    {
                        label: 'Deleted/Rejected',
                        value: stats?.deletedTenants ?? 0,
                        icon: XCircle,
                        color: 'gray',
                        href: '/admin/tenants',
                    },
                ].map((stat, idx) => {
                    const Icon = stat.icon;
                    return (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.07 }}
                        >
                            <Link href={stat.href}
                                className="block bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-center gap-3 mb-3">
                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center
                                        ${stat.color === 'blue' ? 'bg-blue-100 dark:bg-blue-900/30' : ''}
                                        ${stat.color === 'green' ? 'bg-green-100 dark:bg-green-900/30' : ''}
                                        ${stat.color === 'yellow' ? 'bg-yellow-100 dark:bg-yellow-900/30' : ''}
                                        ${stat.color === 'red' ? 'bg-red-100 dark:bg-red-900/30' : ''}
                                        ${stat.color === 'gray' ? 'bg-gray-100 dark:bg-gray-700' : ''}
                                    `}>
                                        <Icon className={`w-5 h-5
                                            ${stat.color === 'blue' ? 'text-blue-600' : ''}
                                            ${stat.color === 'green' ? 'text-green-600' : ''}
                                            ${stat.color === 'yellow' ? 'text-yellow-600' : ''}
                                            ${stat.color === 'red' ? 'text-red-600' : ''}
                                            ${stat.color === 'gray' ? 'text-gray-600' : ''}
                                        `} />
                                    </div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.label}</p>
                                </div>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                            </Link>
                        </motion.div>
                    );
                })}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Pending Approvals — ACTION REQUIRED */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                >
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Clock className="w-5 h-5 text-yellow-500" />
                            Pending Approvals
                            {(stats?.pendingTenants ?? 0) > 0 && (
                                <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                                    {stats?.pendingTenants}
                                </span>
                            )}
                        </h2>
                        <Link href="/admin/tenants?status=PENDING_APPROVAL" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                            View All →
                        </Link>
                    </div>

                    {pendingTenants.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <CheckCircle className="w-12 h-12 text-green-400 mb-3" />
                            <p className="text-gray-500 dark:text-gray-400 font-medium">All caught up!</p>
                            <p className="text-sm text-gray-400 dark:text-gray-500">No pending approvals</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100 dark:divide-gray-700">
                            {pendingTenants.map((tenant) => (
                                <div key={tenant.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                                            {tenant.business_name[0]?.toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white text-sm">{tenant.business_name}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{tenant.owner_email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-400">
                                            {new Date(tenant.created_at).toLocaleDateString()}
                                        </span>
                                        <button
                                            onClick={() => handleQuickApprove(tenant.id)}
                                            className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors font-medium"
                                        >
                                            Approve
                                        </button>
                                        <Link
                                            href={`/admin/tenants/${tenant.id}`}
                                            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                        >
                                            View
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </motion.div>

                {/* Plan Breakdown */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6"
                >
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-500" />
                        Plan Distribution
                    </h2>
                    <div className="space-y-4">
                        {stats && Object.entries(stats.planBreakdown).length > 0 ? (
                            Object.entries(stats.planBreakdown).map(([plan, count]) => {
                                const pct = stats.totalTenants > 0 ? Math.round((count / stats.totalTenants) * 100) : 0;
                                return (
                                    <div key={plan}>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{plan}</span>
                                            <span className="text-sm text-gray-500 dark:text-gray-400">{count} ({pct}%)</span>
                                        </div>
                                        <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <p className="text-gray-400 text-sm text-center py-4">No data yet</p>
                        )}
                    </div>
                </motion.div>

                {/* Recent Tenants Table */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 }}
                    className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                >
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-gray-500" />
                            Recent Tenants
                        </h2>
                        <Link href="/admin/tenants" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                            Manage All →
                        </Link>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-700/50">
                                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Business</th>
                                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Plan</th>
                                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created</th>
                                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {recentTenants.map((tenant) => (
                                    <tr key={tenant.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                                    {tenant.business_name[0]?.toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{tenant.business_name}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{tenant.owner_email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{tenant.plan}</span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(tenant.status)}`}>
                                                {tenant.status === 'ACTIVE' && <CheckCircle className="w-3 h-3" />}
                                                {tenant.status === 'PENDING_APPROVAL' && <Clock className="w-3 h-3" />}
                                                {tenant.status === 'SUSPENDED' && <Ban className="w-3 h-3" />}
                                                {tenant.status === 'REJECTED' && <XCircle className="w-3 h-3" />}
                                                {tenant.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-sm text-gray-500 dark:text-gray-400">
                                            {new Date(tenant.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="py-4 px-6">
                                            <Link
                                                href={`/admin/tenants/${tenant.id}`}
                                                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                                            >
                                                View Details →
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                                {recentTenants.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="py-12 text-center text-gray-400">
                                            No tenants yet. <Link href="/admin/tenants/create" className="text-blue-600 hover:underline">Create the first one</Link>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </motion.div>

                {/* Quick Actions + System Info */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4"
                >
                    <Link href="/admin/tenants/create"
                        className="flex items-center gap-4 p-5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl text-white hover:shadow-lg transition-shadow">
                        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                            <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-semibold">Add New Tenant</p>
                            <p className="text-xs text-white/70">Onboard a new client</p>
                        </div>
                    </Link>
                    <Link href="/admin/templates"
                        className="flex items-center gap-4 p-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-md transition-shadow">
                        <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                            <Activity className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="font-semibold text-gray-900 dark:text-white">Review Templates</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Approve/reject submissions</p>
                        </div>
                    </Link>
                    <Link href="/admin/compliance"
                        className="flex items-center gap-4 p-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-md transition-shadow">
                        <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <p className="font-semibold text-gray-900 dark:text-white">Compliance Center</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Monitor violations & DND</p>
                        </div>
                    </Link>
                </motion.div>
            </div>
        </div>
    );
}
