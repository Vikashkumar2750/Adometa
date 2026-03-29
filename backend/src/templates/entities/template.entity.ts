import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    Index,
} from 'typeorm';

export enum TemplateStatus {
    DRAFT = 'draft',
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
}

export enum TemplateCategory {
    MARKETING = 'MARKETING',
    UTILITY = 'UTILITY',
    AUTHENTICATION = 'AUTHENTICATION',
}

export enum TemplateLanguage {
    EN = 'en',
    EN_US = 'en_US',
    ES = 'es',
    PT_BR = 'pt_BR',
    HI = 'hi',
}

export enum HeaderType {
    NONE = 'NONE',
    TEXT = 'TEXT',
    IMAGE = 'IMAGE',
    VIDEO = 'VIDEO',
    DOCUMENT = 'DOCUMENT',
}

@Entity('templates')
@Index(['tenantId', 'status'])
@Index(['tenantId', 'category'])
export class Template {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'tenantId' })
    @Index()
    tenantId: string;

    @Column()
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({
        type: 'enum',
        enum: TemplateCategory,
        default: TemplateCategory.MARKETING,
    })
    category: TemplateCategory;

    @Column({
        type: 'enum',
        enum: TemplateLanguage,
        default: TemplateLanguage.EN,
    })
    language: TemplateLanguage;

    @Column({
        type: 'enum',
        enum: TemplateStatus,
        default: TemplateStatus.DRAFT,
    })
    status: TemplateStatus;

    // ─── Header ──────────────────────────────────────────────────────────────
    @Column({
        type: 'enum',
        enum: HeaderType,
        default: HeaderType.NONE,
        name: 'headerType',
    })
    headerType: HeaderType;

    /** For TEXT header: the actual text string */
    @Column({ type: 'text', nullable: true, name: 'headerText' })
    headerText: string;

    /**
     * For MEDIA headers (IMAGE/VIDEO/DOCUMENT):
     * Meta upload handle — the identifier returned from Meta's upload API.
     * Used in template HEADER component example.header_handle.
     */
    @Column({ nullable: true, name: 'headerMediaHandle' })
    headerMediaHandle: string;

    /**
     * Public URL of the media (for preview in our UI and as Meta example URL).
     * Either a local served URL or S3/CDN URL.
     */
    @Column({ nullable: true, name: 'headerMediaUrl' })
    headerMediaUrl: string;

    /** Original filename of the uploaded media */
    @Column({ nullable: true, name: 'headerMediaFilename' })
    headerMediaFilename: string;

    /** Mime type of the uploaded media, e.g. image/jpeg */
    @Column({ nullable: true, name: 'headerMediaMimeType' })
    headerMediaMimeType: string;

    @Column({ type: 'text', name: 'bodyText' })
    bodyText: string;

    @Column({ type: 'text', nullable: true, name: 'footerText' })
    footerText: string;

    @Column({ type: 'jsonb', nullable: true })
    buttons: Array<{
        type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
        text: string;
        url?: string;
        phone_number?: string;
        example?: string[];
        trackClicks?: boolean;
        trackingLabel?: string;
    }>;

    @Column({ type: 'jsonb', nullable: true })
    variables: Record<string, string>;

    @Column({ type: 'jsonb', nullable: true })
    components: any[];

    // ─── Meta API fields ──────────────────────────────────────────────────────
    @Column({ nullable: true, name: 'metaTemplateId' })
    metaTemplateId: string;

    @Column({ nullable: true, name: 'metaStatus' })
    metaStatus: string;

    @Column({ type: 'text', nullable: true, name: 'rejectionReason' })
    rejectionReason: string;

    @Column({ type: 'timestamp', nullable: true, name: 'submittedAt' })
    submittedAt: Date;

    @Column({ type: 'timestamp', nullable: true, name: 'approvedAt' })
    approvedAt: Date;

    @CreateDateColumn({ name: 'createdAt' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updatedAt' })
    updatedAt: Date;

    @DeleteDateColumn({ name: 'deletedAt' })
    deletedAt: Date;
}
