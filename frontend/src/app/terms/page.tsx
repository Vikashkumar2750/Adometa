import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'Terms of Service | Techaasvik',
    description: 'Read the Terms of Service for using Techaasvik WhatsApp marketing platform.',
};

const S = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-3">{title}</h2>
        <div className="text-gray-600 leading-relaxed space-y-2">{children}</div>
    </section>
);

export default function TermsPage() {
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
                <h1 className="text-4xl font-black text-gray-900 mb-2">Terms of Service</h1>
                <p className="text-gray-400 text-sm mb-10">Last updated: February 21, 2026</p>

                <S title="1. Acceptance of Terms">
                    <p>By accessing or using Techaasvik ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree, do not use the Service.</p>
                </S>
                <S title="2. Description of Service">
                    <p>Techaasvik provides a WhatsApp Business API marketing platform that enables businesses to send bulk messages, manage campaigns, automate follow-ups, and track engagement through Meta's official WhatsApp Cloud API.</p>
                </S>
                <S title="3. Eligibility">
                    <p>You must be at least 18 years old and represent a lawfully registered business entity to use Techaasvik. By registering, you warrant that you meet these requirements.</p>
                </S>
                <S title="4. WhatsApp Business Policy Compliance">
                    <p>Use of Techaasvik is subject to Meta's WhatsApp Business Policy and Commerce Policy. You are solely responsible for:</p>
                    <ul className="list-disc pl-5 space-y-1 mt-2">
                        <li>Obtaining valid opt-in consent from all contacts before messaging them</li>
                        <li>Honoring opt-out requests promptly</li>
                        <li>Sending only approved message templates for outbound campaigns</li>
                        <li>Not sending spam, illegal, deceptive, or harmful content</li>
                        <li>Complying with applicable local laws including IT Act 2000, PDPB, and TRAI regulations in India</li>
                    </ul>
                    <p>Violations may result in immediate account suspension and WhatsApp account restriction.</p>
                </S>
                <S title="5. Account Security">
                    <p>You are responsible for maintaining the confidentiality of your account credentials. Notify us immediately at <a href="mailto:support@techaasvik.com" className="text-green-600 hover:underline">support@techaasvik.com</a> of any unauthorized access.</p>
                </S>
                <S title="6. Subscription & Billing">
                    <p>Subscription fees are charged in INR and billed monthly. WhatsApp conversation charges from Meta are separate and billed per Meta's pricing. All fees are non-refundable except as stated in our Refund Policy. Downgrading plans takes effect at the next billing cycle.</p>
                </S>
                <S title="7. Acceptable Use">
                    <p>You may not use Techaasvik to: send spam or unsolicited messages; harass, threaten, or harm individuals; violate intellectual property rights; reverse-engineer the platform; or engage in any illegal activity.</p>
                </S>
                <S title="8. Data Ownership">
                    <p>You retain ownership of your business data, contacts, and campaign content. You grant Techaasvik a limited license to store and process this data solely to provide the Service.</p>
                </S>
                <S title="9. Limitation of Liability">
                    <p>Techaasvik is not liable for any indirect, incidental, special, or consequential damages arising from your use of the Service, including losses due to WhatsApp API outages, template rejections by Meta, or delivery failures outside our control.</p>
                </S>
                <S title="10. Termination">
                    <p>We reserve the right to suspend or terminate accounts that violate these Terms without notice. You may cancel your subscription at any time from the dashboard.</p>
                </S>
                <S title="11. Governing Law">
                    <p>These Terms are governed by the laws of India. Disputes shall be resolved in the courts of Bengaluru, Karnataka.</p>
                </S>
                <S title="12. Contact">
                    <p>For questions about these Terms, email <a href="mailto:legal@techaasvik.com" className="text-green-600 hover:underline">legal@techaasvik.com</a>.</p>
                </S>
            </div>
            <footer className="border-t border-gray-100 py-8 text-center text-sm text-gray-400">
                <div className="flex justify-center gap-6 mb-2">
                    <Link href="/privacy" className="hover:text-gray-700">Privacy</Link>
                    <Link href="/refunds" className="hover:text-gray-700">Refunds</Link>
                    <Link href="/disclaimer" className="hover:text-gray-700">Disclaimer</Link>
                </div>
                © 2026 Techaasvik. All rights reserved.
            </footer>
        </div>
    );
}
