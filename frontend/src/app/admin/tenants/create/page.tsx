"use client"
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';
import Link from 'next/link';
import { ArrowLeft, Loader2, Eye, EyeOff, Check, Star } from 'lucide-react';

const PLANS = [
    {
        id: 'FREE_TRIAL',
        label: '🆓 Free Trial',
        price: '₹0',
        desc: '14 days trial, 500 messages/month',
        color: 'gray',
        features: ['500 messages/month', '1 WhatsApp account', '3 segments', 'Basic templates'],
    },
    {
        id: 'STARTER',
        label: '🚀 Starter',
        price: '₹2,499/mo',
        desc: 'Perfect for small businesses',
        color: 'blue',
        features: ['5,000 messages/month', '1 WhatsApp account', '10 segments', '5 team members', 'Analytics'],
    },
    {
        id: 'GROWTH',
        label: '📈 Growth',
        price: '₹6,499/mo',
        desc: 'Scaling teams & campaigns',
        color: 'purple',
        features: ['25,000 messages/month', '3 WhatsApp accounts', 'Unlimited segments', '15 team members', 'Automation', 'Priority support'],
        popular: true,
    },
    {
        id: 'ENTERPRISE',
        label: '🏢 Enterprise',
        price: 'Custom',
        desc: 'For large scale operations',
        color: 'gold',
        features: ['Unlimited messages', 'Unlimited accounts', 'Unlimited everything', 'Dedicated support', 'Custom integrations', 'SLA guarantee'],
    },
];

export default function CreateTenantPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState('FREE_TRIAL');
    const [formData, setFormData] = useState({
        business_name: '',
        owner_name: '',
        owner_email: '',
        password: '',
        confirmPassword: '',
        timezone: 'Asia/Kolkata',
        locale: 'en-IN',
    });
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(formData.password)) {
            setError('Password must be at least 8 characters and include uppercase, lowercase, number, and special character');
            setLoading(false);
            return;
        }

        try {
            const { confirmPassword, ...submitData } = formData;
            await api.post('/tenants', { ...submitData, plan: selectedPlan });
            router.push('/admin/tenants');
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.message || 'Failed to create tenant');
        } finally {
            setLoading(false);
        }
    };

    const colorMap: Record<string, string> = {
        gray: 'border-gray-300 dark:border-gray-600',
        blue: 'border-blue-400',
        purple: 'border-purple-500',
        gold: 'border-yellow-400',
    };
    const selectedColorMap: Record<string, string> = {
        gray: 'border-gray-500 bg-gray-50 dark:bg-gray-700/50 ring-2 ring-gray-400',
        blue: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-400',
        purple: 'border-purple-600 bg-purple-50 dark:bg-purple-900/20 ring-2 ring-purple-500',
        gold: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10 ring-2 ring-yellow-400',
    };
    const badgeColorMap: Record<string, string> = {
        gray: 'bg-gray-100 text-gray-600',
        blue: 'bg-blue-100 text-blue-700',
        purple: 'bg-purple-100 text-purple-700',
        gold: 'bg-yellow-100 text-yellow-700',
    };

    return (
        <div className="p-8">
            <div className="max-w-3xl mx-auto">
                <div className="mb-6">
                    <Link href="/admin/tenants" className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 mb-2">
                        <ArrowLeft className="mr-1 h-4 w-4" /> Back to Tenants
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Register New Tenant</h1>
                    <p className="mt-1 text-sm text-gray-500">Create a new organization workspace with a plan.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 ring-1 ring-red-200">{error}</div>
                    )}

                    {/* Plan Selection */}
                    <div className="overflow-hidden bg-white p-6 shadow-sm ring-1 ring-gray-200 rounded-xl dark:bg-gray-800 dark:ring-gray-700">
                        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Select Plan</h2>
                        <div className="grid grid-cols-2 gap-3">
                            {PLANS.map(plan => {
                                const isSelected = selectedPlan === plan.id;
                                return (
                                    <button
                                        key={plan.id}
                                        type="button"
                                        onClick={() => setSelectedPlan(plan.id)}
                                        className={`relative text-left p-4 rounded-xl border-2 transition-all ${isSelected ? selectedColorMap[plan.color] : `${colorMap[plan.color]} hover:border-opacity-70`
                                            }`}
                                    >
                                        {plan.popular && (
                                            <span className="absolute -top-2.5 left-3 px-2 py-0.5 bg-purple-600 text-white text-xs font-bold rounded-full flex items-center gap-1">
                                                <Star className="w-2.5 h-2.5" /> Popular
                                            </span>
                                        )}
                                        {isSelected && (
                                            <div className="absolute top-3 right-3 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                                                <Check className="w-3 h-3 text-white" />
                                            </div>
                                        )}
                                        <div className="flex items-start justify-between pr-6">
                                            <div>
                                                <p className="font-bold text-gray-900 dark:text-white text-sm">{plan.label}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{plan.desc}</p>
                                            </div>
                                            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap ${badgeColorMap[plan.color]}`}>
                                                {plan.price}
                                            </span>
                                        </div>
                                        <ul className="mt-2 space-y-0.5">
                                            {plan.features.slice(0, 3).map(f => (
                                                <li key={f} className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                                                    <Check className="w-3 h-3 text-green-500 flex-shrink-0" /> {f}
                                                </li>
                                            ))}
                                        </ul>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Tenant Details */}
                    <div className="overflow-hidden bg-white p-6 shadow-sm ring-1 ring-gray-200 rounded-xl dark:bg-gray-800 dark:ring-gray-700">
                        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Tenant Details</h2>
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Business Name</label>
                                <input type="text" required value={formData.business_name}
                                    onChange={e => setFormData({ ...formData, business_name: e.target.value })}
                                    className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 p-2.5 text-sm"
                                    placeholder="e.g. Acme Inc." />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Owner Name</label>
                                <input type="text" required value={formData.owner_name}
                                    onChange={e => setFormData({ ...formData, owner_name: e.target.value })}
                                    className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 p-2.5 text-sm"
                                    placeholder="John Doe" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Owner Email</label>
                                <input type="email" required value={formData.owner_email}
                                    onChange={e => setFormData({ ...formData, owner_email: e.target.value })}
                                    className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 p-2.5 text-sm"
                                    placeholder="admin@acme.com" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Timezone</label>
                                <select value={formData.timezone} onChange={e => setFormData({ ...formData, timezone: e.target.value })}
                                    className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-sm focus:border-blue-500 p-2.5 text-sm">
                                    <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</option>
                                    <option value="UTC">UTC</option>
                                    <option value="America/New_York">America/New_York (EST)</option>
                                    <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                                    <option value="Europe/London">Europe/London (GMT)</option>
                                    <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                                    <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Currency / Locale</label>
                                <select value={formData.locale} onChange={e => setFormData({ ...formData, locale: e.target.value })}
                                    className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-sm focus:border-blue-500 p-2.5 text-sm">
                                    <option value="en-IN">🇮🇳 India (INR ₹)</option>
                                    <option value="en-US">🇺🇸 United States (USD $)</option>
                                    <option value="en-GB">🇬🇧 United Kingdom (GBP £)</option>
                                    <option value="en-AE">🇦🇪 UAE (AED د.إ)</option>
                                    <option value="en-SG">🇸🇬 Singapore (SGD S$)</option>
                                </select>
                            </div>

                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                                <div className="relative mt-1">
                                    <input type={showPassword ? "text" : "password"} required value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-sm focus:border-blue-500 p-2.5 text-sm pr-10"
                                        placeholder="Min 8 chars, uppercase, lowercase, number, special char" />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600">
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm Password</label>
                                <div className="relative mt-1">
                                    <input type={showConfirmPassword ? "text" : "password"} required value={formData.confirmPassword}
                                        onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                                        className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-sm focus:border-blue-500 p-2.5 text-sm pr-10"
                                        placeholder="Re-enter password" />
                                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600">
                                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={() => router.back()}
                            className="rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading}
                            className="inline-flex justify-center items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50 transition-all">
                            {loading ? <><Loader2 className="animate-spin h-4 w-4" /> Creating...</> : 'Create Tenant'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
