import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { AutomationRule } from './entities/automation-rule.entity';
import { AutomationService } from './automation.service';

/**
 * AutomationScheduler
 *
 * Runs every 15 minutes (configurable). Scans all ACTIVE automation rules
 * and fires them when their trigger conditions are met.
 *
 * Trigger types currently supported:
 *   - MESSAGE_UNREAD  → contacts with unread messages for N hours
 *   - CAMPAIGN_FAILED → campaigns that have failed in the last N hours
 *   - CAMPAIGN_COMPLETED → campaigns completed in the last N hours
 *
 * Action types:
 *   - RESCHEDULE_CAMPAIGN → marks failed/unread contacts for re-send
 *   - SEND_FOLLOW_UP     → queues a follow-up message
 *   - NOTIFY_ADMIN       → logs a notification (email when SMTP is set)
 */
@Injectable()
export class AutomationScheduler {
    private readonly logger = new Logger(AutomationScheduler.name);

    constructor(
        @InjectRepository(AutomationRule)
        private readonly ruleRepo: Repository<AutomationRule>,
        private readonly automationService: AutomationService,
    ) { }

    /**
     * Every 15 minutes: check ACTIVE rules and execute them.
     * In production, this would also dispatch actual WhatsApp sends.
     * Right now it updates stats and logs, ready to wire real dispatch.
     */
    @Cron(CronExpression.EVERY_30_MINUTES)
    async runScheduledRules(): Promise<void> {
        const now = new Date();
        this.logger.log('⚡ Automation scheduler tick');

        // Load all ACTIVE rules
        const rules = await this.ruleRepo.find({
            where: { status: 'ACTIVE' },
        });

        if (rules.length === 0) {
            this.logger.debug('No active automation rules to process');
            return;
        }

        this.logger.log(`Processing ${rules.length} active rule(s)...`);

        for (const rule of rules) {
            try {
                await this.processRule(rule, now);
            } catch (err: any) {
                this.logger.error(`Rule ${rule.id} (${rule.name}) failed: ${err.message}`);
                await this.automationService.recordRun(rule.id, false);
            }
        }
    }

    private async processRule(rule: AutomationRule, now: Date): Promise<void> {
        // Check cooldown — don't re-run within less than waitHours
        const cooldownMs = (rule.trigger_wait_hours || 24) * 60 * 60 * 1000;
        if (rule.stats_last_run) {
            const elapsed = now.getTime() - new Date(rule.stats_last_run).getTime();
            if (elapsed < cooldownMs) {
                // Not enough time has passed since last run
                return;
            }
        }

        const triggered = await this.evaluateTrigger(rule, now);
        if (!triggered) return;

        // Execute action
        await this.executeAction(rule, now);
        await this.automationService.recordRun(rule.id, true);

        this.logger.log(
            `✅ Rule "${rule.name}" [${rule.action_type}] executed for tenant ${rule.tenant_id}`,
        );
    }

    /**
     * Evaluates whether the rule's trigger condition is currently met.
     * Returns true if we should fire the action.
     */
    private async evaluateTrigger(rule: AutomationRule, now: Date): Promise<boolean> {
        // Since we don't have direct DB access to campaigns/messages here,
        // we use a time-based heuristic for now. In production, inject
        // CampaignRepository and MessageRepository.
        switch (rule.trigger_type) {
            case 'CAMPAIGN_FAILED':
            case 'MESSAGE_UNREAD':
            case 'CAMPAIGN_COMPLETED':
                // Time-based: trigger is eligible to run based on waitHours cooldown
                // (already checked above). Return true to indicate "conditions met".
                return true;

            default:
                this.logger.warn(`Unknown trigger type: ${rule.trigger_type}`);
                return false;
        }
    }

    /**
     * Executes the rule's action. Currently logs and updates stats.
     * Production: inject messaging service and dispatch real sends.
     */
    private async executeAction(rule: AutomationRule, now: Date): Promise<void> {
        switch (rule.action_type) {
            case 'RESCHEDULE_CAMPAIGN':
                this.logger.log(
                    `[RESCHEDULE] Tenant ${rule.tenant_id}: Re-scheduling failed recipients ` +
                    `(+${rule.action_schedule_offset_days}d @ ${rule.action_schedule_time})`,
                );
                // TODO: inject CampaignService and call reschedule() when WhatsApp is connected
                break;

            case 'SEND_FOLLOWUP':
                this.logger.log(
                    `[FOLLOW_UP] Tenant ${rule.tenant_id}: Queuing follow-up message`,
                );
                // TODO: inject MessagingService and send template message
                break;

            case 'NOTIFY_ADMIN':
                this.logger.log(
                    `[NOTIFY] Tenant ${rule.tenant_id}: Admin notification triggered`,
                );
                // TODO: inject EmailService and send notification email
                break;

            default:
                this.logger.warn(`Unknown action type: ${rule.action_type}`);
        }
    }
}
