'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import axios from 'axios';
import Cookies from 'js-cookie';
import {
    FileText, Plus, Search, Eye, Trash2, Send, CheckCircle,
    Clock, XCircle, Phone, Globe, MessageSquare, X,
    RefreshCw, AlertCircle, Loader2, Zap, Tag, Info,
    Image as ImageIcon, Video, FileArchive, Upload, UploadCloud, Film
} from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';

const BACKEND_BASE = 'http://localhost:3001';
const API_BASE = `${BACKEND_BASE}/api`;

// ─── Types ────────────────────────────────────────────────────────────────────
type ButtonType = 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';

interface TemplateButton {
    type: ButtonType;
    text: string;
    url?: string;
    phone_number?: string;
    example?: string[];
    trackClicks?: boolean;
    trackingLabel?: string;
}

type HeaderType = 'NONE' | 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';

interface MediaUpload {
    handle: string;
    previewUrl: string;
    filename: string;
    mimeType: string;
    size: number;
    headerType: HeaderType;
}

interface Template {
    id: string;
    name: string;
    description?: string;
    category: string;
    language: string;
    status: string;
    headerType?: HeaderType;
    headerText?: string;
    headerMediaUrl?: string;
    headerMediaFilename?: string;
    headerMediaMimeType?: string;
    bodyText: string;
    footerText?: string;
    buttons?: TemplateButton[];
    variables?: Record<string, string>;
    metaTemplateId?: string;
    metaStatus?: string;
    rejectionReason?: string;
    submittedAt?: string;
    approvedAt?: string;
    createdAt: string;
    updatedAt: string;
}

interface NewTemplateForm {
    name: string;
    description: string;
    category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
    language: 'en' | 'en_US' | 'hi' | 'es' | 'pt_BR';
    headerType: HeaderType;
    headerText: string;
    bodyText: string;
    footerText: string;
    buttons: TemplateButton[];
    submitToMeta: boolean;
}

// ─── Constant Config ──────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any; dot: string }> = {
    draft: { label: 'Draft', color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300', icon: FileText, dot: 'bg-gray-400' },
    pending: { label: 'Pending Review', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Clock, dot: 'bg-amber-400 animate-pulse' },
    approved: { label: 'Approved', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle, dot: 'bg-green-500' },
    rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle, dot: 'bg-red-500' },
    APPROVED: { label: 'Approved', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle, dot: 'bg-green-500' },
    REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle, dot: 'bg-red-500' },
    PENDING: { label: 'Pending', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Clock, dot: 'bg-amber-400 animate-pulse' },
    PENDING_LOCAL: { label: 'Queued', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Clock, dot: 'bg-blue-400 animate-pulse' },
};

const CAT_COLORS: Record<string, string> = {
    MARKETING: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    UTILITY: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    AUTHENTICATION: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

const LANG_LABELS: Record<string, string> = { en: 'English', en_US: 'English (US)', hi: 'Hindi', es: 'Spanish', pt_BR: 'Portuguese' };

const BUTTON_TYPE_INFO = {
    QUICK_REPLY: { label: 'Quick Reply', icon: MessageSquare, desc: 'Pre-set reply options for users to tap', color: 'from-blue-500 to-blue-600' },
    URL: { label: 'Website URL', icon: Globe, desc: 'Open a web page with optional tracking', color: 'from-green-500 to-green-600' },
    PHONE_NUMBER: { label: 'Call Phone', icon: Phone, desc: 'Tap to call a phone number', color: 'from-purple-500 to-purple-600' },
};

// ─── Utilities ────────────────────────────────────────────────────────────────
function getAuthHeaders() {
    const token = Cookies.get('token') || localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
}

function sanitizeTemplateName(raw: string) {
    return raw.toLowerCase().replace(/[^a-z0-9_]/g, '_');
}

function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const MEDIA_ACCEPT: Record<HeaderType, string> = {
    NONE: '', TEXT: '',
    IMAGE: 'image/jpeg,image/png,image/webp,image/gif',
    VIDEO: 'video/mp4,video/quicktime',
    DOCUMENT: 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain',
};

const HEADER_TYPE_INFO: Record<HeaderType, { label: string; icon: any; color: string; hint: string }> = {
    NONE: { label: 'None', icon: X, color: 'bg-gray-400', hint: 'No header' },
    TEXT: { label: 'Text', icon: FileText, color: 'bg-blue-500', hint: 'Plain text header (max 60 chars)' },
    IMAGE: { label: 'Image', icon: ImageIcon, color: 'bg-pink-500', hint: 'JPEG, PNG or WebP — max 5 MB' },
    VIDEO: { label: 'Video', icon: Film, color: 'bg-red-500', hint: 'MP4 — max 16 MB' },
    DOCUMENT: { label: 'Document', icon: FileArchive, color: 'bg-amber-500', hint: 'PDF, Word, Excel — max 100 MB' },
};

// ─── WhatsApp bubble preview ──────────────────────────────────────────────────
function WhatsAppPreview({ form, mediaUpload }: { form: NewTemplateForm; mediaUpload: MediaUpload | null }) {
    const bodyWithVars = form.bodyText.replace(/\{\{(\d+)\}\}/g, (_, n) => `[var_${n}]`);
    const HIcon = HEADER_TYPE_INFO[form.headerType]?.icon || FileText;
    return (
        <div className="bg-[#ECE5DD] dark:bg-[#1a2026] rounded-2xl p-4 min-h-32">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 text-center font-medium">WhatsApp Preview</p>
            <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-tl-none shadow-sm max-w-xs ml-2 overflow-hidden">
                {/* Media header previews */}
                {form.headerType === 'IMAGE' && mediaUpload && (
                    <img src={`${BACKEND_BASE}${mediaUpload.previewUrl}`} alt="header" className="w-full h-32 object-cover" />
                )}
                {form.headerType === 'VIDEO' && mediaUpload && (
                    <div className="w-full h-32 bg-black flex items-center justify-center">
                        <Film className="w-10 h-10 text-white/60" />
                        <span className="text-white text-xs ml-2">{mediaUpload.filename}</span>
                    </div>
                )}
                {form.headerType === 'DOCUMENT' && mediaUpload && (
                    <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 flex items-center gap-2 border-b border-gray-100 dark:border-gray-600">
                        <FileArchive className="w-5 h-5 text-amber-500 flex-shrink-0" />
                        <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{mediaUpload.filename}</span>
                    </div>
                )}
                {(form.headerType === 'IMAGE' || form.headerType === 'VIDEO' || form.headerType === 'DOCUMENT') && !mediaUpload && (
                    <div className="w-full h-20 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <HIcon className="w-8 h-8 text-gray-300 dark:text-gray-500" />
                    </div>
                )}
                <div className="p-3 space-y-1">
                    {form.headerType === 'TEXT' && form.headerText && (
                        <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{form.headerText}</p>
                    )}
                    {form.bodyText ? (
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{bodyWithVars}</p>
                    ) : (
                        <p className="text-sm text-gray-400 italic">Your message body...</p>
                    )}
                    {form.footerText && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-600 pt-1 mt-1">{form.footerText}</p>
                    )}
                    <p className="text-[10px] text-gray-300 dark:text-gray-600 text-right">
                        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>
            </div>
            {form.buttons.length > 0 && (
                <div className="mt-2 space-y-1.5 max-w-xs ml-2">
                    {form.buttons.map((btn, i) => {
                        const BIcon = BUTTON_TYPE_INFO[btn.type]?.icon || MessageSquare;
                        return (
                            <div key={i} className="bg-white dark:bg-gray-800 rounded-full py-2 px-4 flex items-center justify-center gap-2 shadow-sm">
                                <BIcon className="w-3.5 h-3.5 text-blue-600" />
                                <span className="text-sm text-blue-600 font-medium truncate">{btn.text || `Button ${i + 1}`}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ─── Button editor row ────────────────────────────────────────────────────────
function ButtonRow({
    btn, index, onChange, onRemove
}: {
    btn: TemplateButton;
    index: number;
    onChange: (b: TemplateButton) => void;
    onRemove: () => void;
}) {
    const info = BUTTON_TYPE_INFO[btn.type];
    const Icon = info.icon;

    return (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="bg-gray-50 dark:bg-gray-700/60 rounded-xl p-4 border border-gray-200 dark:border-gray-600 space-y-3">
            {/* Row header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${info.color} flex items-center justify-center`}>
                        <Icon className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Button {index + 1} — {info.label}</span>
                </div>
                <button onClick={onRemove} className="p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors">
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
                {/* Button type */}
                <div>
                    <label className="block text-xs text-gray-500 mb-1">Type</label>
                    <select value={btn.type} onChange={e => onChange({ ...btn, type: e.target.value as ButtonType, url: '', phone_number: '' })}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white">
                        <option value="QUICK_REPLY">Quick Reply</option>
                        <option value="URL">Website URL</option>
                        <option value="PHONE_NUMBER">Call Phone</option>
                    </select>
                </div>
                {/* Button text */}
                <div>
                    <label className="block text-xs text-gray-500 mb-1">Button Label</label>
                    <input value={btn.text} onChange={e => onChange({ ...btn, text: e.target.value })} placeholder="e.g. Shop Now"
                        maxLength={25}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white" />
                </div>
            </div>

            {/* URL-specific fields */}
            {btn.type === 'URL' && (
                <div className="space-y-3">
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Website URL <span className="text-red-400">*</span></label>
                        <input value={btn.url || ''} onChange={e => onChange({ ...btn, url: e.target.value })} placeholder="https://example.com/page?ref={{1}}"
                            className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white font-mono" />
                        <p className="text-xs text-gray-400 mt-0.5">Use {'{{1}}'} for a dynamic URL parameter</p>
                    </div>
                    {/* Tracking */}
                    <div className="flex items-center gap-3 pt-1">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <button type="button" onClick={() => onChange({ ...btn, trackClicks: !btn.trackClicks })}
                                className={`relative w-9 h-5 rounded-full transition-colors ${btn.trackClicks ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'}`}>
                                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${btn.trackClicks ? 'translate-x-4' : 'translate-x-0.5'}`} />
                            </button>
                            <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Enable Click Tracking</span>
                        </label>
                    </div>
                    {btn.trackClicks && (
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Tracking Label / UTM Campaign</label>
                            <input value={btn.trackingLabel || ''} onChange={e => onChange({ ...btn, trackingLabel: e.target.value })}
                                placeholder="e.g. summer_sale_wa_btn"
                                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white" />
                        </div>
                    )}
                </div>
            )}

            {/* Phone-specific field */}
            {btn.type === 'PHONE_NUMBER' && (
                <div>
                    <label className="block text-xs text-gray-500 mb-1">Phone Number <span className="text-red-400">*</span></label>
                    <input value={btn.phone_number || ''} onChange={e => onChange({ ...btn, phone_number: e.target.value })} placeholder="+91 9876543210"
                        className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white" />
                </div>
            )}
        </motion.div>
    );
}

// ─── Approval Status Badge ────────────────────────────────────────────────────
function ApprovalBadge({ template, onSync }: { template: Template; onSync: (id: string) => void }) {
    const [syncing, setSyncing] = useState(false);
    const effectiveStatus = template.metaStatus || template.status;
    const cfg = STATUS_CONFIG[effectiveStatus] || STATUS_CONFIG[template.status] || STATUS_CONFIG.draft;
    const Icon = cfg.icon;
    const isPending = ['pending', 'PENDING', 'PENDING_LOCAL'].includes(effectiveStatus);

    const handleSync = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setSyncing(true);
        await onSync(template.id);
        setSyncing(false);
    };

    return (
        <div className="flex items-center gap-1.5">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                <Icon className="w-3 h-3" />
                {cfg.label}
            </span>
            {isPending && template.metaTemplateId && (
                <button onClick={handleSync} title="Refresh status from Meta"
                    className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-600 transition-colors">
                    {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                </button>
            )}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TemplatesPage() {
    const { user } = useAuthStore();
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [apiError, setApiError] = useState('');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [catFilter, setCatFilter] = useState('all');
    const [preview, setPreview] = useState<Template | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [creating, setCreating] = useState(false);
    const [stats, setStats] = useState({ totalTemplates: 0, approvedTemplates: 0, pendingTemplates: 0, rejectedTemplates: 0, draftTemplates: 0 });

    // Media upload state
    const [mediaUpload, setMediaUpload] = useState<MediaUpload | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadingMedia, setUploadingMedia] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [form, setForm] = useState<NewTemplateForm>({
        name: '', description: '', category: 'MARKETING', language: 'en',
        headerType: 'NONE', headerText: '', bodyText: '', footerText: '', buttons: [], submitToMeta: true,
    });

    // ── API Calls ─────────────────────────────────────────────────────────────
    const fetchTemplates = useCallback(async () => {
        // Super admin cannot access tenant-scoped templates
        if (isSuperAdmin) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            setApiError('');
            const [tRes, sRes] = await Promise.all([
                axios.get(`${API_BASE}/templates?limit=50`, { headers: getAuthHeaders() }),
                axios.get(`${API_BASE}/templates/statistics`, { headers: getAuthHeaders() }),
            ]);
            setTemplates(tRes.data.data || []);
            setStats(sRes.data);
        } catch (err: any) {
            const status = err?.response?.status;
            if (status === 401 || status === 403) {
                setApiError('access_denied');
            } else {
                setApiError(err?.response?.data?.message || 'Failed to load templates');
            }
            setTemplates([]);
        } finally {
            setLoading(false);
        }
    }, [isSuperAdmin]);

    useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

    // Auto-poll pending templates every 30s
    useEffect(() => {
        const hasLive = templates.some(t => ['pending', 'PENDING'].includes(t.status) && t.metaTemplateId);
        if (!hasLive) return;
        const timer = setInterval(fetchTemplates, 30000);
        return () => clearInterval(timer);
    }, [templates, fetchTemplates]);

    // ── Media Upload ──────────────────────────────────────────────────────────
    const handleMediaFile = async (file: File) => {
        if (!file) return;
        setUploadingMedia(true);
        setUploadProgress(0);
        const fd = new FormData();
        fd.append('file', file);
        try {
            const res = await axios.post(`${API_BASE}/templates/upload-media`, fd, {
                headers: { ...getAuthHeaders() },
                onUploadProgress: (e) => {
                    if (e.total) setUploadProgress(Math.round((e.loaded / e.total) * 100));
                },
            });
            setMediaUpload(res.data);
            setForm(f => ({ ...f, headerType: res.data.headerType }));
            toast.success(`${res.data.headerType.toLowerCase()} uploaded ✓`);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Upload failed');
        } finally {
            setUploadingMedia(false);
        }
    };

    const handleCreate = async () => {
        if (!form.name.trim()) return toast.error('Template name is required');
        if (!form.bodyText.trim()) return toast.error('Message body is required');
        if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(form.headerType) && !mediaUpload)
            return toast.error(`Please upload a ${form.headerType.toLowerCase()} for the header`);

        for (const btn of form.buttons) {
            if (!btn.text.trim()) return toast.error('All buttons must have a label');
            if (btn.type === 'URL' && !btn.url?.trim()) return toast.error(`Button "${btn.text || 'URL button'}" needs a URL`);
            if (btn.type === 'PHONE_NUMBER' && !btn.phone_number?.trim()) return toast.error(`Button "${btn.text || 'Phone button'}" needs a phone number`);
        }

        try {
            setCreating(true);
            const payload: any = {
                name: sanitizeTemplateName(form.name),
                description: form.description || undefined,
                category: form.category,
                language: form.language,
                headerType: form.headerType !== 'NONE' ? form.headerType : undefined,
                headerText: form.headerType === 'TEXT' ? (form.headerText || undefined) : undefined,
                headerMediaHandle: mediaUpload?.handle,
                headerMediaUrl: mediaUpload ? `${BACKEND_BASE}${mediaUpload.previewUrl}` : undefined,
                headerMediaFilename: mediaUpload?.filename,
                headerMediaMimeType: mediaUpload?.mimeType,
                bodyText: form.bodyText,
                footerText: form.footerText || undefined,
                buttons: form.buttons.length ? form.buttons : undefined,
                submitToMeta: form.submitToMeta,
            };
            const res = await axios.post(`${API_BASE}/templates`, payload, { headers: getAuthHeaders() });
            setTemplates(ts => [res.data, ...ts]);
            setShowCreate(false);
            resetForm();
            toast.success(form.submitToMeta ? '🎉 Template submitted to Meta for approval!' : 'Template saved as draft', { duration: 4000 });
        } catch (err: any) {
            const msg = err?.response?.data?.message || err.message || 'Failed to create template';
            toast.error(typeof msg === 'string' ? msg : JSON.stringify(msg));
        } finally {
            setCreating(false);
        }
    };

    const handleSync = async (id: string) => {
        try {
            const res = await axios.get(`${API_BASE}/templates/${id}/sync-status`, { headers: getAuthHeaders() });
            const updated: Template = res.data;
            setTemplates(ts => ts.map(t => t.id === id ? updated : t));
            if (updated.status === 'approved') toast.success('✅ Template approved by Meta!');
            else if (updated.status === 'rejected') toast.error(`❌ Rejected: ${updated.rejectionReason}`);
            else toast('⏳ Still pending review', { icon: '🔄' });
        } catch {
            toast.error('Could not sync from Meta');
        }
    };

    const handleSubmitDraft = async (id: string) => {
        try {
            const res = await axios.post(`${API_BASE}/templates/${id}/submit`, {}, { headers: getAuthHeaders() });
            setTemplates(ts => ts.map(t => t.id === id ? res.data : t));
            toast.success('Template submitted to Meta for approval!');
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Submit failed');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this template?')) return;
        try {
            await axios.delete(`${API_BASE}/templates/${id}`, { headers: getAuthHeaders() });
            setTemplates(ts => ts.filter(t => t.id !== id));
            if (preview?.id === id) setPreview(null);
            toast.success('Template deleted');
        } catch {
            toast.error('Could not delete template');
        }
    };

    const resetForm = () => {
        setForm({ name: '', description: '', category: 'MARKETING', language: 'en', headerType: 'NONE', headerText: '', bodyText: '', footerText: '', buttons: [], submitToMeta: true });
        setMediaUpload(null);
        setUploadProgress(0);
    };

    const addButton = (type: ButtonType) => {
        if (form.buttons.length >= 3) return toast.error('Maximum 3 buttons per template (Meta limit)');
        setForm(f => ({ ...f, buttons: [...f.buttons, { type, text: '', trackClicks: false }] }));
    };

    const updateButton = (i: number, btn: TemplateButton) => setForm(f => ({ ...f, buttons: f.buttons.map((b, idx) => idx === i ? btn : b) }));
    const removeButton = (i: number) => setForm(f => ({ ...f, buttons: f.buttons.filter((_, idx) => idx !== i) }));

    // ── Filtering ─────────────────────────────────────────────────────────────
    const filtered = templates.filter(t => {
        const matchS = t.name.toLowerCase().includes(search.toLowerCase()) || (t.bodyText || '').toLowerCase().includes(search.toLowerCase());
        const matchSt = statusFilter === 'all' || t.status === statusFilter;
        const matchC = catFilter === 'all' || t.category === catFilter;
        return matchS && matchSt && matchC;
    });

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <DashboardLayout>
            <Toaster position="top-right" />
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <FileText className="w-7 h-7 text-blue-600" /> Templates
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-0.5">Create and manage WhatsApp message templates</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={fetchTemplates} className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-blue-600 hover:border-blue-300 transition-all" title="Refresh">
                            <RefreshCw className="w-4 h-4" />
                        </button>
                        {!isSuperAdmin && (
                            <button onClick={() => setShowCreate(true)}
                                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg text-sm">
                                <Plus className="w-4 h-4" /> New Template
                            </button>
                        )}
                    </div>
                </div>
                {/* Super Admin Info Banner */}
                {isSuperAdmin && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-5 flex items-start gap-4">
                        <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
                            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-amber-800 dark:text-amber-300 text-sm">Super Admin View — Template Access Restricted</h3>
                            <p className="text-amber-700 dark:text-amber-400 text-sm mt-1">
                                Templates are managed per-tenant and require a Tenant Admin account. As Super Admin, you can:
                            </p>
                            <ul className="mt-2 space-y-1 text-sm text-amber-700 dark:text-amber-400">
                                <li>• View all tenant templates from <strong>Admin → Templates</strong></li>
                                <li>• Log in as a Tenant Admin to create, edit, or submit templates for that tenant</li>
                                <li>• Templates require a Tenant context for WhatsApp Business API submission</li>
                            </ul>
                        </div>
                    </motion.div>
                )}

                {/* API Error Banner */}
                {apiError && apiError !== 'access_denied' && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3">
                        <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                        <p className="text-red-700 dark:text-red-400 text-sm">{apiError}</p>
                    </div>
                )}
                {apiError === 'access_denied' && !isSuperAdmin && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3">
                        <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                        <p className="text-red-700 dark:text-red-400 text-sm">Access denied. Your account may not have permission to manage templates, or your session may have expired. Please log out and back in.</p>
                    </div>
                )}


                <div className="grid grid-cols-5 gap-3">
                    {[
                        { label: 'Total', val: stats.totalTemplates, c: 'text-gray-900 dark:text-white' },
                        { label: 'Approved', val: stats.approvedTemplates, c: 'text-green-600' },
                        { label: 'Pending', val: stats.pendingTemplates, c: 'text-amber-600' },
                        { label: 'Rejected', val: stats.rejectedTemplates, c: 'text-red-500' },
                        { label: 'Drafts', val: stats.draftTemplates, c: 'text-gray-500' },
                    ].map((s, i) => (
                        <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                            className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
                            <div className={`text-2xl font-bold ${s.c}`}>{s.val}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</div>
                        </motion.div>
                    ))}
                </div>

                {/* Filters */}
                <div className="flex gap-3 flex-wrap">
                    <div className="relative flex-1 min-w-48">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search templates..."
                            className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                        className="px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="all">All Status</option>
                        <option value="approved">Approved</option>
                        <option value="pending">Pending</option>
                        <option value="rejected">Rejected</option>
                        <option value="draft">Draft</option>
                    </select>
                    <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
                        className="px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="all">All Categories</option>
                        <option value="MARKETING">Marketing</option>
                        <option value="UTILITY">Utility</option>
                        <option value="AUTHENTICATION">Authentication</option>
                    </select>
                </div>

                {/* Template Table */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {loading ? (
                        <div className="py-20 text-center">
                            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
                            <p className="text-sm text-gray-400">Loading templates...</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="py-16 text-center">
                            <FileText className="w-12 h-12 text-gray-200 dark:text-gray-600 mx-auto mb-3" />
                            <p className="text-gray-500 dark:text-gray-400">No templates yet</p>
                            <button onClick={() => setShowCreate(true)}
                                className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1.5 mx-auto">
                                <Plus className="w-4 h-4" /> Create your first template
                            </button>
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                                <tr>
                                    {['Template', 'Category', 'Status / Meta', 'Buttons', 'Created', 'Actions'].map(h => (
                                        <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                <AnimatePresence>
                                    {filtered.map((t, i) => (
                                        <motion.tr key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ delay: i * 0.03 }}
                                            className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                                            <td className="px-5 py-4">
                                                <div className="font-medium text-gray-900 dark:text-white">{t.name}</div>
                                                <div className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{(t.bodyText || '').substring(0, 55)}…</div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${CAT_COLORS[t.category] || ''}`}>{t.category}</span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <ApprovalBadge template={t} onSync={handleSync} />
                                                {t.rejectionReason && (
                                                    <p className="text-xs text-red-500 mt-1 max-w-[160px] truncate" title={t.rejectionReason}>{t.rejectionReason}</p>
                                                )}
                                            </td>
                                            <td className="px-5 py-4">
                                                {t.buttons && t.buttons.length > 0 ? (
                                                    <div className="flex flex-col gap-1">
                                                        {t.buttons.slice(0, 2).map((b, bi) => {
                                                            const Ic = BUTTON_TYPE_INFO[b.type]?.icon || MessageSquare;
                                                            return (
                                                                <span key={bi} className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                                                    <Ic className="w-3 h-3 text-blue-500" /> {b.text}
                                                                </span>
                                                            );
                                                        })}
                                                        {t.buttons.length > 2 && <span className="text-xs text-gray-400">+{t.buttons.length - 2} more</span>}
                                                    </div>
                                                ) : <span className="text-xs text-gray-400">—</span>}
                                            </td>
                                            <td className="px-5 py-4 text-xs text-gray-400">{new Date(t.createdAt).toLocaleDateString()}</td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => setPreview(t)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" title="Preview"><Eye className="w-4 h-4" /></button>
                                                    {t.status === 'draft' && (
                                                        <button onClick={() => handleSubmitDraft(t.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors" title="Submit to Meta"><Send className="w-4 h-4" /></button>
                                                    )}
                                                    {['draft', 'rejected'].includes(t.status) && (
                                                        <button onClick={() => handleDelete(t.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                                                    )}
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* ── Preview Modal ─────────────────────────────────────────────── */}
            <AnimatePresence>
                {preview && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setPreview(null)}>
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
                                <h3 className="font-bold text-gray-900 dark:text-white">{preview.name}</h3>
                                <button onClick={() => setPreview(null)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="p-5 space-y-4">
                                <div className="flex gap-2 flex-wrap">
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${CAT_COLORS[preview.category] || ''}`}>{preview.category}</span>
                                    <ApprovalBadge template={preview} onSync={handleSync} />
                                    <span className="px-2.5 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{LANG_LABELS[preview.language] || preview.language}</span>
                                </div>

                                {preview.rejectionReason && (
                                    <div className="flex gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
                                        <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                                        <p className="text-xs text-red-600 dark:text-red-400">{preview.rejectionReason}</p>
                                    </div>
                                )}

                                {/* WhatsApp bubble */}
                                <div className="bg-[#ECE5DD] dark:bg-[#1a2026] rounded-xl p-4">
                                    <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-tl-none shadow-sm max-w-sm overflow-hidden">
                                        {/* Media header */}
                                        {preview.headerType === 'IMAGE' && preview.headerMediaUrl && (
                                            <img src={preview.headerMediaUrl} alt="header" className="w-full h-36 object-cover" />
                                        )}
                                        {preview.headerType === 'VIDEO' && preview.headerMediaUrl && (
                                            <div className="w-full h-24 bg-black flex items-center justify-center gap-2">
                                                <Film className="w-8 h-8 text-white/60" />
                                                <span className="text-white text-xs">{preview.headerMediaFilename}</span>
                                            </div>
                                        )}
                                        {preview.headerType === 'DOCUMENT' && preview.headerMediaUrl && (
                                            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 flex items-center gap-2 border-b border-gray-100 dark:border-gray-600">
                                                <FileArchive className="w-5 h-5 text-amber-500 flex-shrink-0" />
                                                <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{preview.headerMediaFilename}</span>
                                            </div>
                                        )}
                                        <div className="p-4 space-y-1">
                                            {preview.headerType === 'TEXT' && preview.headerText && <p className="font-bold text-gray-900 dark:text-white">{preview.headerText}</p>}
                                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{preview.bodyText}</p>
                                            {preview.footerText && <p className="text-xs text-gray-400 border-t border-gray-100 dark:border-gray-700 pt-1 mt-1">{preview.footerText}</p>}
                                        </div>
                                    </div>
                                    {preview.buttons && preview.buttons.length > 0 && (
                                        <div className="mt-2 space-y-1.5 max-w-sm">
                                            {preview.buttons.map((btn, i) => {
                                                const BIc = BUTTON_TYPE_INFO[btn.type]?.icon || MessageSquare;
                                                return (
                                                    <div key={i} className="bg-white dark:bg-gray-800 rounded-full py-2 px-4 flex items-center justify-center gap-2 shadow-sm">
                                                        <BIc className="w-3.5 h-3.5 text-blue-600" />
                                                        <span className="text-sm text-blue-600 font-medium">{btn.text}</span>
                                                        {btn.type === 'URL' && btn.trackClicks && (
                                                            <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-medium">TRACKED</span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Meta info */}
                                {preview.metaTemplateId && (
                                    <div className="text-xs text-gray-400 flex items-center gap-2 pt-1">
                                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                                        Meta ID: <span className="font-mono">{preview.metaTemplateId}</span>
                                        {preview.submittedAt && <span>· Submitted {new Date(preview.submittedAt).toLocaleDateString()}</span>}
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-3 px-5 py-4 border-t border-gray-200 dark:border-gray-700">
                                {preview.status === 'draft' && (
                                    <button onClick={() => { handleSubmitDraft(preview.id); setPreview(null); }}
                                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl text-sm font-medium hover:from-green-700 hover:to-emerald-700">
                                        <Send className="w-4 h-4" /> Submit to Meta
                                    </button>
                                )}
                                {preview.status === 'approved' && (
                                    <button className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl text-sm font-medium">
                                        <Send className="w-4 h-4" /> Use in Campaign
                                    </button>
                                )}
                                <button onClick={() => setPreview(null)} className="px-5 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Close</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Create Template Drawer ────────────────────────────────────── */}
            <AnimatePresence>
                {showCreate && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-end"
                        onClick={() => setShowCreate(false)}>
                        <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                            className="bg-white dark:bg-gray-800 h-full w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden"
                            onClick={e => e.stopPropagation()}>

                            {/* Drawer Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-600 to-purple-600">
                                <div>
                                    <h2 className="text-lg font-bold text-white">Create New Template</h2>
                                    <p className="text-blue-100 text-xs mt-0.5">Build and submit to Meta for WhatsApp approval</p>
                                </div>
                                <button onClick={() => setShowCreate(false)} className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors"><X className="w-5 h-5" /></button>
                            </div>

                            {/* Scrollable Body */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">

                                {/* ── Section 1: Info ── */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2">
                                        <Tag className="w-4 h-4 text-blue-600" /> Template Info
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Template Name <span className="text-red-400">*</span></label>
                                            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                                placeholder="e.g. welcome_message"
                                                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 dark:text-white" />
                                            {form.name && (
                                                <p className="text-xs text-gray-400 mt-1">Meta name: <span className="font-mono text-blue-600">{sanitizeTemplateName(form.name)}</span></p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Category</label>
                                            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as any }))}
                                                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 dark:text-white">
                                                <option value="MARKETING">Marketing</option>
                                                <option value="UTILITY">Utility</option>
                                                <option value="AUTHENTICATION">Authentication</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Language</label>
                                            <select value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value as any }))}
                                                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 dark:text-white">
                                                <option value="en">English</option>
                                                <option value="en_US">English (US)</option>
                                                <option value="hi">Hindi</option>
                                                <option value="es">Spanish</option>
                                                <option value="pt_BR">Portuguese (BR)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* ── Section 2: Content ── */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2">
                                        <MessageSquare className="w-4 h-4 text-blue-600" /> Message Content
                                    </h3>

                                    {/* ── Header Type Selector ── */}
                                    <div className="space-y-3">
                                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400">Header Type <span className="text-gray-400 font-normal">(optional)</span></label>
                                        <div className="grid grid-cols-5 gap-2">
                                            {(['NONE', 'TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT'] as HeaderType[]).map(ht => {
                                                const hi = HEADER_TYPE_INFO[ht];
                                                const HI = hi.icon;
                                                return (
                                                    <button key={ht} type="button"
                                                        onClick={() => { setForm(f => ({ ...f, headerType: ht })); if (ht !== 'TEXT') setForm(f => ({ ...f, headerText: '', headerType: ht })); if (ht === 'NONE' || ht === 'TEXT') { setMediaUpload(null); } }}
                                                        className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all ${form.headerType === ht
                                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                                                            }`}>
                                                        <div className={`w-7 h-7 rounded-lg ${hi.color} flex items-center justify-center`}>
                                                            <HI className="w-4 h-4 text-white" />
                                                        </div>
                                                        <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-400">{hi.label}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {form.headerType !== 'NONE' && (
                                            <p className="text-xs text-gray-400">{HEADER_TYPE_INFO[form.headerType].hint}</p>
                                        )}
                                    </div>

                                    {/* Text header input */}
                                    {form.headerType === 'TEXT' && (
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Header Text</label>
                                            <input value={form.headerText} onChange={e => setForm(f => ({ ...f, headerText: e.target.value }))} placeholder="e.g. 🎉 Welcome!" maxLength={60}
                                                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 dark:text-white" />
                                        </div>
                                    )}

                                    {/* Media upload zone */}
                                    {['IMAGE', 'VIDEO', 'DOCUMENT'].includes(form.headerType) && (
                                        <div
                                            className={`relative border-2 border-dashed rounded-xl p-6 transition-all text-center cursor-pointer ${dragOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-600 hover:border-blue-400'
                                                }`}
                                            onClick={() => fileInputRef.current?.click()}
                                            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                                            onDragLeave={() => setDragOver(false)}
                                            onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleMediaFile(f); }}
                                        >
                                            <input ref={fileInputRef} type="file" className="hidden"
                                                accept={MEDIA_ACCEPT[form.headerType]}
                                                onChange={e => { const f = e.target.files?.[0]; if (f) handleMediaFile(f); }} />

                                            {uploadingMedia ? (
                                                <div className="space-y-3">
                                                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
                                                    <p className="text-sm text-blue-600 font-medium">Uploading to Meta… {uploadProgress}%</p>
                                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                                        <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                                                    </div>
                                                </div>
                                            ) : mediaUpload ? (
                                                <div className="space-y-2">
                                                    {form.headerType === 'IMAGE'
                                                        ? <img src={`${BACKEND_BASE}${mediaUpload.previewUrl}`} alt="preview" className="w-full h-28 object-cover rounded-lg" />
                                                        : <div className="w-12 h-12 rounded-xl mx-auto bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                                            {form.headerType === 'VIDEO' ? <Film className="w-6 h-6 text-red-500" /> : <FileArchive className="w-6 h-6 text-amber-500" />}
                                                        </div>
                                                    }
                                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{mediaUpload.filename}</p>
                                                    <p className="text-xs text-gray-400">{formatBytes(mediaUpload.size)}</p>
                                                    <button type="button" onClick={e => { e.stopPropagation(); setMediaUpload(null); setUploadProgress(0); }}
                                                        className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1 mx-auto">
                                                        <X className="w-3 h-3" /> Remove
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    <UploadCloud className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto" />
                                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                                        Drag & drop or <span className="text-blue-600">browse</span>
                                                    </p>
                                                    <p className="text-xs text-gray-400">{HEADER_TYPE_INFO[form.headerType].hint}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {/* Body */}
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Message Body <span className="text-red-400">*</span></label>
                                        <textarea value={form.bodyText} onChange={e => setForm(f => ({ ...f, bodyText: e.target.value }))}
                                            rows={5} placeholder="Hi {{1}}, your order {{2}} has been placed! Total: {{3}}"
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 dark:text-white resize-none" />
                                        <p className="text-xs text-gray-400 mt-1">Use <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{'{{1}}'}</code> for variable placeholders</p>
                                    </div>
                                    {/* Footer */}
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Footer <span className="text-gray-400 font-normal">(optional)</span></label>
                                        <input value={form.footerText} onChange={e => setForm(f => ({ ...f, footerText: e.target.value }))} placeholder="Reply STOP to opt out" maxLength={60}
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 dark:text-white" />
                                    </div>
                                </div>

                                {/* ── Section 3: CTA Buttons ── */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2">
                                            <Zap className="w-4 h-4 text-blue-600" /> Call-to-Action Buttons
                                            <span className="text-xs font-normal text-gray-400">({form.buttons.length}/3)</span>
                                        </h3>
                                    </div>

                                    {/* Add button type selectors */}
                                    {form.buttons.length < 3 && (
                                        <div className="grid grid-cols-3 gap-2">
                                            {(Object.entries(BUTTON_TYPE_INFO) as [ButtonType, typeof BUTTON_TYPE_INFO[ButtonType]][]).map(([type, info]) => {
                                                const Icon = info.icon;
                                                return (
                                                    <button key={type} onClick={() => addButton(type)}
                                                        className="flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-600 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all group">
                                                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${info.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                                            <Icon className="w-4 h-4 text-white" />
                                                        </div>
                                                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">{info.label}</span>
                                                        <span className="text-[10px] text-gray-400 text-center leading-tight">{info.desc}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Button editors */}
                                    <AnimatePresence>
                                        {form.buttons.map((btn, i) => (
                                            <ButtonRow key={i} btn={btn} index={i} onChange={b => updateButton(i, b)} onRemove={() => removeButton(i)} />
                                        ))}
                                    </AnimatePresence>

                                    {form.buttons.length === 3 && (
                                        <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                                            <Info className="w-3.5 h-3.5" /> Maximum 3 buttons allowed by Meta's policy
                                        </p>
                                    )}
                                </div>

                                {/* ── Live Preview ── */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Preview</h3>
                                    <WhatsAppPreview form={form} mediaUpload={mediaUpload} />
                                </div>

                                {/* ── Submission Option ── */}
                                <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                                    <label className="flex items-start gap-3 cursor-pointer">
                                        <button type="button" onClick={() => setForm(f => ({ ...f, submitToMeta: !f.submitToMeta }))}
                                            className={`mt-0.5 flex-shrink-0 relative w-11 h-6 rounded-full transition-colors ${form.submitToMeta ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'}`}>
                                            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.submitToMeta ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                                                <Zap className="w-4 h-4 text-blue-600" /> Auto-submit to Meta for approval
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                {form.submitToMeta
                                                    ? 'Template will be sent directly to Meta upon creation. Approval usually takes a few minutes to hours.'
                                                    : 'Template will be saved as a draft. You can manually submit later.'}
                                            </p>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* Drawer Footer */}
                            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex gap-3">
                                <button onClick={handleCreate} disabled={creating}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold text-sm hover:from-blue-700 hover:to-purple-700 disabled:opacity-60 transition-all shadow-md">
                                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : form.submitToMeta ? <Send className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                                    {creating ? 'Saving...' : form.submitToMeta ? 'Create & Submit to Meta' : 'Save as Draft'}
                                </button>
                                <button onClick={() => { setShowCreate(false); resetForm(); }}
                                    className="px-6 py-3 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </DashboardLayout>
    );
}
