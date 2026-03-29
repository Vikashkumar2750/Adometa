import { Repository, FindOptionsWhere, FindManyOptions, FindOneOptions, ObjectLiteral } from 'typeorm';
import { Logger, ForbiddenException } from '@nestjs/common';

/**
 * BaseTenantRepository
 * 
 * CRITICAL SECURITY CLASS
 * 
 * Automatically filters all database queries by tenant_id
 * Prevents cross-tenant data leakage
 * 
 * Usage:
 * export class ContactsRepository extends BaseTenantRepository<Contact> {
 *   constructor(dataSource: DataSource) {
 *     super(Contact, dataSource.createEntityManager());
 *   }
 * }
 * 
 * Then in service:
 * const contacts = await this.contactsRepository.findAllForTenant(tenantId);
 */
export class BaseTenantRepository<Entity extends ObjectLiteral> extends Repository<Entity> {
    protected readonly logger = new Logger(BaseTenantRepository.name);

    /**
     * Find all entities for a specific tenant
     */
    async findAllForTenant(
        tenantId: string,
        options?: Omit<FindManyOptions<Entity>, 'where'>
    ): Promise<Entity[]> {
        if (!tenantId) {
            this.logger.error('findAllForTenant called without tenantId');
            throw new ForbiddenException('Tenant context required');
        }

        const where: any = { tenant_id: tenantId };

        return this.find({
            ...options,
            where,
        });
    }

    /**
     * Find one entity for a specific tenant
     */
    async findOneForTenant(
        tenantId: string,
        where: FindOptionsWhere<Entity>,
        options?: Omit<FindOneOptions<Entity>, 'where'>
    ): Promise<Entity | null> {
        if (!tenantId) {
            this.logger.error('findOneForTenant called without tenantId');
            throw new ForbiddenException('Tenant context required');
        }

        const tenantWhere: any = {
            ...where,
            tenant_id: tenantId,
        };

        return this.findOne({
            ...options,
            where: tenantWhere,
        });
    }

    /**
     * Find entity by ID for a specific tenant
     */
    async findByIdForTenant(tenantId: string, id: string): Promise<Entity | null> {
        if (!tenantId) {
            this.logger.error('findByIdForTenant called without tenantId');
            throw new ForbiddenException('Tenant context required');
        }

        const where: any = {
            id,
            tenant_id: tenantId,
        };

        const entity = await this.findOne({ where });

        if (!entity) {
            this.logger.warn(
                `Entity not found or access denied: id=${id}, tenantId=${tenantId}`
            );
        }

        return entity;
    }

    /**
     * Create entity with tenant_id automatically set
     */
    async createForTenant(tenantId: string, entityData: Partial<Entity>): Promise<Entity> {
        if (!tenantId) {
            this.logger.error('createForTenant called without tenantId');
            throw new ForbiddenException('Tenant context required');
        }

        const entityWithTenant: any = {
            ...entityData,
            tenant_id: tenantId,
        };

        const entity = this.create(entityWithTenant);
        const saved = await this.save(entity as any);

        this.logger.debug(`Entity created for tenant: ${tenantId}`);

        return saved;
    }

    /**
     * Update entity for a specific tenant
     */
    async updateForTenant(
        tenantId: string,
        id: string,
        updateData: Partial<Entity>
    ): Promise<Entity> {
        if (!tenantId) {
            this.logger.error('updateForTenant called without tenantId');
            throw new ForbiddenException('Tenant context required');
        }

        // First, verify the entity belongs to this tenant
        const entity = await this.findByIdForTenant(tenantId, id);

        if (!entity) {
            this.logger.error(
                `Update failed: Entity not found or access denied: id=${id}, tenantId=${tenantId}`
            );
            throw new ForbiddenException('Entity not found or access denied');
        }

        // Update the entity
        Object.assign(entity, updateData);
        const updated = await this.save(entity as any);

        this.logger.debug(`Entity updated for tenant: ${tenantId}, id: ${id}`);

        return updated;
    }

    /**
     * Delete entity for a specific tenant
     */
    async deleteForTenant(tenantId: string, id: string): Promise<void> {
        if (!tenantId) {
            this.logger.error('deleteForTenant called without tenantId');
            throw new ForbiddenException('Tenant context required');
        }

        // First, verify the entity belongs to this tenant
        const entity = await this.findByIdForTenant(tenantId, id);

        if (!entity) {
            this.logger.error(
                `Delete failed: Entity not found or access denied: id=${id}, tenantId=${tenantId}`
            );
            throw new ForbiddenException('Entity not found or access denied');
        }

        await this.remove(entity as any);

        this.logger.debug(`Entity deleted for tenant: ${tenantId}, id: ${id}`);
    }

    /**
     * Soft delete entity for a specific tenant
     */
    async softDeleteForTenant(tenantId: string, id: string): Promise<void> {
        if (!tenantId) {
            this.logger.error('softDeleteForTenant called without tenantId');
            throw new ForbiddenException('Tenant context required');
        }

        // First, verify the entity belongs to this tenant
        const entity = await this.findByIdForTenant(tenantId, id);

        if (!entity) {
            this.logger.error(
                `Soft delete failed: Entity not found or access denied: id=${id}, tenantId=${tenantId}`
            );
            throw new ForbiddenException('Entity not found or access denied');
        }

        await this.softDelete({ id } as any);

        this.logger.debug(`Entity soft deleted for tenant: ${tenantId}, id: ${id}`);
    }

    /**
     * Count entities for a specific tenant
     */
    async countForTenant(
        tenantId: string,
        where?: FindOptionsWhere<Entity>
    ): Promise<number> {
        if (!tenantId) {
            this.logger.error('countForTenant called without tenantId');
            throw new ForbiddenException('Tenant context required');
        }

        const tenantWhere: any = {
            ...where,
            tenant_id: tenantId,
        };

        return this.count({ where: tenantWhere });
    }
}
