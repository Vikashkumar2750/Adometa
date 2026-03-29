import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
    UseGuards,
    Req,
    Res,
    UnauthorizedException,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import { CampaignsService } from './campaigns.service';
import {
    CreateCampaignDto,
    UpdateCampaignDto,
    CampaignResponseDto,
    CampaignStatsDto,
    PaginatedCampaignsResponseDto,
} from './dto/campaign.dto';
import { CampaignStatus } from './entities/campaign.entity';
import { PlanGuard, RequiredPlan } from '../common/guards/plan.guard';

@ApiTags('Campaigns')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('campaigns')
export class CampaignsController {
    constructor(private readonly campaignsService: CampaignsService) { }

    private getTenantId(req: any): string {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            throw new UnauthorizedException('Tenant ID required. Only tenant users can access campaigns.');
        }
        return tenantId;
    }

    /**
     * Create a new campaign — requires at least STARTER plan
     */
    @Post()
    @UseGuards(PlanGuard)
    @RequiredPlan('STARTER')
    @ApiOperation({ summary: 'Create a new campaign (STARTER+ plan required)' })
    @ApiResponse({ status: 201, description: 'Campaign created', type: CampaignResponseDto })
    @ApiResponse({ status: 403, description: 'Plan upgrade required' })
    async create(@Req() req: any, @Body() createDto: CreateCampaignDto): Promise<CampaignResponseDto> {
        const tenantId = this.getTenantId(req);
        return this.campaignsService.create(tenantId, createDto);
    }

    /**
     * Get all campaigns with pagination and filters
     */
    @Get()
    @ApiOperation({ summary: 'Get all campaigns (paginated)' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'search', required: false, type: String })
    @ApiQuery({ name: 'status', required: false, enum: CampaignStatus })
    @ApiResponse({ status: 200, description: 'Campaigns list', type: PaginatedCampaignsResponseDto })
    async findAll(
        @Req() req: any,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('search') search?: string,
        @Query('status') status?: CampaignStatus,
    ): Promise<PaginatedCampaignsResponseDto> {
        const tenantId = this.getTenantId(req);
        const pageNum = page ? parseInt(page, 10) : 1;
        const limitNum = limit ? parseInt(limit, 10) : 10;
        return this.campaignsService.findAll(tenantId, pageNum, limitNum, search, status);
    }

    /**
     * Get campaign statistics
     */
    @Get('statistics')
    @ApiOperation({ summary: 'Get campaign statistics' })
    @ApiResponse({ status: 200, description: 'Campaign stats', type: CampaignStatsDto })
    async getStatistics(@Req() req: any): Promise<CampaignStatsDto> {
        const tenantId = this.getTenantId(req);
        return this.campaignsService.getStatistics(tenantId);
    }

    /**
     * Get campaign by ID
     */
    @Get(':id')
    @ApiOperation({ summary: 'Get campaign by ID' })
    @ApiResponse({ status: 200, description: 'Campaign found', type: CampaignResponseDto })
    @ApiResponse({ status: 404, description: 'Campaign not found' })
    async findOne(@Req() req: any, @Param('id') id: string): Promise<CampaignResponseDto> {
        const tenantId = this.getTenantId(req);
        return this.campaignsService.findOne(id, tenantId);
    }

    /**
     * Update campaign
     */
    @Patch(':id')
    @ApiOperation({ summary: 'Update campaign' })
    @ApiResponse({ status: 200, description: 'Campaign updated', type: CampaignResponseDto })
    async update(
        @Req() req: any,
        @Param('id') id: string,
        @Body() updateDto: UpdateCampaignDto,
    ): Promise<CampaignResponseDto> {
        const tenantId = this.getTenantId(req);
        return this.campaignsService.update(id, tenantId, updateDto);
    }

    /**
     * Delete campaign
     */
    @Delete(':id')
    @ApiOperation({ summary: 'Delete campaign' })
    @ApiResponse({ status: 200, description: 'Campaign deleted' })
    async remove(@Req() req: any, @Param('id') id: string): Promise<{ message: string }> {
        const tenantId = this.getTenantId(req);
        await this.campaignsService.remove(id, tenantId);
        return { message: 'Campaign deleted successfully' };
    }

    /**
     * Start a campaign — requires at least STARTER plan
     */
    @Post(':id/start')
    @UseGuards(PlanGuard)
    @RequiredPlan('STARTER')
    @ApiOperation({ summary: 'Start a campaign (STARTER+ plan required)' })
    @ApiResponse({ status: 200, description: 'Campaign started', type: CampaignResponseDto })
    @ApiResponse({ status: 403, description: 'Plan upgrade required' })
    async start(@Req() req: any, @Param('id') id: string): Promise<CampaignResponseDto> {
        const tenantId = this.getTenantId(req);
        return this.campaignsService.start(id, tenantId);
    }

    /**
     * Pause a running campaign
     */
    @Post(':id/pause')
    @ApiOperation({ summary: 'Pause a running campaign' })
    @ApiResponse({ status: 200, description: 'Campaign paused', type: CampaignResponseDto })
    async pause(@Req() req: any, @Param('id') id: string): Promise<CampaignResponseDto> {
        const tenantId = this.getTenantId(req);
        return this.campaignsService.pause(id, tenantId);
    }

    /**
     * Resume a paused campaign
     */
    @Post(':id/resume')
    @ApiOperation({ summary: 'Resume a paused campaign' })
    @ApiResponse({ status: 200, description: 'Campaign resumed', type: CampaignResponseDto })
    async resume(@Req() req: any, @Param('id') id: string): Promise<CampaignResponseDto> {
        const tenantId = this.getTenantId(req);
        return this.campaignsService.resume(id, tenantId);
    }

    /**
     * Test campaign with sample contacts
     */
    @Post(':id/test')
    @ApiOperation({ summary: 'Test campaign with sample contacts' })
    @ApiResponse({ status: 200, description: 'Test result' })
    async test(
        @Req() req: any,
        @Param('id') id: string,
        @Body() body: { phoneNumbers: string[] },
    ): Promise<any> {
        const tenantId = this.getTenantId(req);
        return this.campaignsService.test(id, tenantId, body.phoneNumbers);
    }

    /**
     * Download campaign performance report as CSV
     * period: daily | weekly | monthly | quarterly | halfyearly | yearly
     */
    @Get('analytics/report')
    @ApiOperation({ summary: 'Download campaign analytics CSV report' })
    async downloadReport(
        @Req() req: any,
        @Res() res: any,
        @Query('period') period: string = 'monthly',
    ) {
        const tenantId = this.getTenantId(req);
        const csv = await this.campaignsService.generateAnalyticsCsv(tenantId, period);
        const filename = `campaign-analytics-${period}-${new Date().toISOString().split('T')[0]}.csv`;
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send('\uFEFF' + csv);
    }
}
