'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';

/**
 * Protected Route Component
 * 
 * Redirects to login if user is not authenticated
 * Optionally checks for specific roles
 */
interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: Array<'SUPER_ADMIN' | 'TENANT_ADMIN' | 'TENANT_MARKETER' | 'TENANT_VIEWER'>;
    redirectTo?: string;
}

export function ProtectedRoute({
    children,
    allowedRoles,
    redirectTo = '/login'
}: ProtectedRouteProps) {
    const router = useRouter();
    const { isAuthenticated, isLoading, user } = useAuthStore();

    useEffect(() => {
        if (!isLoading) {
            // Not authenticated - redirect to login
            if (!isAuthenticated) {
                router.push(redirectTo);
                return;
            }

            // Check role if specified
            if (allowedRoles && user && !allowedRoles.includes(user.role)) {
                router.push('/unauthorized');
                return;
            }
        }
    }, [isAuthenticated, isLoading, user, allowedRoles, router, redirectTo]);

    // Show loading state
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
                </div>
            </div>
        );
    }

    // Not authenticated
    if (!isAuthenticated) {
        return null;
    }

    // Check role
    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        return null;
    }

    return <>{children}</>;
}
