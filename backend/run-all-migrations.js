/**
 * run-all-migrations.js
 * Master migration runner — runs ALL migrations in correct order.
 * Usage: node run-all-migrations.js
 * Run from: backend/
 */

const path = require('path');
const fs   = require('fs');

// ── Load .env (try root first, then backend/) ────────────────────────────────
const rootEnv    = path.join(__dirname, '..', '.env');
const backendEnv = path.join(__dirname, '.env');

if (fs.existsSync(rootEnv)) {
    require('dotenv').config({ path: rootEnv });
} else if (fs.existsSync(backendEnv)) {
    require('dotenv').config({ path: backendEnv });
} else {
    console.error('❌  No .env found! Create one at project root or backend/');
    process.exit(1);
}

const { Client } = require('pg');

// ── DB connection ─────────────────────────────────────────────────────────────
function makeClient() {
    return new Client({
        host:     process.env.DB_HOST     || 'localhost',
        port:     parseInt(process.env.DB_PORT || '5432'),
        user:     process.env.DB_USER     || process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME     || process.env.DB_DATABASE || 'postgres',
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    });
}

// ── Migration files in execution order ───────────────────────────────────────
// NOTE: add-api-keys-and-notif-prefs.sql requires tenant_settings (billing)
//       so it runs AFTER the inline BILLING_SQL block below.
const SQL_FILES_BEFORE_BILLING = [
    'migrations/001_base_schema.sql',       // tenants, tenant_users, super_admins
    'migrations/002_campaigns.sql',          // campaigns table
    'migrations/003_templates.sql',          // templates
    'migrations/004_templates_media_columns.sql',
    'migrations/005_automation_rules.sql',
];

const SQL_FILES_AFTER_BILLING = [
    'migrations/add-api-keys-and-notif-prefs.sql',  // needs tenant_settings
    'migrations/add-support-tables.sql',
];

// ── Inline SQL migrations (from .js files) ───────────────────────────────────

// Billing tables (from run-billing-migration.js)
const BILLING_SQL = `
CREATE TABLE IF NOT EXISTS tenant_wallets (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id             UUID NOT NULL,
    balance               NUMERIC(18, 4) NOT NULL DEFAULT 0,
    currency              VARCHAR(10) NOT NULL DEFAULT 'INR',
    low_balance_threshold NUMERIC(18, 4) NOT NULL DEFAULT 10,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_wallet_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT uq_wallet_tenant UNIQUE (tenant_id)
);
CREATE TABLE IF NOT EXISTS tenant_transactions (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      UUID NOT NULL,
    type           VARCHAR(10) NOT NULL CHECK (type IN ('CREDIT','DEBIT')),
    amount         NUMERIC(18, 4) NOT NULL CHECK (amount > 0),
    balance_after  NUMERIC(18, 4),
    description    TEXT NOT NULL,
    reference_type VARCHAR(20) CHECK (reference_type IN ('CAMPAIGN','INVOICE','MANUAL','REFUND','PAYMENT','SUBSCRIPTION')),
    reference_id   UUID,
    status         VARCHAR(10) NOT NULL DEFAULT 'SUCCESS'
                       CHECK (status IN ('SUCCESS','FAILED','REVERSED','PENDING')),
    created_by     UUID,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_txn_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS tenant_settings (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id              UUID NOT NULL,
    max_api_rpm            INT NOT NULL DEFAULT 30,
    max_campaigns_per_day  INT NOT NULL DEFAULT 10,
    max_broadcast_size     INT NOT NULL DEFAULT 10000,
    cost_per_message       NUMERIC(10, 4) NOT NULL DEFAULT 0.1,
    is_enabled             BOOLEAN NOT NULL DEFAULT TRUE,
    disabled_reason        TEXT,
    disabled_at            TIMESTAMPTZ,
    disabled_by            UUID,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_settings_tenant UNIQUE (tenant_id)
);
CREATE TABLE IF NOT EXISTS invoices (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id          UUID NOT NULL,
    invoice_number     VARCHAR(50) NOT NULL,
    subtotal           NUMERIC(18, 2) NOT NULL DEFAULT 0,
    tax                NUMERIC(18, 2) NOT NULL DEFAULT 0,
    total              NUMERIC(18, 2) NOT NULL DEFAULT 0,
    currency           VARCHAR(10) NOT NULL DEFAULT 'INR',
    status             VARCHAR(15) NOT NULL DEFAULT 'PENDING'
                           CHECK (status IN ('PENDING','PAID','DPD','CANCELLED','PROCESSING')),
    period_start       TIMESTAMPTZ NOT NULL,
    period_end         TIMESTAMPTZ NOT NULL,
    due_date           TIMESTAMPTZ NOT NULL,
    paid_at            TIMESTAMPTZ,
    payment_gateway_id VARCHAR(255),
    payment_gateway    VARCHAR(50),
    payment_metadata   JSONB,
    days_overdue       INT NOT NULL DEFAULT 0,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_invoice_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT uq_invoice_number UNIQUE (invoice_number)
);
CREATE TABLE IF NOT EXISTS invoice_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id  UUID NOT NULL,
    description VARCHAR(255) NOT NULL,
    item_type   VARCHAR(15) NOT NULL DEFAULT 'SUBSCRIPTION'
                    CHECK (item_type IN ('SUBSCRIPTION','USAGE','ADDON','CREDIT','TAX')),
    quantity    NUMERIC(10, 4) NOT NULL DEFAULT 1,
    unit_price  NUMERIC(18, 4) NOT NULL,
    total       NUMERIC(18, 2) NOT NULL,
    CONSTRAINT fk_item_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_txn_tenant     ON tenant_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_txn_created    ON tenant_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_txn_ref        ON tenant_transactions(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_invoice_tenant ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoice_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoice_due    ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invitem_invoice ON invoice_items(invoice_id);

INSERT INTO tenant_wallets (tenant_id)
SELECT id FROM tenants WHERE id NOT IN (SELECT tenant_id FROM tenant_wallets)
ON CONFLICT DO NOTHING;

INSERT INTO tenant_settings (tenant_id)
SELECT id FROM tenants WHERE id NOT IN (SELECT tenant_id FROM tenant_settings)
ON CONFLICT DO NOTHING;
`;

// Team activity + campaigns columns (from run-team-migration.js)
const TEAM_SQL = `
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

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS "ctaCount"    INTEGER NOT NULL DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS "failedCount" INTEGER NOT NULL DEFAULT 0;
`;

// ── Main runner ───────────────────────────────────────────────────────────────
async function runMigrations() {
    console.log('\n🚀 Adometa / Techaasvik — Master Migration Runner');
    console.log('═'.repeat(55));
    console.log(`   Host : ${process.env.DB_HOST || 'localhost'}`);
    console.log(`   DB   : ${process.env.DB_NAME || process.env.DB_DATABASE || '(not set)'}`);
    console.log('═'.repeat(55) + '\n');

    const client = makeClient();
    await client.connect();
    console.log('✅ Connected to database\n');

    let step = 1;

    // ── SQL file migrations (BEFORE billing) ────────────────────────────────
    for (const relPath of SQL_FILES_BEFORE_BILLING) {
        const filePath = path.join(__dirname, relPath);
        if (!fs.existsSync(filePath)) {
            console.warn(`⚠️  [${step}] File not found, skipping: ${relPath}`);
            step++;
            continue;
        }
        const label = path.basename(relPath);
        console.log(`📄 [${step}] Running ${label}...`);
        try {
            const sql = fs.readFileSync(filePath, 'utf8');
            await client.query(sql);
            console.log(`   ✅ Done\n`);
        } catch (err) {
            console.error(`   ❌ FAILED: ${err.message}`);
            if (err.detail) console.error(`      Detail: ${err.detail}`);
            await client.end();
            process.exit(1);
        }
        step++;
    }

    // ── Inline SQL: Billing ──────────────────────────────────────────────────
    console.log(`💰 [${step}] Running billing tables (wallets, transactions, invoices)...`);
    try {
        await client.query(BILLING_SQL);
        console.log(`   ✅ Done\n`);
    } catch (err) {
        console.error(`   ❌ FAILED: ${err.message}`);
        await client.end();
        process.exit(1);
    }
    step++;

    // ── Inline SQL: Team ─────────────────────────────────────────────────────
    console.log(`👥 [${step}] Running team activity logs + campaigns columns...`);
    try {
        await client.query(TEAM_SQL);
        console.log(`   ✅ Done\n`);
    } catch (err) {
        console.error(`   ❌ FAILED: ${err.message}`);
        await client.end();
        process.exit(1);
    }
    step++;

    // ── SQL file migrations (AFTER billing) ─────────────────────────────────
    for (const relPath of SQL_FILES_AFTER_BILLING) {
        const filePath = path.join(__dirname, relPath);
        if (!fs.existsSync(filePath)) {
            console.warn(`⚠️  [${step}] File not found, skipping: ${relPath}`);
            step++;
            continue;
        }
        const label = path.basename(relPath);
        console.log(`📄 [${step}] Running ${label}...`);
        try {
            const sql = fs.readFileSync(filePath, 'utf8');
            await client.query(sql);
            console.log(`   ✅ Done\n`);
        } catch (err) {
            console.error(`   ❌ FAILED: ${err.message}`);
            if (err.detail) console.error(`      Detail: ${err.detail}`);
            await client.end();
            process.exit(1);
        }
        step++;
    }

    // ── Final verification ───────────────────────────────────────────────────
    console.log('🔍 Verifying key tables...');
    const CHECK_TABLES = [
        'super_admins', 'tenants', 'tenant_users',
        'campaigns', 'tenant_settings', 'tenant_wallets',
        'invoices', 'team_activity_logs',
    ];
    const result = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = ANY($1::text[])
        ORDER BY table_name;
    `, [CHECK_TABLES]);

    const found   = result.rows.map(r => r.table_name);
    const missing = CHECK_TABLES.filter(t => !found.includes(t));

    console.log(`   ✅ Found   : ${found.join(', ')}`);
    if (missing.length) {
        console.warn(`   ⚠️  Missing : ${missing.join(', ')}`);
    } else {
        console.log(`   ✅ All expected tables present!`);
    }

    await client.end();
    console.log('\n🎉 All migrations completed successfully!\n');
}

runMigrations().catch(err => {
    console.error('\n❌ Unexpected error:', err.message);
    process.exit(1);
});
