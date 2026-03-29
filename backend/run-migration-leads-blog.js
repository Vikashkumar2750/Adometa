/**
 * Migration: Create leads and blog_posts tables
 * Run once: node run-migration-leads-blog.js
 */
const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

async function run() {
    await client.connect();
    console.log('✅ Connected to database:', process.env.DB_NAME);

    try {
        // ── LEADS TABLE ──────────────────────────────────────────────────
        await client.query(`
            CREATE TABLE IF NOT EXISTS leads (
                id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name        VARCHAR(150) NOT NULL,
                email       VARCHAR(200) NOT NULL,
                phone       VARCHAR(30)  NOT NULL,
                company     VARCHAR(200) NOT NULL,
                company_size VARCHAR(50) DEFAULT '1-10',
                website     VARCHAR(500),
                use_case    TEXT,
                status      VARCHAR(50)  NOT NULL DEFAULT 'NEW',
                notes       TEXT,
                source      VARCHAR(50),
                created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
            );
        `);
        console.log('✅ leads table ready');

        await client.query(`CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);`);
        console.log('✅ leads indexes ready');

        // ── BLOG_POSTS TABLE ─────────────────────────────────────────────
        await client.query(`
            CREATE TABLE IF NOT EXISTS blog_posts (
                id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                title               VARCHAR(255) NOT NULL,
                slug                VARCHAR(255) NOT NULL UNIQUE,
                content             TEXT,
                excerpt             TEXT,
                cover_image         VARCHAR(1000),
                author_name         VARCHAR(255) DEFAULT 'Techaasvik Team',
                author_bio          TEXT,
                author_avatar       VARCHAR(1000),
                category            VARCHAR(100),
                tags                TEXT[] DEFAULT '{}',
                status              VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
                featured            BOOLEAN NOT NULL DEFAULT FALSE,
                seo_title           VARCHAR(70),
                seo_description     VARCHAR(160),
                focus_keyword       VARCHAR(100),
                secondary_keywords  TEXT[],
                og_title            VARCHAR(255),
                og_description      TEXT,
                og_image            VARCHAR(1000),
                canonical_url       VARCHAR(1000),
                robots_meta         VARCHAR(100) DEFAULT 'index,follow',
                schema_markup       TEXT,
                seo_score           INTEGER DEFAULT 0,
                readability_score   INTEGER DEFAULT 0,
                read_time_minutes   INTEGER DEFAULT 0,
                published_at        TIMESTAMP WITH TIME ZONE,
                created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
            );
        `);
        console.log('✅ blog_posts table ready');

        await client.query(`CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at DESC);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(category);`);
        console.log('✅ blog_posts indexes ready');

        console.log('\n🎉 Migration complete! Both tables are ready.\n');
    } catch (err) {
        console.error('❌ Migration error:', err.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

run();
