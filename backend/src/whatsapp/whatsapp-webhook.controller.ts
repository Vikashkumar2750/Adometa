import {
    Controller,
    Get,
    Post,
    Query,
    Body,
    Headers,
    UseGuards,
    BadRequestException,
    HttpCode,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiExcludeEndpoint } from '@nestjs/swagger';
import { WhatsAppWebhookService } from './whatsapp-webhook.service';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantIsolationGuard } from '../common/guards/tenant-isolation.guard';
import { Public } from '../common/decorators/public.decorator';
import { WebhookPayloadDto, WebhookEventResponseDto } from './dto/webhook.dto';

@ApiTags('WhatsApp Webhooks')
@Controller('whatsapp/webhook')
export class WhatsAppWebhookController {
    constructor(private readonly webhookService: WhatsAppWebhookService) { }

    /**
     * Webhook verification (GET request from Meta)
     * This endpoint is called by Meta to verify the webhook URL
     */
    @Get()
    @Public()
    @ApiExcludeEndpoint() // Don't show in Swagger (Meta-only endpoint)
    @HttpCode(200)
    verifyWebhook(
        @Query('hub.mode') mode: string,
        @Query('hub.verify_token') token: string,
        @Query('hub.challenge') challenge: string,
    ): string {
        return this.webhookService.verifyWebhook(mode, token, challenge);
    }

    /**
     * Webhook event handler (POST request from Meta)
     * This endpoint receives all WhatsApp events
     */
    @Post()
    @Public()
    @ApiExcludeEndpoint() // Don't show in Swagger (Meta-only endpoint)
    @HttpCode(200)
    async handleWebhook(
        @Headers('x-hub-signature-256') signature: string,
        @Body() payload: WebhookPayloadDto,
    ): Promise<{ success: boolean }> {
        // Verify signature
        const payloadString = JSON.stringify(payload);
        const isValid = this.webhookService.verifySignature(payloadString, signature);

        if (!isValid) {
            throw new BadRequestException('Invalid signature');
        }

        // Process webhook
        await this.webhookService.handleWebhook(payload);

        return { success: true };
    }

    /**
     * Get webhook events for tenant (for debugging)
     */
    @Get('events')
    @UseGuards(AuthGuard('jwt'), TenantIsolationGuard, RolesGuard)
    @Roles('TENANT_ADMIN', 'TENANT_MARKETER')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get webhook events - TENANT_ADMIN, TENANT_MARKETER' })
    @ApiResponse({ status: 200, description: 'List of webhook events' })
    @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
    async getEvents(
        @TenantId() tenantId: string,
        @Query('eventType') eventType?: string,
        @Query('messageId') messageId?: string,
        @Query('limit') limit?: number,
        @Query('offset') offset?: number,
    ): Promise<{ data: WebhookEventResponseDto[]; total: number }> {
        const result = await this.webhookService.getEvents(tenantId, {
            eventType,
            messageId,
            limit: limit || 50,
            offset: offset || 0,
        });

        const data = result.data.map((event) => ({
            id: event.id,
            eventType: event.event_type,
            messageId: event.message_id,
            status: event.status,
            createdAt: event.created_at,
        }));

        return { data, total: result.total };
    }

    /**
     * Get message status history
     */
    @Get('message-status/:messageId')
    @UseGuards(AuthGuard('jwt'), TenantIsolationGuard, RolesGuard)
    @Roles('TENANT_ADMIN', 'TENANT_MARKETER')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get message status history - TENANT_ADMIN, TENANT_MARKETER' })
    @ApiResponse({ status: 200, description: 'Message status history' })
    @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
    async getMessageStatusHistory(
        @TenantId() tenantId: string,
        @Query('messageId') messageId: string,
    ): Promise<WebhookEventResponseDto[]> {
        const events = await this.webhookService.getMessageStatusHistory(tenantId, messageId);

        return events.map((event) => ({
            id: event.id,
            eventType: event.event_type,
            messageId: event.message_id,
            status: event.status,
            createdAt: event.created_at,
        }));
    }
}
