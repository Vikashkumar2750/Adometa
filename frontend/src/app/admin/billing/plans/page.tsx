'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Package, Plus, Edit2, Trash2, CheckCircle, XCircle,
    Zap, Star, Shield, RefreshCw, DollarSign, Users, MessageSquare,
    Save, X, ToggleLeft, ToggleRight,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import api from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Plan {
    id: string;
    name: string;
    slug: string;
    price_monthly: number;
    price_yearly: number;
    currency: string;
    max_contacts: number;
    max_campaigns_per_month: number;
    max_messages_per_month: number;
    max_team_members: number;
    features: string[];
    is_active: boolean;
    is_popular: boolean;
    trial_days: number;
    created_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const defaultPlan: Partial<Plan> = {
    name: '',
    slug: '',
    price_monthly: 0,
    price_yearly: 0,
    currency: 'INR',
    max_contacts: 1000,
    max_campaigns_per_month: 10,
    max_messages_per_month: 10000,
    max_team_members: 3,
    features: [],
    is_active: true,
    is_popular: false,
    trial_days: 0,
};

const PLAN_ICONS: Record<string, any> = {
    free: Zap,
    starter: Star,
    growth: Shield,
    enterprise: Package,
};

// ─── Component ───────────────────────────────────────────────────────────────
export default function AdminPlansPage() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [editModal, setEditModal] = useState<Partial<Plan> | null>(null);
    const [isNew, setIsNew] = useState(false);
    const [featureInput, setFeatureInput] = useState('');

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/admin/billing/plans');
            setPlans(Array.isArray(data) ? data : data.plans || []);
        } catch {
            // If endpoint doesn't exist yet, show static demo plans
            setPlans([
                {
                    id: '1', name: 'Free', slug: 'free', price_monthly: 0, price_yearly: 0,
                    currency: 'INR', max_contacts: 500, max_campaigns_per_month: 3,
                    max_messages_per_month: 1000, max_team_members: 1,
                    features: ['500 Contacts', '3 Campaigns/month', '1000 Messages/month', 'Basic Templates'],
                    is_active: true, is_popular: false, trial_days: 0, created_at: new Date().toISOString(),
                },
                {
                    id: '2', name: 'Starter', slug: 'starter', price_monthly: 1999, price_yearly: 19999,
                    currency: 'INR', max_contacts: 5000, max_campaigns_per_month: 20,
                    max_messages_per_month: 50000, max_team_members: 3,
                    features: ['5,000 Contacts', '20 Campaigns/month', '50k Messages/month', 'Advanced Templates', 'Analytics'],
                    is_active: true, is_popular: true, trial_days: 14, created_at: new Date().toISOString(),
                },
                {
                    id: '3', name: 'Growth', slug: 'growth', price_monthly: 4999, price_yearly: 49999,
                    currency: 'INR', max_contacts: 25000, max_campaigns_per_month: 100,
                    max_messages_per_month: 250000, max_team_members: 10,
                    features: ['25,000 Contacts', '100 Campaigns/month', '250k Messages/month', 'Team Management', 'API Access', 'Priority Support'],
                    is_active: true, is_popular: false, trial_days: 30, created_at: new Date().toISOString(),
                },
                {
                    id: '4', name: 'Enterprise', slug: 'enterprise', price_monthly: 14999, price_yearly: 149999,
                    currency: 'INR', max_contacts: -1, max_campaigns_per_month: -1,
                    max_messages_per_month: -1, max_team_members: -1,
                    features: ['Unlimited Contacts', 'Unlimited Campaigns', 'Unlimited Messages', 'Dedicated Support', 'Custom Integrations', 'SLA Agreement'],
                    is_active: true, is_popular: false, trial_days: 0, created_at: new Date().toISOString(),
                },
            ]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleSave = async () => {
        if (!editModal?.name || !editModal?.slug) {
            toast.error('Name and slug are required');
            return;
        }
        try {
            if (isNew) {
                await api.post('/admin/billing/plans', editModal);
                toast.success('Plan created');
            } else {
                await api.patch(`/admin/billing/plans/${editModal.id}`, editModal);
                toast.success('Plan updated');
            }
            setEditModal(null);
            load();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Save failed');
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Delete plan "${name}"? Tenants on this plan will not be affected until renewal.`)) return;
        try {
            await api.delete(`/admin/billing/plans/${id}`);
            toast.success('Plan deleted');
            load();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Delete failed');
        }
    };

    const addFeature = () => {
        if (!featureInput.trim()) return;
        setEditModal(prev => prev ? { ...prev, features: [...(prev.features || []), featureInput.trim()] } : prev);
        setFeatureInput('');
    };

    const removeFeature = (i: number) => {
        setEditModal(prev => prev ? { ...prev, features: (prev.features || []).filter((_, idx) => idx !== i) } : prev);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            <Toaster position="top-right" />

            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Package className="w-6 h-6 text-blue-600" />
                        Plans & Pricing
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Manage subscription plans available to tenants</p>
                </div>
                <button
                    onClick={() => { setEditModal({ ...defaultPlan }); setIsNew(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-all shadow-sm"
                >
                    <Plus size={16} /> New Plan
                </button>
            </div>

            {/* Plans Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 animate-pulse">
                            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-4 w-24" />
                            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
                            <div className="space-y-2">{[...Array(4)].map((_, j) => <div key={j} className="h-4 bg-gray-100 dark:bg-gray-700 rounded" />)}</div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                    {plans.map((plan, i) => {
                        const Icon = PLAN_ICONS[plan.slug] || Package;
                        return (
                            <motion.div
                                key={plan.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.07 }}
                                className={`relative bg-white dark:bg-gray-800 rounded-2xl border p-6 flex flex-col ${plan.is_popular
                                        ? 'border-blue-500 ring-2 ring-blue-500/20'
                                        : 'border-gray-200 dark:border-gray-700'
                                    } ${!plan.is_active ? 'opacity-60' : ''}`}
                            >
                                {plan.is_popular && (
                                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                                        Most Popular
                                    </span>
                                )}

                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                                            <Icon size={18} className="text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900 dark:text-white">{plan.name}</h3>
                                            <span className="text-xs text-gray-400 font-mono">{plan.slug}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {plan.is_active
                                            ? <CheckCircle size={14} className="text-emerald-500" />
                                            : <XCircle size={14} className="text-gray-400" />}
                                    </div>
                                </div>

                                {/* Pricing */}
                                <div className="mb-4">
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {plan.price_monthly === 0 ? 'Free' : fmt(plan.price_monthly)}
                                        {plan.price_monthly > 0 && <span className="text-sm font-normal text-gray-400">/mo</span>}
                                    </p>
                                    {plan.price_yearly > 0 && (
                                        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                                            {fmt(plan.price_yearly)}/yr · Save {Math.round((1 - plan.price_yearly / (plan.price_monthly * 12)) * 100)}%
                                        </p>
                                    )}
                                    {plan.trial_days > 0 && (
                                        <p className="text-xs text-blue-500 mt-0.5">{plan.trial_days}-day free trial</p>
                                    )}
                                </div>

                                {/* Limits */}
                                <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 text-center">
                                        <Users size={12} className="mx-auto mb-0.5 text-gray-400" />
                                        <p className="font-semibold text-gray-700 dark:text-gray-300">
                                            {plan.max_contacts === -1 ? '∞' : plan.max_contacts.toLocaleString()}
                                        </p>
                                        <p className="text-gray-400">Contacts</p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 text-center">
                                        <MessageSquare size={12} className="mx-auto mb-0.5 text-gray-400" />
                                        <p className="font-semibold text-gray-700 dark:text-gray-300">
                                            {plan.max_messages_per_month === -1 ? '∞' : (plan.max_messages_per_month >= 1000 ? (plan.max_messages_per_month / 1000) + 'k' : plan.max_messages_per_month)}
                                        </p>
                                        <p className="text-gray-400">Msgs/mo</p>
                                    </div>
                                </div>

                                {/* Features */}
                                <ul className="space-y-1.5 flex-1 mb-5">
                                    {plan.features.slice(0, 4).map((f, fi) => (
                                        <li key={fi} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                                            <CheckCircle size={12} className="text-emerald-500 shrink-0" />
                                            {f}
                                        </li>
                                    ))}
                                    {plan.features.length > 4 && (
                                        <li className="text-xs text-blue-500">+{plan.features.length - 4} more features</li>
                                    )}
                                </ul>

                                {/* Actions */}
                                <div className="flex gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                                    <button
                                        onClick={() => { setEditModal({ ...plan }); setIsNew(false); }}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs rounded-lg font-medium transition-all"
                                    >
                                        <Edit2 size={12} /> Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(plan.id, plan.name)}
                                        className="flex items-center justify-center gap-1.5 px-3 py-2 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 text-xs rounded-lg font-medium transition-all"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Edit / Create Modal */}
            <AnimatePresence>
                {editModal && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                        onClick={() => setEditModal(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                    {isNew ? 'Create New Plan' : `Edit "${editModal.name}"`}
                                </h3>
                                <button onClick={() => setEditModal(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                                    <X size={18} className="text-gray-500" />
                                </button>
                            </div>

                            <div className="p-6 space-y-5">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Plan Name *</label>
                                        <input
                                            value={editModal.name || ''}
                                            onChange={e => setEditModal(p => ({ ...p, name: e.target.value }))}
                                            placeholder="e.g. Starter"
                                            className="w-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Slug *</label>
                                        <input
                                            value={editModal.slug || ''}
                                            onChange={e => setEditModal(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                                            placeholder="e.g. starter"
                                            className="w-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Monthly Price (₹)</label>
                                        <input type="number" min="0"
                                            value={editModal.price_monthly || 0}
                                            onChange={e => setEditModal(p => ({ ...p, price_monthly: parseFloat(e.target.value) }))}
                                            className="w-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Yearly Price (₹)</label>
                                        <input type="number" min="0"
                                            value={editModal.price_yearly || 0}
                                            onChange={e => setEditModal(p => ({ ...p, price_yearly: parseFloat(e.target.value) }))}
                                            className="w-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Trial Days</label>
                                        <input type="number" min="0"
                                            value={editModal.trial_days || 0}
                                            onChange={e => setEditModal(p => ({ ...p, trial_days: parseInt(e.target.value) }))}
                                            className="w-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {[
                                        { key: 'max_contacts', label: 'Max Contacts (-1 = ∞)' },
                                        { key: 'max_campaigns_per_month', label: 'Max Campaigns/mo' },
                                        { key: 'max_messages_per_month', label: 'Max Messages/mo' },
                                        { key: 'max_team_members', label: 'Team Members' },
                                    ].map(f => (
                                        <div key={f.key}>
                                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">{f.label}</label>
                                            <input type="number"
                                                value={(editModal as any)[f.key] || 0}
                                                onChange={e => setEditModal(p => ({ ...p, [f.key]: parseInt(e.target.value) }))}
                                                className="w-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                    ))}
                                </div>

                                {/* Features */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Features</label>
                                    <div className="flex gap-2 mb-2">
                                        <input
                                            value={featureInput}
                                            onChange={e => setFeatureInput(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && addFeature()}
                                            placeholder="Add a feature and press Enter"
                                            className="flex-1 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <button onClick={addFeature} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm">
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {(editModal.features || []).map((f, i) => (
                                            <span key={i} className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full text-xs">
                                                {f}
                                                <button onClick={() => removeFeature(i)} className="hover:text-red-500">
                                                    <X size={10} />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Toggles */}
                                <div className="flex gap-6">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <div onClick={() => setEditModal(p => ({ ...p, is_active: !p?.is_active }))}
                                            className={`w-10 h-5 rounded-full transition-colors ${editModal.is_active ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                                            <div className={`w-4 h-4 bg-white rounded-full m-0.5 transition-transform ${editModal.is_active ? 'translate-x-5' : 'translate-x-0'}`} />
                                        </div>
                                        <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <div onClick={() => setEditModal(p => ({ ...p, is_popular: !p?.is_popular }))}
                                            className={`w-10 h-5 rounded-full transition-colors ${editModal.is_popular ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                                            <div className={`w-4 h-4 bg-white rounded-full m-0.5 transition-transform ${editModal.is_popular ? 'translate-x-5' : 'translate-x-0'}`} />
                                        </div>
                                        <span className="text-sm text-gray-700 dark:text-gray-300">Mark as Popular</span>
                                    </label>
                                </div>
                            </div>

                            <div className="flex gap-3 p-6 pt-0">
                                <button onClick={() => setEditModal(null)} className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium text-sm transition-all">
                                    Cancel
                                </button>
                                <button onClick={handleSave} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-all">
                                    <Save size={16} /> {isNew ? 'Create Plan' : 'Save Changes'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
