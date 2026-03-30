import { Injectable, Logger, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant, TenantUser } from '../entities/tenant.entities';
import { CreateTenantDto, UpdateTenantDto } from './dto/create-tenant.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class TenantsService {
    private readonly logger = new Logger(TenantsService.name);

    constructor(
        @InjectRepository(Tenant)
        private tenantsRepository: Repository<Tenant>,
        @InjectRepository(TenantUser)
        private tenantUsersRepository: Repository<TenantUser>,
    ) { }

    /**
     * Create a new Tenant and its initial Admin User
     * @param createTenantDto 
     */
    async create(createTenantDto: CreateTenantDto): Promise<Tenant> {
        // 1. Check for existing business name
        const existingTenant = await this.tenantsRepository.findOneBy({ business_name: createTenantDto.business_name });
        if (existingTenant) {
            this.logger.warn(`Tenant with business name "${createTenantDto.business_name}" already exists.`);
            throw new ConflictException('Tenant with this business name already exists');
        }

        // 2. Check for existing user email (Enforce global uniqueness for simplicity)
        const existingUser = await this.tenantUsersRepository.findOneBy({ email: createTenantDto.owner_email });
        if (existingUser) {
            this.logger.warn(`User with email "${createTenantDto.owner_email}" already exists.`);
            throw new ConflictException('User with this email is already registered');
        }

        // 3. Create Tenant
        const tenant = this.tenantsRepository.create({
            business_name: createTenantDto.business_name,
            owner_name: createTenantDto.owner_name,
            owner_email: createTenantDto.owner_email,
            timezone: createTenantDto.timezone || 'UTC',
            locale: createTenantDto.locale || 'en',
            plan: createTenantDto.plan || 'FREE_TRIAL',
            status: 'PENDING_APPROVAL' // Default status
        });

        const savedTenant = await this.tenantsRepository.save(tenant);
        this.logger.log(`Tenant created: ${savedTenant.id} (${savedTenant.business_name})`);

        // 4. Create Initial Admin User for Tenant
        // Use the password provided during tenant creation
        const hashedPassword = await bcrypt.hash(createTenantDto.password, 10);

        const adminUser = this.tenantUsersRepository.create({
            tenant_id: savedTenant.id,
            email: createTenantDto.owner_email,
            name: createTenantDto.owner_name,
            role: 'TENANT_ADMIN',
            password_hash: hashedPassword,
            is_active: true
        });

        await this.tenantUsersRepository.save(adminUser);
        this.logger.log(`Tenant Admin User created: ${adminUser.email} for Tenant ${savedTenant.id}`);

        return savedTenant;
    }

    /**
     * List all tenants with pagination and filters (Super Admin view)
     */
    async findAll(filters?: {
        status?: string;
        plan?: string;
        page?: number;
        limit?: number;
    }): Promise<{ data: Tenant[]; total: number; page: number; limit: number }> {
        const page = filters?.page || 1;
        const limit = filters?.limit || 20;
        const skip = (page - 1) * limit;

        const queryBuilder = this.tenantsRepository.createQueryBuilder('tenant');

        if (filters?.status) {
            queryBuilder.andWhere('tenant.status = :status', { status: filters.status });
        }

        if (filters?.plan) {
            queryBuilder.andWhere('tenant.plan = :plan', { plan: filters.plan });
        }

        queryBuilder
            .orderBy('tenant.created_at', 'DESC')
            .skip(skip)
            .take(limit);

        const [data, total] = await queryBuilder.getManyAndCount();

        return { data, total, page, limit };
    }

    /**
     * Find single tenant by ID
     */
    async findOne(id: string): Promise<Tenant | null> {
        return this.tenantsRepository.findOneBy({ id });
    }

    /**
     * Update tenant plan, status, or other mutable fields
     */
    async update(id: string, updateData: UpdateTenantDto): Promise<Tenant> {
        const tenant = await this.tenantsRepository.findOneBy({ id });

        if (!tenant) {
            throw new NotFoundException(`Tenant ${id} not found`);
        }

        // Check business name uniqueness if changing
        if (updateData.business_name && updateData.business_name !== tenant.business_name) {
            const existing = await this.tenantsRepository.findOneBy({
                business_name: updateData.business_name
            });
            if (existing) {
                throw new ConflictException('Business name already exists');
            }
        }

        // Apply only provided fields to tenant row
        if (updateData.plan !== undefined) tenant.plan = updateData.plan;
        if (updateData.status !== undefined) tenant.status = updateData.status;
        if (updateData.business_name !== undefined) tenant.business_name = updateData.business_name;
        if (updateData.timezone !== undefined) tenant.timezone = updateData.timezone;
        if (updateData.locale !== undefined) tenant.locale = updateData.locale;
        if (updateData.owner_name !== undefined) tenant.owner_name = updateData.owner_name;
        if (updateData.owner_email !== undefined) tenant.owner_email = updateData.owner_email;

        const updated = await this.tenantsRepository.save(tenant);

        // Also update the TENANT_ADMIN user record if email/name/password changed
        const adminUser = await this.tenantUsersRepository.findOne({
            where: { tenant_id: id, role: 'TENANT_ADMIN' },
        });
        if (adminUser) {
            if (updateData.owner_name !== undefined) adminUser.name = updateData.owner_name;
            if (updateData.owner_email !== undefined) adminUser.email = updateData.owner_email;
            if (updateData.new_password) {
                adminUser.password_hash = await bcrypt.hash(updateData.new_password, 10);
            }
            await this.tenantUsersRepository.save(adminUser);
        }

        this.logger.log(`Tenant ${id} updated — plan: ${updated.plan}, status: ${updated.status}`);
        return updated;
    }

    /**
     * Approve tenant (Super Admin only)
     */
    async approve(id: string, approvedBy: string): Promise<Tenant> {
        const tenant = await this.tenantsRepository.findOneBy({ id });

        if (!tenant) {
            throw new ConflictException('Tenant not found');
        }

        if (tenant.status === 'ACTIVE') {
            throw new ConflictException('Tenant is already approved');
        }

        tenant.status = 'ACTIVE';
        tenant.approved_by = approvedBy;
        tenant.approved_at = new Date();

        const approved = await this.tenantsRepository.save(tenant);

        this.logger.log(`Tenant approved: ${id} by ${approvedBy}`);
        return approved;
    }

    /**
     * Reject tenant (marks as DELETED with rejection metadata)
     * Note: DB enum is PENDING_APPROVAL|ACTIVE|SUSPENDED|DELETED — no REJECTED value.
     */
    async reject(id: string, reason: string): Promise<Tenant> {
        const tenant = await this.tenantsRepository.findOneBy({ id });

        if (!tenant) {
            throw new ConflictException('Tenant not found');
        }

        tenant.status = 'DELETED';
        tenant.metadata = {
            ...tenant.metadata,
            rejection_reason: reason,
            rejected_at: new Date().toISOString(),
            action: 'REJECTED'
        };

        const rejected = await this.tenantsRepository.save(tenant);

        this.logger.log(`Tenant rejected: ${id} - Reason: ${reason}`);
        return rejected;
    }

    /**
     * Suspend tenant
     */
    async suspend(id: string, reason?: string): Promise<Tenant> {
        const tenant = await this.tenantsRepository.findOneBy({ id });
        if (!tenant) throw new ConflictException('Tenant not found');
        if (tenant.status === 'SUSPENDED') throw new ConflictException('Tenant is already suspended');

        tenant.status = 'SUSPENDED';
        tenant.metadata = { ...tenant.metadata, suspension_reason: reason, suspended_at: new Date().toISOString() };
        const updated = await this.tenantsRepository.save(tenant);
        this.logger.log(`Tenant suspended: ${id}`);
        return updated;
    }

    /**
     * Activate (re-activate) tenant
     */
    async activate(id: string): Promise<Tenant> {
        const tenant = await this.tenantsRepository.findOneBy({ id });
        if (!tenant) throw new ConflictException('Tenant not found');

        tenant.status = 'ACTIVE';
        const updated = await this.tenantsRepository.save(tenant);
        this.logger.log(`Tenant activated: ${id}`);
        return updated;
    }

    /**
     * Soft delete tenant
     */
    async remove(id: string): Promise<void> {
        const tenant = await this.tenantsRepository.findOneBy({ id });
        if (!tenant) throw new ConflictException('Tenant not found');
        await this.tenantsRepository.softDelete(id);
        this.logger.log(`Tenant soft deleted: ${id}`);
    }

    /**
     * Get platform-wide stats for Super Admin dashboard.
     * Valid DB enum values: PENDING_APPROVAL | ACTIVE | SUSPENDED | DELETED
     */
    async getPlatformStats(): Promise<{
        totalTenants: number;
        activeTenants: number;
        pendingTenants: number;
        suspendedTenants: number;
        deletedTenants: number;
        planBreakdown: Record<string, number>;
    }> {
        const [total, active, pending, suspended, deleted] = await Promise.all([
            this.tenantsRepository.count(),
            this.tenantsRepository.count({ where: { status: 'ACTIVE' } }),
            this.tenantsRepository.count({ where: { status: 'PENDING_APPROVAL' } }),
            this.tenantsRepository.count({ where: { status: 'SUSPENDED' } }),
            this.tenantsRepository.count({ where: { status: 'DELETED' } }),
        ]);

        // Plan breakdown (only active tenants)
        const allTenants = await this.tenantsRepository.find({ select: ['plan'] });
        const planBreakdown: Record<string, number> = {};
        allTenants.forEach(t => {
            if (t.plan) {
                planBreakdown[t.plan] = (planBreakdown[t.plan] || 0) + 1;
            }
        });

        return {
            totalTenants: total,
            activeTenants: active,
            pendingTenants: pending,
            suspendedTenants: suspended,
            deletedTenants: deleted,
            planBreakdown,
        };
    }
}
