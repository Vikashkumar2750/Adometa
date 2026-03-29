import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { TenantWallet, TenantTransaction, TenantSettings, Invoice, InvoiceItem } from './entities/billing.entities';
import { TenantWabaConfig } from '../whatsapp/entities/tenant-waba-config.entity';
import { Tenant } from '../entities/tenant.entities';
import { WalletService } from './wallet.service';
import { InvoiceService } from './invoice.service';
import { PaymentService } from './payment.service';
import { TenantSettingsService } from './tenant-settings.service';
import { WabaMonitorService } from './waba-monitor.service';
import { BillingCronService } from './billing.cron';
import { BillingController, AdminBillingController, PaymentWebhookController } from './billing.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
    imports: [
        ScheduleModule.forRoot(),
        TypeOrmModule.forFeature([
            TenantWallet,
            TenantTransaction,
            TenantSettings,
            Invoice,
            InvoiceItem,
            TenantWabaConfig,
            Tenant,
        ]),
        AuditModule,
    ],
    controllers: [
        BillingController,
        AdminBillingController,
        PaymentWebhookController,
    ],
    providers: [
        WalletService,
        InvoiceService,
        PaymentService,
        TenantSettingsService,
        WabaMonitorService,
        BillingCronService,
    ],
    exports: [
        WalletService,
        InvoiceService,
        TenantSettingsService,
    ],
})
export class BillingModule { }
