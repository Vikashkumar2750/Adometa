import { IsNotEmpty, IsString, IsEmail, IsOptional, MaxLength, MinLength, Matches, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTenantDto {
    @ApiProperty({ example: 'My Company Inc.', description: 'The business name of the tenant' })
    @IsNotEmpty()
    @IsString()
    @MaxLength(255)
    business_name: string;

    @ApiProperty({ example: 'John Doe', description: 'The name of the tenant owner' })
    @IsNotEmpty()
    @IsString()
    @MaxLength(255)
    owner_name: string;

    @ApiProperty({ example: 'john@example.com', description: 'The email of the tenant owner' })
    @IsNotEmpty()
    @IsEmail()
    @MaxLength(255)
    owner_email: string;

    @ApiProperty({
        example: 'SecurePass123!',
        description: 'Password for the tenant admin account (min 8 chars, must include uppercase, lowercase, number, and special char)'
    })
    @IsNotEmpty()
    @IsString()
    @MinLength(8)
    @MaxLength(100)
    @Matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        { message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character' }
    )
    password: string;

    @ApiProperty({ example: 'Asia/Kolkata', description: 'Tenant timezone', required: false, default: 'UTC' })
    @IsOptional()
    @IsString()
    @MaxLength(50)
    timezone?: string;

    @ApiProperty({ example: 'en', description: 'Tenant locale', required: false, default: 'en' })
    @IsOptional()
    @IsString()
    @MaxLength(10)
    locale?: string;

    @ApiProperty({ example: 'FREE_TRIAL', description: 'Initial plan', required: false })
    @IsOptional()
    @IsEnum(['FREE_TRIAL', 'STARTER', 'GROWTH', 'PROFESSIONAL', 'ENTERPRISE'], {
        message: 'plan must be one of: FREE_TRIAL, STARTER, GROWTH, PROFESSIONAL, ENTERPRISE'
    })
    plan?: string;
}

// Separate DTO for PATCH updates — plan, status changes from Super Admin
export class UpdateTenantDto {
    @IsOptional()
    @IsString()
    @MaxLength(255)
    business_name?: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    owner_name?: string;

    @IsOptional()
    @IsEmail()
    @MaxLength(255)
    owner_email?: string;

    @IsOptional()
    @IsString()
    @MinLength(8)
    @MaxLength(100)
    new_password?: string;

    @IsOptional()
    @IsEnum(['FREE_TRIAL', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'], {
        message: 'plan must be one of: FREE_TRIAL, STARTER, PROFESSIONAL, ENTERPRISE'
    })
    plan?: string;

    @IsOptional()
    @IsEnum(['PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED', 'DELETED'], {
        message: 'status must be one of: PENDING_APPROVAL, ACTIVE, SUSPENDED, DELETED'
    })
    status?: string;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    timezone?: string;

    @IsOptional()
    @IsString()
    @MaxLength(10)
    locale?: string;
}
