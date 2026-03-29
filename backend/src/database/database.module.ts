import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SuperAdmin } from '../entities/super-admin.entity';
import { Tenant, TenantUser } from '../entities/tenant.entities';
import { TenantWabaConfig } from '../whatsapp/entities/tenant-waba-config.entity';
import { WebhookEvent } from '../whatsapp/entities/webhook-event.entity';
import { Contact } from '../contacts/entities/contact.entity';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { Template } from '../templates/entities/template.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { Segment } from '../segments/entities/segment.entity';
import { Lead } from '../leads/entities/lead.entity';
import { BlogPost } from '../blog/entities/blog-post.entity';
import { TenantWallet, TenantTransaction, TenantSettings, Invoice, InvoiceItem } from '../billing/entities/billing.entities';
import { TeamActivityLog } from '../team/entities/team-activity.entity';
import { ApiKey } from '../api-keys/entities/api-key.entity';
import { SupportTicket, SupportMessage } from '../support/entities/support.entities';
import { AutomationRule } from '../automation/entities/automation-rule.entity';

@Module({
    imports: [
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                type: 'postgres',
                host: configService.get<string>('DB_HOST'),
                port: configService.get<number>('DB_PORT'),
                username: configService.get<string>('DB_USER'),
                password: configService.get<string>('DB_PASSWORD'),
                database: configService.get<string>('DB_NAME'),
                // Entity list — add new entities here + run matching SQL migration
                entities: [
                    SuperAdmin,
                    Tenant,
                    TenantUser,
                    TenantWabaConfig,
                    WebhookEvent,
                    Contact,
                    Campaign,
                    Template,
                    AuditLog,
                    Segment,
                    Lead,
                    BlogPost,
                    // Billing
                    TenantWallet,
                    TenantTransaction,
                    TenantSettings,
                    Invoice,
                    InvoiceItem,
                    // Team
                    TeamActivityLog,
                    // API Keys
                    ApiKey,
                    // Support
                    SupportTicket,
                    SupportMessage,
                    // Automation
                    AutomationRule,
                ],
                // Keep synchronize OFF — use SQL migrations instead
                // New tables (leads, blog_posts) are created via run-migration script
                synchronize: false,
                logging: configService.get<string>('NODE_ENV') !== 'production',
                // ⚡ Pool config — prevents connection pool exhaustion
                extra: {
                    max: 5,
                    min: 1,
                    idleTimeoutMillis: 30000,
                    connectionTimeoutMillis: 10000,
                    statement_timeout: 30000,
                    query_timeout: 30000,
                },
                retryAttempts: 3,
                retryDelay: 2000,
            }),
        }),
    ],
})
export class DatabaseModule { }
