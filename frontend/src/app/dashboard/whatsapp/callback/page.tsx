'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { whatsappService } from '@/lib/whatsapp-service';
import toast from 'react-hot-toast';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

function CallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('Processing WhatsApp connection...');

    useEffect(() => {
        handleCallback();
    }, []);

    const handleCallback = async () => {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        // Check for errors from Meta
        if (error) {
            setStatus('error');
            setMessage(errorDescription || 'Failed to connect WhatsApp');
            toast.error(errorDescription || 'Failed to connect WhatsApp');
            setTimeout(() => router.push('/dashboard'), 3000);
            return;
        }

        // Validate required parameters
        if (!code || !state) {
            setStatus('error');
            setMessage('Invalid callback parameters');
            toast.error('Invalid callback parameters');
            setTimeout(() => router.push('/dashboard'), 3000);
            return;
        }

        try {
            // Send to backend
            await whatsappService.handleCallback(code, state);

            setStatus('success');
            setMessage('WhatsApp connected successfully! Redirecting...');
            toast.success('WhatsApp connected successfully!');

            // Redirect to dashboard after 2 seconds
            setTimeout(() => router.push('/dashboard'), 2000);
        } catch (error: any) {
            console.error('Callback error:', error);
            setStatus('error');
            setMessage(error.response?.data?.message || 'Failed to connect WhatsApp');
            toast.error(error.response?.data?.message || 'Failed to connect WhatsApp');
            setTimeout(() => router.push('/dashboard'), 3000);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
            <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
                {status === 'loading' && (
                    <>
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full mb-4">
                            <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            Connecting WhatsApp
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400">
                            {message}
                        </p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full mb-4">
                            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            Success!
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400">
                            {message}
                        </p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full mb-4">
                            <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            Connection Failed
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            {message}
                        </p>
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all"
                        >
                            Return to Dashboard
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

export default function WhatsAppCallbackPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        }>
            <CallbackContent />
        </Suspense>
    );
}
