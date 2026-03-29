-- ============================================================
-- Migration: Create tenant_api_keys table
-- Run: psql -U adotech_in -d adotech_in -f this_file.sql
-- Or run from backend: node run-migration.js
-- ============================================================

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

CREATE UNIQUE INDEX IF NOT EXISTS idx_api_keys_key_hash ON tenant_api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_tenant_id ON tenant_api_keys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON tenant_api_keys(key_prefix);

-- Add notification_prefs column to tenant_settings if missing
ALTER TABLE tenant_settings
    ADD COLUMN IF NOT EXISTS notification_prefs JSONB NOT NULL DEFAULT '{"campaignComplete":true,"deliveryFailures":true,"newContacts":false,"weeklyReport":true,"securityAlerts":true}';
