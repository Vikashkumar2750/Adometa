import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Invoice, InvoiceItem } from './entities/billing.entities';
import { WalletService } from './wallet.service';

// Plan pricing (INR, paise stored as rupees in decimal)
export const PLAN_PRICING: Record<string, { label: string; monthly_price: number }> = {
    FREE_TRIAL: { label: 'Free Trial', monthly_price: 0 },
    BASIC: { label: 'Basic', monthly_price: 999 },
    PRO: { label: 'Professional', monthly_price: 2999 },
    PREMIUM: { label: 'Premium', monthly_price: 7499 },
    ENTERPRISE: { label: 'Enterprise', monthly_price: 19999 },
    // Legacy aliases kept for backward compat
    STARTER: { label: 'Starter', monthly_price: 2499 },
    PROFESSIONAL: { label: 'Professional', monthly_price: 7499 },
};

const GST_RATE = 0.18; // 18% GST
const DUE_DAYS = 7;    // Net 7 payment terms

function generateInvoiceNumber(): string {
    const d = new Date();
    const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
    const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `INV-${ym}-${rand}`;
}

@Injectable()
export class InvoiceService {
    private readonly logger = new Logger(InvoiceService.name);

    constructor(
        @InjectRepository(Invoice)
        private invoiceRepo: Repository<Invoice>,
        @InjectRepository(InvoiceItem)
        private itemRepo: Repository<InvoiceItem>,
        private walletService: WalletService,
    ) { }

    // ─────────────────────────────────────────────────────────
    // Generate a monthly subscription invoice for one tenant
    // ─────────────────────────────────────────────────────────
    async generateMonthlyInvoice(params: {
        tenantId: string;
        plan: string;
        periodStart: Date;
        periodEnd: Date;
        usageMessages?: number;
        costPerMessage?: number;
    }): Promise<Invoice> {
        const pricing = PLAN_PRICING[params.plan] || PLAN_PRICING.FREE_TRIAL;

        const items: Partial<InvoiceItem>[] = [];

        // Subscription line
        if (pricing.monthly_price > 0) {
            items.push({
                description: `${pricing.label} Plan — Monthly Subscription`,
                item_type: 'SUBSCRIPTION',
                quantity: 1,
                unit_price: pricing.monthly_price,
                total: pricing.monthly_price,
            });
        }

        // Usage line
        if (params.usageMessages && params.usageMessages > 0 && params.costPerMessage && params.costPerMessage > 0) {
            const usageTotal = +(params.usageMessages * params.costPerMessage).toFixed(2);
            items.push({
                description: `API Usage — ${params.usageMessages} messages @ ₹${params.costPerMessage}/msg`,
                item_type: 'USAGE',
                quantity: params.usageMessages,
                unit_price: params.costPerMessage,
                total: usageTotal,
            });
        }

        if (items.length === 0) {
            this.logger.log(`No chargeable items for tenant ${params.tenantId} — skipping invoice`);
            return null as unknown as Invoice;
        }

        const subtotal = +items.reduce((s, i) => s + (i.total ?? 0), 0).toFixed(2);
        const tax = +(subtotal * GST_RATE).toFixed(2);
        const total = +(subtotal + tax).toFixed(2);

        const dueDate = new Date(params.periodEnd);
        dueDate.setDate(dueDate.getDate() + DUE_DAYS);

        // GST line item
        items.push({
            description: `GST @ ${GST_RATE * 100}%`,
            item_type: 'TAX',
            quantity: 1,
            unit_price: tax,
            total: tax,
        });

        const invoice = this.invoiceRepo.create({
            tenant_id: params.tenantId,
            invoice_number: generateInvoiceNumber(),
            subtotal,
            tax,
            total,
            currency: 'INR',
            status: 'PENDING',
            period_start: params.periodStart,
            period_end: params.periodEnd,
            due_date: dueDate,
            items: items as InvoiceItem[],
        });

        const saved = await this.invoiceRepo.save(invoice);
        this.logger.log(`Invoice ${saved.invoice_number} created for tenant ${params.tenantId} — ₹${total}`);
        return saved;
    }

    // ─────────────────────────────────────────────────────────
    // Mark invoice PAID + credit wallet if manual top-up style
    // ─────────────────────────────────────────────────────────
    async markPaid(invoiceId: string, tenantId: string, gatewayId?: string, gateway?: string) {
        const invoice = await this.invoiceRepo.findOne({
            where: { id: invoiceId, tenant_id: tenantId },
        });
        if (!invoice) throw new NotFoundException('Invoice not found');

        invoice.status = 'PAID';
        invoice.paid_at = new Date();
        invoice.days_overdue = 0;
        if (gatewayId) invoice.payment_gateway_id = gatewayId;
        if (gateway) invoice.payment_gateway = gateway;

        await this.invoiceRepo.save(invoice);

        // Credit wallet for the paid amount (subscription grants platform credits)
        await this.walletService.credit({
            tenantId,
            amount: +invoice.total,
            description: `Payment received for ${invoice.invoice_number}`,
            referenceType: 'INVOICE',
            referenceId: invoice.id,
        });

        return invoice;
    }

    // ─────────────────────────────────────────────────────────
    // DPD updater — run via cron daily
    // ─────────────────────────────────────────────────────────
    async updateDpdStatuses(): Promise<number> {
        const now = new Date();
        const overdue = await this.invoiceRepo.find({
            where: { status: 'PENDING', due_date: LessThan(now) },
        });

        let updated = 0;
        for (const inv of overdue) {
            const days = Math.floor((now.getTime() - inv.due_date.getTime()) / (1000 * 60 * 60 * 24));
            inv.status = 'DPD';
            inv.days_overdue = days;
            await this.invoiceRepo.save(inv);
            updated++;
        }
        this.logger.log(`DPD sweep: ${updated} invoices marked overdue`);
        return updated;
    }

    // ─────────────────────────────────────────────────────────
    // Tenant: get their invoices
    // ─────────────────────────────────────────────────────────
    async getTenantInvoices(tenantId: string, page = 1, limit = 20) {
        const [items, total] = await this.invoiceRepo.findAndCount({
            where: { tenant_id: tenantId },
            relations: ['items'],
            order: { created_at: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return { items, total, page, limit };
    }

    // ─────────────────────────────────────────────────────────
    // Admin: all invoices across tenants
    // ─────────────────────────────────────────────────────────
    async getAdminInvoices(page = 1, limit = 50, status?: string, tenantId?: string) {
        const where: any = {};
        if (status) where.status = status;
        if (tenantId) where.tenant_id = tenantId;

        const [items, total] = await this.invoiceRepo.findAndCount({
            where,
            order: { created_at: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return { items, total, page, limit };
    }

    // ─────────────────────────────────────────────────────────
    // Admin: all invoices with tenant relation (for revenue analytics)
    // ─────────────────────────────────────────────────────────
    async getAdminInvoicesWithTenant(page = 1, limit = 1000) {
        const [items, total] = await this.invoiceRepo.findAndCount({
            relations: ['tenant'],
            order: { created_at: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return { items, total, page, limit };
    }

    // ─────────────────────────────────────────────────────────
    // Get single invoice (validates tenant ownership)
    // ─────────────────────────────────────────────────────────
    async findOne(id: string, tenantId?: string): Promise<Invoice> {
        const where: any = { id };
        if (tenantId) where.tenant_id = tenantId;
        const inv = await this.invoiceRepo.findOne({ where, relations: ['items'] });
        if (!inv) throw new NotFoundException('Invoice not found');
        return inv;
    }

    // ─────────────────────────────────────────────────────────
    // Dashboard notification flags for a tenant
    // ─────────────────────────────────────────────────────────
    async getNotificationFlags(tenantId: string): Promise<{
        hasPendingInvoice: boolean;
        hasDpdInvoice: boolean;
        pendingAmount: number;
        dpdAmount: number;
        oldestDueDays: number;
    }> {
        const invoices = await this.invoiceRepo.find({ where: { tenant_id: tenantId } });
        const pending = invoices.filter(i => i.status === 'PENDING');
        const dpd = invoices.filter(i => i.status === 'DPD');

        return {
            hasPendingInvoice: pending.length > 0,
            hasDpdInvoice: dpd.length > 0,
            pendingAmount: pending.reduce((s, i) => s + +i.total, 0),
            dpdAmount: dpd.reduce((s, i) => s + +i.total, 0),
            oldestDueDays: dpd.length > 0 ? Math.max(...dpd.map(i => i.days_overdue)) : 0,
        };
    }

    async cancelInvoice(id: string, tenantId?: string): Promise<Invoice> {
        const inv = await this.findOne(id, tenantId);
        if (['PAID', 'CANCELLED'].includes(inv.status)) {
            throw new NotFoundException('Cannot cancel a paid or already cancelled invoice');
        }
        inv.status = 'CANCELLED';
        return this.invoiceRepo.save(inv);
    }
}
