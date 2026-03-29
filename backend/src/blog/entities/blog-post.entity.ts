import {
    Entity, PrimaryGeneratedColumn, Column,
    CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export type BlogStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

@Entity('blog_posts')
export class BlogPost {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // ── Content ──────────────────────────────────────────
    @Column({ length: 300 })
    title: string;

    @Column({ unique: true, length: 300 })
    slug: string;

    @Column({ type: 'text' })
    content: string;           // HTML body

    @Column({ type: 'text', nullable: true })
    excerpt: string;           // Short summary (auto-generated if blank)

    @Column({ length: 500, nullable: true })
    cover_image: string;       // URL

    @Column({ length: 200, nullable: true })
    author_name: string;

    @Column({ length: 500, nullable: true })
    author_bio: string;

    @Column({ length: 200, nullable: true })
    category: string;

    @Column('text', { array: true, default: '{}' })
    tags: string[];

    // ── SEO fields ───────────────────────────────────────
    @Column({ length: 160, nullable: true })
    seo_title: string;         // <title> override (max 60 chars recommended)

    @Column({ length: 500, nullable: true })
    seo_description: string;   // meta description (max 160 chars)

    @Column({ length: 200, nullable: true })
    focus_keyword: string;     // primary keyword for analysis

    @Column('text', { array: true, default: '{}' })
    secondary_keywords: string[];

    @Column({ length: 500, nullable: true })
    og_title: string;          // Open Graph title

    @Column({ length: 500, nullable: true })
    og_description: string;    // Open Graph description

    @Column({ length: 500, nullable: true })
    og_image: string;          // Open Graph image URL

    @Column({ length: 100, nullable: true })
    canonical_url: string;     // canonical override

    @Column({ type: 'jsonb', nullable: true })
    schema_markup: object;     // JSON-LD schema (Article, FAQ, HowTo etc.)

    @Column({ default: 'index,follow', length: 50 })
    robots_meta: string;       // index,follow | noindex,nofollow etc.

    @Column({ default: true })
    allow_comments: boolean;

    // ── Readability & analysis ────────────────────────────
    @Column({ type: 'int', default: 0 })
    word_count: number;

    @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
    keyword_density: number;   // calculated on save

    @Column({ type: 'int', default: 0 })
    reading_time_minutes: number;

    @Column({ type: 'int', nullable: true })
    seo_score: number;         // 0-100 calculated score

    @Column({ type: 'int', nullable: true })
    readability_score: number; // 0-100 Flesch-Kincaid inspired

    // ── Publishing ────────────────────────────────────────
    @Column({ default: 'DRAFT', length: 20 })
    status: BlogStatus;

    @Column({ nullable: true })
    published_at: Date;

    @Column({ default: false })
    featured: boolean;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
