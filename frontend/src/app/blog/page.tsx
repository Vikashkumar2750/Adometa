import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'Blog | Techaasvik — WhatsApp Marketing Tips, Guides & Case Studies',
    description: 'Expert insights on WhatsApp marketing, bulk messaging best practices, automation strategies, and growth tactics for Indian businesses.',
    keywords: 'WhatsApp marketing blog, WhatsApp tips India, bulk WhatsApp guide, WhatsApp automation tutorial, WhatsApp business case studies',
};

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

async function getPosts(category?: string) {
    try {
        const url = `${API}/blog/public?limit=12${category ? `&category=${category}` : ''}`;
        const res = await fetch(url, { next: { revalidate: 300 } });
        if (!res.ok) return { data: [], total: 0 };
        return res.json();
    } catch {
        return { data: [], total: 0 };
    }
}

async function getCategories(): Promise<string[]> {
    try {
        const res = await fetch(`${API}/blog/public/categories`, { next: { revalidate: 600 } });
        if (!res.ok) return [];
        return res.json();
    } catch {
        return [];
    }
}

function PostCard({ post }: { post: any }) {
    return (
        <article className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
            {post.cover_image && (
                <div className="aspect-video overflow-hidden bg-gray-100">
                    <img src={post.cover_image} alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
            )}
            {!post.cover_image && (
                <div className="aspect-video bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                    <span className="text-5xl">📱</span>
                </div>
            )}
            <div className="p-5">
                {post.category && (
                    <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full mb-3">
                        {post.category}
                    </span>
                )}
                <h2 className="font-bold text-gray-900 text-lg leading-snug mb-2 group-hover:text-green-600 transition-colors">
                    <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                </h2>
                {post.excerpt && (
                    <p className="text-gray-500 text-sm leading-relaxed line-clamp-2 mb-4">{post.excerpt}</p>
                )}
                <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>{post.author_name || 'Techaasvik Team'}</span>
                    <div className="flex items-center gap-3">
                        {post.reading_time_minutes && <span>⏱ {post.reading_time_minutes} min read</span>}
                        {post.published_at && (
                            <span>{new Date(post.published_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        )}
                    </div>
                </div>
            </div>
        </article>
    );
}

export default async function BlogPage({ searchParams }: { searchParams: { category?: string } }) {
    const category = searchParams?.category;
    const [{ data: posts }, categories] = await Promise.all([getPosts(category), getCategories()]);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Nav */}
            <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                            <span className="text-white font-black text-sm">T</span>
                        </div>
                        <span className="font-black text-gray-900 text-xl">Techaasvik</span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">Home</Link>
                        <Link href="/contact" className="text-sm text-gray-600 hover:text-gray-900">Contact</Link>
                        <Link href="/register" className="px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700 transition-colors">
                            Start Free →
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <div className="bg-gradient-to-br from-slate-900 via-green-950 to-slate-900 text-white py-16 text-center">
                <h1 className="text-4xl md:text-5xl font-black mb-3">
                    WhatsApp Marketing{' '}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300">
                        Blog
                    </span>
                </h1>
                <p className="text-slate-300 text-lg max-w-2xl mx-auto">
                    Actionable guides, case studies, and expert tips to grow your business with WhatsApp.
                </p>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-12">
                {/* Category filter */}
                {categories.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-10">
                        <Link href="/blog"
                            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${!category ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-400'}`}>
                            All Posts
                        </Link>
                        {categories.map(cat => (
                            <Link key={cat} href={`/blog?category=${encodeURIComponent(cat)}`}
                                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${category === cat ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-400'}`}>
                                {cat}
                            </Link>
                        ))}
                    </div>
                )}

                {/* Posts grid */}
                {posts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {posts.map((post: any) => (
                            <PostCard key={post.id} post={post} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-24">
                        <div className="text-6xl mb-4">📝</div>
                        <h2 className="text-2xl font-bold text-gray-700 mb-2">No posts yet</h2>
                        <p className="text-gray-400">Check back soon — our team is publishing new content.</p>
                    </div>
                )}
            </div>

            {/* CTA */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 py-16 text-center text-white">
                <h2 className="text-3xl font-black mb-3">Ready to start growing with WhatsApp?</h2>
                <p className="text-green-100 mb-6">Join 500+ Indian businesses already using Techaasvik.</p>
                <Link href="/register"
                    className="inline-block px-8 py-3.5 bg-white text-green-700 font-black rounded-2xl hover:shadow-xl hover:scale-105 transition-all">
                    Start Free Trial →
                </Link>
            </div>

            <footer className="bg-slate-900 text-slate-400 py-8 text-center text-sm">
                <div className="flex justify-center gap-6 mb-3">
                    <Link href="/privacy" className="hover:text-white">Privacy</Link>
                    <Link href="/terms" className="hover:text-white">Terms</Link>
                    <Link href="/contact" className="hover:text-white">Contact</Link>
                </div>
                © 2026 Techaasvik. All rights reserved.
            </footer>
        </div>
    );
}
