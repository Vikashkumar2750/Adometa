import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Campaign, CampaignStatus } from './entities/campaign.entity';
import { CampaignRepository } from './repositories/campaign.repository';
import {
    CreateCampaignDto,
    UpdateCampaignDto,
    CampaignResponseDto,
    CampaignStatsDto,
    PaginatedCampaignsResponseDto,
} from './dto/campaign.dto';

@Injectable()
export class CampaignsService {
    constructor(
        private campaignRepository: CampaignRepository,
    ) { }

    /**
     * Create a new campaign
     */
    async create(tenantId: string, createDto: CreateCampaignDto): Promise<CampaignResponseDto> {
        // TODO: Validate template exists
        // TODO: Validate segment exists if provided
        // TODO: Get contact count from segment or contactIds

        const campaign = this.campaignRepository.create({
            tenantId,
            name: createDto.name,
            description: createDto.description,
            templateId: createDto.templateId,
            segmentId: createDto.segmentId,
            contactIds: createDto.contactIds,
            scheduledAt: createDto.scheduledAt ? new Date(createDto.scheduledAt) : undefined,
            variables: createDto.variables,
            status: createDto.scheduledAt ? CampaignStatus.SCHEDULED : CampaignStatus.DRAFT,
            totalRecipients: createDto.contactIds?.length || 0, // TODO: Get from segment
        });

        const saved = await this.campaignRepository.save(campaign);
        return this.toResponseDto(saved);
    }

    /**
     * Get all campaigns for tenant with pagination
     */
    async findAll(
        tenantId: string,
        page: number = 1,
        limit: number = 10,
        search?: string,
        status?: CampaignStatus,
    ): Promise<PaginatedCampaignsResponseDto> {
        try {
            const [campaigns, total] = await this.campaignRepository.findByTenant(
                tenantId,
                page,
                limit,
                search,
                status,
            );

            return {
                data: campaigns.map((c) => this.toResponseDto(c)),
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            };
        } catch (error) {
            console.error('Error in findAll:', error);
            throw error;
        }
    }

    /**
     * Get campaign by ID
     */
    async findOne(id: string, tenantId: string): Promise<CampaignResponseDto> {
        const campaign = await this.campaignRepository.findByIdAndTenant(id, tenantId);

        if (!campaign) {
            throw new NotFoundException(`Campaign with ID ${id} not found`);
        }

        return this.toResponseDto(campaign);
    }

    /**
     * Update campaign
     */
    async update(
        id: string,
        tenantId: string,
        updateDto: UpdateCampaignDto,
    ): Promise<CampaignResponseDto> {
        const campaign = await this.campaignRepository.findByIdAndTenant(id, tenantId);

        if (!campaign) {
            throw new NotFoundException(`Campaign with ID ${id} not found`);
        }

        // Only allow updates to draft or scheduled campaigns
        if (![CampaignStatus.DRAFT, CampaignStatus.SCHEDULED].includes(campaign.status)) {
            throw new BadRequestException('Cannot update a campaign that is running or completed');
        }

        Object.assign(campaign, updateDto);

        if (updateDto.scheduledAt) {
            campaign.scheduledAt = new Date(updateDto.scheduledAt);
        }

        const updated = await this.campaignRepository.save(campaign);
        return this.toResponseDto(updated);
    }

    /**
     * Delete campaign (soft delete)
     */
    async remove(id: string, tenantId: string): Promise<void> {
        const campaign = await this.campaignRepository.findByIdAndTenant(id, tenantId);

        if (!campaign) {
            throw new NotFoundException(`Campaign with ID ${id} not found`);
        }

        // Only allow deletion of draft or failed campaigns
        if (![CampaignStatus.DRAFT, CampaignStatus.FAILED].includes(campaign.status)) {
            throw new BadRequestException('Can only delete draft or failed campaigns');
        }

        await this.campaignRepository.softDelete(id);
    }

    /**
     * Start a campaign
     */
    async start(id: string, tenantId: string): Promise<CampaignResponseDto> {
        const campaign = await this.campaignRepository.findByIdAndTenant(id, tenantId);

        if (!campaign) {
            throw new NotFoundException(`Campaign with ID ${id} not found`);
        }

        if (![CampaignStatus.DRAFT, CampaignStatus.SCHEDULED].includes(campaign.status)) {
            throw new BadRequestException('Campaign is not in a startable state');
        }

        await this.campaignRepository.updateStatus(id, CampaignStatus.RUNNING, {
            startedAt: new Date(),
        });

        // TODO: Queue campaign for processing
        // TODO: Start sending messages

        const updated = await this.campaignRepository.findByIdAndTenant(id, tenantId);
        if (!updated) {
            throw new NotFoundException(`Campaign with ID ${id} not found`);
        }
        return this.toResponseDto(updated);
    }

    /**
     * Pause a running campaign
     */
    async pause(id: string, tenantId: string): Promise<CampaignResponseDto> {
        const campaign = await this.campaignRepository.findByIdAndTenant(id, tenantId);

        if (!campaign) {
            throw new NotFoundException(`Campaign with ID ${id} not found`);
        }

        if (campaign.status !== CampaignStatus.RUNNING) {
            throw new BadRequestException('Can only pause running campaigns');
        }

        await this.campaignRepository.updateStatus(id, CampaignStatus.PAUSED);

        // TODO: Stop processing queue

        const updated = await this.campaignRepository.findByIdAndTenant(id, tenantId);
        if (!updated) {
            throw new NotFoundException(`Campaign with ID ${id} not found`);
        }
        return this.toResponseDto(updated);
    }

    /**
     * Resume a paused campaign
     */
    async resume(id: string, tenantId: string): Promise<CampaignResponseDto> {
        const campaign = await this.campaignRepository.findByIdAndTenant(id, tenantId);

        if (!campaign) {
            throw new NotFoundException(`Campaign with ID ${id} not found`);
        }

        if (campaign.status !== CampaignStatus.PAUSED) {
            throw new BadRequestException('Can only resume paused campaigns');
        }

        await this.campaignRepository.updateStatus(id, CampaignStatus.RUNNING);

        // TODO: Resume processing queue

        const updated = await this.campaignRepository.findByIdAndTenant(id, tenantId);
        if (!updated) {
            throw new NotFoundException(`Campaign with ID ${id} not found`);
        }
        return this.toResponseDto(updated);
    }

    /**
     * Get campaign statistics
     */
    async getStatistics(tenantId: string): Promise<CampaignStatsDto> {
        return this.campaignRepository.getStatsByTenant(tenantId);
    }

    /**
     * Test campaign with sample contacts
     */
    async test(id: string, tenantId: string, phoneNumbers: string[]): Promise<any> {
        const campaign = await this.campaignRepository.findByIdAndTenant(id, tenantId);

        if (!campaign) {
            throw new NotFoundException(`Campaign with ID ${id} not found`);
        }

        // TODO: Send test messages to provided phone numbers
        // TODO: Use template and variables

        return {
            success: true,
            message: `Test messages sent to ${phoneNumbers.length} numbers`,
            phoneNumbers,
        };
    }

    /**
     * Convert entity to response DTO
     */
    private toResponseDto(campaign: Campaign): CampaignResponseDto {
        return {
            id: campaign.id,
            name: campaign.name,
            description: campaign.description,
            templateId: campaign.templateId,
            templateName: campaign.templateName,
            segmentId: campaign.segmentId,
            segmentName: campaign.segmentName,
            status: campaign.status,
            scheduledAt: campaign.scheduledAt,
            startedAt: campaign.startedAt,
            completedAt: campaign.completedAt,
            totalRecipients: campaign.totalRecipients,
            sentCount: campaign.sentCount,
            deliveredCount: campaign.deliveredCount,
            readCount: campaign.readCount,
            failedCount: campaign.failedCount,
            ctaCount: (campaign as any).ctaCount ?? 0,
            createdAt: campaign.createdAt,
            updatedAt: campaign.updatedAt,
        };
    }

    /**
     * Generate analytics CSV for download
     */
    async generateAnalyticsCsv(tenantId: string, period: string = 'monthly'): Promise<string> {
        const periodDays: Record<string, number> = {
            daily: 1, weekly: 7, monthly: 30,
            quarterly: 91, halfyearly: 182, yearly: 365,
        };
        const days = periodDays[period] ?? 30;
        const from = new Date();
        from.setDate(from.getDate() - days);

        const all = await this.campaignRepository.find({
            where: { tenantId } as any,
        });

        const filtered = all.filter(c =>
            c.createdAt >= from || (c.completedAt && c.completedAt >= from)
        );

        const header = [
            'Campaign Name', 'Status', 'Created At', 'Started At', 'Completed At',
            'Total Recipients', 'Sent', 'Delivered', 'Read',
            'Failed', 'CTA Clicks',
            'Delivery Rate (%)', 'Read Rate (%)', 'Failed Rate (%)', 'CTA Rate (%)',
        ];

        const rows = filtered.map(c => {
            const sent = c.sentCount || 0;
            const dlv = c.deliveredCount || 0;
            const read = c.readCount || 0;
            const fail = c.failedCount || 0;
            const cta = (c as any).ctaCount || 0;
            const deliveryRate = sent > 0 ? ((dlv / sent) * 100).toFixed(1) : '0';
            const readRate = dlv > 0 ? ((read / dlv) * 100).toFixed(1) : '0';
            const failedRate = sent > 0 ? ((fail / sent) * 100).toFixed(1) : '0';
            const ctaRate = sent > 0 ? ((cta / sent) * 100).toFixed(1) : '0';

            return [
                c.name,
                c.status,
                c.createdAt ? new Date(c.createdAt).toLocaleString('en-IN') : '',
                c.startedAt ? new Date(c.startedAt).toLocaleString('en-IN') : '',
                c.completedAt ? new Date(c.completedAt).toLocaleString('en-IN') : '',
                c.totalRecipients,
                sent, dlv, read,
                fail, cta,
                deliveryRate, readRate, failedRate, ctaRate,
            ];
        });

        return [header, ...rows]
            .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            .join('\n');
    }
}
