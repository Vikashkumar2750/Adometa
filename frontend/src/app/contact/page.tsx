'use client';
import { useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const companySizes = ['1-10', '11-50', '51-200', '201-500', '500+'];

export default function ContactPage() {
    const [form, setForm] = useState({
        name: '', email: '', phone: '', company: '',
        company_size: '', website: '', use_case: '',
    });
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);

    const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name || !form.email || !form.phone || !form.company) {
            return toast.error('Please fill all required fields');
        }
        setLoading(true);
        try {
            await axios.post(`${API}/leads`, { ...form, source: 'contact_page' });
            setSubmitted(true);
        } catch (err: any) {
            const msg = err.response?.data?.message;
            toast.error(Array.isArray(msg) ? msg[0] : msg || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-950 to-slate-900">
            <Toaster position="top-center" />

            {/* Nav */}
            <nav className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-black text-sm">T</span>
                    </div>
                    <span className="text-white font-black text-xl">Techaasvik</span>
                </Link>
                <Link href="/" className="text-slate-400 hover:text-white text-sm transition-colors">← Back to home</Link>
            </nav>

            <div className="max-w-4xl mx-auto px-4 py-16">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                    {/* Left info */}
                    <div className="text-white">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full text-green-300 text-sm font-semibold mb-6">
                            💬 Talk to Sales
                        </div>
                        <h1 className="text-4xl font-black mb-4">
                            Let's Grow Your Business<br />
                            <span className="text-green-400">With WhatsApp</span>
                        </h1>
                        <p className="text-slate-300 text-lg mb-8">
                            Tell us about your business and we'll show you exactly how Techaasvik can help you reach more customers and drive more revenue.
                        </p>
                        <div className="space-y-4">
                            {[
                                { icon: '⚡', title: 'Response within 2 hours', desc: 'Our team responds on business days between 9 AM – 7 PM IST' },
                                {
                                    icon: '🎯', title: 'Custom demo for your use case', desc: "We'll show you a live demo tailored to your industry"
                                },
                                { icon: '💰', title: 'No pressure sales', desc: "Just an honest conversation about whether we're right for you" },
                            ].map(i => (
                                <div key={i.title} className="flex gap-3 p-4 bg-white/5 rounded-xl backdrop-blur border border-white/10">
                                    <span className="text-2xl">{i.icon}</span>
                                    <div>
                                        <p className="font-bold text-white">{i.title}</p>
                                        <p className="text-slate-400 text-sm">{i.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right form */}
                    <div className="bg-white rounded-3xl p-8 shadow-2xl">
                        {submitted ? (
                            <div className="text-center py-8">
                                <div className="text-6xl mb-4">🎉</div>
                                <h2 className="text-2xl font-black text-gray-900 mb-3">We got your message!</h2>
                                <p className="text-gray-500 mb-6">Our team will reach out within 2 business hours. Check your email for a confirmation.</p>
                                <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors">
                                    ← Back to Home
                                </Link>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <h2 className="text-2xl font-black text-gray-900 mb-2">Get in Touch</h2>
                                <p className="text-gray-500 text-sm mb-4">We'd love to learn about your WhatsApp use case.</p>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-xs font-bold text-gray-600 mb-1">Name <span className="text-red-500">*</span></label>
                                        <input value={form.name} onChange={e => set('name', e.target.value)}
                                            placeholder="Rohan Sharma"
                                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400" required />
                                    </div>
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-xs font-bold text-gray-600 mb-1">Phone <span className="text-red-500">*</span></label>
                                        <input value={form.phone} onChange={e => set('phone', e.target.value)}
                                            placeholder="+91 98765 43210"
                                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400" required />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Business Email <span className="text-red-500">*</span></label>
                                    <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                                        placeholder="you@company.com"
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400" required />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Company Name <span className="text-red-500">*</span></label>
                                    <input value={form.company} onChange={e => set('company', e.target.value)}
                                        placeholder="FashionKart India"
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400" required />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-1">Company Size <span className="text-red-500">*</span></label>
                                        <select value={form.company_size} onChange={e => set('company_size', e.target.value)}
                                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400" required>
                                            <option value="">Select...</option>
                                            {companySizes.map(s => <option key={s} value={s}>{s} employees</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-1">Website</label>
                                        <input value={form.website} onChange={e => set('website', e.target.value)}
                                            placeholder="https://yoursite.com"
                                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Your WhatsApp Use Case</label>
                                    <textarea value={form.use_case} onChange={e => set('use_case', e.target.value)}
                                        rows={3} placeholder="e.g. Bulk promotional campaigns for Diwali, order status updates..."
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none" />
                                </div>

                                <button type="submit" disabled={loading}
                                    className="w-full py-3.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl hover:shadow-xl hover:scale-[1.01] transition-all disabled:opacity-60 text-base">
                                    {loading ? '⏳ Submitting...' : '🚀 Talk to Our Team'}
                                </button>

                                <p className="text-center text-xs text-gray-400">
                                    By submitting, you agree to our{' '}
                                    <Link href="/privacy" className="text-green-600 hover:underline">Privacy Policy</Link>
                                </p>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
