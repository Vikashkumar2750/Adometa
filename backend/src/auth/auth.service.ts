import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { SuperAdmin } from '../entities/super-admin.entity';
import { TenantUser } from '../entities/tenant.entities';
import { EmailService } from '../email/email.service';

// ─── In-memory token store (fallback when Redis is unavailable) ───────────────
interface TokenEntry { payload: string; expiresAt: number; }
const inMemoryTokens = new Map<string, TokenEntry>();

// Cleanup expired entries every 10 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, val] of inMemoryTokens) {
        if (val.expiresAt < now) inMemoryTokens.delete(key);
    }
}, 10 * 60 * 1000);

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);
    private redis: any = null;
    private redisAvailable = false;

    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private configService: ConfigService,
        private emailService: EmailService,
        @InjectRepository(SuperAdmin) private superAdminRepo: Repository<SuperAdmin>,
        @InjectRepository(TenantUser) private tenantUserRepo: Repository<TenantUser>,
    ) {
        this.initRedis();
    }

    private initRedis() {
        try {
            // Dynamic import to avoid crash if ioredis isn't configured
            const Redis = require('ioredis');
            const host = this.configService.get('REDIS_HOST') || 'localhost';
            const port = this.configService.get<number>('REDIS_PORT') || 6379;
            const password = this.configService.get('REDIS_PASSWORD') || undefined;

            this.redis = new Redis({ host, port, password, lazyConnect: true, enableOfflineQueue: false });

            this.redis.on('connect', () => {
                this.redisAvailable = true;
                this.logger.log('✅ Redis connected — password reset tokens will use Redis');
            });
            this.redis.on('error', () => {
                if (this.redisAvailable) {
                    this.logger.warn('⚠️  Redis unavailable — password reset tokens stored in-memory (single-server only)');
                }
                this.redisAvailable = false;
            });

            // Try connecting (non-blocking)
            this.redis.connect().catch(() => {
                this.logger.warn('⚠️  Redis not running — using in-memory fallback for password reset tokens');
                this.redisAvailable = false;
            });
        } catch {
            this.logger.warn('⚠️  ioredis not available — using in-memory password reset token store');
            this.redisAvailable = false;
        }
    }

    // ─── Token store (Redis with in-memory fallback) ──────────────────────────
    private async tokenSet(key: string, ttlSeconds: number, value: string): Promise<void> {
        if (this.redisAvailable && this.redis) {
            try {
                await this.redis.setex(key, ttlSeconds, value);
                return;
            } catch { this.redisAvailable = false; }
        }
        inMemoryTokens.set(key, { payload: value, expiresAt: Date.now() + ttlSeconds * 1000 });
    }

    private async tokenGet(key: string): Promise<string | null> {
        if (this.redisAvailable && this.redis) {
            try { return await this.redis.get(key); }
            catch { this.redisAvailable = false; }
        }
        const entry = inMemoryTokens.get(key);
        if (!entry) return null;
        if (entry.expiresAt < Date.now()) { inMemoryTokens.delete(key); return null; }
        return entry.payload;
    }

    private async tokenDel(key: string): Promise<void> {
        if (this.redisAvailable && this.redis) {
            try { await this.redis.del(key); return; }
            catch { this.redisAvailable = false; }
        }
        inMemoryTokens.delete(key);
    }

    // ─── Auth Methods ─────────────────────────────────────────────────────────
    async validateUser(email: string, pass: string): Promise<any> {
        const adminEmail = this.configService.get<string>('SUPER_ADMIN_EMAIL');
        const adminPass = this.configService.get<string>('SUPER_ADMIN_PASSWORD');

        if (email === adminEmail && pass === adminPass) {
            this.logger.log('Super Admin logged in via ENV credentials');
            return { id: '00000000-0000-0000-0000-000000000000', email: adminEmail, name: 'System Super Admin', role: 'SUPER_ADMIN', tenant_id: null };
        } else {
            this.logger.warn(`Super Admin login failed. EnvMatch: ${email === adminEmail}, PassMatch: ${pass === adminPass}`);
        }

        const user = await this.usersService.findByEmail(email);
        if (user && await bcrypt.compare(pass, user.password_hash)) {
            const { password_hash, ...result } = user;
            return result;
        }
        return null;
    }

    async login(user: any) {
        const payload = {
            sub: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            tenantId: user.tenant_id || user.tenantId || null,
        };
        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: user.id || user.sub,
                email: user.email,
                name: user.name,
                role: user.role,
                tenantId: user.tenant_id || user.tenantId,
            },
        };
    }

    async updateProfile(userId: string, role: string, name: string): Promise<{ success: boolean; name: string }> {
        if (role === 'SUPER_ADMIN' || role === 'SUPPORT_ADMIN') {
            await this.superAdminRepo.update({ id: userId }, { name });
        } else {
            await this.tenantUserRepo.update({ id: userId }, { name });
        }
        return { success: true, name };
    }

    async changePassword(userId: string, role: string, currentPassword: string, newPassword: string): Promise<{ success: boolean }> {
        if (role === 'SUPER_ADMIN' || role === 'SUPPORT_ADMIN') {
            const admin = await this.superAdminRepo.findOneBy({ id: userId });
            if (!admin) throw new BadRequestException('User not found');
            if (!admin.password_hash) throw new BadRequestException('Cannot change password for system super admin. Update SUPER_ADMIN_PASSWORD in .env instead.');
            if (!await bcrypt.compare(currentPassword, admin.password_hash)) throw new UnauthorizedException('Current password is incorrect');
            await this.superAdminRepo.update({ id: userId }, { password_hash: await bcrypt.hash(newPassword, 12) });
        } else {
            const user = await this.tenantUserRepo.findOneBy({ id: userId });
            if (!user) throw new BadRequestException('User not found');
            if (!await bcrypt.compare(currentPassword, user.password_hash)) throw new UnauthorizedException('Current password is incorrect');
            await this.tenantUserRepo.update({ id: userId }, { password_hash: await bcrypt.hash(newPassword, 12) });
        }
        return { success: true };
    }

    // ─── Password Reset ───────────────────────────────────────────────────────
    async forgotPassword(email: string): Promise<{ message: string; token?: string }> {
        const user = await this.usersService.findByEmail(email);
        if (!user) return { message: 'If this email exists, a reset link has been sent.' };

        const token = crypto.randomBytes(48).toString('hex');
        const ttl = 3600; // 1 hour

        await this.tokenSet(`pwd_reset:${token}`, ttl, JSON.stringify({ email: user.email, userId: user.id, role: user.role }));

        const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
        const emailSent = await this.emailService.sendPasswordReset(user.email, user.name || 'User', token, frontendUrl);

        const response: any = { message: 'If this email exists, a reset link has been sent.' };
        if (!emailSent) {
            response.dev_token = token;
            response.dev_reset_url = `${frontendUrl}/reset-password?token=${token}`;
            response.note = 'Email service not configured. Use dev_reset_url to test locally.';
        }
        return response;
    }

    async resetPassword(token: string, newPassword: string): Promise<{ success: boolean }> {
        if (!token || !newPassword) throw new BadRequestException('Token and new password are required');
        if (newPassword.length < 8) throw new BadRequestException('Password must be at least 8 characters');

        const raw = await this.tokenGet(`pwd_reset:${token}`);
        if (!raw) throw new BadRequestException('Reset token is invalid or has expired');

        const { email, userId } = JSON.parse(raw);
        const hash = await bcrypt.hash(newPassword, 12);

        const updated = await this.tenantUserRepo.update({ id: userId }, { password_hash: hash });
        if (!updated.affected) await this.superAdminRepo.update({ id: userId }, { password_hash: hash });

        await this.tokenDel(`pwd_reset:${token}`);

        const user = await this.usersService.findByEmail(email);
        if (user) await this.emailService.sendPasswordResetSuccess(email, user.name || 'User');

        return { success: true };
    }
}
