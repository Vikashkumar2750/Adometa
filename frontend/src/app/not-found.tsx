import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-950 to-slate-900 flex items-center justify-center p-6 text-white">
            <div className="text-center max-w-lg">
                {/* Big 404 */}
                <div className="text-[120px] font-black leading-none text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300 mb-4 select-none">
                    404
                </div>
                <h1 className="text-3xl font-black mb-4">Page Not Found</h1>
                <p className="text-slate-300 text-lg mb-8">
                    The page you're looking for doesn't exist or has been moved.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link href="/"
                        className="px-8 py-3.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-xl hover:shadow-xl hover:shadow-green-500/30 hover:scale-105 transition-all">
                        🏠 Go to Homepage
                    </Link>
                    <Link href="/blog"
                        className="px-8 py-3.5 border border-white/20 text-white font-semibold rounded-xl hover:bg-white/10 transition-all">
                        📝 Read Our Blog
                    </Link>
                    <Link href="/contact"
                        className="px-8 py-3.5 border border-white/20 text-white font-semibold rounded-xl hover:bg-white/10 transition-all">
                        💬 Contact Support
                    </Link>
                </div>

                <p className="mt-10 text-slate-500 text-sm">
                    Lost? Email us at{' '}
                    <a href="mailto:support@techaasvik.com" className="text-green-400 hover:underline">
                        support@techaasvik.com
                    </a>
                </p>
            </div>
        </div>
    );
}
