import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKey } from './entities/api-key.entity';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class ApiKeysService {
    constructor(
        @InjectRepository(ApiKey)
        private keyRepo: Repository<ApiKey>,
    ) { }

    /** Generate a new API key — returns the raw key ONCE then only stores hash */
    async create(tenantId: string, dto: { name: string; scopes?: string[]; expiresIn?: number }) {
        const rawKey = `tak_${crypto.randomBytes(32).toString('base64url')}`;
        const key_hash = await bcrypt.hash(rawKey, 10);
        const key_prefix = rawKey.slice(0, 12);

        const record = this.keyRepo.create({
            tenant_id: tenantId,
            name: dto.name,
            key_hash,
            key_prefix,
            scopes: (dto.scopes ?? ['read']).join(','),
            is_active: true,
            expires_at: dto.expiresIn ? new Date(Date.now() + dto.expiresIn * 24 * 60 * 60 * 1000) : null,
        });

        const saved = await this.keyRepo.save(record);
        // Return raw key ONLY this once — can never be retrieved again
        return { ...saved, raw_key: rawKey };
    }

    /** List all keys for a tenant (no raw key, no hash) */
    async list(tenantId: string) {
        const keys = await this.keyRepo.find({
            where: { tenant_id: tenantId },
            order: { created_at: 'DESC' },
        });
        return keys.map(k => this.sanitize(k));
    }

    /** Revoke (soft-delete) a key */
    async revoke(tenantId: string, keyId: string) {
        const key = await this.keyRepo.findOne({ where: { id: keyId, tenant_id: tenantId } });
        if (!key) throw new NotFoundException('API key not found');
        key.is_active = false;
        await this.keyRepo.save(key);
        return { message: 'Key revoked successfully' };
    }

    /** Hard delete a key */
    async delete(tenantId: string, keyId: string) {
        const key = await this.keyRepo.findOne({ where: { id: keyId, tenant_id: tenantId } });
        if (!key) throw new NotFoundException('API key not found');
        await this.keyRepo.remove(key);
        return { message: 'Key deleted' };
    }

    /** Update key name or scopes */
    async update(tenantId: string, keyId: string, dto: { name?: string; scopes?: string[] }) {
        const key = await this.keyRepo.findOne({ where: { id: keyId, tenant_id: tenantId } });
        if (!key) throw new NotFoundException('API key not found');
        if (dto.name) key.name = dto.name;
        if (dto.scopes) key.scopes = dto.scopes.join(',');
        return this.sanitize(await this.keyRepo.save(key));
    }

    /** Validate an incoming API key (used by auth guard) */
    async validate(rawKey: string): Promise<ApiKey | null> {
        if (!rawKey?.startsWith('tak_')) return null;
        // Find by prefix for performance (avoids full table bcrypt scan)
        const prefix = rawKey.slice(0, 12);
        const candidates = await this.keyRepo.find({
            where: { key_prefix: prefix, is_active: true },
        });
        for (const candidate of candidates) {
            const match = await bcrypt.compare(rawKey, candidate.key_hash);
            if (match) {
                // Check expiry
                if (candidate.expires_at && candidate.expires_at < new Date()) return null;
                // Update usage stats (fire and forget)
                this.keyRepo.update(candidate.id, {
                    last_used_at: new Date(),
                    total_requests: () => '"total_requests" + 1' as any,
                }).catch(() => { });
                return candidate;
            }
        }
        return null;
    }

    private sanitize(k: ApiKey) {
        const { key_hash, ...rest } = k;
        return rest;
    }
}
