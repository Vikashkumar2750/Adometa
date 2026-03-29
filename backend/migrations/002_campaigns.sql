-- Create campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "tenantId" VARCHAR NOT NULL,
    name VARCHAR NOT NULL,
    description TEXT,
    "templateId" VARCHAR NOT NULL,
    "templateName" VARCHAR,
    "segmentId" VARCHAR,
    "segmentName" VARCHAR,
    status VARCHAR NOT NULL DEFAULT 'draft',
    "scheduledAt" TIMESTAMP,
    "startedAt" TIMESTAMP,
    "completedAt" TIMESTAMP,
    "totalRecipients" INTEGER DEFAULT 0,
    "sentCount" INTEGER DEFAULT 0,
    "deliveredCount" INTEGER DEFAULT 0,
    "readCount" INTEGER DEFAULT 0,
    "failedCount" INTEGER DEFAULT 0,
    variables JSONB,
    "contactIds" TEXT[],
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW(),
    "deletedAt" TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "IDX_CAMPAIGNS_TENANT" ON campaigns("tenantId");
CREATE INDEX IF NOT EXISTS "IDX_CAMPAIGNS_STATUS" ON campaigns(status);
CREATE INDEX IF NOT EXISTS "IDX_CAMPAIGNS_SCHEDULED" ON campaigns("scheduledAt");
CREATE INDEX IF NOT EXISTS "IDX_CAMPAIGNS_DELETED" ON campaigns("deletedAt");

-- Add comment
COMMENT ON TABLE campaigns IS 'WhatsApp marketing campaigns';
