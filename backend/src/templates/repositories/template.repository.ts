import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Template, TemplateStatus } from '../entities/template.entity';

@Injectable()
export class TemplateRepository extends Repository<Template> {
    constructor(private dataSource: DataSource) {
        super(Template, dataSource.createEntityManager());
    }

    /**
     * Find templates by tenant with pagination
     */
    async findByTenant(
        tenantId: string,
        page: number = 1,
        limit: number = 10,
        search?: string,
        status?: TemplateStatus,
    ): Promise<[Template[], number]> {
        const query = this
            .createQueryBuilder('template')
            .where('template.tenantId = :tenantId', { tenantId })
            .andWhere('template.deletedAt IS NULL');

        if (search) {
            query.andWhere(
                '(template.name ILIKE :search OR template.description ILIKE :search)',
                { search: `%${search}%` },
            );
        }

        if (status) {
            query.andWhere('template.status = :status', { status });
        }

        query
            .orderBy('template.createdAt', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);

        return query.getManyAndCount();
    }

    /**
     * Find template by ID and tenant
     */
    async findByIdAndTenant(id: string, tenantId: string): Promise<Template | null> {
        return this
            .createQueryBuilder('template')
            .where('template.id = :id', { id })
            .andWhere('template.tenantId = :tenantId', { tenantId })
            .andWhere('template.deletedAt IS NULL')
            .getOne();
    }

    /**
     * Get template statistics for tenant
     */
    async getStatsByTenant(tenantId: string): Promise<{
        totalTemplates: number;
        approvedTemplates: number;
        pendingTemplates: number;
        rejectedTemplates: number;
        draftTemplates: number;
    }> {
        const templates = await this
            .createQueryBuilder('template')
            .where('template.tenantId = :tenantId', { tenantId })
            .andWhere('template.deletedAt IS NULL')
            .getMany();

        const totalTemplates = templates.length;
        const approvedTemplates = templates.filter((t) => t.status === TemplateStatus.APPROVED).length;
        const pendingTemplates = templates.filter((t) => t.status === TemplateStatus.PENDING).length;
        const rejectedTemplates = templates.filter((t) => t.status === TemplateStatus.REJECTED).length;
        const draftTemplates = templates.filter((t) => t.status === TemplateStatus.DRAFT).length;

        return {
            totalTemplates,
            approvedTemplates,
            pendingTemplates,
            rejectedTemplates,
            draftTemplates,
        };
    }

    /**
     * Find approved templates for tenant
     */
    async findApprovedByTenant(tenantId: string): Promise<Template[]> {
        return this
            .createQueryBuilder('template')
            .where('template.tenantId = :tenantId', { tenantId })
            .andWhere('template.status = :status', { status: TemplateStatus.APPROVED })
            .andWhere('template.deletedAt IS NULL')
            .orderBy('template.name', 'ASC')
            .getMany();
    }

    /**
     * Find ALL templates across all tenants (Super Admin only)
     */
    async findAllForAdmin(
        page: number = 1,
        limit: number = 20,
        search?: string,
        status?: TemplateStatus,
        tenantId?: string,
        category?: string,
    ): Promise<[Template[], number]> {
        const query = this
            .createQueryBuilder('template')
            .where('template.deletedAt IS NULL');

        if (tenantId) {
            query.andWhere('template.tenantId = :tenantId', { tenantId });
        }

        if (search) {
            query.andWhere(
                '(template.name ILIKE :search OR template.description ILIKE :search)',
                { search: `%${search}%` },
            );
        }

        if (status) {
            query.andWhere('template.status = :status', { status });
        }

        if (category) {
            query.andWhere('template.category = :category', { category });
        }

        query
            .orderBy('template.createdAt', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);

        return query.getManyAndCount();
    }

    /**
     * Get platform-wide template statistics (Super Admin only)
     */
    async getAdminStats(): Promise<{
        totalTemplates: number;
        approvedTemplates: number;
        pendingTemplates: number;
        rejectedTemplates: number;
        draftTemplates: number;
    }> {
        const [total, approved, pending, rejected, draft] = await Promise.all([
            this.count({ where: {} }),
            this.count({ where: { status: TemplateStatus.APPROVED } }),
            this.count({ where: { status: TemplateStatus.PENDING } }),
            this.count({ where: { status: TemplateStatus.REJECTED } }),
            this.count({ where: { status: TemplateStatus.DRAFT } }),
        ]);
        return {
            totalTemplates: total,
            approvedTemplates: approved,
            pendingTemplates: pending,
            rejectedTemplates: rejected,
            draftTemplates: draft,
        };
    }
}
