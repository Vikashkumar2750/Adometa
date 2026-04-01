import { Controller, Get, Post, Body, UseGuards, Param, ParseUUIDPipe, Patch, Delete, Query, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { CreateTenantDto, UpdateTenantDto } from './dto/create-tenant.dto';
import { Tenant, TenantUser } from '../entities/tenant.entities';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AuditService } from '../audit/audit.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@ApiTags('Tenants')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('tenants')
export class TenantsController {
    constructor(
        private readonly tenantsService: TenantsService,
        private readonly auditService: AuditService,
        @InjectRepository(TenantUser)
        private readonly tenantUsersRepo: Repository<TenantUser>,
    ) { }

    @Post()
    @Roles('SUPER_ADMIN')
    @ApiOperation({ summary: 'Create a new tenant - SUPER_ADMIN only' })
    @ApiResponse({ status: 201, description: 'Tenant created successfully.', type: Tenant })
    @ApiResponse({ status: 409, description: 'Tenant with this business name already exists.' })
    async create(@Body() createTenantDto: CreateTenantDto) {
        return this.tenantsService.create(createTenantDto);
    }

    @Get()
    @Roles('SUPER_ADMIN')
    @ApiOperation({ summary: 'List all tenants with pagination and filters - SUPER_ADMIN only' })
    @ApiResponse({ status: 200, description: 'List of all tenants.' })
    @ApiQuery({ name: 'status', required: false, enum: ['PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED', 'REJECTED'] })
    @ApiQuery({ name: 'plan', required: false, enum: ['FREE_TRIAL', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'] })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async findAll(
        @Query('status') status?: string,
        @Query('plan') plan?: string,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
    ) {
        return this.tenantsService.findAll({ status, plan, page, limit });
    }

    // ======================================================
    // IMPORTANT: Specific/static routes MUST be before :id
    // ======================================================

    @Get('platform/stats')
    @Roles('SUPER_ADMIN')
    @ApiOperation({ summary: 'Get platform-wide stats - SUPER_ADMIN only' })
    @ApiResponse({ status: 200, description: 'Platform stats.' })
    async getPlatformStats() {
        return this.tenantsService.getPlatformStats();
    }

    @Get('audit-logs')
    @Roles('SUPER_ADMIN')
    @ApiOperation({ summary: 'Get all platform audit logs - SUPER_ADMIN only' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'tenantId', required: false, type: String })
    @ApiQuery({ name: 'action', required: false, type: String })
    @ApiQuery({ name: 'entityType', required: false, type: String })
    async getAuditLogs(
        @Query('page') page?: number,
        @Query('limit') limit?: number,
        @Query('tenantId') tenantId?: string,
        @Query('action') action?: string,
        @Query('entityType') entityType?: string,
    ) {
        const lim = Math.min(Number(limit) || 50, 100);
        const offset = ((Number(page) || 1) - 1) * lim;
        return this.auditService.findAll({ tenantId, action, entityType, limit: lim, offset });
    }

    @Get(':id/team')
    @Roles('SUPER_ADMIN')
    @ApiOperation({ summary: 'Get all team members of a tenant - SUPER_ADMIN only' })
    async getTenantTeam(@Param('id', new ParseUUIDPipe()) id: string) {
        return this.tenantUsersRepo.find({
            where: { tenant_id: id },
            select: ['id', 'name', 'email', 'role', 'is_active', 'created_at', 'last_login_at'],
            order: { created_at: 'ASC' },
        });
    }

    // ======================================================
    // Dynamic routes (parameterized) MUST be below static ones
    // ======================================================

    @Get(':id')
    @Roles('SUPER_ADMIN')
    @ApiOperation({ summary: 'Get tenant details by ID - SUPER_ADMIN only' })
    @ApiResponse({ status: 200, description: 'Specific tenant details.', type: Tenant })
    @ApiResponse({ status: 404, description: 'Tenant not found.' })
    async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
        return this.tenantsService.findOne(id);
    }

    @Patch(':id')
    @Roles('SUPER_ADMIN')
    @ApiOperation({ summary: 'Update tenant plan/status - SUPER_ADMIN only' })
    @ApiResponse({ status: 200, description: 'Tenant updated successfully.' })
    async update(
        @Param('id', new ParseUUIDPipe()) id: string,
        @Body() updateTenantDto: UpdateTenantDto
    ) {
        return this.tenantsService.update(id, updateTenantDto);
    }

    @Post(':id/approve')
    @Roles('SUPER_ADMIN')
    @ApiOperation({ summary: 'Approve tenant - SUPER_ADMIN only' })
    @ApiResponse({ status: 200, description: 'Tenant approved successfully.' })
    @ApiResponse({ status: 409, description: 'Tenant is already approved.' })
    async approve(
        @Param('id', new ParseUUIDPipe()) id: string,
        @Request() req: any
    ) {
        return this.tenantsService.approve(id, req.user.sub || req.user.id);
    }

    @Post(':id/reject')
    @Roles('SUPER_ADMIN')
    @ApiOperation({ summary: 'Reject tenant - SUPER_ADMIN only' })
    @ApiResponse({ status: 200, description: 'Tenant rejected successfully.' })
    async reject(
        @Param('id', new ParseUUIDPipe()) id: string,
        @Body('reason') reason: string
    ) {
        return this.tenantsService.reject(id, reason);
    }

    @Post(':id/suspend')
    @Roles('SUPER_ADMIN')
    @ApiOperation({ summary: 'Suspend tenant - SUPER_ADMIN only' })
    @ApiResponse({ status: 200, description: 'Tenant suspended successfully.' })
    async suspend(
        @Param('id', new ParseUUIDPipe()) id: string,
        @Body('reason') reason?: string
    ) {
        return this.tenantsService.suspend(id, reason);
    }

    @Post(':id/activate')
    @Roles('SUPER_ADMIN')
    @ApiOperation({ summary: 'Activate tenant - SUPER_ADMIN only' })
    @ApiResponse({ status: 200, description: 'Tenant activated successfully.' })
    async activate(@Param('id', new ParseUUIDPipe()) id: string) {
        return this.tenantsService.activate(id);
    }

    @Delete(':id')
    @Roles('SUPER_ADMIN')
    @ApiOperation({ summary: 'Soft delete tenant - SUPER_ADMIN only' })
    @ApiResponse({ status: 200, description: 'Tenant deleted successfully.' })
    async remove(@Param('id', new ParseUUIDPipe()) id: string) {
        await this.tenantsService.remove(id);
        return { message: 'Tenant deleted successfully' };
    }
}
