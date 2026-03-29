'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import apiClient from '@/lib/api-client';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft, ChevronRight, Check, Send, Users, Calendar,
    FileText, Sparkles, MessageSquare, Clock, Phone, X,
    AlertCircle, CheckCircle, Loader2, Tag,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Template {
    id: string;
    name: string;
    category: string;
    language: string;
    status: string;
    bodyText?: string;
    headerText?: string;
    footerText?: string;
    variables?: Record<string, string>;
}

interface Segment {
    id: string;
    name: string;
    description?: string;
    contactCount: number;
    isActive: boolean;
}

interface CreateCampaignDto {
    name: string;
    description?: string;
    templateId: string;
    segmentId?: string;
    scheduledAt?: string;
    variables?: Record<string, string>;
}

const STEPS = [
    { number: 1, title: 'Campaign Details', icon: FileText },
    { number: 2, title: 'Select Template', icon: MessageSquare },
    { number: 3, title: 'Choose Audience', icon: Users },
    { number: 4, title: 'Schedule & Test', icon: Calendar },
    { number: 5, title: 'Review & Launch', icon: Sparkles },
];

export default function CreateCampaignPage() {
    const router = useRouter();
    const { user } = useAuthStore();
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [segments, setSegments] = useState<Segment[]>([]);
    const [loadingTemplates, setLoadingTemplates] = useState(false);
    const [loadingSegments, setLoadingSegments] = useState(false);

    // Campaign form
    const [formData, setFormData] = useState<CreateCampaignDto>({
        name: '',
        description: '',
        templateId: '',
        segmentId: '',
        scheduledAt: '',
        variables: {},
    });

    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [selectedSegment, setSelectedSegment] = useState<Segment | null>(null);
    const [scheduleMode, setScheduleMode] = useState<'now' | 'later'>('now');

    // Test message
    const [testPhone, setTestPhone] = useState('');
    const [testSending, setTestSending] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

    useEffect(() => {
        if (!user) { router.push('/login'); return; }
        loadTemplates();
        loadSegments();
    }, [user]);

    const loadTemplates = async () => {
        setLoadingTemplates(true);
        try {
            const res = await apiClient.get('/templates?status=approved&limit=50');
            // Handles both array and paginated response
            const data = Array.isArray(res.data) ? res.data : (res.data.data || []);
            setTemplates(data.filter((t: Template) => t.status === 'approved'));
        } catch (err: any) {
            if (err?.response?.status !== 404) toast.error('Could not load templates');
        } finally {
            setLoadingTemplates(false);
        }
    };

    const loadSegments = async () => {
        setLoadingSegments(true);
        try {
            const res = await apiClient.get('/segments?activeOnly=true&limit=50');
            setSegments(res.data.data || []);
        } catch (err: any) {
            if (err?.response?.status !== 404) toast.error('Could not load segments');
        } finally {
            setLoadingSegments(false);
        }
    };

    const handleNext = () => {
        if (step === 1 && !formData.name.trim()) { toast.error('Campaign name is required'); return; }
        if (step === 2 && !formData.templateId) { toast.error('Please select a message template'); return; }
        if (step === 3 && !formData.segmentId) { toast.error('Please select an audience segment'); return; }
        setStep(s => s + 1);
    };

    const handleBack = () => setStep(s => s - 1);

    const handleTemplateSelect = (t: Template) => {
        setFormData(f => ({ ...f, templateId: t.id }));
        setSelectedTemplate(t);
    };

    const handleSegmentSelect = (s: Segment) => {
        setFormData(f => ({ ...f, segmentId: s.id }));
        setSelectedSegment(s);
    };

    const handleScheduleChange = (mode: 'now' | 'later') => {
        setScheduleMode(mode);
        if (mode === 'now') setFormData(f => ({ ...f, scheduledAt: '' }));
    };

    const handleTestSend = async () => {
        if (!testPhone.trim()) { toast.error('Enter a phone number for test'); return; }
        setTestSending(true);
        setTestResult(null);
        try {
            // We'll create a draft campaign first, then test it
            const payload = {
                ...formData,
                name: formData.name || 'Test Campaign Draft',
                scheduledAt: undefined,
                status: 'draft',
            };
            const createRes = await apiClient.post('/campaigns', payload);
            const campaignId = createRes.data.id;
            await apiClient.post(`/campaigns/${campaignId}/test`, { phoneNumbers: [testPhone.trim()] });
            setTestResult({ success: true, message: `Test message sent to ${testPhone}` });
        } catch (err: any) {
            setTestResult({ success: false, message: err?.response?.data?.message || 'Test failed' });
        } finally {
            setTestSending(false);
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const payload = {
                ...formData,
                scheduledAt: scheduleMode === 'now' ? undefined : formData.scheduledAt || undefined,
            };
            const res = await apiClient.post('/campaigns', payload);
            toast.success('Campaign created successfully!');
            router.push('/dashboard/campaigns');
        } catch (err: any) {
            console.error('Campaign creation failed:', err);
            const msg = err?.response?.data?.message;
            toast.error(Array.isArray(msg) ? msg.join(', ') : msg || 'Failed to create campaign');
            setIsSubmitting(false);
        }
    };

    const templatePreview = (t: Template) => {
        const parts = [t.headerText, t.bodyText, t.footerText].filter(Boolean);
        return parts.join('\n\n') || '(No preview available)';
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Top header */}
            <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 sticky top-0 z-10">
                <div className="max-w-5xl mx-auto flex items-center gap-4">
                    <button onClick={() => router.push('/dashboard/campaigns')}
                        className="flex items-center gap-1.5 text-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors">
                        <ChevronLeft className="w-5 h-5" />
                        <span className="text-sm">Back</span>
                    </button>
                    <div className="h-5 w-px bg-gray-300 dark:bg-gray-600" />
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">Create Campaign</h1>
                </div>
            </header>

            {/* Progress bar */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-5">
                <div className="max-w-5xl mx-auto">
                    <div className="flex gap-2">
                        {STEPS.map((s, i) => {
                            const Icon = s.icon;
                            const done = step > s.number;
                            const active = step === s.number;
                            return (
                                <div key={s.number} className="flex items-center flex-1">
                                    <div className="flex flex-col items-center">
                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${done ? 'bg-green-500 text-white' : active ? 'bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-900' : 'bg-gray-200 dark:bg-gray-700 text-gray-400'}`}>
                                            {done ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                                        </div>
                                        <span className={`mt-1.5 text-xs font-medium hidden sm:block ${active ? 'text-blue-600' : done ? 'text-green-600' : 'text-gray-400'}`}>{s.title}</span>
                                    </div>
                                    {i < STEPS.length - 1 && (
                                        <div className={`flex-1 h-0.5 mx-2 transition-all ${done ? 'bg-green-400' : 'bg-gray-200 dark:bg-gray-700'}`} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Content */}
            <main className="max-w-5xl mx-auto px-6 py-8">
                <AnimatePresence mode="wait">
                    {/* STEP 1 — Campaign Details */}
                    {step === 1 && (
                        <motion.div key="s1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                                <FileText className="w-6 h-6 text-blue-600" />
                                Campaign Details
                            </h2>
                            <div className="space-y-5 max-w-xl">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Campaign Name *</label>
                                    <input type="text" value={formData.name}
                                        onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                                        placeholder="e.g., Diwali Flash Sale 2024"
                                        className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description (Optional)</label>
                                    <textarea value={formData.description}
                                        onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                                        placeholder="Brief description of the campaign goal..."
                                        rows={4}
                                        className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                                    />
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 2 — Select Template */}
                    {step === 2 && (
                        <motion.div key="s2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
                                <MessageSquare className="w-6 h-6 text-blue-600" />
                                Select Message Template
                            </h2>
                            <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">Only approved templates are shown</p>

                            {loadingTemplates ? (
                                <div className="flex items-center justify-center py-16">
                                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                                </div>
                            ) : templates.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                                    <MessageSquare className="w-16 h-16 opacity-30 mb-4" />
                                    <p className="font-medium">No approved templates yet</p>
                                    <p className="text-sm mt-1">Create and get a template approved first</p>
                                    <button onClick={() => router.push('/dashboard/templates/create')}
                                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                                        Create Template
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4">
                                    {templates.map(t => (
                                        <button key={t.id} onClick={() => handleTemplateSelect(t)}
                                            className={`text-left p-5 rounded-xl border-2 transition-all ${formData.templateId === t.id ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'}`}>
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <h3 className="font-bold text-gray-900 dark:text-white">{t.name}</h3>
                                                    <div className="flex gap-2 mt-1">
                                                        <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 text-xs rounded-full">{t.category}</span>
                                                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-full">{t.language}</span>
                                                        <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs rounded-full">✓ Approved</span>
                                                    </div>
                                                </div>
                                                {formData.templateId === t.id && (
                                                    <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                                                        <Check className="w-4 h-4 text-white" />
                                                    </div>
                                                )}
                                            </div>
                                            {t.bodyText && (
                                                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                                                    <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3 whitespace-pre-wrap">{templatePreview(t)}</p>
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* STEP 3 — Choose Audience */}
                    {step === 3 && (
                        <motion.div key="s3" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
                                <Users className="w-6 h-6 text-blue-600" />
                                Choose Audience
                            </h2>
                            <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">Only active segments are shown</p>

                            {loadingSegments ? (
                                <div className="flex items-center justify-center py-16">
                                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                                </div>
                            ) : segments.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                                    <Users className="w-16 h-16 opacity-30 mb-4" />
                                    <p className="font-medium">No active segments</p>
                                    <p className="text-sm mt-1">Import contacts and create a segment first</p>
                                    <button onClick={() => router.push('/dashboard/contacts')}
                                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                                        Import Contacts
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {segments.map(s => (
                                        <button key={s.id} onClick={() => handleSegmentSelect(s)}
                                            className={`text-left p-5 rounded-xl border-2 transition-all ${formData.segmentId === s.id ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'}`}>
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <h3 className="font-bold text-gray-900 dark:text-white">{s.name}</h3>
                                                    {s.description && <p className="text-xs text-gray-500 mt-0.5">{s.description}</p>}
                                                    <div className="mt-2 flex items-center gap-1.5 text-blue-600">
                                                        <Users className="w-4 h-4" />
                                                        <span className="text-sm font-semibold">{s.contactCount.toLocaleString()} contacts</span>
                                                    </div>
                                                </div>
                                                {formData.segmentId === s.id && (
                                                    <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center">
                                                        <Check className="w-4 h-4 text-white" />
                                                    </div>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* STEP 4 — Schedule & Test */}
                    {step === 4 && (
                        <motion.div key="s4" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
                            className="space-y-6">
                            {/* Schedule card */}
                            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                                    <Clock className="w-6 h-6 text-blue-600" />
                                    Schedule Campaign
                                </h2>
                                <div className="space-y-4">
                                    <label className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${scheduleMode === 'now' ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                                        <input type="radio" checked={scheduleMode === 'now'} onChange={() => handleScheduleChange('now')} className="accent-blue-600" />
                                        <div>
                                            <p className="font-semibold text-gray-900 dark:text-white">Send Immediately</p>
                                            <p className="text-sm text-gray-500">Campaign starts right after creation</p>
                                        </div>
                                    </label>
                                    <label className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${scheduleMode === 'later' ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                                        <input type="radio" checked={scheduleMode === 'later'} onChange={() => handleScheduleChange('later')} className="accent-blue-600" />
                                        <div className="flex-1">
                                            <p className="font-semibold text-gray-900 dark:text-white">Schedule for Later</p>
                                            <p className="text-sm text-gray-500">Pick a date and time</p>
                                        </div>
                                    </label>
                                    {scheduleMode === 'later' && (
                                        <div className="ml-8">
                                            <input type="datetime-local"
                                                min={new Date().toISOString().slice(0, 16)}
                                                value={formData.scheduledAt ? new Date(formData.scheduledAt).toISOString().slice(0, 16) : ''}
                                                onChange={e => setFormData(f => ({ ...f, scheduledAt: e.target.value ? new Date(e.target.value).toISOString() : '' }))}
                                                className="px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Test message card */}
                            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
                                    <Phone className="w-6 h-6 text-green-600" />
                                    Test on Your Number
                                </h2>
                                <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">Send a test message before going live — verify it looks right</p>

                                {!formData.templateId ? (
                                    <p className="text-amber-600 text-sm">ℹ️ Go back and select a template first to enable testing</p>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex gap-3">
                                            <input type="tel" value={testPhone}
                                                onChange={e => setTestPhone(e.target.value)}
                                                placeholder="+919876543210"
                                                className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none font-mono"
                                            />
                                            <button onClick={handleTestSend} disabled={!testPhone.trim() || testSending || !formData.name.trim()}
                                                className="flex items-center gap-2 px-5 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 transition-all">
                                                {testSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                                {testSending ? 'Sending...' : 'Send Test'}
                                            </button>
                                        </div>
                                        {testResult && (
                                            <div className={`flex items-center gap-3 p-3 rounded-xl text-sm ${testResult.success ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'}`}>
                                                {testResult.success ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                                                {testResult.message}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 5 — Review & Launch */}
                    {step === 5 && (
                        <motion.div key="s5" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                                <Sparkles className="w-6 h-6 text-purple-600" />
                                Review & Launch
                            </h2>
                            <div className="space-y-0 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                                {[
                                    { label: 'Campaign Name', value: formData.name },
                                    { label: 'Description', value: formData.description || '—' },
                                    { label: 'Template', value: selectedTemplate?.name || '—' },
                                    { label: 'Category', value: selectedTemplate?.category || '—' },
                                    { label: 'Audience', value: selectedSegment ? `${selectedSegment.name} (${selectedSegment.contactCount.toLocaleString()} contacts)` : '—' },
                                    { label: 'Schedule', value: scheduleMode === 'now' ? 'Send Immediately' : formData.scheduledAt ? new Date(formData.scheduledAt).toLocaleString('en-IN') : 'Not set' },
                                ].map(({ label, value }, i) => (
                                    <div key={label} className={`flex py-4 px-6 ${i % 2 === 0 ? 'bg-gray-50 dark:bg-gray-900/30' : ''}`}>
                                        <span className="text-gray-500 dark:text-gray-400 w-40 flex-shrink-0 text-sm">{label}</span>
                                        <span className="text-gray-900 dark:text-white font-medium text-sm">{value}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Template preview */}
                            {selectedTemplate && (
                                <div className="mt-6">
                                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Message Preview</p>
                                    <div className="bg-gray-100 dark:bg-gray-700 rounded-xl p-5 border border-gray-200 dark:border-gray-600">
                                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 max-w-sm shadow">
                                            {selectedTemplate.headerText && (
                                                <p className="font-semibold text-gray-900 dark:text-white mb-2 text-sm">{selectedTemplate.headerText}</p>
                                            )}
                                            <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap">{selectedTemplate.bodyText || '(body text)'}</p>
                                            {selectedTemplate.footerText && (
                                                <p className="text-gray-400 text-xs mt-2">{selectedTemplate.footerText}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Warning if not tested */}
                            {!testResult?.success && (
                                <div className="mt-5 flex items-center gap-2 text-amber-600 text-sm">
                                    <AlertCircle className="w-4 h-4" />
                                    We recommend testing on a number before launching
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Navigation */}
                <div className="flex items-center justify-between mt-8">
                    <button onClick={handleBack} disabled={step === 1}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-40">
                        <ChevronLeft className="w-5 h-5" />
                        Back
                    </button>

                    {step < 5 ? (
                        <button onClick={handleNext}
                            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium shadow-md hover:shadow-lg hover:scale-[1.02] transition-all">
                            Continue
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    ) : (
                        <button onClick={handleSubmit} disabled={isSubmitting}
                            className="flex items-center gap-2 px-8 py-2.5 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-xl font-medium shadow-md hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-60">
                            {isSubmitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Creating...</> : <><Sparkles className="w-5 h-5" /> Launch Campaign</>}
                        </button>
                    )}
                </div>
            </main>
        </div>
    );
}
