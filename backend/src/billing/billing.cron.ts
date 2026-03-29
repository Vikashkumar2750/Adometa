import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InvoiceService } from './invoice.service';
import { WalletService } from './wallet.service';
import { Invoice } from './entities/billing.entities';
import { Tenant } from '../entities/tenant.entities';
import { TenantSettings } from './entities/billing.entities';

@Injectable()
export class BillingCronService {
    private readonly logger = new Logger(BillingCronService.name);

    constructor(
        private invoiceService: InvoiceService,
        private walletService: WalletService,
        @InjectRepository(Tenant)
        private tenantRepo: Repository<Tenant>,
        @InjectRepository(TenantSettings)
        private settingsRepo: Repository<TenantSettings>,
    ) { }

    /**
     * Daily at 00:05 IST — Update DPD statuses for overdue invoices
     */
    @Cron('5 0 * * *', { timeZone: 'Asia/Kolkata' })
    async runDpdUpdate() {
        this.logger.log('Running DPD sweep...');
        const count = await this.invoiceService.updateDpdStatuses();
        this.logger.log(`DPD sweep complete: ${count} updated`);
    }

    /**
     * 1st of every month at 00:30 IST — Generate subscription invoices
     */
    @Cron('30 0 1 * *', { timeZone: 'Asia/Kolkata' })
    async generateMonthlyInvoices() {
        this.logger.log('Starting monthly invoice generation...');
        const tenants = await this.tenantRepo.find({ where: { status: 'ACTIVE' } });

        const now = new Date();
        const periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const periodEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

        let generated = 0;
        for (const tenant of tenants) {
            try {
                const settings = await this.settingsRepo.findOne({ where: { tenant_id: tenant.id } });
                const costPerMsg = settings ? +settings.cost_per_message : 0.1;

                const invoice = await this.invoiceService.generateMonthlyInvoice({
                    tenantId: tenant.id,
                    plan: tenant.plan,
                    periodStart,
                    periodEnd,
                    costPerMessage: costPerMsg,
                    // TODO: plug in real message count from campaign stats
                });
                if (invoice) generated++;
            } catch (err) {
                this.logger.error(`Invoice generation failed for tenant ${tenant.id}: ${err.message}`);
            }
        }
        this.logger.log(`Monthly invoicing complete: ${generated}/${tenants.length} invoices generated`);
    }

    /**
     * Auto-create wallet + settings for new tenants (every 6 hours)
     */
    @Cron('0 */6 * * *')
    async backfillWalletsAndSettings() {
        const tenants = await this.tenantRepo.find();
        for (const t of tenants) {
            try {
                await this.walletService.getOrCreate(t.id);
                const existing = await this.settingsRepo.findOne({ where: { tenant_id: t.id } });
                if (!existing) {
                    await this.settingsRepo.save({ tenant_id: t.id } as TenantSettings);
                }
            } catch { /* ignore per-tenant errors */ }
        }
    }
}
