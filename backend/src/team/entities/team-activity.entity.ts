import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    Index,
} from 'typeorm';

export type TeamActivityType =
    | 'LOGIN'
    | 'LOGOUT'
    | 'SESSION_END'
    | 'PASSWORD_CHANGE'
    | 'ACTION';

@Entity('team_activity_logs')
@Index(['tenant_id'])
@Index(['user_id'])
@Index(['created_at'])
export class TeamActivityLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    tenant_id: string;

    @Column({ type: 'uuid' })
    user_id: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    user_email: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    user_name: string;

    @Column({ type: 'varchar', length: 50, nullable: true })
    user_role: string;

    @Column({
        type: 'enum',
        enum: ['LOGIN', 'LOGOUT', 'SESSION_END', 'PASSWORD_CHANGE', 'ACTION'],
        default: 'ACTION',
    })
    activity_type: TeamActivityType;

    @Column({ type: 'varchar', length: 500, nullable: true })
    description: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    ip_address: string;

    @Column({ type: 'varchar', length: 500, nullable: true })
    user_agent: string;

    /** Duration in seconds — populated on LOGOUT/SESSION_END from active_since */
    @Column({ type: 'int', nullable: true })
    session_duration_seconds: number;

    /** When this session started (login time). Used to compute duration. */
    @Column({ type: 'timestamptz', nullable: true })
    session_started_at: Date;

    @CreateDateColumn({ type: 'timestamptz' })
    created_at: Date;
}
