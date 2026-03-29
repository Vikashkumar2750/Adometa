import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsString,
    IsEmail,
    IsOptional,
    IsArray,
    IsEnum,
    IsObject,
    IsPhoneNumber,
    MaxLength,
} from 'class-validator';

/**
 * Create Contact DTO
 */
export class CreateContactDto {
    @ApiProperty({ example: '+1234567890', description: 'Phone number in E.164 format' })
    @IsString()
    @MaxLength(20)
    phoneNumber: string;

    @ApiPropertyOptional({ example: 'John' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    firstName?: string;

    @ApiPropertyOptional({ example: 'Doe' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    lastName?: string;

    @ApiPropertyOptional({ example: 'john@example.com' })
    @IsOptional()
    @IsEmail()
    @MaxLength(255)
    email?: string;

    @ApiPropertyOptional({ example: ['VIP', 'Customer'], type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tags?: string[];

    @ApiPropertyOptional({ example: { company: 'Acme Inc', birthday: '1990-01-01' } })
    @IsOptional()
    @IsObject()
    customFields?: Record<string, any>;

    @ApiPropertyOptional({ example: 'active', enum: ['active', 'blocked', 'unsubscribed'] })
    @IsOptional()
    @IsEnum(['active', 'blocked', 'unsubscribed'])
    status?: 'active' | 'blocked' | 'unsubscribed';
}

/**
 * Update Contact DTO
 */
export class UpdateContactDto {
    @ApiPropertyOptional({ example: 'John' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    firstName?: string;

    @ApiPropertyOptional({ example: 'Doe' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    lastName?: string;

    @ApiPropertyOptional({ example: 'john@example.com' })
    @IsOptional()
    @IsEmail()
    @MaxLength(255)
    email?: string;

    @ApiPropertyOptional({ example: ['VIP', 'Customer'], type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tags?: string[];

    @ApiPropertyOptional({ example: { company: 'Acme Inc', birthday: '1990-01-01' } })
    @IsOptional()
    @IsObject()
    customFields?: Record<string, any>;

    @ApiPropertyOptional({ example: 'active', enum: ['active', 'blocked', 'unsubscribed'] })
    @IsOptional()
    @IsEnum(['active', 'blocked', 'unsubscribed'])
    status?: 'active' | 'blocked' | 'unsubscribed';
}

/**
 * Contact Response DTO
 */
export class ContactResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    phoneNumber: string;

    @ApiPropertyOptional()
    firstName?: string;

    @ApiPropertyOptional()
    lastName?: string;

    @ApiPropertyOptional()
    fullName?: string;

    @ApiPropertyOptional()
    email?: string;

    @ApiProperty({ type: [String] })
    tags: string[];

    @ApiPropertyOptional()
    customFields?: Record<string, any>;

    @ApiProperty()
    status: string;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;
}

/**
 * Paginated Contacts Response
 */
export class PaginatedContactsResponseDto {
    @ApiProperty({ type: [ContactResponseDto] })
    data: ContactResponseDto[];

    @ApiProperty({
        example: {
            total: 100,
            page: 1,
            limit: 10,
            totalPages: 10,
        },
    })
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

/**
 * Bulk Import DTO
 */
export class BulkImportDto {
    @ApiProperty({
        type: 'array',
        items: {
            type: 'object',
            properties: {
                phoneNumber: { type: 'string' },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                email: { type: 'string' },
                tags: { type: 'array', items: { type: 'string' } },
            },
        },
    })
    @IsArray()
    contacts: CreateContactDto[];
}

/**
 * Bulk Import Response
 */
export class BulkImportResponseDto {
    @ApiProperty()
    imported: number;

    @ApiProperty()
    failed: number;

    @ApiProperty({ type: [Object] })
    errors: Array<{
        row: number;
        phoneNumber: string;
        error: string;
    }>;
}
