import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
    private readonly logger = new Logger(RolesGuard.name);

    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        // Get required roles from decorator
        const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        // If no roles specified, allow access
        if (!requiredRoles || requiredRoles.length === 0) {
            return true;
        }

        // Get user from request (set by JWT strategy)
        const { user } = context.switchToHttp().getRequest();

        if (!user) {
            this.logger.warn('RolesGuard: No user found in request');
            throw new ForbiddenException('User not authenticated');
        }

        // Check if user has required role
        const hasRole = requiredRoles.some((role) => user.role === role);

        if (!hasRole) {
            this.logger.warn(
                `RolesGuard: User ${user.email} (${user.role}) attempted to access endpoint requiring roles: ${requiredRoles.join(', ')}`
            );
            throw new ForbiddenException(
                `Access denied. Required roles: ${requiredRoles.join(', ')}`
            );
        }

        this.logger.debug(`RolesGuard: User ${user.email} (${user.role}) granted access`);
        return true;
    }
}
