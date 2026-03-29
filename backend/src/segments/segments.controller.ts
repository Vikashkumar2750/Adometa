import {
    Controller, Get, Post, Patch, Delete, Body, Param, Query,
    UseGuards, ParseIntPipe, Req, ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';
import { SegmentsService } from './segments.service';
import { CreateSegmentDto, ImportContactsDto } from './dto/segment.dto';
import { TenantIsolationGuard } from '../common/guards/tenant-isolation.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';

/**
 * Resolves tenantId from either:
 *  1. JWT payload (for TENANT_ADMIN / tenant users)
 *  2. x-tenant-id header (for SUPER_ADMIN acting on behalf of a tenant)
 */
function resolveTenant(tenantIdFromJwt: string | undefined, req: any): string {
    if (tenantIdFromJwt) return tenantIdFromJwt;

    const headerTenantId = req.headers?.['x-tenant-id'];
    if (headerTenantId) return headerTenantId as string;

    const userTenantId = req.user?.tenantId;
    if (userTenantId) return userTenantId;

    throw new ForbiddenException(
        'Tenant context required. Include x-tenant-id header or use a tenant account.',
    );
}

@ApiTags('Segments')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), TenantIsolationGuard)
@Controller('segments')
export class SegmentsController {
    constructor(private readonly segmentsService: SegmentsService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new segment' })
    async create(
        @TenantId({ required: false }) tenantId: string,
        @Req() req: any,
        @Body() dto: CreateSegmentDto,
    ) {
        return this.segmentsService.create(resolveTenant(tenantId, req), dto);
    }

    @Get()
    @ApiOperation({ summary: 'List all segments for tenant' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'search', required: false, type: String })
    @ApiQuery({ name: 'activeOnly', required: false, type: Boolean })
    async findAll(
        @TenantId({ required: false }) tenantId: string,
        @Req() req: any,
        @Query('page', new ParseIntPipe({ optional: true })) page?: number,
        @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
        @Query('search') search?: string,
        @Query('activeOnly') activeOnly?: string,
    ) {
        return this.segmentsService.findAll(
            resolveTenant(tenantId, req), page, limit, search, activeOnly === 'true',
        );
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get segment by ID' })
    async findOne(
        @TenantId({ required: false }) tenantId: string,
        @Req() req: any,
        @Param('id') id: string,
    ) {
        return this.segmentsService.findOne(id, resolveTenant(tenantId, req));
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update segment metadata' })
    async update(
        @TenantId({ required: false }) tenantId: string,
        @Req() req: any,
        @Param('id') id: string,
        @Body() dto: Partial<CreateSegmentDto>,
    ) {
        return this.segmentsService.update(id, resolveTenant(tenantId, req), dto);
    }

    @Post(':id/toggle')
    @ApiOperation({ summary: 'Toggle segment active/inactive' })
    async toggle(
        @TenantId({ required: false }) tenantId: string,
        @Req() req: any,
        @Param('id') id: string,
    ) {
        return this.segmentsService.toggleActive(id, resolveTenant(tenantId, req));
    }

    @Post(':id/import')
    @ApiOperation({ summary: 'Import contacts into segment (auto-deduplicates by phone)' })
    async importContacts(
        @TenantId({ required: false }) tenantId: string,
        @Req() req: any,
        @Param('id') id: string,
        @Body() dto: ImportContactsDto,
    ) {
        return this.segmentsService.importContacts(id, resolveTenant(tenantId, req), dto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete segment (soft delete)' })
    async remove(
        @TenantId({ required: false }) tenantId: string,
        @Req() req: any,
        @Param('id') id: string,
    ) {
        await this.segmentsService.remove(id, resolveTenant(tenantId, req));
        return { message: 'Segment deleted' };
    }
}
