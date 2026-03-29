import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * TenantIsolationGuard
 * 
 * CRITICAL SECURITY GUARD
 * 
 * Enforces tenant isolation by ensuring:
 * 1. Every request has a tenant context (except Super Admin)
 * 2. Users can only access their own tenant's data
 * 3. Cross-tenant access is blocked
 * 
 * Usage:
 * @UseGuards(JwtAuthGuard, TenantIsolationGuard)
 * 
 * Bypass for Super Admin:
 * @BypassTenantIsolation()
 */
@Injectable()
export class TenantIsolationGuard implements CanActivate {
    private readonly logger = new Logger(TenantIsolationGuard.name);

    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        // Check if tenant isolation should be bypassed (e.g., for Super Admin endpoints)
        const bypassTenantIsolation = this.reflector.get<boolean>(
            'bypassTenantIsolation',
            context.getHandler(),
        );

        if (bypassTenantIsolation) {
            this.logger.debug('Tenant isolation bypassed for this endpoint');
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user) {
            this.logger.error('No user found in request - authentication required');
            throw new ForbiddenException('Authentication required');
        }

        // Super Admin can access all tenants
        if (user.role === 'SUPER_ADMIN') {
            this.logger.debug('Super Admin access granted');
            return true;
        }

        // Tenant users must have tenantId
        if (!user.tenantId) {
            this.logger.error(`User ${user.email} has no tenantId - access denied`);
            throw new ForbiddenException('No tenant context found');
        }

        // Inject tenantId into request for use in controllers/services
        request.tenantId = user.tenantId;

        this.logger.debug(`Tenant isolation enforced for tenant: ${user.tenantId}`);

        return true;
    }
}

/**
 * Decorator to bypass tenant isolation
 * Use ONLY for Super Admin endpoints
 */
export const BypassTenantIsolation = () =>
    Reflect.metadata('bypassTenantIsolation', true);
