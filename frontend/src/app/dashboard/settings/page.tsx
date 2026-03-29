'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Settings, User, Bell, Shield, Smartphone, Users,
    Save, ChevronRight, Eye, EyeOff, Copy, CheckCheck,
    Loader2, CheckCircle2, AlertCircle, Key, Plus,
    Trash2, Pencil, RefreshCw, Download, Clock,
    LogIn, LogOut, Activity, Filter, Code2, Zap,
    ToggleLeft, ToggleRight, X, AlertOctagon, Calendar,
    BarChart2,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import axios from 'axios';
import Cookies from 'js-cookie';
import toast, { Toaster } from 'react-hot-toast';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

function getHeaders() {
    const token = Cookies.get('token') || localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface TeamMember {
    id: string;
    name: string;
    email: string;
    role: string;
    is_active: boolean;
    last_login_at: string | null;
    created_at: string;
}

interface ActivityLog {
    id: string;
    user_name: string;
    user_email: string;
    user_role: string;
    activity_type: string;
    description: string;
    ip_address: string;
    session_duration_seconds: number | null;
    created_at: string;
}

type Period = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'halfyearly' | 'yearly';

const ROLES = [
    { value: 'TENANT_ADMIN', label: 'Admin', desc: 'Full access to all features', color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' },
    { value: 'TENANT_MARKETER', label: 'Marketer', desc: 'Create and manage campaigns', color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
    { value: 'TENANT_DEVELOPER', label: 'Developer', desc: 'API access, webhooks, templates', color: 'text-green-600 bg-green-50 dark:bg-green-900/20' },
    { value: 'READ_ONLY', label: 'Viewer', desc: 'Read-only access to all data', color: 'text-gray-600 bg-gray-50 dark:bg-gray-700' },
];

const ACTIVITY_ICON: Record<string, { icon: any; color: string }> = {
    LOGIN: { icon: LogIn, color: 'text-green-500' },
    LOGOUT: { icon: LogOut, color: 'text-gray-400' },
    SESSION_END: { icon: Clock, color: 'text-orange-400' },
    PASSWORD_CHANGE: { icon: Key, color: 'text-amber-500' },
    ACTION: { icon: Activity, color: 'text-blue-400' },
};

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
    { value: 'daily', label: 'Today' },
    { value: 'weekly', label: 'Last 7 days' },
    { value: 'monthly', label: 'Last 30 days' },
    { value: 'quarterly', label: 'Last 3 months' },
    { value: 'halfyearly', label: 'Last 6 months' },
    { value: 'yearly', label: 'Last year' },
];

function fmtDate(d: string) {
    return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtDuration(secs: number | null) {
    if (!secs) return '—';
    const m = Math.floor(secs / 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m`;
    return `${m}m`;
}

// ─── Team Management Tab ──────────────────────────────────────────────────────
function TeamTab({ userRole }: { userRole: string }) {
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [logsTotal, setLogsTotal] = useState(0);
    const [period, setPeriod] = useState<Period>('monthly');
    const [activeView, setActiveView] = useState<'members' | 'activity'>('members');
    const [loading, setLoading] = useState(true);
    const [logsLoading, setLogsLoading] = useState(false);
    const [showAdd, setShowAdd] = useState(false);
    const [editMember, setEditMember] = useState<TeamMember | null>(null);
    const [resetTarget, setResetTarget] = useState<TeamMember | null>(null);
    const [newPwd, setNewPwd] = useState('');
    const [downloading, setDownloading] = useState(false);

    // New member form
    const [form, setForm] = useState({ name: '', email: '', password: '', role: 'TENANT_MARKETER' });
    const [saving, setSaving] = useState(false);

    const isAdmin = ['TENANT_ADMIN', 'SUPER_ADMIN'].includes(userRole);

    const loadMembers = useCallback(async () => {
        try {
            setLoading(true);
            const { data } = await axios.get(`${API_BASE}/team/members`, { headers: getHeaders() });
            setMembers(Array.isArray(data) ? data : []);
        } catch { toast.error('Failed to load team members'); }
        finally { setLoading(false); }
    }, []);

    const loadLogs = useCallback(async () => {
        try {
            setLogsLoading(true);
            const { data } = await axios.get(`${API_BASE}/team/activity?period=${period}&limit=100`, { headers: getHeaders() });
            setLogs(data.items || []);
            setLogsTotal(data.total || 0);
        } catch { toast.error('Failed to load activity logs'); }
        finally { setLogsLoading(false); }
    }, [period]);

    useEffect(() => { loadMembers(); }, [loadMembers]);
    useEffect(() => { if (activeView === 'activity') loadLogs(); }, [activeView, loadLogs]);

    const handleCreate = async () => {
        if (!form.name || !form.email || !form.password) {
            toast.error('Name, email, and password are required');
            return;
        }
        try {
            setSaving(true);
            await axios.post(`${API_BASE}/team/members`, form, { headers: getHeaders() });
            toast.success(`Team member ${form.name} added!`);
            setShowAdd(false);
            setForm({ name: '', email: '', password: '', role: 'TENANT_MARKETER' });
            loadMembers();
        } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Failed to add member');
        } finally { setSaving(false); }
    };

    const handleToggleActive = async (member: TeamMember) => {
        try {
            await axios.patch(`${API_BASE}/team/members/${member.id}`,
                { is_active: !member.is_active }, { headers: getHeaders() });
            toast.success(`${member.name} ${member.is_active ? 'deactivated' : 'activated'}`);
            loadMembers();
        } catch { toast.error('Failed to update member'); }
    };

    const handleUpdateRole = async (member: TeamMember, role: string) => {
        try {
            await axios.patch(`${API_BASE}/team/members/${member.id}`, { role }, { headers: getHeaders() });
            toast.success('Role updated');
            setEditMember(null);
            loadMembers();
        } catch { toast.error('Failed to update role'); }
    };

    const handleDelete = async (member: TeamMember) => {
        if (!confirm(`Remove ${member.name} from the team? They will lose access immediately.`)) return;
        try {
            await axios.delete(`${API_BASE}/team/members/${member.id}`, { headers: getHeaders() });
            toast.success(`${member.name} removed`);
            loadMembers();
        } catch { toast.error('Failed to remove member'); }
    };

    const handleResetPwd = async () => {
        if (!resetTarget || newPwd.length < 8) {
            toast.error('Password must be at least 8 characters');
            return;
        }
        try {
            await axios.post(`${API_BASE}/team/members/${resetTarget.id}/reset-password`,
                { password: newPwd }, { headers: getHeaders() });
            toast.success(`Password reset for ${resetTarget.name}`);
            setResetTarget(null);
            setNewPwd('');
        } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Failed to reset password');
        }
    };

    const downloadReport = async () => {
        try {
            setDownloading(true);
            const res = await axios.get(`${API_BASE}/team/activity/report?period=${period}`,
                { headers: getHeaders(), responseType: 'blob' });
            const url = URL.createObjectURL(res.data);
            const a = document.createElement('a');
            a.href = url;
            a.download = `team-activity-${period}-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        } catch { toast.error('Failed to download report'); }
        finally { setDownloading(false); }
    };

    const roleInfo = (role: string) => ROLES.find(r => r.value === role) || ROLES[3];

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-3">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Team Management</h2>
                {isAdmin && (
                    <button onClick={() => setShowAdd(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-sm transition-all">
                        <Plus className="w-4 h-4" /> Add Member
                    </button>
                )}
            </div>

            {/* Sub-tabs */}
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl w-fit">
                {(['members', 'activity'] as const).map(tab => (
                    <button key={tab} onClick={() => setActiveView(tab)}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${activeView === tab ? 'bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                        {tab === 'members' ? '👥 Members' : '📋 Activity Logs'}
                    </button>
                ))}
            </div>

            {/* ── Members List ───────────────────────────────────────────────── */}
            {activeView === 'members' && (
                <div className="space-y-2">
                    {loading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />
                        ))
                    ) : members.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p>No team members yet — add your first teammate</p>
                        </div>
                    ) : members.map((m, i) => {
                        const ri = roleInfo(m.role);
                        return (
                            <motion.div key={m.id}
                                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className={`flex items-center justify-between p-4 rounded-xl border transition-all ${!m.is_active ? 'opacity-60 bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-700' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-700'}`}>
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                        {m.name[0]?.toUpperCase() || '?'}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium text-gray-900 dark:text-white text-sm">{m.name}</p>
                                            {!m.is_active && <span className="text-xs bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-1.5 py-0.5 rounded">Inactive</span>}
                                        </div>
                                        <p className="text-xs text-gray-500">{m.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${ri.color}`}>{ri.label}</span>
                                    {m.last_login_at && (
                                        <span className="text-xs text-gray-400 hidden md:block">
                                            Last login: {new Date(m.last_login_at).toLocaleDateString('en-IN')}
                                        </span>
                                    )}
                                    {isAdmin && (
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => setEditMember(m)}
                                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="Change role">
                                                <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={() => { setResetTarget(m); setNewPwd(''); }}
                                                className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors" title="Reset password">
                                                <Key className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={() => handleToggleActive(m)}
                                                className={`p-1.5 rounded-lg transition-colors ${m.is_active ? 'text-gray-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20' : 'text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'}`}
                                                title={m.is_active ? 'Deactivate' : 'Activate'}>
                                                {m.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                            </button>
                                            <button onClick={() => handleDelete(m)}
                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Remove member">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}

                    {/* Role legend */}
                    <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">ROLE PERMISSIONS</p>
                        <div className="grid grid-cols-2 gap-2">
                            {ROLES.map(r => (
                                <div key={r.value} className="text-xs">
                                    <span className={`font-semibold ${r.color.split(' ')[0]}`}>{r.label}</span>
                                    <span className="text-gray-500 dark:text-gray-400 ml-1">— {r.desc}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Activity Logs ──────────────────────────────────────────────── */}
            {activeView === 'activity' && (
                <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-gray-400" />
                            <select value={period} onChange={e => setPeriod(e.target.value as Period)}
                                className="text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                {PERIOD_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                            </select>
                        </div>
                        <button onClick={loadLogs} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                            <RefreshCw className={`w-4 h-4 ${logsLoading ? 'animate-spin' : ''}`} />
                        </button>
                        <button onClick={downloadReport} disabled={downloading}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 disabled:opacity-60 transition-all ml-auto">
                            {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                            Download CSV
                        </button>
                    </div>

                    <p className="text-xs text-gray-400">{logsTotal} events in selected period</p>

                    {logsLoading ? (
                        Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />)
                    ) : logs.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            <p>No activity logs in this period</p>
                        </div>
                    ) : logs.map((log, i) => {
                        const cfg = ACTIVITY_ICON[log.activity_type] || ACTIVITY_ICON.ACTION;
                        const Icon = cfg.icon;
                        return (
                            <motion.div key={log.id}
                                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.03 }}
                                className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl hover:border-gray-200 dark:hover:border-gray-600 transition-all">
                                <div className={`p-1.5 rounded-lg bg-gray-50 dark:bg-gray-700 flex-shrink-0 mt-0.5`}>
                                    <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{log.user_name || log.user_email}</p>
                                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${ROLES.find(r => r.value === log.user_role)?.color || 'text-gray-500 bg-gray-100'}`}>
                                            {ROLES.find(r => r.value === log.user_role)?.label || log.user_role}
                                        </span>
                                        <span className="text-xs font-medium text-gray-500 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                                            {log.activity_type.replace(/_/g, ' ')}
                                        </span>
                                        {log.session_duration_seconds && (
                                            <span className="text-xs text-blue-500">⏱ {fmtDuration(log.session_duration_seconds)}</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                                        <span>{fmtDate(log.created_at)}</span>
                                        {log.ip_address && <span className="font-mono">{log.ip_address}</span>}
                                        {log.description && <span>· {log.description}</span>}
                                    </p>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* ── Add Member Modal ──────────────────────────────────────────── */}
            <AnimatePresence>
                {showAdd && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                        onClick={() => setShowAdd(false)}>
                        <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md p-6">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-5">Add Team Member</h3>
                            <div className="space-y-4">
                                {[
                                    { label: 'Full Name', key: 'name', type: 'text', placeholder: 'e.g. Priya Sharma' },
                                    { label: 'Work Email', key: 'email', type: 'email', placeholder: 'priya@company.com' },
                                    { label: 'Temporary Password', key: 'password', type: 'password', placeholder: 'Min. 8 characters' },
                                ].map(f => (
                                    <div key={f.key}>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{f.label}</label>
                                        <input type={f.type} placeholder={f.placeholder}
                                            value={(form as any)[f.key]}
                                            onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white text-sm" />
                                    </div>
                                ))}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {ROLES.map(r => (
                                            <button key={r.value} type="button"
                                                onClick={() => setForm(p => ({ ...p, role: r.value }))}
                                                className={`p-3 rounded-xl border-2 text-left transition-all ${form.role === r.value ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'}`}>
                                                <p className={`text-xs font-bold ${r.color.split(' ')[0]}`}>{r.label}</p>
                                                <p className="text-xs text-gray-400 mt-0.5">{r.desc}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button onClick={() => setShowAdd(false)}
                                    className="flex-1 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all">
                                    Cancel
                                </button>
                                <button onClick={handleCreate} disabled={saving}
                                    className="flex-1 py-2.5 text-sm font-semibold bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-60 flex items-center justify-center gap-2 transition-all">
                                    {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Adding…</> : <><Plus className="w-4 h-4" />Add Member</>}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Edit Role Modal ───────────────────────────────────────────── */}
            <AnimatePresence>
                {editMember && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                        onClick={() => setEditMember(null)}>
                        <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-sm p-6">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Change Role</h3>
                            <p className="text-sm text-gray-500 mb-5">{editMember.name}</p>
                            <div className="space-y-2">
                                {ROLES.map(r => (
                                    <button key={r.value} onClick={() => handleUpdateRole(editMember, r.value)}
                                        className={`w-full p-3 rounded-xl border-2 text-left transition-all ${editMember.role === r.value ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'}`}>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className={`text-sm font-bold ${r.color.split(' ')[0]}`}>{r.label}</p>
                                                <p className="text-xs text-gray-400 mt-0.5">{r.desc}</p>
                                            </div>
                                            {editMember.role === r.value && <CheckCircle2 className="w-4 h-4 text-blue-500" />}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Reset Password Modal ──────────────────────────────────────── */}
            <AnimatePresence>
                {resetTarget && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                        onClick={() => setResetTarget(null)}>
                        <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-sm p-6">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Reset Password</h3>
                            <p className="text-sm text-gray-500 mb-5">Set a new password for <span className="font-medium text-gray-700 dark:text-gray-300">{resetTarget.name}</span></p>
                            <input type="password" placeholder="New password (min. 8 chars)" value={newPwd} onChange={e => setNewPwd(e.target.value)}
                                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white text-sm mb-4" />
                            <div className="flex gap-3">
                                <button onClick={() => setResetTarget(null)} className="flex-1 py-2.5 text-sm font-medium border border-gray-200 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
                                <button onClick={handleResetPwd} disabled={newPwd.length < 8}
                                    className="flex-1 py-2.5 text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
                                    <Key className="w-4 h-4" /> Reset Password
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── Existing Tabs (copied lean versions) ─────────────────────────────────────
function ProfileTab() {
    const { user, setUser } = useAuthStore();
    const [name, setName] = useState(user?.name || '');
    const [saving, setSaving] = useState(false);
    useEffect(() => { setName(user?.name || ''); }, [user]);
    const handleSave = async () => {
        if (!name.trim()) { toast.error('Name cannot be empty'); return; }
        try {
            setSaving(true);
            await axios.patch(`${API_BASE}/auth/profile`, { name: name.trim() }, { headers: getHeaders() });
            setUser({ ...user!, name: name.trim() });
            toast.success('Profile updated!');
        } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed'); }
        finally { setSaving(false); }
    };
    return (
        <div className="space-y-5">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-3">Profile Information</h2>
            <div className="flex items-center gap-4 pb-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">{(name[0] || 'U').toUpperCase()}</div>
                <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{user?.name}</p>
                    <p className="text-sm text-gray-500">{user?.role?.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{user?.email}</p>
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Display Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSave()}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white text-sm" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email Address</label>
                <input type="email" value={user?.email || ''} readOnly className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 text-sm cursor-not-allowed" />
                <p className="text-xs text-gray-400 mt-1">Email cannot be changed from here</p>
            </div>
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                <button onClick={handleSave} disabled={saving || !name.trim() || name.trim() === user?.name}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium text-sm bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saving ? 'Saving…' : 'Save Changes'}
                </button>
            </div>
        </div>
    );
}

function SecurityTab() {
    const { user } = useAuthStore();
    const [current, setCurrent] = useState('');
    const [newPw, setNewPw] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [changing, setChanging] = useState(false);
    const isSuperAdminEnv = user?.id === '00000000-0000-0000-0000-000000000000';
    const handleChange = async () => {
        if (newPw !== confirm) { toast.error('Passwords do not match'); return; }
        if (newPw.length < 8) { toast.error('Min 8 characters'); return; }
        try {
            setChanging(true);
            await axios.post(`${API_BASE}/auth/change-password`, { currentPassword: current, newPassword: newPw }, { headers: getHeaders() });
            toast.success('Password changed!');
            setCurrent(''); setNewPw(''); setConfirm('');
        } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed'); }
        finally { setChanging(false); }
    };
    return (
        <div className="space-y-5">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-3">Security Settings</h2>
            {isSuperAdminEnv && (
                <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-400">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <p>Super Admin password is managed via <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">.env → SUPER_ADMIN_PASSWORD</code></p>
                </div>
            )}
            {['Current', 'New', 'Confirm New'].map((lbl, idx) => (
                <div key={lbl}>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">{lbl} Password</label>
                    <div className="relative">
                        <input type={idx === 1 && showNew ? 'text' : idx === 0 && showCurrent ? 'text' : 'password'}
                            value={idx === 0 ? current : idx === 1 ? newPw : confirm}
                            onChange={e => idx === 0 ? setCurrent(e.target.value) : idx === 1 ? setNewPw(e.target.value) : setConfirm(e.target.value)}
                            disabled={isSuperAdminEnv} placeholder="••••••••"
                            className="w-full px-4 py-2.5 pr-10 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed" />
                        {idx < 2 && (
                            <button type="button" onClick={() => idx === 0 ? setShowCurrent(v => !v) : setShowNew(v => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                {(idx === 0 ? showCurrent : showNew) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        )}
                    </div>
                </div>
            ))}
            <div className="flex justify-end">
                <button onClick={handleChange} disabled={changing || isSuperAdminEnv || !current || !newPw || newPw !== confirm || newPw.length < 8}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium text-sm bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md disabled:opacity-50 transition-all">
                    {changing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                    {changing ? 'Changing…' : 'Change Password'}
                </button>
            </div>
        </div>
    );
}

function NotificationsTab() {
    const DEFAULT_PREFS = { campaignComplete: true, deliveryFailures: true, newContacts: false, weeklyReport: true, securityAlerts: true };
    const [prefs, setPrefs] = useState(DEFAULT_PREFS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const labels: Record<string, { title: string; desc: string; icon: any; color: string }> = {
        campaignComplete: { title: 'Campaign Completed', desc: 'Get notified when a campaign finishes sending', icon: BarChart2, color: 'text-blue-500' },
        deliveryFailures: { title: 'Delivery Failures', desc: 'Alert when message delivery fails above threshold', icon: AlertOctagon, color: 'text-red-500' },
        newContacts: { title: 'New Contacts', desc: 'Notify when new contacts are added via import', icon: Users, color: 'text-emerald-500' },
        weeklyReport: { title: 'Weekly Report', desc: 'Receive a weekly performance summary email', icon: Calendar, color: 'text-indigo-500' },
        securityAlerts: { title: 'Security Alerts', desc: 'Important account & API key security alerts', icon: Shield, color: 'text-amber-500' },
    };

    useEffect(() => {
        axios.get(`${API_BASE}/billing/notification-prefs`, { headers: getHeaders() })
            .then(r => setPrefs({ ...DEFAULT_PREFS, ...r.data }))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await axios.patch(`${API_BASE}/billing/notification-prefs`, prefs, { headers: getHeaders() });
            toast.success('Notification preferences saved!');
        } catch { toast.error('Failed to save preferences'); }
        finally { setSaving(false); }
    };

    if (loading) return <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-gray-100 dark:bg-gray-700/50 rounded-xl animate-pulse" />)}</div>;

    return (
        <div className="space-y-5">
            <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Notification Preferences</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Control which events trigger notifications for your account.</p>
            </div>
            <div className="space-y-2">
                {Object.entries(prefs).map(([key, val]) => {
                    const meta = labels[key];
                    if (!meta) return null;
                    const Icon = meta.icon;
                    return (
                        <div key={key} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${val ? 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10' : 'border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/20'
                            }`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center  ${val ? 'bg-white dark:bg-gray-800 shadow-sm' : 'bg-gray-200/70 dark:bg-gray-600/50'
                                    }`}>
                                    <Icon className={`w-4 h-4 ${val ? meta.color : 'text-gray-400'}`} />
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-white text-sm">{meta.title}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">{meta.desc}</p>
                                </div>
                            </div>
                            <button onClick={() => setPrefs(p => ({ ...p, [key]: !val }))}
                                className={`relative flex-shrink-0 w-12 h-6 rounded-full transition-colors duration-200 ${val ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                                    }`}>
                                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${val ? 'translate-x-7' : 'translate-x-1'
                                    }`} />
                            </button>
                        </div>
                    );
                })}
            </div>
            <div className="flex justify-end">
                <button onClick={handleSave} disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium text-sm bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md disabled:opacity-50 transition-all hover:opacity-90">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saving ? 'Saving…' : 'Save Preferences'}
                </button>
            </div>
        </div>
    );
}

// ─── API Keys Tab ─────────────────────────────────────────────────────────────
interface ApiKeyRecord {
    id: string;
    name: string;
    key_prefix: string;
    scopes: string;
    is_active: boolean;
    expires_at: string | null;
    last_used_at: string | null;
    total_requests: number;
    created_at: string;
}

const SCOPE_OPTIONS = [
    { value: 'read', label: 'Read', desc: 'View contacts, campaigns, analytics', color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
    { value: 'write', label: 'Write', desc: 'Create and update records', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' },
    { value: 'campaigns', label: 'Campaigns', desc: 'Trigger and manage campaigns', color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' },
    { value: 'contacts', label: 'Contacts', desc: 'Import, tag, and manage contacts', color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' },
];

function ApiKeysTab() {
    const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [newRawKey, setNewRawKey] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [form, setForm] = useState({ name: '', scopes: ['read'], expiresIn: 0 });
    const [creating, setCreating] = useState(false);
    const [revoking, setRevoking] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            const { data } = await axios.get(`${API_BASE}/api-keys`, { headers: getHeaders() });
            setKeys(Array.isArray(data) ? data : []);
        } catch { toast.error('Failed to load API keys'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleCreate = async () => {
        if (!form.name.trim()) { toast.error('Key name is required'); return; }
        setCreating(true);
        try {
            const { data } = await axios.post(`${API_BASE}/api-keys`, {
                name: form.name.trim(),
                scopes: form.scopes,
                expiresIn: form.expiresIn || undefined,
            }, { headers: getHeaders() });
            setNewRawKey(data.raw_key);
            setShowCreate(false);
            setForm({ name: '', scopes: ['read'], expiresIn: 0 });
            load();
        } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Failed to create API key');
        } finally { setCreating(false); }
    };

    const handleRevoke = async (id: string) => {
        setRevoking(id);
        try {
            await axios.post(`${API_BASE}/api-keys/${id}/revoke`, {}, { headers: getHeaders() });
            toast.success('API key revoked');
            load();
        } catch { toast.error('Failed to revoke key'); }
        finally { setRevoking(null); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Permanently delete this API key? This cannot be undone.')) return;
        try {
            await axios.delete(`${API_BASE}/api-keys/${id}`, { headers: getHeaders() });
            toast.success('API key deleted');
            load();
        } catch { toast.error('Failed to delete key'); }
    };

    const copyKey = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const toggleScope = (scope: string) => {
        setForm(f => ({
            ...f,
            scopes: f.scopes.includes(scope)
                ? f.scopes.filter(s => s !== scope)
                : [...f.scopes, scope],
        }));
    };

    const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Never';
    const scopeChips = (scopes: string) => scopes.split(',').map(s => {
        const opt = SCOPE_OPTIONS.find(o => o.value === s.trim());
        return opt;
    }).filter(Boolean);

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">API Keys</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Generate keys to authenticate API requests from your apps.</p>
                </div>
                {!showCreate && (
                    <button onClick={() => setShowCreate(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity">
                        <Plus className="w-4 h-4" /> Generate Key
                    </button>
                )}
            </div>

            {/* Newly generated key banner */}
            <AnimatePresence>
                {newRawKey && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300 mb-1">🔑 Your new API key — copy it now, it won't be shown again!</p>
                                <div className="flex items-center gap-2 mt-2">
                                    <code className="flex-1 block px-3 py-2 bg-white dark:bg-gray-800 border border-emerald-300 dark:border-emerald-700 rounded-lg text-xs font-mono text-gray-800 dark:text-gray-200 break-all">
                                        {newRawKey}
                                    </code>
                                    <button onClick={() => copyKey(newRawKey)}
                                        className="flex-shrink-0 p-2 bg-emerald-100 dark:bg-emerald-800 hover:bg-emerald-200 dark:hover:bg-emerald-700 rounded-lg transition-colors">
                                        {copied ? <CheckCheck className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-emerald-600" />}
                                    </button>
                                </div>
                            </div>
                            <button onClick={() => setNewRawKey(null)} className="text-emerald-500 hover:text-emerald-700 p-1">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Create form */}
            <AnimatePresence>
                {showCreate && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden">
                        <div className="p-5 border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl space-y-4">
                            <p className="font-medium text-gray-900 dark:text-white text-sm">New API Key</p>
                            {/* Name */}
                            <div>
                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Key Name</label>
                                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    placeholder="e.g. Production App, Zapier Integration"
                                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            {/* Scopes */}
                            <div>
                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Permissions</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {SCOPE_OPTIONS.map(scope => (
                                        <button key={scope.value}
                                            onClick={() => toggleScope(scope.value)}
                                            className={`p-2.5 rounded-lg border text-left transition-all ${form.scopes.includes(scope.value)
                                                    ? 'border-blue-400 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/30'
                                                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                                                }`}>
                                            <p className="text-xs font-semibold text-gray-900 dark:text-white">{scope.label}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">{scope.desc}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {/* Expiry */}
                            <div>
                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Expires After</label>
                                <select value={form.expiresIn} onChange={e => setForm(f => ({ ...f, expiresIn: +e.target.value }))}
                                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value={0}>Never</option>
                                    <option value={30}>30 days</option>
                                    <option value={90}>90 days</option>
                                    <option value={180}>180 days</option>
                                    <option value={365}>1 year</option>
                                </select>
                            </div>
                            {/* Actions */}
                            <div className="flex gap-3">
                                <button onClick={() => setShowCreate(false)}
                                    className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                                    Cancel
                                </button>
                                <button onClick={handleCreate} disabled={creating || !form.name.trim() || form.scopes.length === 0}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                                    {creating ? 'Generating…' : 'Generate Key'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Key List */}
            {loading ? (
                <div className="space-y-3">{[...Array(2)].map((_, i) => <div key={i} className="h-20 bg-gray-100 dark:bg-gray-700/50 rounded-xl animate-pulse" />)}</div>
            ) : keys.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
                        <Code2 className="w-7 h-7 text-gray-400" />
                    </div>
                    <p className="font-medium text-gray-600 dark:text-gray-400">No API keys yet</p>
                    <p className="text-sm text-gray-400 mt-1">Generate your first key to start integrating with our API.</p>
                    <a href="#api-docs" className="mt-3 text-sm text-blue-600 hover:underline flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5" /> View API Documentation
                    </a>
                </div>
            ) : (
                <div className="space-y-3">
                    {keys.map(k => (
                        <motion.div key={k.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className={`p-4 rounded-xl border ${k.is_active
                                    ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700/30'
                                    : 'border-red-200 dark:border-red-900/40 bg-red-50/30 dark:bg-red-900/10 opacity-70'
                                }`}>
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="font-medium text-gray-900 dark:text-white text-sm">{k.name}</p>
                                        {!k.is_active && (
                                            <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs rounded-full font-medium">Revoked</span>
                                        )}
                                        {k.expires_at && new Date(k.expires_at) < new Date() && (
                                            <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-xs rounded-full font-medium">Expired</span>
                                        )}
                                    </div>
                                    <p className="text-xs font-mono text-gray-500 dark:text-gray-400 mt-1">{k.key_prefix}••••••••••••••••••••••••</p>
                                    {/* Scope chips */}
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                        {scopeChips(k.scopes).map(s => s && (
                                            <span key={s.value} className={`px-2 py-0.5 text-xs rounded-full font-medium ${s.color}`}>{s.label}</span>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                                        <span>Created {fmtDate(k.created_at)}</span>
                                        <span>Last used: {fmtDate(k.last_used_at)}</span>
                                        <span>{k.total_requests.toLocaleString()} requests</span>
                                        {k.expires_at && <span>Expires {fmtDate(k.expires_at)}</span>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    {k.is_active && (
                                        <button onClick={() => handleRevoke(k.id)} disabled={revoking === k.id}
                                            title="Revoke key"
                                            className="p-1.5 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors">
                                            {revoking === k.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ToggleLeft className="w-4 h-4" />}
                                        </button>
                                    )}
                                    <button onClick={() => handleDelete(k.id)}
                                        title="Delete key permanently"
                                        className="p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Info footer */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    <strong className="text-gray-700 dark:text-gray-300">Usage:</strong> Include your key as a Bearer token in the <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-xs">Authorization</code> header.
                    Example: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-xs">Authorization: Bearer tak_...</code>
                </p>
            </div>
        </div>
    );
}

function WhatsAppTab() {
    const [wabaStatus, setWabaStatus] = useState<{ connected: boolean; phoneNumber?: string; displayName?: string } | null>(null);
    const [loadingWaba, setLoadingWaba] = useState(true);
    const [copied, setCopied] = useState('');
    useEffect(() => {
        axios.get(`${API_BASE}/whatsapp/oauth/status`, { headers: getHeaders() })
            .then(r => setWabaStatus(r.data))
            .catch(() => setWabaStatus({ connected: false }))
            .finally(() => setLoadingWaba(false));
    }, []);
    const webhookUrl = `${typeof window !== 'undefined' ? window.location.origin.replace('3000', '3001') : 'https://api.yourdomain.com'}/api/webhooks/whatsapp`;
    const copy = (text: string, key: string) => { navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(''), 2000); };
    return (
        <div className="space-y-5">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-3">WhatsApp Configuration</h2>
            {loadingWaba ? <div className="h-16 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />
                : wabaStatus?.connected ? (
                    <div className="flex items-center gap-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-700">
                        <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                        <div>
                            <p className="font-medium text-green-800 dark:text-green-400">Connected: {wabaStatus.displayName || wabaStatus.phoneNumber}</p>
                            <p className="text-sm text-green-600 dark:text-green-500">{wabaStatus.phoneNumber}</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-700">
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-400">WhatsApp account not connected</p>
                        <Link href="/dashboard/whatsapp" className="px-4 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors">Connect</Link>
                    </div>
                )}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Webhook URL</label>
                <div className="flex gap-2">
                    <input readOnly value={webhookUrl} className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 text-sm cursor-not-allowed font-mono text-xs" />
                    <button onClick={() => copy(webhookUrl, 'webhook')} className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 rounded-lg transition-colors">
                        {copied === 'webhook' ? <CheckCheck className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-500" />}
                    </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">Add this URL in Meta App → WhatsApp → Configuration → Webhook URL</p>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SettingsPage() {
    const { user } = useAuthStore();
    const [activeTab, setActiveTab] = useState('profile');

    const showDevTab = ['TENANT_ADMIN', 'SUPER_ADMIN', 'TENANT_DEVELOPER'].includes(user?.role || '');

    const tabs = [
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'team', label: 'Team', icon: Users },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'whatsapp', label: 'WhatsApp', icon: Smartphone },
        { id: 'security', label: 'Security', icon: Shield },
        ...(showDevTab ? [{ id: 'developer', label: 'API Keys', icon: Code2 }] : []),
    ];

    return (
        <DashboardLayout>
            <Toaster position="top-right" />
            <div className="max-w-4xl mx-auto space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Settings className="w-7 h-7 text-blue-600" /> Settings
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your account, team, and preferences</p>
                </div>

                <div className="flex gap-6">
                    {/* Tab List */}
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="w-52 flex-shrink-0 space-y-1">
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            return (
                                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id
                                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                                    <Icon className="w-4 h-4" />
                                    {tab.label}
                                    {activeTab !== tab.id && <ChevronRight className="w-4 h-4 ml-auto opacity-40" />}
                                </button>
                            );
                        })}
                    </motion.div>

                    {/* Content */}
                    <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className="flex-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                        {activeTab === 'profile' && <ProfileTab />}
                        {activeTab === 'team' && <TeamTab userRole={user?.role || 'READ_ONLY'} />}
                        {activeTab === 'notifications' && <NotificationsTab />}
                        {activeTab === 'whatsapp' && <WhatsAppTab />}
                        {activeTab === 'security' && <SecurityTab />}
                        {activeTab === 'developer' && <ApiKeysTab />}
                    </motion.div>
                </div>
            </div>
        </DashboardLayout>
    );
}
