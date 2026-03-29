/**
 * run-billing-migration.js
 * Run from: backend/
 * Usage: node run-billing-migration.js
 *
 * Reads DB config from the .env in the monorepo root (../), runs billing SQL migration safely.
 */
const path = require('path');
const fs = require('fs');

// Load .env from root
const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
    // Try backend/.env
    const altEnvPath = path.join(__dirname, '.env');
    if (fs.existsSync(altEnvPath)) {
        require('dotenv').config({ path: altEnvPath });
    } else {
        console.error('❌ .env not found at', envPath, 'or', altEnvPath);
        process.exit(1);
    }
} else {
    require('dotenv').config({ path: envPath });
}

const { Client } = require('pg');

const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || process.env.DB_DATABASE,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

const SQL = `
-- 1. tenant_wallets
CREATE TABLE IF NOT EXISTS tenant_wallets (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id             UUID NOT NULL,
    balance               NUMERIC(18, 4) NOT NULL DEFAULT 0,
    currency              VARCHAR(10) NOT NULL DEFAULT 'INR',
    low_balance_threshold NUMERIC(18, 4) NOT NULL DEFAULT 10,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_wallet_tenant FOREIGN KEY (tenant_id)
        REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT uq_wallet_tenant UNIQUE (tenant_id)
);

-- 2. tenant_transactions
CREATE TABLE IF NOT EXISTS tenant_transactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL,
    type            VARCHAR(10) NOT NULL CHECK (type IN ('CREDIT','DEBIT')),
    amount          NUMERIC(18, 4) NOT NULL CHECK (amount > 0),
    balance_after   NUMERIC(18, 4),
    description     TEXT NOT NULL,
    reference_type  VARCHAR(20) CHECK (reference_type IN ('CAMPAIGN','INVOICE','MANUAL','REFUND','PAYMENT','SUBSCRIPTION')),
    reference_id    UUID,
    status          VARCHAR(10) NOT NULL DEFAULT 'SUCCESS'
                        CHECK (status IN ('SUCCESS','FAILED','REVERSED','PENDING')),
    created_by      UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_txn_tenant FOREIGN KEY (tenant_id)
        REFERENCES tenants(id) ON DELETE CASCADE
);

-- 3. tenant_settings
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

-- 4. invoices
CREATE TABLE IF NOT EXISTS invoices (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id            UUID NOT NULL,
    invoice_number       VARCHAR(50) NOT NULL,
    subtotal             NUMERIC(18, 2) NOT NULL DEFAULT 0,
    tax                  NUMERIC(18, 2) NOT NULL DEFAULT 0,
    total                NUMERIC(18, 2) NOT NULL DEFAULT 0,
    currency             VARCHAR(10) NOT NULL DEFAULT 'INR',
    status               VARCHAR(15) NOT NULL DEFAULT 'PENDING'
                            CHECK (status IN ('PENDING','PAID','DPD','CANCELLED','PROCESSING')),
    period_start         TIMESTAMPTZ NOT NULL,
    period_end           TIMESTAMPTZ NOT NULL,
    due_date             TIMESTAMPTZ NOT NULL,
    paid_at              TIMESTAMPTZ,
    payment_gateway_id   VARCHAR(255),
    payment_gateway      VARCHAR(50),
    payment_metadata     JSONB,
    days_overdue         INT NOT NULL DEFAULT 0,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_invoice_tenant FOREIGN KEY (tenant_id)
        REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT uq_invoice_number UNIQUE (invoice_number)
);

-- 5. invoice_items
CREATE TABLE IF NOT EXISTS invoice_items (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id   UUID NOT NULL,
    description  VARCHAR(255) NOT NULL,
    item_type    VARCHAR(15) NOT NULL DEFAULT 'SUBSCRIPTION'
                    CHECK (item_type IN ('SUBSCRIPTION','USAGE','ADDON','CREDIT','TAX')),
    quantity     NUMERIC(10, 4) NOT NULL DEFAULT 1,
    unit_price   NUMERIC(18, 4) NOT NULL,
    total        NUMERIC(18, 2) NOT NULL,
    CONSTRAINT fk_item_invoice FOREIGN KEY (invoice_id)
        REFERENCES invoices(id) ON DELETE CASCADE
);

-- 6. Indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_txn_tenant ON tenant_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_txn_created ON tenant_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_txn_ref ON tenant_transactions(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_invoice_tenant ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoice_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoice_due ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invitem_invoice ON invoice_items(invoice_id);

-- 7. Auto-create wallet + settings for existing tenants
INSERT INTO tenant_wallets (tenant_id)
SELECT id FROM tenants
WHERE id NOT IN (SELECT tenant_id FROM tenant_wallets)
ON CONFLICT DO NOTHING;

INSERT INTO tenant_settings (tenant_id)
SELECT id FROM tenants
WHERE id NOT IN (SELECT tenant_id FROM tenant_settings)
ON CONFLICT DO NOTHING;
`;

async function run() {
    console.log('🔗 Connecting to database...');
    console.log('   Host:', process.env.DB_HOST || 'localhost');
    console.log('   Database:', process.env.DB_NAME || process.env.DB_DATABASE || '(not set)');

    try {
        await client.connect();
        console.log('✅ Connected');

        console.log('\n📊 Running billing migration...');
        await client.query(SQL);
        console.log('✅ Migration complete!\n');

        // Verify tables
        const res = await client.query(`
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name IN ('tenant_wallets','tenant_transactions','tenant_settings','invoices','invoice_items')
            ORDER BY table_name;
        `);
        console.log('✅ Tables created:', res.rows.map(r => r.table_name).join(', '));

        // Check wallet count
        const wRes = await client.query('SELECT COUNT(*) FROM tenant_wallets');
        console.log('✅ Tenant wallets seeded:', wRes.rows[0].count, 'records');

        const sRes = await client.query('SELECT COUNT(*) FROM tenant_settings');
        console.log('✅ Tenant settings seeded:', sRes.rows[0].count, 'records');

    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        console.error(err.detail || '');
    } finally {
        await client.end();
    }
}

run();
