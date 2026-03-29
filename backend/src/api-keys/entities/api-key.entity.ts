import {
    Entity, Column, PrimaryGeneratedColumn,
    CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

@Entity('tenant_api_keys')
@Index(['tenant_id'])
@Index(['key_hash'], { unique: true })
export class ApiKey {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    tenant_id: string;

    @Column({ type: 'varchar', length: 100 })
    name: string;

    /** bcrypt-hashed version of the raw key — never store raw */
    @Column({ type: 'varchar', length: 255 })
    key_hash: string;

    /** First 8 chars of the raw key for display (e.g. "tak_xkJ3...") */
    @Column({ type: 'varchar', length: 20 })
    key_prefix: string;

    /** Comma-separated scopes: read, write, campaigns, contacts */
    @Column({ type: 'varchar', length: 500, default: 'read' })
    scopes: string;

    @Column({ type: 'boolean', default: true })
    is_active: boolean;

    @Column({ type: 'timestamp', nullable: true })
    expires_at: Date | null;

    @Column({ type: 'timestamp', nullable: true })
    last_used_at: Date | null;

    @Column({ type: 'bigint', default: 0 })
    total_requests: number;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
