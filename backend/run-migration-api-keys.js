const { Client } = require('pg');
const path = require('path');

async function runMigration() {
    const client = new Client({
        host: 'localhost',
        port: 5432,
        database: 'adotech_in',
        user: 'adotech_in',
        password: 'Techaasvik@2026!Secure',
    });

    try {
        console.log('🔌 Connecting to database...');
        await client.connect();
        console.log('✅ Connected!');

        // Create tenant_api_keys table
        await client.query(`
            CREATE TABLE IF NOT EXISTS tenant_api_keys (
                id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id       UUID NOT NULL,
                name            VARCHAR(100) NOT NULL,
                key_hash        VARCHAR(255) NOT NULL,
                key_prefix      VARCHAR(20) NOT NULL,
                scopes          VARCHAR(500) NOT NULL DEFAULT 'read',
                is_active       BOOLEAN NOT NULL DEFAULT TRUE,
                expires_at      TIMESTAMP NULL,
                last_used_at    TIMESTAMP NULL,
                total_requests  BIGINT NOT NULL DEFAULT 0,
                created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
                updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
            );
        `);
        console.log('✅ tenant_api_keys table created');

        await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_api_keys_key_hash ON tenant_api_keys(key_hash);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_api_keys_tenant_id ON tenant_api_keys(tenant_id);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON tenant_api_keys(key_prefix);`);
        console.log('✅ Indexes created');

        // Add notification_prefs column to tenant_settings
        await client.query(`
            ALTER TABLE tenant_settings
                ADD COLUMN IF NOT EXISTS notification_prefs JSONB NOT NULL DEFAULT '{"campaignComplete":true,"deliveryFailures":true,"newContacts":false,"weeklyReport":true,"securityAlerts":true}';
        `);
        console.log('✅ notification_prefs column added to tenant_settings');

        console.log('🎉 Migration completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

runMigration();
