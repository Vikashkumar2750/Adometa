import { MetadataRoute } from 'next';

export const dynamic = "force-static";

const BASE_URL = 'https://adometa.techaasvik.in';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    // Static pages
    const staticPages: MetadataRoute.Sitemap = [
        { url: BASE_URL, lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
        { url: `${BASE_URL}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
        { url: `${BASE_URL}/blog`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
        { url: `${BASE_URL}/register`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
        { url: `${BASE_URL}/login`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
        { url: `${BASE_URL}/privacy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
        { url: `${BASE_URL}/terms`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
        { url: `${BASE_URL}/refunds`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
        { url: `${BASE_URL}/disclaimer`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    ];

    // Dynamic: Fetch published blog posts
    let blogPages: MetadataRoute.Sitemap = [];
    try {
        const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
        const res = await fetch(`${API}/blog/public?limit=500`, { next: { revalidate: 3600 } });
        if (res.ok) {
            const { data } = await res.json();
            blogPages = (data || []).map((post: any) => ({
                url: `${BASE_URL}/blog/${post.slug}`,
                lastModified: new Date(post.updated_at || post.published_at),
                changeFrequency: 'weekly' as const,
                priority: 0.7,
            }));
        }
    } catch {
        // Silently skip if backend is down
    }

    return [...staticPages, ...blogPages];
}
