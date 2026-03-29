'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { useAuthStore } from '@/lib/auth-store';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import axios from 'axios';
import {
    MessageSquare,
    Users,
    Send,
    TrendingUp,
    CheckCircle,
    Clock,
    AlertCircle,
    Calendar,
    Loader2,
    RefreshCw,
    Wifi,
    WifiOff,
    FileText,
    BarChart3,
    Plus,
} from 'lucide-react';
import Link from 'next/link';

import Cookies from 'js-cookie';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface DashboardSummary {
    contacts: { total: number; active: number; optedIn: number };
    campaigns: { total: number; active: number; completed: number; scheduled: number };
    templates: { total: number; approved: number; pending: number };
    whatsapp: { connected: boolean; phoneNumber?: string; qualityRating?: string };
}

interface RecentCampaign {
    id: string;
    name: string;
    status: string;
    sent_count: number;
    delivered_count: number;
    read_count: number;
    created_at: string;
    scheduled_at?: string;
}

export default function DashboardPage() {
    const { user } = useAuthStore();
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [recentCampaigns, setRecentCampaigns] = useState<RecentCampaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [lastRefresh, setLastRefresh] = useState(new Date());

    useEffect(() => {
        loadDashboard();
    }, []);

    const loadDashboard = async () => {
        try {
            setLoading(true);
            setError('');
            const token = Cookies.get('token') || '';
            const headers = { Authorization: `Bearer ${token}` };


            const results = await Promise.allSettled([
                axios.get(`${API}/contacts/statistics`, { headers }),
                axios.get(`${API}/campaigns/statistics`, { headers }),
                axios.get(`${API}/templates/statistics`, { headers }),
                axios.get(`${API}/whatsapp-oauth/status`, { headers }),
                axios.get(`${API}/campaigns?limit=5&page=1`, { headers }),
            ]);

            const contactStats = results[0].status === 'fulfilled' ? results[0].value.data : null;
            const campaignStats = results[1].status === 'fulfilled' ? results[1].value.data : null;
            const templateStats = results[2].status === 'fulfilled' ? results[2].value.data : null;
            const waStatus = results[3].status === 'fulfilled' ? results[3].value.data : null;
            const campaignsData = results[4].status === 'fulfilled' ? results[4].value.data : null;

            setSummary({
                contacts: {
                    total: contactStats?.total ?? 0,
                    active: contactStats?.active ?? 0,
                    optedIn: contactStats?.optedIn ?? 0,
                },
                campaigns: {
                    total: campaignStats?.total ?? 0,
                    active: campaignStats?.running ?? campaignStats?.active ?? 0,
                    completed: campaignStats?.completed ?? 0,
                    scheduled: campaignStats?.scheduled ?? 0,
                },
                templates: {
                    total: templateStats?.total ?? 0,
                    approved: templateStats?.approved ?? 0,
                    pending: templateStats?.pending ?? 0,
                },
                whatsapp: {
                    connected: waStatus?.connected ?? false,
                    phoneNumber: waStatus?.phoneNumber,
                    qualityRating: waStatus?.qualityRating,
                },
            });

            setRecentCampaigns(campaignsData?.data ?? campaignsData?.campaigns ?? []);
            setLastRefresh(new Date());
        } catch (err: any) {
            console.error('Dashboard load error:', err);
            setError('Failed to load dashboard data. Please refresh.');
        } finally {
            setLoading(false);
        }
    };

    const getCampaignStatusStyle = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'completed': return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
            case 'running':
            case 'active': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
            case 'scheduled': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400';
            case 'draft': return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
            case 'paused': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const deliveryRate = summary && summary.campaigns.total > 0
        ? 'N/A (real-time)'
        : 'N/A';

    return (
        <DashboardLayout allowedRoles={['TENANT_ADMIN', 'TENANT_MARKETER', 'TENANT_VIEWER']}>
            {/* Welcome Section */}
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        Welcome back, {user?.name || user?.email?.split('@')[0] || 'User'}! 👋
                    </h1>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">
                        Real-time overview of your WhatsApp campaigns • {lastRefresh.toLocaleTimeString()}
                    </p>
                </div>
                <button
                    onClick={loadDashboard}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-400">Loading your dashboard...</p>
                    </div>
                </div>
            ) : (
                <>
                    {/* Stats Grid — REAL DATA */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        {[
                            {
                                name: 'Total Contacts',
                                value: summary?.contacts.total.toLocaleString() ?? '0',
                                sub: `${summary?.contacts.optedIn ?? 0} opted-in`,
                                icon: Users,
                                color: 'blue',
                                href: '/dashboard/contacts',
                            },
                            {
                                name: 'Total Campaigns',
                                value: summary?.campaigns.total.toLocaleString() ?? '0',
                                sub: `${summary?.campaigns.active ?? 0} active`,
                                icon: Send,
                                color: 'purple',
                                href: '/dashboard/campaigns',
                            },
                            {
                                name: 'Templates',
                                value: summary?.templates.total.toLocaleString() ?? '0',
                                sub: `${summary?.templates.approved ?? 0} approved`,
                                icon: FileText,
                                color: 'green',
                                href: '/dashboard/whatsapp/templates',
                            },
                            {
                                name: 'Completed Campaigns',
                                value: summary?.campaigns.completed.toLocaleString() ?? '0',
                                sub: `${summary?.campaigns.scheduled ?? 0} scheduled`,
                                icon: TrendingUp,
                                color: 'orange',
                                href: '/dashboard/campaigns',
                            },
                        ].map((stat, index) => {
                            const Icon = stat.icon;
                            return (
                                <motion.div
                                    key={stat.name}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                >
                                    <Link href={stat.href}
                                        className="block bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
                                    >
                                        <div className="flex items-center justify-between mb-4">
                                            <div className={`p-3 rounded-lg
                                                ${stat.color === 'blue' ? 'bg-blue-100 dark:bg-blue-900/30' : ''}
                                                ${stat.color === 'purple' ? 'bg-purple-100 dark:bg-purple-900/30' : ''}
                                                ${stat.color === 'green' ? 'bg-green-100 dark:bg-green-900/30' : ''}
                                                ${stat.color === 'orange' ? 'bg-orange-100 dark:bg-orange-900/30' : ''}
                                            `}>
                                                <Icon className={`w-6 h-6
                                                    ${stat.color === 'blue' ? 'text-blue-600' : ''}
                                                    ${stat.color === 'purple' ? 'text-purple-600' : ''}
                                                    ${stat.color === 'green' ? 'text-green-600' : ''}
                                                    ${stat.color === 'orange' ? 'text-orange-600' : ''}
                                                `} />
                                            </div>
                                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                                {stat.sub}
                                            </span>
                                        </div>
                                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{stat.name}</p>
                                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                                    </Link>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* Main Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

                        {/* WhatsApp Connection Status — REAL */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
                        >
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <MessageSquare className="w-5 h-5" />
                                WhatsApp Status
                            </h3>
                            {summary?.whatsapp.connected ? (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                        <Wifi className="w-4 h-4 text-green-600" />
                                        <span className="text-sm font-medium text-green-700 dark:text-green-400">Connected</span>
                                        <div className="ml-auto w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                    </div>
                                    {summary.whatsapp.phoneNumber && (
                                        <div className="text-sm text-gray-600 dark:text-gray-400">
                                            <span className="font-medium">Phone:</span> {summary.whatsapp.phoneNumber}
                                        </div>
                                    )}
                                    {summary.whatsapp.qualityRating && (
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-600 dark:text-gray-400">Quality Rating</span>
                                            <span className={`px-2 py-0.5 rounded font-semibold text-xs
                                                ${summary.whatsapp.qualityRating === 'GREEN' ? 'bg-green-100 text-green-700' :
                                                    summary.whatsapp.qualityRating === 'YELLOW' ? 'bg-yellow-100 text-yellow-700' :
                                                        'bg-red-100 text-red-700'}`}>
                                                {summary.whatsapp.qualityRating}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                                        <WifiOff className="w-4 h-4 text-yellow-600" />
                                        <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">Not Connected</span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Connect your WhatsApp Business account to start sending campaigns.</p>
                                    <Link
                                        href="/dashboard/whatsapp/connect"
                                        className="block w-full text-center px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:shadow-md transition-shadow text-sm font-medium"
                                    >
                                        Connect WhatsApp
                                    </Link>
                                </div>
                            )}
                        </motion.div>

                        {/* Campaign Summary */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
                        >
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <BarChart3 className="w-5 h-5" />
                                Campaign Breakdown
                            </h3>
                            <div className="space-y-3">
                                {[
                                    { label: 'Total', value: summary?.campaigns.total ?? 0, color: 'text-gray-900 dark:text-white' },
                                    { label: 'Active / Running', value: summary?.campaigns.active ?? 0, color: 'text-blue-600' },
                                    { label: 'Scheduled', value: summary?.campaigns.scheduled ?? 0, color: 'text-orange-600' },
                                    { label: 'Completed', value: summary?.campaigns.completed ?? 0, color: 'text-green-600' },
                                ].map(item => (
                                    <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">{item.label}</span>
                                        <span className={`text-lg font-bold ${item.color}`}>{item.value}</span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>

                        {/* Quick Actions */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                            className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
                        >
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
                            <div className="space-y-3">
                                <Link href="/dashboard/campaigns/create"
                                    className="flex items-center space-x-3 p-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-md transition-shadow">
                                    <Send className="w-5 h-5 flex-shrink-0" />
                                    <span className="font-medium text-sm">Create Campaign</span>
                                </Link>
                                <Link href="/dashboard/contacts/import"
                                    className="flex items-center space-x-3 p-4 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                                    <Users className="w-5 h-5 flex-shrink-0" />
                                    <span className="font-medium text-sm">Import Contacts</span>
                                </Link>
                                <Link href="/dashboard/whatsapp/templates"
                                    className="flex items-center space-x-3 p-4 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                                    <Plus className="w-5 h-5 flex-shrink-0" />
                                    <span className="font-medium text-sm">New Template</span>
                                </Link>
                            </div>
                        </motion.div>
                    </div>

                    {/* Recent Campaigns — REAL DATA */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
                        className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                    >
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Calendar className="w-5 h-5" />
                                Recent Campaigns
                            </h3>
                            <Link href="/dashboard/campaigns" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                                View All →
                            </Link>
                        </div>

                        {recentCampaigns.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16">
                                <Send className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
                                <p className="text-gray-500 dark:text-gray-400 font-medium">No campaigns yet</p>
                                <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">Create your first campaign to get started</p>
                                <Link href="/dashboard/campaigns/create"
                                    className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                                    Create Campaign
                                </Link>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-gray-50 dark:bg-gray-700/50">
                                            <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Campaign</th>
                                            <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                            <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sent</th>
                                            <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Delivered</th>
                                            <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Read</th>
                                            <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {recentCampaigns.map((campaign) => (
                                            <tr key={campaign.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                                <td className="py-4 px-6">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                                            <Send className="w-4 h-4 text-white" />
                                                        </div>
                                                        <span className="font-medium text-gray-900 dark:text-white text-sm">{campaign.name}</span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getCampaignStatusStyle(campaign.status)}`}>
                                                        {campaign.status}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6 text-sm font-medium text-gray-900 dark:text-white">
                                                    {(campaign.sent_count ?? 0).toLocaleString()}
                                                </td>
                                                <td className="py-4 px-6 text-sm font-medium text-gray-900 dark:text-white">
                                                    {(campaign.delivered_count ?? 0).toLocaleString()}
                                                </td>
                                                <td className="py-4 px-6 text-sm font-medium text-gray-900 dark:text-white">
                                                    {(campaign.read_count ?? 0).toLocaleString()}
                                                </td>
                                                <td className="py-4 px-6 text-xs text-gray-500 dark:text-gray-400">
                                                    {new Date(campaign.created_at).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </DashboardLayout>
    );
}
