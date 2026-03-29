'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { useAuthStore } from '@/lib/auth-store';
import {
    LayoutDashboard, Users, FileText, Shield, DollarSign,
    Activity, Menu, X, LogOut, ChevronDown, MessageSquare,
    Zap, Settings, Bell, Building2, ChevronRight,
    BookOpen, Inbox, Wifi, BarChart3, Package, TrendingUp, Send, HeadphonesIcon,
} from 'lucide-react';

import Link from 'next/link';

interface NavItem {
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | number;
}

interface NavGroup {
    title: string;
    items: NavItem[];
}

const navGroups: NavGroup[] = [
    {
        title: 'Overview',
        items: [
            { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
        ],
    },
    {
        title: 'Client Management',
        items: [
            { name: 'Tenants', href: '/admin/tenants', icon: Building2 },
            { name: 'Templates', href: '/admin/templates', icon: FileText },
        ],
    },
    {
        title: 'Billing & Revenue',
        items: [
            { name: 'Plans & Pricing', href: '/admin/billing/plans', icon: Package },
            { name: 'Billing Control', href: '/admin/billing', icon: DollarSign },
            { name: 'Credit Requests', href: '/admin/billing/credit-requests', icon: Send },
            { name: 'WABA Monitor', href: '/admin/billing/waba', icon: Wifi },
            { name: 'Revenue & Analytics', href: '/admin/billing/revenue', icon: BarChart3 },
        ],
    },
    {
        title: 'Platform',
        items: [
            { name: 'Compliance', href: '/admin/compliance', icon: Shield },
            { name: 'System Logs', href: '/admin/logs', icon: Activity },
            { name: 'Support Center', href: '/admin/support', icon: HeadphonesIcon },
            { name: 'Build Progress', href: '/admin/progress', icon: TrendingUp },
        ],
    },
    {
        title: 'Growth',
        items: [
            { name: 'Blog & SEO', href: '/admin/blog', icon: BookOpen },
            { name: 'Contact Leads', href: '/admin/leads', icon: Inbox },
        ],
    },
];


export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user } = useAuthStore();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);

    useEffect(() => {
        setSidebarOpen(false);
    }, [pathname]);

    useEffect(() => {
        const token = Cookies.get('token');
        if (!token) {
            router.push('/login');
        }
    }, [pathname, router]);

    const handleLogout = () => {
        Cookies.remove('token');
        localStorage.removeItem('user');
        router.push('/login');
    };

    const userInitial = user?.name ? user.name[0].toUpperCase() : user?.email ? user.email[0].toUpperCase() : 'A';
    const userName = user?.name || user?.email || 'Super Admin';

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Mobile sidebar backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-gray-900/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
                    fixed top-0 left-0 z-50 h-screen w-64 bg-white dark:bg-gray-800
                    border-r border-gray-200 dark:border-gray-700 flex flex-col
                    transform transition-transform duration-300 ease-in-out
                    lg:translate-x-0
                    ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                `}
            >
                {/* Logo */}
                <div className="flex items-center justify-between h-16 px-5 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-sm">A</span>
                        </div>
                        <div>
                            <span className="text-sm font-bold text-gray-900 dark:text-white">Adometa</span>
                            <div className="text-[10px] font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">Super Admin</div>
                        </div>
                    </div>
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
                    {navGroups.map((group) => (
                        <div key={group.title}>
                            <p className="px-3 mb-1.5 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                {group.title}
                            </p>
                            <div className="space-y-0.5">
                                {group.items.map((item) => {
                                    // Exact match for /admin. For all others: exact match OR
                                    // startsWith only if NO sibling item has a more specific href
                                    // This prevents /admin/billing from being active on /admin/billing/credit-requests
                                    const isActive = item.href === '/admin'
                                        ? pathname === '/admin'
                                        : pathname === item.href || (
                                            pathname.startsWith(item.href + '/') &&
                                            !navGroups.flatMap(g => g.items).some(
                                                other => other.href !== item.href &&
                                                    other.href.startsWith(item.href) &&
                                                    pathname.startsWith(other.href)
                                            )
                                        );
                                    const Icon = item.icon;


                                    return (
                                        <Link
                                            key={item.name}
                                            href={item.href}
                                            className={`
                                                flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors
                                                ${isActive
                                                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                                                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                                                }
                                            `}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <Icon className="w-4 h-4" />
                                                {item.name}
                                            </div>
                                            {item.badge !== undefined && (
                                                <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                                    {item.badge}
                                                </span>
                                            )}
                                            {isActive && !item.badge && <ChevronRight className="w-3.5 h-3.5 opacity-50" />}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* User menu */}
                <div className="border-t border-gray-200 dark:border-gray-700 p-3 flex-shrink-0">
                    <div className="relative">
                        <button
                            onClick={() => setUserMenuOpen(!userMenuOpen)}
                            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-white font-semibold text-sm">{userInitial}</span>
                            </div>
                            <div className="flex-1 text-left min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{userName}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Super Admin</p>
                            </div>
                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${userMenuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {userMenuOpen && (
                            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10">
                                <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Signed in as</p>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user?.email || '—'}</p>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <div className="lg:pl-64">
                {/* Mobile header */}
                <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between h-14 px-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-xs">A</span>
                        </div>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">Adometa Admin</span>
                    </div>
                    <div className="w-9" />
                </header>

                {/* Page content */}
                <main className="min-h-screen">
                    {children}
                </main>
            </div>
        </div>
    );
}
