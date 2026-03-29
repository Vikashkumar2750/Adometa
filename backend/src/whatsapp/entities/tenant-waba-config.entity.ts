import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

/**
 * TenantWabaConfig Entity
 * 
 * Stores WhatsApp Business Account (WABA) configuration for each tenant
 * 
 * Security:
 * - access_token is ALWAYS encrypted (AES-256-GCM)
 * - One WABA per tenant (UNIQUE constraint)
 * - Super Admin approval required
 */
@Entity('tenant_waba_config')
@Index(['tenant_id'])
@Index(['waba_id'])
export class TenantWabaConfig {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    tenant_id: string;

    @Column()
    waba_id: string; // WhatsApp Business Account ID

    @Column()
    phone_number_id: string; // Phone Number ID from Meta

    @Column({ length: 20 })
    phone_number: string; // Actual phone number (e.g., +1234567890)

    @Column({ nullable: true })
    display_name: string; // Business display name

    @Column({ type: 'text' })
    encrypted_access_token: string; // ENCRYPTED access token

    @Column({ type: 'timestamp', nullable: true })
    token_expires_at: Date | null;

    @Column({ length: 20, nullable: true })
    quality_rating: string; // GREEN, YELLOW, RED

    @Column({ length: 50, default: 'PENDING_APPROVAL' })
    status: string; // PENDING_APPROVAL, ACTIVE, SUSPENDED

    @Column({ type: 'timestamp', nullable: true })
    connected_at: Date | null;

    @Column({ type: 'uuid', nullable: true })
    approved_by: string | null;

    @Column({ type: 'timestamp', nullable: true })
    approved_at: Date | null;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created_at: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    updated_at: Date;
}
