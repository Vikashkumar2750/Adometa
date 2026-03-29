'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Cookies from 'js-cookie';
import { ArrowLeft, Save, FileText } from 'lucide-react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function CreateTemplatePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        category: 'MARKETING',
        language: 'en',
        content: '',
        header: '',
        footer: '',
        buttons: [] as { type: string; text: string; url?: string }[],
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const token = Cookies.get('token') || '';
            await axios.post(
                `${API}/templates`,
                formData,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            alert('Template created successfully!');
            router.push('/admin/templates');
        } catch (error: any) {
            console.error('Error creating template:', error);
            alert(error.response?.data?.message || 'Failed to create template');
        } finally {
            setLoading(false);
        }
    };

    const addButton = () => {
        setFormData({
            ...formData,
            buttons: [...formData.buttons, { type: 'QUICK_REPLY', text: '' }],
        });
    };

    const removeButton = (index: number) => {
        setFormData({
            ...formData,
            buttons: formData.buttons.filter((_, i) => i !== index),
        });
    };

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-6">
                <Link
                    href="/admin/templates"
                    className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Back to Templates
                </Link>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                    <FileText className="w-8 h-8" />
                    Create New Template
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                    Create a new WhatsApp message template
                </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="max-w-4xl">
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-6">
                    {/* Template Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Template Name *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            placeholder="e.g., welcome_message"
                        />
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Use lowercase letters, numbers, and underscores only
                        </p>
                    </div>

                    {/* Category & Language */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Category *
                            </label>
                            <select
                                required
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            >
                                <option value="MARKETING">Marketing</option>
                                <option value="UTILITY">Utility</option>
                                <option value="AUTHENTICATION">Authentication</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Language *
                            </label>
                            <select
                                required
                                value={formData.language}
                                onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            >
                                <option value="en">English</option>
                                <option value="en_US">English (US)</option>
                                <option value="hi">Hindi</option>
                                <option value="es">Spanish</option>
                                <option value="fr">French</option>
                            </select>
                        </div>
                    </div>

                    {/* Header (Optional) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Header (Optional)
                        </label>
                        <input
                            type="text"
                            value={formData.header}
                            onChange={(e) => setFormData({ ...formData, header: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            placeholder="e.g., Welcome to Our Service"
                        />
                    </div>

                    {/* Content */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Message Content *
                        </label>
                        <textarea
                            required
                            rows={6}
                            value={formData.content}
                            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            placeholder="Enter your message content here. Use {{1}}, {{2}}, etc. for variables."
                        />
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Use {'{{'} 1 {'}}'}, {'{{'} 2 {'}}'}, etc. for dynamic variables
                        </p>
                    </div>

                    {/* Footer (Optional) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Footer (Optional)
                        </label>
                        <input
                            type="text"
                            value={formData.footer}
                            onChange={(e) => setFormData({ ...formData, footer: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            placeholder="e.g., Reply STOP to unsubscribe"
                        />
                    </div>

                    {/* Buttons */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Buttons (Optional)
                            </label>
                            <button
                                type="button"
                                onClick={addButton}
                                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                            >
                                + Add Button
                            </button>
                        </div>
                        <div className="space-y-3">
                            {formData.buttons.map((button, index) => (
                                <div key={index} className="flex gap-3">
                                    <select
                                        value={button.type}
                                        onChange={(e) => {
                                            const newButtons = [...formData.buttons];
                                            newButtons[index].type = e.target.value;
                                            setFormData({ ...formData, buttons: newButtons });
                                        }}
                                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                    >
                                        <option value="QUICK_REPLY">Quick Reply</option>
                                        <option value="URL">URL</option>
                                        <option value="PHONE_NUMBER">Phone</option>
                                    </select>
                                    <input
                                        type="text"
                                        value={button.text}
                                        onChange={(e) => {
                                            const newButtons = [...formData.buttons];
                                            newButtons[index].text = e.target.value;
                                            setFormData({ ...formData, buttons: newButtons });
                                        }}
                                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                        placeholder="Button text"
                                    />
                                    {button.type === 'URL' && (
                                        <input
                                            type="url"
                                            value={button.url || ''}
                                            onChange={(e) => {
                                                const newButtons = [...formData.buttons];
                                                newButtons[index].url = e.target.value;
                                                setFormData({ ...formData, buttons: newButtons });
                                            }}
                                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                            placeholder="https://example.com"
                                        />
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => removeButton(index)}
                                        className="px-4 py-2 text-red-600 hover:text-red-700 dark:text-red-400"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Submit Buttons */}
                    <div className="flex items-center gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                        <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Save className="w-5 h-5" />
                            {loading ? 'Creating...' : 'Create Template'}
                        </button>
                        <Link
                            href="/admin/templates"
                            className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            Cancel
                        </Link>
                    </div>
                </div>
            </form>
        </div>
    );
}
