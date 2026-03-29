import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AutomationRule, RuleStatus } from './entities/automation-rule.entity';

export interface CreateRuleDto {
    name: string;
    description?: string;
    trigger: {
        type: string;
        campaignId?: string;
        waitHours: number;
        condition?: string;
    };
    action: {
        type: string;
        scheduleOffsetDays: number;
        scheduleTime: string;
        maxRetries: number;
        message?: string;
    };
}

@Injectable()
export class AutomationService {
    constructor(
        @InjectRepository(AutomationRule)
        private readonly repo: Repository<AutomationRule>,
    ) { }

    async findAll(tenantId: string): Promise<AutomationRule[]> {
        return this.repo.find({
            where: { tenant_id: tenantId },
            order: { created_at: 'DESC' },
        });
    }

    async findOne(id: string, tenantId: string): Promise<AutomationRule> {
        const rule = await this.repo.findOne({ where: { id, tenant_id: tenantId } });
        if (!rule) throw new NotFoundException(`Automation rule ${id} not found`);
        return rule;
    }

    async create(tenantId: string, dto: CreateRuleDto): Promise<AutomationRule> {
        const rule = this.repo.create({
            tenant_id: tenantId,
            name: dto.name,
            description: dto.description || null,
            status: 'DRAFT',
            trigger_type: dto.trigger.type as any,
            trigger_campaign_id: dto.trigger.campaignId || null,
            trigger_wait_hours: dto.trigger.waitHours || 24,
            trigger_condition: dto.trigger.condition || null,
            action_type: dto.action.type as any,
            action_schedule_offset_days: dto.action.scheduleOffsetDays || 0,
            action_schedule_time: dto.action.scheduleTime || '09:00',
            action_max_retries: dto.action.maxRetries || 1,
            action_message: dto.action.message || null,
        });
        return this.repo.save(rule);
    }

    async update(id: string, tenantId: string, dto: Partial<CreateRuleDto & { status: RuleStatus }>): Promise<AutomationRule> {
        const rule = await this.findOne(id, tenantId);

        if (dto.name !== undefined) rule.name = dto.name;
        if (dto.description !== undefined) rule.description = dto.description || null;
        if (dto.status !== undefined) rule.status = dto.status;

        if (dto.trigger) {
            if (dto.trigger.type) rule.trigger_type = dto.trigger.type as any;
            if (dto.trigger.campaignId !== undefined) rule.trigger_campaign_id = dto.trigger.campaignId || null;
            if (dto.trigger.waitHours !== undefined) rule.trigger_wait_hours = dto.trigger.waitHours;
            if (dto.trigger.condition !== undefined) rule.trigger_condition = dto.trigger.condition || null;
        }

        if (dto.action) {
            if (dto.action.type) rule.action_type = dto.action.type as any;
            if (dto.action.scheduleOffsetDays !== undefined) rule.action_schedule_offset_days = dto.action.scheduleOffsetDays;
            if (dto.action.scheduleTime !== undefined) rule.action_schedule_time = dto.action.scheduleTime;
            if (dto.action.maxRetries !== undefined) rule.action_max_retries = dto.action.maxRetries;
            if (dto.action.message !== undefined) rule.action_message = dto.action.message || null;
        }

        return this.repo.save(rule);
    }

    async setStatus(id: string, tenantId: string, status: RuleStatus): Promise<AutomationRule> {
        const rule = await this.findOne(id, tenantId);
        rule.status = status;
        return this.repo.save(rule);
    }

    async remove(id: string, tenantId: string): Promise<void> {
        await this.findOne(id, tenantId);
        await this.repo.delete({ id, tenant_id: tenantId });
    }

    /** Called by the campaign scheduler when a trigger fires */
    async recordRun(id: string, success: boolean): Promise<void> {
        await this.repo.increment({ id }, 'stats_runs', 1);
        if (success) await this.repo.increment({ id }, 'stats_successes', 1);
        await this.repo.update(id, { stats_last_run: new Date() });
    }

    /** Find all active rules that match a trigger type for a given tenant */
    async findActiveByTrigger(tenantId: string, triggerType: string): Promise<AutomationRule[]> {
        return this.repo.find({
            where: {
                tenant_id: tenantId,
                trigger_type: triggerType as any,
                status: 'ACTIVE',
            },
        });
    }

    async getStats(tenantId: string) {
        const rules = await this.repo.find({ where: { tenant_id: tenantId } });
        return {
            total: rules.length,
            active: rules.filter(r => r.status === 'ACTIVE').length,
            paused: rules.filter(r => r.status === 'PAUSED').length,
            draft: rules.filter(r => r.status === 'DRAFT').length,
            totalRuns: rules.reduce((s, r) => s + r.stats_runs, 0),
            totalSuccesses: rules.reduce((s, r) => s + r.stats_successes, 0),
        };
    }
}
