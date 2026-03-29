import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AuditService } from './audit.service';

/**
 * AuditInterceptor
 * 
 * Automatically logs all HTTP requests and responses
 * Applied globally or to specific controllers
 * 
 * Logs:
 * - User actions (CREATE, UPDATE, DELETE)
 * - Request metadata (IP, user agent, method, endpoint)
 * - Response status codes
 * - Errors
 * 
 * Does NOT log:
 * - Sensitive data (tokens, passwords, etc.)
 * - GET requests (too noisy, use for specific endpoints if needed)
 * - Health check endpoints
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
    private readonly logger = new Logger(AuditInterceptor.name);

    // Endpoints to skip logging (health checks, etc.)
    private readonly SKIP_ENDPOINTS = [
        '/api/health',
        '/api/metrics',
        '/api',
    ];

    // Methods to skip logging (GET is too noisy)
    private readonly SKIP_METHODS = ['GET', 'OPTIONS', 'HEAD'];

    constructor(private readonly auditService: AuditService) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();

        // Skip if endpoint or method should not be logged
        if (this.shouldSkip(request)) {
            return next.handle();
        }

        const user = request.user;
        const tenantId = request.tenantId || user?.tenantId || null;
        const startTime = Date.now();

        return next.handle().pipe(
            tap(async (data) => {
                // Log successful request
                try {
                    await this.logRequest({
                        request,
                        response,
                        user,
                        tenantId,
                        statusCode: response.statusCode,
                        duration: Date.now() - startTime,
                        data,
                    });
                } catch (error) {
                    this.logger.error(`Failed to log audit: ${error.message}`);
                }
            }),
            catchError(async (error) => {
                // Log failed request
                try {
                    await this.logRequest({
                        request,
                        response,
                        user,
                        tenantId,
                        statusCode: error.status || 500,
                        duration: Date.now() - startTime,
                        error: error.message,
                    });
                } catch (logError) {
                    this.logger.error(`Failed to log audit error: ${logError.message}`);
                }
                throw error;
            }),
        );
    }

    /**
     * Check if request should be skipped
     */
    private shouldSkip(request: any): boolean {
        const endpoint = request.url;
        const method = request.method;

        // Skip specific endpoints
        if (this.SKIP_ENDPOINTS.some((skip) => endpoint === skip)) {
            return true;
        }

        // Skip specific methods
        if (this.SKIP_METHODS.includes(method)) {
            return true;
        }

        return false;
    }

    /**
     * Log the request
     */
    private async logRequest(params: {
        request: any;
        response: any;
        user: any;
        tenantId: string | null;
        statusCode: number;
        duration: number;
        data?: any;
        error?: string;
    }): Promise<void> {
        const { request, user, tenantId, statusCode, data, error } = params;

        if (!user) {
            // Skip logging for unauthenticated requests
            return;
        }

        const action = this.getActionFromMethod(request.method);
        const entityType = this.getEntityTypeFromUrl(request.url);
        const entityId = this.getEntityIdFromUrl(request.url);

        await this.auditService.log({
            tenantId,
            userId: user.userId || user.sub || null,
            userEmail: user.email,
            userRole: user.role,
            action,
            entityType,
            entityId,
            changes: this.extractChanges(request, data),
            metadata: {
                duration: params.duration,
                error: error || null,
            },
            ipAddress: this.getIpAddress(request) ?? '127.0.0.1',
            userAgent: request.headers['user-agent'] || null,
            method: request.method,
            endpoint: request.url,
            statusCode,
        });
    }

    /**
     * Map HTTP method to action
     */
    private getActionFromMethod(method: string): string {
        const methodMap: Record<string, string> = {
            POST: 'CREATE',
            PUT: 'UPDATE',
            PATCH: 'UPDATE',
            DELETE: 'DELETE',
            GET: 'READ',
        };

        return methodMap[method] || 'UNKNOWN';
    }

    /**
     * Extract entity type from URL
     */
    private getEntityTypeFromUrl(url: string): string {
        // Remove query params
        const path = url.split('?')[0];

        // Extract entity from path (e.g., /api/contacts -> Contact)
        const parts = path.split('/').filter(Boolean);

        if (parts.length >= 2) {
            const entity = parts[1]; // After /api/
            return this.capitalize(entity.replace(/-/g, ' '));
        }

        return 'Unknown';
    }

    /**
     * Extract entity ID from URL
     */
    private getEntityIdFromUrl(url: string): string | null {
        // Remove query params
        const path = url.split('?')[0];

        // Extract UUID from path
        const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
        const match = path.match(uuidRegex);

        return match ? match[0] : null;
    }

    /**
     * Extract changes from request and response
     */
    private extractChanges(request: any, data: any): Record<string, any> | null {
        const changes: Record<string, any> = {};

        // For POST/PUT/PATCH, include request body
        if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
            if (request.body && Object.keys(request.body).length > 0) {
                changes.input = request.body;
            }
        }

        // For successful responses, include relevant data
        if (data && typeof data === 'object') {
            // Only include ID and status for brevity
            if (data.id) changes.id = data.id;
            if (data.status) changes.status = data.status;
        }

        return Object.keys(changes).length > 0 ? changes : null;
    }

    /**
     * Get IP address from request
     */
    private getIpAddress(request: any): string | null {
        const ip = (
            request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
            request.headers['x-real-ip'] ||
            request.connection?.remoteAddress ||
            request.socket?.remoteAddress ||
            null
        );
        // Return null if it's an empty string, 'Unknown', or ::ffff: loopback variants
        if (!ip || ip === '::1' || ip === '::ffff:127.0.0.1') return '127.0.0.1';
        return ip;
    }

    /**
     * Capitalize first letter
     */
    private capitalize(str: string): string {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}
