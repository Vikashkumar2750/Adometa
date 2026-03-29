import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'Refund Policy | Techaasvik',
    description: 'Techaasvik refund and cancellation policy for subscription plans.',
};

export default function RefundsPage() {
    return (
        <div className="min-h-screen bg-white">
            <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between bg-white sticky top-0 z-10 shadow-sm">
                <Link href="/" className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-black text-xs">T</span>
                    </div>
                    <span className="font-black text-gray-900 text-lg">Techaasvik</span>
                </Link>
                <Link href="/" className="text-sm text-gray-500 hover:text-gray-900">← Back to home</Link>
            </nav>
            <div className="max-w-3xl mx-auto px-4 py-16">
                <h1 className="text-4xl font-black text-gray-900 mb-2">Refund & Cancellation Policy</h1>
                <p className="text-gray-400 text-sm mb-10">Last updated: February 21, 2026</p>

                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-8">
                    <p className="font-bold text-amber-800 mb-1">⚠️ Important Summary</p>
                    <p className="text-amber-700 text-sm">Techaasvik subscription fees are generally non-refundable. Please read this policy carefully before subscribing.</p>
                </div>

                {[
                    {
                        title: '1. Subscription Fees',
                        body: 'All subscription fees paid to Techaasvik are non-refundable, including partial months. When you cancel your subscription, you retain access until the end of your current billing period.',
                    },
                    {
                        title: '2. Free Trial',
                        body: 'Our 14-day Free Trial requires no credit card and incurs no charges. At the end of the trial, your account is automatically downgraded to a limited state. You will never be charged without your explicit consent.',
                    },
                    {
                        title: '3. Exceptions — Eligible for Refund',
                        body: 'We will issue refunds in the following circumstances: (a) You were charged in error due to a billing system failure. (b) You were charged after a confirmed cancellation. (c) You experienced complete platform unavailability (>99% downtime) for more than 72 consecutive hours due to our fault. Requests must be made within 7 days of the disputed charge.',
                    },
                    {
                        title: '4. WhatsApp Conversation Charges',
                        body: "WhatsApp Cloud API conversation charges are billed directly by Meta and are outside Techaasvik\u2019s control. We do not process refunds for Meta\u2019s charges. All disputes for these charges must be raised with Meta directly.",
                    },
                    {
                        title: '5. Plan Downgrades',
                        body: 'If you downgrade to a lower plan, the change takes effect at the start of your next billing cycle. No credit is issued for the difference between plans.',
                    },
                    {
                        title: '6. Plan Upgrades',
                        body: 'When upgrading mid-cycle, you will be charged a prorated amount for the remainder of the current billing period.',
                    },
                    {
                        title: '7. Account Termination for Policy Violations',
                        body: 'If your account is terminated due to violation of our Terms of Service or WhatsApp\'s Business Policy, no refund will be issued.',
                    },
                    {
                        title: '8. How to Request a Refund',
                        body: 'Email us at billing@techaasvik.com with your account email, the date of charge, transaction ID, and reason for the refund request. We will review and respond within 5 business days.',
                    },
                ].map(s => (
                    <section key={s.title} className="mb-7">
                        <h2 className="text-lg font-bold text-gray-900 mb-2">{s.title}</h2>
                        <p className="text-gray-600 leading-relaxed">{s.body}</p>
                    </section>
                ))}
            </div>
            <footer className="border-t border-gray-100 py-8 text-center text-sm text-gray-400">
                <div className="flex justify-center gap-6 mb-2">
                    <Link href="/privacy" className="hover:text-gray-700">Privacy</Link>
                    <Link href="/terms" className="hover:text-gray-700">Terms</Link>
                    <Link href="/disclaimer" className="hover:text-gray-700">Disclaimer</Link>
                </div>
                © 2026 Techaasvik. All rights reserved.
            </footer>
        </div>
    );
}
