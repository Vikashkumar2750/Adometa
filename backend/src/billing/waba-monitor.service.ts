import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantWabaConfig } from '../whatsapp/entities/tenant-waba-config.entity';
import { Tenant } from '../entities/tenant.entities';

/**
 * WabaMonitorService
 *
 * SECURITY: Tokens are NEVER exposed. Only masked versions (****abcd) are returned.
 * Full encrypted_access_token is never included in any API response.
 */
@Injectable()
export class WabaMonitorService {
    private readonly logger = new Logger(WabaMonitorService.name);

    constructor(
        @InjectRepository(TenantWabaConfig)
        private wabaRepo: Repository<TenantWabaConfig>,
        @InjectRepository(Tenant)
        private tenantRepo: Repository<Tenant>,
    ) { }

    // ─────────────────────────────────────────────────────────
    // Get all tenant WABA connections (Super Admin only)
    // ─────────────────────────────────────────────────────────
    async getAllConnections(page = 1, limit = 50, status?: string) {
        const qb = this.wabaRepo
            .createQueryBuilder('w')
            .leftJoinAndSelect('w.tenant', 'tenant')
            .orderBy('w.created_at', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);

        if (status) qb.andWhere('w.status = :status', { status });

        const [configs, total] = await qb.getManyAndCount();

        const items = configs.map(c => this.sanitize(c));
        return { items, total, page, limit };
    }

    // ─────────────────────────────────────────────────────────
    // Get single WABA config for a tenant (Super Admin only)
    // ─────────────────────────────────────────────────────────
    async getConnection(tenantId: string) {
        const config = await this.wabaRepo.findOne({
            where: { tenant_id: tenantId },
            relations: ['tenant'],
        });
        if (!config) return null;
        return this.sanitize(config);
    }

    // ─────────────────────────────────────────────────────────
    // Summary stats for monitoring dashboard
    // ─────────────────────────────────────────────────────────
    async getMonitoringSummary() {
        const total = await this.wabaRepo.count();
        const active = await this.wabaRepo.count({ where: { status: 'ACTIVE' } });
        const pending = await this.wabaRepo.count({ where: { status: 'PENDING_APPROVAL' } });
        const suspended = await this.wabaRepo.count({ where: { status: 'SUSPENDED' } });

        const now = new Date();
        // Tokens expiring within 7 days
        const sevenDaysAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const expiringSoon = await this.wabaRepo
            .createQueryBuilder('w')
            .where('w.token_expires_at IS NOT NULL')
            .andWhere('w.token_expires_at <= :soon', { soon: sevenDaysAhead })
            .andWhere('w.token_expires_at > :now', { now })
            .andWhere('w.status = :status', { status: 'ACTIVE' })
            .getCount();

        const expired = await this.wabaRepo
            .createQueryBuilder('w')
            .where('w.token_expires_at IS NOT NULL')
            .andWhere('w.token_expires_at < :now', { now })
            .andWhere('w.status = :status', { status: 'ACTIVE' })
            .getCount();

        return { total, active, pending, suspended, expiringSoon, expired };
    }

    // ─────────────────────────────────────────────────────────
    // SECURITY: Strip encrypted token, return masked version only
    // ─────────────────────────────────────────────────────────
    private sanitize(config: TenantWabaConfig & { tenant?: Tenant }) {
        const now = new Date();
        const tokenExpired = config.token_expires_at && config.token_expires_at < now;
        const tokenStatus = !config.encrypted_access_token
            ? 'NOT_SET'
            : tokenExpired
                ? 'EXPIRED'
                : config.token_expires_at
                    ? 'ACTIVE'
                    : 'ACTIVE_NO_EXPIRY';

        // Mask token: show only last 4 chars of (encrypted) token reference
        const maskedToken = config.encrypted_access_token
            ? `****${config.encrypted_access_token.slice(-4)}`
            : null;

        return {
            id: config.id,
            tenant_id: config.tenant_id,
            tenant_name: (config as any).tenant?.business_name || config.tenant_id,
            waba_id: config.waba_id,
            phone_number_id: config.phone_number_id,
            phone_number: config.phone_number,
            display_name: config.display_name,
            // NEVER expose encrypted_access_token or decrypted token
            token_masked: maskedToken,
            token_status: tokenStatus,
            token_expires_at: config.token_expires_at,
            quality_rating: config.quality_rating || 'UNKNOWN',
            status: config.status,
            connected_at: config.connected_at,
            approved_at: config.approved_at,
            created_at: config.created_at,
            updated_at: config.updated_at,
            // Derived fields
            is_token_expired: tokenExpired,
            days_until_token_expiry: config.token_expires_at
                ? Math.ceil((config.token_expires_at.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                : null,
        };
    }
}
