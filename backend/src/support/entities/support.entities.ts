import {
    Entity, Column, PrimaryGeneratedColumn,
    CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

export type TicketStatus = 'open' | 'in_progress' | 'waiting_user' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';

@Entity('support_tickets')
@Index(['tenant_id'])
@Index(['status'])
@Index(['created_at'])
export class SupportTicket {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    tenant_id: string;

    @Column({ type: 'uuid' })
    user_id: string;

    @Column({ type: 'varchar', length: 100 })
    user_name: string;

    @Column({ type: 'varchar', length: 150 })
    user_email: string;

    @Column({ type: 'varchar', length: 200 })
    subject: string;

    @Column({ type: 'text' })
    first_message: string;

    @Column({ type: 'varchar', length: 30, default: 'open' })
    status: TicketStatus;

    @Column({ type: 'varchar', length: 20, default: 'normal' })
    priority: TicketPriority;

    /** UUID of support agent assigned, null if unassigned */
    @Column({ type: 'uuid', nullable: true })
    assigned_to: string | null;

    @Column({ type: 'varchar', length: 100, nullable: true })
    assigned_name: string | null;

    /** Tracks whether the 5-min alert has been sent */
    @Column({ type: 'boolean', default: false })
    alert_sent: boolean;

    /** Timestamp of first agent reply */
    @Column({ type: 'timestamp', nullable: true })
    first_reply_at: Date | null;

    @Column({ type: 'timestamp', nullable: true })
    resolved_at: Date | null;

    @Column({ type: 'integer', default: 0 })
    message_count: number;

    /** Last message timestamp for sorting */
    @Column({ type: 'timestamp', nullable: true })
    last_message_at: Date | null;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}

@Entity('support_messages')
@Index(['ticket_id'])
@Index(['created_at'])
export class SupportMessage {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    ticket_id: string;

    @Column({ type: 'uuid' })
    sender_id: string;

    @Column({ type: 'varchar', length: 100 })
    sender_name: string;

    /** 'user' | 'agent' */
    @Column({ type: 'varchar', length: 20 })
    sender_role: 'user' | 'agent';

    @Column({ type: 'text' })
    content: string;

    /** Stored file paths for attachments */
    @Column({ type: 'jsonb', nullable: true })
    attachments: { filename: string; url: string; mime: string; size: number }[] | null;

    @Column({ type: 'boolean', default: false })
    is_read: boolean;

    @Column({ type: 'timestamp', nullable: true })
    read_at: Date | null;

    @CreateDateColumn()
    created_at: Date;
}
