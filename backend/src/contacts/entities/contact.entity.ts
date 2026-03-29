import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    Index,
} from 'typeorm';

/**
 * Contact Entity
 * 
 * Stores WhatsApp contacts for each tenant
 * Includes support for tags, custom fields, and soft delete
 */
@Entity('contacts')
@Index(['tenantId', 'phoneNumber'], { unique: true })
@Index(['tenantId'])
@Index(['status'])
export class Contact {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'tenant_id', type: 'uuid' })
    @Index()
    tenantId: string;

    @Column({ name: 'phone_number', length: 20 })
    @Index()
    phoneNumber: string;

    @Column({ name: 'first_name', length: 100, nullable: true })
    firstName: string;

    @Column({ name: 'last_name', length: 100, nullable: true })
    lastName: string;

    @Column({ length: 255, nullable: true })
    email: string;

    @Column({ type: 'text', array: true, default: '{}' })
    tags: string[];

    @Column({ name: 'custom_fields', type: 'jsonb', nullable: true })
    customFields: Record<string, any>;

    @Column({ length: 20, default: 'active' })
    @Index()
    status: 'active' | 'blocked' | 'unsubscribed';

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @DeleteDateColumn({ name: 'deleted_at' })
    deletedAt: Date;

    // Virtual field for full name
    get fullName(): string {
        if (this.firstName && this.lastName) {
            return `${this.firstName} ${this.lastName}`;
        }
        return this.firstName || this.lastName || this.phoneNumber;
    }
}
