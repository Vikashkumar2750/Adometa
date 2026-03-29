import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { SecurityModule } from './security/security.module';
import { AuthModule } from './auth/auth.module';
import { TenantsModule } from './tenants/tenants.module';
import { AuditModule } from './audit/audit.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { ContactsModule } from './contacts/contacts.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { TemplatesModule } from './templates/templates.module';
import { SegmentsModule } from './segments/segments.module';
import { LeadsModule } from './leads/leads.module';
import { BlogModule } from './blog/blog.module';
import { BillingModule } from './billing/billing.module';
import { TeamModule } from './team/team.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { EmailModule } from './email/email.module';
import { SupportModule } from './support/support.module';
import { AutomationModule } from './automation/automation.module';
import { ScheduleModule } from '@nestjs/schedule';
import { TenantContextInterceptor } from './common/interceptors/tenant-context.interceptor';
import { AuditInterceptor } from './audit/audit.interceptor';

@Module({
  imports: [
    // Load environment variables globally
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../.env', // Adjusted path to root .env
    }),
    DatabaseModule,
    SecurityModule,
    AuthModule,
    TenantsModule,
    AuditModule,
    WhatsAppModule, // Add WhatsAppModule
    ContactsModule, // Add ContactsModule
    CampaignsModule, // Add CampaignsModule
    TemplatesModule, // Add TemplatesModule
    SegmentsModule, // Add SegmentsModule
    LeadsModule,    // Contact form leads
    BlogModule,     // Blog / CMS
    BillingModule,  // Wallet, Invoices, Payments, WABA Monitor
    TeamModule,     // Team members & activity logs
    ApiKeysModule,  // API key management for developers
    EmailModule,    // Global transactional email (Nodemailer)
    SupportModule,  // Customer support tickets + real-time chat
    AutomationModule, // Automation rules engine
    ScheduleModule.forRoot(), // Enable @Cron decorators globally
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Register TenantContextInterceptor globally
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantContextInterceptor,
    },
    // Register AuditInterceptor globally
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule { }

