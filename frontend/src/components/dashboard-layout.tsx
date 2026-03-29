'use client';

import { Sidebar } from './sidebar';
import { Header } from './header';
import { ProtectedRoute } from './protected-route';

interface DashboardLayoutProps {
    children: React.ReactNode;
    allowedRoles?: Array<'SUPER_ADMIN' | 'TENANT_ADMIN' | 'TENANT_MARKETER' | 'TENANT_VIEWER'>;
}

/**
 * Dashboard Layout
 *
 * Provides the main layout structure for tenant dashboard pages.
 * SUPER_ADMIN manages tenants via /admin panel — not this dashboard.
 */
export function DashboardLayout({ children, allowedRoles }: DashboardLayoutProps) {
    return (
        <ProtectedRoute allowedRoles={allowedRoles}>
            <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
                {/* Sidebar */}
                <Sidebar />

                {/* Main Content */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Header */}
                    <Header />

                    {/* Page Content */}
                    <main className="flex-1 overflow-y-auto p-6">
                        {children}
                    </main>
                </div>
            </div>
        </ProtectedRoute>
    );
}
