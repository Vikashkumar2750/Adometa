import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * TenantContextInterceptor
 * 
 * Injects tenant context into every request
 * Works in conjunction with TenantIsolationGuard
 * 
 * This interceptor:
 * 1. Extracts tenantId from JWT user claims
 * 2. Injects tenantId into request object
 * 3. Makes tenantId available to all downstream services
 * 
 * Apply globally in main.ts:
 * app.useGlobalInterceptors(new TenantContextInterceptor());
 */
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
    private readonly logger = new Logger(TenantContextInterceptor.name);

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (user) {
            // Inject tenant context
            if (user.role !== 'SUPER_ADMIN' && user.tenantId) {
                request.tenantId = user.tenantId;
                this.logger.debug(`Tenant context set: ${user.tenantId}`);
            } else if (user.role === 'SUPER_ADMIN') {
                this.logger.debug('Super Admin request - no tenant context');
            }
        }

        return next.handle();
    }
}

/**
 * Decorator to get tenant ID from request
 * 
 * Usage in controller:
 * async getContacts(@TenantId() tenantId: string) { ... }
 */
export const TenantId = () => {
    return (target: any, propertyKey: string, parameterIndex: number) => {
        const existingParameters = Reflect.getMetadata('custom:tenant_id', target, propertyKey) || [];
        existingParameters.push(parameterIndex);
        Reflect.defineMetadata('custom:tenant_id', existingParameters, target, propertyKey);
    };
};
