/**
 * Migration: Team Activity Log table + campaigns.cta_count column
 * Run: node run-team-migration.js
 */
require('dotenv').config({ path: '../.env' });
const { Client } = require('pg');

const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || process.env.DB_DATABASE || 'postgres',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function run() {
    console.log('🔗 Connecting to database...');
    await client.connect();
    console.log('✅ Connected\n');

    // ─── 1. team_activity_logs ────────────────────────────────────────────────
    console.log('📊 Creating team_activity_logs table...');
    await client.query(`
        CREATE TABLE IF NOT EXISTS team_activity_logs (
            id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id                UUID NOT NULL,
            user_id                  UUID NOT NULL,
            user_email               VARCHAR(255),
            user_name                VARCHAR(255),
            user_role                VARCHAR(50),
            activity_type            VARCHAR(50) NOT NULL DEFAULT 'ACTION',
            description              VARCHAR(500),
            ip_address               VARCHAR(100),
            user_agent               VARCHAR(500),
            session_duration_seconds INT,
            session_started_at       TIMESTAMPTZ,
            created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_team_activity_tenant  ON team_activity_logs (tenant_id);
        CREATE INDEX IF NOT EXISTS idx_team_activity_user    ON team_activity_logs (user_id);
        CREATE INDEX IF NOT EXISTS idx_team_activity_created ON team_activity_logs (created_at);
        CREATE INDEX IF NOT EXISTS idx_team_activity_type    ON team_activity_logs (activity_type);
    `);
    console.log('✅ team_activity_logs ready\n');

    // ─── 2. campaigns.cta_count column ───────────────────────────────────────
    console.log('📊 Adding cta_count to campaigns...');
    await client.query(`
        ALTER TABLE campaigns
        ADD COLUMN IF NOT EXISTS "ctaCount" INTEGER NOT NULL DEFAULT 0;
    `);
    console.log('✅ campaigns.ctaCount ready\n');

    // ─── 3. campaigns.failed_count guard (in case missing) ───────────────────
    await client.query(`
        ALTER TABLE campaigns
        ADD COLUMN IF NOT EXISTS "failedCount" INTEGER NOT NULL DEFAULT 0;
    `);

    console.log('🎉 Migration complete!');
}

run()
    .catch(err => { console.error('❌ Migration failed:', err.message); process.exit(1); })
    .finally(() => client.end());
