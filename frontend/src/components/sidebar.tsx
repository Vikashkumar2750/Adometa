'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    LayoutDashboard,
    MessageSquare,
    Users,
    Send,
    BarChart3,
    Settings,
    Zap,
    ChevronLeft,
    ChevronRight,
    FileText,
    Megaphone,
    CreditCard,
    HeadphonesIcon,
    Layers,
    Smartphone,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
}

const navItems: NavItem[] = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Messages', href: '/dashboard/messages', icon: MessageSquare },
    { name: 'Contacts', href: '/dashboard/contacts', icon: Users },
    { name: 'Segments', href: '/dashboard/segments', icon: Layers },
    { name: 'Templates', href: '/dashboard/templates', icon: FileText },
    { name: 'Campaigns', href: '/dashboard/campaigns', icon: Megaphone },
    { name: 'Automation', href: '/dashboard/automation', icon: Zap, badge: 'NEW' },
    { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
    { name: 'Billing', href: '/dashboard/billing', icon: CreditCard },
    { name: 'Support', href: '/dashboard/support', icon: HeadphonesIcon },
    { name: 'WhatsApp', href: '/dashboard/whatsapp', icon: Smartphone },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <motion.aside
            initial={false}
            animate={{ width: isCollapsed ? 80 : 256 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="relative flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-screen sticky top-0 flex-shrink-0 overflow-hidden"
        >
            {/* Logo */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                {!isCollapsed && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center space-x-2"
                    >
                        <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg">
                            <Zap className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                            Techaasvik
                        </span>
                    </motion.div>
                )}

                {isCollapsed && (
                    <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg mx-auto">
                        <Zap className="w-5 h-5 text-white" />
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                'flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                                isActive
                                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
                                isCollapsed && 'justify-center'
                            )}
                        >
                            <Icon className={cn('flex-shrink-0', isCollapsed ? 'w-6 h-6' : 'w-5 h-5')} />
                            {!isCollapsed && (
                                <span className="font-medium">{item.name}</span>
                            )}
                            {!isCollapsed && item.badge && (
                                <span className="ml-auto px-2 py-0.5 text-xs font-semibold bg-red-500 text-white rounded-full">
                                    {item.badge}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Collapse Toggle */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className={cn(
                        'flex items-center space-x-3 px-3 py-2.5 rounded-lg w-full transition-all duration-200',
                        'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
                        isCollapsed && 'justify-center'
                    )}
                >
                    {isCollapsed ? (
                        <ChevronRight className="w-5 h-5" />
                    ) : (
                        <>
                            <ChevronLeft className="w-5 h-5" />
                            <span className="font-medium">Collapse</span>
                        </>
                    )}
                </button>
            </div>
        </motion.aside>
    );
}
