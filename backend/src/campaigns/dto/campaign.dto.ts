import { IsString, IsOptional, IsEnum, IsArray, IsObject, IsDateString } from 'class-validator';
import { CampaignStatus } from '../entities/campaign.entity';

export class CreateCampaignDto {
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsString()
    templateId: string;

    @IsOptional()
    @IsString()
    segmentId?: string;

    @IsOptional()
    @IsArray()
    contactIds?: string[];

    @IsOptional()
    @IsDateString()
    scheduledAt?: string;

    @IsOptional()
    @IsObject()
    variables?: Record<string, string>;
}

export class UpdateCampaignDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsDateString()
    scheduledAt?: string;

    @IsOptional()
    @IsEnum(CampaignStatus)
    status?: CampaignStatus;
}

export class CampaignResponseDto {
    id: string;
    name: string;
    description?: string;
    templateId: string;
    templateName?: string;
    segmentId?: string;
    segmentName?: string;
    status: CampaignStatus;
    scheduledAt?: Date;
    startedAt?: Date;
    completedAt?: Date;
    totalRecipients: number;
    sentCount: number;
    deliveredCount: number;
    readCount: number;
    failedCount: number;
    ctaCount: number;
    createdAt: Date;
    updatedAt: Date;
}

export class CampaignStatsDto {
    totalCampaigns: number;
    activeCampaigns: number;
    totalMessagesSent: number;
    averageDeliveryRate: number;
    averageReadRate: number;
}

export class PaginatedCampaignsResponseDto {
    data: CampaignResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
