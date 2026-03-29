import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { TenantWabaConfig } from './entities/tenant-waba-config.entity';
import { EncryptionService } from '../security/encryption.service';
import * as crypto from 'crypto';
import axios from 'axios';

/**
 * WhatsAppOAuthService
 * 
 * Handles Meta OAuth Embedded Signup flow for WhatsApp Business API
 * 
 * Flow:
 * 1. Client initiates signup → Generate OAuth URL with state token
 * 2. User completes Meta OAuth → Redirected back with code
 * 3. Exchange code for access token
 * 4. Fetch WABA details from Meta
 * 5. Encrypt and store access token
 * 6. Save WABA configuration
 * 
 * Security:
 * - State token prevents CSRF attacks
 * - Access token always encrypted before storage
 * - One WABA per tenant
 */
@Injectable()
export class WhatsAppOAuthService {
    private readonly logger = new Logger(WhatsAppOAuthService.name);
    private readonly META_GRAPH_API = 'https://graph.facebook.com/v18.0';
    private readonly stateTokens = new Map<string, { tenantId: string; expiresAt: number }>();

    constructor(
        @InjectRepository(TenantWabaConfig)
        private wabaConfigRepository: Repository<TenantWabaConfig>,
        private encryptionService: EncryptionService,
        private configService: ConfigService,
    ) {
        // Clean up expired state tokens every 10 minutes
        setInterval(() => this.cleanupExpiredTokens(), 10 * 60 * 1000);
    }

    /**
     * Quick check: are Meta credentials configured on this platform?
     * The frontend calls this before showing the "Connect" button.
     */
    isPlatformReady(): { ready: boolean; missing: string[] } {
        const missing: string[] = [];
        if (!this.configService.get<string>('META_APP_ID')) missing.push('META_APP_ID');
        if (!this.configService.get<string>('META_CONFIG_ID')) missing.push('META_CONFIG_ID');
        if (!this.configService.get<string>('META_APP_SECRET')) missing.push('META_APP_SECRET');
        return { ready: missing.length === 0, missing };
    }

    /**
     * Generate Meta OAuth URL for Embedded Signup
     */
    async initiateSignup(tenantId: string, redirectUrl: string): Promise<{ oauthUrl: string; state: string }> {
        // Check if tenant already has WABA configured
        const existing = await this.wabaConfigRepository.findOne({
            where: { tenant_id: tenantId },
        });

        if (existing) {
            throw new BadRequestException('WhatsApp account already connected for this tenant');
        }

        // Generate state token for CSRF protection
        const state = crypto.randomBytes(32).toString('hex');

        // Store state token with expiration (10 minutes)
        this.stateTokens.set(state, {
            tenantId,
            expiresAt: Date.now() + 10 * 60 * 1000,
        });

        // Get Meta App credentials from environment
        const appId = this.configService.get<string>('META_APP_ID');
        const configId = this.configService.get<string>('META_CONFIG_ID');

        if (!appId || !configId) {
            throw new BadRequestException(
                'Meta App credentials not configured. Please set META_APP_ID and META_CONFIG_ID in your environment variables (via Super Admin → Settings → WhatsApp Config).'
            );
        }

        // Build OAuth URL
        const oauthUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
            `client_id=${appId}` +
            `&redirect_uri=${encodeURIComponent(redirectUrl)}` +
            `&state=${state}` +
            `&config_id=${configId}` +
            `&response_type=code` +
            `&scope=whatsapp_business_management,whatsapp_business_messaging`;

        this.logger.log(`OAuth URL generated for tenant: ${tenantId}`);

        return { oauthUrl, state };
    }

    /**
     * Handle OAuth callback and exchange code for access token
     */
    async handleCallback(code: string, state: string): Promise<TenantWabaConfig> {
        // Verify state token
        const stateData = this.stateTokens.get(state);

        if (!stateData) {
            throw new BadRequestException('Invalid or expired state token');
        }

        if (stateData.expiresAt < Date.now()) {
            this.stateTokens.delete(state);
            throw new BadRequestException('State token expired');
        }

        const tenantId = stateData.tenantId;

        // Clean up state token
        this.stateTokens.delete(state);

        try {
            // Exchange code for access token
            const tokenData = await this.exchangeCodeForToken(code);

            // Fetch WABA details
            const wabaDetails = await this.fetchWabaDetails(tokenData.access_token);

            // Encrypt access token
            const encryptedToken = await this.encryptionService.encryptToken(tenantId, tokenData.access_token);

            // Save WABA configuration
            const wabaConfig = this.wabaConfigRepository.create({
                tenant_id: tenantId,
                waba_id: wabaDetails.wabaId,
                phone_number_id: wabaDetails.phoneNumberId,
                phone_number: wabaDetails.phoneNumber,
                display_name: wabaDetails.displayName,
                encrypted_access_token: encryptedToken,
                token_expires_at: tokenData.expires_in
                    ? new Date(Date.now() + tokenData.expires_in * 1000)
                    : null,
                quality_rating: wabaDetails.qualityRating || 'UNKNOWN',
                status: 'PENDING_APPROVAL',
                connected_at: new Date(),
            });

            const saved = await this.wabaConfigRepository.save(wabaConfig);

            this.logger.log(`WABA connected for tenant: ${tenantId}, WABA ID: ${wabaDetails.wabaId}`);

            return saved;
        } catch (error) {
            this.logger.error(`OAuth callback failed for tenant ${tenantId}: ${error.message}`, error.stack);
            throw new BadRequestException(`Failed to connect WhatsApp: ${error.message}`);
        }
    }

    /**
     * Exchange authorization code for access token
     */
    private async exchangeCodeForToken(code: string): Promise<{
        access_token: string;
        token_type: string;
        expires_in?: number;
    }> {
        const appId = this.configService.get<string>('META_APP_ID');
        const appSecret = this.configService.get<string>('META_APP_SECRET');
        const redirectUri = this.configService.get<string>('META_REDIRECT_URI');

        if (!appId || !appSecret || !redirectUri) {
            throw new BadRequestException('Meta App credentials not configured');
        }

        try {
            const response = await axios.get(`${this.META_GRAPH_API}/oauth/access_token`, {
                params: {
                    client_id: appId,
                    client_secret: appSecret,
                    code,
                    redirect_uri: redirectUri,
                },
            });

            this.logger.debug('Access token exchanged successfully');

            return response.data;
        } catch (error) {
            this.logger.error(`Token exchange failed: ${error.response?.data?.error?.message || error.message}`);
            throw new Error('Failed to exchange code for access token');
        }
    }

    /**
     * Fetch WABA details from Meta Graph API
     */
    private async fetchWabaDetails(accessToken: string): Promise<{
        wabaId: string;
        phoneNumberId: string;
        phoneNumber: string;
        displayName: string;
        qualityRating?: string;
    }> {
        try {
            // Get WABA ID from debug token
            const debugResponse = await axios.get(`${this.META_GRAPH_API}/debug_token`, {
                params: {
                    input_token: accessToken,
                    access_token: accessToken,
                },
            });

            const wabaId = debugResponse.data.data.granular_scopes?.find(
                (scope: any) => scope.scope === 'whatsapp_business_management'
            )?.target_ids?.[0];

            if (!wabaId) {
                throw new Error('WABA ID not found in token');
            }

            // Get phone numbers for this WABA
            const phoneNumbersResponse = await axios.get(
                `${this.META_GRAPH_API}/${wabaId}/phone_numbers`,
                {
                    headers: { Authorization: `Bearer ${accessToken}` },
                }
            );

            const phoneNumbers = phoneNumbersResponse.data.data;

            if (!phoneNumbers || phoneNumbers.length === 0) {
                throw new Error('No phone numbers found for this WABA');
            }

            // Use the first phone number
            const primaryPhone = phoneNumbers[0];

            return {
                wabaId,
                phoneNumberId: primaryPhone.id,
                phoneNumber: primaryPhone.display_phone_number,
                displayName: primaryPhone.verified_name,
                qualityRating: primaryPhone.quality_rating,
            };
        } catch (error) {
            this.logger.error(`Failed to fetch WABA details: ${error.response?.data?.error?.message || error.message}`);
            throw new Error('Failed to fetch WhatsApp account details');
        }
    }

    /**
     * Get WABA configuration for a tenant
     */
    async getWabaConfig(tenantId: string): Promise<TenantWabaConfig | null> {
        return this.wabaConfigRepository.findOne({
            where: { tenant_id: tenantId },
        });
    }

    /**
     * Get decrypted access token for a tenant
     */
    async getDecryptedToken(tenantId: string): Promise<string> {
        const config = await this.getWabaConfig(tenantId);

        if (!config) {
            throw new NotFoundException('WhatsApp account not connected');
        }

        if (config.status !== 'ACTIVE') {
            throw new BadRequestException(`WhatsApp account is ${config.status}`);
        }

        // Decrypt token
        const decryptedToken = await this.encryptionService.decryptToken(tenantId, config.encrypted_access_token);

        return decryptedToken;
    }

    /**
     * Approve WABA configuration (Super Admin only)
     */
    async approveWaba(tenantId: string, adminId: string): Promise<TenantWabaConfig> {
        const config = await this.getWabaConfig(tenantId);

        if (!config) {
            throw new NotFoundException('WhatsApp account not found');
        }

        if (config.status === 'ACTIVE') {
            throw new BadRequestException('WhatsApp account already approved');
        }

        config.status = 'ACTIVE';
        config.approved_by = adminId;
        config.approved_at = new Date();

        const updated = await this.wabaConfigRepository.save(config);

        this.logger.log(`WABA approved for tenant: ${tenantId} by admin: ${adminId}`);

        return updated;
    }

    /**
     * Suspend WABA configuration (Super Admin only)
     */
    async suspendWaba(tenantId: string): Promise<TenantWabaConfig> {
        const config = await this.getWabaConfig(tenantId);

        if (!config) {
            throw new NotFoundException('WhatsApp account not found');
        }

        config.status = 'SUSPENDED';

        const updated = await this.wabaConfigRepository.save(config);

        this.logger.log(`WABA suspended for tenant: ${tenantId}`);

        return updated;
    }

    /**
     * Clean up expired state tokens
     */
    private cleanupExpiredTokens(): void {
        const now = Date.now();
        let cleaned = 0;

        for (const [state, data] of this.stateTokens.entries()) {
            if (data.expiresAt < now) {
                this.stateTokens.delete(state);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            this.logger.debug(`Cleaned up ${cleaned} expired state tokens`);
        }
    }
}
