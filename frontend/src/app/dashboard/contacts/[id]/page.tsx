'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { contactsService, Contact } from '@/lib/contacts-service';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    Edit,
    Trash2,
    Phone,
    Mail,
    Tag,
    Calendar,
    MessageSquare,
    User,
    Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function ContactDetailPage() {
    const router = useRouter();
    const params = useParams();
    const contactId = params.id as string;

    const [contact, setContact] = useState<Contact | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        loadContact();
    }, [contactId]);

    const loadContact = async () => {
        try {
            setIsLoading(true);
            const data = await contactsService.getById(contactId);
            setContact(data);
        } catch (error) {
            console.error('Failed to load contact:', error);
            toast.error('Failed to load contact');
            router.push('/dashboard/contacts');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this contact?')) {
            return;
        }

        setIsDeleting(true);
        try {
            await contactsService.delete(contactId);
            toast.success('Contact deleted successfully');
            router.push('/dashboard/contacts');
        } catch (error) {
            console.error('Failed to delete contact:', error);
            toast.error('Failed to delete contact');
        } finally {
            setIsDeleting(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
            case 'blocked':
                return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
            case 'unsubscribed':
                return 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400';
            default:
                return 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400';
        }
    };

    if (isLoading) {
        return (
            <DashboardLayout allowedRoles={['TENANT_ADMIN', 'TENANT_MARKETER', 'TENANT_VIEWER']}>
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
            </DashboardLayout>
        );
    }

    if (!contact) {
        return null;
    }

    return (
        <DashboardLayout allowedRoles={['TENANT_ADMIN', 'TENANT_MARKETER', 'TENANT_VIEWER']}>
            {/* Header */}
            <div className="mb-8">
                <button
                    onClick={() => router.back()}
                    className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span>Back to Contacts</span>
                </button>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
                            <User className="w-8 h-8 mr-3" />
                            {contact.firstName || contact.lastName
                                ? `${contact.firstName || ''} ${contact.lastName || ''}`.trim()
                                : 'Contact Details'}
                        </h1>
                        <p className="mt-2 text-gray-600 dark:text-gray-400">{contact.phoneNumber}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                        <Link
                            href={`/dashboard/contacts/${contactId}/edit`}
                            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <Edit className="w-4 h-4" />
                            <span>Edit</span>
                        </Link>
                        <button
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Deleting...</span>
                                </>
                            ) : (
                                <>
                                    <Trash2 className="w-4 h-4" />
                                    <span>Delete</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Contact Information */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
                >
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                        Contact Information
                    </h2>
                    <div className="space-y-6">
                        {/* Phone */}
                        <div className="flex items-start space-x-4">
                            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                                <Phone className="w-6 h-6 text-blue-600" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                    Phone Number
                                </p>
                                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {contact.phoneNumber}
                                </p>
                            </div>
                        </div>

                        {/* Email */}
                        {contact.email && (
                            <div className="flex items-start space-x-4">
                                <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                                    <Mail className="w-6 h-6 text-purple-600" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                        Email Address
                                    </p>
                                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                        {contact.email}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Name */}
                        {(contact.firstName || contact.lastName) && (
                            <div className="flex items-start space-x-4">
                                <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                                    <User className="w-6 h-6 text-green-600" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                        Full Name
                                    </p>
                                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                        {`${contact.firstName || ''} ${contact.lastName || ''}`.trim()}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Tags */}
                        {contact.tags && contact.tags.length > 0 && (
                            <div className="flex items-start space-x-4">
                                <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                                    <Tag className="w-6 h-6 text-orange-600" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                                        Tags
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {contact.tags.map((tag, index) => (
                                            <span
                                                key={index}
                                                className="px-3 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 rounded-full text-sm font-medium"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Created Date */}
                        <div className="flex items-start space-x-4">
                            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                                <Calendar className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                    Created Date
                                </p>
                                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {new Date(contact.createdAt).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                    })}
                                </p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Status */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
                    >
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Status</h3>
                        <span
                            className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(
                                contact.status
                            )}`}
                        >
                            {contact.status.charAt(0).toUpperCase() + contact.status.slice(1)}
                        </span>
                    </motion.div>

                    {/* Quick Actions */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
                    >
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                            Quick Actions
                        </h3>
                        <div className="space-y-3">
                            <button className="w-full flex items-center space-x-3 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg">
                                <MessageSquare className="w-5 h-5" />
                                <span className="font-medium">Send Message</span>
                            </button>
                            <Link
                                href={`/dashboard/contacts/${contactId}/edit`}
                                className="w-full flex items-center space-x-3 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                <Edit className="w-5 h-5" />
                                <span className="font-medium">Edit Contact</span>
                            </Link>
                        </div>
                    </motion.div>

                    {/* Activity */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
                    >
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                            Recent Activity
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            No recent activity to display.
                        </p>
                    </motion.div>
                </div>
            </div>
        </DashboardLayout>
    );
}
