import {
    IsString, IsNotEmpty, IsOptional, IsEnum, IsArray,
    IsObject, ValidateNested, IsBoolean, IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { TemplateCategory, TemplateLanguage, TemplateStatus, HeaderType } from '../entities/template.entity';

// ─── Button DTO ───────────────────────────────────────────────────────────────
export class TemplateButtonDto {
    @ApiProperty({ enum: ['QUICK_REPLY', 'URL', 'PHONE_NUMBER'] })
    @IsEnum(['QUICK_REPLY', 'URL', 'PHONE_NUMBER'])
    type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';

    @ApiProperty({ description: 'Button label (max 25 chars)' })
    @IsString()
    @IsNotEmpty()
    text: string;

    @ApiPropertyOptional({ description: 'URL for URL buttons' })
    @IsString()
    @IsOptional()
    url?: string;

    @ApiPropertyOptional({ description: 'Phone number for PHONE_NUMBER buttons' })
    @IsString()
    @IsOptional()
    phone_number?: string;

    @ApiPropertyOptional({ description: 'Example values for dynamic URL params' })
    @IsArray()
    @IsOptional()
    example?: string[];

    @ApiPropertyOptional({ description: 'Enable click tracking' })
    @IsBoolean()
    @IsOptional()
    trackClicks?: boolean;

    @ApiPropertyOptional({ description: 'UTM / tracking label' })
    @IsString()
    @IsOptional()
    trackingLabel?: string;
}

// ─── Create DTO ───────────────────────────────────────────────────────────────
export class CreateTemplateDto {
    @ApiProperty({ description: 'Template name - will be lowercased/underscored for Meta', example: 'welcome_message' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ enum: TemplateCategory })
    @IsEnum(TemplateCategory)
    category: TemplateCategory;

    @ApiProperty({ enum: TemplateLanguage })
    @IsEnum(TemplateLanguage)
    language: TemplateLanguage;

    // Header fields
    @ApiPropertyOptional({ enum: HeaderType, description: 'Header type: NONE | TEXT | IMAGE | VIDEO | DOCUMENT', default: 'NONE' })
    @IsEnum(HeaderType)
    @IsOptional()
    headerType?: HeaderType;

    @ApiPropertyOptional({ description: 'Header text (for TEXT header type)' })
    @IsString()
    @IsOptional()
    headerText?: string;

    @ApiPropertyOptional({ description: 'Meta media handle (returned from /templates/upload-media)' })
    @IsString()
    @IsOptional()
    headerMediaHandle?: string;

    @ApiPropertyOptional({ description: 'Public URL of the uploaded media for preview' })
    @IsString()
    @IsOptional()
    headerMediaUrl?: string;

    @ApiPropertyOptional({ description: 'Original filename' })
    @IsString()
    @IsOptional()
    headerMediaFilename?: string;

    @ApiPropertyOptional({ description: 'Mime type e.g. image/jpeg' })
    @IsString()
    @IsOptional()
    headerMediaMimeType?: string;

    @ApiProperty({ description: 'Body text with {{1}} variable placeholders' })
    @IsString()
    @IsNotEmpty()
    bodyText: string;

    @ApiPropertyOptional({ description: 'Footer text' })
    @IsString()
    @IsOptional()
    footerText?: string;

    @ApiPropertyOptional({ description: 'CTA / Quick-reply buttons (max 3)', type: [TemplateButtonDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => TemplateButtonDto)
    @IsOptional()
    buttons?: TemplateButtonDto[];

    @ApiPropertyOptional({ description: 'Variable name hints keyed by placeholder index' })
    @IsObject()
    @IsOptional()
    variables?: Record<string, string>;

    @ApiPropertyOptional({ description: 'Auto-submit to Meta for approval after creation', default: false })
    @IsBoolean()
    @IsOptional()
    submitToMeta?: boolean;
}

// ─── Update DTO ───────────────────────────────────────────────────────────────
export class UpdateTemplateDto {
    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    name?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    description?: string;

    @ApiPropertyOptional({ enum: HeaderType })
    @IsEnum(HeaderType)
    @IsOptional()
    headerType?: HeaderType;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    headerText?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    headerMediaHandle?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    headerMediaUrl?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    headerMediaFilename?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    headerMediaMimeType?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    bodyText?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    footerText?: string;

    @ApiPropertyOptional({ type: [TemplateButtonDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => TemplateButtonDto)
    @IsOptional()
    buttons?: TemplateButtonDto[];

    @ApiPropertyOptional()
    @IsObject()
    @IsOptional()
    variables?: Record<string, string>;
}

// ─── Response DTO ─────────────────────────────────────────────────────────────
export class TemplateResponseDto {
    @ApiProperty() id: string;
    @ApiProperty() name: string;
    @ApiPropertyOptional() description?: string;
    @ApiProperty({ enum: TemplateCategory }) category: TemplateCategory;
    @ApiProperty({ enum: TemplateLanguage }) language: TemplateLanguage;
    @ApiProperty({ enum: TemplateStatus }) status: TemplateStatus;
    @ApiPropertyOptional({ enum: HeaderType }) headerType?: HeaderType;
    @ApiPropertyOptional() headerText?: string;
    @ApiPropertyOptional() headerMediaHandle?: string;
    @ApiPropertyOptional() headerMediaUrl?: string;
    @ApiPropertyOptional() headerMediaFilename?: string;
    @ApiPropertyOptional() headerMediaMimeType?: string;
    @ApiProperty() bodyText: string;
    @ApiPropertyOptional() footerText?: string;
    @ApiPropertyOptional({ type: [TemplateButtonDto] }) buttons?: TemplateButtonDto[];
    @ApiPropertyOptional() variables?: Record<string, string>;
    @ApiPropertyOptional() metaTemplateId?: string;
    @ApiPropertyOptional() metaStatus?: string;
    @ApiPropertyOptional() rejectionReason?: string;
    @ApiPropertyOptional() submittedAt?: Date;
    @ApiPropertyOptional() approvedAt?: Date;
    @ApiProperty() createdAt: Date;
    @ApiProperty() updatedAt: Date;
}

// ─── Media Upload Response ────────────────────────────────────────────────────
export class MediaUploadResponseDto {
    @ApiProperty({ description: 'Meta media handle for use in template header' })
    handle: string;

    @ApiProperty({ description: 'Public URL for preview (served from our backend)' })
    previewUrl: string;

    @ApiProperty({ description: 'Original filename' })
    filename: string;

    @ApiProperty({ description: 'Mime type' })
    mimeType: string;

    @ApiProperty({ description: 'File size in bytes' })
    size: number;

    @ApiProperty({ description: 'Detected header type: IMAGE | VIDEO | DOCUMENT' })
    headerType: HeaderType;
}

// ─── Paginated ────────────────────────────────────────────────────────────────
export class PaginatedTemplatesResponseDto {
    @ApiProperty({ type: [TemplateResponseDto] }) data: TemplateResponseDto[];
    @ApiProperty() total: number;
    @ApiProperty() page: number;
    @ApiProperty() limit: number;
    @ApiProperty() totalPages: number;
}

// ─── Stats ────────────────────────────────────────────────────────────────────
export class TemplateStatsDto {
    @ApiProperty() totalTemplates: number;
    @ApiProperty() approvedTemplates: number;
    @ApiProperty() pendingTemplates: number;
    @ApiProperty() rejectedTemplates: number;
    @ApiProperty() draftTemplates: number;
}
