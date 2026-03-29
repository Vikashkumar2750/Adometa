'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { motion } from 'framer-motion';
import axios from 'axios';
import Cookies from 'js-cookie';
import {
    Shield, AlertTriangle, CheckCircle, XCircle, Clock,
    Download, RefreshCw, Lock, Eye, Database, FileText,
    Building2, Users,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
function getHeaders() {
    return { Authorization: `Bearer ${Cookies.get('token') || ''}` };
}

interface AuditLog {
    id: string;
    tenant_id: string | null;
    action: string;
    resource_type: string | null;
    metadata: Record<string, any> | null;
    ip_address: string | null;
    created_at: string;
}

interface ComplianceSummary {
    totalEvents: number;
    failedLogins: number;
    deleteActions: number;
    dataExports: number;
    suspensionEvents: number;
    loginEvents: number;
}

function computeCompliance(logs: AuditLog[]): ComplianceSummary {
    return {
        totalEvents: logs.length,
        failedLogins: logs.filter(l => l.action === 'LOGIN_FAILED').length,
        deleteActions: logs.filter(l => l.action === 'DELETE').length,
        dataExports: logs.filter(l => l.action === 'EXPORT' || l.metadata?.endpoint?.includes('export')).length,
        suspensionEvents: logs.filter(l => l.action === 'SUSPEND').length,
        loginEvents: logs.filter(l => l.action === 'LOGIN').length,
    };
}

interface Tenant {
    id: string;
    business_name: string;
    owner_email: string;
    status: string;
    plan: string;
    created_at: string;
}

export default function CompliancePage() {
    const router = useRouter();
    const { user } = useAuthStore();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [summary, setSummary] = useState<ComplianceSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedTab, setSelectedTab] = useState<'overview' | 'failed_logins' | 'deletions' | 'tenants'>('overview');

    useEffect(() => {
        if (!user || user.role !== 'SUPER_ADMIN') { router.push('/login'); return; }
        loadData();
    }, [user, router]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [logsRes, tenantsRes] = await Promise.all([
                axios.get(`${API}/tenants/audit-logs?limit=200`, { headers: getHeaders() }),
                axios.get(`${API}/tenants?limit=200`, { headers: getHeaders() }),
            ]);
            const allLogs: AuditLog[] = logsRes.data?.data || [];
            const allTenants: Tenant[] = tenantsRes.data?.data || [];
            setLogs(allLogs);
            setTenants(allTenants);
            setSummary(computeCompliance(allLogs));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const failedLogins = logs.filter(l => l.action === 'LOGIN_FAILED');
    const deletions = logs.filter(l => l.action === 'DELETE');
    const suspended = tenants.filter(t => t.status === 'SUSPENDED');
    const pending = tenants.filter(t => t.status === 'PENDING_APPROVAL');

    const tabs = [
        { id: 'overview', label: 'Overview', icon: Shield },
        { id: 'failed_logins', label: `Failed Logins (${failedLogins.length})`, icon: Lock },
        { id: 'deletions', label: `Data Deletions (${deletions.length})`, icon: Database },
        { id: 'tenants', label: 'Tenant Status', icon: Building2 },
    ];

    const score = summary ? Math.max(0, 100 - summary.failedLogins * 2 - summary.deleteActions) : 100;
    const scoreColor = score >= 80 ? 'text-green-600' : score >= 60 ? 'text-amber-500' : 'text-red-600';

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Shield className="w-6 h-6 text-blue-600" />
                        Compliance & Security
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Platform security monitoring and compliance tracking</p>
                </div>
                <button onClick={loadData} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <>
                    {/* Overview Stats */}
                    {summary && (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 flex flex-col items-center justify-center">
                                <div className={`text-4xl font-black ${scoreColor}`}>{score}</div>
                                <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">Security Score</div>
                                <div className="text-xs text-gray-400 mt-1">{score >= 80 ? 'Good' : score >= 60 ? 'Needs Attention' : 'Critical'}</div>
                            </motion.div>
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                                <div className="flex items-center gap-2 mb-2 text-red-600"><Lock className="w-5 h-5" /><span className="text-sm font-medium">Failed Logins</span></div>
                                <div className="text-3xl font-bold text-gray-900 dark:text-white">{summary.failedLogins}</div>
                                <div className="text-xs text-gray-400 mt-1">Security risk indicator</div>
                            </motion.div>
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                                <div className="flex items-center gap-2 mb-2 text-orange-600"><Database className="w-5 h-5" /><span className="text-sm font-medium">Data Deletions</span></div>
                                <div className="text-3xl font-bold text-gray-900 dark:text-white">{summary.deleteActions}</div>
                                <div className="text-xs text-gray-400 mt-1">GDPR data removal events</div>
                            </motion.div>
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                                <div className="flex items-center gap-2 mb-2 text-purple-600"><Users className="w-5 h-5" /><span className="text-sm font-medium">Total Events</span></div>
                                <div className="text-3xl font-bold text-gray-900 dark:text-white">{summary.totalEvents}</div>
                                <div className="text-xs text-gray-400 mt-1">{summary.loginEvents} logins tracked</div>
                            </motion.div>
                        </div>
                    )}

                    {/* Tabs */}
                    <div className="flex gap-2 mb-4 border-b border-gray-200 dark:border-gray-700">
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            const isActive = selectedTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setSelectedTab(tab.id as any)}
                                    className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${isActive ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                                >
                                    <Icon className="w-4 h-4" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Tab panels */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                        {selectedTab === 'overview' && (
                            <div className="p-6 space-y-4">
                                <h3 className="font-semibold text-gray-900 dark:text-white">Compliance Checklist</h3>
                                {[
                                    { label: 'Audit logging enabled', ok: true, desc: `${summary?.totalEvents || 0} events recorded` },
                                    { label: 'Failed login rate below 5%', ok: (summary?.failedLogins || 0) < 5, desc: `${summary?.failedLogins || 0} failed attempts` },
                                    { label: 'No suspended tenants', ok: suspended.length === 0, desc: `${suspended.length} suspended tenant(s)` },
                                    { label: 'No pending approvals', ok: pending.length === 0, desc: `${pending.length} pending approval(s)` },
                                    { label: 'Data deletion requests tracked', ok: true, desc: `${summary?.deleteActions || 0} deletion events` },
                                    { label: 'IP address logging active', ok: logs.some(l => l.ip_address !== null), desc: 'IP tracking confirmed' },
                                ].map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                                        <div className="flex items-center gap-3">
                                            {item.ok ? <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" /> : <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />}
                                            <div>
                                                <div className="text-sm font-medium text-gray-900 dark:text-white">{item.label}</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">{item.desc}</div>
                                            </div>
                                        </div>
                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${item.ok ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'}`}>
                                            {item.ok ? 'PASS' : 'REVIEW'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {selectedTab === 'failed_logins' && (
                            <div className="overflow-x-auto">
                                {failedLogins.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-48 text-gray-500 dark:text-gray-400">
                                        <CheckCircle className="w-12 h-12 mb-3 text-green-500 opacity-60" />
                                        <p>No failed login attempts recorded</p>
                                    </div>
                                ) : (
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                                            <tr>
                                                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Time</th>
                                                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Email Attempted</th>
                                                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">IP Address</th>
                                                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Role</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                            {failedLogins.map(log => (
                                                <tr key={log.id} className="hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
                                                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{new Date(log.created_at).toLocaleString()}</td>
                                                    <td className="px-4 py-3 font-medium text-red-700 dark:text-red-400">{log.metadata?.userEmail || '—'}</td>
                                                    <td className="px-4 py-3 font-mono text-sm text-gray-600 dark:text-gray-300">{log.ip_address || '—'}</td>
                                                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{log.metadata?.userRole || '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        )}

                        {selectedTab === 'deletions' && (
                            <div className="overflow-x-auto">
                                {deletions.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-48 text-gray-500 dark:text-gray-400">
                                        <Database className="w-12 h-12 mb-3 opacity-30" />
                                        <p>No data deletion events recorded</p>
                                    </div>
                                ) : (
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                                            <tr>
                                                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Time</th>
                                                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Resource</th>
                                                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Performed By</th>
                                                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">IP</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                            {deletions.map(log => (
                                                <tr key={log.id} className="hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-colors">
                                                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{new Date(log.created_at).toLocaleString()}</td>
                                                    <td className="px-4 py-3 text-gray-900 dark:text-white">{(log as any).resource_type || '—'} {(log as any).resource_id ? `(${(log as any).resource_id.slice(0, 8)}…)` : ''}</td>
                                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{log.metadata?.userEmail || '—'}</td>
                                                    <td className="px-4 py-3 font-mono text-sm text-gray-500 dark:text-gray-400">{log.ip_address || '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        )}

                        {selectedTab === 'tenants' && (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                                        <tr>
                                            <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Tenant</th>
                                            <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Owner</th>
                                            <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Status</th>
                                            <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Plan</th>
                                            <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Joined</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {tenants.map(t => (
                                            <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{t.business_name}</td>
                                                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{t.owner_email}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${t.status === 'ACTIVE' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' :
                                                        t.status === 'PENDING_APPROVAL' ? 'bg-amber-100 text-amber-700' :
                                                            t.status === 'SUSPENDED' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                                                        }`}>
                                                        {t.status.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{(t.plan || '—').replace('_', ' ')}</td>
                                                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{new Date(t.created_at).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
