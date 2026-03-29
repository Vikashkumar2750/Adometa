import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Techaasvik — WhatsApp Marketing Platform for Indian Businesses | Bulk WhatsApp Campaigns',
  description: 'Send bulk WhatsApp messages, automate campaigns, and grow your business with Techaasvik. India\'s most trusted WhatsApp Business API platform. Start free — no credit card required.',
  keywords: 'WhatsApp marketing, bulk WhatsApp, WhatsApp automation, WhatsApp campaigns India, WhatsApp Business API, WhatsApp bulk sender, WhatsApp chatbot, marketing automation India',
  openGraph: {
    title: 'Techaasvik — WhatsApp Marketing Platform for Indian Businesses',
    description: 'Send bulk WhatsApp messages, automate campaigns, grow revenue. Trusted by 500+ SMEs across India.',
    type: 'website',
    url: 'https://adometa.techaasvik.in',
  },
};

const features = [
  {
    icon: '⚡',
    title: 'Bulk WhatsApp Campaigns',
    desc: 'Send thousands of personalised WhatsApp messages in one click — with templates, images, buttons, and custom variables per contact.',
  },
  {
    icon: '🤖',
    title: 'Smart Automation Rules',
    desc: 'Auto-retry failed deliveries. Re-schedule to unread contacts at optimal times. Build powerful funnel automation without coding.',
  },
  {
    icon: '📊',
    title: 'Real-Time Analytics',
    desc: 'Track delivered, read, replied and clicked for every campaign. Know exactly what\'s working and double down on it.',
  },
  {
    icon: '📋',
    title: 'WhatsApp Template Manager',
    desc: 'Create, manage and submit templates to Meta for approval from one place. Get notified when approved and use them instantly.',
  },
  {
    icon: '👥',
    title: 'Contact Segments',
    desc: 'Import contacts from CSV, tag them, build segments by behaviour, source or tag — target the right audience every time.',
  },
  {
    icon: '🔒',
    title: 'Bank-Grade Security',
    desc: 'Full multi-tenant isolation, role-based access control, audit logs, and SOC 2-ready infrastructure. Your data is yours.',
  },
  {
    icon: '🌐',
    title: 'Official Meta Cloud API',
    desc: 'Connected directly to WhatsApp Cloud API via Meta Embedded Sign-Up. No third-party risk — 99.9% uptime guaranteed.',
  },
  {
    icon: '💰',
    title: 'INR Billing — No FX Fees',
    desc: 'Plans priced in Indian Rupees with Razorpay & UPI support. No surprise dollar conversion charges — ever.',
  },
];

const plans = [
  {
    name: 'Free Trial',
    price: '₹0',
    period: '14 days',
    color: 'gray',
    desc: 'Try everything free',
    features: [
      '500 messages/month',
      '1 WhatsApp number',
      '3 contact segments',
      'Basic templates',
      'Campaign analytics',
    ],
    cta: 'Start Free Trial',
    href: '/register',
    popular: false,
  },
  {
    name: 'Starter',
    price: '₹2,499',
    period: '/month',
    color: 'blue',
    desc: 'For growing businesses',
    features: [
      '5,000 messages/month',
      '1 WhatsApp number',
      '10 contact segments',
      '5 team members',
      'Advanced analytics',
      'Template manager',
      'Email support',
    ],
    cta: 'Get Started',
    href: '/register?plan=STARTER',
    popular: false,
  },
  {
    name: 'Growth',
    price: '₹6,499',
    period: '/month',
    color: 'purple',
    desc: 'Best for scaling teams',
    features: [
      '25,000 messages/month',
      '3 WhatsApp numbers',
      'Unlimited segments',
      '15 team members',
      'Automation rules',
      'Priority support',
      'Scheduled broadcasts',
      'CSV export / reports',
    ],
    cta: 'Get Growth Plan',
    href: '/register?plan=GROWTH',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: 'pricing',
    color: 'gold',
    desc: 'For large operations',
    features: [
      'Unlimited messages',
      'Unlimited WhatsApp numbers',
      'Unlimited everything',
      'Dedicated account manager',
      'Custom integrations (API)',
      'SLA & uptime guarantee',
      'Onboarding & training',
    ],
    cta: 'Talk to Sales',
    href: 'mailto:sales@techaasvik.com',
    popular: false,
  },
];

const testimonials = [
  {
    name: 'Rohan Sharma',
    role: 'Founder, FashionKart',
    location: 'Mumbai',
    avatar: 'RS',
    text: 'We went from 12% email open rate to 78% WhatsApp read rate overnight. Techaasvik paid for itself in the first week. Our Diwali campaign hit ₹4L revenue from a single broadcast.',
    stat: '78% read rate',
  },
  {
    name: 'Priya Nair',
    role: 'Marketing Head, EduReach',
    location: 'Bengaluru',
    avatar: 'PN',
    text: 'The automation feature is insane. We set up a re-try sequence for unread messages and recovered 23% of leads we thought were lost. The ROI is unbeatable.',
    stat: '+23% lead recovery',
  },
  {
    name: 'Amit Jaiswal',
    role: 'CEO, HealthVibes Clinic',
    location: 'Pune',
    avatar: 'AJ',
    text: 'Appointment reminders via WhatsApp reduced no-shows by 60%. The team onboarding feature lets our staff send personalised follow-ups without touching our main account.',
    stat: '60% fewer no-shows',
  },
];

const howItWorks = [
  {
    step: '01',
    title: 'Connect WhatsApp Business',
    desc: 'Link your WhatsApp Business account via Meta\'s official Embedded Sign-Up. Takes 5 minutes. No technical setup needed.',
    icon: '📱',
  },
  {
    step: '02',
    title: 'Import Your Contacts',
    desc: 'Upload a CSV with your contacts. Auto-deduplication removes duplicates. Segment by tag, source, or custom fields.',
    icon: '📤',
  },
  {
    step: '03',
    title: 'Create a Campaign',
    desc: 'Choose a Meta-approved template or create one. Personalize with variables like name, city, or order ID per contact.',
    icon: '✍️',
  },
  {
    step: '04',
    title: 'Launch & Automate',
    desc: 'Send instantly or schedule for peak engagement times. Set automation rules to retry, follow-up, and convert.',
    icon: '🚀',
  },
];

const faqs = [
  {
    q: 'Is this the official WhatsApp Business API?',
    a: 'Yes. Techaasvik connects exclusively through Meta\'s official WhatsApp Cloud API via Embedded Sign-Up. Your account is fully compliant with WhatsApp\'s Terms of Service.',
  },
  {
    q: 'Will my contacts know I\'m using a marketing platform?',
    a: 'No. Messages appear in your business\'s WhatsApp profile exactly as if sent manually. Contacts see your verified business name and logo.',
  },
  {
    q: 'Can I get blocked by WhatsApp for bulk sending?',
    a: 'Not when done right. We enforce Meta\'s messaging policies automatically — rate limits, template-only outbound, opt-out handling. You\'re safe as long as contacts have opted in.',
  },
  {
    q: 'How is billing done? Are there hidden charges?',
    a: 'Subscription fee is charged in INR via Razorpay/UPI. WhatsApp Cloud API conversation charges (from Meta) are separate and depend on your usage — we show estimates in the dashboard. No hidden fees from our side.',
  },
  {
    q: 'Can my team use Techaasvik with different roles?',
    a: 'Yes. Add team members with roles: Admin (full control), Marketer (campaigns only), Viewer (analytics only). Perfect for agencies managing multiple clients.',
  },
  {
    q: 'How long does WhatsApp template approval take?',
    a: 'Meta typically approves templates within 48 hours. Techaasvik notifies you via dashboard and email as soon as your template status changes.',
  },
];

const stats = [
  { value: '500+', label: 'Businesses Onboarded' },
  { value: '98M+', label: 'Messages Sent' },
  { value: '78%', label: 'Avg. Read Rate' },
  { value: '4.9/5', label: 'Customer Rating' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans">
      {/* ──────────────────────────────────────── NAVBAR ── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-black text-sm">T</span>
              </div>
              <span className="text-xl font-black text-gray-900">Techaasvik</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Features</a>
              <a href="#how-it-works" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">How It Works</a>
              <a href="#pricing" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Pricing</a>
              <a href="#faq" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">FAQ</a>
              <Link href="/blog" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Blog</Link>
              <Link href="/contact" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Contact</Link>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/login" className="text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors">
                Log in
              </Link>
              <Link href="/contact"
                className="hidden sm:inline-flex px-4 py-2 border border-gray-300 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-all">
                Talk to Us
              </Link>
              <Link href="/register"
                className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white text-sm font-bold rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all shadow-green-200 shadow-md">
                Start Free →
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ──────────────────────────────────────── HERO ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-green-950 to-slate-900 text-white pt-20 pb-28">
        {/* Decorative blobs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-green-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Trust badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-green-500/20 backdrop-blur border border-green-500/30 rounded-full text-green-300 text-sm font-semibold mb-8">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Official WhatsApp Cloud API Partner · Meta Verified
          </div>

          <h1 className="text-5xl md:text-7xl font-black leading-tight tracking-tight mb-6">
            Grow Your Business<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300">
              With WhatsApp
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-slate-300 max-w-3xl mx-auto mb-4 leading-relaxed">
            India's most trusted WhatsApp marketing platform. Send bulk campaigns, automate follow-ups,
            and convert leads — all in one powerful dashboard.
          </p>

          <p className="text-slate-400 text-base mb-10">
            Trusted by <strong className="text-white">500+ businesses</strong> across India ·
            <strong className="text-white"> 98M+ messages</strong> sent ·
            <strong className="text-green-400"> 78% average read rate</strong>
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link href="/register"
              className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-lg font-bold rounded-2xl hover:shadow-2xl hover:shadow-green-500/30 hover:scale-[1.03] transition-all shadow-xl">
              🚀 Start Free Trial — No Card Needed
            </Link>
            <Link href="/contact"
              className="px-8 py-4 border border-white/20 text-white text-lg font-semibold rounded-2xl hover:bg-white/10 transition-all backdrop-blur">
              💬 Talk to Us →
            </Link>
          </div>

          {/* Hero trust row */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-400">
            <span>✅ No credit card for trial</span>
            <span>✅ 14-day free access</span>
            <span>✅ 5 min setup</span>
            <span>✅ INR billing via UPI/Razorpay</span>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────── STATS ── */}
      <section className="bg-gradient-to-r from-green-600 to-emerald-600 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
            {stats.map(({ value, label }) => (
              <div key={label}>
                <p className="text-4xl font-black">{value}</p>
                <p className="text-green-100 text-sm mt-1 font-medium">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────── FEATURES ── */}
      <section id="features" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
              Everything You Need to<br />
              <span className="text-green-600">Dominate WhatsApp Marketing</span>
            </h2>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto">
              Built specifically for Indian SMEs and growing e-commerce brands. No bloat — just the features that drive revenue.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => (
              <div key={f.title}
                className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="text-base font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
              Live in <span className="text-green-600">Under 10 Minutes</span>
            </h2>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto">
              No developers needed. No complicated setup. Just connect and launch.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {howItWorks.map((item, i) => (
              <div key={item.step} className="relative text-center">
                {i < howItWorks.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-1/2 w-full h-0.5 bg-gradient-to-r from-green-200 to-green-100 z-0" />
                )}
                <div className="relative z-10 inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl text-3xl mx-auto mb-4 shadow-lg shadow-green-200">
                  {item.icon}
                </div>
                <div className="inline-block px-2 py-0.5 bg-green-100 text-green-700 text-xs font-black rounded-full mb-3 tracking-wider">
                  STEP {item.step}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────── AUTOMATION HIGHLIGHT ── */}
      <section className="py-24 bg-gradient-to-br from-purple-50 to-violet-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-bold mb-6">
                ⚡ Automation Engine
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6">
                Stop Losing Leads to<br />
                <span className="text-purple-600">Ignored Messages</span>
              </h2>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                On average, <strong>43% of WhatsApp messages go unread</strong> the first time.
                Techaasvik's automation engine automatically follows up at the right time
                — recovering leads your competitors give up on.
              </p>
              <ul className="space-y-4 mb-8">
                {[
                  'Auto-retry failed campaign deliveries after 2 hours',
                  'Re-schedule to unread contacts on Day 2, 5, or 7',
                  'Send a different follow-up message for cold contacts',
                  'Cap retries to respect opt-outs & WhatsApp policies',
                  'Track which automation touchpoint converted the lead',
                ].map(item => (
                  <li key={item} className="flex items-start gap-3 text-gray-700">
                    <span className="text-green-500 font-black mt-0.5">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link href="/register"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 hover:shadow-xl transition-all shadow-lg">
                Try Automation Free →
              </Link>
            </div>

            {/* Automation visual */}
            <div className="bg-white rounded-3xl p-6 shadow-2xl border border-purple-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Sample Automation Funnel</p>
              <div className="space-y-3">
                {[
                  { label: 'Campaign Launched', time: 'Day 1, 10:00 AM', icon: '🚀', color: 'bg-blue-50 border-blue-200 text-blue-800', badge: '1,000 contacts' },
                  { label: 'Delivered', time: 'Day 1, 10:05 AM', icon: '✅', color: 'bg-green-50 border-green-200 text-green-800', badge: '970 delivered' },
                  { label: 'Unread after 24h → Auto Follow-up', time: 'Day 2, 10:00 AM', icon: '📭→📨', color: 'bg-purple-50 border-purple-200 text-purple-800', badge: '420 re-sent' },
                  { label: 'Still Unread → Weekend Retry', time: 'Day 6, 09:00 AM', icon: '🔄', color: 'bg-amber-50 border-amber-200 text-amber-800', badge: '180 re-sent' },
                  { label: 'Total Conversions', time: 'After 7 days', icon: '💰', color: 'bg-emerald-50 border-emerald-200 text-emerald-800', badge: '₹2.4L revenue' },
                ].map(item => (
                  <div key={item.label} className={`flex items-center justify-between p-3 rounded-xl border ${item.color}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{item.icon}</span>
                      <div>
                        <p className="text-sm font-semibold">{item.label}</p>
                        <p className="text-xs opacity-70">{item.time}</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold px-2 py-1 bg-white/70 rounded-full">{item.badge}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────── TESTIMONIALS ── */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
              Real Results from<br />
              <span className="text-green-600">Real Indian Businesses</span>
            </h2>
            <p className="text-xl text-gray-500">Not marketing fluff — actual numbers from actual customers.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((t) => (
              <div key={t.name}
                className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200 hover:shadow-xl transition-all duration-300">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{t.name}</p>
                    <p className="text-sm text-gray-500">{t.role}</p>
                    <p className="text-xs text-green-600 font-semibold">📍 {t.location}</p>
                  </div>
                </div>
                <blockquote className="text-gray-600 text-sm leading-relaxed mb-4">
                  "{t.text}"
                </blockquote>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-black">
                  📈 {t.stat}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────── PRICING ── */}
      <section id="pricing" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
              Simple, <span className="text-green-600">INR Pricing</span>
            </h2>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto">
              No USD conversion. No hidden fees. Pay in ₹ via UPI, NEFT, or card. Cancel anytime.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
            {plans.map((plan) => {
              const borderColor = plan.popular ? 'border-purple-500 border-2' : 'border-gray-200';
              const headerBg = plan.popular
                ? 'bg-gradient-to-br from-purple-600 to-violet-600 text-white'
                : 'bg-white text-gray-900';
              return (
                <div key={plan.name}
                  className={`relative bg-white rounded-2xl border ${borderColor} overflow-hidden shadow-sm hover:shadow-xl transition-all`}>
                  {plan.popular && (
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-purple-500 to-violet-500" />
                  )}
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-purple-600 text-white text-xs font-black rounded-full whitespace-nowrap shadow-lg z-10">
                      ⭐ MOST POPULAR
                    </div>
                  )}
                  <div className={`p-6 ${plan.popular ? 'bg-gradient-to-br from-purple-600 to-violet-600' : ''}`}>
                    <h3 className={`font-black text-lg ${plan.popular ? 'text-white' : 'text-gray-900'}`}>{plan.name}</h3>
                    <p className={`text-sm mt-1 ${plan.popular ? 'text-purple-200' : 'text-gray-500'}`}>{plan.desc}</p>
                    <div className="mt-4 flex items-baseline gap-1">
                      <span className={`text-4xl font-black ${plan.popular ? 'text-white' : 'text-gray-900'}`}>{plan.price}</span>
                      <span className={`text-sm ${plan.popular ? 'text-purple-200' : 'text-gray-400'}`}>{plan.period}</span>
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    <ul className="space-y-2">
                      {plan.features.map(f => (
                        <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                          <span className="text-green-500 font-black mt-0.5 flex-shrink-0">✓</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Link href={plan.href}
                      className={`block w-full text-center px-5 py-3 rounded-xl font-bold text-sm transition-all hover:scale-[1.02] ${plan.popular
                        ? 'bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-lg shadow-purple-200 hover:shadow-xl'
                        : 'bg-gray-900 text-white hover:bg-gray-800'
                        }`}>
                      {plan.cta} →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-center text-sm text-gray-400 mt-8">
            * WhatsApp Cloud API conversation charges (₹0.38–₹0.58 per conversation) are billed separately by Meta. Not included in above plans.
          </p>
        </div>
      </section>

      {/* ──────────────────────────────────────── FAQ ── */}
      <section id="faq" className="py-24 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
              Frequently Asked <span className="text-green-600">Questions</span>
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="border border-gray-200 rounded-2xl p-6 hover:border-green-300 hover:shadow-md transition-all">
                <h3 className="font-bold text-gray-900 mb-2 flex items-start gap-2">
                  <span className="text-green-500 flex-shrink-0 mt-0.5">Q.</span>
                  {faq.q}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed pl-5">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────── FINAL CTA ── */}
      <section className="py-24 bg-gradient-to-br from-slate-900 via-green-950 to-slate-900 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-6xl font-black mb-6">
            India's Businesses Deserve<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300">
              Better Marketing
            </span>
          </h2>
          <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
            Start free today. No credit card. No commitment. Just powerful WhatsApp marketing that actually works.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register"
              className="px-10 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-lg font-black rounded-2xl hover:shadow-2xl hover:shadow-green-500/30 hover:scale-105 transition-all shadow-xl">
              🚀 Get Started Free
            </Link>
            <a href="mailto:support@techaasvik.com"
              className="px-8 py-4 border border-white/20 text-white font-semibold rounded-2xl hover:bg-white/10 transition-all">
              Talk to Us →
            </a>
          </div>
          <p className="mt-6 text-slate-500 text-sm">
            Questions? Email us at{' '}
            <a href="mailto:support@techaasvik.com" className="text-green-400 hover:underline">support@techaasvik.com</a>
            {' '}· We reply within 2 hours on business days
          </p>
        </div>
      </section>

      {/* ──────────────────────────────────────── FOOTER ── */}
      <footer className="bg-slate-950 text-slate-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 bg-gradient-to-br from-green-500 to-green-700 rounded-lg flex items-center justify-center">
                  <span className="text-white font-black text-xs">T</span>
                </div>
                <span className="text-white font-black">Techaasvik</span>
              </div>
              <p className="text-sm leading-relaxed">WhatsApp marketing platform built for Indian businesses. Official Meta Cloud API partner.</p>
            </div>
            <div>
              <p className="text-white font-semibold mb-3 text-sm">Product</p>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
              </ul>
            </div>
            <div>
              <p className="text-white font-semibold mb-3 text-sm">Legal</p>
              <ul className="space-y-2 text-sm">
                <li><a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="/terms" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="/refunds" className="hover:text-white transition-colors">Refund Policy</a></li>
                <li><a href="/disclaimer" className="hover:text-white transition-colors">Disclaimer</a></li>
              </ul>
            </div>
            <div>
              <p className="text-white font-semibold mb-3 text-sm">Resources</p>
              <ul className="space-y-2 text-sm">
                <li><a href="/blog" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="/contact" className="hover:text-white transition-colors">Talk to Us</a></li>
                <li><a href="/sitemap.xml" className="hover:text-white transition-colors">Sitemap</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-600">
              © 2026 Techaasvik · Made with ❤️ in India · GSTIN: XXXXXXXXXXXXX
            </p>
            <p className="text-xs text-slate-600">
              WhatsApp™ and the WhatsApp logo are trademarks of Meta Platforms Inc. Techaasvik is an independent service provider.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
