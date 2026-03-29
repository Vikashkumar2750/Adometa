import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { WhatsAppOAuthService } from './whatsapp-oauth.service';
import axios, { AxiosError } from 'axios';
import {
    SendTemplateMessageDto,
    SendTextMessageDto,
    SendMediaMessageDto,
    MessageResponseDto,
} from './dto/send-message.dto';

/**
 * WhatsAppApiService
 * 
 * Handles all WhatsApp Business API operations
 * 
 * Features:
 * - Send template messages
 * - Send text messages
 * - Send media messages (image, video, document, audio)
 * - Upload media
 * - Get phone number details
 * - Get message templates
 * 
 * Security:
 * - Automatically uses encrypted access token
 * - Validates WABA is ACTIVE before sending
 * - Comprehensive error handling
 */
@Injectable()
export class WhatsAppApiService {
    private readonly logger = new Logger(WhatsAppApiService.name);
    private readonly META_GRAPH_API = 'https://graph.facebook.com/v18.0';

    constructor(private readonly oauthService: WhatsAppOAuthService) { }

    /**
     * Send template message
     */
    async sendTemplateMessage(
        tenantId: string,
        dto: SendTemplateMessageDto
    ): Promise<MessageResponseDto> {
        try {
            // Get WABA config and decrypted token
            const { phoneNumberId, accessToken } = await this.getActiveWabaConfig(tenantId);

            // Build template message payload
            const payload = {
                messaging_product: 'whatsapp',
                to: dto.to,
                type: 'template',
                template: {
                    name: dto.templateName,
                    language: {
                        code: dto.languageCode,
                    },
                    components: dto.components || [],
                },
            };

            // Send message via Meta Graph API
            const response = await axios.post(
                `${this.META_GRAPH_API}/${phoneNumberId}/messages`,
                payload,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            this.logger.log(`Template message sent to ${dto.to} for tenant: ${tenantId}`);

            return {
                messageId: response.data.messages[0].id,
                to: dto.to,
                status: 'sent',
            };
        } catch (error) {
            this.handleWhatsAppError(error, 'send template message');
        }
    }

    /**
     * Send text message
     */
    async sendTextMessage(
        tenantId: string,
        dto: SendTextMessageDto
    ): Promise<MessageResponseDto> {
        try {
            // Get WABA config and decrypted token
            const { phoneNumberId, accessToken } = await this.getActiveWabaConfig(tenantId);

            // Build text message payload
            const payload = {
                messaging_product: 'whatsapp',
                to: dto.to,
                type: 'text',
                text: {
                    body: dto.text,
                    preview_url: dto.previewUrl || false,
                },
            };

            // Send message via Meta Graph API
            const response = await axios.post(
                `${this.META_GRAPH_API}/${phoneNumberId}/messages`,
                payload,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            this.logger.log(`Text message sent to ${dto.to} for tenant: ${tenantId}`);

            return {
                messageId: response.data.messages[0].id,
                to: dto.to,
                status: 'sent',
            };
        } catch (error) {
            this.handleWhatsAppError(error, 'send text message');
        }
    }

    /**
     * Send media message (image, video, document, audio)
     */
    async sendMediaMessage(
        tenantId: string,
        dto: SendMediaMessageDto
    ): Promise<MessageResponseDto> {
        try {
            // Get WABA config and decrypted token
            const { phoneNumberId, accessToken } = await this.getActiveWabaConfig(tenantId);

            // Build media message payload
            const mediaObject: any = {
                link: dto.media,
            };

            if (dto.caption && (dto.type === 'image' || dto.type === 'video')) {
                mediaObject.caption = dto.caption;
            }

            if (dto.filename && dto.type === 'document') {
                mediaObject.filename = dto.filename;
            }

            const payload = {
                messaging_product: 'whatsapp',
                to: dto.to,
                type: dto.type,
                [dto.type]: mediaObject,
            };

            // Send message via Meta Graph API
            const response = await axios.post(
                `${this.META_GRAPH_API}/${phoneNumberId}/messages`,
                payload,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            this.logger.log(`Media message (${dto.type}) sent to ${dto.to} for tenant: ${tenantId}`);

            return {
                messageId: response.data.messages[0].id,
                to: dto.to,
                status: 'sent',
            };
        } catch (error) {
            this.handleWhatsAppError(error, 'send media message');
        }
    }

    /**
     * Upload media to WhatsApp
     */
    async uploadMedia(
        tenantId: string,
        file: Buffer,
        mimeType: string,
        filename: string
    ): Promise<{ mediaId: string }> {
        try {
            // Get WABA config and decrypted token
            const { phoneNumberId, accessToken } = await this.getActiveWabaConfig(tenantId);

            // Create form data
            const FormData = require('form-data');
            const formData = new FormData();
            formData.append('messaging_product', 'whatsapp');
            formData.append('file', file, {
                filename,
                contentType: mimeType,
            });

            // Upload media via Meta Graph API
            const response = await axios.post(
                `${this.META_GRAPH_API}/${phoneNumberId}/media`,
                formData,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        ...formData.getHeaders(),
                    },
                }
            );

            this.logger.log(`Media uploaded for tenant: ${tenantId}, ID: ${response.data.id}`);

            return {
                mediaId: response.data.id,
            };
        } catch (error) {
            this.handleWhatsAppError(error, 'upload media');
        }
    }

    /**
     * Get phone number details
     */
    async getPhoneNumberDetails(tenantId: string): Promise<any> {
        try {
            // Get WABA config and decrypted token
            const { phoneNumberId, accessToken } = await this.getActiveWabaConfig(tenantId);

            // Get phone number details from Meta Graph API
            const response = await axios.get(
                `${this.META_GRAPH_API}/${phoneNumberId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                    },
                    params: {
                        fields: 'verified_name,display_phone_number,quality_rating,messaging_limit_tier',
                    },
                }
            );

            this.logger.debug(`Phone number details fetched for tenant: ${tenantId}`);

            return response.data;
        } catch (error) {
            this.handleWhatsAppError(error, 'get phone number details');
        }
    }

    /**
     * Get message templates
     */
    async getTemplates(tenantId: string): Promise<any[]> {
        try {
            // Get WABA config and decrypted token
            const config = await this.oauthService.getWabaConfig(tenantId);

            if (!config) {
                throw new NotFoundException('WhatsApp account not connected');
            }

            const accessToken = await this.oauthService.getDecryptedToken(tenantId);

            // Get templates from Meta Graph API
            const response = await axios.get(
                `${this.META_GRAPH_API}/${config.waba_id}/message_templates`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                    },
                    params: {
                        fields: 'name,status,category,language,components',
                        limit: 100,
                    },
                }
            );

            this.logger.debug(`Templates fetched for tenant: ${tenantId}, count: ${response.data.data.length}`);

            return response.data.data;
        } catch (error) {
            this.handleWhatsAppError(error, 'get templates');
        }
    }

    /**
     * Mark message as read
     */
    async markMessageAsRead(tenantId: string, messageId: string): Promise<{ success: boolean }> {
        try {
            // Get WABA config and decrypted token
            const { phoneNumberId, accessToken } = await this.getActiveWabaConfig(tenantId);

            // Mark message as read
            await axios.post(
                `${this.META_GRAPH_API}/${phoneNumberId}/messages`,
                {
                    messaging_product: 'whatsapp',
                    status: 'read',
                    message_id: messageId,
                },
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            this.logger.debug(`Message marked as read: ${messageId} for tenant: ${tenantId}`);

            return { success: true };
        } catch (error) {
            this.handleWhatsAppError(error, 'mark message as read');
        }
    }

    /**
     * Get active WABA config and decrypted token
     */
    private async getActiveWabaConfig(tenantId: string): Promise<{
        phoneNumberId: string;
        accessToken: string;
    }> {
        const config = await this.oauthService.getWabaConfig(tenantId);

        if (!config) {
            throw new NotFoundException('WhatsApp account not connected');
        }

        if (config.status !== 'ACTIVE') {
            throw new BadRequestException(
                `WhatsApp account is ${config.status}. Please contact support.`
            );
        }

        const accessToken = await this.oauthService.getDecryptedToken(tenantId);

        return {
            phoneNumberId: config.phone_number_id,
            accessToken,
        };
    }

    /**
     * Fetch WABA credit balance from Meta Graph API
     * Returns { balance, currency, phoneNumberId, wabaId }
     */
    async getWabaBalance(tenantId: string): Promise<{
        balance: number | null;
        currency: string;
        phoneNumberId: string;
        wabaId: string;
        status: string;
        connected: boolean;
    }> {
        try {
            const config = await this.oauthService.getWabaConfig(tenantId);
            if (!config) {
                return { balance: null, currency: 'USD', phoneNumberId: '', wabaId: '', status: 'NOT_CONNECTED', connected: false };
            }

            const accessToken = await this.oauthService.getDecryptedToken(tenantId);
            const wabaId = config.waba_id;

            // Meta API: fetch WABA credit balance
            const response = await axios.get(
                `${this.META_GRAPH_API}/${wabaId}`,
                {
                    params: { fields: 'message_credit_balance,currency' },
                    headers: { Authorization: `Bearer ${accessToken}` },
                }
            );

            const data = response.data;
            return {
                balance: data.message_credit_balance ?? null,
                currency: data.currency || 'USD',
                phoneNumberId: config.phone_number_id,
                wabaId,
                status: config.status,
                connected: true,
            };
        } catch (err: any) {
            this.logger.warn(`Could not fetch WABA balance for tenant ${tenantId}: ${err.message}`);
            // Return a graceful fallback instead of throwing
            return { balance: null, currency: 'USD', phoneNumberId: '', wabaId: '', status: 'ERROR', connected: false };
        }
    }

    /**
     * Handle WhatsApp API errors
     */
    private handleWhatsAppError(error: any, operation: string): never {
        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError;
            const errorData = axiosError.response?.data as any;

            this.logger.error(
                `WhatsApp API error during ${operation}: ${errorData?.error?.message || error.message}`,
                errorData
            );

            // Extract meaningful error message
            const errorMessage = errorData?.error?.message || error.message;
            const errorCode = errorData?.error?.code;

            throw new BadRequestException(
                `WhatsApp API error: ${errorMessage}${errorCode ? ` (Code: ${errorCode})` : ''}`
            );
        }

        this.logger.error(`Unexpected error during ${operation}: ${error.message}`, error.stack);
        throw new BadRequestException(`Failed to ${operation}`);
    }
}
