import { MetadataRoute } from 'next';

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
    const BASE = 'https://adometa.techaasvik.in';
    return {
        rules: [
            {
                userAgent: '*',
                allow: ['/', '/blog', '/blog/', '/contact', '/privacy', '/terms', '/refunds', '/disclaimer', '/register'],
                disallow: ['/dashboard/', '/admin/', '/api/', '/_next/', '/login'],
            },
            {
                userAgent: 'Googlebot',
                allow: '/',
                disallow: ['/dashboard/', '/admin/', '/api/'],
            },
        ],
        sitemap: `${BASE}/sitemap.xml`,
        host: BASE,
    };
}
