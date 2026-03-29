import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('leads')
export class Lead {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ length: 150 })
    name: string;

    @Column({ length: 200 })
    email: string;

    @Column({ length: 30 })
    phone: string;

    @Column({ length: 200 })
    company: string;

    @Column({ length: 50, default: '1-10' })
    company_size: string;

    @Column({ length: 500, nullable: true })
    website: string;

    @Column({ type: 'text', nullable: true })
    use_case: string;

    @Column({ length: 50, default: 'NEW' }) // NEW | CONTACTED | CONVERTED | CLOSED
    status: string;

    @Column({ type: 'text', nullable: true })
    notes: string;

    @Column({ length: 50, nullable: true })
    source: string; // landing_page | contact_page | etc.

    @CreateDateColumn()
    created_at: Date;
}
