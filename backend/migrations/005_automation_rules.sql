-- Migration: automation_rules table
-- Run once to enable the Automation module
-- Date: 2026-03-28

CREATE TABLE IF NOT EXISTS automation_rules (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       VARCHAR NOT NULL,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'DRAFT',

    -- Trigger
    trigger_type            VARCHAR(50) NOT NULL,
    trigger_campaign_id     VARCHAR,
    trigger_wait_hours      INT NOT NULL DEFAULT 24,
    trigger_condition       VARCHAR,

    -- Action
    action_type                 VARCHAR(50) NOT NULL,
    action_schedule_offset_days INT NOT NULL DEFAULT 0,
    action_schedule_time        VARCHAR(10) NOT NULL DEFAULT '09:00',
    action_max_retries          INT NOT NULL DEFAULT 1,
    action_message              TEXT,

    -- Stats
    stats_runs      INT NOT NULL DEFAULT 0,
    stats_successes INT NOT NULL DEFAULT 0,
    stats_last_run  TIMESTAMPTZ,

    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automation_rules_tenant_status
    ON automation_rules(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_automation_rules_tenant
    ON automation_rules(tenant_id);
