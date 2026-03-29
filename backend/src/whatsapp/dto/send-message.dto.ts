import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Template parameter for template messages
 */
export class TemplateParameter {
    @ApiProperty({
        description: 'Parameter type',
        enum: ['text', 'currency', 'date_time', 'image', 'document', 'video'],
        example: 'text'
    })
    @IsEnum(['text', 'currency', 'date_time', 'image', 'document', 'video'])
    type: string;

    @ApiProperty({
        description: 'Parameter value (for text type)',
        example: 'John Doe',
        required: false
    })
    @IsOptional()
    @IsString()
    text?: string;

    @ApiProperty({
        description: 'Currency object (for currency type)',
        required: false
    })
    @IsOptional()
    currency?: {
        fallback_value: string;
        code: string;
        amount_1000: number;
    };

    @ApiProperty({
        description: 'Date time object (for date_time type)',
        required: false
    })
    @IsOptional()
    date_time?: {
        fallback_value: string;
    };

    @ApiProperty({
        description: 'Image object (for image type)',
        required: false
    })
    @IsOptional()
    image?: {
        link: string;
    };

    @ApiProperty({
        description: 'Document object (for document type)',
        required: false
    })
    @IsOptional()
    document?: {
        link: string;
        filename?: string;
    };

    @ApiProperty({
        description: 'Video object (for video type)',
        required: false
    })
    @IsOptional()
    video?: {
        link: string;
    };
}

/**
 * Template component for template messages
 */
export class TemplateComponent {
    @ApiProperty({
        description: 'Component type',
        enum: ['header', 'body', 'button'],
        example: 'body'
    })
    @IsEnum(['header', 'body', 'button'])
    type: string;

    @ApiProperty({
        description: 'Component parameters',
        type: [TemplateParameter],
        required: false
    })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => TemplateParameter)
    parameters?: TemplateParameter[];

    @ApiProperty({
        description: 'Sub type (for button type)',
        required: false
    })
    @IsOptional()
    @IsString()
    sub_type?: string;

    @ApiProperty({
        description: 'Button index (for button type)',
        required: false
    })
    @IsOptional()
    index?: number;
}

/**
 * DTO for sending template messages
 */
export class SendTemplateMessageDto {
    @ApiProperty({
        description: 'Recipient phone number (with country code, no + sign)',
        example: '1234567890'
    })
    @IsString()
    @IsNotEmpty()
    to: string;

    @ApiProperty({
        description: 'Template name',
        example: 'hello_world'
    })
    @IsString()
    @IsNotEmpty()
    templateName: string;

    @ApiProperty({
        description: 'Template language code',
        example: 'en_US',
        default: 'en_US'
    })
    @IsString()
    @IsNotEmpty()
    languageCode: string = 'en_US';

    @ApiProperty({
        description: 'Template components with parameters',
        type: [TemplateComponent],
        required: false
    })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => TemplateComponent)
    components?: TemplateComponent[];
}

/**
 * DTO for sending text messages
 */
export class SendTextMessageDto {
    @ApiProperty({
        description: 'Recipient phone number (with country code, no + sign)',
        example: '1234567890'
    })
    @IsString()
    @IsNotEmpty()
    to: string;

    @ApiProperty({
        description: 'Message text',
        example: 'Hello, this is a test message!'
    })
    @IsString()
    @IsNotEmpty()
    text: string;

    @ApiProperty({
        description: 'Preview URL in message',
        default: false,
        required: false
    })
    @IsOptional()
    previewUrl?: boolean = false;
}

/**
 * DTO for sending media messages
 */
export class SendMediaMessageDto {
    @ApiProperty({
        description: 'Recipient phone number (with country code, no + sign)',
        example: '1234567890'
    })
    @IsString()
    @IsNotEmpty()
    to: string;

    @ApiProperty({
        description: 'Media type',
        enum: ['image', 'video', 'document', 'audio'],
        example: 'image'
    })
    @IsEnum(['image', 'video', 'document', 'audio'])
    type: string;

    @ApiProperty({
        description: 'Media URL or ID',
        example: 'https://example.com/image.jpg'
    })
    @IsString()
    @IsNotEmpty()
    media: string;

    @ApiProperty({
        description: 'Caption for image/video',
        required: false
    })
    @IsOptional()
    @IsString()
    caption?: string;

    @ApiProperty({
        description: 'Filename for document',
        required: false
    })
    @IsOptional()
    @IsString()
    filename?: string;
}

/**
 * Response DTO for sent messages
 */
export class MessageResponseDto {
    @ApiProperty({
        description: 'WhatsApp message ID'
    })
    messageId: string;

    @ApiProperty({
        description: 'Recipient phone number'
    })
    to: string;

    @ApiProperty({
        description: 'Message status'
    })
    status: string;
}
