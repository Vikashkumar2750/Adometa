-- ========================================
-- TECHAASVIK - DATABASE SCHEMA
-- ========================================
-- Multi-Tenant WhatsApp Marketing SaaS
-- CRITICAL: Every tenant table MUST have tenant_id
-- ========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================================
-- ENUMS
-- ========================================

CREATE TYPE user_role AS ENUM (
  'SUPER_ADMIN',
  'TENANT_ADMIN',
  'TENANT_MARKETER',
  'TENANT_DEVELOPER',
  'READ_ONLY'
);

CREATE TYPE tenant_status AS ENUM (
  'PENDING_APPROVAL',
  'ACTIVE',
  'SUSPENDED',
  'DELETED'
);

CREATE TYPE subscription_plan AS ENUM (
  'FREE_TRIAL',
  'BASIC',
  'PRO',
  'PREMIUM',
  'ENTERPRISE'
);

CREATE TYPE message_status AS ENUM (
  'QUEUED',
  'SENT',
  'DELIVERED',
  'READ',
  'FAILED'
);

CREATE TYPE campaign_status AS ENUM (
  'DRAFT',
  'SCHEDULED',
  'PROCESSING',
  'COMPLETED',
  'PAUSED',
  'FAILED'
);

CREATE TYPE template_status AS ENUM (
  'DRAFT',
  'PENDING_APPROVAL',
  'APPROVED',
  'REJECTED'
);

CREATE TYPE opt_in_source AS ENUM (
  'WEB_FORM',
  'API',
  'IMPORT',
  'MANUAL'
);

CREATE TYPE compliance_violation_type AS ENUM (
  'DND_VIOLATION',
  'FREQUENCY_CAP_EXCEEDED',
  'LOW_QUALITY_RATING',
  'HIGH_SPAM_RISK',
  'TEMPLATE_REJECTION'
);

CREATE TYPE bsp_provider AS ENUM (
  'META',
  'TWILIO',
  'DIALOG360'
);

-- ========================================
-- SYSTEM TABLES (No tenant_id)
-- ========================================

-- Super Admins
CREATE TABLE super_admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_super_admins_email ON super_admins(email);

-- Platform Configuration
CREATE TABLE platform_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(255) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  encrypted BOOLEAN DEFAULT false,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_platform_config_key ON platform_config(key);

-- BSP Provider Configuration
CREATE TABLE bsp_providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider bsp_provider NOT NULL,
  is_enabled BOOLEAN DEFAULT false,
  config JSONB NOT NULL, -- Encrypted credentials
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- System Audit Logs (Super Admin actions)
CREATE TABLE system_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES super_admins(id),
  action VARCHAR(255) NOT NULL,
  resource_type VARCHAR(100),
  resource_id UUID,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_system_audit_logs_admin ON system_audit_logs(admin_id);
CREATE INDEX idx_system_audit_logs_created ON system_audit_logs(created_at DESC);

-- System Health Metrics
CREATE TABLE system_health_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_name VARCHAR(255) NOT NULL,
  metric_value NUMERIC NOT NULL,
  metadata JSONB,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_system_health_metrics_name ON system_health_metrics(metric_name);
CREATE INDEX idx_system_health_metrics_recorded ON system_health_metrics(recorded_at DESC);

-- ========================================
-- TENANT TABLES (All have tenant_id)
-- ========================================

-- Tenants (Clients)
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_name VARCHAR(255) NOT NULL,
  owner_email VARCHAR(255) NOT NULL,
  owner_name VARCHAR(255) NOT NULL,
  status tenant_status DEFAULT 'PENDING_APPROVAL',
  plan subscription_plan DEFAULT 'FREE_TRIAL',
  timezone VARCHAR(50) DEFAULT 'UTC',
  locale VARCHAR(10) DEFAULT 'en',
  metadata JSONB,
  approved_by UUID REFERENCES super_admins(id),
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX idx_tenants_status ON tenants(status);
CREATE INDEX idx_tenants_plan ON tenants(plan);
CREATE INDEX idx_tenants_owner_email ON tenants(owner_email);

-- Tenant Users
CREATE TABLE tenant_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role user_role NOT NULL,
  permissions JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, email)
);

CREATE INDEX idx_tenant_users_tenant ON tenant_users(tenant_id);
CREATE INDEX idx_tenant_users_email ON tenant_users(email);
CREATE INDEX idx_tenant_users_role ON tenant_users(role);

-- Tenant API Keys
CREATE TABLE tenant_api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  key_hash VARCHAR(255) NOT NULL,
  key_prefix VARCHAR(20) NOT NULL, -- For identification (e.g., "ta_abc...")
  scoped_permissions JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_by UUID REFERENCES tenant_users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMP
);

CREATE INDEX idx_tenant_api_keys_tenant ON tenant_api_keys(tenant_id);
CREATE INDEX idx_tenant_api_keys_prefix ON tenant_api_keys(key_prefix);

-- ========================================
-- WHATSAPP INTEGRATION
-- ========================================

-- Tenant WABA Configuration
CREATE TABLE tenant_waba_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  waba_id VARCHAR(255) NOT NULL,
  phone_number_id VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  display_name VARCHAR(255),
  encrypted_access_token TEXT NOT NULL, -- AES-256-GCM encrypted
  token_expires_at TIMESTAMP,
  quality_rating VARCHAR(20),
  status VARCHAR(50) DEFAULT 'PENDING_APPROVAL',
  connected_at TIMESTAMP,
  approved_by UUID REFERENCES super_admins(id),
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id)
);

CREATE INDEX idx_tenant_waba_config_tenant ON tenant_waba_config(tenant_id);
CREATE INDEX idx_tenant_waba_config_waba ON tenant_waba_config(waba_id);

-- Tenant Webhooks
CREATE TABLE tenant_webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  webhook_url TEXT NOT NULL,
  verify_token VARCHAR(255) NOT NULL,
  encrypted_secret TEXT NOT NULL, -- For signature verification
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tenant_webhooks_tenant ON tenant_webhooks(tenant_id);

-- Tenant Templates
CREATE TABLE tenant_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  meta_template_id VARCHAR(255), -- From Meta API
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL, -- MARKETING, TRANSACTIONAL, OTP
  language VARCHAR(10) DEFAULT 'en',
  status template_status DEFAULT 'DRAFT',
  body TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  spam_risk_score INTEGER DEFAULT 0,
  rejection_reason TEXT,
  approved_by UUID REFERENCES super_admins(id),
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tenant_templates_tenant ON tenant_templates(tenant_id);
CREATE INDEX idx_tenant_templates_status ON tenant_templates(status);
CREATE INDEX idx_tenant_templates_category ON tenant_templates(category);

-- ========================================
-- CONTACTS & SEGMENTS
-- ========================================

-- Tenant Contacts
CREATE TABLE tenant_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  phone VARCHAR(20) NOT NULL,
  name VARCHAR(255),
  email VARCHAR(255),
  opt_in_status BOOLEAN DEFAULT false,
  opt_in_source opt_in_source,
  opt_in_timestamp TIMESTAMP,
  opt_in_ip INET,
  opted_out_at TIMESTAMP,
  tags JSONB DEFAULT '[]',
  custom_fields JSONB DEFAULT '{}',
  is_dnd BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, phone)
);

CREATE INDEX idx_tenant_contacts_tenant ON tenant_contacts(tenant_id);
CREATE INDEX idx_tenant_contacts_phone ON tenant_contacts(phone);
CREATE INDEX idx_tenant_contacts_opt_in ON tenant_contacts(opt_in_status);

-- Tenant Segments
CREATE TABLE tenant_segments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  rules JSONB NOT NULL, -- Filter rules
  contact_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tenant_segments_tenant ON tenant_segments(tenant_id);

-- ========================================
-- CAMPAIGNS & MESSAGES
-- ========================================

-- Tenant Campaigns
CREATE TABLE tenant_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  template_id UUID REFERENCES tenant_templates(id),
  segment_id UUID REFERENCES tenant_segments(id),
  status campaign_status DEFAULT 'DRAFT',
  scheduled_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  total_contacts INTEGER DEFAULT 0,
  messages_sent INTEGER DEFAULT 0,
  messages_delivered INTEGER DEFAULT 0,
  messages_read INTEGER DEFAULT 0,
  messages_failed INTEGER DEFAULT 0,
  created_by UUID REFERENCES tenant_users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tenant_campaigns_tenant ON tenant_campaigns(tenant_id);
CREATE INDEX idx_tenant_campaigns_status ON tenant_campaigns(status);
CREATE INDEX idx_tenant_campaigns_scheduled ON tenant_campaigns(scheduled_at);

-- Tenant Messages
CREATE TABLE tenant_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES tenant_campaigns(id),
  contact_id UUID REFERENCES tenant_contacts(id),
  meta_message_id VARCHAR(255), -- From WhatsApp API
  phone VARCHAR(20) NOT NULL,
  template_id UUID REFERENCES tenant_templates(id),
  body TEXT,
  status message_status DEFAULT 'QUEUED',
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  read_at TIMESTAMP,
  failed_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tenant_messages_tenant ON tenant_messages(tenant_id);
CREATE INDEX idx_tenant_messages_campaign ON tenant_messages(campaign_id);
CREATE INDEX idx_tenant_messages_contact ON tenant_messages(contact_id);
CREATE INDEX idx_tenant_messages_status ON tenant_messages(status);
CREATE INDEX idx_tenant_messages_created ON tenant_messages(created_at DESC);

-- ========================================
-- COMPLIANCE & GOVERNANCE
-- ========================================

-- Tenant Opt-Ins
CREATE TABLE tenant_opt_ins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES tenant_contacts(id),
  phone VARCHAR(20) NOT NULL,
  source opt_in_source NOT NULL,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tenant_opt_ins_tenant ON tenant_opt_ins(tenant_id);
CREATE INDEX idx_tenant_opt_ins_contact ON tenant_opt_ins(contact_id);

-- Tenant Opt-Outs
CREATE TABLE tenant_opt_outs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES tenant_contacts(id),
  phone VARCHAR(20) NOT NULL,
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tenant_opt_outs_tenant ON tenant_opt_outs(tenant_id);
CREATE INDEX idx_tenant_opt_outs_contact ON tenant_opt_outs(contact_id);

-- Tenant Compliance Violations
CREATE TABLE tenant_compliance_violations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type compliance_violation_type NOT NULL,
  severity VARCHAR(20) NOT NULL, -- LOW, MEDIUM, HIGH, CRITICAL
  description TEXT,
  auto_action VARCHAR(50), -- WARNING, PAUSE_CAMPAIGN, SUSPEND_TENANT
  metadata JSONB,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tenant_compliance_violations_tenant ON tenant_compliance_violations(tenant_id);
CREATE INDEX idx_tenant_compliance_violations_type ON tenant_compliance_violations(type);
CREATE INDEX idx_tenant_compliance_violations_resolved ON tenant_compliance_violations(resolved);

-- Tenant Quality Ratings
CREATE TABLE tenant_quality_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  rating VARCHAR(20) NOT NULL, -- GREEN, YELLOW, RED
  score INTEGER, -- 0-100
  metadata JSONB,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tenant_quality_ratings_tenant ON tenant_quality_ratings(tenant_id);

-- ========================================
-- BILLING & CREDITS
-- ========================================

-- Tenant Subscriptions
CREATE TABLE tenant_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan subscription_plan NOT NULL,
  status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, CANCELLED, EXPIRED
  billing_cycle VARCHAR(20) DEFAULT 'MONTHLY', -- MONTHLY, YEARLY
  price_per_cycle NUMERIC(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ends_at TIMESTAMP,
  auto_renew BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tenant_subscriptions_tenant ON tenant_subscriptions(tenant_id);
CREATE INDEX idx_tenant_subscriptions_status ON tenant_subscriptions(status);

-- Tenant Invoices
CREATE TABLE tenant_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, PAID, FAILED, REFUNDED
  payment_method VARCHAR(50),
  payment_id VARCHAR(255), -- From payment gateway
  paid_at TIMESTAMP,
  due_date TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tenant_invoices_tenant ON tenant_invoices(tenant_id);
CREATE INDEX idx_tenant_invoices_status ON tenant_invoices(status);

-- Tenant Credit Balance
CREATE TABLE tenant_credit_balance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  balance NUMERIC(10, 2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'USD',
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id)
);

CREATE INDEX idx_tenant_credit_balance_tenant ON tenant_credit_balance(tenant_id);

-- Tenant Credit Transactions
CREATE TABLE tenant_credit_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  type VARCHAR(50) NOT NULL, -- PURCHASE, USAGE, REFUND, BONUS
  description TEXT,
  balance_after NUMERIC(10, 2) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tenant_credit_transactions_tenant ON tenant_credit_transactions(tenant_id);
CREATE INDEX idx_tenant_credit_transactions_created ON tenant_credit_transactions(created_at DESC);

-- ========================================
-- AUDIT & LOGS
-- ========================================

-- Tenant Audit Logs
CREATE TABLE tenant_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES tenant_users(id),
  action VARCHAR(255) NOT NULL,
  resource_type VARCHAR(100),
  resource_id UUID,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tenant_audit_logs_tenant ON tenant_audit_logs(tenant_id);
CREATE INDEX idx_tenant_audit_logs_user ON tenant_audit_logs(user_id);
CREATE INDEX idx_tenant_audit_logs_created ON tenant_audit_logs(created_at DESC);

-- Tenant Webhook Logs
CREATE TABLE tenant_webhook_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  processing_time_ms INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tenant_webhook_logs_tenant ON tenant_webhook_logs(tenant_id);
CREATE INDEX idx_tenant_webhook_logs_event ON tenant_webhook_logs(event_type);
CREATE INDEX idx_tenant_webhook_logs_created ON tenant_webhook_logs(created_at DESC);

-- ========================================
-- FUNCTIONS & TRIGGERS
-- ========================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_super_admins_updated_at BEFORE UPDATE ON super_admins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_platform_config_updated_at BEFORE UPDATE ON platform_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tenant_users_updated_at BEFORE UPDATE ON tenant_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tenant_waba_config_updated_at BEFORE UPDATE ON tenant_waba_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tenant_templates_updated_at BEFORE UPDATE ON tenant_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tenant_contacts_updated_at BEFORE UPDATE ON tenant_contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tenant_segments_updated_at BEFORE UPDATE ON tenant_segments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tenant_campaigns_updated_at BEFORE UPDATE ON tenant_campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tenant_subscriptions_updated_at BEFORE UPDATE ON tenant_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- INITIAL DATA
-- ========================================

-- Insert default platform config
INSERT INTO platform_config (key, value, encrypted, description) VALUES
('meta_api_version', 'v18.0', false, 'WhatsApp Cloud API version'),
('default_message_retention_days', '90', false, 'Default message retention period'),
('default_max_messages_per_day', '10', false, 'Default message frequency cap per contact'),
('default_quality_rating_threshold', '80', false, 'Minimum quality rating threshold'),
('default_spam_risk_threshold', '50', false, 'Maximum spam risk score threshold');

-- ========================================
-- ROW LEVEL SECURITY (Optional - Advanced)
-- ========================================
-- Enable RLS for extra security layer
-- ALTER TABLE tenant_contacts ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY tenant_isolation ON tenant_contacts FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- ========================================
-- COMMENTS
-- ========================================
COMMENT ON TABLE tenants IS 'Multi-tenant clients - each client is a separate tenant';
COMMENT ON TABLE tenant_waba_config IS 'WhatsApp Business Account configuration per tenant - tokens are encrypted';
COMMENT ON TABLE tenant_messages IS 'All messages sent by tenants - tenant_id enforced';
COMMENT ON COLUMN tenant_waba_config.encrypted_access_token IS 'AES-256-GCM encrypted WhatsApp access token - NEVER expose';
