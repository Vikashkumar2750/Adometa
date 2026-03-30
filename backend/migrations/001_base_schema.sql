-- ========================================
-- 001_base_schema.sql
-- BASE TABLES: tenants, tenant_users, super_admins
-- Run this FIRST before any other migration
-- ========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================================
-- ENUMS (safe to re-run with IF NOT EXISTS workaround)
-- ========================================

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM (
    'SUPER_ADMIN', 'TENANT_ADMIN', 'TENANT_MARKETER', 'TENANT_DEVELOPER', 'READ_ONLY'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE tenant_status AS ENUM (
    'PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED', 'DELETED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE subscription_plan AS ENUM (
    'FREE_TRIAL', 'BASIC', 'PRO', 'PREMIUM', 'ENTERPRISE'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ========================================
-- SUPER ADMINS
-- ========================================

CREATE TABLE IF NOT EXISTS super_admins (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name          VARCHAR(255) NOT NULL,
  role          VARCHAR(50) NOT NULL DEFAULT 'SUPER_ADMIN',
  is_active     BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_super_admins_email ON super_admins(email);

-- ========================================
-- TENANTS
-- ========================================

CREATE TABLE IF NOT EXISTS tenants (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_name VARCHAR(255) NOT NULL,
  owner_email   VARCHAR(255) NOT NULL,
  owner_name    VARCHAR(255) NOT NULL,
  status        VARCHAR(50) NOT NULL DEFAULT 'PENDING_APPROVAL',
  plan          VARCHAR(50) NOT NULL DEFAULT 'FREE_TRIAL',
  timezone      VARCHAR(50) DEFAULT 'UTC',
  locale        VARCHAR(10) DEFAULT 'en',
  metadata      JSONB,
  approved_by   UUID REFERENCES super_admins(id),
  approved_at   TIMESTAMP,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at    TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tenants_status      ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_plan        ON tenants(plan);
CREATE INDEX IF NOT EXISTS idx_tenants_owner_email ON tenants(owner_email);

-- ========================================
-- TENANT USERS
-- ========================================

CREATE TABLE IF NOT EXISTS tenant_users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email         VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name          VARCHAR(255) NOT NULL,
  role          VARCHAR(50) NOT NULL DEFAULT 'TENANT_ADMIN',
  permissions   JSONB DEFAULT '[]',
  is_active     BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, email)
);

CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant ON tenant_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_email  ON tenant_users(email);
CREATE INDEX IF NOT EXISTS idx_tenant_users_role   ON tenant_users(role);

-- ========================================
-- PLATFORM CONFIG
-- ========================================

CREATE TABLE IF NOT EXISTS platform_config (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key         VARCHAR(255) UNIQUE NOT NULL,
  value       TEXT NOT NULL,
  encrypted   BOOLEAN DEFAULT false,
  description TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_platform_config_key ON platform_config(key);

-- ========================================
-- SYSTEM AUDIT LOGS
-- ========================================

CREATE TABLE IF NOT EXISTS system_audit_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id      UUID REFERENCES super_admins(id),
  action        VARCHAR(255) NOT NULL,
  resource_type VARCHAR(100),
  resource_id   UUID,
  metadata      JSONB,
  ip_address    TEXT,
  user_agent    TEXT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_system_audit_logs_admin   ON system_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_system_audit_logs_created ON system_audit_logs(created_at DESC);

-- ========================================
-- updated_at TRIGGER FUNCTION
-- ========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers (safe to re-run)
DROP TRIGGER IF EXISTS update_super_admins_updated_at ON super_admins;
CREATE TRIGGER update_super_admins_updated_at
  BEFORE UPDATE ON super_admins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tenants_updated_at ON tenants;
CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tenant_users_updated_at ON tenant_users;
CREATE TRIGGER update_tenant_users_updated_at
  BEFORE UPDATE ON tenant_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- INITIAL PLATFORM CONFIG
-- ========================================

INSERT INTO platform_config (key, value, encrypted, description) VALUES
  ('meta_api_version',                'v18.0', false, 'WhatsApp Cloud API version'),
  ('default_message_retention_days',  '90',    false, 'Default message retention period'),
  ('default_max_messages_per_day',    '10',    false, 'Default message frequency cap per contact'),
  ('default_quality_rating_threshold','80',    false, 'Minimum quality rating threshold'),
  ('default_spam_risk_threshold',     '50',    false, 'Maximum spam risk score threshold')
ON CONFLICT (key) DO NOTHING;
