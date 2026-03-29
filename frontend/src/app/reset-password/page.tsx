'use client';
import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Eye, EyeOff, CheckCircle, Loader2, Zap, AlertCircle } from 'lucide-react';
import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

function ResetForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token') || '';

    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState('');

    const strength = password.length === 0 ? 0 :
        password.length < 6 ? 1 :
            password.length < 8 ? 2 :
                /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^a-zA-Z0-9]/.test(password) ? 4 : 3;

    const strengthConfig = [
        { label: '', color: '' },
        { label: 'Too short', color: 'bg-red-500' },
        { label: 'Weak', color: 'bg-orange-500' },
        { label: 'Good', color: 'bg-yellow-400' },
        { label: 'Strong', color: 'bg-green-500' },
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirm) { setError('Passwords do not match'); return; }
        if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
        if (!token) { setError('Invalid or missing reset token. Please request a new link.'); return; }
        setLoading(true); setError('');
        try {
            await axios.post(`${API_BASE}/auth/reset-password`, { token, newPassword: password });
            setDone(true);
            setTimeout(() => router.push('/login'), 3000);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Reset failed. The link may have expired.');
        } finally { setLoading(false); }
    };

    if (!token) {
        return (
            <div className="text-center">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                <h2 className="text-xl font-bold text-white mb-2">Invalid Reset Link</h2>
                <p className="text-slate-300 text-sm">This link is invalid or missing a token.</p>
                <Link href="/forgot-password" className="mt-4 inline-block text-violet-400 hover:text-violet-300 text-sm">
                    Request a new reset link →
                </Link>
            </div>
        );
    }

    return (
        <AnimatePresence mode="wait">
            {!done ? (
                <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <h2 className="text-2xl font-bold text-white mb-1">Set new password</h2>
                    <p className="text-slate-300 text-sm mb-6">Choose a strong password for your account.</p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">New Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                                    placeholder="At least 8 characters" required minLength={8}
                                    className="w-full pl-10 pr-12 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent" />
                                <button type="button" onClick={() => setShowPass(!showPass)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {password && (
                                <div className="mt-2">
                                    <div className="flex gap-1">
                                        {[1, 2, 3, 4].map(i => (
                                            <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= strength ? strengthConfig[strength].color : 'bg-white/20'}`} />
                                        ))}
                                    </div>
                                    <p className={`text-xs mt-1 ${strength >= 4 ? 'text-green-400' : strength >= 3 ? 'text-yellow-400' : 'text-slate-400'}`}>
                                        {strengthConfig[strength].label}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Confirm Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input type={showPass ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)}
                                    placeholder="Repeat password" required
                                    className={`w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors ${confirm && confirm !== password ? 'border-red-500/50' : 'border-white/20'
                                        }`} />
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-3 text-sm text-red-300">
                                {error}
                            </div>
                        )}

                        <button type="submit" disabled={!password || !confirm || loading || password !== confirm}
                            className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-violet-900/30 disabled:opacity-50 flex items-center justify-center gap-2">
                            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Resetting...</> : 'Reset Password'}
                        </button>
                    </form>
                </motion.div>
            ) : (
                <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-9 h-9 text-green-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Password reset!</h2>
                    <p className="text-slate-300 text-sm">Your password has been changed. Redirecting you to login...</p>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl shadow-lg mb-4">
                        <Zap className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Techaasvik</h1>
                </div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl">
                    <Suspense fallback={<div className="text-white text-center">Loading...</div>}>
                        <ResetForm />
                    </Suspense>
                    <div className="mt-6 text-center">
                        <Link href="/login" className="text-sm text-slate-400 hover:text-white transition-colors">
                            Back to login
                        </Link>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
