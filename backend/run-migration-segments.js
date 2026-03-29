const { Client } = require('pg');

const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'adotech_in',
    user: 'adotech_in',
    password: 'Techaasvik@2026!Secure',
});

const sql = `
CREATE TABLE IF NOT EXISTS segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenantId" VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    "contactCount" INTEGER NOT NULL DEFAULT 0,
    "contactPhones" JSONB NOT NULL DEFAULT '[]',
    contacts JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    source VARCHAR(100),
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "deletedAt" TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_segments_tenant ON segments("tenantId");
CREATE INDEX IF NOT EXISTS idx_segments_tenant_active ON segments("tenantId", "isActive");
CREATE INDEX IF NOT EXISTS idx_segments_deleted ON segments("deletedAt");

-- Unique segment name per tenant (among non-deleted)
CREATE UNIQUE INDEX IF NOT EXISTS idx_segments_tenant_name_unique
ON segments("tenantId", name)
WHERE "deletedAt" IS NULL;
`;

async function run() {
    await client.connect();
    console.log('Connected to database');
    try {
        await client.query(sql);
        console.log('✅ Segments table created');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
    } finally {
        await client.end();
        console.log('Done');
    }
}

run().catch(console.error);
