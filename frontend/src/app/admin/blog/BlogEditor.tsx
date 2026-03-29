'use client';
/**
 * Reusable Blog Post Editor
 * Used by both /admin/blog/create and /admin/blog/[id]/edit
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { useAuthStore } from '@/lib/auth-store';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// ── Helpers ─────────────────────────────────────────────────────
function slugify(s: string) {
    return s.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-');
}
function stripHtml(html: string) {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}
function wordCount(text: string) { return text.split(/\s+/).filter(Boolean).length; }
function readingTime(wc: number) { return Math.max(1, Math.round(wc / 200)); }
function keywordDensity(text: string, kw: string): number {
    if (!kw || !text) return 0;
    const words = text.toLowerCase().split(/\s+/).filter(Boolean);
    const count = words.filter(w => w.includes(kw.toLowerCase())).length;
    return words.length > 0 ? +((count / words.length) * 100).toFixed(2) : 0;
}

// ── SEO Analysis Engine ──────────────────────────────────────────
interface SEOCheck { label: string; status: 'good' | 'warn' | 'bad' | 'na'; detail: string; }
function runSeoAnalysis(post: any, plain: string): { score: number; checks: SEOCheck[] } {
    const kw = (post.focus_keyword || '').toLowerCase();
    const title = post.seo_title || post.title || '';
    const desc = post.seo_description || '';
    const wc = wordCount(plain);
    const density = keywordDensity(plain, kw);
    const checks: SEOCheck[] = [
        {
            label: 'Focus keyword set',
            status: kw ? 'good' : 'bad',
            detail: kw ? `Focus keyword: "${post.focus_keyword}"` : 'Set a focus keyword for SEO analysis',
        },
        {
            label: 'SEO Title length (50–60 chars)',
            status: title.length >= 50 && title.length <= 60 ? 'good' : title.length > 0 ? 'warn' : 'bad',
            detail: `${title.length} characters. Recommended: 50–60.`,
        },
        {
            label: 'Keyword in SEO title',
            status: kw && title.toLowerCase().includes(kw) ? 'good' : kw ? 'bad' : 'na',
            detail: kw && title.toLowerCase().includes(kw) ? 'Keyword found in title ✓' : 'Add your focus keyword to the SEO title',
        },
        {
            label: 'Meta description length (120–160 chars)',
            status: desc.length >= 120 && desc.length <= 160 ? 'good' : desc.length > 0 ? 'warn' : 'bad',
            detail: `${desc.length} characters. Recommended: 120–160.`,
        },
        {
            label: 'Keyword in meta description',
            status: kw && desc.toLowerCase().includes(kw) ? 'good' : kw ? 'warn' : 'na',
            detail: kw && desc.toLowerCase().includes(kw) ? 'Keyword found in description ✓' : 'Include the keyword in your meta description',
        },
        {
            label: 'Keyword in slug / URL',
            status: kw && (post.slug || '').toLowerCase().includes(kw.replace(/\s+/g, '-')) ? 'good' : kw ? 'warn' : 'na',
            detail: (post.slug || '').replace(/-/g, ' ').includes((kw || '')) ? 'Keyword in URL ✓' : 'Consider including the keyword in the URL slug',
        },
        {
            label: 'Keyword density (0.5%–2.5%)',
            status: density >= 0.5 && density <= 2.5 ? 'good' : density > 0 ? 'warn' : 'bad',
            detail: `${density}% density. Optimal: 0.5–2.5%.`,
        },
        {
            label: 'Content length (300+ words)',
            status: wc >= 1000 ? 'good' : wc >= 300 ? 'warn' : 'bad',
            detail: `${wc.toLocaleString()} words. 1000+ is excellent.`,
        },
        {
            label: 'OG / Social image set',
            status: post.og_image ? 'good' : 'warn',
            detail: post.og_image ? 'OG image is set ✓' : 'Set an OG image for better social sharing',
        },
        {
            label: 'Tags added',
            status: (post.tags || []).length >= 3 ? 'good' : (post.tags || []).length > 0 ? 'warn' : 'bad',
            detail: `${(post.tags || []).length} tags. Add 3–7 relevant tags.`,
        },
    ];

    const score = Math.round(
        (checks.reduce((acc, c) => acc + (c.status === 'good' ? 10 : c.status === 'warn' ? 5 : 0), 0) / (checks.filter(c => c.status !== 'na').length * 10)) * 100
    );

    return { score, checks };
}

// ── Readability Analysis ─────────────────────────────────────────
interface ReadCheck { label: string; status: 'good' | 'warn' | 'bad'; detail: string; }
function runReadabilityAnalysis(plain: string, post: any): { score: number; checks: ReadCheck[] } {
    const sentences = plain.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = plain.split(/\s+/).filter(Boolean);
    const avgWordsPerSentence = sentences.length > 0 ? words.length / sentences.length : 0;
    const paragraphs = (post.content || '').split(/<\/p>/i).filter((p: string) => p.trim().length > 10);
    const longSentences = sentences.filter(s => s.trim().split(/\s+/).length > 20).length;
    const passiveVoice = (plain.match(/\b(is|are|was|were|be|been|being)\s+\w+ed\b/gi) || []).length;

    const checks: ReadCheck[] = [
        {
            label: 'Average sentence length (< 20 words)',
            status: avgWordsPerSentence <= 14 ? 'good' : avgWordsPerSentence <= 20 ? 'warn' : 'bad',
            detail: `${avgWordsPerSentence.toFixed(1)} words/sentence. Aim for under 20.`,
        },
        {
            label: 'Long sentences (< 25% of total)',
            status: sentences.length > 0 && (longSentences / sentences.length) < 0.15 ? 'good' : (longSentences / sentences.length) < 0.25 ? 'warn' : 'bad',
            detail: `${longSentences} long sentences (${sentences.length > 0 ? ((longSentences / sentences.length) * 100).toFixed(0) : 0}%). Keep below 25%.`,
        },
        {
            label: 'Paragraph structure',
            status: paragraphs.length >= 3 ? 'good' : paragraphs.length >= 1 ? 'warn' : 'bad',
            detail: `${paragraphs.length} paragraphs detected. Break text into clear paragraphs.`,
        },
        {
            label: 'Passive voice usage (< 10%)',
            status: passiveVoice <= 2 ? 'good' : passiveVoice <= 5 ? 'warn' : 'bad',
            detail: `~${passiveVoice} passive constructions detected. Prefer active voice.`,
        },
        {
            label: 'Subheadings used (H2/H3)',
            status: /<h[23]/i.test(post.content || '') ? 'good' : words.length > 300 ? 'warn' : 'good',
            detail: /<h[23]/i.test(post.content || '') ? 'Subheadings present ✓' : 'Add H2/H3 subheadings for scanability',
        },
    ];

    const score = Math.round(
        (checks.reduce((acc, c) => acc + (c.status === 'good' ? 20 : c.status === 'warn' ? 10 : 0), 0))
    );

    return { score, checks };
}

// ── StatusBadge ──────────────────────────────────────────────────
function StatusIcon({ s }: { s: 'good' | 'warn' | 'bad' | 'na' }) {
    if (s === 'good') return <span className="text-green-500 text-base">✓</span>;
    if (s === 'warn') return <span className="text-yellow-500 text-base">◐</span>;
    if (s === 'bad') return <span className="text-red-400 text-base">✗</span>;
    return <span className="text-gray-300 text-base">—</span>;
}

function ScoreCircle({ score }: { score: number }) {
    const color = score >= 70 ? '#22c55e' : score >= 40 ? '#eab308' : '#ef4444';
    const label = score >= 70 ? 'Good' : score >= 40 ? 'Fair' : 'Poor';
    return (
        <div className="flex flex-col items-center">
            <svg width="64" height="64" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.9" fill="none" stroke={color} strokeWidth="3"
                    strokeDasharray={`${score} ${100 - score}`} strokeDashoffset="25" strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 0.5s ease' }} />
                <text x="18" y="22" textAnchor="middle" fontSize="9" fontWeight="bold" fill={color}>{score}</text>
            </svg>
            <p className="text-xs font-bold mt-1" style={{ color }}>{label}</p>
        </div>
    );
}

// ── Main Editor ──────────────────────────────────────────────────
interface BlogEditorProps {
    postId?: string; // undefined = create mode
}

const INITIAL: any = {
    title: '', slug: '', content: '', excerpt: '', cover_image: '',
    author_name: 'Techaasvik Team', author_bio: '',
    category: '', tags: [],
    seo_title: '', seo_description: '', focus_keyword: '',
    secondary_keywords: [],
    og_title: '', og_description: '', og_image: '',
    canonical_url: '', robots_meta: 'index,follow',
    schema_markup: null,
    status: 'DRAFT', featured: false,
};

export default function BlogEditor({ postId }: BlogEditorProps) {
    const token = useAuthStore(s => s.token);
    const router = useRouter();
    const [post, setPost] = useState<any>(INITIAL);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'content' | 'seo' | 'social' | 'advanced' | 'readability'>('content');
    const [tagInput, setTagInput] = useState('');
    const [secKwInput, setSecKwInput] = useState('');
    const [loadingPost, setLoadingPost] = useState(!!postId);
    const headers = { Authorization: `Bearer ${token}` };

    // Load existing post
    useEffect(() => {
        if (!postId) return;
        axios.get(`${API}/blog/${postId}`, { headers }).then(r => {
            setPost({ ...INITIAL, ...r.data, tags: r.data.tags || [], secondary_keywords: r.data.secondary_keywords || [] });
            setLoadingPost(false);
        }).catch(() => { toast.error('Failed to load post'); setLoadingPost(false); });
    }, [postId]);

    // Auto-generate slug from title (only in create mode and slug not manually set)
    const slugTouched = useRef(false);
    const handleTitleChange = (val: string) => {
        setPost((p: any) => ({ ...p, title: val, ...(!slugTouched.current ? { slug: slugify(val) } : {}) }));
    };

    const set = (key: string, val: any) => setPost((p: any) => ({ ...p, [key]: val }));

    // Derived stats
    const plain = stripHtml(post.content || '');
    const wc = wordCount(plain);
    const rt = readingTime(wc);
    const kd = keywordDensity(plain, post.focus_keyword || '');
    const seoAnalysis = runSeoAnalysis(post, plain);
    const readAnalysis = runReadabilityAnalysis(plain, post);

    const handleSave = async (publishNow = false) => {
        if (!post.title.trim()) return toast.error('Title is required');
        setSaving(true);
        try {
            const payload = { ...post };
            if (publishNow) payload.status = 'PUBLISHED';
            if (postId) {
                await axios.patch(`${API}/blog/${postId}`, payload, { headers });
                toast.success(publishNow ? '🟢 Published!' : '✅ Saved');
            } else {
                const { data } = await axios.post(`${API}/blog`, payload, { headers });
                toast.success(publishNow ? '🟢 Published!' : '✅ Post created');
                router.push(`/admin/blog/${data.id}/edit`);
            }
        } catch (err: any) {
            const msg = err.response?.data?.message;
            toast.error(Array.isArray(msg) ? msg[0] : msg || 'Save failed');
        } finally { setSaving(false); }
    };

    const addTag = () => {
        const t = tagInput.trim();
        if (t && !post.tags.includes(t)) set('tags', [...post.tags, t]);
        setTagInput('');
    };
    const removeTag = (t: string) => set('tags', post.tags.filter((x: string) => x !== t));

    const addSecKw = () => {
        const k = secKwInput.trim();
        if (k && !(post.secondary_keywords || []).includes(k)) set('secondary_keywords', [...(post.secondary_keywords || []), k]);
        setSecKwInput('');
    };
    const removeSecKw = (k: string) => set('secondary_keywords', (post.secondary_keywords || []).filter((x: string) => x !== k));

    if (loadingPost) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading post...</div>;

    const tabs = [
        { id: 'content', label: '📝 Content' },
        { id: 'seo', label: '🔍 SEO' },
        { id: 'social', label: '📲 Social' },
        { id: 'readability', label: '📖 Readability' },
        { id: 'advanced', label: '⚙️ Advanced' },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <Toaster position="top-center" />

            {/* Top bar */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-50 px-4 py-3">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link href="/admin/blog" className="text-sm text-gray-500 hover:text-gray-900">← Blog</Link>
                        <span className="text-gray-300">|</span>
                        <h1 className="font-black text-gray-900 text-lg">{postId ? 'Edit Post' : 'New Post'}</h1>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${post.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {post.status}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Stats strip */}
                        <div className="hidden md:flex items-center gap-4 text-xs text-gray-400 mr-4">
                            <span>📄 {wc.toLocaleString()} words</span>
                            <span>⏱ {rt} min</span>
                            <span>🔑 {kd}% density</span>
                        </div>
                        <button onClick={() => handleSave(false)} disabled={saving}
                            className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60">
                            {saving ? 'Saving...' : '💾 Save Draft'}
                        </button>
                        <button onClick={() => handleSave(true)} disabled={saving}
                            className="px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700 disabled:opacity-60">
                            {saving ? '...' : post.status === 'PUBLISHED' ? '✓ Update & Publish' : '🟢 Publish'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-4 grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Main editor */}
                <div className="xl:col-span-2 space-y-4">
                    {/* Title */}
                    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                        <input value={post.title} onChange={e => handleTitleChange(e.target.value)}
                            placeholder="Post title..."
                            className="w-full text-3xl font-black text-gray-900 placeholder-gray-300 border-none outline-none resize-none" />
                        <div className="mt-3 flex items-center gap-2">
                            <span className="text-xs text-gray-400">Slug:</span>
                            <span className="text-xs text-gray-400">/blog/</span>
                            <input value={post.slug}
                                onChange={e => { slugTouched.current = true; set('slug', e.target.value); }}
                                className="text-xs text-green-600 font-mono border-b border-dashed border-gray-300 outline-none flex-1 min-w-0 bg-transparent" />
                            <button onClick={() => { slugTouched.current = true; set('slug', slugify(post.title)); }}
                                className="text-xs text-gray-400 hover:text-gray-600 underline">↺ regen</button>
                        </div>
                    </div>

                    {/* Content area */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        {/* Basic formatting toolbar */}
                        <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-100 bg-gray-50 flex-wrap">
                            {[
                                ['H1', 'h1'], ['H2', 'h2'], ['H3', 'h3'],
                            ].map(([label, tag]) => (
                                <button key={tag} title={label}
                                    onClick={() => set('content', post.content + `<${tag}>${label}</${tag}>\n`)}
                                    className="px-2 py-1 text-xs font-bold bg-white border border-gray-200 rounded hover:bg-gray-100">{label}</button>
                            ))}
                            <span className="text-gray-200 mx-1">|</span>
                            <button onClick={() => set('content', post.content + '<strong>Bold text</strong>')}
                                className="px-2 py-1 text-xs font-bold bg-white border border-gray-200 rounded hover:bg-gray-100 font-bold">B</button>
                            <button onClick={() => set('content', post.content + '<em>Italic text</em>')}
                                className="px-2 py-1 text-xs bg-white border border-gray-200 rounded hover:bg-gray-100 italic">I</button>
                            <button onClick={() => set('content', post.content + '<ul>\n<li>Item 1</li>\n<li>Item 2</li>\n</ul>\n')}
                                className="px-2 py-1 text-xs bg-white border border-gray-200 rounded hover:bg-gray-100">• List</button>
                            <button onClick={() => set('content', post.content + '<ol>\n<li>Item 1</li>\n<li>Item 2</li>\n</ol>\n')}
                                className="px-2 py-1 text-xs bg-white border border-gray-200 rounded hover:bg-gray-100">1. OL</button>
                            <button onClick={() => set('content', post.content + '<blockquote>Quote text</blockquote>\n')}
                                className="px-2 py-1 text-xs bg-white border border-gray-200 rounded hover:bg-gray-100">" Quote</button>
                            <button onClick={() => set('content', post.content + `<a href="URL">Link text</a>`)}
                                className="px-2 py-1 text-xs bg-white border border-gray-200 rounded hover:bg-gray-100">🔗 Link</button>
                            <button onClick={() => set('content', post.content + '<img src="URL" alt="description" />\n')}
                                className="px-2 py-1 text-xs bg-white border border-gray-200 rounded hover:bg-gray-100">🖼 Img</button>
                            <button onClick={() => set('content', post.content + '<p></p>\n')}
                                className="px-2 py-1 text-xs bg-white border border-gray-200 rounded hover:bg-gray-100">¶ P</button>
                            <span className="text-gray-200 mx-1">|</span>
                            <span className="text-xs text-gray-400 ml-auto">{wc.toLocaleString()} words · {rt} min read</span>
                        </div>
                        <textarea value={post.content} onChange={e => set('content', e.target.value)}
                            placeholder={'<p>Start writing your blog post here...</p>\n\n<h2>Add a subheading</h2>\n<p>Continue writing...</p>'}
                            rows={28}
                            className="w-full px-5 py-4 font-mono text-sm text-gray-700 leading-relaxed outline-none resize-none border-none" />
                    </div>

                    {/* Excerpt */}
                    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Excerpt <span className="font-normal text-gray-400">(auto-generated if blank)</span></label>
                        <textarea value={post.excerpt} onChange={e => set('excerpt', e.target.value)}
                            rows={3} placeholder="Short summary shown in blog listings..."
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none" />
                    </div>
                </div>

                {/* Right panel */}
                <div className="xl:col-span-1 space-y-4">
                    {/* Score overview */}
                    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <p className="font-bold text-gray-700 text-sm">Content Analysis</p>
                        </div>
                        <div className="flex items-center gap-6 justify-center">
                            <div className="text-center">
                                <ScoreCircle score={seoAnalysis.score} />
                                <p className="text-xs text-gray-400 mt-1">SEO Score</p>
                            </div>
                            <div className="text-center">
                                <ScoreCircle score={readAnalysis.score} />
                                <p className="text-xs text-gray-400 mt-1">Readability</p>
                            </div>
                        </div>
                    </div>

                    {/* Tab nav */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="flex border-b border-gray-100 overflow-x-auto">
                            {tabs.map(t => (
                                <button key={t.id} onClick={() => setActiveTab(t.id as any)}
                                    className={`px-3 py-2.5 text-xs font-bold whitespace-nowrap transition-colors ${activeTab === t.id ? 'border-b-2 border-green-500 text-green-600 bg-green-50' : 'text-gray-500 hover:text-gray-700'}`}>
                                    {t.label}
                                </button>
                            ))}
                        </div>

                        <div className="p-4 space-y-3">
                            {/* ── CONTENT tab ─── */}
                            {activeTab === 'content' && <>
                                <Field label="Cover Image URL" value={post.cover_image} onChange={v => set('cover_image', v)} placeholder="https://..." />
                                {post.cover_image && <img src={post.cover_image} alt="cover preview" className="rounded-xl w-full aspect-video object-cover" />}
                                <Field label="Author Name" value={post.author_name} onChange={v => set('author_name', v)} />
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Author Bio</label>
                                    <textarea value={post.author_bio} onChange={e => set('author_bio', e.target.value)}
                                        rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs resize-none focus:outline-none focus:ring-2 focus:ring-green-300"
                                        placeholder="Short bio shown at the bottom of the post" />
                                </div>
                                <Field label="Category" value={post.category} onChange={v => set('category', v)} placeholder="e.g. WhatsApp Marketing" />
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Tags</label>
                                    <div className="flex flex-wrap gap-1 mb-1.5">
                                        {post.tags.map((t: string) => (
                                            <span key={t} className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                                                {t} <button onClick={() => removeTag(t)} className="hover:text-red-500">×</button>
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && addTag()}
                                            placeholder="Add tag + press Enter" className="flex-1 px-3 py-1.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-green-300" />
                                        <button onClick={addTag} className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-xl font-bold">+</button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 pt-1">
                                    <input type="checkbox" id="featured" checked={post.featured} onChange={e => set('featured', e.target.checked)} className="accent-green-500" />
                                    <label htmlFor="featured" className="text-xs text-gray-600 font-semibold">Mark as Featured Post</label>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Status</label>
                                    <select value={post.status} onChange={e => set('status', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-green-300">
                                        <option value="DRAFT">Draft</option>
                                        <option value="PUBLISHED">Published</option>
                                        <option value="ARCHIVED">Archived</option>
                                    </select>
                                </div>
                            </>}

                            {/* ── SEO tab ─── */}
                            {activeTab === 'seo' && <>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">
                                        Focus Keyword
                                        <span className={`ml-2 px-1.5 py-0.5 rounded text-xs font-bold ${kd >= 0.5 && kd <= 2.5 ? 'bg-green-100 text-green-700' : kd > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-500'}`}>
                                            Density: {kd}%
                                        </span>
                                    </label>
                                    <input value={post.focus_keyword} onChange={e => set('focus_keyword', e.target.value)}
                                        placeholder="e.g. WhatsApp marketing India"
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-green-300" />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">
                                        SEO Title
                                        <span className={`ml-2 text-xs ${post.seo_title.length > 60 ? 'text-red-500' : post.seo_title.length >= 50 ? 'text-green-600' : 'text-yellow-600'}`}>
                                            {post.seo_title.length}/60
                                        </span>
                                    </label>
                                    <input value={post.seo_title} onChange={e => set('seo_title', e.target.value)}
                                        placeholder={post.title || 'Overrides post title in search results'}
                                        maxLength={70}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-green-300" />
                                    {/* Live SERP preview */}
                                    <div className="mt-2 p-3 bg-white border border-gray-100 rounded-xl">
                                        <p className="text-[#1a0dab] text-sm font-normal leading-5 hover:underline cursor-pointer line-clamp-1">
                                            {post.seo_title || post.title || 'Your SEO title...'}
                                        </p>
                                        <p className="text-xs text-[#006621]">adometa.techaasvik.in › blog › {post.slug || 'your-post'}</p>
                                        <p className="text-xs text-[#545454] line-clamp-2 mt-0.5">{post.seo_description || 'Your meta description will appear here. Make it compelling!'}</p>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">
                                        Meta Description
                                        <span className={`ml-2 text-xs ${post.seo_description.length > 160 ? 'text-red-500' : post.seo_description.length >= 120 ? 'text-green-600' : 'text-yellow-600'}`}>
                                            {post.seo_description.length}/160
                                        </span>
                                    </label>
                                    <textarea value={post.seo_description} onChange={e => set('seo_description', e.target.value)}
                                        rows={3} maxLength={170}
                                        placeholder="Compelling description that appears in search results (120–160 chars)"
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs resize-none focus:outline-none focus:ring-2 focus:ring-green-300" />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Secondary Keywords</label>
                                    <div className="flex flex-wrap gap-1 mb-1.5">
                                        {(post.secondary_keywords || []).map((k: string) => (
                                            <span key={k} className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                                                {k} <button onClick={() => removeSecKw(k)} className="hover:text-red-500">×</button>
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <input value={secKwInput} onChange={e => setSecKwInput(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && addSecKw()}
                                            placeholder="LSI keyword + Enter"
                                            className="flex-1 px-3 py-1.5 border border-gray-200 rounded-xl text-xs focus:outline-none" />
                                        <button onClick={addSecKw} className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-xl font-bold">+</button>
                                    </div>
                                </div>

                                {/* SEO Checklist */}
                                <div>
                                    <p className="text-xs font-bold text-gray-600 mb-2">SEO Checklist</p>
                                    <div className="space-y-1.5">
                                        {seoAnalysis.checks.map(c => (
                                            <div key={c.label} className="flex items-start gap-2">
                                                <StatusIcon s={c.status} />
                                                <div>
                                                    <p className="text-xs font-semibold text-gray-700">{c.label}</p>
                                                    <p className="text-xs text-gray-400">{c.detail}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>}

                            {/* ── SOCIAL tab ─── */}
                            {activeTab === 'social' && <>
                                <p className="text-xs text-gray-500 mb-2">Controls how this post appears when shared on Facebook, Twitter/X, LinkedIn, and WhatsApp.</p>
                                <Field label="OG Title" value={post.og_title} onChange={v => set('og_title', v)} placeholder={post.seo_title || post.title || 'Social share title'} />
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">OG Description</label>
                                    <textarea value={post.og_description} onChange={e => set('og_description', e.target.value)}
                                        rows={2} placeholder={post.seo_description || 'Description for social share'}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs resize-none focus:outline-none focus:ring-2 focus:ring-green-300" />
                                </div>
                                <Field label="OG Image URL" value={post.og_image} onChange={v => set('og_image', v)} placeholder="1200×630px recommended" />
                                {post.og_image && (
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Preview:</p>
                                        <img src={post.og_image} alt="OG" className="rounded-xl w-full aspect-video object-cover border border-gray-100" />
                                    </div>
                                )}
                                {/* Social card preview */}
                                <div className="border border-gray-200 rounded-xl overflow-hidden text-xs">
                                    <div className="aspect-video bg-gray-100 flex items-center justify-center text-gray-300 text-3xl">
                                        {post.og_image ? <img src={post.og_image} alt="" className="w-full h-full object-cover" /> : '🖼'}
                                    </div>
                                    <div className="p-2 bg-gray-50">
                                        <p className="text-gray-400 uppercase text-[10px]">adometa.techaasvik.in</p>
                                        <p className="font-bold text-gray-800 line-clamp-1">{post.og_title || post.seo_title || post.title || 'Post title'}</p>
                                        <p className="text-gray-500 line-clamp-1">{post.og_description || post.seo_description || '—'}</p>
                                    </div>
                                </div>
                            </>}

                            {/* ── READABILITY tab ─── */}
                            {activeTab === 'readability' && <>
                                <div className="text-xs text-gray-500 mb-3">Analysis based on Flesch-Kincaid readability principles.</div>
                                <div className="space-y-2">
                                    {readAnalysis.checks.map(c => (
                                        <div key={c.label} className="flex items-start gap-2">
                                            <StatusIcon s={c.status} />
                                            <div>
                                                <p className="text-xs font-semibold text-gray-700">{c.label}</p>
                                                <p className="text-xs text-gray-400">{c.detail}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4 p-3 bg-blue-50 rounded-xl text-xs text-blue-700">
                                    <p className="font-bold mb-1">💡 Writing Tips</p>
                                    <ul className="space-y-1 list-disc pl-4">
                                        <li>Keep sentences under 20 words</li>
                                        <li>Use active voice ("We send" not "Messages are sent")</li>
                                        <li>Add H2/H3 headings every 300 words</li>
                                        <li>Use bullet points and numbered lists</li>
                                        <li>Write at a 7th-grade reading level</li>
                                    </ul>
                                </div>
                            </>}

                            {/* ── ADVANCED tab ─── */}
                            {activeTab === 'advanced' && <>
                                <Field label="Canonical URL" value={post.canonical_url} onChange={v => set('canonical_url', v)} placeholder="Leave blank to use default" />
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Robots Meta</label>
                                    <select value={post.robots_meta} onChange={e => set('robots_meta', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-green-300">
                                        <option value="index,follow">index, follow (default)</option>
                                        <option value="noindex,follow">noindex, follow</option>
                                        <option value="index,nofollow">index, nofollow</option>
                                        <option value="noindex,nofollow">noindex, nofollow</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">JSON-LD Schema Markup</label>
                                    <textarea
                                        value={post.schema_markup ? JSON.stringify(post.schema_markup, null, 2) : ''}
                                        onChange={e => {
                                            try { set('schema_markup', JSON.parse(e.target.value)); }
                                            catch { /* invalid JSON — let user keep typing */ }
                                        }}
                                        rows={8}
                                        placeholder={'{\n  "@context": "https://schema.org",\n  "@type": "Article",\n  ...\n}'}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono resize-y focus:outline-none focus:ring-2 focus:ring-green-300" />
                                    <p className="text-[10px] text-gray-400 mt-1">Valid JSON-LD only. Leave blank to use auto-generated Article schema.</p>
                                </div>
                            </>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
    return (
        <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">{label}</label>
            <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-green-300" />
        </div>
    );
}
