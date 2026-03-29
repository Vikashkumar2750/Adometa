import {
    Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
    UpdateDateColumn, Index,
} from 'typeorm';

export type TriggerType = 'CAMPAIGN_FAILED' | 'MESSAGE_UNREAD' | 'MESSAGE_DELIVERED' | 'CAMPAIGN_COMPLETED';
export type ActionType = 'RESCHEDULE_CAMPAIGN' | 'SEND_FOLLOWUP' | 'NOTIFY_ADMIN' | 'MARK_SEGMENT';
export type RuleStatus = 'ACTIVE' | 'PAUSED' | 'DRAFT';

@Entity('automation_rules')
@Index(['tenant_id', 'status'])
export class AutomationRule {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar' })
    @Index()
    tenant_id: string;

    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string | null;

    @Column({ type: 'varchar', length: 20, default: 'DRAFT' })
    status: RuleStatus;

    // Trigger config
    @Column({ type: 'varchar', length: 50 })
    trigger_type: TriggerType;

    @Column({ type: 'varchar', nullable: true })
    trigger_campaign_id: string | null;

    @Column({ type: 'int', default: 24 })
    trigger_wait_hours: number;

    @Column({ type: 'varchar', nullable: true })
    trigger_condition: string | null;

    // Action config
    @Column({ type: 'varchar', length: 50 })
    action_type: ActionType;

    @Column({ type: 'int', default: 0 })
    action_schedule_offset_days: number;

    @Column({ type: 'varchar', length: 10, default: '09:00' })
    action_schedule_time: string;

    @Column({ type: 'int', default: 1 })
    action_max_retries: number;

    @Column({ type: 'text', nullable: true })
    action_message: string | null;

    // Stats (updated by the scheduler)
    @Column({ type: 'int', default: 0 })
    stats_runs: number;

    @Column({ type: 'int', default: 0 })
    stats_successes: number;

    @Column({ type: 'timestamptz', nullable: true })
    stats_last_run: Date | null;

    @CreateDateColumn({ type: 'timestamptz' })
    created_at: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updated_at: Date;
}
