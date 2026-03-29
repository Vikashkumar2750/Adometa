'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { useAuthStore } from '@/lib/auth-store';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const STATUS_BADGES: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-600',
    PUBLISHED: 'bg-green-100 text-green-700',
    ARCHIVED: 'bg-amber-100 text-amber-700',
};

export default function AdminBlogPage() {
    const token = useAuthStore(s => s.token);
    const router = useRouter();
    const [posts, setPosts] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [status, setStatus] = useState('ALL');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    const headers = { Authorization: `Bearer ${token}` };

    const fetchPosts = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = { page, limit: 20 };
            if (status !== 'ALL') params.status = status;
            if (search) params.search = search;
            const { data } = await axios.get(`${API}/blog`, { headers, params });
            setPosts(data.data);
            setTotal(data.total);
        } catch { toast.error('Failed to load posts'); }
        finally { setLoading(false); }
    }, [page, status, search, token]);

    useEffect(() => { fetchPosts(); }, [fetchPosts]);

    const deletePost = async (id: string) => {
        if (!confirm('Delete this post?')) return;
        try {
            await axios.delete(`${API}/blog/${id}`, { headers });
            toast.success('Post deleted');
            fetchPosts();
        } catch { toast.error('Delete failed'); }
    };

    const togglePublish = async (post: any) => {
        const newStatus = post.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
        try {
            await axios.patch(`${API}/blog/${post.id}`, { status: newStatus }, { headers });
            toast.success(newStatus === 'PUBLISHED' ? '🟢 Published!' : '⬜ Moved to Draft');
            fetchPosts();
        } catch { toast.error('Update failed'); }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <Toaster position="top-center" />
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900">Blog Posts</h1>
                        <p className="text-gray-500 text-sm mt-1">{total} posts · Full SEO control</p>
                    </div>
                    <div className="flex gap-3">
                        <Link href="/admin" className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-100">
                            ← Admin
                        </Link>
                        <Link href="/admin/blog/create"
                            className="px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700 transition-colors">
                            + New Post
                        </Link>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex gap-3 mb-6 flex-wrap">
                    <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                        placeholder="🔍 Search posts..."
                        className="px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white" />
                    {['ALL', 'DRAFT', 'PUBLISHED', 'ARCHIVED'].map(s => (
                        <button key={s} onClick={() => { setStatus(s); setPage(1); }}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${status === s ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-400'}`}>
                            {s}
                        </button>
                    ))}
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                {['Title', 'Status', 'SEO Score', 'Words', 'Category', 'Published', 'Actions'].map(h => (
                                    <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr><td colSpan={7} className="text-center py-12 text-gray-400">Loading...</td></tr>
                            ) : posts.length === 0 ? (
                                <tr><td colSpan={7} className="text-center py-16">
                                    <p className="text-4xl mb-2">📝</p>
                                    <p className="text-gray-400">No posts yet. <Link href="/admin/blog/create" className="text-green-600 font-semibold">Create your first one →</Link></p>
                                </td></tr>
                            ) : posts.map(post => (
                                <tr key={post.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3">
                                        <p className="font-semibold text-gray-900 line-clamp-1">{post.title}</p>
                                        <p className="text-xs text-gray-400">/blog/{post.slug}</p>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_BADGES[post.status]}`}>{post.status}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        {post.seo_score != null ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                                    <div className={`h-1.5 rounded-full ${post.seo_score >= 70 ? 'bg-green-500' : post.seo_score >= 40 ? 'bg-yellow-500' : 'bg-red-400'}`}
                                                        style={{ width: `${post.seo_score}%` }} />
                                                </div>
                                                <span className={`text-xs font-bold ${post.seo_score >= 70 ? 'text-green-600' : post.seo_score >= 40 ? 'text-yellow-600' : 'text-red-500'}`}>
                                                    {post.seo_score}
                                                </span>
                                            </div>
                                        ) : <span className="text-gray-300">—</span>}
                                    </td>
                                    <td className="px-4 py-3 text-gray-500">{post.word_count?.toLocaleString() || '—'}</td>
                                    <td className="px-4 py-3 text-gray-500">{post.category || '—'}</td>
                                    <td className="px-4 py-3 text-gray-400 text-xs">
                                        {post.published_at ? new Date(post.published_at).toLocaleDateString('en-IN') : '—'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => router.push(`/admin/blog/${post.id}/edit`)}
                                                className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-semibold">Edit</button>
                                            <button onClick={() => togglePublish(post)}
                                                className={`px-2 py-1 text-xs rounded-lg font-semibold ${post.status === 'PUBLISHED' ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                                                {post.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                                            </button>
                                            {post.status === 'PUBLISHED' && (
                                                <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer"
                                                    className="px-2 py-1 text-xs bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 font-semibold">View</a>
                                            )}
                                            <button onClick={() => deletePost(post.id)}
                                                className="px-2 py-1 text-xs bg-red-50 text-red-500 rounded-lg hover:bg-red-100 font-semibold">Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {total > 20 && (
                        <div className="flex justify-between items-center px-4 py-3 border-t border-gray-50">
                            <p className="text-sm text-gray-400">Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}</p>
                            <div className="flex gap-2">
                                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border rounded-lg text-sm disabled:opacity-40">← Prev</button>
                                <button disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border rounded-lg text-sm disabled:opacity-40">Next →</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
