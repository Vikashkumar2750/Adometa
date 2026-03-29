import {
    Injectable, NotFoundException, ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlogPost, BlogStatus } from './entities/blog-post.entity';

function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

function stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function countWords(text: string): number {
    return text.split(/\s+/).filter(Boolean).length;
}

function calcReadingTime(wordCount: number): number {
    return Math.max(1, Math.round(wordCount / 200));
}

function calcKeywordDensity(text: string, keyword: string): number {
    if (!keyword || !text) return 0;
    const words = text.toLowerCase().split(/\s+/).filter(Boolean);
    const kw = keyword.toLowerCase();
    const matches = words.filter(w => w.includes(kw)).length;
    return words.length > 0 ? +((matches / words.length) * 100).toFixed(2) : 0;
}

/**
 * Simple SEO score (0-100). Checks:
 *  - seo_title length 50-60   (+15)
 *  - seo_description length 120-160  (+15)
 *  - focus_keyword present     (+10)
 *  - keyword in seo_title      (+10)
 *  - keyword in seo_description (+10)
 *  - keyword density 0.5–2.5%  (+10)
 *  - word_count >= 300         (+10)
 *  - og_image present          (+10)
 *  - tags present              (+5)
 *  - slug < 75 chars           (+5)
 */
function calcSeoScore(post: Partial<BlogPost>, plainText: string): number {
    let score = 0;
    const kw = (post.focus_keyword || '').toLowerCase();
    const seot = (post.seo_title || post.title || '').toLowerCase();
    const seod = (post.seo_description || '').toLowerCase();

    if (seot.length >= 50 && seot.length <= 60) score += 15;
    else if (seot.length > 0) score += 7;
    if (seod.length >= 120 && seod.length <= 160) score += 15;
    else if (seod.length > 0) score += 7;
    if (kw) score += 10;
    if (kw && seot.includes(kw)) score += 10;
    if (kw && seod.includes(kw)) score += 10;
    const density = calcKeywordDensity(plainText, kw);
    if (density >= 0.5 && density <= 2.5) score += 10;
    if ((post.word_count || 0) >= 300) score += 10;
    if (post.og_image) score += 10;
    if ((post.tags || []).length > 0) score += 5;
    if ((post.slug || '').length < 75) score += 5;
    return Math.min(100, score);
}

@Injectable()
export class BlogService {
    constructor(
        @InjectRepository(BlogPost)
        private readonly repo: Repository<BlogPost>,
    ) { }

    private enrich(data: Partial<BlogPost>) {
        const plain = stripHtml(data.content || '');
        data.word_count = countWords(plain);
        data.reading_time_minutes = calcReadingTime(data.word_count);
        data.keyword_density = calcKeywordDensity(plain, data.focus_keyword || '');
        data.seo_score = calcSeoScore(data, plain);
        if (!data.excerpt) data.excerpt = plain.slice(0, 160) + (plain.length > 160 ? '…' : '');
    }

    async create(dto: Partial<BlogPost>): Promise<BlogPost> {
        // Auto-generate slug if not provided
        if (!dto.slug) dto.slug = slugify(dto.title || '');
        // Check slug uniqueness
        const existing = await this.repo.findOne({ where: { slug: dto.slug } });
        if (existing) throw new ConflictException(`Slug "${dto.slug}" already exists`);

        this.enrich(dto);
        const post = this.repo.create(dto);
        return this.repo.save(post);
    }

    async findAll(page = 1, limit = 10, status?: BlogStatus, search?: string) {
        const qb = this.repo.createQueryBuilder('p').orderBy('p.created_at', 'DESC');
        if (status) qb.andWhere('p.status = :status', { status });
        if (search) qb.andWhere('p.title ILIKE :search', { search: `%${search}%` });
        const total = await qb.getCount();
        const data = await qb.skip((page - 1) * limit).take(limit).getMany();
        return { data, total, page, totalPages: Math.ceil(total / limit) };
    }

    async findPublished(page = 1, limit = 10, category?: string) {
        const qb = this.repo.createQueryBuilder('p')
            .where('p.status = :s', { s: 'PUBLISHED' })
            .orderBy('p.published_at', 'DESC');
        if (category) qb.andWhere('p.category = :c', { c: category });
        const total = await qb.getCount();
        const data = await qb.skip((page - 1) * limit).take(limit).getMany();
        return { data, total, page, totalPages: Math.ceil(total / limit) };
    }

    async findBySlug(slug: string): Promise<BlogPost> {
        const post = await this.repo.findOne({ where: { slug, status: 'PUBLISHED' } });
        if (!post) throw new NotFoundException(`Blog post "${slug}" not found`);
        return post;
    }

    async findById(id: string): Promise<BlogPost> {
        const post = await this.repo.findOne({ where: { id } });
        if (!post) throw new NotFoundException(`Blog post ${id} not found`);
        return post;
    }

    async update(id: string, dto: Partial<BlogPost>): Promise<BlogPost> {
        const post = await this.findById(id);
        // If slug changed, check uniqueness
        if (dto.slug && dto.slug !== post.slug) {
            const exists = await this.repo.findOne({ where: { slug: dto.slug } });
            if (exists) throw new ConflictException(`Slug "${dto.slug}" already exists`);
        }
        Object.assign(post, dto);
        this.enrich(post);
        // Auto-set published_at
        if (post.status === 'PUBLISHED' && !post.published_at) {
            post.published_at = new Date();
        }
        return this.repo.save(post);
    }

    async remove(id: string): Promise<void> {
        await this.findById(id);
        await this.repo.delete(id);
    }

    async getCategories(): Promise<string[]> {
        const result = await this.repo
            .createQueryBuilder('p')
            .select('DISTINCT p.category', 'category')
            .where('p.status = :s', { s: 'PUBLISHED' })
            .andWhere('p.category IS NOT NULL')
            .getRawMany();
        return result.map(r => r.category).filter(Boolean);
    }
}
