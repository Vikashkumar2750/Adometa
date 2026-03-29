import { Controller, Post, Body, UseGuards, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { WhatsAppOAuthService } from './whatsapp-oauth.service';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantIsolationGuard } from '../common/guards/tenant-isolation.guard';
import {
    InitiateSignupDto,
    OAuthCallbackDto,
    OAuthInitiateResponseDto,
    WabaConnectionResponseDto,
} from './dto/oauth.dto';

@ApiTags('WhatsApp OAuth')
@ApiBearerAuth()
@Controller('whatsapp/oauth')
export class WhatsAppOAuthController {
    constructor(private readonly oauthService: WhatsAppOAuthService) { }

    @Get('platform-ready')
    @UseGuards(AuthGuard('jwt'), TenantIsolationGuard)
    @ApiOperation({ summary: 'Check if Meta credentials are configured on this platform' })
    @ApiResponse({ status: 200, description: 'Platform readiness check' })
    platformReady(): { ready: boolean; missing: string[] } {
        return this.oauthService.isPlatformReady();
    }

    @Post('initiate')
    @UseGuards(AuthGuard('jwt'), TenantIsolationGuard, RolesGuard)
    @Roles('TENANT_ADMIN')
    @ApiOperation({ summary: 'Initiate Meta OAuth Embedded Signup - TENANT_ADMIN only' })
    @ApiResponse({ status: 200, description: 'OAuth URL generated', type: OAuthInitiateResponseDto })
    @ApiResponse({ status: 400, description: 'WhatsApp already connected or invalid request' })
    @ApiResponse({ status: 403, description: 'Forbidden - TENANT_ADMIN role required' })
    async initiateSignup(
        @TenantId() tenantId: string,
        @Body() dto: InitiateSignupDto
    ): Promise<OAuthInitiateResponseDto> {
        return this.oauthService.initiateSignup(tenantId, dto.redirectUrl);
    }

    @Post('callback')
    @UseGuards(AuthGuard('jwt'), TenantIsolationGuard, RolesGuard)
    @Roles('TENANT_ADMIN')
    @ApiOperation({ summary: 'Handle OAuth callback - TENANT_ADMIN only' })
    @ApiResponse({ status: 200, description: 'WhatsApp connected successfully', type: WabaConnectionResponseDto })
    @ApiResponse({ status: 400, description: 'Invalid code or state token' })
    @ApiResponse({ status: 403, description: 'Forbidden - TENANT_ADMIN role required' })
    async handleCallback(
        @Body() dto: OAuthCallbackDto
    ): Promise<WabaConnectionResponseDto> {
        const config = await this.oauthService.handleCallback(dto.code, dto.state);

        return {
            id: config.id,
            wabaId: config.waba_id,
            phoneNumberId: config.phone_number_id,
            phoneNumber: config.phone_number,
            displayName: config.display_name || '',
            status: config.status,
            qualityRating: config.quality_rating || 'UNKNOWN',
        };
    }

    @Get('status')
    @UseGuards(AuthGuard('jwt'), TenantIsolationGuard, RolesGuard)
    @Roles('TENANT_ADMIN', 'TENANT_MARKETER', 'TENANT_VIEWER')
    @ApiOperation({ summary: 'Get WhatsApp connection status - Tenant users only' })
    @ApiResponse({ status: 200, description: 'Connection status', type: WabaConnectionResponseDto })
    @ApiResponse({ status: 404, description: 'WhatsApp not connected' })
    async getStatus(
        @TenantId() tenantId: string
    ): Promise<WabaConnectionResponseDto | { connected: false }> {
        const config = await this.oauthService.getWabaConfig(tenantId);

        if (!config) {
            return { connected: false };
        }

        return {
            id: config.id,
            wabaId: config.waba_id,
            phoneNumberId: config.phone_number_id,
            phoneNumber: config.phone_number,
            displayName: config.display_name || '',
            status: config.status,
            qualityRating: config.quality_rating || 'UNKNOWN',
        };
    }

    @Post('approve/:tenantId')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('SUPER_ADMIN')
    @ApiOperation({ summary: 'Approve WhatsApp connection - SUPER_ADMIN only' })
    @ApiResponse({ status: 200, description: 'WhatsApp connection approved' })
    @ApiResponse({ status: 404, description: 'WhatsApp connection not found' })
    @ApiResponse({ status: 403, description: 'Forbidden - SUPER_ADMIN role required' })
    async approveConnection(
        @Param('tenantId', new ParseUUIDPipe()) tenantId: string,
        @Body('adminId') adminId: string
    ): Promise<{ message: string }> {
        await this.oauthService.approveWaba(tenantId, adminId);
        return { message: 'WhatsApp connection approved successfully' };
    }

    @Post('suspend/:tenantId')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('SUPER_ADMIN')
    @ApiOperation({ summary: 'Suspend WhatsApp connection - SUPER_ADMIN only' })
    @ApiResponse({ status: 200, description: 'WhatsApp connection suspended' })
    @ApiResponse({ status: 404, description: 'WhatsApp connection not found' })
    @ApiResponse({ status: 403, description: 'Forbidden - SUPER_ADMIN role required' })
    async suspendConnection(
        @Param('tenantId', new ParseUUIDPipe()) tenantId: string
    ): Promise<{ message: string }> {
        await this.oauthService.suspendWaba(tenantId);
        return { message: 'WhatsApp connection suspended successfully' };
    }
}
