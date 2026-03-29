import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SuperAdmin } from '../entities/super-admin.entity';
import { TenantUser } from '../entities/tenant.entities';

export interface NormalizedUser {
    id: string;
    email: string;
    name: string;
    password_hash: string;
    role: string;
    tenant_id?: string; // Optional (undefined for SuperAdmin)
}

@Injectable()
export class UsersService {
    private readonly logger = new Logger(UsersService.name);

    constructor(
        @InjectRepository(SuperAdmin)
        private superAdminRepo: Repository<SuperAdmin>,
        @InjectRepository(TenantUser)
        private tenantUserRepo: Repository<TenantUser>,
    ) { }

    /**
     * Find user by email across SuperAdmins and TenantUsers tables.
     * Priority: SuperAdmin > TenantUser.
     */
    async findByEmail(email: string): Promise<NormalizedUser | null> {
        // 1. Check SuperAdmin
        const superAdmin = await this.superAdminRepo.findOneBy({ email });
        if (superAdmin) {
            if (!superAdmin.is_active) return null; // Or throw exception? Let AuthGuard handle it.
            return {
                id: superAdmin.id,
                email: superAdmin.email,
                name: superAdmin.name,
                password_hash: superAdmin.password_hash,
                role: superAdmin.role,
                // No tenant_id
            };
        }

        // 2. Check TenantUser
        const tenantUser = await this.tenantUserRepo.findOneBy({ email });
        if (tenantUser) {
            if (!tenantUser.is_active) return null;
            return {
                id: tenantUser.id,
                email: tenantUser.email,
                name: tenantUser.name,
                password_hash: tenantUser.password_hash,
                role: tenantUser.role,
                tenant_id: tenantUser.tenant_id
            };
        }

        return null;
    }

    /**
     * Find user by ID (for JWT validation if needed)
     * This is tricky without knowing table.
     * But JWT payload usually contains ID and Role.
     * We can use Role to decide which table to look up.
     */
    async findById(id: string, role: string): Promise<NormalizedUser | null> {
        if (role === 'SUPER_ADMIN' || role === 'SUPPORT_ADMIN') {
            const admin = await this.superAdminRepo.findOneBy({ id });
            return admin ? { ...admin, tenant_id: undefined } : null;
        } else {
            const user = await this.tenantUserRepo.findOneBy({ id });
            return user ? { ...user, tenant_id: user.tenant_id } : null;
        }
    }
}
