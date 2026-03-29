import { Controller, Post, Get, Body, UseGuards, Param, ParseUUIDPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { WhatsAppApiService } from './whatsapp-api.service';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantIsolationGuard } from '../common/guards/tenant-isolation.guard';
import {
    SendTemplateMessageDto,
    SendTextMessageDto,
    SendMediaMessageDto,
    MessageResponseDto,
} from './dto/send-message.dto';

@ApiTags('WhatsApp Messaging')
@ApiBearerAuth()
@Controller('whatsapp/messages')
export class WhatsAppApiController {
    constructor(private readonly whatsappApiService: WhatsAppApiService) { }

    @Post('template')
    @UseGuards(AuthGuard('jwt'), TenantIsolationGuard, RolesGuard)
    @Roles('TENANT_ADMIN', 'TENANT_MARKETER')
    @ApiOperation({ summary: 'Send template message - TENANT_ADMIN, TENANT_MARKETER' })
    @ApiResponse({ status: 200, description: 'Message sent successfully', type: MessageResponseDto })
    @ApiResponse({ status: 400, description: 'Invalid request or WhatsApp API error' })
    @ApiResponse({ status: 404, description: 'WhatsApp account not connected' })
    @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
    async sendTemplateMessage(
        @TenantId() tenantId: string,
        @Body() dto: SendTemplateMessageDto
    ): Promise<MessageResponseDto> {
        return this.whatsappApiService.sendTemplateMessage(tenantId, dto);
    }

    @Post('text')
    @UseGuards(AuthGuard('jwt'), TenantIsolationGuard, RolesGuard)
    @Roles('TENANT_ADMIN', 'TENANT_MARKETER')
    @ApiOperation({ summary: 'Send text message - TENANT_ADMIN, TENANT_MARKETER' })
    @ApiResponse({ status: 200, description: 'Message sent successfully', type: MessageResponseDto })
    @ApiResponse({ status: 400, description: 'Invalid request or WhatsApp API error' })
    @ApiResponse({ status: 404, description: 'WhatsApp account not connected' })
    @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
    async sendTextMessage(
        @TenantId() tenantId: string,
        @Body() dto: SendTextMessageDto
    ): Promise<MessageResponseDto> {
        return this.whatsappApiService.sendTextMessage(tenantId, dto);
    }

    @Post('media')
    @UseGuards(AuthGuard('jwt'), TenantIsolationGuard, RolesGuard)
    @Roles('TENANT_ADMIN', 'TENANT_MARKETER')
    @ApiOperation({ summary: 'Send media message - TENANT_ADMIN, TENANT_MARKETER' })
    @ApiResponse({ status: 200, description: 'Message sent successfully', type: MessageResponseDto })
    @ApiResponse({ status: 400, description: 'Invalid request or WhatsApp API error' })
    @ApiResponse({ status: 404, description: 'WhatsApp account not connected' })
    @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
    async sendMediaMessage(
        @TenantId() tenantId: string,
        @Body() dto: SendMediaMessageDto
    ): Promise<MessageResponseDto> {
        return this.whatsappApiService.sendMediaMessage(tenantId, dto);
    }

    @Get('phone-details')
    @UseGuards(AuthGuard('jwt'), TenantIsolationGuard, RolesGuard)
    @Roles('TENANT_ADMIN', 'TENANT_MARKETER', 'TENANT_VIEWER')
    @ApiOperation({ summary: 'Get phone number details - All tenant users' })
    @ApiResponse({ status: 200, description: 'Phone number details' })
    @ApiResponse({ status: 404, description: 'WhatsApp account not connected' })
    @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
    async getPhoneNumberDetails(@TenantId() tenantId: string): Promise<any> {
        return this.whatsappApiService.getPhoneNumberDetails(tenantId);
    }

    @Get('templates')
    @UseGuards(AuthGuard('jwt'), TenantIsolationGuard, RolesGuard)
    @Roles('TENANT_ADMIN', 'TENANT_MARKETER', 'TENANT_VIEWER')
    @ApiOperation({ summary: 'Get message templates - All tenant users' })
    @ApiResponse({ status: 200, description: 'List of message templates' })
    @ApiResponse({ status: 404, description: 'WhatsApp account not connected' })
    @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
    async getTemplates(@TenantId() tenantId: string): Promise<any[]> {
        return this.whatsappApiService.getTemplates(tenantId);
    }

    @Post('mark-read/:messageId')
    @UseGuards(AuthGuard('jwt'), TenantIsolationGuard, RolesGuard)
    @Roles('TENANT_ADMIN', 'TENANT_MARKETER')
    @ApiOperation({ summary: 'Mark message as read - TENANT_ADMIN, TENANT_MARKETER' })
    @ApiResponse({ status: 200, description: 'Message marked as read' })
    @ApiResponse({ status: 400, description: 'Invalid request or WhatsApp API error' })
    @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
    async markMessageAsRead(
        @TenantId() tenantId: string,
        @Param('messageId') messageId: string
    ): Promise<{ success: boolean }> {
        return this.whatsappApiService.markMessageAsRead(tenantId, messageId);
    }

    @Get('balance')
    @UseGuards(AuthGuard('jwt'), TenantIsolationGuard, RolesGuard)
    @Roles('TENANT_ADMIN', 'TENANT_MARKETER', 'TENANT_VIEWER')
    @ApiOperation({ summary: 'Get WABA credit balance from Meta - All tenant users' })
    @ApiResponse({ status: 200, description: 'WABA balance information' })
    async getWabaBalance(@TenantId() tenantId: string): Promise<any> {
        return this.whatsappApiService.getWabaBalance(tenantId);
    }
}
