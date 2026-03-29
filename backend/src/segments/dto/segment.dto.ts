import { IsString, IsOptional, MinLength, MaxLength, IsArray, IsEmail, IsPhoneNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSegmentDto {
    @ApiProperty({ description: 'Segment name', example: 'VIP Customers' })
    @IsString()
    @MinLength(1, { message: 'Segment name is required' })
    @MaxLength(100)
    name: string;

    @ApiPropertyOptional({ description: 'Optional description' })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    description?: string;

    @ApiPropertyOptional({ description: 'Source of contacts', example: 'csv' })
    @IsOptional()
    @IsString()
    source?: string;
}

export class ImportContactDto {
    @ApiProperty({ description: 'Phone number (E.164 or local)', example: '+919876543210' })
    @IsString()
    @MinLength(7)
    phone: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(100)
    firstName?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(100)
    lastName?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(200)
    email?: string;

    @ApiPropertyOptional({ type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tags?: string[];
}

export class ImportContactsDto {
    @ApiProperty({ type: [ImportContactDto] })
    @IsArray()
    contacts: ImportContactDto[];
}
