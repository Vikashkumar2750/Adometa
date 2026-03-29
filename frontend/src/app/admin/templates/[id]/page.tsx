'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/api';
import toast, { Toaster } from 'react-hot-toast';
import {
    ArrowLeft, FileText, Edit, Trash2,
    CheckCircle, XCircle, Clock, Send, Image, ExternalLink, Variable,
} from 'lucide-react';
import Link from 'next/link';

interface Template {
    id: string;
    name: string;
    category: string;
    language: string;
    status: string;
    description?: string;
    // body
    bodyText: string;
    variables?: string[];
    // header
    headerType?: 'NONE' | 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
    headerText?: string;
    headerMediaUrl?: string;
    headerMediaFilename?: string;
    headerMediaMimeType?: string;
    // footer
    footerText?: string;
    // buttons
    buttons?: { type: string; text: string; url?: string; phoneNumber?: string }[];
    // meta
    metaTemplateId?: string;
    metaStatus?: string;
    rejectionReason?: string;
    tenantId: string;
    createdAt: string;
    updatedAt: string;
    submittedAt?: string;
    approvedAt?: string;
}

function StatusBadge({ status }: { status: string }) {
    const s = (status || 'DRAFT').toUpperCase();
    const map: Record<string, { color: string; Icon: any }> = {
        DRAFT: { color: 'bg-gray-100 text-gray-700', Icon: Edit },
        PENDING: { color: 'bg-amber-100 text-amber-700', Icon: Clock },
        APPROVED: { color: 'bg-green-100 text-green-700', Icon: CheckCircle },
        REJECTED: { color: 'bg-red-100 text-red-700', Icon: XCircle },
    };
    const { color, Icon } = map[s] || map.DRAFT;
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${color}`}>
            <Icon className="w-3.5 h-3.5" /> {s}
        </span>
    );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
    return (
        <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
            <p className="text-sm text-gray-800 dark:text-gray-200">{value || '—'}</p>
        </div>
    );
}

export default function TemplateDetailPage() {
    const router = useRouter();
    const params = useParams();
    const [template, setTemplate] = useState<Template | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (params.id) fetchTemplate();
    }, [params.id]);

    const fetchTemplate = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/admin/templates/${params.id}`);
            setTemplate(response.data);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to load template');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Delete this template? This cannot be undone.')) return;
        try {
            await api.delete(`/templates/${params.id}`);
            toast.success('Template deleted');
            router.push('/admin/templates');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to delete template');
        }
    };

    const handleSubmit = async () => {
        if (!confirm('Submit this template to Meta for approval?')) return;
        try {
            await api.post(`/templates/${params.id}/submit`, {});
            toast.success('Submitted to Meta for approval!');
            fetchTemplate();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to submit template');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!template) {
        return (
            <div className="flex flex-col items-center justify-center h-screen text-gray-500">
                <FileText className="w-12 h-12 mb-3 opacity-30" />
                <p className="font-semibold">Template not found</p>
                <Link href="/admin/templates" className="mt-4 text-blue-600 hover:underline text-sm flex items-center gap-1">
                    <ArrowLeft className="w-4 h-4" /> Back to Templates
                </Link>
            </div>
        );
    }

    const isImage = template.headerType === 'IMAGE';
    const isVideo = template.headerType === 'VIDEO';
    const isDoc = template.headerType === 'DOCUMENT';
    const hasMedia = (isImage || isVideo || isDoc) && template.headerMediaUrl;

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <Toaster position="top-right" />

            {/* Back */}
            <Link href="/admin/templates"
                className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white mb-6 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to Templates
            </Link>

            {/* Header bar */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                        <FileText className="w-6 h-6 text-blue-600" />
                        {template.name}
                    </h1>
                    <div className="flex items-center gap-3 mt-2">
                        <StatusBadge status={template.status} />
                        <span className="text-xs text-gray-400">Created {new Date(template.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    {template.rejectionReason && (
                        <div className="mt-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-xs text-red-700 dark:text-red-400">
                            <strong>Rejection reason:</strong> {template.rejectionReason}
                        </div>
                    )}
                </div>
                <div className="flex gap-2">
                    {template.status?.toUpperCase() === 'DRAFT' && (
                        <button onClick={handleSubmit}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 transition-colors">
                            <Send className="w-4 h-4" /> Submit to Meta
                        </button>
                    )}
                    <Link href={`/admin/templates/${template.id}/edit`}
                        className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <Edit className="w-4 h-4" /> Edit
                    </Link>
                    <button onClick={handleDelete}
                        className="inline-flex items-center gap-2 px-4 py-2 border border-red-300 dark:border-red-700 text-red-600 text-sm font-semibold rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        <Trash2 className="w-4 h-4" /> Delete
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* LEFT: message content */}
                <div className="lg:col-span-2 space-y-4">

                    {/* Template info */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
                        <h2 className="text-sm font-black text-gray-500 uppercase tracking-wide mb-3">Template Info</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <InfoRow label="Category" value={template.category} />
                            <InfoRow label="Language" value={template.language} />
                            {template.description && <InfoRow label="Description" value={template.description} />}
                        </div>
                    </div>

                    {/* WhatsApp preview card */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
                        <h2 className="text-sm font-black text-gray-500 uppercase tracking-wide mb-4">Message Content</h2>

                        {/* WhatsApp-like preview */}
                        <div className="bg-[#e5ddd5] rounded-xl p-4 max-w-sm mx-auto">
                            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                                {/* Header */}
                                {hasMedia && (
                                    <div className="bg-gray-100 flex items-center justify-center min-h-[140px]">
                                        {isImage && (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={template.headerMediaUrl}
                                                alt="Template header"
                                                className="w-full max-h-48 object-cover"
                                                onError={e => {
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                }}
                                            />
                                        )}
                                        {isVideo && (
                                            <div className="text-center py-6 text-gray-500">
                                                <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-2">▶</div>
                                                <p className="text-xs">Video: {template.headerMediaFilename || 'video.mp4'}</p>
                                            </div>
                                        )}
                                        {isDoc && (
                                            <div className="text-center py-6 text-gray-500">
                                                <FileText className="w-10 h-10 mx-auto mb-1 text-red-500" />
                                                <p className="text-xs">{template.headerMediaFilename || 'document.pdf'}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {template.headerType === 'TEXT' && template.headerText && (
                                    <div className="px-3 pt-3">
                                        <p className="font-bold text-gray-900 text-sm">{template.headerText}</p>
                                    </div>
                                )}

                                {/* Body */}
                                <div className="px-3 py-3">
                                    {template.bodyText ? (
                                        <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{template.bodyText}</p>
                                    ) : (
                                        <p className="text-sm text-gray-400 italic">No body text</p>
                                    )}
                                </div>

                                {/* Footer */}
                                {template.footerText && (
                                    <div className="px-3 pb-2">
                                        <p className="text-xs text-gray-400">{template.footerText}</p>
                                    </div>
                                )}

                                {/* Timestamp */}
                                <div className="px-3 pb-2 text-right">
                                    <span className="text-xs text-gray-400">12:00 ✓✓</span>
                                </div>

                                {/* Buttons */}
                                {template.buttons && template.buttons.length > 0 && (
                                    <div className="border-t border-gray-100">
                                        {template.buttons.map((btn, i) => (
                                            <div key={i} className={`flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold text-[#00a5f4] ${i > 0 ? 'border-t border-gray-100' : ''}`}>
                                                {btn.type === 'URL' && <ExternalLink className="w-3.5 h-3.5" />}
                                                {btn.text}
                                                {btn.url && <span className="text-xs text-gray-400 ml-1 truncate max-w-[100px]">({btn.url})</span>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Media URL if exists */}
                        {hasMedia && (
                            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
                                <div className="flex items-center gap-2">
                                    <Image className="w-4 h-4 text-gray-500" />
                                    <span className="text-xs font-semibold text-gray-500 uppercase">Media URL</span>
                                </div>
                                <p className="text-xs text-blue-600 mt-1 break-all font-mono">{template.headerMediaUrl}</p>
                                {template.headerMediaMimeType && (
                                    <p className="text-xs text-gray-400 mt-0.5">Type: {template.headerMediaMimeType}</p>
                                )}
                            </div>
                        )}

                        {/* Variables */}
                        {template.variables && template.variables.length > 0 && (
                            <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-900/10 rounded-xl border border-purple-200 dark:border-purple-800">
                                <div className="flex items-center gap-2 mb-2">
                                    <Variable className="w-4 h-4 text-purple-600" />
                                    <span className="text-xs font-semibold text-purple-600 uppercase">Template Variables</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {template.variables.map((v, i) => (
                                        <span key={i} className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-mono rounded">
                                            {`{{${v}}}`}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT: sidebar */}
                <div className="space-y-4">
                    {/* Status timeline */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
                        <h2 className="text-sm font-black text-gray-500 uppercase tracking-wide mb-4">Status Timeline</h2>
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="w-7 h-7 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Created</p>
                                    <p className="text-xs text-gray-400">{new Date(template.createdAt).toLocaleString('en-IN')}</p>
                                </div>
                            </div>
                            {template.submittedAt && (
                                <div className="flex items-start gap-3">
                                    <div className="w-7 h-7 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                                        <Send className="w-3.5 h-3.5 text-amber-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Submitted to Meta</p>
                                        <p className="text-xs text-gray-400">{new Date(template.submittedAt).toLocaleString('en-IN')}</p>
                                    </div>
                                </div>
                            )}
                            {template.approvedAt && (
                                <div className="flex items-start gap-3">
                                    <div className="w-7 h-7 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                                        <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Approved</p>
                                        <p className="text-xs text-gray-400">{new Date(template.approvedAt).toLocaleString('en-IN')}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Meta info */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
                        <h2 className="text-sm font-black text-gray-500 uppercase tracking-wide mb-4">Meta Information</h2>
                        <div className="space-y-3">
                            <InfoRow label="Template ID" value={template.id} />
                            {template.metaTemplateId && <InfoRow label="Meta Template ID" value={template.metaTemplateId} />}
                            {template.metaStatus && <InfoRow label="Meta Status" value={template.metaStatus} />}
                            <InfoRow label="Last Updated" value={new Date(template.updatedAt).toLocaleString('en-IN')} />
                            <InfoRow label="Tenant ID" value={template.tenantId} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
