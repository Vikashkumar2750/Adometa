import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantsService } from './tenants.service';
import { TenantsController } from './tenants.controller';
import { Tenant, TenantUser } from '../entities/tenant.entities';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { AuditService } from '../audit/audit.service';

@Module({
    imports: [TypeOrmModule.forFeature([Tenant, TenantUser, AuditLog])],
    controllers: [TenantsController],
    providers: [TenantsService, AuditService],
    exports: [TenantsService],
})
export class TenantsModule { }
