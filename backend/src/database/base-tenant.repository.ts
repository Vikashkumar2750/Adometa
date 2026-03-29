import {
    Repository,
    FindOptionsWhere,
    FindManyOptions,
    FindOneOptions,
    DeepPartial,
    SaveOptions,
    RemoveOptions,
    ObjectLiteral,
} from 'typeorm';
import { Logger } from '@nestjs/common';

/**
 * BaseTenantRepository
 * 
 * CRITICAL SECURITY REPOSITORY
 * 
 * All tenant-scoped repositories MUST extend this class.
 * 
 * Automatically enforces tenant_id in all queries:
 * - find()
 * - findOne()
 * - findAndCount()
 * - count()
 * - save()
 * - remove()
 * 
 * This prevents cross-tenant data access at the database level.
 */
export class BaseTenantRepository<Entity extends ObjectLiteral> extends Repository<Entity> {
    protected readonly logger = new Logger(this.constructor.name);

    /**
     * Find entities with tenant isolation
     */
    async findByTenant(
        tenantId: string,
        options?: FindManyOptions<Entity>,
    ): Promise<Entity[]> {
        this.logger.debug(`Finding entities for tenant: ${tenantId}`);

        const where = this.mergeTenantId(tenantId, options?.where);

        return this.find({
            ...options,
            where,
        });
    }

    /**
     * Find one entity with tenant isolation
     */
    async findOneByTenant(
        tenantId: string,
        options?: FindOneOptions<Entity>,
    ): Promise<Entity | null> {
        this.logger.debug(`Finding one entity for tenant: ${tenantId}`);

        const where = this.mergeTenantId(tenantId, options?.where);

        return this.findOne({
            ...options,
            where,
        });
    }

    /**
     * Find and count with tenant isolation
     */
    async findAndCountByTenant(
        tenantId: string,
        options?: FindManyOptions<Entity>,
    ): Promise<[Entity[], number]> {
        this.logger.debug(`Finding and counting entities for tenant: ${tenantId}`);

        const where = this.mergeTenantId(tenantId, options?.where);

        return this.findAndCount({
            ...options,
            where,
        });
    }

    /**
     * Count entities with tenant isolation
     */
    async countByTenant(
        tenantId: string,
        options?: FindManyOptions<Entity>,
    ): Promise<number> {
        this.logger.debug(`Counting entities for tenant: ${tenantId}`);

        const where = this.mergeTenantId(tenantId, options?.where);

        return this.count({
            ...options,
            where,
        });
    }

    /**
     * Save entity with tenant isolation
     * Automatically injects tenant_id if not present
     */
    async saveByTenant(
        tenantId: string,
        entity: DeepPartial<Entity>,
        options?: SaveOptions,
    ): Promise<Entity> {
        this.logger.debug(`Saving entity for tenant: ${tenantId}`);

        // Inject tenant_id
        (entity as any).tenant_id = tenantId;

        return this.save(entity as any, options);
    }

    /**
     * Save multiple entities with tenant isolation
     */
    async saveMultipleByTenant(
        tenantId: string,
        entities: DeepPartial<Entity>[],
        options?: SaveOptions,
    ): Promise<Entity[]> {
        this.logger.debug(`Saving ${entities.length} entities for tenant: ${tenantId}`);

        // Inject tenant_id into all entities
        entities.forEach((entity) => {
            (entity as any).tenant_id = tenantId;
        });

        return this.save(entities as any, options);
    }

    /**
     * Remove entity with tenant isolation
     * Verifies entity belongs to tenant before removal
     */
    async removeByTenant(
        tenantId: string,
        entity: Entity,
        options?: RemoveOptions,
    ): Promise<Entity> {
        this.logger.debug(`Removing entity for tenant: ${tenantId}`);

        // Verify entity belongs to tenant
        if ((entity as any).tenant_id !== tenantId) {
            throw new Error('Cannot remove entity from different tenant');
        }

        return this.remove(entity, options);
    }

    /**
     * Soft delete with tenant isolation
     */
    async softDeleteByTenant(
        tenantId: string,
        criteria: FindOptionsWhere<Entity>,
    ): Promise<void> {
        this.logger.debug(`Soft deleting entities for tenant: ${tenantId}`);

        const where = this.mergeTenantId(tenantId, criteria);

        await this.softDelete(where);
    }

    /**
     * Hard delete with tenant isolation
     */
    async deleteByTenant(
        tenantId: string,
        criteria: FindOptionsWhere<Entity>,
    ): Promise<void> {
        this.logger.debug(`Hard deleting entities for tenant: ${tenantId}`);

        const where = this.mergeTenantId(tenantId, criteria);

        await this.delete(where);
    }

    /**
     * Merge tenant_id into where clause
     */
    private mergeTenantId(
        tenantId: string,
        where?: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[],
    ): FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[] {
        const tenantWhere = { tenant_id: tenantId } as unknown as FindOptionsWhere<Entity>;

        if (!where) {
            return tenantWhere;
        }

        if (Array.isArray(where)) {
            return where.map((w) => ({ ...w, ...tenantWhere }));
        }

        return { ...where, ...tenantWhere };
    }

    /**
     * DANGEROUS: Find without tenant isolation
     * Use ONLY for Super Admin operations
     * Requires explicit acknowledgment
     */
    async findWithoutTenantIsolation(
        options?: FindManyOptions<Entity>,
    ): Promise<Entity[]> {
        this.logger.warn('SECURITY WARNING: Finding entities WITHOUT tenant isolation');
        return this.find(options);
    }

    /**
     * DANGEROUS: Count without tenant isolation
     * Use ONLY for Super Admin operations
     */
    async countWithoutTenantIsolation(
        options?: FindManyOptions<Entity>,
    ): Promise<number> {
        this.logger.warn('SECURITY WARNING: Counting entities WITHOUT tenant isolation');
        return this.count(options);
    }
}
