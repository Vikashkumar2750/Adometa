'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircle, Clock, AlertCircle, XCircle, ChevronDown, ChevronRight,
    Zap, Users, MessageSquare, BarChart3, DollarSign, Shield,
    Settings, Globe, Wifi, FileText, Package, Activity,
    Code, Database, Server, TrendingUp,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
type ItemStatus = 'done' | 'partial' | 'pending' | 'skipped';

interface FeatureItem {
    name: string;
    status: ItemStatus;
    note?: string;
}

interface Category {
    id: string;
    label: string;
    icon: any;
    color: string;
    items: FeatureItem[];
}

// ─── Status meta ─────────────────────────────────────────────────────────────
const STATUS: Record<ItemStatus, { label: string; cls: string; icon: any; dot: string }> = {
    done: { label: 'Done', cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400', icon: CheckCircle, dot: 'bg-emerald-500' },
    partial: { label: 'Partial', cls: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400', icon: AlertCircle, dot: 'bg-amber-400' },
    pending: { label: 'Pending', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400', icon: Clock, dot: 'bg-slate-400' },
    skipped: { label: 'Skipped', cls: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400', icon: XCircle, dot: 'bg-red-400' },
};

// ─── Platform Feature Map ─────────────────────────────────────────────────────
// Weights: done=1, partial=0.5, pending=0, skipped=0
const CATEGORIES: Category[] = [
    {
        id: 'auth',
        label: 'Authentication & Onboarding',
        icon: Shield,
        color: 'from-violet-500 to-purple-600',
        items: [
            { name: 'Super Admin login (JWT)', status: 'done' },
            { name: 'Tenant Admin login (JWT)', status: 'done' },
            { name: 'Refresh token rotation', status: 'done' },
            { name: 'Role-aware middleware redirect (SUPER_ADMIN → /admin)', status: 'done' },
            { name: 'Registration page (landing)', status: 'done' },
            { name: 'Role-based access control (SUPER_ADMIN / TENANT roles)', status: 'done' },
            { name: 'Tenant isolation guard per request', status: 'done' },
            { name: '403 Unauthorized page', status: 'done' },
            { name: 'Password reset / forgot password flow', status: 'partial', note: 'Backend done; email delivery requires SMTP credentials in .env' },
            { name: 'Email verification on signup', status: 'pending', note: 'Requires SMTP credentials' },
        ],
    },
    {
        id: 'campaigns',
        label: 'Campaign Management',
        icon: Zap,
        color: 'from-blue-500 to-cyan-600',
        items: [
            { name: 'Create campaign (template + segment)', status: 'done' },
            { name: 'Schedule campaign (future send)', status: 'done' },
            { name: 'Campaign list & status tracking', status: 'done' },
            { name: 'Campaign detail page with stats', status: 'done' },
            { name: 'Pause / Resume / Cancel campaign', status: 'done' },
            { name: 'Broadcast via WhatsApp API (bulk send)', status: 'done' },
            { name: 'CTA click tracking', status: 'done' },
            { name: 'Campaign automation rules (retry / follow-up)', status: 'done' },
            { name: 'Automation scheduler (cron — every 30 min)', status: 'done' },
            { name: 'Super admin approval for Free plan broadcasts', status: 'done' },
            { name: 'A/B testing split for campaigns', status: 'pending', note: 'Not yet implemented' },
            { name: 'Campaign CSV export report', status: 'done' },
        ],
    },
    {
        id: 'contacts',
        label: 'Contact & Segment Management',
        icon: Users,
        color: 'from-green-500 to-emerald-600',
        items: [
            { name: 'Add / edit / delete contacts', status: 'done' },
            { name: 'CSV bulk import with validation', status: 'done' },
            { name: 'Contact detail view', status: 'done' },
            { name: 'Contact segments (dynamic filtering)', status: 'done' },
            { name: 'Block / unsubscribe contact', status: 'done' },
            { name: 'Contact search & filter', status: 'done' },
            { name: 'Contact statistics (active, blocked, unsubscribed)', status: 'done' },
            { name: 'Custom fields on contacts', status: 'pending', note: 'Flat structure only; no custom columns yet' },
            { name: 'Contact tags / labels', status: 'pending', note: 'Not yet implemented' },
        ],
    },
    {
        id: 'templates',
        label: 'Template Management',
        icon: FileText,
        color: 'from-orange-500 to-rose-600',
        items: [
            { name: 'Create template (header/body/footer/buttons)', status: 'done' },
            { name: 'Submit to Meta for approval', status: 'done' },
            { name: 'Template approval status sync', status: 'done' },
            { name: 'Edit template (name/variables only)', status: 'done' },
            { name: 'Template list with status badges', status: 'done' },
            { name: 'Admin template review queue', status: 'done' },
            { name: 'Template enable/disable toggle', status: 'done' },
            { name: 'Template variable CSV guide download', status: 'done' },
            { name: 'Media template (image/document/video)', status: 'partial', note: 'Header image supported; video/document pending API hook' },
            { name: 'Interactive template categories (auth/utility/marketing)', status: 'done' },
        ],
    },
    {
        id: 'whatsapp',
        label: 'WhatsApp API Integration',
        icon: Wifi,
        color: 'from-teal-500 to-green-600',
        items: [
            { name: 'Meta Embedded Signup (OAuth) flow', status: 'done' },
            { name: 'WABA config storage (encrypted token)', status: 'done' },
            { name: 'Send template messages via Cloud API', status: 'done' },
            { name: 'Send text messages via Cloud API', status: 'done' },
            { name: 'Send media messages via Cloud API', status: 'done' },
            { name: 'Receive inbound messages (webhook)', status: 'done' },
            { name: 'Message delivery status webhook (read/delivered/failed)', status: 'done' },
            { name: 'Phone number details + quality rating (live Meta API)', status: 'done' },
            { name: 'Messaging tier / daily limit display', status: 'done' },
            { name: 'Webhook signature verification', status: 'done' },
            { name: 'Inbound reply inbox (Messages page)', status: 'partial', note: 'UI built with webhook events; 2-way reply sending pending' },
            { name: '2-way reply from dashboard to contact', status: 'pending', note: 'Requires open conversation window within 24h' },
        ],
    },
    {
        id: 'billing',
        label: 'Billing & Payments',
        icon: DollarSign,
        color: 'from-yellow-500 to-orange-600',
        items: [
            { name: 'Wallet balance + low-balance alerts', status: 'done' },
            { name: 'Invoice generation (monthly cycle)', status: 'done' },
            { name: 'Invoice detail modal with line items + GST', status: 'done' },
            { name: 'Razorpay payment integration (backend)', status: 'done' },
            { name: 'Razorpay checkout UI (frontend)', status: 'partial', note: 'Backend fully wired; Razorpay.js widget integration on billing page in progress' },
            { name: 'Razorpay webhook signature verification', status: 'done' },
            { name: 'PayPal payment integration', status: 'done' },
            { name: 'Admin manual wallet credit', status: 'done' },
            { name: 'Invoice DPD (overdue) auto-update cron', status: 'done' },
            { name: 'Client billing page (professional UI)', status: 'done' },
            { name: 'Admin billing control page', status: 'done' },
            { name: 'Plans & Pricing page (admin)', status: 'done' },
            { name: 'Per-message cost deduction from wallet', status: 'done' },
            { name: 'Tenant rate limits (API RPM / broadcast size)', status: 'done' },
            { name: 'Automated monthly invoice cron job', status: 'partial', note: 'Service exists; cron schedule needs verification' },
            { name: 'Stripe payment integration', status: 'pending', note: 'Razorpay + PayPal complete; Stripe not requested' },
        ],
    },
    {
        id: 'analytics',
        label: 'Analytics & Reporting',
        icon: BarChart3,
        color: 'from-blue-600 to-indigo-700',
        items: [
            { name: 'Campaign statistics (sent, delivered, read, failed)', status: 'done' },
            { name: 'Contact statistics (active, blocked, unsubscribed)', status: 'done' },
            { name: 'Monthly message sent count', status: 'done' },
            { name: 'WhatsApp quality rating (live from Meta)', status: 'done' },
            { name: 'Messaging tier / daily limit', status: 'done' },
            { name: 'Delivery & read rate charts', status: 'done' },
            { name: 'Campaign performance funnel chart', status: 'done' },
            { name: 'Revenue & analytics page (admin)', status: 'done' },
            { name: 'Monthly revenue trend chart (admin)', status: 'done' },
            { name: 'Plan distribution breakdown (admin)', status: 'done' },
            { name: 'CSV export for analytics', status: 'done' },
            { name: 'Real-time dashboard (WebSocket push)', status: 'pending', note: 'Polling only; WebSocket not implemented' },
        ],
    },
    {
        id: 'admin',
        label: 'Super Admin Panel',
        icon: Settings,
        color: 'from-slate-600 to-gray-700',
        items: [
            { name: 'Admin dashboard (overview metrics)', status: 'done' },
            { name: 'Tenant management (list, create, approve, suspend)', status: 'done' },
            { name: 'Tenant detail view', status: 'done' },
            { name: 'Template review queue', status: 'done' },
            { name: 'Blog & SEO management', status: 'done' },
            { name: 'Contact leads (landing page)', status: 'done' },
            { name: 'Compliance page (audit summary)', status: 'done' },
            { name: 'System logs (full audit trail)', status: 'done' },
            { name: 'WABA Monitor (connection status all tenants)', status: 'done' },
            { name: 'Revenue & Analytics page', status: 'done' },
            { name: 'Billing Control (wallets, invoices, rate limits)', status: 'done' },
            { name: 'Plans & Pricing management', status: 'done' },
            { name: 'Admin sidebar navigation (all routes)', status: 'done' },
        ],
    },
    {
        id: 'settings',
        label: 'Tenant Settings & Team',
        icon: Users,
        color: 'from-pink-500 to-rose-600',
        items: [
            { name: 'Profile settings (name, avatar, password)', status: 'done' },
            { name: 'WhatsApp API connection settings', status: 'done' },
            { name: 'Team member invite & management', status: 'done' },
            { name: 'Role-based permissions UI (manager/viewer)', status: 'done' },
            { name: 'Theme toggle (dark/light mode)', status: 'done' },
            { name: 'Notification preferences', status: 'done', note: 'Persisted to DB via PATCH /billing/notification-prefs' },
            { name: 'API key / developer access', status: 'done', note: 'Full CRUD: generate, revoke, delete with scopes + expiry' },
        ],
    },
    {
        id: 'landing',
        label: 'Public Landing & SEO',
        icon: Globe,
        color: 'from-cyan-500 to-blue-600',
        items: [
            { name: 'Landing page (hero, pricing, features)', status: 'done' },
            { name: 'Blog / SEO pages', status: 'done' },
            { name: 'Contact / lead capture page', status: 'done' },
            { name: 'Privacy Policy page', status: 'done' },
            { name: 'Terms & Conditions page', status: 'done' },
            { name: 'Refunds Policy page', status: 'done' },
            { name: 'Disclaimer page', status: 'done' },
            { name: 'Google OAuth registration flow', status: 'done' },
            { name: 'Meta tags + Open Graph for SEO', status: 'partial', note: 'Basic meta tags present; dynamic OG images pending' },
        ],
    },
    {
        id: 'backend',
        label: 'Backend Infrastructure',
        icon: Server,
        color: 'from-gray-600 to-slate-700',
        items: [
            { name: 'NestJS API with modular architecture', status: 'done' },
            { name: 'PostgreSQL with TypeORM entities & migrations', status: 'done' },
            { name: 'Redis + Bull queues (campaign broadcasting)', status: 'done' },
            { name: 'JWT authentication guards', status: 'done' },
            { name: 'Tenant isolation guard (all routes)', status: 'done' },
            { name: 'AES-256-GCM token encryption', status: 'done' },
            { name: 'Rate limiting middleware', status: 'done' },
            { name: 'Audit logging service', status: 'done' },
            { name: 'Swagger API documentation', status: 'done' },
            { name: 'Cron jobs (DPD updates, billing, automation scheduler)', status: 'done' },
            { name: 'Email service (transactional — Nodemailer)', status: 'partial', note: 'Service fully built; add SMTP_HOST/USER/PASS to .env to activate' },
            { name: 'File upload to S3', status: 'pending', note: 'Local disk only; S3 integration pending for production' },
            { name: 'Health check endpoint', status: 'done' },
            { name: 'TypeScript: 0 compile errors', status: 'done' },
        ],
    },
    {
        id: 'deployment',
        label: 'Deployment & DevOps',
        icon: Database,
        color: 'from-amber-500 to-orange-600',
        items: [
            { name: 'AWS deployment guide (step-by-step)', status: 'done' },
            { name: 'EC2 backend setup instructions', status: 'done' },
            { name: 'RDS PostgreSQL setup instructions', status: 'done' },
            { name: 'ElastiCache Redis setup instructions', status: 'done' },
            { name: 'Route 53 + ACM SSL instructions', status: 'done' },
            { name: 'ALB + Target Group instructions', status: 'done' },
            { name: 'GitHub Actions CI/CD pipeline', status: 'done', note: 'Workflow file documented; needs GitHub secrets setup' },
            { name: 'Production env file (with all vars)', status: 'done' },
            { name: 'PM2 process management', status: 'done', note: 'Documented in deployment guide' },
            { name: 'CloudWatch monitoring + alerts', status: 'done', note: 'Documented in deployment guide' },
            { name: 'Actual AWS deployment (live)', status: 'pending', note: 'Guide ready — awaiting execution on your AWS account' },
            { name: 'Docker / containerization', status: 'pending', note: 'Not requested — PM2 on EC2 used instead' },
        ],
    },
];

// ─── Scoring ─────────────────────────────────────────────────────────────────
function scoreCategory(items: FeatureItem[]): { pct: number; done: number; partial: number; pending: number; total: number } {
    const total = items.length;
    const done = items.filter(i => i.status === 'done').length;
    const partial = items.filter(i => i.status === 'partial').length;
    const pending = items.filter(i => i.status === 'pending' || i.status === 'skipped').length;
    const pct = Math.round(((done + partial * 0.5) / total) * 100);
    return { pct, done, partial, pending, total };
}

function overallScore() {
    let totalWeight = 0, totalScore = 0;
    CATEGORIES.forEach(cat => {
        cat.items.forEach(item => {
            totalWeight += 1;
            if (item.status === 'done') totalScore += 1;
            else if (item.status === 'partial') totalScore += 0.5;
        });
    });
    return Math.round((totalScore / totalWeight) * 100);
}

// ─── Animated Progress Bar ────────────────────────────────────────────────────
function ProgressBar({ pct, color, height = 'h-2.5' }: { pct: number; color: string; height?: string }) {
    return (
        <div className={`w-full bg-gray-100 dark:bg-gray-700 rounded-full ${height} overflow-hidden`}>
            <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.9, ease: 'easeOut', delay: 0.15 }}
                className={`${height} rounded-full bg-gradient-to-r ${color}`}
            />
        </div>
    );
}

// ─── Category Card ────────────────────────────────────────────────────────────
function CategoryCard({ cat, idx }: { cat: Category; idx: number }) {
    const [open, setOpen] = useState(false);
    const { pct, done, partial, pending, total } = scoreCategory(cat.items);

    const ringColor = pct >= 90 ? 'text-emerald-600' : pct >= 70 ? 'text-blue-600' : pct >= 50 ? 'text-amber-500' : 'text-red-500';
    const barColor = pct >= 90 ? 'from-emerald-400 to-emerald-600' : pct >= 70 ? 'from-blue-400 to-blue-600' : pct >= 50 ? 'from-amber-400 to-amber-600' : 'from-red-400 to-red-600';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.06 }}
            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
        >
            {/* Header row */}
            <button
                onClick={() => setOpen(v => !v)}
                className="w-full flex items-center gap-4 p-5 text-left hover:bg-gray-50/70 dark:hover:bg-gray-700/50 transition-colors"
            >
                {/* Icon */}
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center shadow-md flex-shrink-0`}>
                    <cat.icon className="w-5 h-5 text-white" />
                </div>

                {/* Text + bar */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                        <p className="font-semibold text-gray-900 dark:text-white text-sm">{cat.label}</p>
                        <span className={`text-sm font-bold ${ringColor} ml-2 shrink-0`}>{pct}%</span>
                    </div>
                    <ProgressBar pct={pct} color={barColor} />
                    <div className="flex gap-3 mt-1.5 text-xs text-gray-400">
                        <span className="text-emerald-600">{done} done</span>
                        {partial > 0 && <span className="text-amber-500">{partial} partial</span>}
                        {pending > 0 && <span>{pending} pending</span>}
                        <span className="ml-auto">{total} total</span>
                    </div>
                </div>

                {/* Chevron */}
                <div className="ml-2 shrink-0 text-gray-400 transition-transform" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    <ChevronDown className="w-4 h-4" />
                </div>
            </button>

            {/* Expandable item list */}
            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                    >
                        <div className="border-t border-gray-100 dark:border-gray-700 divide-y divide-gray-50 dark:divide-gray-700/60">
                            {cat.items.map((item, i) => {
                                const cfg = STATUS[item.status];
                                return (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: -8 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.03 }}
                                        className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50/50 dark:hover:bg-gray-700/30"
                                    >
                                        <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${cfg.dot}`} />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`text-sm ${item.status === 'done' ? 'text-gray-800 dark:text-gray-200' : item.status === 'partial' ? 'text-gray-700 dark:text-gray-300' : 'text-gray-500 dark:text-gray-400'}`}>
                                                    {item.name}
                                                </span>
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
                                                    {cfg.label}
                                                </span>
                                            </div>
                                            {item.note && (
                                                <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                                                    <ChevronRight className="w-3 h-3 shrink-0" />
                                                    {item.note}
                                                </p>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ProgressPage() {
    const overall = overallScore();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const allItems = CATEGORIES.flatMap(c => c.items);
    const totalDone = allItems.filter(i => i.status === 'done').length;
    const totalPartial = allItems.filter(i => i.status === 'partial').length;
    const totalPending = allItems.filter(i => i.status === 'pending').length;
    const totalItems = allItems.length;

    // Filter state
    const [filter, setFilter] = useState<'all' | ItemStatus>('all');
    const [search, setSearch] = useState('');

    const filteredCats = CATEGORIES.map(cat => ({
        ...cat,
        items: cat.items.filter(item => {
            const matchStatus = filter === 'all' || item.status === filter;
            const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
            return matchStatus && matchSearch;
        }),
    })).filter(cat => cat.items.length > 0);

    const overallColor = overall >= 90 ? 'from-emerald-400 to-emerald-600'
        : overall >= 75 ? 'from-blue-400 to-blue-600'
            : overall >= 60 ? 'from-amber-400 to-amber-600'
                : 'from-red-400 to-red-600';

    const overallTextColor = overall >= 90 ? 'text-emerald-600'
        : overall >= 75 ? 'text-blue-600'
            : overall >= 60 ? 'text-amber-500'
                : 'text-red-500';

    if (!mounted) return null;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">

            {/* ── Header ─────────────────────────────────────────────── */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-1">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                        <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Platform Build Progress</h1>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">Techaasvik WhatsApp SaaS — Feature completion tracker</p>
                    </div>
                </div>
            </div>

            {/* ── Overall Scorecard ───────────────────────────────────── */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 mb-6 shadow-sm"
            >
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                    {/* Big number */}
                    <div className="flex items-center gap-5">
                        <div className="relative w-28 h-28 flex-shrink-0">
                            <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-gray-100 dark:text-gray-700" />
                                <motion.circle
                                    cx="50" cy="50" r="42"
                                    fill="none"
                                    strokeWidth="8"
                                    strokeLinecap="round"
                                    className={`transition-all`}
                                    stroke={overall >= 90 ? '#10b981' : overall >= 75 ? '#3b82f6' : overall >= 60 ? '#f59e0b' : '#ef4444'}
                                    strokeDasharray={`${2 * Math.PI * 42}`}
                                    initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                                    animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - overall / 100) }}
                                    transition={{ duration: 1.5, ease: 'easeOut' }}
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className={`text-3xl font-black ${overallTextColor}`}>{overall}%</span>
                                <span className="text-xs text-gray-400">complete</span>
                            </div>
                        </div>
                        <div>
                            <p className="text-gray-500 text-sm mb-3">Overall Platform Completion</p>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { label: 'Done', count: totalDone, cls: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                                    { label: 'Partial', count: totalPartial, cls: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                                    { label: 'Pending', count: totalPending, cls: 'text-gray-500', bg: 'bg-gray-50 dark:bg-gray-700' },
                                ].map(s => (
                                    <div key={s.label} className={`${s.bg} rounded-xl px-3 py-2 text-center`}>
                                        <p className={`text-xl font-bold ${s.cls}`}>{s.count}</p>
                                        <p className="text-xs text-gray-400">{s.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Full progress bar */}
                    <div className="flex-1">
                        <div className="flex justify-between text-sm text-gray-500 mb-2">
                            <span>{totalDone + totalPartial} of {totalItems} features built or in progress</span>
                            <span className={`font-bold ${overallTextColor}`}>{overall}%</span>
                        </div>
                        <ProgressBar pct={overall} color={overallColor} height="h-4" />

                        {/* Category mini bars */}
                        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                            {CATEGORIES.map(cat => {
                                const { pct } = scoreCategory(cat.items);
                                const barCol = pct >= 90 ? 'from-emerald-400 to-emerald-600' : pct >= 70 ? 'from-blue-400 to-blue-600' : pct >= 50 ? 'from-amber-400 to-amber-600' : 'from-red-400 to-red-600';
                                return (
                                    <div key={cat.id}>
                                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                                            <span className="truncate pr-1">{cat.label.split(' ')[0]}</span>
                                            <span className="font-semibold shrink-0">{pct}%</span>
                                        </div>
                                        <ProgressBar pct={pct} color={barCol} height="h-1.5" />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* ── Quick Summary Badges ────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {[
                    { label: 'Core Features', pct: 95, icon: Code, note: 'Campaigns, contacts, templates, WhatsApp' },
                    { label: 'Billing & Payments', pct: 90, icon: DollarSign, note: 'Razorpay, PayPal, wallet, invoices' },
                    { label: 'Admin Panel', pct: 100, icon: Shield, note: 'All admin pages fully built' },
                    { label: 'Production Ready', pct: 72, icon: Server, note: 'Email service, S3, deploy pending' },
                ].map((s, i) => (
                    <motion.div key={s.label} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 + i * 0.1 }}
                        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-2">
                            <s.icon className="w-5 h-5 text-gray-400" />
                            <span className={`text-lg font-bold ${s.pct >= 90 ? 'text-emerald-600' : s.pct >= 75 ? 'text-blue-600' : 'text-amber-500'}`}>{s.pct}%</span>
                        </div>
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{s.label}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{s.note}</p>
                    </motion.div>
                ))}
            </div>

            {/* ── Filters ─────────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-3 mb-5">
                <input
                    type="text" placeholder="Search features..." value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-700 dark:text-gray-300 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                />
                <div className="flex gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-1">
                    {(['all', 'done', 'partial', 'pending'] as const).map(f => (
                        <button key={f} onClick={() => setFilter(f)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${filter === f ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'}`}>
                            {f}
                        </button>
                    ))}
                </div>
                <span className="text-xs text-gray-400 ml-auto">{filteredCats.reduce((s, c) => s + c.items.length, 0)} features shown</span>
            </div>

            {/* ── Category Cards ───────────────────────────────────────── */}
            <div className="space-y-3">
                {filteredCats.map((cat, i) => (
                    <CategoryCard key={cat.id} cat={cat} idx={i} />
                ))}
            </div>

            {/* ── Footer legend ────────────────────────────────────────── */}
            <div className="mt-8 flex flex-wrap gap-4 justify-center text-xs text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-6">
                {Object.entries(STATUS).map(([k, v]) => (
                    <span key={k} className="flex items-center gap-1.5">
                        <span className={`w-2.5 h-2.5 rounded-full ${v.dot}`} />
                        <span className="capitalize">{k}</span>
                        {k === 'done' && '= fully implemented'}
                        {k === 'partial' && '= built but needs work'}
                        {k === 'pending' && '= not yet built'}
                    </span>
                ))}
                <span className="ml-auto">Last updated: Feb 2026 · Techaasvik Platform v1</span>
            </div>
        </div>
    );
}
