import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'Disclaimer | Techaasvik',
    description: 'Important disclaimers regarding Techaasvik WhatsApp marketing platform and Meta WhatsApp relationship.',
};

export default function DisclaimerPage() {
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
                <h1 className="text-4xl font-black text-gray-900 mb-2">Disclaimer</h1>
                <p className="text-gray-400 text-sm mb-10">Last updated: February 21, 2026</p>

                {[
                    {
                        title: 'Relationship with Meta Platforms Inc.',
                        body: 'Techaasvik is an independent software provider and is not affiliated with, endorsed by, or a partner of Meta Platforms, Inc. ("Meta"). WhatsApp™ is a trademark of Meta Platforms, Inc. The WhatsApp logo and brand are the property of Meta. Techaasvik uses the WhatsApp Cloud API as a Business Solution Provider (BSP) and operates in compliance with Meta\'s policies.',
                    },
                    {
                        title: 'No Guarantee of Message Delivery',
                        body: 'While Techaasvik strives to deliver messages reliably through the WhatsApp Cloud API, we cannot guarantee 100% message delivery. Delivery depends on factors beyond our control including the recipient\'s network, device, WhatsApp application status, and Meta\'s infrastructure. We are not liable for failed, delayed, or incomplete deliveries.',
                    },
                    {
                        title: 'No Guarantee of Template Approval',
                        body: 'WhatsApp message template approval is conducted entirely by Meta at their sole discretion. Techaasvik facilitates submission of templates but does not guarantee approval. We are not responsible for template rejections or delays in the approval process.',
                    },
                    {
                        title: 'Results Disclaimer',
                        body: 'Any testimonials, case studies, or statistics presented on our website represent individual results. Results may vary significantly based on your industry, campaign quality, audience, and other factors. Nothing on this website constitutes a guarantee of specific business outcomes, revenue, or ROI.',
                    },
                    {
                        title: 'Professional Advice',
                        body: 'Content published on the Techaasvik website and blog is for informational purposes only and does not constitute legal, financial, or marketing advice. Consult appropriate professionals for specific advice relevant to your situation.',
                    },
                    {
                        title: 'Third-Party Services',
                        body: 'Techaasvik integrates with third-party services including Razorpay (payments), Meta WhatsApp Cloud API (messaging), and others. We are not responsible for the availability, performance, or practices of these third-party services.',
                    },
                    {
                        title: 'Limitation of Liability',
                        body: 'To the maximum extent permitted by applicable law, Techaasvik disclaims all warranties, express or implied, and shall not be liable for any indirect, incidental, or consequential damages arising from the use of our platform.',
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
                    <Link href="/refunds" className="hover:text-gray-700">Refunds</Link>
                </div>
                © 2026 Techaasvik. All rights reserved.
            </footer>
        </div>
    );
}
