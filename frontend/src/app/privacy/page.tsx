import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'Privacy Policy | Techaasvik',
    description: 'Learn how Techaasvik collects, uses, and protects your personal data.',
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-3">{title}</h2>
        <div className="text-gray-600 leading-relaxed space-y-2">{children}</div>
    </section>
);

export default function PrivacyPage() {
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
                <h1 className="text-4xl font-black text-gray-900 mb-2">Privacy Policy</h1>
                <p className="text-gray-400 text-sm mb-10">Last updated: February 21, 2026</p>

                <Section title="1. Introduction">
                    <p>Techaasvik ("we", "us", "our") operates the WhatsApp marketing platform at adometa.techaasvik.in. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.</p>
                    <p>By using Techaasvik, you agree to the collection and use of information in accordance with this policy.</p>
                </Section>

                <Section title="2. Information We Collect">
                    <p><strong>Account Data:</strong> Name, email address, business name, phone number, and password when you register.</p>
                    <p><strong>WhatsApp Business Data:</strong> Phone Number IDs, access tokens, and WhatsApp account details provided during setup.</p>
                    <p><strong>Contact Data:</strong> Phone numbers and names of your WhatsApp contacts imported by you into the platform.</p>
                    <p><strong>Campaign Data:</strong> Messages, templates, campaign metrics (delivered, read, replied), and scheduling information.</p>
                    <p><strong>Usage Data:</strong> IP address, browser type, pages visited, time spent, and other diagnostic data.</p>
                    <p><strong>Payment Data:</strong> Billing information processed securely through Razorpay (we do not store raw card details).</p>
                </Section>

                <Section title="3. How We Use Your Information">
                    <p>We use your data to: provide and operate the platform; process transactions; send administrative notifications; analyze usage to improve the product; comply with legal obligations; and respond to support requests.</p>
                    <p>We do <strong>not</strong> sell your personal data to third parties.</p>
                </Section>

                <Section title="4. Data Isolation & Multi-Tenancy">
                    <p>Each tenant account is isolated. Your campaign data, contacts, and WhatsApp credentials are never shared with other tenants. We enforce strict multi-tenant isolation at the database level via tenant IDs.</p>
                </Section>

                <Section title="5. WhatsApp Data Compliance">
                    <p>We operate through Meta's official WhatsApp Cloud API. All messaging activity must comply with WhatsApp's Business Policy. You are responsible for obtaining valid consent from your contacts before sending them WhatsApp messages. We provide opt-out handling support to assist compliance.</p>
                </Section>

                <Section title="6. Data Retention">
                    <p>We retain your account data for as long as your account is active. Campaign and contact data is retained for 2 years after account deletion unless you request earlier deletion. Audit logs are retained for 1 year.</p>
                </Section>

                <Section title="7. Security">
                    <p>We implement industry-standard security: AES-256 encryption at rest, TLS 1.3 in transit, multi-factor authentication, rate limiting, and regular security audits. However, no method of transmission over the internet is 100% secure.</p>
                </Section>

                <Section title="8. Your Rights">
                    <p>You have the right to: access your personal data; request correction; request deletion; data portability; and withdraw consent. Contact us at <a href="mailto:privacy@techaasvik.com" className="text-green-600 hover:underline">privacy@techaasvik.com</a> to exercise your rights.</p>
                </Section>

                <Section title="9. Cookies">
                    <p>We use essential cookies for authentication and session management. Analytics cookies may be used with your consent. You can control cookies through your browser settings.</p>
                </Section>

                <Section title="10. Contact Us">
                    <p>For privacy concerns, email us at <a href="mailto:privacy@techaasvik.com" className="text-green-600 hover:underline">privacy@techaasvik.com</a> or write to: Techaasvik, India.</p>
                </Section>
            </div>

            <footer className="border-t border-gray-100 py-8 text-center text-sm text-gray-400">
                <div className="flex justify-center gap-6 mb-2">
                    <Link href="/terms" className="hover:text-gray-700">Terms</Link>
                    <Link href="/refunds" className="hover:text-gray-700">Refunds</Link>
                    <Link href="/disclaimer" className="hover:text-gray-700">Disclaimer</Link>
                    <Link href="/contact" className="hover:text-gray-700">Contact</Link>
                </div>
                © 2026 Techaasvik. All rights reserved.
            </footer>
        </div>
    );
}
