-- Migration: Create templates table
-- Date: 2026-02-11
-- Description: Add templates table for WhatsApp message templates

-- Create templates table
CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenantId" VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL DEFAULT 'MARKETING',
    language VARCHAR(10) NOT NULL DEFAULT 'en',
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    "headerText" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "footerText" TEXT,
    buttons TEXT[], -- Array of button labels
    variables JSONB, -- Variable definitions
    components JSONB, -- Full template components
    "metaTemplateId" VARCHAR(255),
    "metaStatus" VARCHAR(50),
    "rejectionReason" TEXT,
    "submittedAt" TIMESTAMP,
    "approvedAt" TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_templates_tenant_id ON templates("tenantId");
CREATE INDEX IF NOT EXISTS idx_templates_tenant_status ON templates("tenantId", status);
CREATE INDEX IF NOT EXISTS idx_templates_tenant_category ON templates("tenantId", category);
CREATE INDEX IF NOT EXISTS idx_templates_meta_template_id ON templates("metaTemplateId");
CREATE INDEX IF NOT EXISTS idx_templates_deleted_at ON templates("deletedAt");

-- Add constraint for unique template name per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_templates_tenant_name_unique 
ON templates("tenantId", name) 
WHERE "deletedAt" IS NULL;

-- Add check constraints
ALTER TABLE templates
ADD CONSTRAINT chk_templates_category 
CHECK (category IN ('MARKETING', 'UTILITY', 'AUTHENTICATION'));

ALTER TABLE templates
ADD CONSTRAINT chk_templates_status 
CHECK (status IN ('draft', 'pending', 'approved', 'rejected'));

ALTER TABLE templates
ADD CONSTRAINT chk_templates_language 
CHECK (language IN ('en', 'en_US', 'es', 'pt_BR', 'hi'));

-- Add comments
COMMENT ON TABLE templates IS 'WhatsApp message templates for campaigns';
COMMENT ON COLUMN templates."tenantId" IS 'Reference to tenant who owns this template';
COMMENT ON COLUMN templates.category IS 'Template category: MARKETING, UTILITY, or AUTHENTICATION';
COMMENT ON COLUMN templates.status IS 'Template status: draft, pending, approved, or rejected';
COMMENT ON COLUMN templates."metaTemplateId" IS 'Meta/WhatsApp template ID after approval';
COMMENT ON COLUMN templates."metaStatus" IS 'Status from Meta API';
COMMENT ON COLUMN templates.variables IS 'Variable definitions for template placeholders';
COMMENT ON COLUMN templates.components IS 'Full template components structure for Meta API';
