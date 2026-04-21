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

// ✅ FIX: Allow self-signed certs from Supabase pooler in local dev
// (pg v8+ requires this at process level — rejectUnauthorized in config alone is not enough)
if (process.env.NODE_ENV !== 'production') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const ENTITIES = [
    SuperAdmin, Tenant, TenantUser, TenantWabaConfig,
    WebhookEvent, Contact, Campaign, Template,
    AuditLog, Segment, Lead, BlogPost,
    TenantWallet, TenantTransaction, TenantSettings,
    Invoice, InvoiceItem, TeamActivityLog, ApiKey,
    SupportTicket, SupportMessage, AutomationRule,
];

const POOL_EXTRA = {
    max: 3,
    min: 1,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
    ssl: { rejectUnauthorized: false },
};

@Module({
    imports: [
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => {
                const databaseUrl = configService.get<string>('DATABASE_URL');
                const isProduction = configService.get<string>('NODE_ENV') === 'production';

                if (databaseUrl) {
                    return {
                        type: 'postgres' as const,
                        url: databaseUrl,
                        ssl: { rejectUnauthorized: false },
                        entities: ENTITIES,
                        synchronize: false,
                        logging: !isProduction,
                        extra: POOL_EXTRA,
                        retryAttempts: 5,
                        retryDelay: 3000,
                    };
                }

                // Fallback: individual DB_* vars
                return {
                    type: 'postgres' as const,
                    host: configService.get<string>('DB_HOST'),
                    port: configService.get<number>('DB_PORT') || 5432,
                    username: configService.get<string>('DB_USERNAME') || configService.get<string>('DB_USER'),
                    password: configService.get<string>('DB_PASSWORD'),
                    database: configService.get<string>('DB_NAME') || configService.get<string>('DB_DATABASE'),
                    ssl: { rejectUnauthorized: false },
                    entities: ENTITIES,
                    synchronize: false,
                    logging: !isProduction,
                    extra: POOL_EXTRA,
                    retryAttempts: 5,
                    retryDelay: 3000,
                };
            },
        }),
    ],
})
export class DatabaseModule { }
