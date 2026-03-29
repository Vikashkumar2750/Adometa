'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import apiClient from '@/lib/api-client';
import { DashboardLayout } from '@/components/dashboard-layout';
import { motion } from 'framer-motion';
import {
    ChevronLeft, Upload, Download, FileText, CheckCircle, AlertCircle,
    Loader2, X, Users,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ImportResult {
    added: number;
    duplicates: number;
    total: number;
    duplicatePhones: string[];
}

function ImportPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const segmentId = searchParams.get('segmentId');
    const segmentName = searchParams.get('segmentName') || 'Segment';

    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const parseCSV = (text: string) => {
        const lines = text.split('\n').filter(l => l.trim());
        if (lines.length < 2) return [];
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/["\r]/g, ''));
        return lines.slice(1).map(line => {
            const vals = line.split(',').map(v => v.trim().replace(/["\r]/g, ''));
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
        }).filter(Boolean);
    };

    const handleImport = async () => {
        if (!csvFile || !segmentId) return;
        setImporting(true);
        try {
            const text = await csvFile.text();
            const contacts = parseCSV(text);
            if (!contacts.length) { toast.error('No valid contacts found in CSV'); setImporting(false); return; }
            const res = await apiClient.post(`/segments/${segmentId}/import`, { contacts });
            setImportResult(res.data);
            toast.success('Import complete!');
        } catch (err: any) {
            const msg = err?.response?.data?.message;
            toast.error(Array.isArray(msg) ? msg.join(', ') : msg || 'Import failed');
        } finally {
            setImporting(false);
        }
    };

    const downloadTemplate = () => {
        const csv = 'phone,firstName,lastName,email,tags\n+919876543210,John,Doe,john@example.com,vip;premium\n+919876543211,Jane,Smith,jane@example.com,regular';
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'contacts_template.csv'; a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 md:p-8">
            <button onClick={() => router.push('/dashboard/contacts')}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 dark:hover:text-white mb-6 transition-colors">
                <ChevronLeft className="w-4 h-4" />
                Back to Contacts
            </button>

            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Import Contacts</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                    Adding to: <span className="font-semibold text-blue-600">"{segmentName}"</span>
                </p>
            </div>

            <div className="max-w-xl">
                {!importResult ? (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 shadow-sm">
                        <div className="flex items-center gap-3 p-3.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl mb-6 border border-blue-100 dark:border-blue-800">
                            <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-blue-700 dark:text-blue-400 font-medium">CSV columns: <span className="font-mono">phone, firstName, lastName, email, tags</span></p>
                                <p className="text-xs text-blue-500 mt-0.5">Duplicates are automatically skipped</p>
                            </div>
                            <button onClick={downloadTemplate}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 whitespace-nowrap">
                                <Download className="w-3.5 h-3.5" /> Template
                            </button>
                        </div>

                        <div
                            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={e => {
                                e.preventDefault(); setIsDragging(false);
                                const f = e.dataTransfer.files?.[0];
                                if (f && (f.type === 'text/csv' || f.name.endsWith('.csv'))) setCsvFile(f);
                                else toast.error('Please drop a .csv file');
                            }}
                            onClick={() => fileRef.current?.click()}
                            className={`border-2 border-dashed rounded-2xl p-12 flex flex-col items-center gap-4 cursor-pointer transition-all ${isDragging ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-900/20 scale-[1.01]' :
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
                                        <p className="text-sm text-gray-500">{(csvFile.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                    <button onClick={e => { e.stopPropagation(); setCsvFile(null); }}
                                        className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700">
                                        <X className="w-3.5 h-3.5" /> Remove
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="w-14 h-14 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center">
                                        <Upload className="w-8 h-8 text-gray-400" />
                                    </div>
                                    <div className="text-center">
                                        <p className="font-semibold text-gray-700 dark:text-gray-300">
                                            {isDragging ? 'Drop your CSV file here' : 'Drag & drop your CSV'}
                                        </p>
                                        <p className="text-sm text-gray-400 mt-1">or click to browse</p>
                                    </div>
                                </>
                            )}
                            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
                                onChange={e => { const f = e.target.files?.[0]; if (f) setCsvFile(f); }} />
                        </div>

                        <button onClick={handleImport} disabled={!csvFile || importing}
                            className="mt-6 w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold shadow-md hover:shadow-lg disabled:opacity-50 transition-all">
                            {importing ? <><Loader2 className="w-5 h-5 animate-spin" /> Importing...</> : <><Upload className="w-5 h-5" /> Import Contacts</>}
                        </button>
                    </motion.div>
                ) : (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 shadow-sm">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center">
                                <CheckCircle className="w-8 h-8 text-green-600" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Import Complete!</h2>
                                <p className="text-gray-500 text-sm">Contacts added to "{segmentName}"</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3 mb-6">
                            {[
                                { label: 'Added', value: importResult.added, colorClass: 'bg-green-50 dark:bg-green-900/20 text-green-600' },
                                { label: 'Skipped', value: importResult.duplicates, colorClass: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600' },
                                { label: 'Total', value: importResult.total, colorClass: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' },
                            ].map(({ label, value, colorClass }) => (
                                <div key={label} className={`p-4 rounded-xl text-center ${colorClass.split(' ').slice(0, 2).join(' ')}`}>
                                    <p className={`text-2xl font-bold ${colorClass.split(' ').slice(2).join(' ')}`}>{value}</p>
                                    <p className={`text-xs mt-1 ${colorClass.split(' ').slice(2).join(' ')}`}>{label}</p>
                                </div>
                            ))}
                        </div>

                        {importResult.duplicates > 0 && (
                            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl mb-6 border border-amber-100 dark:border-amber-800">
                                <div className="flex items-center gap-2 mb-2">
                                    <AlertCircle className="w-4 h-4 text-amber-600" />
                                    <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Skipped (already exist):</p>
                                </div>
                                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                                    {importResult.duplicatePhones.map(p => (
                                        <span key={p} className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 text-xs rounded font-mono">{p}</span>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button onClick={() => { setImportResult(null); setCsvFile(null); }}
                                className="flex-1 px-5 py-3 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                Import More
                            </button>
                            <button onClick={() => router.push('/dashboard/contacts')}
                                className="flex-1 px-5 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold shadow-md hover:shadow-lg transition-all">
                                Done →
                            </button>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
}

export default function ImportPage() {
    return (
        <DashboardLayout>
            <Suspense fallback={
                <div className="flex items-center justify-center h-96">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
            }>
                <ImportPageContent />
            </Suspense>
        </DashboardLayout>
    );
}
