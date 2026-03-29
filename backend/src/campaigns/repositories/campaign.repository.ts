import { DataSource, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { Campaign, CampaignStatus } from '../entities/campaign.entity';

@Injectable()
export class CampaignRepository extends Repository<Campaign> {
    constructor(private dataSource: DataSource) {
        super(Campaign, dataSource.createEntityManager());
    }

    /**
     * Find campaigns by tenant with pagination and filters
     */
    async findByTenant(
        tenantId: string,
        page: number = 1,
        limit: number = 10,
        search?: string,
        status?: CampaignStatus,
    ): Promise<[Campaign[], number]> {
        const query = this
            .createQueryBuilder('campaign')
            .where('campaign.tenantId = :tenantId', { tenantId })
            .andWhere('campaign.deletedAt IS NULL');

        if (search) {
            query.andWhere(
                '(campaign.name ILIKE :search OR campaign.description ILIKE :search)',
                { search: `%${search}%` },
            );
        }

        if (status) {
            query.andWhere('campaign.status = :status', { status });
        }

        query
            .orderBy('campaign.createdAt', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);

        return query.getManyAndCount();
    }

    /**
     * Find campaign by ID and tenant
     */
    async findByIdAndTenant(id: string, tenantId: string): Promise<Campaign | null> {
        return this
            .createQueryBuilder('campaign')
            .where('campaign.id = :id', { id })
            .andWhere('campaign.tenantId = :tenantId', { tenantId })
            .andWhere('campaign.deletedAt IS NULL')
            .getOne();
    }

    /**
     * Get campaign statistics for tenant
     */
    async getStatsByTenant(tenantId: string): Promise<{
        totalCampaigns: number;
        activeCampaigns: number;
        totalMessagesSent: number;
        averageDeliveryRate: number;
        averageReadRate: number;
    }> {
        const campaigns = await this
            .createQueryBuilder('campaign')
            .where('campaign.tenantId = :tenantId', { tenantId })
            .andWhere('campaign.deletedAt IS NULL')
            .getMany();

        const totalCampaigns = campaigns.length;
        const activeCampaigns = campaigns.filter(
            (c) => c.status === CampaignStatus.RUNNING || c.status === CampaignStatus.SCHEDULED,
        ).length;

        const totalMessagesSent = campaigns.reduce((sum, c) => sum + c.sentCount, 0);
        const totalDelivered = campaigns.reduce((sum, c) => sum + c.deliveredCount, 0);
        const totalRead = campaigns.reduce((sum, c) => sum + c.readCount, 0);

        const averageDeliveryRate =
            totalMessagesSent > 0 ? (totalDelivered / totalMessagesSent) * 100 : 0;
        const averageReadRate = totalDelivered > 0 ? (totalRead / totalDelivered) * 100 : 0;

        return {
            totalCampaigns,
            activeCampaigns,
            totalMessagesSent,
            averageDeliveryRate: Math.round(averageDeliveryRate * 10) / 10,
            averageReadRate: Math.round(averageReadRate * 10) / 10,
        };
    }

    /**
     * Find scheduled campaigns that should start
     */
    async findScheduledToStart(): Promise<Campaign[]> {
        return this
            .createQueryBuilder('campaign')
            .where('campaign.status = :status', { status: CampaignStatus.SCHEDULED })
            .andWhere('campaign.scheduledAt <= :now', { now: new Date() })
            .andWhere('campaign.deletedAt IS NULL')
            .getMany();
    }

    /**
     * Find running campaigns
     */
    async findRunning(tenantId?: string): Promise<Campaign[]> {
        const query = this
            .createQueryBuilder('campaign')
            .where('campaign.status = :status', { status: CampaignStatus.RUNNING })
            .andWhere('campaign.deletedAt IS NULL');

        if (tenantId) {
            query.andWhere('campaign.tenantId = :tenantId', { tenantId });
        }

        return query.getMany();
    }

    /**
     * Update campaign stats
     */
    async updateStats(
        id: string,
        stats: {
            sentCount?: number;
            deliveredCount?: number;
            readCount?: number;
            failedCount?: number;
        },
    ): Promise<void> {
        await this.update(id, stats);
    }

    /**
     * Update campaign status
     */
    async updateStatus(id: string, status: CampaignStatus, additionalData?: any): Promise<void> {
        const updateData: any = { status };

        if (status === CampaignStatus.RUNNING && !additionalData?.startedAt) {
            updateData.startedAt = new Date();
        }

        if (status === CampaignStatus.COMPLETED && !additionalData?.completedAt) {
            updateData.completedAt = new Date();
        }

        if (additionalData) {
            Object.assign(updateData, additionalData);
        }

        await this.update(id, updateData);
    }
}
