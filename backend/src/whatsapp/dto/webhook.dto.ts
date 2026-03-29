import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for webhook verification (GET request)
 */
export class WebhookVerificationDto {
    @ApiProperty({
        description: 'Verification mode',
        example: 'subscribe'
    })
    @IsString()
    @IsNotEmpty()
    'hub.mode': string;

    @ApiProperty({
        description: 'Verification token',
        example: 'your_verify_token'
    })
    @IsString()
    @IsNotEmpty()
    'hub.verify_token': string;

    @ApiProperty({
        description: 'Challenge string',
        example: '1234567890'
    })
    @IsString()
    @IsNotEmpty()
    'hub.challenge': string;
}

/**
 * Webhook message status
 */
export interface WebhookMessageStatus {
    id: string; // Message ID
    status: 'sent' | 'delivered' | 'read' | 'failed';
    timestamp: string;
    recipient_id: string;
    errors?: Array<{
        code: number;
        title: string;
        message: string;
    }>;
}

/**
 * Webhook message
 */
export interface WebhookMessage {
    from: string;
    id: string;
    timestamp: string;
    type: 'text' | 'image' | 'video' | 'document' | 'audio' | 'location' | 'contacts' | 'button' | 'interactive';
    text?: {
        body: string;
    };
    image?: {
        id: string;
        mime_type: string;
        sha256: string;
        caption?: string;
    };
    video?: {
        id: string;
        mime_type: string;
        sha256: string;
        caption?: string;
    };
    document?: {
        id: string;
        mime_type: string;
        sha256: string;
        filename: string;
        caption?: string;
    };
    audio?: {
        id: string;
        mime_type: string;
        sha256: string;
    };
    location?: {
        latitude: number;
        longitude: number;
        name?: string;
        address?: string;
    };
    button?: {
        text: string;
        payload: string;
    };
    interactive?: {
        type: string;
        button_reply?: {
            id: string;
            title: string;
        };
        list_reply?: {
            id: string;
            title: string;
            description?: string;
        };
    };
}

/**
 * Webhook change
 */
export interface WebhookChange {
    value: {
        messaging_product: 'whatsapp';
        metadata: {
            display_phone_number: string;
            phone_number_id: string;
        };
        contacts?: Array<{
            profile: {
                name: string;
            };
            wa_id: string;
        }>;
        messages?: WebhookMessage[];
        statuses?: WebhookMessageStatus[];
    };
    field: string;
}

/**
 * Webhook entry
 */
export interface WebhookEntry {
    id: string; // WABA ID
    changes: WebhookChange[];
}

/**
 * DTO for webhook payload (POST request)
 */
export class WebhookPayloadDto {
    @ApiProperty({
        description: 'Object type',
        example: 'whatsapp_business_account'
    })
    @IsString()
    object: string;

    @ApiProperty({
        description: 'Webhook entries',
        type: 'array'
    })
    @IsArray()
    entry: WebhookEntry[];
}

/**
 * Response DTO for webhook events
 */
export class WebhookEventResponseDto {
    @ApiProperty({
        description: 'Event ID'
    })
    id: string;

    @ApiProperty({
        description: 'Event type'
    })
    eventType: string;

    @ApiProperty({
        description: 'Message ID'
    })
    messageId: string | null;

    @ApiProperty({
        description: 'Status'
    })
    status: string | null;

    @ApiProperty({
        description: 'Created at'
    })
    createdAt: Date;
}
