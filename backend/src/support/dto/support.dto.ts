import { IsString, IsOptional, IsIn, MinLength, MaxLength } from 'class-validator';

export class CreateTicketDto {
    @IsString()
    @MinLength(3, { message: 'Subject must be at least 3 characters' })
    @MaxLength(200, { message: 'Subject must be at most 200 characters' })
    subject: string;

    @IsString()
    @MinLength(10, { message: 'Message must be at least 10 characters' })
    @MaxLength(5000, { message: 'Message too long (max 5000 chars)' })
    message: string;

    @IsOptional()
    @IsIn(['low', 'normal', 'high', 'urgent'])
    priority?: string;
}

export class SendMessageDto {
    @IsString()
    @MaxLength(5000)
    content: string;
}

export class UpdateStatusDto {
    @IsString()
    @IsIn(['open', 'in_progress', 'waiting_user', 'resolved', 'closed'])
    status: string;
}
