'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { DashboardLayout } from '@/components/dashboard-layout';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft, ChevronRight, Check, Users, Upload, FileText,
    Download, AlertCircle, CheckCircle, Loader2, X, Phone, Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface SegmentContact {
    phone: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    tags?: string[];
}

interface ImportResult {
    added: number;
    duplicates: number;
    total: number;
    duplicatePhones: string[];
}

const STEPS = [
    { n: 1, label: 'Segment Details', icon: FileText },
    { n: 2, label: 'Import Contacts', icon: Upload },
    { n: 3, label: 'Confirm & Create', icon: Sparkles },
];

export default function CreateSegmentPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);

    // Step 1 state — collected locally, NOT yet sent to API
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    // Step 2 state
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [parsedContacts, setParsedContacts] = useState<SegmentContact[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    // Step 3 / submit state
    const [creating, setCreating] = useState(false);
    const [done, setDone] = useState(false);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);

    // ── Step 1 → Step 2 ──────────────────────────────────────────────────────
    const handleNext = () => {
        if (!name.trim()) { toast.error('Segment name is required'); return; }
        setStep(2);
    };

    // ── CSV parsing ──────────────────────────────────────────────────────────
    const parseCSV = (text: string): SegmentContact[] => {
        const lines = text.split('\n').filter(l => l.trim());
        if (lines.length < 2) return [];
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/["'\r]/g, ''));
        return lines.slice(1).map(line => {
            const vals = line.split(',').map(v => v.trim().replace(/["'\r]/g, ''));
            const obj: Record<string, string> = {};
            headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
            const phone = obj['phone'] || obj['mobile'] || obj['phone_number'] || obj['phonenumber'] || obj['number'] || '';
            if (!phone) return null;
            return {
                phone,
                firstName: obj['firstname'] || obj['first_name'] || undefined,
                lastName: obj['lastname'] || obj['last_name'] || undefined,
                email: obj['email'] || undefined,
                tags: obj['tags'] ? obj['tags'].split(';').filter(Boolean) : undefined,
            };
        }).filter(Boolean) as SegmentContact[];
    };

    const handleFileSelect = (f: File) => {
        if (!(f.type === 'text/csv' || f.name.endsWith('.csv'))) {
            toast.error('Please select a .csv file');
            return;
        }
        setCsvFile(f);
        f.text().then(text => {
            const contacts = parseCSV(text);
            setParsedContacts(contacts);
            if (contacts.length > 0) toast.success(`${contacts.length} contacts ready to import`);
        });
    };

    const downloadTemplate = () => {
        const csv = 'phone,firstName,lastName,email,tags\n+919876543210,John,Doe,john@example.com,vip;premium\n+919876543211,Jane,Smith,jane@example.com,regular';
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'contacts_template.csv'; a.click();
        URL.revokeObjectURL(url);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const f = e.dataTransfer.files?.[0];
        if (f) handleFileSelect(f);
    };

    // ── Final submit: Create segment + import ───────────────────────────────
    const handleCreate = async () => {
        setCreating(true);
        try {
            // 1. Create the segment
            const res = await apiClient.post('/segments', {
                name: name.trim(),
                description: description.trim() || undefined,
            });
            const segmentId = res.data.id;

            // 2. Import contacts if any
            if (parsedContacts.length > 0) {
                const importRes = await apiClient.post(`/segments/${segmentId}/import`, {
                    contacts: parsedContacts,
                });
                setImportResult(importRes.data);
                toast.success(`Segment created with ${importRes.data.added} contacts!`);
            } else {
                toast.success('Segment created successfully!');
            }
            setDone(true);
        } catch (err: any) {
            const msg = err?.response?.data?.message;
            toast.error(Array.isArray(msg) ? msg.join(', ') : msg || 'Failed to create segment');
        } finally {
            setCreating(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 md:p-8">
                {/* Back button */}
                <button onClick={() => router.push('/dashboard/contacts')}
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 dark:hover:text-white mb-6 transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                    Back to Contacts
                </button>

                {/* Page title */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create Segment</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Group contacts into segments to target with campaigns</p>
                </div>

                {/* Step indicator */}
                <div className="flex items-center gap-0 mb-10 max-w-lg">
                    {STEPS.map((s, i) => {
                        const Icon = s.icon;
                        const done_ = done ? true : step > s.n;
                        const active = !done && step === s.n;
                        return (
                            <div key={s.n} className="flex items-center flex-1">
                                <div className="flex flex-col items-center">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${done_ ? 'bg-green-500 text-white shadow-green-200 shadow-md' :
                                            active ? 'bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-900' :
                                                'bg-gray-200 dark:bg-gray-700 text-gray-400'
                                        }`}>
                                        {done_ ? <Check className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                                    </div>
                                    <span className={`mt-1.5 text-xs font-medium whitespace-nowrap ${active ? 'text-blue-600' : done_ ? 'text-green-600' : 'text-gray-400'}`}>
                                        {s.label}
                                    </span>
                                </div>
                                {i < STEPS.length - 1 && (
                                    <div className={`flex-1 h-0.5 mx-2 mt-[-14px] transition-colors ${step > s.n || done ? 'bg-green-400' : 'bg-gray-200 dark:bg-gray-700'}`} />
                                )}
                            </div>
                        );
                    })}
                </div>

                <AnimatePresence mode="wait">
                    {/* ── STEP 1: Details ──────────────────────────────────────── */}
                    {step === 1 && !done && (
                        <motion.div key="step1" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
                            className="max-w-xl">
                            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 shadow-sm">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                                    <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                                        <FileText className="w-5 h-5 text-blue-600" />
                                    </div>
                                    Segment Details
                                </h2>

                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                            Segment Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleNext()}
                                            placeholder="e.g., VIP Customers, Newsletter Subscribers"
                                            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none transition-all"
                                            autoFocus
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                            Description <span className="text-gray-400 font-normal">(optional)</span>
                                        </label>
                                        <textarea
                                            value={description}
                                            onChange={e => setDescription(e.target.value)}
                                            placeholder="Brief description of who's in this segment..."
                                            rows={3}
                                            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none resize-none transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="mt-8 flex gap-3">
                                    <button onClick={() => router.push('/dashboard/contacts')}
                                        className="px-5 py-3 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                        Cancel
                                    </button>
                                    <button onClick={handleNext} disabled={!name.trim()}
                                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold shadow-md hover:shadow-lg hover:scale-[1.01] disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed transition-all">
                                        Next <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Tip */}
                            <p className="text-xs text-gray-400 mt-4 px-1">
                                💡 Tip: You can import contacts in the next step, or skip and import them later.
                            </p>
                        </motion.div>
                    )}

                    {/* ── STEP 2: Import contacts ──────────────────────────────── */}
                    {step === 2 && !done && (
                        <motion.div key="step2" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
                            className="max-w-xl">
                            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 shadow-sm">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
                                    <div className="w-9 h-9 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                                        <Upload className="w-5 h-5 text-purple-600" />
                                    </div>
                                    Import Contacts via CSV
                                </h2>
                                <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                                    Optional — you can also import contacts later from the segment list.
                                </p>

                                {/* Template download */}
                                <div className="flex items-center gap-3 p-3.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl mb-6 border border-blue-100 dark:border-blue-800">
                                    <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-blue-700 dark:text-blue-400 font-medium">Required CSV columns:</p>
                                        <p className="text-xs text-blue-600 dark:text-blue-500 font-mono mt-0.5">phone, firstName, lastName, email, tags</p>
                                    </div>
                                    <button onClick={downloadTemplate}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 whitespace-nowrap transition-colors">
                                        <Download className="w-3.5 h-3.5" />
                                        Template
                                    </button>
                                </div>

                                {/* Drop zone */}
                                <div
                                    onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                                    onDragLeave={() => setIsDragging(false)}
                                    onDrop={handleDrop}
                                    onClick={() => fileRef.current?.click()}
                                    className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center gap-4 cursor-pointer transition-all ${isDragging ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-900/20 scale-[1.01]' :
                                            csvFile ? 'border-green-400 bg-green-50/50 dark:bg-green-900/10' :
                                                'border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-blue-50/40 dark:hover:bg-blue-900/10'
                                        }`}
                                >
                                    {csvFile ? (
                                        <>
                                            <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center">
                                                <CheckCircle className="w-8 h-8 text-green-600" />
                                            </div>
                                            <div className="text-center">
                                                <p className="font-semibold text-gray-900 dark:text-white">{csvFile.name}</p>
                                                <p className="text-sm text-gray-500 mt-0.5">
                                                    {(csvFile.size / 1024).toFixed(1)} KB · <strong className="text-green-600">{parsedContacts.length} contacts</strong> ready
                                                </p>
                                            </div>
                                            <button onClick={e => { e.stopPropagation(); setCsvFile(null); setParsedContacts([]); }}
                                                className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 mt-1">
                                                <X className="w-3.5 h-3.5" /> Remove file
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-14 h-14 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center">
                                                <Upload className="w-8 h-8 text-gray-400" />
                                            </div>
                                            <div className="text-center">
                                                <p className="font-semibold text-gray-700 dark:text-gray-300">
                                                    {isDragging ? 'Drop your file here' : 'Drag & drop your CSV file'}
                                                </p>
                                                <p className="text-sm text-gray-400 mt-1">or click to browse files</p>
                                            </div>
                                        </>
                                    )}
                                    <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
                                        onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />
                                </div>

                                <div className="mt-6 flex gap-3">
                                    <button onClick={() => setStep(1)}
                                        className="px-5 py-3 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 text-sm transition-colors">
                                        ← Back
                                    </button>
                                    <button onClick={() => setStep(3)}
                                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold shadow-md hover:shadow-lg hover:scale-[1.01] transition-all">
                                        {csvFile ? `Continue with ${parsedContacts.length} contacts` : 'Skip for now'}
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* ── STEP 3: Review & Create ──────────────────────────────── */}
                    {step === 3 && !done && (
                        <motion.div key="step3" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
                            className="max-w-xl">
                            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 shadow-sm">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                                    <div className="w-9 h-9 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                                        <Sparkles className="w-5 h-5 text-green-600" />
                                    </div>
                                    Review & Create
                                </h2>

                                {/* Summary */}
                                <div className="space-y-3 mb-8">
                                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <FileText className="w-4 h-4 text-gray-400" />
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Segment Name</span>
                                        </div>
                                        <span className="text-sm font-bold text-gray-900 dark:text-white">{name}</span>
                                    </div>
                                    {description && (
                                        <div className="flex items-start justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</span>
                                            <span className="text-sm text-gray-600 dark:text-gray-400 text-right max-w-[200px]">{description}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <Users className="w-4 h-4 text-gray-400" />
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Contacts to Import</span>
                                        </div>
                                        <span className={`text-sm font-bold ${parsedContacts.length > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                            {parsedContacts.length > 0 ? `${parsedContacts.length} contacts` : 'None (can add later)'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button onClick={() => setStep(2)}
                                        className="px-5 py-3 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                        ← Back
                                    </button>
                                    <button onClick={handleCreate} disabled={creating}
                                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold shadow-md hover:shadow-lg hover:scale-[1.01] disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed transition-all">
                                        {creating
                                            ? <><Loader2 className="w-5 h-5 animate-spin" /> Creating...</>
                                            : <><Sparkles className="w-5 h-5" /> Create Segment</>
                                        }
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* ── DONE ─────────────────────────────────────────────────── */}
                    {done && (
                        <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                            className="max-w-xl">
                            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 shadow-sm text-center">
                                <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-200 dark:shadow-green-900/30">
                                    <Check className="w-10 h-10 text-white" />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Segment Created! 🎉</h2>
                                <p className="text-gray-500 dark:text-gray-400">
                                    <strong className="text-gray-800 dark:text-white">"{name}"</strong> is ready to use in campaigns.
                                </p>

                                {importResult && importResult.added > 0 && (
                                    <div className="grid grid-cols-3 gap-3 mt-6 text-left">
                                        {[
                                            { label: 'Contacts Added', value: importResult.added, color: 'green' },
                                            { label: 'Duplicates Skipped', value: importResult.duplicates, color: 'amber' },
                                            { label: 'Total in Segment', value: importResult.total, color: 'blue' },
                                        ].map(({ label, value, color }) => (
                                            <div key={label} className={`p-4 bg-${color}-50 dark:bg-${color}-900/20 rounded-xl text-center`}>
                                                <p className={`text-2xl font-bold text-${color}-600`}>{value}</p>
                                                <p className={`text-xs text-${color}-600 dark:text-${color}-400 mt-1`}>{label}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="mt-8 flex gap-3">
                                    <button onClick={() => router.push('/dashboard/campaigns')}
                                        className="flex-1 px-5 py-3 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                        Use in Campaign →
                                    </button>
                                    <button onClick={() => router.push('/dashboard/contacts')}
                                        className="flex-1 px-5 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold shadow-md hover:shadow-lg transition-all">
                                        View All Segments
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </DashboardLayout>
    );
}
