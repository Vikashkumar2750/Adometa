import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

async function getPost(slug: string) {
    try {
        const res = await fetch(`${API}/blog/public/${slug}`, { next: { revalidate: 300 } });
        if (!res.ok) return null;
        return res.json();
    } catch { return null; }
}

export async function generateStaticParams() {
    try {
        const res = await fetch(`${API}/blog/public?limit=500`);
        if (res.ok) {
            const { data } = await res.json();
            return (data || []).map((post: any) => ({
                slug: post.slug,
            }));
        }
    } catch { }
    // Fallback: If API is down during build, return empty array
    // Note: Next.js won't pre-build any blog posts if this happens
    return [];
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
    const post = await getPost(params.slug);
    if (!post) return { title: 'Post Not Found | Techaasvik Blog' };

    return {
        title: post.seo_title || `${post.title} | Techaasvik Blog`,
        description: post.seo_description || post.excerpt,
        keywords: [post.focus_keyword, ...(post.secondary_keywords || [])].filter(Boolean).join(', '),
        robots: post.robots_meta || 'index,follow',
        openGraph: {
            title: post.og_title || post.seo_title || post.title,
            description: post.og_description || post.seo_description || post.excerpt,
            images: post.og_image ? [post.og_image] : [],
            type: 'article',
            publishedTime: post.published_at,
            authors: post.author_name ? [post.author_name] : ['Techaasvik Team'],
        },
        alternates: {
            canonical: post.canonical_url || `https://adometa.techaasvik.in/blog/${post.slug}`,
        },
    };
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
    const post = await getPost(params.slug);
    if (!post) notFound();

    // Build JSON-LD
    const jsonLd = post.schema_markup || {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: post.title,
        description: post.excerpt,
        image: post.og_image || post.cover_image,
        author: { '@type': 'Person', name: post.author_name || 'Techaasvik Team' },
        publisher: {
            '@type': 'Organization',
            name: 'Techaasvik',
            logo: { '@type': 'ImageObject', url: 'https://adometa.techaasvik.in/logo.png' },
        },
        datePublished: post.published_at,
        dateModified: post.updated_at,
    };

    return (
        <div className="min-h-screen bg-white">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

            {/* Nav */}
            <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                            <span className="text-white font-black text-xs">T</span>
                        </div>
                        <span className="font-black text-gray-900">Techaasvik</span>
                    </Link>
                    <Link href="/blog" className="text-sm text-gray-500 hover:text-gray-900">← All Posts</Link>
                </div>
            </nav>

            <article className="max-w-3xl mx-auto px-4 py-12">
                {/* Meta */}
                <div className="mb-6">
                    {post.category && (
                        <Link href={`/blog?category=${post.category}`}
                            className="inline-block px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full mb-4 hover:bg-green-200 transition-colors">
                            {post.category}
                        </Link>
                    )}
                    <h1 className="text-4xl md:text-5xl font-black text-gray-900 leading-tight mb-4">{post.title}</h1>
                    {post.excerpt && (
                        <p className="text-xl text-gray-500 leading-relaxed mb-6">{post.excerpt}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-400 border-b border-gray-100 pb-6">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
                                {(post.author_name || 'T')[0]}
                            </div>
                            <span className="font-medium text-gray-700">{post.author_name || 'Techaasvik Team'}</span>
                        </div>
                        {post.published_at && (
                            <span>{new Date(post.published_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                        )}
                        {post.reading_time_minutes && <span>⏱ {post.reading_time_minutes} min read</span>}
                        {post.word_count && <span>{post.word_count.toLocaleString()} words</span>}
                    </div>
                </div>

                {/* Cover image */}
                {post.cover_image && (
                    <div className="rounded-2xl overflow-hidden mb-8 aspect-video bg-gray-100">
                        <img src={post.cover_image} alt={post.title} className="w-full h-full object-cover" />
                    </div>
                )}

                {/* Content */}
                <div
                    className="prose prose-lg max-w-none
                        prose-headings:font-black prose-headings:text-gray-900
                        prose-p:text-gray-600 prose-p:leading-relaxed
                        prose-a:text-green-600 prose-a:no-underline hover:prose-a:underline
                        prose-strong:text-gray-900
                        prose-ul:text-gray-600 prose-ol:text-gray-600
                        prose-blockquote:border-l-green-500 prose-blockquote:text-gray-500
                        prose-code:bg-gray-100 prose-code:text-green-700 prose-code:px-1 prose-code:rounded
                        prose-img:rounded-xl"
                    dangerouslySetInnerHTML={{ __html: post.content }}
                />

                {/* Tags */}
                {post.tags?.length > 0 && (
                    <div className="mt-10 pt-6 border-t border-gray-100">
                        <p className="text-sm font-bold text-gray-500 mb-3">Tags</p>
                        <div className="flex flex-wrap gap-2">
                            {post.tags.map((tag: string) => (
                                <span key={tag} className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">{tag}</span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Author bio */}
                {post.author_bio && (
                    <div className="mt-10 p-6 bg-gray-50 rounded-2xl border border-gray-100">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center text-white font-black text-lg flex-shrink-0">
                                {(post.author_name || 'T')[0]}
                            </div>
                            <div>
                                <p className="font-bold text-gray-900">{post.author_name}</p>
                                <p className="text-gray-500 text-sm leading-relaxed mt-1">{post.author_bio}</p>
                            </div>
                        </div>
                    </div>
                )}
            </article>

            {/* CTA */}
            <div className="bg-gradient-to-br from-slate-900 via-green-950 to-slate-900 py-16 text-center text-white mt-12">
                <h2 className="text-3xl font-black mb-3">Ready to try WhatsApp marketing?</h2>
                <p className="text-slate-300 mb-6">Start your 14-day free trial. No credit card required.</p>
                <Link href="/register"
                    className="inline-block px-8 py-3.5 bg-gradient-to-r from-green-500 to-emerald-500 font-black text-white rounded-2xl hover:shadow-xl hover:scale-105 transition-all">
                    Get Started Free →
                </Link>
            </div>

            <footer className="bg-slate-950 text-slate-400 py-8 text-center text-sm">
                <div className="flex justify-center gap-6 mb-2">
                    <Link href="/blog" className="hover:text-white">Blog</Link>
                    <Link href="/privacy" className="hover:text-white">Privacy</Link>
                    <Link href="/terms" className="hover:text-white">Terms</Link>
                    <Link href="/contact" className="hover:text-white">Contact</Link>
                </div>
                © 2026 Techaasvik. All rights reserved.
            </footer>
        </div>
    );
}
