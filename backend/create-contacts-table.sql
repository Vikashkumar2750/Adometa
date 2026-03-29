-- Create contacts table
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    tags TEXT[] DEFAULT '{}',
    custom_fields JSONB,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    -- Foreign key
    CONSTRAINT fk_contacts_tenant FOREIGN KEY (tenant_id) 
        REFERENCES tenants(id) ON DELETE CASCADE
);

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_tenant_phone 
    ON contacts(tenant_id, phone_number);

CREATE INDEX IF NOT EXISTS idx_contacts_tenant_id 
    ON contacts(tenant_id);

CREATE INDEX IF NOT EXISTS idx_contacts_status 
    ON contacts(status);

CREATE INDEX IF NOT EXISTS idx_contacts_phone_number 
    ON contacts(phone_number);

-- Add comment
COMMENT ON TABLE contacts IS 'Stores WhatsApp contacts for each tenant';
