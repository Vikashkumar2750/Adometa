import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

/**
 * AuditLog Entity
 *
 * Maps to the existing 'tenant_audit_logs' table in the database.
 * DB schema: id (uuid), tenant_id (uuid), user_id (uuid), action (varchar),
 *            resource_type (varchar), resource_id (uuid), metadata (jsonb),
 *            ip_address (inet), user_agent (text), created_at (timestamp)
 *
 * NOTE: ip_address is 'inet' in PostgreSQL. We use type 'varchar' in the entity
 * so TypeORM treats it as a plain string — PostgreSQL accepts valid IP strings
 * into inet columns implicitly. 'Unknown' is not a valid inet value so we
 * default to null when we can't determine the IP.
 */
@Entity('tenant_audit_logs')
export class AuditLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid', nullable: true })
    tenant_id: string | null;

    @Column({ type: 'uuid', nullable: true })
    user_id: string | null;

    @Column({ type: 'varchar', length: 100 })
    action: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    resource_type: string | null;

    @Column({ type: 'uuid', nullable: true })
    resource_id: string | null;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any> | null;

    /**
     * ip_address in DB is type 'inet'. TypeORM doesn't natively support 'inet',
     * so we declare it as 'varchar' and PostgreSQL will cast the string to inet on write.
     * We NEVER write 'Unknown' here — only valid IPs or null.
     */
    @Column({ type: 'varchar', length: 45, nullable: true })
    ip_address: string | null;

    @Column({ type: 'text', nullable: true })
    user_agent: string | null;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created_at: Date;
}
