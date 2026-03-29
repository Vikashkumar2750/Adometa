import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';

export enum CampaignStatus {
    DRAFT = 'draft',
    SCHEDULED = 'scheduled',
    RUNNING = 'running',
    PAUSED = 'paused',
    COMPLETED = 'completed',
    FAILED = 'failed',
}

@Entity('campaigns')
export class Campaign {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    tenantId: string;

    @Column()
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column()
    templateId: string;

    @Column({ nullable: true })
    templateName: string;

    @Column({ nullable: true })
    segmentId: string;

    @Column({ nullable: true })
    segmentName: string;

    @Column({
        type: 'enum',
        enum: CampaignStatus,
        default: CampaignStatus.DRAFT,
    })
    status: CampaignStatus;

    @Column({ type: 'timestamp', nullable: true })
    scheduledAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    startedAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    completedAt: Date;

    @Column({ type: 'int', default: 0 })
    totalRecipients: number;

    @Column({ type: 'int', default: 0 })
    sentCount: number;

    @Column({ type: 'int', default: 0 })
    deliveredCount: number;

    @Column({ type: 'int', default: 0 })
    readCount: number;

    @Column({ type: 'int', default: 0 })
    failedCount: number;

    @Column({ type: 'int', default: 0 })
    ctaCount: number;

    @Column({ type: 'jsonb', nullable: true })
    variables: Record<string, string>;

    @Column({ type: 'simple-array', nullable: true })
    contactIds: string[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @DeleteDateColumn()
    deletedAt: Date;
}
