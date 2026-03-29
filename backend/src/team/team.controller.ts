import {
    Controller, Get, Post, Patch, Delete, Body, Param,
    Query, Req, Res, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TeamService } from './team.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantIsolationGuard } from '../common/guards/tenant-isolation.guard';

@Controller('team')
@UseGuards(AuthGuard('jwt'), TenantIsolationGuard, RolesGuard)
@Roles('TENANT_ADMIN', 'SUPER_ADMIN')
export class TeamController {
    constructor(private readonly teamService: TeamService) { }

    // ─── Members ──────────────────────────────────────────────────────────────

    @Get('members')
    @Roles('TENANT_ADMIN', 'SUPER_ADMIN', 'TENANT_MARKETER', 'TENANT_DEVELOPER', 'READ_ONLY')
    async getMembers(@Req() req: any) {
        return this.teamService.getMembers(req.user.tenantId || req.tenantId);
    }

    @Post('members')
    async createMember(@Req() req: any, @Body() dto: any) {
        return this.teamService.createMember(req.user.tenantId || req.tenantId, dto);
    }

    @Patch('members/:id')
    async updateMember(
        @Req() req: any,
        @Param('id') id: string,
        @Body() dto: any,
    ) {
        return this.teamService.updateMember(req.user.tenantId || req.tenantId, id, dto);
    }

    @Delete('members/:id')
    @HttpCode(HttpStatus.OK)
    async deleteMember(@Req() req: any, @Param('id') id: string) {
        return this.teamService.deleteMember(req.user.tenantId || req.tenantId, id);
    }

    @Post('members/:id/reset-password')
    @HttpCode(HttpStatus.OK)
    async resetPassword(
        @Req() req: any,
        @Param('id') id: string,
        @Body('password') password: string,
    ) {
        return this.teamService.resetPassword(req.user.tenantId || req.tenantId, id, password);
    }

    // ─── Activity Logs ────────────────────────────────────────────────────────

    @Get('activity')
    @Roles('TENANT_ADMIN', 'SUPER_ADMIN')
    async getActivity(
        @Req() req: any,
        @Query('period') period: any = 'monthly',
        @Query('userId') userId?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.teamService.getActivityLogs(req.user.tenantId || req.tenantId, {
            period,
            userId,
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 50,
        });
    }

    // ─── CSV Report Download ──────────────────────────────────────────────────

    @Get('activity/report')
    @Roles('TENANT_ADMIN', 'SUPER_ADMIN')
    async downloadReport(
        @Req() req: any,
        @Res() res: any,
        @Query('period') period: any = 'monthly',
    ) {
        const tenantId = req.user.tenantId || req.tenantId;
        const csv = await this.teamService.generateActivityCsv(tenantId, period);
        const filename = `team-activity-${period}-${new Date().toISOString().split('T')[0]}.csv`;
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send('\uFEFF' + csv);
    }
}
