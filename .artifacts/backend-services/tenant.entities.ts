import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
    ManyToOne,
    JoinColumn,
} from 'typeorm';

/**
 * Tenant Entity
 * 
 * Represents a client account in the multi-tenant system.
 * Each tenant is a separate business using the platform.
 */
@Entity('tenants')
@Index(['status'])
@Index(['plan'])
@Index(['owner_email'])
export class Tenant {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 255 })
    business_name: string;

    @Column({ type: 'varchar', length: 255 })
    owner_email: string;

    @Column({ type: 'varchar', length: 255 })
    owner_name: string;

    @Column({
        type: 'enum',
        enum: ['PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED', 'DELETED'],
        default: 'PENDING_APPROVAL',
    })
    status: string;

    @Column({
        type: 'enum',
        enum: ['FREE_TRIAL', 'BASIC', 'PRO', 'PREMIUM', 'ENTERPRISE'],
        default: 'FREE_TRIAL',
    })
    plan: string;

    @Column({ type: 'varchar', length: 50, default: 'UTC' })
    timezone: string;

    @Column({ type: 'varchar', length: 10, default: 'en' })
    locale: string;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>;

    @Column({ type: 'uuid', nullable: true })
    approved_by: string;

    @Column({ type: 'timestamp', nullable: true })
    approved_at: Date;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    @Column({ type: 'timestamp', nullable: true })
    deleted_at: Date;
}

/**
 * TenantUser Entity
 * 
 * Represents users within a tenant (team members).
 * All users are scoped to a specific tenant.
 */
@Entity('tenant_users')
@Index(['tenant_id'])
@Index(['email'])
@Index(['role'])
@Index(['tenant_id', 'email'], { unique: true })
export class TenantUser {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    tenant_id: string;

    @Column({ type: 'varchar', length: 255 })
    email: string;

    @Column({ type: 'varchar', length: 255 })
    password_hash: string;

    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({
        type: 'enum',
        enum: ['SUPER_ADMIN', 'TENANT_ADMIN', 'TENANT_MARKETER', 'TENANT_DEVELOPER', 'READ_ONLY'],
    })
    role: string;

    @Column({ type: 'jsonb', default: [] })
    permissions: string[];

    @Column({ type: 'boolean', default: true })
    is_active: boolean;

    @Column({ type: 'timestamp', nullable: true })
    last_login_at: Date;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    @ManyToOne(() => Tenant)
    @JoinColumn({ name: 'tenant_id' })
    tenant: Tenant;
}

/**
 * TenantWabaConfig Entity
 * 
 * CRITICAL SECURITY ENTITY
 * 
 * Stores WhatsApp Business Account configuration per tenant.
 * Access token is ENCRYPTED using AES-256-GCM.
 * 
 * NEVER expose encrypted_access_token to frontend or logs.
 */
@Entity('tenant_waba_config')
@Index(['tenant_id'], { unique: true })
@Index(['waba_id'])
export class TenantWabaConfig {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    tenant_id: string;

    @Column({ type: 'varchar', length: 255 })
    waba_id: string;

    @Column({ type: 'varchar', length: 255 })
    phone_number_id: string;

    @Column({ type: 'varchar', length: 20 })
    phone_number: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    display_name: string;

    /**
     * CRITICAL: This field contains encrypted WhatsApp access token
     * Format: iv:authTag:encryptedData (base64)
     * NEVER expose this field in API responses
     */
    @Column({ type: 'text' })
    encrypted_access_token: string;

    @Column({ type: 'timestamp', nullable: true })
    token_expires_at: Date;

    @Column({ type: 'varchar', length: 20, nullable: true })
    quality_rating: string;

    @Column({ type: 'varchar', length: 50, default: 'PENDING_APPROVAL' })
    status: string;

    @Column({ type: 'timestamp', nullable: true })
    connected_at: Date;

    @Column({ type: 'uuid', nullable: true })
    approved_by: string;

    @Column({ type: 'timestamp', nullable: true })
    approved_at: Date;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    @ManyToOne(() => Tenant)
    @JoinColumn({ name: 'tenant_id' })
    tenant: Tenant;
}

/**
 * TenantContact Entity
 * 
 * Stores contact information for each tenant.
 * Includes opt-in tracking for compliance.
 */
@Entity('tenant_contacts')
@Index(['tenant_id'])
@Index(['phone'])
@Index(['opt_in_status'])
@Index(['tenant_id', 'phone'], { unique: true })
export class TenantContact {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    tenant_id: string;

    @Column({ type: 'varchar', length: 20 })
    phone: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    name: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    email: string;

    @Column({ type: 'boolean', default: false })
    opt_in_status: boolean;

    @Column({
        type: 'enum',
        enum: ['WEB_FORM', 'API', 'IMPORT', 'MANUAL'],
        nullable: true,
    })
    opt_in_source: string;

    @Column({ type: 'timestamp', nullable: true })
    opt_in_timestamp: Date;

    @Column({ type: 'inet', nullable: true })
    opt_in_ip: string;

    @Column({ type: 'timestamp', nullable: true })
    opted_out_at: Date;

    @Column({ type: 'jsonb', default: [] })
    tags: string[];

    @Column({ type: 'jsonb', default: {} })
    custom_fields: Record<string, any>;

    @Column({ type: 'boolean', default: false })
    is_dnd: boolean;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    @ManyToOne(() => Tenant)
    @JoinColumn({ name: 'tenant_id' })
    tenant: Tenant;
}

/**
 * TenantTemplate Entity
 * 
 * Stores WhatsApp message templates for each tenant.
 * Templates must be approved by Meta before use.
 */
@Entity('tenant_templates')
@Index(['tenant_id'])
@Index(['status'])
@Index(['category'])
export class TenantTemplate {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    tenant_id: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    meta_template_id: string;

    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({ type: 'varchar', length: 50 })
    category: string; // MARKETING, TRANSACTIONAL, OTP

    @Column({ type: 'varchar', length: 10, default: 'en' })
    language: string;

    @Column({
        type: 'enum',
        enum: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'],
        default: 'DRAFT',
    })
    status: string;

    @Column({ type: 'text' })
    body: string;

    @Column({ type: 'jsonb', default: [] })
    variables: string[];

    @Column({ type: 'integer', default: 0 })
    spam_risk_score: number;

    @Column({ type: 'text', nullable: true })
    rejection_reason: string;

    @Column({ type: 'uuid', nullable: true })
    approved_by: string;

    @Column({ type: 'timestamp', nullable: true })
    approved_at: Date;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    @ManyToOne(() => Tenant)
    @JoinColumn({ name: 'tenant_id' })
    tenant: Tenant;
}

/**
 * TenantCampaign Entity
 * 
 * Stores marketing campaigns for each tenant.
 */
@Entity('tenant_campaigns')
@Index(['tenant_id'])
@Index(['status'])
@Index(['scheduled_at'])
export class TenantCampaign {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    tenant_id: string;

    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({ type: 'uuid', nullable: true })
    template_id: string;

    @Column({ type: 'uuid', nullable: true })
    segment_id: string;

    @Column({
        type: 'enum',
        enum: ['DRAFT', 'SCHEDULED', 'PROCESSING', 'COMPLETED', 'PAUSED', 'FAILED'],
        default: 'DRAFT',
    })
    status: string;

    @Column({ type: 'timestamp', nullable: true })
    scheduled_at: Date;

    @Column({ type: 'timestamp', nullable: true })
    started_at: Date;

    @Column({ type: 'timestamp', nullable: true })
    completed_at: Date;

    @Column({ type: 'integer', default: 0 })
    total_contacts: number;

    @Column({ type: 'integer', default: 0 })
    messages_sent: number;

    @Column({ type: 'integer', default: 0 })
    messages_delivered: number;

    @Column({ type: 'integer', default: 0 })
    messages_read: number;

    @Column({ type: 'integer', default: 0 })
    messages_failed: number;

    @Column({ type: 'uuid', nullable: true })
    created_by: string;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    @ManyToOne(() => Tenant)
    @JoinColumn({ name: 'tenant_id' })
    tenant: Tenant;
}

/**
 * TenantMessage Entity
 * 
 * Stores individual messages sent by tenants.
 * Includes delivery status tracking.
 */
@Entity('tenant_messages')
@Index(['tenant_id'])
@Index(['campaign_id'])
@Index(['contact_id'])
@Index(['status'])
@Index(['created_at'])
export class TenantMessage {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    tenant_id: string;

    @Column({ type: 'uuid', nullable: true })
    campaign_id: string;

    @Column({ type: 'uuid', nullable: true })
    contact_id: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    meta_message_id: string;

    @Column({ type: 'varchar', length: 20 })
    phone: string;

    @Column({ type: 'uuid', nullable: true })
    template_id: string;

    @Column({ type: 'text', nullable: true })
    body: string;

    @Column({
        type: 'enum',
        enum: ['QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED'],
        default: 'QUEUED',
    })
    status: string;

    @Column({ type: 'timestamp', nullable: true })
    sent_at: Date;

    @Column({ type: 'timestamp', nullable: true })
    delivered_at: Date;

    @Column({ type: 'timestamp', nullable: true })
    read_at: Date;

    @Column({ type: 'timestamp', nullable: true })
    failed_at: Date;

    @Column({ type: 'text', nullable: true })
    error_message: string;

    @CreateDateColumn()
    created_at: Date;

    @ManyToOne(() => Tenant)
    @JoinColumn({ name: 'tenant_id' })
    tenant: Tenant;
}

/**
 * TenantAuditLog Entity
 * 
 * Immutable audit logs for tenant actions.
 * NEVER log sensitive data (tokens, passwords).
 */
@Entity('tenant_audit_logs')
@Index(['tenant_id'])
@Index(['user_id'])
@Index(['created_at'])
export class TenantAuditLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    tenant_id: string;

    @Column({ type: 'uuid', nullable: true })
    user_id: string;

    @Column({ type: 'varchar', length: 255 })
    action: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    resource_type: string;

    @Column({ type: 'uuid', nullable: true })
    resource_id: string;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>;

    @Column({ type: 'inet', nullable: true })
    ip_address: string;

    @Column({ type: 'text', nullable: true })
    user_agent: string;

    @CreateDateColumn()
    created_at: Date;

    @ManyToOne(() => Tenant)
    @JoinColumn({ name: 'tenant_id' })
    tenant: Tenant;
}
