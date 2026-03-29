import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
    ManyToOne,
    JoinColumn,
    OneToMany,
    OneToOne,
} from 'typeorm';
import { Tenant } from '../../entities/tenant.entities';

// ─────────────────────────────────────────────────────────────
// TenantWallet — one per tenant, holds platform credit balance
// ─────────────────────────────────────────────────────────────
@Entity('tenant_wallets')
@Index(['tenant_id'], { unique: true })
export class TenantWallet {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    tenant_id: string;

    /** Platform credit balance in smallest unit (paisa for INR) */
    @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
    balance: number;

    @Column({ type: 'varchar', length: 10, default: 'INR' })
    currency: string;

    /** Send alert when balance drops below this */
    @Column({ type: 'decimal', precision: 18, scale: 4, default: 10 })
    low_balance_threshold: number;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    @ManyToOne(() => Tenant)
    @JoinColumn({ name: 'tenant_id' })
    tenant: Tenant;
}

// ─────────────────────────────────────────────────────────────
// TenantTransaction — immutable credit/debit ledger
// ─────────────────────────────────────────────────────────────
@Entity('tenant_transactions')
@Index(['tenant_id'])
@Index(['created_at'])
@Index(['reference_type', 'reference_id'])
export class TenantTransaction {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    tenant_id: string;

    @Column({ type: 'enum', enum: ['CREDIT', 'DEBIT'] })
    type: string;

    /** Amount always stored as positive decimal */
    @Column({ type: 'decimal', precision: 18, scale: 4 })
    amount: number;

    @Column({ type: 'decimal', precision: 18, scale: 4, nullable: true })
    balance_after: number;

    @Column({ type: 'text' })
    description: string;

    @Column({
        type: 'enum',
        enum: ['CAMPAIGN', 'INVOICE', 'MANUAL', 'REFUND', 'PAYMENT', 'SUBSCRIPTION'],
        nullable: true,
    })
    reference_type: string;

    @Column({ type: 'uuid', nullable: true })
    reference_id: string;

    @Column({
        type: 'enum',
        enum: ['SUCCESS', 'FAILED', 'REVERSED', 'PENDING'],
        default: 'SUCCESS',
    })
    status: string;

    @Column({ type: 'uuid', nullable: true })
    created_by: string;

    @CreateDateColumn()
    created_at: Date;

    @ManyToOne(() => Tenant)
    @JoinColumn({ name: 'tenant_id' })
    tenant: Tenant;
}

// ─────────────────────────────────────────────────────────────
// TenantSettings — per-tenant rate limits & platform controls
// ─────────────────────────────────────────────────────────────
@Entity('tenant_settings')
@Index(['tenant_id'], { unique: true })
export class TenantSettings {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    tenant_id: string;

    /** Max WhatsApp API requests per minute (enforced in interceptor) */
    @Column({ type: 'int', default: 30 })
    max_api_rpm: number;

    /** Max campaigns that can RUN per day */
    @Column({ type: 'int', default: 10 })
    max_campaigns_per_day: number;

    /** Max contacts per campaign broadcast */
    @Column({ type: 'int', default: 10000 })
    max_broadcast_size: number;

    /** Max team members this tenant can add (super admin controlled) */
    @Column({ type: 'int', default: 5 })
    max_team_members: number;

    /** Platform cost per message in smallest currency unit (paisa) */
    @Column({ type: 'decimal', precision: 10, scale: 4, default: 0.1 })
    cost_per_message: number;

    /** Tenant enabled/disabled by super admin */
    @Column({ type: 'boolean', default: true })
    is_enabled: boolean;

    /** Reason for disabling (for tenant-facing message) */
    @Column({ type: 'text', nullable: true })
    disabled_reason: string | null;

    @Column({ type: 'timestamp', nullable: true })
    disabled_at: Date | null;

    @Column({ type: 'uuid', nullable: true })
    disabled_by: string | null;

    /** Notification preferences stored as JSONB */
    @Column({ type: 'jsonb', nullable: true, default: () => `'{"campaignComplete":true,"deliveryFailures":true,"newContacts":false,"weeklyReport":true,"securityAlerts":true}'` })
    notification_prefs: Record<string, boolean> | null;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}

// ─────────────────────────────────────────────────────────────
// Invoice
// ─────────────────────────────────────────────────────────────
@Entity('invoices')
@Index(['tenant_id'])
@Index(['status'])
@Index(['due_date'])
@Index(['invoice_number'], { unique: true })
export class Invoice {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    tenant_id: string;

    @Column({ type: 'varchar', length: 50 })
    invoice_number: string;

    @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
    subtotal: number;

    @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
    tax: number;

    @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
    total: number;

    @Column({ type: 'varchar', length: 10, default: 'INR' })
    currency: string;

    @Column({
        type: 'enum',
        enum: ['PENDING', 'PAID', 'DPD', 'CANCELLED', 'PROCESSING'],
        default: 'PENDING',
    })
    status: string;

    /** Billing period start */
    @Column({ type: 'timestamp' })
    period_start: Date;

    /** Billing period end */
    @Column({ type: 'timestamp' })
    period_end: Date;

    @Column({ type: 'timestamp' })
    due_date: Date;

    @Column({ type: 'timestamp', nullable: true })
    paid_at: Date;

    /** Razorpay / PayPal order/payment ID */
    @Column({ type: 'varchar', length: 255, nullable: true })
    payment_gateway_id: string;

    @Column({ type: 'varchar', length: 50, nullable: true })
    payment_gateway: string;

    @Column({ type: 'jsonb', nullable: true })
    payment_metadata: Record<string, any>;

    @Column({ type: 'int', default: 0 })
    days_overdue: number;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    @ManyToOne(() => Tenant)
    @JoinColumn({ name: 'tenant_id' })
    tenant: Tenant;

    @OneToMany(() => InvoiceItem, item => item.invoice, { cascade: true, eager: true })
    items: InvoiceItem[];
}

// ─────────────────────────────────────────────────────────────
// InvoiceItem
// ─────────────────────────────────────────────────────────────
@Entity('invoice_items')
@Index(['invoice_id'])
export class InvoiceItem {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    invoice_id: string;

    @Column({ type: 'varchar', length: 255 })
    description: string;

    @Column({
        type: 'enum',
        enum: ['SUBSCRIPTION', 'USAGE', 'ADDON', 'CREDIT', 'TAX'],
        default: 'SUBSCRIPTION',
    })
    item_type: string;

    @Column({ type: 'decimal', precision: 10, scale: 4, default: 1 })
    quantity: number;

    @Column({ type: 'decimal', precision: 18, scale: 4 })
    unit_price: number;

    @Column({ type: 'decimal', precision: 18, scale: 2 })
    total: number;

    @ManyToOne(() => Invoice, inv => inv.items)
    @JoinColumn({ name: 'invoice_id' })
    invoice: Invoice;
}
