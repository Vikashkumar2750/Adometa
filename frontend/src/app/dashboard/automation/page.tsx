'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Zap, Plus, Play, Pause, Trash2, Edit3, ChevronDown, ChevronRight,
    RefreshCcw, Clock, AlertCircle, MessageSquare, CheckCircle, X,
    Repeat, Calendar, Settings2, Bell, Target, ArrowRight, Info, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import Cookies from 'js-cookie';

// ── Types ──────────────────────────────────────────────────────────────────────
type TriggerType = 'CAMPAIGN_FAILED' | 'MESSAGE_UNREAD' | 'MESSAGE_DELIVERED' | 'CAMPAIGN_COMPLETED';
type ActionType = 'RESCHEDULE_CAMPAIGN' | 'SEND_FOLLOWUP' | 'NOTIFY_ADMIN' | 'MARK_SEGMENT';
type Status = 'ACTIVE' | 'PAUSED' | 'DRAFT';

interface AutomationRule {
    id: string;
    name: string;
    description?: string;
    status: Status;
    trigger: {
        type: TriggerType;
        campaignId?: string;
        waitHours: number;
        condition?: string;
    };
    action: {
        type: ActionType;
        scheduleOffsetDays: number;
        scheduleTime: string;
        maxRetries: number;
        message?: string;
    };
    stats: { runs: number; successes: number; lastRun?: string };
    createdAt: string;
}

// Removed static SAMPLE_RULES — data now fetched from /api/automation

const TRIGGER_OPTIONS: { value: TriggerType; label: string; icon: string; desc: string }[] = [
    { value: 'CAMPAIGN_FAILED', label: 'Campaign Failed', icon: '❌', desc: 'Triggered when campaign delivery fails' },
    { value: 'MESSAGE_UNREAD', label: 'Message Unread', icon: '📭', desc: 'Triggered when recipient hasn\'t read after wait time' },
    { value: 'MESSAGE_DELIVERED', label: 'Message Delivered', icon: '✅', desc: 'Triggered when message is delivered successfully' },
    { value: 'CAMPAIGN_COMPLETED', label: 'Campaign Completed', icon: '🏁', desc: 'Triggered when a campaign finishes sending' },
];

const ACTION_OPTIONS: { value: ActionType; label: string; icon: string; desc: string }[] = [
    { value: 'RESCHEDULE_CAMPAIGN', label: 'Reschedule Campaign', icon: '📅', desc: 'Re-send the campaign at a new scheduled time' },
    { value: 'SEND_FOLLOWUP', label: 'Send Follow-up Message', icon: '📨', desc: 'Send a different follow-up message' },
    { value: 'NOTIFY_ADMIN', label: 'Notify Admin', icon: '🔔', desc: 'Send an alert notification to the admin' },
    { value: 'MARK_SEGMENT', label: 'Move to Segment', icon: '🏷️', desc: 'Move contacts to a different segment' },
];

const STATUS_BADGE: Record<Status, string> = {
    ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    PAUSED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    DRAFT: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
function getHeaders() {
    const t = Cookies.get('token') || localStorage.getItem('token');
    return { Authorization: `Bearer ${t}` };
}

/** Map flat DB record → nested UI shape */
function mapRule(r: any): AutomationRule {
    return {
        id: r.id,
        name: r.name,
        description: r.description,
        status: r.status,
        trigger: {
            type: r.trigger_type,
            campaignId: r.trigger_campaign_id,
            waitHours: r.trigger_wait_hours,
            condition: r.trigger_condition,
        },
        action: {
            type: r.action_type,
            scheduleOffsetDays: r.action_schedule_offset_days,
            scheduleTime: r.action_schedule_time,
            maxRetries: r.action_max_retries,
            message: r.action_message,
        },
        stats: {
            runs: r.stats_runs,
            successes: r.stats_successes,
            lastRun: r.stats_last_run,
        },
        createdAt: r.created_at,
    };
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function AutomationPage() {
    const [rules, setRules] = useState<AutomationRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [editRule, setEditRule] = useState<AutomationRule | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const fetchRules = useCallback(async () => {
        try {
            setLoading(true);
            const { data } = await axios.get(`${API_BASE}/automation`, { headers: getHeaders() });
            setRules((Array.isArray(data) ? data : data.data || []).map(mapRule));
        } catch (err: any) {
            const status = err?.response?.status;
            if (status !== 403 && status !== 401) {
                toast.error('Failed to load automation rules');
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchRules(); }, [fetchRules]);

    const activeCount = rules.filter(r => r.status === 'ACTIVE').length;
    const totalRuns = rules.reduce((a, r) => a + r.stats.runs, 0);
    const totalSuccess = rules.reduce((a, r) => a + r.stats.successes, 0);

    const toggleStatus = async (id: string, current: Status) => {
        try {
            const endpoint = current === 'ACTIVE' ? 'pause' : 'activate';
            const { data } = await axios.post(`${API_BASE}/automation/${id}/${endpoint}`, {}, { headers: getHeaders() });
            setRules(prev => prev.map(r => r.id === id ? mapRule(data) : r));
            toast.success(`Automation ${current === 'ACTIVE' ? 'paused' : 'activated'}`);
        } catch {
            toast.error('Failed to update automation status');
        }
    };

    const deleteRule = async (id: string) => {
        if (!confirm('Delete this automation rule?')) return;
        try {
            await axios.delete(`${API_BASE}/automation/${id}`, { headers: getHeaders() });
            setRules(prev => prev.filter(r => r.id !== id));
            toast.success('Automation rule deleted');
        } catch {
            toast.error('Failed to delete rule');
        }
    };

    const saveRule = (rule: AutomationRule) => {
        if (editRule) {
            setRules(prev => prev.map(r => r.id === rule.id ? rule : r));
            toast.success('Automation updated!');
        } else {
            setRules(prev => [rule, ...prev]);
            toast.success('Automation created!');
        }
        setShowCreate(false);
        setEditRule(null);
    };

    return (
        <DashboardLayout>
            <div className="p-6 md:p-8 max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-start justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-200 dark:shadow-purple-900/30">
                                <Zap className="w-5 h-5 text-white" />
                            </div>
                            Campaign Automation
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">
                            Auto-retry failed deliveries and re-schedule unread messages for maximum reach.
                        </p>
                    </div>
                    <button
                        onClick={() => { setEditRule(null); setShowCreate(true); }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"
                    >
                        <Plus className="w-5 h-5" /> New Rule
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {[
                        { label: 'Total Rules', value: rules.length, icon: Settings2, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
                        { label: 'Active Rules', value: activeCount, icon: Play, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
                        { label: 'Total Runs', value: totalRuns, icon: Repeat, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                        { label: 'Success Rate', value: totalRuns > 0 ? `${Math.round(totalSuccess / totalRuns * 100)}%` : '—', icon: Target, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                    ].map(({ label, value, icon: Icon, color, bg }) => (
                        <div key={label} className={`${bg} rounded-xl p-4 border border-transparent`}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</p>
                                    <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
                                </div>
                                <Icon className={`w-8 h-8 ${color} opacity-40`} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* How it works banner */}
                <div className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 border border-violet-200 dark:border-violet-800 rounded-2xl p-5 mb-8">
                    <h3 className="font-semibold text-violet-900 dark:text-violet-300 mb-3 flex items-center gap-2">
                        <Info className="w-4 h-4" /> How Automation Works
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                            { step: '1', title: 'Set a Trigger', desc: 'Choose when the automation fires — e.g., after a campaign fails or a message goes unread for 24h', icon: '⚡' },
                            { step: '2', title: 'Define the Action', desc: 'Automatically reschedule, send a follow-up, or notify admin at your chosen date & time', icon: '🎯' },
                            { step: '3', title: 'Set Limits', desc: 'Cap how many retries per contact to avoid spam. System respects WhatsApp\'s messaging limits', icon: '🛡️' },
                        ].map(item => (
                            <div key={item.step} className="flex gap-3">
                                <div className="text-2xl flex-shrink-0">{item.icon}</div>
                                <div>
                                    <p className="font-semibold text-violet-800 dark:text-violet-300 text-sm">{item.title}</p>
                                    <p className="text-xs text-violet-600 dark:text-violet-400 mt-0.5">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Rules list */}
                {rules.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center py-24 text-center">
                        <Zap className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
                        <p className="text-lg font-semibold text-gray-500 dark:text-gray-400">No automation rules yet</p>
                        <p className="text-sm text-gray-400 mt-1 mb-6">Create your first rule to start automating retries & follow-ups</p>
                        <button onClick={() => setShowCreate(true)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700">
                            <Plus className="w-4 h-4" /> Create First Rule
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {rules.map((rule, i) => (
                            <motion.div key={rule.id}
                                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow">

                                {/* Rule header */}
                                <div className="flex items-center gap-4 p-5">
                                    {/* Status dot */}
                                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${rule.status === 'ACTIVE' ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="font-bold text-gray-900 dark:text-white">{rule.name}</h3>
                                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${STATUS_BADGE[rule.status]}`}>
                                                {rule.status}
                                            </span>
                                        </div>
                                        {rule.description && (
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">{rule.description}</p>
                                        )}

                                        {/* Trigger → Action pill chain */}
                                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs font-medium rounded-full">
                                                <Zap className="w-3 h-3" />
                                                {TRIGGER_OPTIONS.find(t => t.value === rule.trigger.type)?.label}
                                                {rule.trigger.waitHours > 0 && ` after ${rule.trigger.waitHours}h`}
                                            </span>
                                            <ArrowRight className="w-3 h-3 text-gray-400" />
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 text-xs font-medium rounded-full">
                                                <Calendar className="w-3 h-3" />
                                                {ACTION_OPTIONS.find(a => a.value === rule.action.type)?.label}
                                                {rule.action.scheduleOffsetDays > 0 && ` +${rule.action.scheduleOffsetDays}d`}
                                                @ {rule.action.scheduleTime}
                                            </span>
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-full">
                                                <Repeat className="w-3 h-3" /> Max {rule.action.maxRetries}x
                                            </span>
                                        </div>
                                    </div>

                                    {/* Stats */}
                                    <div className="hidden md:flex items-center gap-6 text-center">
                                        <div>
                                            <p className="text-lg font-bold text-gray-900 dark:text-white">{rule.stats.runs}</p>
                                            <p className="text-xs text-gray-400">Runs</p>
                                        </div>
                                        <div>
                                            <p className="text-lg font-bold text-green-600">{rule.stats.runs > 0 ? Math.round(rule.stats.successes / rule.stats.runs * 100) : 0}%</p>
                                            <p className="text-xs text-gray-400">Success</p>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-1.5 ml-2">
                                        <button onClick={() => toggleStatus(rule.id, rule.status)}
                                            title={rule.status === 'ACTIVE' ? 'Pause' : 'Activate'}
                                            className={`p-2 rounded-lg transition-colors ${rule.status === 'ACTIVE'
                                                ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                                                : 'text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'}`}>
                                            {rule.status === 'ACTIVE' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                        </button>
                                        <button onClick={() => { setEditRule(rule); setShowCreate(true); }}
                                            title="Edit"
                                            className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                                            <Edit3 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => deleteRule(rule.id)}
                                            title="Delete"
                                            className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => setExpandedId(expandedId === rule.id ? null : rule.id)}
                                            className="p-2 rounded-lg text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                            {expandedId === rule.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded detail */}
                                <AnimatePresence>
                                    {expandedId === rule.id && (
                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                            className="border-t border-gray-100 dark:border-gray-700 overflow-hidden">
                                            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                                                <div className="space-y-3">
                                                    <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2"><Zap className="w-4 h-4 text-blue-500" /> Trigger Configuration</h4>
                                                    <dl className="space-y-1.5">
                                                        <div className="flex justify-between text-sm"><dt className="text-gray-500">Event</dt><dd className="font-medium text-gray-800 dark:text-gray-200">{TRIGGER_OPTIONS.find(t => t.value === rule.trigger.type)?.label}</dd></div>
                                                        <div className="flex justify-between text-sm"><dt className="text-gray-500">Wait time</dt><dd className="font-medium text-gray-800 dark:text-gray-200">{rule.trigger.waitHours} hours</dd></div>
                                                    </dl>
                                                </div>
                                                <div className="space-y-3">
                                                    <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2"><Calendar className="w-4 h-4 text-purple-500" /> Action Configuration</h4>
                                                    <dl className="space-y-1.5">
                                                        <div className="flex justify-between text-sm"><dt className="text-gray-500">Action</dt><dd className="font-medium text-gray-800 dark:text-gray-200">{ACTION_OPTIONS.find(a => a.value === rule.action.type)?.label}</dd></div>
                                                        <div className="flex justify-between text-sm"><dt className="text-gray-500">Schedule</dt><dd className="font-medium text-gray-800 dark:text-gray-200">+{rule.action.scheduleOffsetDays} days at {rule.action.scheduleTime}</dd></div>
                                                        <div className="flex justify-between text-sm"><dt className="text-gray-500">Max retries</dt><dd className="font-medium text-gray-800 dark:text-gray-200">{rule.action.maxRetries}x per contact</dd></div>
                                                    </dl>
                                                </div>
                                                {rule.action.message && (
                                                    <div className="md:col-span-2 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                                        <p className="text-xs font-semibold text-gray-500 mb-1">Follow-up Message</p>
                                                        <p className="text-sm text-gray-800 dark:text-gray-200">{rule.action.message}</p>
                                                    </div>
                                                )}
                                                <div className="md:col-span-2 flex items-center gap-2 text-xs text-gray-400">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    Last run: {rule.stats.lastRun ? new Date(rule.stats.lastRun).toLocaleString('en-IN') : 'Never'}
                                                    &nbsp;·&nbsp;Created: {new Date(rule.createdAt).toLocaleDateString('en-IN')}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* Create/Edit Modal */}
                <AnimatePresence>
                    {showCreate && (
                        <RuleModal
                            rule={editRule}
                            onSave={saveRule}
                            onClose={() => { setShowCreate(false); setEditRule(null); }}
                        />
                    )}
                </AnimatePresence>
            </div>
        </DashboardLayout>
    );
}

// ── Rule Modal ─────────────────────────────────────────────────────────────────
function RuleModal({ rule, onSave, onClose }: {
    rule: AutomationRule | null;
    onSave: (r: AutomationRule) => void;
    onClose: () => void;
}) {
    const isEdit = Boolean(rule);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<AutomationRule>(rule || {
        id: '',
        name: '',
        description: '',
        status: 'DRAFT',
        trigger: { type: 'CAMPAIGN_FAILED', waitHours: 2 },
        action: { type: 'RESCHEDULE_CAMPAIGN', scheduleOffsetDays: 1, scheduleTime: '10:00', maxRetries: 3, message: '' },
        stats: { runs: 0, successes: 0 },
        createdAt: new Date().toISOString(),
    });

    const handleSave = async () => {
        if (!form.name.trim()) { toast.error('Name is required'); return; }
        setSaving(true);
        try {
            const payload = {
                name: form.name.trim(),
                description: form.description || undefined,
                trigger: form.trigger,
                action: form.action,
                ...(isEdit ? { status: form.status } : {}),
            };
            let res;
            if (isEdit && rule?.id) {
                res = await axios.patch(`${API_BASE}/automation/${rule.id}`, payload, { headers: getHeaders() });
            } else {
                res = await axios.post(`${API_BASE}/automation`, payload, { headers: getHeaders() });
                // Auto-activate new rules
                if (res.data?.id) {
                    const activated = await axios.post(`${API_BASE}/automation/${res.data.id}/activate`, {}, { headers: getHeaders() });
                    res = { data: activated.data };
                }
            }
            onSave(mapRule(res.data));
        } catch (err: any) {
            const msg = err?.response?.data?.message;
            toast.error(Array.isArray(msg) ? msg.join(', ') : msg || 'Failed to save rule');
        } finally {
            setSaving(false);
        }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={e => e.target === e.currentTarget && onClose()}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 rounded-t-2xl">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Zap className="w-5 h-5 text-violet-500" />
                        {isEdit ? 'Edit Automation Rule' : 'Create Automation Rule'}
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Name & Description */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Rule Name *</label>
                            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                placeholder="e.g., Retry Failed Messages"
                                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Description (optional)</label>
                            <input type="text" value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                placeholder="What does this automation do?"
                                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:outline-none" />
                        </div>
                    </div>

                    {/* TRIGGER */}
                    <div className="p-5 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800">
                        <h3 className="font-bold text-blue-900 dark:text-blue-300 mb-4 flex items-center gap-2">
                            <Zap className="w-4 h-4" /> When to Trigger
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Trigger Event</label>
                                <select value={form.trigger.type}
                                    onChange={e => setForm(f => ({ ...f, trigger: { ...f.trigger, type: e.target.value as TriggerType } }))}
                                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none">
                                    {TRIGGER_OPTIONS.map(t => (
                                        <option key={t.value} value={t.value}>{t.icon} {t.label} — {t.desc}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                    Wait Time After Event (hours)
                                </label>
                                <div className="flex items-center gap-3">
                                    <input type="range" min={0} max={72} step={1} value={form.trigger.waitHours}
                                        onChange={e => setForm(f => ({ ...f, trigger: { ...f.trigger, waitHours: Number(e.target.value) } }))}
                                        className="flex-1 accent-blue-600" />
                                    <span className="w-16 text-center px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-bold text-blue-600">
                                        {form.trigger.waitHours}h
                                    </span>
                                </div>
                                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                    ℹ️ The automation runs {form.trigger.waitHours} hours after the trigger event
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* ACTION */}
                    <div className="p-5 bg-purple-50 dark:bg-purple-900/20 rounded-2xl border border-purple-100 dark:border-purple-800">
                        <h3 className="font-bold text-purple-900 dark:text-purple-300 mb-4 flex items-center gap-2">
                            <Target className="w-4 h-4" /> What Action to Take
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Action</label>
                                <select value={form.action.type}
                                    onChange={e => setForm(f => ({ ...f, action: { ...f.action, type: e.target.value as ActionType } }))}
                                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none">
                                    {ACTION_OPTIONS.map(a => (
                                        <option key={a.value} value={a.value}>{a.icon} {a.label} — {a.desc}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Schedule Offset (days)</label>
                                    <input type="number" min={0} max={30} value={form.action.scheduleOffsetDays}
                                        onChange={e => setForm(f => ({ ...f, action: { ...f.action, scheduleOffsetDays: Number(e.target.value) } }))}
                                        className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none" />
                                    <p className="text-xs text-gray-400 mt-1">0 = same day, 1 = next day, etc.</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Send Time</label>
                                    <input type="time" value={form.action.scheduleTime}
                                        onChange={e => setForm(f => ({ ...f, action: { ...f.action, scheduleTime: e.target.value } }))}
                                        className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                    Max Retries Per Contact <span className="text-gray-400 font-normal">(spam protection)</span>
                                </label>
                                <div className="flex items-center gap-3">
                                    <input type="range" min={1} max={5} step={1} value={form.action.maxRetries}
                                        onChange={e => setForm(f => ({ ...f, action: { ...f.action, maxRetries: Number(e.target.value) } }))}
                                        className="flex-1 accent-purple-600" />
                                    <span className="w-16 text-center px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-bold text-purple-600">
                                        {form.action.maxRetries}x
                                    </span>
                                </div>
                            </div>

                            {(form.action.type === 'RESCHEDULE_CAMPAIGN' || form.action.type === 'SEND_FOLLOWUP') && (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                        Custom Follow-up Message <span className="text-gray-400 font-normal">(optional — leave empty to re-send original)</span>
                                    </label>
                                    <textarea value={form.action.message || ''} rows={3}
                                        onChange={e => setForm(f => ({ ...f, action: { ...f.action, message: e.target.value } }))}
                                        placeholder="Hey! Just checking if you saw our last message. We have something special for you 🎁"
                                        className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Rule Preview</p>
                        <p className="text-sm text-gray-800 dark:text-gray-200">
                            When a <strong>{TRIGGER_OPTIONS.find(t => t.value === form.trigger.type)?.label}</strong> event occurs,
                            wait <strong>{form.trigger.waitHours} hours</strong>, then{' '}
                            <strong>{ACTION_OPTIONS.find(a => a.value === form.action.type)?.label.toLowerCase()}</strong>{' '}
                            {form.action.scheduleOffsetDays > 0 ? `${form.action.scheduleOffsetDays} day(s) later` : 'same day'} at <strong>{form.action.scheduleTime}</strong>.
                            Maximum <strong>{form.action.maxRetries} retry/retries</strong> per contact.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800 rounded-b-2xl">
                    <button onClick={onClose}
                        className="px-5 py-3 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        Cancel
                    </button>
                    <button onClick={handleSave} disabled={saving}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-bold shadow-md hover:shadow-lg hover:scale-[1.01] disabled:opacity-60 disabled:scale-100 transition-all">
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                        {isEdit ? 'Save Changes' : 'Create Automation'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
