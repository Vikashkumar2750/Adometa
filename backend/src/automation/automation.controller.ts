import {
    Controller, Get, Post, Patch, Delete, Body, Param,
    UseGuards, Request, HttpCode, HttpStatus, ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AutomationService } from './automation.service';
import { RuleStatus } from './entities/automation-rule.entity';

function tenantIdOrThrow(req: any): string {
    const id = req.user?.tenantId || req.user?.tenant_id;
    if (!id) throw new ForbiddenException('Automation rules are tenant-specific. Super Admin does not have a tenant context.');
    return id;
}

@ApiTags('Automation')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('automation')
export class AutomationController {
    constructor(private readonly svc: AutomationService) { }

    @Get()
    @ApiOperation({ summary: 'List all automation rules for this tenant' })
    async findAll(@Request() req: any) {
        return this.svc.findAll(tenantIdOrThrow(req));
    }

    @Get('stats')
    @ApiOperation({ summary: 'Automation stats summary' })
    async getStats(@Request() req: any) {
        return this.svc.getStats(tenantIdOrThrow(req));
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get single automation rule' })
    async findOne(@Param('id') id: string, @Request() req: any) {
        return this.svc.findOne(id, tenantIdOrThrow(req));
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create automation rule' })
    async create(@Body() dto: any, @Request() req: any) {
        return this.svc.create(tenantIdOrThrow(req), dto);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update automation rule' })
    async update(@Param('id') id: string, @Body() dto: any, @Request() req: any) {
        return this.svc.update(id, tenantIdOrThrow(req), dto);
    }

    @Post(':id/activate')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Activate a rule (Draft → Active)' })
    async activate(@Param('id') id: string, @Request() req: any) {
        return this.svc.setStatus(id, tenantIdOrThrow(req), 'ACTIVE');
    }

    @Post(':id/pause')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Pause an active rule' })
    async pause(@Param('id') id: string, @Request() req: any) {
        return this.svc.setStatus(id, tenantIdOrThrow(req), 'PAUSED');
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete automation rule' })
    async remove(@Param('id') id: string, @Request() req: any) {
        return this.svc.remove(id, tenantIdOrThrow(req));
    }
}

