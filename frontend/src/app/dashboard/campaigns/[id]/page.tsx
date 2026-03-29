'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { campaignsService, Campaign } from '@/lib/campaigns-service';
import { motion } from 'framer-motion';
import {
    ChevronLeft,
    Play,
    Pause,
    Edit,
    Trash2,
    Send,
    Users,
    Calendar,
    CheckCircle,
    XCircle,
    Eye,
    TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function CampaignDetailPage() {
    const router = useRouter();
    const params = useParams();
    const { user } = useAuthStore();
    const [campaign, setCampaign] = useState<Campaign | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            router.push('/login');
            return;
        }
        if (params.id) {
            loadCampaign(params.id as string);
        }
    }, [user, router, params.id]);

    const loadCampaign = async (id: string) => {
        setIsLoading(true);
        try {
            // Mock data - replace with actual API
            setTimeout(() => {
                const mockCampaign: Campaign = {
                    id: id,
                    name: 'Summer Sale 2024',
                    description: 'Promotional campaign for summer sale',
                    templateId: 'template-1',
                    templateName: 'Summer Promo',
                    segmentId: 'segment-1',
                    segmentName: 'VIP Customers',
                    status: 'running',
                    scheduledAt: '2024-02-01T10:00:00Z',
                    startedAt: '2024-02-01T10:00:00Z',
                    totalRecipients: 1500,
                    sentCount: 1200,
                    deliveredCount: 1150,
                    readCount: 850,
                    failedCount: 50,
                    createdAt: '2024-01-25T09:00:00Z',
                    updatedAt: '2024-02-10T10:30:00Z',
                };
                setCampaign(mockCampaign);
                setIsLoading(false);
            }, 500);
        } catch (error) {
            console.error('Failed to load campaign:', error);
            toast.error('Failed to load campaign');
            setIsLoading(false);
        }
    };

    const handleStart = async () => {
        if (!campaign) return;
        try {
            await campaignsService.start(campaign.id);
            toast.success('Campaign started successfully');
            loadCampaign(campaign.id);
        } catch (error) {
            console.error('Failed to start campaign:', error);
            toast.error('Failed to start campaign');
        }
    };

    const handlePause = async () => {
        if (!campaign) return;
        try {
            await campaignsService.pause(campaign.id);
            toast.success('Campaign paused successfully');
            loadCampaign(campaign.id);
        } catch (error) {
            console.error('Failed to pause campaign:', error);
            toast.error('Failed to pause campaign');
        }
    };

    const handleDelete = async () => {
        if (!campaign) return;
        if (!confirm('Are you sure you want to delete this campaign?')) return;

        try {
            await campaignsService.delete(campaign.id);
            toast.success('Campaign deleted successfully');
            router.push('/dashboard/campaigns');
        } catch (error) {
            console.error('Failed to delete campaign:', error);
            toast.error('Failed to delete campaign');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed':
                return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
            case 'running':
                return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
            case 'scheduled':
                return 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400';
            case 'paused':
                return 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400';
            case 'failed':
                return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
            case 'draft':
                return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
            default:
                return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!campaign) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        Campaign not found
                    </h2>
                    <Link
                        href="/dashboard/campaigns"
                        className="text-blue-600 hover:text-blue-700"
                    >
                        Back to Campaigns
                    </Link>
                </div>
            </div>
        );
    }

    const deliveryRate = campaign.totalRecipients > 0
        ? ((campaign.deliveredCount / campaign.sentCount) * 100).toFixed(1)
        : 0;
    const readRate = campaign.deliveredCount > 0
        ? ((campaign.readCount / campaign.deliveredCount) * 100).toFixed(1)
        : 0;
    const progress = campaign.totalRecipients > 0
        ? ((campaign.sentCount / campaign.totalRecipients) * 100).toFixed(1)
        : 0;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-8 py-6">
                <div className="max-w-7xl mx-auto">
                    <Link
                        href="/dashboard/campaigns"
                        className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                        <span>Back to Campaigns</span>
                    </Link>
                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                                {campaign.name}
                            </h1>
                            {campaign.description && (
                                <p className="mt-2 text-gray-600 dark:text-gray-400">
                                    {campaign.description}
                                </p>
                            )}
                            <div className="mt-4 flex items-center space-x-4">
                                <span
                                    className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(
                                        campaign.status
                                    )}`}
                                >
                                    {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                                </span>
                                {campaign.templateName && (
                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                        Template: {campaign.templateName}
                                    </span>
                                )}
                                {campaign.segmentName && (
                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                        Segment: {campaign.segmentName}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            {campaign.status === 'draft' && (
                                <Link
                                    href={`/dashboard/campaigns/${campaign.id}/edit`}
                                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    <Edit className="w-4 h-4" />
                                    <span>Edit</span>
                                </Link>
                            )}
                            {campaign.status === 'scheduled' && (
                                <button
                                    onClick={handleStart}
                                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                >
                                    <Play className="w-4 h-4" />
                                    <span>Start Now</span>
                                </button>
                            )}
                            {campaign.status === 'running' && (
                                <button
                                    onClick={handlePause}
                                    className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                                >
                                    <Pause className="w-4 h-4" />
                                    <span>Pause</span>
                                </button>
                            )}
                            {(campaign.status === 'draft' || campaign.status === 'failed') && (
                                <button
                                    onClick={handleDelete}
                                    className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    <span>Delete</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-8 py-8">
                {/* Progress Bar */}
                {campaign.status === 'running' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Campaign Progress
                            </span>
                            <span className="text-sm font-bold text-blue-600">{progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                            <div
                                className="bg-gradient-to-r from-blue-600 to-purple-600 h-3 rounded-full transition-all duration-500"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            {campaign.sentCount} of {campaign.totalRecipients} messages sent
                        </div>
                    </motion.div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {/* Total Recipients */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {campaign.totalRecipients.toLocaleString()}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Total Recipients</p>
                    </motion.div>

                    {/* Sent */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                                <Send className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                            </div>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {campaign.sentCount.toLocaleString()}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Messages Sent</p>
                    </motion.div>

                    {/* Delivered */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                            </div>
                            <span className="text-sm font-medium text-green-600">{deliveryRate}%</span>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {campaign.deliveredCount.toLocaleString()}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Delivered</p>
                    </motion.div>

                    {/* Read */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                                <Eye className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                            </div>
                            <span className="text-sm font-medium text-orange-600">{readRate}%</span>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {campaign.readCount.toLocaleString()}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Read</p>
                    </motion.div>
                </div>

                {/* Campaign Details */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
                >
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                        Campaign Details
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                Created
                            </label>
                            <p className="mt-1 text-gray-900 dark:text-white">
                                {new Date(campaign.createdAt).toLocaleString()}
                            </p>
                        </div>
                        {campaign.scheduledAt && (
                            <div>
                                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                    Scheduled
                                </label>
                                <p className="mt-1 text-gray-900 dark:text-white">
                                    {new Date(campaign.scheduledAt).toLocaleString()}
                                </p>
                            </div>
                        )}
                        {campaign.startedAt && (
                            <div>
                                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                    Started
                                </label>
                                <p className="mt-1 text-gray-900 dark:text-white">
                                    {new Date(campaign.startedAt).toLocaleString()}
                                </p>
                            </div>
                        )}
                        {campaign.completedAt && (
                            <div>
                                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                    Completed
                                </label>
                                <p className="mt-1 text-gray-900 dark:text-white">
                                    {new Date(campaign.completedAt).toLocaleString()}
                                </p>
                            </div>
                        )}
                        {campaign.failedCount > 0 && (
                            <div>
                                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                    Failed Messages
                                </label>
                                <p className="mt-1 text-red-600 dark:text-red-400 font-semibold">
                                    {campaign.failedCount.toLocaleString()}
                                </p>
                            </div>
                        )}
                    </div>
                </motion.div>
            </main>
        </div>
    );
}
