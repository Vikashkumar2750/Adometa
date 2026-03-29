import {
    Injectable, Logger, NotFoundException,
    ConflictException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { TenantUser } from '../entities/tenant.entities';
import { TeamActivityLog } from './entities/team-activity.entity';
import * as bcrypt from 'bcrypt';

export interface CreateTeamMemberDto {
    name: string;
    email: string;
    password: string;
    role: 'TENANT_ADMIN' | 'TENANT_MARKETER' | 'TENANT_DEVELOPER' | 'READ_ONLY';
}

export interface UpdateTeamMemberDto {
    name?: string;
    role?: string;
    is_active?: boolean;
}

export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'halfyearly' | 'yearly';

function getDateRange(period: ReportPeriod): { from: Date; to: Date } {
    const to = new Date();
    const from = new Date();
    switch (period) {
        case 'daily': from.setDate(from.getDate() - 1); break;
        case 'weekly': from.setDate(from.getDate() - 7); break;
        case 'monthly': from.setMonth(from.getMonth() - 1); break;
        case 'quarterly': from.setMonth(from.getMonth() - 3); break;
        case 'halfyearly': from.setMonth(from.getMonth() - 6); break;
        case 'yearly': from.setFullYear(from.getFullYear() - 1); break;
    }
    return { from, to };
}

@Injectable()
export class TeamService {
    private readonly logger = new Logger(TeamService.name);

    constructor(
        @InjectRepository(TenantUser)
        private memberRepo: Repository<TenantUser>,
        @InjectRepository(TeamActivityLog)
        private activityRepo: Repository<TeamActivityLog>,
    ) { }

    // ─────────────────────────────────────────────────────────────────
    // Team Members CRUD
    // ─────────────────────────────────────────────────────────────────

    async getMembers(tenantId: string) {
        return this.memberRepo.find({
            where: { tenant_id: tenantId },
            select: ['id', 'name', 'email', 'role', 'is_active', 'last_login_at', 'created_at'],
            order: { created_at: 'ASC' },
        });
    }

    async createMember(tenantId: string, dto: CreateTeamMemberDto): Promise<TenantUser> {
        // Validate email uniqueness within tenant
        const existing = await this.memberRepo.findOne({
            where: { tenant_id: tenantId, email: dto.email.toLowerCase().trim() },
        });
        if (existing) throw new ConflictException('A member with this email already exists');

        if (dto.password.length < 8) throw new BadRequestException('Password must be at least 8 characters');

        const password_hash = await bcrypt.hash(dto.password, 12);

        const member = this.memberRepo.create({
            tenant_id: tenantId,
            name: dto.name.trim(),
            email: dto.email.toLowerCase().trim(),
            password_hash,
            role: dto.role,
            is_active: true,
            permissions: [],
        });
        const saved = await this.memberRepo.save(member);

        // Strip password_hash from response
        const { password_hash: _, ...safe } = saved as any;
        return safe;
    }

    async updateMember(tenantId: string, memberId: string, dto: UpdateTeamMemberDto) {
        const member = await this.memberRepo.findOne({
            where: { id: memberId, tenant_id: tenantId },
        });
        if (!member) throw new NotFoundException('Team member not found');

        Object.assign(member, dto);
        const saved = await this.memberRepo.save(member);
        const { password_hash: _, ...safe } = saved as any;
        return safe;
    }

    async deleteMember(tenantId: string, memberId: string) {
        const member = await this.memberRepo.findOne({
            where: { id: memberId, tenant_id: tenantId },
        });
        if (!member) throw new NotFoundException('Team member not found');
        await this.memberRepo.remove(member);
        return { success: true };
    }

    async resetPassword(tenantId: string, memberId: string, newPassword: string) {
        if (newPassword.length < 8) throw new BadRequestException('Password must be at least 8 characters');
        const member = await this.memberRepo.findOne({
            where: { id: memberId, tenant_id: tenantId },
        });
        if (!member) throw new NotFoundException('Team member not found');
        member.password_hash = await bcrypt.hash(newPassword, 12);
        await this.memberRepo.save(member);
        return { success: true };
    }

    // ─────────────────────────────────────────────────────────────────
    // Activity Logging (called by AuthService on login/logout)
    // ─────────────────────────────────────────────────────────────────

    async logActivity(params: {
        tenantId: string;
        userId: string;
        userEmail: string;
        userName: string;
        userRole: string;
        activityType: TeamActivityLog['activity_type'];
        description?: string;
        ipAddress?: string;
        userAgent?: string;
        sessionStartedAt?: Date;
        sessionDurationSeconds?: number;
    }) {
        try {
            await this.activityRepo.save(
                this.activityRepo.create({
                    tenant_id: params.tenantId,
                    user_id: params.userId,
                    user_email: params.userEmail,
                    user_name: params.userName,
                    user_role: params.userRole,
                    activity_type: params.activityType,
                    description: params.description,
                    ip_address: params.ipAddress,
                    user_agent: params.userAgent,
                    session_started_at: params.sessionStartedAt,
                    session_duration_seconds: params.sessionDurationSeconds,
                }),
            );
        } catch (err) {
            this.logger.warn(`Failed to log activity: ${err.message}`);
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // Activity Logs Query (tenant-scoped)
    // ─────────────────────────────────────────────────────────────────

    async getActivityLogs(tenantId: string, params: {
        period?: ReportPeriod;
        userId?: string;
        page?: number;
        limit?: number;
    }) {
        const { from, to } = getDateRange(params.period || 'monthly');
        const page = params.page || 1;
        const limit = Math.min(params.limit || 50, 200);

        const qb = this.activityRepo.createQueryBuilder('log')
            .where('log.tenant_id = :tenantId', { tenantId })
            .andWhere('log.created_at BETWEEN :from AND :to', { from, to })
            .orderBy('log.created_at', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);

        if (params.userId) {
            qb.andWhere('log.user_id = :userId', { userId: params.userId });
        }

        const [items, total] = await qb.getManyAndCount();
        return { items, total, page, limit, from, to };
    }

    // ─────────────────────────────────────────────────────────────────
    // CSV Report Generation
    // ─────────────────────────────────────────────────────────────────

    async generateActivityCsv(tenantId: string, period: ReportPeriod): Promise<string> {
        const { items } = await this.getActivityLogs(tenantId, { period, limit: 10000 });

        const header = ['Date & Time', 'Name', 'Email', 'Role', 'Activity', 'Description', 'IP Address', 'Session Duration (min)'];
        const rows = items.map(log => [
            new Date(log.created_at).toLocaleString('en-IN'),
            log.user_name || '',
            log.user_email || '',
            log.user_role || '',
            log.activity_type,
            log.description || '',
            log.ip_address || '',
            log.session_duration_seconds ? Math.round(log.session_duration_seconds / 60).toString() : '',
        ]);

        return [header, ...rows]
            .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            .join('\n');
    }
}
