'use client';
import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowLeft, Loader2, CheckCircle, Zap } from 'lucide-react';
import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [devUrl, setDevUrl] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;
        setLoading(true); setError('');
        try {
            const res = await axios.post(`${API_BASE}/auth/forgot-password`, { email: email.trim().toLowerCase() });
            setSent(true);
            if (res.data.dev_reset_url) setDevUrl(res.data.dev_reset_url);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Something went wrong. Please try again.');
        } finally { setLoading(false); }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl shadow-lg mb-4">
                        <Zap className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Techaasvik</h1>
                </div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl">

                    <AnimatePresence mode="wait">
                        {!sent ? (
                            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                <div className="mb-6">
                                    <h2 className="text-2xl font-bold text-white">Forgot password?</h2>
                                    <p className="text-slate-300 mt-1 text-sm">
                                        Enter your email and we'll send you a reset link.
                                    </p>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Email address</label>
                                        <div className="relative">
                                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                                                placeholder="you@company.com" required
                                                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent" />
                                        </div>
                                    </div>

                                    {error && (
                                        <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-3 text-sm text-red-300">
                                            {error}
                                        </div>
                                    )}

                                    <button type="submit" disabled={!email.trim() || loading}
                                        className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-violet-900/30 disabled:opacity-50 flex items-center justify-center gap-2">
                                        {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : 'Send Reset Link'}
                                    </button>
                                </form>
                            </motion.div>
                        ) : (
                            <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                                <div className="text-center">
                                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle className="w-9 h-9 text-green-400" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-white mb-2">Check your email</h2>
                                    <p className="text-slate-300 text-sm">
                                        If <strong className="text-white">{email}</strong> exists in our system, we've sent a password reset link. It expires in 1 hour.
                                    </p>
                                    {devUrl && (
                                        <div className="mt-4 bg-amber-500/20 border border-amber-400/30 rounded-xl p-4 text-left">
                                            <p className="text-amber-300 text-xs font-semibold mb-1">🛠 Dev Mode (email not configured)</p>
                                            <a href={devUrl} className="text-amber-200 text-xs break-all hover:underline">{devUrl}</a>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="mt-6 text-center">
                        <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors">
                            <ArrowLeft className="w-3.5 h-3.5" /> Back to login
                        </Link>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
