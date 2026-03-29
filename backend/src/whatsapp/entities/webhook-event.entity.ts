import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

/**
 * WebhookEvent Entity
 * 
 * Stores all WhatsApp webhook events for debugging and tracking
 * 
 * Event Types:
 * - message_status: Message delivery status updates
 * - message_received: Incoming messages from users
 * - account_update: Account status changes
 */
@Entity('tenant_webhook_events')
@Index(['tenant_id', 'created_at'])
@Index(['tenant_id', 'event_type'])
@Index(['message_id'])
export class WebhookEvent {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    tenant_id: string;

    @Column()
    event_type: string; // message_status, message_received, account_update

    @Column({ nullable: true })
    message_id: string; // WhatsApp message ID

    @Column({ nullable: true })
    from: string; // Sender phone number

    @Column({ nullable: true })
    to: string; // Recipient phone number

    @Column({ nullable: true })
    status: string; // sent, delivered, read, failed

    @Column({ type: 'jsonb' })
    payload: any; // Full webhook payload

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created_at: Date;
}
