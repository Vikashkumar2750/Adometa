'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import axios from 'axios';
import Cookies from 'js-cookie';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, Building2, User, Mail, Calendar, CheckCircle, XCircle,
    Clock, Globe, CreditCard, Settings, Ban, Play, Edit3, Save, X,
    Users, Shield, Eye, EyeOff, AlertTriangle, TrendingUp, Zap,
    Activity, UserCheck, UserX, Key, Package, Sliders, RefreshCw,
    ChevronRight, Plus, Trash2, Lock,
} from 'lucide-react';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Tenant {
    id: string;
    business_name: string;
    status: 'PENDING_APPROVAL' | 'ACTIVE' | 'SUSPENDED' | 'DELETED';
    plan: string;
    owner_name: string;
    owner_email: string;
    timezone: string;
    locale: string;
    created_at: string;
    updated_at: string;
    approved_at?: string;
    approved_by?: string;
    metadata?: any;
}

interface TeamMember {
    id: string;
    name: string;
    email: string;
    role: string;
    is_active: boolean;
    created_at: string;
    last_login_at?: string;
}

interface TenantSettings {
    id: string;
    tenant_id: string;
    max_api_rpm: number;
    max_campaigns_per_day: number;
    max_broadcast_size: number;
    max_team_members: number;
    cost_per_message: number;
    is_enabled: boolean;
    disabled_reason: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const getHeaders = () => ({ Authorization: `Bearer ${Cookies.get('token') || ''}` });

const PLANS = ['FREE_TRIAL', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'];
const PLAN_COLORS: Record<string, string> = {
    FREE_TRIAL: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    STARTER: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    PROFESSIONAL: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    ENTERPRISE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};
const ROLE_COLORS: Record<string, string> = {
    TENANT_ADMIN: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    TENANT_MARKETER: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    TENANT_DEVELOPER: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    READ_ONLY: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

function StatusBadge({ status }: { status: string }) {
    const cfg: Record<string, { cls: string; icon: any; label: string }> = {
        PENDING_APPROVAL: { cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400', icon: Clock, label: 'Pending Approval' },
        ACTIVE: { cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400', icon: CheckCircle, label: 'Active' },
        SUSPENDED: { cls: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400', icon: Ban, label: 'Suspended' },
        DELETED: { cls: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400', icon: XCircle, label: 'Deleted' },
    };
    const c = cfg[status] || cfg.ACTIVE;
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${c.cls}`}>
            <c.icon className="w-4 h-4" />
            {c.label}
        </span>
    );
}

// ─── Edit Tenant Modal ────────────────────────────────────────────────────────
function EditTenantModal({ tenant, onClose, onSave }: {
    tenant: Tenant;
    onClose: () => void;
    onSave: (updated: any) => void;
}) {
    const [form, setForm] = useState({
        business_name: tenant.business_name,
        owner_name: tenant.owner_name,
        owner_email: tenant.owner_email,
        plan: tenant.plan,
        timezone: tenant.timezone,
        new_password: '',
    });
    const [showPw, setShowPw] = useState(false);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload: any = {};
            if (form.business_name !== tenant.business_name) payload.business_name = form.business_name;
            if (form.owner_name !== tenant.owner_name) payload.owner_name = form.owner_name;
            if (form.owner_email !== tenant.owner_email) payload.owner_email = form.owner_email;
            if (form.plan !== tenant.plan) payload.plan = form.plan;
            if (form.timezone !== tenant.timezone) payload.timezone = form.timezone;
            if (form.new_password) payload.new_password = form.new_password;

            const res = await axios.patch(`${API}/tenants/${tenant.id}`, payload, { headers: getHeaders() });
            toast.success('Tenant updated successfully');
            onSave(res.data);
        } catch (e: any) {
            toast.error(e.response?.data?.message || 'Failed to update tenant');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                            <Edit3 className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <p className="font-semibold text-gray-900 dark:text-white">Edit Tenant</p>
                            <p className="text-xs text-gray-400">{tenant.business_name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    {/* Business Name */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Business Name</label>
                        <input value={form.business_name} onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))}
                            className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>

                    {/* Plan */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Plan</label>
                        <div className="grid grid-cols-2 gap-2">
                            {PLANS.map(p => (
                                <button key={p} onClick={() => setForm(f => ({ ...f, plan: p }))}
                                    className={`px-3 py-2 rounded-xl border text-sm font-medium transition-all ${form.plan === p
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                                        : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'}`}>
                                    {p.replace('_', ' ')}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Owner Details */}
                    <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4 space-y-3">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Owner Account</p>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Owner Name</label>
                            <input value={form.owner_name} onChange={e => setForm(f => ({ ...f, owner_name: e.target.value }))}
                                className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Owner Email</label>
                            <input type="email" value={form.owner_email} onChange={e => setForm(f => ({ ...f, owner_email: e.target.value }))}
                                className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">New Password <span className="text-gray-300">(leave blank to keep current)</span></label>
                            <div className="relative">
                                <input type={showPw ? 'text' : 'password'} value={form.new_password}
                                    onChange={e => setForm(f => ({ ...f, new_password: e.target.value }))}
                                    placeholder="Min 8 chars"
                                    className="w-full px-3.5 py-2.5 pr-10 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                <button onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Timezone */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Timezone</label>
                        <input value={form.timezone} onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))}
                            className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-6 border-t border-gray-100 dark:border-gray-700">
                    <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700">
                        Cancel
                    </button>
                    <button onClick={handleSave} disabled={saving}
                        className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
                        {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

// ─── Edit Settings Modal ──────────────────────────────────────────────────────
function EditSettingsModal({ tenantId, settings, onClose, onSave }: {
    tenantId: string;
    settings: TenantSettings;
    onClose: () => void;
    onSave: (s: TenantSettings) => void;
}) {
    const [form, setForm] = useState({
        max_api_rpm: settings.max_api_rpm,
        max_campaigns_per_day: settings.max_campaigns_per_day,
        max_broadcast_size: settings.max_broadcast_size,
        max_team_members: settings.max_team_members,
        cost_per_message: settings.cost_per_message,
    });
    const [saving, setSaving] = useState(false);

    const num = (val: any) => ({ target: { value: v } }: any) => setForm(f => ({ ...f, [val]: Number(v) }));

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await axios.patch(`${API}/admin/billing/settings/${tenantId}`, form, { headers: getHeaders() });
            toast.success('Settings updated');
            onSave(res.data);
        } catch (e: any) {
            toast.error(e.response?.data?.message || 'Failed to update settings');
        } finally {
            setSaving(false);
        }
    };

    const fields = [
        { key: 'max_team_members', label: 'Max Team Members', icon: Users, min: 1, max: 100, hint: 'Max users tenant can add (excl. owner)' },
        { key: 'max_api_rpm', label: 'Max API Requests/Min', icon: Zap, min: 1, max: 1000, hint: 'Rate limit for WhatsApp API calls' },
        { key: 'max_campaigns_per_day', label: 'Max Campaigns/Day', icon: Activity, min: 1, max: 500, hint: 'Running campaigns allowed per day' },
        { key: 'max_broadcast_size', label: 'Max Broadcast Size', icon: TrendingUp, min: 100, max: 1000000, hint: 'Max contacts per broadcast' },
        { key: 'cost_per_message', label: 'Cost per Message (₹)', icon: CreditCard, min: 0, max: 10, hint: 'Wallet deduction per outbound message', step: 0.001 },
    ];

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                            <Sliders className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <p className="font-semibold text-gray-900 dark:text-white">Rate Limits & Controls</p>
                            <p className="text-xs text-gray-400">Platform-level tenant restrictions</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    {fields.map(f => (
                        <div key={f.key}>
                            <label className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                                <f.icon className="w-3.5 h-3.5" />
                                {f.label}
                            </label>
                            <input
                                type="number" min={f.min} max={f.max} step={(f as any).step || 1}
                                value={(form as any)[f.key]}
                                onChange={e => setForm(prev => ({ ...prev, [f.key]: Number(e.target.value) }))}
                                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                            <p className="text-xs text-gray-400 mt-1">{f.hint}</p>
                        </div>
                    ))}
                </div>

                <div className="flex gap-3 p-6 border-t border-gray-100 dark:border-gray-700">
                    <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
                    <button onClick={handleSave} disabled={saving}
                        className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
                        {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {saving ? 'Saving…' : 'Save Settings'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

// ─── Edit Team Member Modal ───────────────────────────────────────────────────
function EditMemberModal({ member, tenantId, onClose, onSave, onDelete }: {
    member: TeamMember;
    tenantId: string;
    onClose: () => void;
    onSave: () => void;
    onDelete: () => void;
}) {
    const [form, setForm] = useState({ name: member.name, email: member.email, role: member.role, is_active: member.is_active });
    const [newPw, setNewPw] = useState('');
    const [saving, setSaving] = useState(false);

    const ROLES = ['TENANT_ADMIN', 'TENANT_MARKETER', 'TENANT_DEVELOPER', 'READ_ONLY'];

    const handleSave = async () => {
        setSaving(true);
        try {
            await axios.patch(`${API}/team/members/${member.id}`, form, { headers: getHeaders() });
            if (newPw) {
                await axios.post(`${API}/team/members/${member.id}/reset-password`, { password: newPw }, { headers: getHeaders() });
            }
            toast.success('Team member updated');
            onSave();
        } catch (e: any) {
            toast.error(e.response?.data?.message || 'Failed to update member');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm(`Remove ${member.name} from the team?`)) return;
        try {
            await axios.delete(`${API}/team/members/${member.id}`, { headers: getHeaders() });
            toast.success('Member removed');
            onDelete();
        } catch (e: any) {
            toast.error(e.response?.data?.message || 'Failed to remove member');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
                    <p className="font-semibold text-gray-900 dark:text-white">Edit Team Member</p>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-5 space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Name</label>
                        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Email</label>
                        <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                            className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Role</label>
                        <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                            className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                            {ROLES.map(r => <option key={r} value={r}>{r.replace('TENANT_', '').replace('_', ' ')}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Reset Password <span className="text-gray-300">(leave blank to keep)</span></label>
                        <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="New password..."
                            className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is_active ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                            <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${form.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                        <span className="text-sm text-gray-700 dark:text-gray-300">{form.is_active ? 'Active' : 'Deactivated'}</span>
                    </div>
                </div>
                <div className="flex gap-3 p-5 border-t border-gray-100 dark:border-gray-700">
                    <button onClick={handleDelete} className="px-3 py-2.5 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl text-sm hover:bg-red-50 dark:hover:bg-red-900/20">
                        <Trash2 className="w-4 h-4" />
                    </button>
                    <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400">Cancel</button>
                    <button onClick={handleSave} disabled={saving}
                        className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                        {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TenantDetailPage() {
    const params = useParams();
    const tenantId = params.id as string;

    const [tenant, setTenant] = useState<Tenant | null>(null);
    const [team, setTeam] = useState<TeamMember[]>([]);
    const [settings, setSettings] = useState<TenantSettings | null>(null);
    const [loading, setLoading] = useState(true);

    const [editOpen, setEditOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [tRes, teamRes, sRes] = await Promise.allSettled([
                axios.get(`${API}/tenants/${tenantId}`, { headers: getHeaders() }),
                axios.get(`${API}/tenants/${tenantId}/team`, { headers: getHeaders() }),
                axios.get(`${API}/admin/billing/settings/${tenantId}`, { headers: getHeaders() }),
            ]);

            if (tRes.status === 'fulfilled') {
                setTenant(tRes.value.data);
            } else {
                toast.error('Tenant not found or could not load tenant details');
            }
            if (teamRes.status === 'fulfilled') {
                setTeam(Array.isArray(teamRes.value.data) ? teamRes.value.data : []);
            }
            if (sRes.status === 'fulfilled') {
                setSettings(sRes.value.data);
            }
            // settings may not exist yet for new tenants — that's OK
        } catch {
            toast.error('Failed to load tenant details');
        } finally {
            setLoading(false);
        }
    }, [tenantId]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // ── Actions ──────────────────────────────────────────────────────────────
    const handleStatusAction = async (action: 'approve' | 'reject' | 'suspend' | 'activate') => {
        let reason = '';
        if (action === 'reject') {
            reason = prompt('Reason for rejection:') || '';
            if (!reason) return;
        }
        if (action === 'suspend') {
            reason = prompt('Reason for suspension (optional):') || '';
        }
        try {
            const body = reason ? { reason } : {};
            await axios.post(`${API}/tenants/${tenantId}/${action}`, body, { headers: getHeaders() });
            toast.success(`Tenant ${action}ed successfully`);
            fetchAll();
        } catch (e: any) {
            toast.error(e.response?.data?.message || `Failed to ${action} tenant`);
        }
    };

    // Default settings used when backend row hasn't been created yet
    const DEFAULT_SETTINGS: TenantSettings = {
        id: '',
        tenant_id: tenantId,
        max_api_rpm: 60,
        max_campaigns_per_day: 10,
        max_broadcast_size: 10000,
        max_team_members: 5,
        cost_per_message: 0.001,
        is_enabled: true,
        disabled_reason: null,
    };

    // Helper: ensure settings exist before opening the settings modal
    const openSettingsModal = async () => {
        if (settings) {
            setSettingsOpen(true);
            return;
        }
        // Settings row doesn't exist yet — trigger getOrCreate on backend then open
        try {
            const res = await axios.get(`${API}/admin/billing/settings/${tenantId}`, { headers: getHeaders() });
            // Use functional setState to ensure both updates happen in the same flush
            setSettings(res.data);
            setTimeout(() => setSettingsOpen(true), 0);
        } catch {
            // If API fails, open with defaults so admin can still set values
            setSettings({ ...DEFAULT_SETTINGS });
            setTimeout(() => setSettingsOpen(true), 0);
        }
    };

    const toggleEnabled = async () => {
        if (!settings) return;
        const newState = !settings.is_enabled;
        if (!newState) {
            const reason = prompt('Reason for disabling this tenant?') || 'Disabled by admin';
            try {
                await axios.post(`${API}/admin/billing/settings/${tenantId}/enable`, { enabled: false, reason }, { headers: getHeaders() });
                toast.success('Tenant disabled');
            } catch (e: any) { toast.error(e.response?.data?.message || 'Failed'); }
        } else {
            try {
                await axios.post(`${API}/admin/billing/settings/${tenantId}/enable`, { enabled: true }, { headers: getHeaders() });
                toast.success('Tenant enabled');
            } catch (e: any) { toast.error(e.response?.data?.message || 'Failed'); }
        }
        fetchAll();
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    if (!tenant) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center">
                <Building2 className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-gray-500">Tenant not found</p>
                <Link href="/admin/tenants" className="mt-4 text-blue-600 hover:underline text-sm">← Back to Tenants</Link>
            </div>
        );
    }

    const isActive = tenant.status === 'ACTIVE';
    const isPending = tenant.status === 'PENDING_APPROVAL';
    const isSuspended = tenant.status === 'SUSPENDED';

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            <Toaster position="top-right" />

            {/* Modals */}
            <AnimatePresence>
                {editOpen && <EditTenantModal tenant={tenant} onClose={() => setEditOpen(false)} onSave={updated => { setTenant(prev => ({ ...prev!, ...updated })); setEditOpen(false); }} />}
                {settingsOpen && <EditSettingsModal tenantId={tenantId} settings={settings ?? DEFAULT_SETTINGS} onClose={() => setSettingsOpen(false)} onSave={s => { setSettings(s); setSettingsOpen(false); }} />}
                {editingMember && (
                    <EditMemberModal
                        member={editingMember}
                        tenantId={tenantId}
                        onClose={() => setEditingMember(null)}
                        onSave={() => { setEditingMember(null); fetchAll(); }}
                        onDelete={() => { setEditingMember(null); fetchAll(); }}
                    />
                )}
            </AnimatePresence>

            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="mb-6">
                <Link href="/admin/tenants" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white mb-4 group">
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                    Back to Tenants
                </Link>

                <div className="flex flex-wrap items-start justify-between gap-4">
                    {/* Title */}
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg flex-shrink-0">
                            <Building2 className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{tenant.business_name}</h1>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <StatusBadge status={tenant.status} />
                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${PLAN_COLORS[tenant.plan] || PLAN_COLORS.FREE_TRIAL}`}>
                                    {tenant.plan?.replace('_', ' ')}
                                </span>
                                <span className="text-xs text-gray-400">Created {new Date(tenant.created_at).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2">
                        <button onClick={() => setEditOpen(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm">
                            <Edit3 className="w-4 h-4" /> Edit Details
                        </button>
                        {isPending && (
                            <>
                                <button onClick={() => handleStatusAction('approve')}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700">
                                    <CheckCircle className="w-4 h-4" /> Approve
                                </button>
                                <button onClick={() => handleStatusAction('reject')}
                                    className="inline-flex items-center gap-2 px-4 py-2 border border-red-300 dark:border-red-700 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20">
                                    <XCircle className="w-4 h-4" /> Reject
                                </button>
                            </>
                        )}
                        {isActive && (
                            <button onClick={() => handleStatusAction('suspend')}
                                className="inline-flex items-center gap-2 px-4 py-2 border border-red-300 dark:border-red-700 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20">
                                <Ban className="w-4 h-4" /> Suspend
                            </button>
                        )}
                        {isSuspended && (
                            <button onClick={() => handleStatusAction('activate')}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700">
                                <Play className="w-4 h-4" /> Reactivate
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Disabled Banner ─────────────────────────────────────────── */}
            {settings && !settings.is_enabled && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-red-900 dark:text-red-400">API Access Disabled</p>
                        <p className="text-sm text-red-700 dark:text-red-300">{settings.disabled_reason || 'This tenant cannot use the platform API.'}</p>
                    </div>
                    <button onClick={toggleEnabled} className="text-sm text-red-600 dark:text-red-400 font-medium hover:underline">Re-enable</button>
                </motion.div>
            )}

            {/* ── Main Grid ───────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left: Business + Owner + Team Members */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Business Information */}
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-blue-500" /> Business Information
                            </h2>
                            <button onClick={() => setEditOpen(true)} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                                <Edit3 className="w-3 h-3" /> Edit
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-5">
                            {[
                                { label: 'Business Name', value: tenant.business_name },
                                { label: 'Plan', value: tenant.plan?.replace('_', ' ') },
                                { label: 'Timezone', value: tenant.timezone },
                                { label: 'Locale', value: tenant.locale || 'en' },
                            ].map(row => (
                                <div key={row.label}>
                                    <p className="text-xs font-medium text-gray-400 mb-1">{row.label}</p>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{row.value}</p>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Owner Information */}
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <User className="w-5 h-5 text-indigo-500" /> Owner Account
                            </h2>
                            <button onClick={() => setEditOpen(true)} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                                <Edit3 className="w-3 h-3" /> Edit
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-5">
                            <div>
                                <p className="text-xs font-medium text-gray-400 mb-1">Owner Name</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{tenant.owner_name}</p>
                            </div>
                            <div>
                                <p className="text-xs font-medium text-gray-400 mb-1">Email</p>
                                <div className="flex items-center gap-1.5">
                                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{tenant.owner_email}</p>
                                </div>
                            </div>
                            <div>
                                <p className="text-xs font-medium text-gray-400 mb-1">Password</p>
                                <button onClick={() => setEditOpen(true)} className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline">
                                    <Key className="w-3 h-3" /> Change Password
                                </button>
                            </div>
                        </div>
                    </motion.div>

                    {/* Team Members */}
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <Users className="w-5 h-5 text-emerald-500" />
                                Team Members
                                <span className="ml-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-400">
                                    {team.length} / {settings?.max_team_members ?? '…'}
                                </span>
                            </h2>
                            <button onClick={openSettingsModal} className="text-xs text-purple-600 hover:underline flex items-center gap-1">
                                <Sliders className="w-3 h-3" /> Set Limit
                            </button>
                        </div>

                        {team.length === 0 ? (
                            <div className="flex flex-col items-center py-8 text-gray-300">
                                <Users className="w-10 h-10 mb-2" />
                                <p className="text-sm text-gray-400">No team members yet</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {team.map((m, i) => (
                                    <motion.div key={m.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                                        className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 dark:bg-gray-700/40 hover:bg-gray-100 dark:hover:bg-gray-700/70 transition-colors group">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${m.is_active ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-200 text-gray-500 dark:bg-gray-600 dark:text-gray-400'}`}>
                                                {m.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{m.name}</p>
                                                    {!m.is_active && <span className="px-1.5 py-0.5 bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400 text-xs rounded-full">Deactivated</span>}
                                                </div>
                                                <p className="text-xs text-gray-400">{m.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[m.role] || ROLE_COLORS.READ_ONLY}`}>
                                                {m.role.replace('TENANT_', '').replace('_', ' ')}
                                            </span>
                                            <button onClick={() => setEditingMember(m)}
                                                className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all">
                                                <Edit3 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}

                        {settings && team.length >= settings.max_team_members && (
                            <div className="mt-3 flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                                <Lock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                <p className="text-xs text-amber-700 dark:text-amber-400">Team member limit reached ({settings.max_team_members}). Increase the limit in Settings.</p>
                            </div>
                        )}
                    </motion.div>

                    {/* Platform Controls */}
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <Sliders className="w-5 h-5 text-purple-500" /> Platform Controls
                            </h2>
                            <button onClick={openSettingsModal}
                                className="inline-flex items-center gap-1.5 text-xs text-purple-600 hover:underline">
                                <Edit3 className="w-3 h-3" /> Edit All
                            </button>
                        </div>

                        {settings ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {[
                                    { label: 'Max Team Members', value: settings.max_team_members, icon: Users, color: 'text-emerald-500' },
                                    { label: 'API Req/Min', value: settings.max_api_rpm, icon: Zap, color: 'text-yellow-500' },
                                    { label: 'Campaigns/Day', value: settings.max_campaigns_per_day, icon: Activity, color: 'text-blue-500' },
                                    { label: 'Broadcast Size', value: settings.max_broadcast_size.toLocaleString(), icon: TrendingUp, color: 'text-indigo-500' },
                                    { label: 'Cost/Message (₹)', value: Number(settings.cost_per_message).toFixed(4), icon: CreditCard, color: 'text-orange-500' },
                                ].map(s => (
                                    <div key={s.label} className="bg-gray-50 dark:bg-gray-700/40 rounded-xl p-3.5">
                                        <div className="flex items-center gap-2 mb-1">
                                            <s.icon className={`w-4 h-4 ${s.color}`} />
                                            <p className="text-xs text-gray-400">{s.label}</p>
                                        </div>
                                        <p className="text-lg font-bold text-gray-900 dark:text-white">{s.value}</p>
                                    </div>
                                ))}

                                {/* API Toggle */}
                                <div className="bg-gray-50 dark:bg-gray-700/40 rounded-xl p-3.5">
                                    <p className="text-xs text-gray-400 mb-2">API Access</p>
                                    <div className="flex items-center gap-2">
                                        <button onClick={toggleEnabled}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.is_enabled ? 'bg-emerald-500' : 'bg-red-400'}`}>
                                            <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${settings.is_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                        <span className={`text-sm font-semibold ${settings.is_enabled ? 'text-emerald-600' : 'text-red-500'}`}>
                                            {settings.is_enabled ? 'Enabled' : 'Disabled'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center py-6 gap-3">
                                <p className="text-gray-400 text-sm">Settings not initialized for this tenant.</p>
                                <button onClick={openSettingsModal}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700">
                                    <Sliders className="w-4 h-4" /> Initialize Settings
                                </button>
                            </div>
                        )}
                    </motion.div>
                </div>

                {/* Right Sidebar */}
                <div className="space-y-6">
                    {/* Timeline */}
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Timeline</h2>
                        <div className="space-y-4">
                            {[
                                { label: 'Created', date: tenant.created_at, Icon: Calendar, color: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' },
                                ...(tenant.approved_at ? [{ label: 'Approved', date: tenant.approved_at, Icon: CheckCircle, color: 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' }] : []),
                                ...(tenant.metadata?.suspended_at ? [{ label: 'Suspended', date: tenant.metadata.suspended_at, Icon: Ban, color: 'bg-red-100 dark:bg-red-900/20 text-red-500 dark:text-red-400' }] : []),
                                { label: 'Last Updated', date: tenant.updated_at, Icon: Settings, color: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400' },
                            ].map(ev => (
                                <div key={ev.label} className="flex items-start gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${ev.color}`}>
                                        <ev.Icon className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{ev.label}</p>
                                        <p className="text-xs text-gray-400">{new Date(ev.date).toLocaleString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Meta Information */}
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Meta Information</h2>
                        <div className="space-y-3">
                            <div>
                                <p className="text-xs font-medium text-gray-400 mb-1">Tenant ID</p>
                                <p className="text-xs font-mono text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 p-2 rounded-lg break-all">{tenant.id}</p>
                            </div>
                            {(() => {
                                // Treat nil UUID (all zeros) same as missing
                                const isNilUUID = !tenant.approved_by ||
                                    tenant.approved_by.replace(/-/g, '') === '0'.repeat(32);
                                if (!isNilUUID) return (
                                    <div>
                                        <p className="text-xs font-medium text-gray-400 mb-1">Approved By</p>
                                        <p className="text-xs font-mono text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 p-2 rounded-lg break-all">
                                            {tenant.approved_by}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">Admin user ID who approved this tenant</p>
                                    </div>
                                );
                                if (tenant.status === 'ACTIVE') return (
                                    <div>
                                        <p className="text-xs font-medium text-gray-400 mb-1">Approved By</p>
                                        <p className="text-xs text-gray-400 italic">Auto-approved or system action</p>
                                    </div>
                                );
                                return null;
                            })()}
                            {tenant.metadata?.suspension_reason && (
                                <div>
                                    <p className="text-xs font-medium text-gray-400 mb-1">Suspension Reason</p>
                                    <p className="text-xs text-red-600 dark:text-red-400">{tenant.metadata.suspension_reason}</p>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Quick Actions */}
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Quick Links</h2>
                        <div className="space-y-2">
                            {[
                                { label: 'Billing Control', href: '/admin/billing', icon: CreditCard },
                                { label: 'WABA Monitor', href: '/admin/billing/waba', icon: Activity },
                                { label: 'System Logs', href: `/admin/logs`, icon: Shield },
                            ].map(l => (
                                <Link key={l.label} href={l.href}
                                    className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                                    <div className="flex items-center gap-2.5">
                                        <l.icon className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                                        <span className="text-sm text-gray-700 dark:text-gray-300">{l.label}</span>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                                </Link>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
