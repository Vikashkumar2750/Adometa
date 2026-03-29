import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for initiating Meta OAuth Embedded Signup
 */
export class InitiateSignupDto {
    @ApiProperty({
        description: 'Redirect URL after OAuth completion',
        example: 'https://app.techaasvik.com/dashboard/whatsapp/callback'
    })
    @IsString()
    @IsNotEmpty()
    redirectUrl: string;
}

/**
 * DTO for OAuth callback
 */
export class OAuthCallbackDto {
    @ApiProperty({
        description: 'Authorization code from Meta',
        example: 'AQD...'
    })
    @IsString()
    @IsNotEmpty()
    code: string;

    @ApiProperty({
        description: 'State token for CSRF protection',
        example: 'abc123...'
    })
    @IsString()
    @IsNotEmpty()
    state: string;
}

/**
 * DTO for exchanging code for access token
 */
export class ExchangeTokenDto {
    @ApiProperty({
        description: 'Authorization code from Meta'
    })
    @IsString()
    @IsNotEmpty()
    code: string;
}

/**
 * Response DTO for OAuth initiation
 */
export class OAuthInitiateResponseDto {
    @ApiProperty({
        description: 'Meta OAuth URL to redirect user to'
    })
    oauthUrl: string;

    @ApiProperty({
        description: 'State token for CSRF protection'
    })
    state: string;
}

/**
 * Response DTO for successful WABA connection
 */
export class WabaConnectionResponseDto {
    @ApiProperty({
        description: 'WABA configuration ID'
    })
    id: string;

    @ApiProperty({
        description: 'WhatsApp Business Account ID'
    })
    wabaId: string;

    @ApiProperty({
        description: 'Phone number ID'
    })
    phoneNumberId: string;

    @ApiProperty({
        description: 'Phone number'
    })
    phoneNumber: string;

    @ApiProperty({
        description: 'Display name'
    })
    displayName: string;

    @ApiProperty({
        description: 'Connection status'
    })
    status: string;

    @ApiProperty({
        description: 'Quality rating'
    })
    qualityRating: string;
}
