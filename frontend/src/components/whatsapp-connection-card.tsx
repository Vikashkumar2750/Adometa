'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, CheckCircle, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import { whatsappService, WhatsAppStatus } from '@/lib/whatsapp-service';
import toast from 'react-hot-toast';

export function WhatsAppConnectionCard() {
    const [status, setStatus] = useState<WhatsAppStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isConnecting, setIsConnecting] = useState(false);

    useEffect(() => {
        loadStatus();
    }, []);

    const loadStatus = async () => {
        try {
            setIsLoading(true);
            const data = await whatsappService.getStatus();
            setStatus(data);
        } catch (error: any) {
            console.error('Failed to load WhatsApp status:', error);
            setStatus({ connected: false });
        } finally {
            setIsLoading(false);
        }
    };

    const handleConnect = async () => {
        try {
            setIsConnecting(true);
            const redirectUrl = `${window.location.origin}/dashboard/whatsapp/callback`;
            const response = await whatsappService.initiateSignup(redirectUrl);

            // Redirect to Meta OAuth
            window.location.href = response.oauthUrl;
        } catch (error: any) {
            console.error('Failed to initiate OAuth:', error);
            toast.error(error.response?.data?.message || 'Failed to connect WhatsApp');
            setIsConnecting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        >
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    WhatsApp Connection
                </h2>
                {status?.connected ? (
                    <div className="flex items-center space-x-2 px-3 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">Connected</span>
                    </div>
                ) : (
                    <div className="flex items-center space-x-2 px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">Not Connected</span>
                    </div>
                )}
            </div>

            {status?.connected ? (
                <div className="space-y-4">
                    {/* Connection Details */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Phone Number</p>
                            <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                                {status.phoneNumber || 'N/A'}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Display Name</p>
                            <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                                {status.displayName || 'N/A'}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                            <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                                {status.status || 'N/A'}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Quality Rating</p>
                            <div className="flex items-center mt-1">
                                <span
                                    className={`px-2 py-1 text-sm font-semibold rounded ${status.qualityRating === 'GREEN'
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                                            : status.qualityRating === 'YELLOW'
                                                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
                                                : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                                        }`}
                                >
                                    {status.qualityRating || 'UNKNOWN'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* WABA ID */}
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            WABA ID: {status.wabaId}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Phone Number ID: {status.phoneNumberId}
                        </p>
                    </div>
                </div>
            ) : (
                <div className="text-center py-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
                        <MessageSquare className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Connect Your WhatsApp Business Account
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                        Connect your WhatsApp Business Account to start sending messages to your customers.
                    </p>
                    <button
                        onClick={handleConnect}
                        disabled={isConnecting}
                        className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isConnecting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Connecting...</span>
                            </>
                        ) : (
                            <>
                                <MessageSquare className="w-5 h-5" />
                                <span>Connect WhatsApp</span>
                                <ExternalLink className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </div>
            )}
        </motion.div>
    );
}
