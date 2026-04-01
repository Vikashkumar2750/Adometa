'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Cookies from 'js-cookie';
import Link from 'next/link';
import {
    Plus,
    Building2,
    CheckCircle,
    XCircle,
    Clock,
    Search,
    Eye,
    ThumbsUp,
    ThumbsDown,
} from 'lucide-react';

interface Tenant {
    id: string;
    business_name: string;
    status: 'PENDING_APPROVAL' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';
    plan: string;
    owner_email: string;
    owner_name: string;
    created_at: string;
    approved_at?: string;
    approved_by?: string;
}

const _RAW = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API = _RAW.endsWith('/api') ? _RAW : `${_RAW}/api`;

export default function TenantsPage() {
    const router = useRouter();
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);

    useEffect(() => {
        fetchTenants();
    }, [page, statusFilter]);

    const fetchTenants = async () => {
        try {
            setLoading(true);
            const token = Cookies.get('token') || '';

            const params = new URLSearchParams({
                page: page.toString(),
                limit: '10',
            });

            if (statusFilter !== 'ALL') params.append('status', statusFilter);
            if (searchQuery) params.append('search', searchQuery);

            const response = await axios.get(
                `${API}/tenants?${params.toString()}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setTenants(response.data.data || []);
            setTotal(response.data.total || 0);
        } catch (err: any) {
            console.error('Error fetching tenants:', err);
            if (err?.response?.status === 401) {
                router.push('/login');
                return;
            }
            setError(err?.response?.data?.message || 'Failed to load tenants');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id: string) => {
        if (!confirm('Are you sure you want to approve this tenant?')) return;

        try {
            const token = Cookies.get('token') || '';
            await axios.post(
                `${API}/tenants/${id}/approve`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alert('Tenant approved successfully!');
            fetchTenants();
        } catch (error: any) {
            console.error('Error approving tenant:', error);
            alert(error.response?.data?.message || 'Failed to approve tenant');
        }
    };

    const handleReject = async (id: string) => {
        const reason = prompt('Please provide a reason for rejection:');
        if (!reason) return;

        try {
            const token = Cookies.get('token') || '';
            await axios.post(
                `${API}/tenants/${id}/reject`,
                { reason },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alert('Tenant rejected successfully!');
            fetchTenants();
        } catch (error: any) {
            console.error('Error rejecting tenant:', error);
            alert(error.response?.data?.message || 'Failed to reject tenant');
        }
    };

    const getStatusBadge = (status: string) => {
        const styles = {
            PENDING_APPROVAL: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
            ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
            SUSPENDED: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
            REJECTED: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
        };

        const icons = {
            PENDING_APPROVAL: <Clock className="w-3 h-3" />,
            ACTIVE: <CheckCircle className="w-3 h-3" />,
            SUSPENDED: <XCircle className="w-3 h-3" />,
            REJECTED: <XCircle className="w-3 h-3" />,
        };

        return (
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
                {icons[status as keyof typeof icons]}
                {status.replace('_', ' ')}
            </span>
        );
    };

    return (
        <div className="p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        Tenants
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        Manage all tenants and their subscriptions
                    </p>
                </div>
                <Link
                    href="/admin/tenants/create"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    Add Tenant
                </Link>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Search */}
                    <div className="md:col-span-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search tenants..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && fetchTenants()}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            />
                        </div>
                    </div>

                    {/* Status Filter */}
                    <div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        >
                            <option value="ALL">All Status</option>
                            <option value="PENDING_APPROVAL">Pending Approval</option>
                            <option value="ACTIVE">Active</option>
                            <option value="SUSPENDED">Suspended</option>
                            <option value="REJECTED">Rejected</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{total}</p>
                        </div>
                        <Building2 className="w-8 h-8 text-blue-600" />
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Active</p>
                            <p className="text-2xl font-bold text-green-600">
                                {tenants.filter(t => t.status === 'ACTIVE').length}
                            </p>
                        </div>
                        <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
                            <p className="text-2xl font-bold text-yellow-600">
                                {tenants.filter(t => t.status === 'PENDING_APPROVAL').length}
                            </p>
                        </div>
                        <Clock className="w-8 h-8 text-yellow-600" />
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Suspended</p>
                            <p className="text-2xl font-bold text-red-600">
                                {tenants.filter(t => t.status === 'SUSPENDED').length}
                            </p>
                        </div>
                        <XCircle className="w-8 h-8 text-red-600" />
                    </div>
                </div>
            </div>

            {/* Tenants Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                ) : tenants.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                        <Building2 className="w-16 h-16 mb-4 text-gray-400" />
                        <p className="text-lg font-medium">No tenants found</p>
                        <p className="text-sm">Create your first tenant to get started</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Business
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Owner
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Plan
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Created
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {tenants.map((tenant) => (
                                    <tr key={tenant.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <Building2 className="w-5 h-5 text-gray-400 mr-3" />
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {tenant.business_name}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900 dark:text-white">{tenant.owner_name}</div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400">{tenant.owner_email}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm text-gray-900 dark:text-white">
                                                {tenant.plan}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(tenant.status)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {new Date(tenant.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link
                                                    href={`/admin/tenants/${tenant.id}`}
                                                    className="text-blue-600 hover:text-blue-900 dark:text-blue-400"
                                                >
                                                    <Eye className="w-5 h-5" />
                                                </Link>
                                                {tenant.status === 'PENDING_APPROVAL' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleApprove(tenant.id)}
                                                            className="text-green-600 hover:text-green-900 dark:text-green-400"
                                                            title="Approve"
                                                        >
                                                            <ThumbsUp className="w-5 h-5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleReject(tenant.id)}
                                                            className="text-red-600 hover:text-red-900 dark:text-red-400"
                                                            title="Reject"
                                                        >
                                                            <ThumbsDown className="w-5 h-5" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {!loading && tenants.length > 0 && (
                    <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-700 dark:text-gray-300">
                                Showing <span className="font-medium">{(page - 1) * 10 + 1}</span> to{' '}
                                <span className="font-medium">{Math.min(page * 10, total)}</span> of{' '}
                                <span className="font-medium">{total}</span> results
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setPage(p => p + 1)}
                                    disabled={page * 10 >= total}
                                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
