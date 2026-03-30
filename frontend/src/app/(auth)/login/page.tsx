'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { authService } from '@/lib/auth-service';
import toast, { Toaster } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Mail, Lock, Loader2, Zap, AlertTriangle } from 'lucide-react';

function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const setAuth = useAuthStore((state: any) => state.setAuth);
    const sessionExpired = searchParams?.get('reason') === 'session_expired';

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (sessionExpired) {
            toast.error('Your session has expired. Please log in again.', { duration: 5000 });
        }
    }, [sessionExpired]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) { toast.error('Please fill in all fields'); return; }
        setIsLoading(true);
        try {
            const response = await authService.login({ email, password });
            setAuth(response.user, response.access_token);
            toast.success('Welcome back!');
            if (response.user.role === 'SUPER_ADMIN') {
                router.push('/admin');
            } else {
                router.push('/dashboard');
            }
        } catch (error: any) {
            console.error('Login error:', error);
            toast.error(error.response?.data?.message || 'Invalid credentials');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
            <Toaster position="top-right" />
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md"
            >
                <div className="text-center mb-8">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                        className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl mb-4 shadow-lg"
                    >
                        <Zap className="w-8 h-8 text-white" />
                    </motion.div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Adometa Platform</h1>
                    <p className="text-gray-600 dark:text-gray-400">WhatsApp Marketing &amp; Automation</p>
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8"
                >
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Sign in to your account</h2>

                    {sessionExpired && (
                        <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg mb-4">
                            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-amber-700 dark:text-amber-400">Your session expired. Please sign in again.</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email address</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-400" />
                                </div>
                                <input id="email" name="email" type="email" autoComplete="email" required value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    placeholder="you@example.com" />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input id="password" name="password" type="password" autoComplete="current-password" required value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    placeholder="••••••••" />
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <input id="remember-me" name="remember-me" type="checkbox"
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">Remember me</label>
                            </div>
                            <div className="text-sm">
                                <a href="/forgot-password" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400">Forgot password?</a>
                            </div>
                        </div>

                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={isLoading}
                            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                            {isLoading ? (<><Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />Signing in...</>) : 'Sign in'}
                        </motion.button>
                    </form>

                    <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">Demo Credentials:</p>
                        <div className="space-y-1 text-xs text-blue-700 dark:text-blue-400">
                            <p><strong>Super Admin:</strong> admin@techaasvik.com</p>
                            <p><strong>Password:</strong> Admin@Techaasvik2026!</p>
                        </div>
                    </div>
                </motion.div>

                <p className="mt-8 text-center text-sm text-gray-600 dark:text-gray-400">
                    Don&apos;t have an account?{' '}
                    <a href="#" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400">Contact your administrator</a>
                </p>
            </motion.div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <LoginContent />
        </Suspense>
    );
}
