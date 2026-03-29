import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    Index,
} from 'typeorm';

@Entity('segments')
@Index(['tenantId'])
export class Segment {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    @Index()
    tenantId: string;

    @Column()
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    /** Number of contacts in this segment (stored for quick display) */
    @Column({ type: 'int', default: 0 })
    contactCount: number;

    /**
     * Contact phone numbers stored as a JSONB array.
     * Deduplication by phone number is enforced at import time.
     */
    @Column({ type: 'jsonb', default: '[]' })
    contactPhones: string[];

    /**
     * Full contact data stored as JSONB (name + phone).
     * Shape: [{ phone, firstName, lastName, email, tags }]
     */
    @Column({ type: 'jsonb', default: '[]' })
    contacts: Array<{
        phone: string;
        firstName?: string;
        lastName?: string;
        email?: string;
        tags?: string[];
    }>;

    /** Whether this segment is available for use in campaigns */
    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    /** Source of segment contacts (e.g., 'csv', 'manual', 'tag') */
    @Column({ nullable: true })
    source: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @DeleteDateColumn()
    deletedAt: Date;
}
