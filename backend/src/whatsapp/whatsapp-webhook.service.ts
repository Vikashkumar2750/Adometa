import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { WebhookEvent } from './entities/webhook-event.entity';
import { TenantWabaConfig } from './entities/tenant-waba-config.entity';
import { WebhookPayloadDto, WebhookEntry, WebhookChange } from './dto/webhook.dto';
import * as crypto from 'crypto';

/**
 * WhatsAppWebhookService
 * 
 * Handles WhatsApp webhook events
 * 
 * Features:
 * - Webhook verification (GET request)
 * - Signature verification (security)
 * - Message status updates
 * - Incoming message handling
 * - Event storage
 * 
 * Security:
 * - Verifies Meta signature on all webhook events
 * - Stores all events for audit trail
 * - Tenant-scoped event storage
 */
@Injectable()
export class WhatsAppWebhookService {
    private readonly logger = new Logger(WhatsAppWebhookService.name);

    constructor(
        @InjectRepository(WebhookEvent)
        private webhookEventRepository: Repository<WebhookEvent>,
        @InjectRepository(TenantWabaConfig)
        private wabaConfigRepository: Repository<TenantWabaConfig>,
        private configService: ConfigService,
    ) { }

    /**
     * Verify webhook (GET request from Meta)
     */
    verifyWebhook(mode: string, token: string, challenge: string): string {
        const verifyToken = this.configService.get<string>('WHATSAPP_WEBHOOK_VERIFY_TOKEN');

        if (!verifyToken) {
            throw new BadRequestException('Webhook verify token not configured');
        }

        if (mode === 'subscribe' && token === verifyToken) {
            this.logger.log('Webhook verified successfully');
            return challenge;
        }

        this.logger.warn('Webhook verification failed');
        throw new BadRequestException('Webhook verification failed');
    }

    /**
     * Verify webhook signature
     */
    verifySignature(payload: string, signature: string): boolean {
        const appSecret = this.configService.get<string>('META_APP_SECRET');

        if (!appSecret) {
            this.logger.error('Meta App Secret not configured');
            return false;
        }

        try {
            // Remove 'sha256=' prefix if present
            const signatureHash = signature.startsWith('sha256=')
                ? signature.substring(7)
                : signature;

            // Calculate expected signature
            const expectedSignature = crypto
                .createHmac('sha256', appSecret)
                .update(payload)
                .digest('hex');

            // Constant-time comparison
            const isValid = crypto.timingSafeEqual(
                Buffer.from(signatureHash),
                Buffer.from(expectedSignature)
            );

            if (!isValid) {
                this.logger.warn('Webhook signature verification failed');
            }

            return isValid;
        } catch (error) {
            this.logger.error(`Signature verification error: ${error.message}`);
            return false;
        }
    }

    /**
     * Handle webhook payload
     */
    async handleWebhook(payload: WebhookPayloadDto): Promise<void> {
        try {
            this.logger.debug(`Processing webhook: ${payload.object}`);

            if (payload.object !== 'whatsapp_business_account') {
                this.logger.warn(`Unknown webhook object type: ${payload.object}`);
                return;
            }

            // Process each entry
            for (const entry of payload.entry) {
                await this.processEntry(entry);
            }
        } catch (error) {
            this.logger.error(`Webhook processing error: ${error.message}`, error.stack);
            // Don't throw - we don't want to return 500 to Meta
        }
    }

    /**
     * Process webhook entry
     */
    private async processEntry(entry: WebhookEntry): Promise<void> {
        const wabaId = entry.id;

        // Find tenant by WABA ID
        const wabaConfig = await this.wabaConfigRepository.findOne({
            where: { waba_id: wabaId },
        });

        if (!wabaConfig) {
            this.logger.warn(`WABA not found: ${wabaId}`);
            return;
        }

        const tenantId = wabaConfig.tenant_id;

        // Process each change
        for (const change of entry.changes) {
            await this.processChange(tenantId, change);
        }
    }

    /**
     * Process webhook change
     */
    private async processChange(tenantId: string, change: WebhookChange): Promise<void> {
        const { value } = change;

        // Process message statuses
        if (value.statuses && value.statuses.length > 0) {
            for (const status of value.statuses) {
                await this.processMessageStatus(tenantId, status, change);
            }
        }

        // Process incoming messages
        if (value.messages && value.messages.length > 0) {
            for (const message of value.messages) {
                await this.processIncomingMessage(tenantId, message, change);
            }
        }
    }

    /**
     * Process message status update
     */
    private async processMessageStatus(
        tenantId: string,
        status: any,
        change: WebhookChange
    ): Promise<void> {
        try {
            const event = this.webhookEventRepository.create({
                tenant_id: tenantId,
                event_type: 'message_status',
                message_id: status.id,
                from: undefined,
                to: status.recipient_id,
                status: status.status,
                payload: {
                    status,
                    metadata: change.value.metadata,
                },
            });

            await this.webhookEventRepository.save(event);

            this.logger.log(
                `Message status updated: ${status.id} -> ${status.status} for tenant: ${tenantId}`
            );

            // Handle errors
            if (status.errors && status.errors.length > 0) {
                this.logger.error(
                    `Message errors for ${status.id}: ${JSON.stringify(status.errors)}`
                );
            }
        } catch (error) {
            this.logger.error(`Failed to process message status: ${error.message}`);
        }
    }

    /**
     * Process incoming message
     */
    private async processIncomingMessage(
        tenantId: string,
        message: any,
        change: WebhookChange
    ): Promise<void> {
        try {
            const event = this.webhookEventRepository.create({
                tenant_id: tenantId,
                event_type: 'message_received',
                message_id: message.id,
                from: message.from,
                to: change.value.metadata.phone_number_id,
                status: undefined,
                payload: {
                    message,
                    contacts: change.value.contacts,
                    metadata: change.value.metadata,
                },
            });

            await this.webhookEventRepository.save(event);

            this.logger.log(
                `Incoming message received: ${message.id} (${message.type}) from ${message.from} for tenant: ${tenantId}`
            );

            // Log message content for debugging
            if (message.text) {
                this.logger.debug(`Message text: ${message.text.body}`);
            }
        } catch (error) {
            this.logger.error(`Failed to process incoming message: ${error.message}`);
        }
    }

    /**
     * Get webhook events for a tenant
     */
    async getEvents(
        tenantId: string,
        options?: {
            eventType?: string;
            messageId?: string;
            limit?: number;
            offset?: number;
        }
    ): Promise<{ data: WebhookEvent[]; total: number }> {
        const queryBuilder = this.webhookEventRepository
            .createQueryBuilder('event')
            .where('event.tenant_id = :tenantId', { tenantId });

        if (options?.eventType) {
            queryBuilder.andWhere('event.event_type = :eventType', {
                eventType: options.eventType,
            });
        }

        if (options?.messageId) {
            queryBuilder.andWhere('event.message_id = :messageId', {
                messageId: options.messageId,
            });
        }

        queryBuilder.orderBy('event.created_at', 'DESC');

        if (options?.limit) {
            queryBuilder.take(options.limit);
        }

        if (options?.offset) {
            queryBuilder.skip(options.offset);
        }

        const [data, total] = await queryBuilder.getManyAndCount();

        return { data, total };
    }

    /**
     * Get message status history
     */
    async getMessageStatusHistory(tenantId: string, messageId: string): Promise<WebhookEvent[]> {
        return this.webhookEventRepository.find({
            where: {
                tenant_id: tenantId,
                message_id: messageId,
                event_type: 'message_status',
            },
            order: {
                created_at: 'ASC',
            },
        });
    }
}
