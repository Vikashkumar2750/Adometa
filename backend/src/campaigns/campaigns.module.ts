import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignsService } from './campaigns.service';
import { CampaignsController } from './campaigns.controller';
import { Campaign } from './entities/campaign.entity';
import { CampaignRepository } from './repositories/campaign.repository';
import { Tenant } from '../entities/tenant.entities';
import { PlanGuard } from '../common/guards/plan.guard';

@Module({
    imports: [TypeOrmModule.forFeature([Campaign, Tenant])],
    controllers: [CampaignsController],
    providers: [CampaignsService, CampaignRepository, PlanGuard],
    exports: [CampaignsService, CampaignRepository],
})
export class CampaignsModule { }
