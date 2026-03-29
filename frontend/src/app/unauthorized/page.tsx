'use client';

import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { ShieldAlert } from 'lucide-react';

export default function UnauthorizedPage() {
    const { user } = useAuthStore();

    // Decide where to redirect based on role
    const homeLink = user?.role === 'SUPER_ADMIN' ? '/admin' : '/dashboard';
    const homeName = user?.role === 'SUPER_ADMIN' ? 'Admin Dashboard' : 'Dashboard';

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 to-slate-900 flex items-center justify-center p-4">
            <div className="text-center max-w-md">
                <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <ShieldAlert className="w-10 h-10 text-red-400" />
                </div>
                <h1 className="text-4xl font-black text-white mb-3">403</h1>
                <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
                <p className="text-gray-400 mb-8">
                    You don't have permission to access this page.
                    {user && (
                        <span className="block mt-1 text-sm">
                            Your role (<strong className="text-gray-300">{user.role}</strong>) doesn't have access to this section.
                        </span>
                    )}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link href={homeLink}
                        className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all">
                        Go to {homeName}
                    </Link>
                    <Link href="/"
                        className="px-6 py-3 border border-white/20 text-white font-semibold rounded-xl hover:bg-white/10 transition-all">
                        Home
                    </Link>
                </div>
            </div>
        </div>
    );
}
