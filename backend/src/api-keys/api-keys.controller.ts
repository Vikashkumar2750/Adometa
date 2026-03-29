import {
    Controller, Get, Post, Patch, Delete,
    Body, Param, Req, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ApiKeysService } from './api-keys.service';
import { TenantIsolationGuard } from '../common/guards/tenant-isolation.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('API Keys')
@Controller('api-keys')
@UseGuards(AuthGuard('jwt'), TenantIsolationGuard, RolesGuard)
@Roles('TENANT_ADMIN', 'SUPER_ADMIN')
export class ApiKeysController {
    constructor(private readonly service: ApiKeysService) { }

    @Get()
    @ApiOperation({ summary: 'List all API keys for the tenant' })
    @Roles('TENANT_ADMIN', 'SUPER_ADMIN', 'TENANT_DEVELOPER')
    list(@Req() req: any) {
        return this.service.list(req.user.tenantId || req.tenantId);
    }

    @Post()
    @ApiOperation({ summary: 'Generate a new API key (raw key shown once only)' })
    create(@Req() req: any, @Body() dto: { name: string; scopes?: string[]; expiresIn?: number }) {
        return this.service.create(req.user.tenantId || req.tenantId, dto);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update key name or scopes' })
    update(@Req() req: any, @Param('id') id: string, @Body() dto: { name?: string; scopes?: string[] }) {
        return this.service.update(req.user.tenantId || req.tenantId, id, dto);
    }

    @Post(':id/revoke')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Revoke (deactivate) an API key' })
    revoke(@Req() req: any, @Param('id') id: string) {
        return this.service.revoke(req.user.tenantId || req.tenantId, id);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Permanently delete an API key' })
    remove(@Req() req: any, @Param('id') id: string) {
        return this.service.delete(req.user.tenantId || req.tenantId, id);
    }
}
