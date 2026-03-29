import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

/**
 * AuditService
 * 
 * Handles all audit logging operations
 * CRITICAL: Never log sensitive data (tokens, passwords, credit cards, etc.)
 * 
 * Usage:
 * await this.auditService.log({
 *   tenantId: 'uuid',
 *   userId: 'uuid',
 *   userEmail: 'user@example.com',
 *   userRole: 'TENANT_ADMIN',
 *   action: 'CREATE',
 *   entityType: 'Contact',
 *   entityId: 'uuid',
 *   changes: { name: 'John Doe' },
 *   ipAddress: '192.168.1.1',
 *   userAgent: 'Mozilla/5.0...',
 *   method: 'POST',
 *   endpoint: '/api/contacts',
 *   statusCode: 201
 * });
 */
@Injectable()
export class AuditService {
    private readonly logger = new Logger(AuditService.name);

    // Sensitive fields that should NEVER be logged
    private readonly SENSITIVE_FIELDS = [
        'password',
        'password_hash',
        'token',
        'access_token',
        'refresh_token',
        'secret',
        'api_key',
        'private_key',
        'credit_card',
        'cvv',
        'ssn',
        'authorization',
    ];

    constructor(
        @InjectRepository(AuditLog)
        private auditLogRepository: Repository<AuditLog>,
    ) { }

    // Sentinel UUID for super admin actions (DB enforces NOT NULL on tenant_id)
    private readonly SYSTEM_TENANT_ID = '00000000-0000-0000-0000-000000000001';

    /**
     * Log an audit event
     */
    async log(data: {
        tenantId?: string | null;
        userId?: string | null;
        userEmail: string;
        userRole: string;
        action: string;
        entityType: string;
        entityId?: string | null;
        changes?: Record<string, any> | null;
        metadata?: Record<string, any> | null;
        ipAddress: string;
        userAgent: string;
        method: string;
        endpoint: string;
        statusCode?: number;
    }): Promise<void> {
        try {
            // Store extended fields in metadata since DB schema uses a simpler structure
            const combinedMetadata = this.sanitizeData({
                userEmail: data.userEmail,
                userRole: data.userRole,
                method: data.method,
                endpoint: data.endpoint,
                statusCode: data.statusCode,
                changes: data.changes ? this.sanitizeData(data.changes) : null,
                ...(data.metadata ? this.sanitizeData(data.metadata) : {}),
            });

            const auditLog = this.auditLogRepository.create({
                // Use sentinel UUID when no tenant context (super admin actions).
                // DB column tenant_id has NOT NULL constraint.
                tenant_id: data.tenantId || this.SYSTEM_TENANT_ID,
                user_id: data.userId || null,
                action: data.action,
                resource_type: data.entityType || null,
                resource_id: data.entityId || null,
                metadata: combinedMetadata,
                ip_address: data.ipAddress || null,
                user_agent: data.userAgent || null,
            });

            await this.auditLogRepository.save(auditLog);

            this.logger.debug(
                `Audit: ${data.action} ${data.entityType} by ${data.userEmail}`
            );
        } catch (error) {
            // CRITICAL: Never let audit logging break the application
            this.logger.error(`Failed to create audit log: ${error.message}`);
        }
    }

    /**
     * Log authentication events
     */
    async logAuth(data: {
        userId?: string | null;
        userEmail: string;
        userRole: string;
        action: 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED' | 'TOKEN_REFRESH';
        ipAddress: string;
        userAgent: string;
        metadata?: Record<string, any>;
    }): Promise<void> {
        await this.log({
            tenantId: null, // Auth events are not tenant-specific
            userId: data.userId,
            userEmail: data.userEmail,
            userRole: data.userRole,
            action: data.action,
            entityType: 'Authentication',
            metadata: data.metadata,
            ipAddress: data.ipAddress,
            userAgent: data.userAgent,
            method: 'POST',
            endpoint: '/api/auth/login',
        });
    }

    /**
     * Query audit logs for a tenant
     */
    async findForTenant(
        tenantId: string,
        options?: {
            userId?: string;
            action?: string;
            entityType?: string;
            startDate?: Date;
            endDate?: Date;
            limit?: number;
            offset?: number;
        }
    ): Promise<{ data: AuditLog[]; total: number }> {
        const queryBuilder = this.auditLogRepository
            .createQueryBuilder('audit')
            .where('audit.tenant_id = :tenantId', { tenantId });

        if (options?.userId) {
            queryBuilder.andWhere('audit.user_id = :userId', { userId: options.userId });
        }

        if (options?.action) {
            queryBuilder.andWhere('audit.action = :action', { action: options.action });
        }

        if (options?.entityType) {
            queryBuilder.andWhere('audit.resource_type = :resourceType', { resourceType: options.entityType });
        }

        if (options?.startDate) {
            queryBuilder.andWhere('audit.created_at >= :startDate', { startDate: options.startDate });
        }

        if (options?.endDate) {
            queryBuilder.andWhere('audit.created_at <= :endDate', { endDate: options.endDate });
        }

        queryBuilder.orderBy('audit.created_at', 'DESC');

        if (options?.limit) queryBuilder.take(options.limit);
        if (options?.offset) queryBuilder.skip(options.offset);

        const [data, total] = await queryBuilder.getManyAndCount();
        return { data, total };
    }

    /**
     * Query audit logs for Super Admin (all tenants)
     */
    async findAll(options?: {
        tenantId?: string;
        userId?: string;
        action?: string;
        entityType?: string;
        startDate?: Date;
        endDate?: Date;
        limit?: number;
        offset?: number;
    }): Promise<{ data: AuditLog[]; total: number }> {
        const queryBuilder = this.auditLogRepository.createQueryBuilder('audit');

        if (options?.tenantId) {
            queryBuilder.where('audit.tenant_id = :tenantId', { tenantId: options.tenantId });
        }
        if (options?.userId) {
            queryBuilder.andWhere('audit.user_id = :userId', { userId: options.userId });
        }
        if (options?.action) {
            queryBuilder.andWhere('audit.action = :action', { action: options.action });
        }
        if (options?.entityType) {
            queryBuilder.andWhere('audit.resource_type = :resourceType', { resourceType: options.entityType });
        }
        if (options?.startDate) {
            queryBuilder.andWhere('audit.created_at >= :startDate', { startDate: options.startDate });
        }
        if (options?.endDate) {
            queryBuilder.andWhere('audit.created_at <= :endDate', { endDate: options.endDate });
        }

        queryBuilder.orderBy('audit.created_at', 'DESC');
        if (options?.limit) queryBuilder.take(options.limit);
        if (options?.offset) queryBuilder.skip(options.offset);

        const [data, total] = await queryBuilder.getManyAndCount();
        return { data, total };
    }

    /**
     * Sanitize data to remove sensitive fields
     */
    private sanitizeData(data: any): any {
        if (!data || typeof data !== 'object') {
            return data;
        }

        if (Array.isArray(data)) {
            return data.map((item) => this.sanitizeData(item));
        }

        const sanitized: any = {};

        for (const [key, value] of Object.entries(data)) {
            const lowerKey = key.toLowerCase();

            // Check if field is sensitive
            if (this.SENSITIVE_FIELDS.some((field) => lowerKey.includes(field))) {
                sanitized[key] = '[REDACTED]';
            } else if (typeof value === 'object' && value !== null) {
                sanitized[key] = this.sanitizeData(value);
            } else {
                sanitized[key] = value;
            }
        }

        return sanitized;
    }
}
