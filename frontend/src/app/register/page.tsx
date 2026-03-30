'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { useAuthStore } from '@/lib/auth-store';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const plans = [
    { id: 'FREE_TRIAL', label: 'Free Trial', price: '₹0', desc: '14 days, 500 msgs', color: 'border-gray-300 bg-gray-50', active: 'border-green-500 bg-green-50 ring-2 ring-green-400' },
    { id: 'STARTER', label: 'Starter', price: '₹2,499', desc: '/month · 5K msgs', color: 'border-gray-300 bg-gray-50', active: 'border-blue-500 bg-blue-50 ring-2 ring-blue-400' },
    { id: 'GROWTH', label: 'Growth', price: '₹6,499', desc: '/month · 25K msgs', color: 'border-gray-300 bg-gray-50', active: 'border-purple-500 bg-purple-50 ring-2 ring-purple-400' },
    { id: 'ENTERPRISE', label: 'Enterprise', price: 'Custom', desc: 'Unlimited', color: 'border-gray-300 bg-gray-50', active: 'border-amber-500 bg-amber-50 ring-2 ring-amber-400' },
];

function PasswordStrength({ password }: { password: string }) {
    const checks = [
        { label: '8+ characters', ok: password.length >= 8 },
        { label: 'Uppercase letter', ok: /[A-Z]/.test(password) },
        { label: 'Lowercase letter', ok: /[a-z]/.test(password) },
        { label: 'Number', ok: /\d/.test(password) },
        { label: 'Special char', ok: /[@$!%*?&]/.test(password) },
    ];
    const score = checks.filter(c => c.ok).length;
    const strengthLabel = ['', 'Weak', 'Weak', 'Fair', 'Good', 'Strong'][score];
    const strengthColor = ['', 'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-blue-400', 'bg-green-500'][score];

    if (!password) return null;
    return (
        <div className="mt-2 space-y-1.5">
            <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= score ? strengthColor : 'bg-gray-200'}`} />
                ))}
                <span className={`text-xs font-semibold ml-2 ${score >= 4 ? 'text-green-600' : score >= 3 ? 'text-yellow-600' : 'text-red-500'}`}>
                    {strengthLabel}
                </span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                {checks.map(c => (
                    <span key={c.label} className={`text-xs flex items-center gap-1 ${c.ok ? 'text-green-600' : 'text-gray-400'}`}>
                        {c.ok ? '✓' : '○'} {c.label}
                    </span>
                ))}
            </div>
        </div>
    );
}

function RegisterContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const setAuth = useAuthStore(s => s.setAuth);

    const defaultPlan = searchParams.get('plan') || 'FREE_TRIAL';

    const [form, setForm] = useState({
        business_name: '',
        owner_name: '',
        owner_email: '',
        password: '',
        confirm_password: '',
        plan: defaultPlan,
        timezone: 'Asia/Kolkata',
        locale: 'en-IN',
        agree: false,
    });
    const [loading, setLoading] = useState(false);
    const [showPass, setShowPass] = useState(false);

    const set = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!form.business_name.trim()) return toast.error('Business name is required');
        if (!form.owner_name.trim()) return toast.error('Your name is required');
        if (!form.owner_email.trim()) return toast.error('Email is required');
        if (!form.password) return toast.error('Password is required');
        if (form.password !== form.confirm_password) return toast.error('Passwords do not match');
        if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(form.password))
            return toast.error('Password must have uppercase, lowercase, number, and special character');
        if (!form.agree) return toast.error('Please accept the Terms of Service');

        setLoading(true);
        try {
            const { data } = await axios.post(`${API}/auth/register`, {
                business_name: form.business_name.trim(),
                owner_name: form.owner_name.trim(),
                owner_email: form.owner_email.trim().toLowerCase(),
                password: form.password,
                plan: form.plan,
                timezone: form.timezone,
                locale: form.locale,
            });

            // Save auth store + cookie
            setAuth(data.user, data.access_token);
            document.cookie = `token=${data.access_token}; path=/; max-age=86400; SameSite=Lax`;

            toast.success('🎉 Account created! Welcome to Techaasvik!');
            setTimeout(() => router.push('/dashboard'), 1200);
        } catch (err: any) {
            const msg = err.response?.data?.message;
            if (Array.isArray(msg)) toast.error(msg[0]);
            else toast.error(msg || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-950 to-slate-900 flex items-center justify-center p-4">
            <Toaster position="top-center" />

            <div className="w-full max-w-xl">
                {/* Header */}
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center gap-2 mb-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                            <span className="text-white font-black text-lg">T</span>
                        </div>
                        <span className="text-white font-black text-2xl">Techaasvik</span>
                    </Link>
                    <h1 className="text-3xl font-black text-white">Create your account</h1>
                    <p className="text-slate-400 mt-1">
                        Start your 14-day free trial · No credit card required
                    </p>
                </div>

                {/* Card */}
                <div className="bg-white rounded-3xl shadow-2xl p-8">
                    <form onSubmit={handleSubmit} className="space-y-5">

                        {/* Plan selector */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Choose a plan</label>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                {plans.map(p => (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => set('plan', p.id)}
                                        className={`rounded-xl border-2 p-2.5 text-left transition-all cursor-pointer ${form.plan === p.id ? p.active : p.color}`}
                                    >
                                        <p className="text-xs font-bold text-gray-900">{p.label}</p>
                                        <p className="text-sm font-black text-gray-800">{p.price}</p>
                                        <p className="text-xs text-gray-500">{p.desc}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="border-t border-gray-100 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Business Name */}
                            <div className="sm:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Business name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={form.business_name}
                                    onChange={e => set('business_name', e.target.value)}
                                    placeholder="e.g. FashionKart India Pvt Ltd"
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition"
                                    required
                                />
                            </div>

                            {/* Owner Name */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Your name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={form.owner_name}
                                    onChange={e => set('owner_name', e.target.value)}
                                    placeholder="Rohan Sharma"
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition"
                                    required
                                />
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Work email <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    value={form.owner_email}
                                    onChange={e => set('owner_email', e.target.value)}
                                    placeholder="you@company.com"
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition"
                                    required
                                />
                            </div>

                            {/* Password */}
                            <div className="sm:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Password <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPass ? 'text' : 'password'}
                                        value={form.password}
                                        onChange={e => set('password', e.target.value)}
                                        placeholder="Min 8 chars, uppercase, number, special"
                                        className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition"
                                        required
                                    />
                                    <button type="button" onClick={() => setShowPass(!showPass)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">
                                        {showPass ? '🙈' : '👁'}
                                    </button>
                                </div>
                                <PasswordStrength password={form.password} />
                            </div>

                            {/* Confirm Password */}
                            <div className="sm:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Confirm password <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type={showPass ? 'text' : 'password'}
                                    value={form.confirm_password}
                                    onChange={e => set('confirm_password', e.target.value)}
                                    placeholder="Re-enter your password"
                                    className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 transition ${form.confirm_password && form.password !== form.confirm_password
                                            ? 'border-red-300 focus:ring-red-300'
                                            : 'border-gray-200 focus:ring-green-400 focus:border-transparent'
                                        }`}
                                    required
                                />
                                {form.confirm_password && form.password !== form.confirm_password && (
                                    <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                                )}
                                {form.confirm_password && form.password === form.confirm_password && (
                                    <p className="text-xs text-green-600 mt-1">✓ Passwords match</p>
                                )}
                            </div>
                        </div>

                        {/* Timezone */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">Timezone</label>
                                <select value={form.timezone} onChange={e => set('timezone', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
                                    <option value="Asia/Kolkata">IST — Asia/Kolkata</option>
                                    <option value="Asia/Dubai">GST — Asia/Dubai</option>
                                    <option value="UTC">UTC</option>
                                    <option value="America/New_York">EST — New York</option>
                                    <option value="Europe/London">GMT — London</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">Currency / Locale</label>
                                <select value={form.locale} onChange={e => set('locale', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
                                    <option value="en-IN">🇮🇳 INR (₹)</option>
                                    <option value="en-US">🇺🇸 USD ($)</option>
                                    <option value="en-GB">🇬🇧 GBP (£)</option>
                                    <option value="en-AE">🇦🇪 AED (د.إ)</option>
                                </select>
                            </div>
                        </div>

                        {/* Terms */}
                        <label className="flex items-start gap-3 cursor-pointer">
                            <input type="checkbox" checked={form.agree} onChange={e => set('agree', e.target.checked)}
                                className="mt-0.5 w-4 h-4 accent-green-500 rounded cursor-pointer flex-shrink-0" />
                            <span className="text-sm text-gray-600">
                                I agree to the{' '}
                                <a href="/terms" className="text-green-600 hover:underline font-medium">Terms of Service</a>
                                {' '}and{' '}
                                <a href="/privacy" className="text-green-600 hover:underline font-medium">Privacy Policy</a>
                            </span>
                        </label>

                        {/* Submit */}
                        <button type="submit" disabled={loading}
                            className="w-full py-3.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl hover:shadow-xl hover:scale-[1.01] transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100 shadow-lg shadow-green-200 text-base">
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31" strokeDashoffset="10" />
                                    </svg>
                                    Creating your account...
                                </span>
                            ) : '🚀 Create Free Account'}
                        </button>

                        <p className="text-center text-sm text-gray-500">
                            Already have an account?{' '}
                            <Link href="/login" className="text-green-600 font-semibold hover:underline">Log in →</Link>
                        </p>
                    </form>
                </div>

                {/* Trust row */}
                <div className="flex flex-wrap justify-center gap-4 mt-6 text-xs text-slate-400">
                    <span>🔒 Bank-grade security</span>
                    <span>✅ No credit card needed</span>
                    <span>📱 5 min WhatsApp setup</span>
                    <span>🇮🇳 INR billing</span>
                </div>
            </div>
        </div>
    );
}

export default function RegisterPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-950 to-slate-900 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <RegisterContent />
        </Suspense>
    );
}
