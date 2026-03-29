-- ============================================================
-- MIGRATION: Support system tables
-- Run: node run-migration-support.js
-- ============================================================

-- Support Tickets
CREATE TABLE IF NOT EXISTS support_tickets (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID        NOT NULL,
    user_id          UUID        NOT NULL,
    user_name        VARCHAR(100) NOT NULL,
    user_email       VARCHAR(150) NOT NULL,
    subject          VARCHAR(200) NOT NULL,
    first_message    TEXT        NOT NULL,
    status           VARCHAR(30)  NOT NULL DEFAULT 'open',
    priority         VARCHAR(20)  NOT NULL DEFAULT 'normal',
    assigned_to      UUID,
    assigned_name    VARCHAR(100),
    alert_sent       BOOLEAN     NOT NULL DEFAULT false,
    first_reply_at   TIMESTAMP,
    resolved_at      TIMESTAMP,
    message_count    INTEGER     NOT NULL DEFAULT 0,
    last_message_at  TIMESTAMP,
    created_at       TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_tenant ON support_tickets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created ON support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_unread ON support_tickets(status, first_reply_at, alert_sent)
    WHERE status = 'open' AND first_reply_at IS NULL AND alert_sent = false;

-- Support Messages
CREATE TABLE IF NOT EXISTS support_messages (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id   UUID        NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_id   UUID        NOT NULL,
    sender_name VARCHAR(100) NOT NULL,
    sender_role VARCHAR(20) NOT NULL CHECK (sender_role IN ('user', 'agent')),
    content     TEXT        NOT NULL,
    attachments JSONB,
    is_read     BOOLEAN     NOT NULL DEFAULT false,
    read_at     TIMESTAMP,
    created_at  TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_messages_ticket ON support_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_created ON support_messages(created_at ASC);
CREATE INDEX IF NOT EXISTS idx_support_messages_unread ON support_messages(ticket_id, is_read) WHERE is_read = false;

SELECT 'Support tables migration complete' AS result;
