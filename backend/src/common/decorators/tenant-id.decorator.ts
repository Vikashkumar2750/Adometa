import { createParamDecorator, ExecutionContext, ForbiddenException } from '@nestjs/common';

/**
 * @TenantId() Decorator
 * 
 * Extracts tenant ID from the request context
 * 
 * Usage in controller:
 * @Get()
 * async getContacts(@TenantId() tenantId: string) {
 *   return this.contactsService.findAll(tenantId);
 * }
 * 
 * For Super Admin (optional tenant):
 * @Get()
 * async getAllContacts(@TenantId({ required: false }) tenantId?: string) {
 *   return this.contactsService.findAll(tenantId);
 * }
 */
export const TenantId = createParamDecorator(
    (data: { required?: boolean } = { required: true }, ctx: ExecutionContext): string | undefined => {
        const request = ctx.switchToHttp().getRequest();
        const user = request.user;

        // Super Admin doesn't have tenantId
        if (user?.role === 'SUPER_ADMIN') {
            if (data.required === false) {
                return undefined;
            }
            // If required, throw error
            throw new ForbiddenException(
                'Super Admin must specify tenant context for this operation'
            );
        }

        const tenantId = request.tenantId || user?.tenantId;

        if (!tenantId && data.required !== false) {
            throw new ForbiddenException('Tenant context required');
        }

        return tenantId;
    },
);
