import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhatsAppOAuthController } from './whatsapp-oauth.controller';
import { WhatsAppOAuthService } from './whatsapp-oauth.service';
import { WhatsAppApiController } from './whatsapp-api.controller';
import { WhatsAppApiService } from './whatsapp-api.service';
import { WhatsAppWebhookController } from './whatsapp-webhook.controller';
import { WhatsAppWebhookService } from './whatsapp-webhook.service';
import { TenantWabaConfig } from './entities/tenant-waba-config.entity';
import { WebhookEvent } from './entities/webhook-event.entity';
import { SecurityModule } from '../security/security.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([TenantWabaConfig, WebhookEvent]),
        SecurityModule, // For EncryptionService
    ],
    controllers: [WhatsAppOAuthController, WhatsAppApiController, WhatsAppWebhookController],
    providers: [WhatsAppOAuthService, WhatsAppApiService, WhatsAppWebhookService],
    exports: [WhatsAppOAuthService, WhatsAppApiService, WhatsAppWebhookService],
})
export class WhatsAppModule { }
