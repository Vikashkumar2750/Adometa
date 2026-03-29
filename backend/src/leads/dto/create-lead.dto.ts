import { IsString, IsEmail, IsOptional, MinLength, MaxLength, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLeadDto {
    @ApiProperty({ example: 'Rohan Sharma' })
    @IsString() @MinLength(2) @MaxLength(150)
    name: string;

    @ApiProperty({ example: 'rohan@fashionkart.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: '+919876543210' })
    @IsString() @MinLength(7) @MaxLength(20)
    phone: string;

    @ApiProperty({ example: 'FashionKart India' })
    @IsString() @MinLength(2) @MaxLength(200)
    company: string;

    @ApiPropertyOptional({ example: '11-50' })
    @IsOptional() @IsString()
    company_size?: string;

    @ApiPropertyOptional({ example: 'https://fashionkart.com' })
    @IsOptional() @IsString() @MaxLength(500)
    website?: string;

    @ApiPropertyOptional({ example: 'Bulk campaign for Diwali sale' })
    @IsOptional() @IsString() @MaxLength(2000)
    use_case?: string;

    @ApiPropertyOptional()
    @IsOptional() @IsString()
    source?: string;
}
