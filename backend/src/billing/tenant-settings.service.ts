import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantSettings } from './entities/billing.entities';
import { AuditService } from '../audit/audit.service';

export interface UpdateSettingsDto {
    max_api_rpm?: number;
    max_campaigns_per_day?: number;
    max_broadcast_size?: number;
    cost_per_message?: number;
    max_team_members?: number;
}

@Injectable()
export class TenantSettingsService {
    private readonly logger = new Logger(TenantSettingsService.name);

    constructor(
        @InjectRepository(TenantSettings)
        private settingsRepo: Repository<TenantSettings>,
        private auditService: AuditService,
    ) { }

    // ─────────────────────────────────────────────────────────
    // Get or auto-create settings for tenant
    // ─────────────────────────────────────────────────────────
    async getOrCreate(tenantId: string): Promise<TenantSettings> {
        let settings = await this.settingsRepo.findOne({ where: { tenant_id: tenantId } });
        if (!settings) {
            settings = this.settingsRepo.create({ tenant_id: tenantId });
            await this.settingsRepo.save(settings);
        }
        return settings;
    }

    // ─────────────────────────────────────────────────────────
    // Super Admin: update rate limits
    // ─────────────────────────────────────────────────────────
    async updateSettings(tenantId: string, dto: UpdateSettingsDto, adminId?: string): Promise<TenantSettings> {
        const settings = await this.getOrCreate(tenantId);
        Object.assign(settings, dto);
        const saved = await this.settingsRepo.save(settings);
        await this.auditService.log({
            tenantId,
            userId: adminId,
            userEmail: 'admin',
            userRole: 'SUPER_ADMIN',
            action: 'TENANT_SETTINGS_UPDATED',
            entityType: 'tenant_settings',
            entityId: tenantId,
            metadata: dto as any,
            ipAddress: '',
            userAgent: '',
            method: 'PATCH',
            endpoint: `/admin/billing/settings/${tenantId}`,
        });
        return saved;
    }

    // ─────────────────────────────────────────────────────────
    // Super Admin: enable / disable tenant
    // ─────────────────────────────────────────────────────────
    async setEnabled(tenantId: string, enabled: boolean, reason?: string, adminId?: string): Promise<TenantSettings> {
        const settings = await this.getOrCreate(tenantId);
        settings.is_enabled = enabled;
        if (!enabled) {
            settings.disabled_reason = reason || 'Disabled by admin';
            settings.disabled_at = new Date();
            settings.disabled_by = adminId ?? null;
        } else {
            settings.disabled_reason = null;
            settings.disabled_at = null;
            settings.disabled_by = null;
        }
        const saved = await this.settingsRepo.save(settings);
        await this.auditService.log({
            tenantId,
            userId: adminId,
            userEmail: 'admin',
            userRole: 'SUPER_ADMIN',
            action: enabled ? 'TENANT_ENABLED' : 'TENANT_DISABLED',
            entityType: 'tenant_settings',
            entityId: tenantId,
            metadata: { reason, enabled } as any,
            ipAddress: '',
            userAgent: '',
            method: 'POST',
            endpoint: `/admin/billing/settings/${tenantId}/enable`,
        });
        this.logger.warn(`Tenant ${tenantId} ${enabled ? 'ENABLED' : 'DISABLED'} by ${adminId}`);
        return saved;
    }

    // ─────────────────────────────────────────────────────────
    // Check if tenant is enabled (used in request interceptor)
    // ─────────────────────────────────────────────────────────
    async isEnabled(tenantId: string): Promise<boolean> {
        const settings = await this.settingsRepo.findOne({ where: { tenant_id: tenantId } });
        return settings ? settings.is_enabled : true; // default: enabled
    }

    // ─────────────────────────────────────────────────────────
    // Get all settings (for admin panel)
    // ─────────────────────────────────────────────────────────
    async getAll(): Promise<TenantSettings[]> {
        return this.settingsRepo.find();
    }

    async getCostPerMessage(tenantId: string): Promise<number> {
        const settings = await this.getOrCreate(tenantId);
        return +settings.cost_per_message;
    }

    // ─────────────────────────────────────────────────────────
    // Update notification preferences
    // ─────────────────────────────────────────────────────────
    async updateNotificationPrefs(tenantId: string, prefs: Record<string, boolean>) {
        const settings = await this.getOrCreate(tenantId);
        settings.notification_prefs = { ...(settings.notification_prefs ?? {}), ...prefs };
        await this.settingsRepo.save(settings);
        return settings.notification_prefs;
    }
}

