'use client';
import React from 'react';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bell, Search, Moon, Sun, User, Settings, LogOut,
    ChevronDown, Wallet, RefreshCw, WifiOff, AlertCircle,
    MessageSquare, CheckCircle2, X, ExternalLink,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// ─── Notification Types ───────────────────────────────────────────────────────
interface Notification {
    id: string;
    type: 'ticket' | 'campaign' | 'system' | 'billing';
    title: string;
    body: string;
    time: string;
    read: boolean;
    href?: string;
}

function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
    ticket: <MessageSquare className="w-4 h-4 text-blue-500" />,
    campaign: <CheckCircle2 className="w-4 h-4 text-green-500" />,
    system: <Bell className="w-4 h-4 text-purple-500" />,
    billing: <AlertCircle className="w-4 h-4 text-amber-500" />,
};

const TYPE_BG: Record<string, string> = {
    ticket: 'bg-blue-50 dark:bg-blue-900/20',
    campaign: 'bg-green-50 dark:bg-green-900/20',
    system: 'bg-purple-50 dark:bg-purple-900/20',
    billing: 'bg-amber-50 dark:bg-amber-900/20',
};

interface WabaBalance {
    balance: number | null;
    currency: string;
    connected: boolean;
    status: string;
}

function WabaBalanceWidget() {
    const [data, setData] = useState<WabaBalance | null>(null);
    const [loading, setLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const fetchBalance = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/whatsapp/messages/balance');
            setData(res.data);
            setLastUpdated(new Date());
        } catch {
            // Silently fail — not critical
            setData({ balance: null, currency: 'USD', connected: false, status: 'ERROR' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBalance();
        // Refresh every 60 seconds
        const interval = setInterval(fetchBalance, 60_000);
        return () => clearInterval(interval);
    }, [fetchBalance]);

    if (!data) {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse">
                <Wallet className="w-4 h-4 text-gray-400" />
                <div className="w-16 h-3 bg-gray-300 dark:bg-gray-600 rounded" />
            </div>
        );
    }

    if (!data.connected) {
        return (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700/50 rounded-lg text-gray-400 text-xs"
                title="WhatsApp not connected">
                <WifiOff className="w-3.5 h-3.5" />
                <span>Not connected</span>
            </div>
        );
    }

    const isLow = data.balance !== null && data.balance < 10;
    const balanceDisplay = data.balance !== null
        ? `${data.currency} ${data.balance.toFixed(2)}`
        : 'N/A';

    return (
        <div className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border',
            isLow
                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-700 dark:text-red-400'
                : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-700 dark:text-green-400'
        )}>
            <Wallet className="w-3.5 h-3.5 flex-shrink-0" />
            <div>
                <span className="font-bold">{balanceDisplay}</span>
                <span className="text-opacity-70 ml-1 font-normal opacity-70">WABA</span>
            </div>
            {isLow && <AlertCircle className="w-3.5 h-3.5 text-red-500" aria-label="Low balance" />}
            <button
                onClick={e => { e.stopPropagation(); fetchBalance(); }}
                className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity"
                title={lastUpdated ? `Last updated ${lastUpdated.toLocaleTimeString()}` : 'Refresh balance'}
            >
                <RefreshCw className={cn('w-3 h-3', loading && 'animate-spin')} />
            </button>
        </div>
    );
}

export function Header() {
    const router = useRouter();
    const { user, logout } = useAuthStore();
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [isDark, setIsDark] = useState(false);
    const userMenuRef = useRef<HTMLDivElement>(null);
    const notifRef = useRef<HTMLDivElement>(null);
    const isTenantUser = user?.role && !['SUPER_ADMIN'].includes(user.role);

    // Build notifications from support stats + static system items
    const [notifications, setNotifications] = useState<Notification[]>([
        {
            id: 'sys-1',
            type: 'system',
            title: 'Welcome to Techaasvik!',
            body: 'Your platform is set up and ready to use. Connect WhatsApp to get started.',
            time: new Date(Date.now() - 2 * 3600000).toISOString(),
            read: false,
            href: '/dashboard/whatsapp',
        },
    ]);
    const [unreadCount, setUnreadCount] = useState(1);

    // Fetch support stats to build ticket notifications
    useEffect(() => {
        if (!isTenantUser) return;
        api.get('/support/tickets?limit=3&page=1')
            .then(({ data }) => {
                const tickets = data.data || data || [];
                if (!Array.isArray(tickets) || tickets.length === 0) return;
                const ticketNotifs: Notification[] = tickets.slice(0, 3).map((t: any) => ({
                    id: `ticket-${t.id}`,
                    type: 'ticket' as const,
                    title: t.status === 'waiting_user' ? 'Agent replied to your ticket' : `Ticket: ${t.subject}`,
                    body: `Status: ${t.status?.replace(/_/g, ' ')} · ${t.message_count} message${t.message_count !== 1 ? 's' : ''}`,
                    time: t.last_message_at || t.updated_at,
                    read: t.status !== 'waiting_user',
                    href: '/dashboard/support',
                }));
                setNotifications(prev => {
                    const existing = prev.filter(n => !n.id.startsWith('ticket-'));
                    return [...ticketNotifs, ...existing];
                });
                setUnreadCount(ticketNotifs.filter(n => !n.read).length + 1);
            })
            .catch(() => {}); // fail silently
    }, [isTenantUser]);

    const markAllRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
    };

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setIsUserMenuOpen(false);
            }
            if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
                setIsNotifOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    const toggleDarkMode = () => {
        setIsDark(!isDark);
        document.documentElement.classList.toggle('dark');
    };

    return (
        <header className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between px-6 py-3">
                {/* Search Bar */}
                <div className="flex-1 max-w-xl">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search..."
                            className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                    </div>
                </div>

                {/* Right Side Actions */}
                <div className="flex items-center gap-3 ml-4">

                    {/* WABA Balance — only for tenant users */}
                    {isTenantUser && <WabaBalanceWidget />}

                    {/* Dark Mode Toggle */}
                    <button
                        onClick={toggleDarkMode}
                        className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        aria-label="Toggle dark mode"
                    >
                        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </button>

                    {/* Notifications */}
                    <div className="relative" ref={notifRef}>
                        <button
                            onClick={() => { setIsNotifOpen(!isNotifOpen); setIsUserMenuOpen(false); }}
                            className="relative p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            aria-label="Notifications"
                        >
                            <Bell className="w-4 h-4" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[9px] font-bold">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </button>

                        <AnimatePresence>
                            {isNotifOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: -8, scale: 0.97 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -8, scale: 0.97 }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden z-50"
                                >
                                    {/* Header */}
                                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                                        <div className="flex items-center gap-2">
                                            <Bell className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                                            <span className="font-semibold text-sm text-gray-900 dark:text-white">Notifications</span>
                                            {unreadCount > 0 && (
                                                <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-xs font-bold rounded-full">{unreadCount}</span>
                                            )}
                                        </div>
                                        {unreadCount > 0 && (
                                            <button onClick={markAllRead} className="text-xs text-blue-600 hover:text-blue-700 font-medium">Mark all read</button>
                                        )}
                                    </div>

                                    {/* Notifications list */}
                                    <div className="max-h-80 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-700/50">
                                        {notifications.length === 0 ? (
                                            <div className="py-10 text-center">
                                                <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                                <p className="text-sm text-gray-400">No notifications yet</p>
                                            </div>
                                        ) : notifications.map(n => (
                                            <div key={n.id}
                                                onClick={() => { n.href && router.push(n.href); setIsNotifOpen(false); markAllRead(); }}
                                                className={cn(
                                                    'flex gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors',
                                                    !n.read && 'bg-blue-50/50 dark:bg-blue-900/10'
                                                )}
                                            >
                                                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5', TYPE_BG[n.type])}>
                                                    {TYPE_ICONS[n.type]}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={cn('text-sm font-semibold text-gray-900 dark:text-white leading-snug', !n.read && 'text-blue-900 dark:text-blue-100')}>
                                                        {n.title}
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{n.body}</p>
                                                    <p className="text-xs text-gray-400 mt-0.5">{timeAgo(n.time)}</p>
                                                </div>
                                                {!n.read && <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Footer */}
                                    <div className="px-4 py-2.5 border-t border-gray-100 dark:border-gray-700">
                                        <Link href="/dashboard/support" onClick={() => setIsNotifOpen(false)}
                                            className="flex items-center justify-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium py-1">
                                            View Support Center <ExternalLink className="w-3 h-3" />
                                        </Link>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* User Menu */}
                    <div className="relative" ref={userMenuRef}>
                        <button
                            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                            className="flex items-center gap-2 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full text-white font-bold text-sm">
                                {user?.name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div className="hidden md:block text-left">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                                    {user?.name || 'User'}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
                                    {user?.role?.replace(/_/g, ' ') || 'User'}
                                </p>
                            </div>
                            <ChevronDown className={cn('w-4 h-4 text-gray-400 transition-transform duration-200', isUserMenuOpen && 'rotate-180')} />
                        </button>

                        <AnimatePresence>
                            {isUserMenuOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: -8, scale: 0.97 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -8, scale: 0.97 }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden"
                                >
                                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{user?.name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{user?.email}</p>
                                    </div>
                                    <div className="py-1">
                                        <button
                                            onClick={() => { setIsUserMenuOpen(false); router.push('/dashboard/profile'); }}
                                            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                        >
                                            <User className="w-4 h-4" /><span>Profile</span>
                                        </button>
                                        <button
                                            onClick={() => { setIsUserMenuOpen(false); router.push('/dashboard/settings'); }}
                                            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                        >
                                            <Settings className="w-4 h-4" /><span>Settings</span>
                                        </button>
                                    </div>
                                    <div className="border-t border-gray-100 dark:border-gray-700 py-1">
                                        <button
                                            onClick={handleLogout}
                                            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                        >
                                            <LogOut className="w-4 h-4" /><span>Log out</span>
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </header>
    );
}
