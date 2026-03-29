import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
    @ApiProperty({
        example: 'admin@techaasvik.com',
        description: 'The email address of the user',
        required: true
    })
    @IsEmail()
    email: string;

    @ApiProperty({
        example: 'Admin@Techaasvik2026!',
        description: 'The password for the account',
        required: true,
        minLength: 8
    })
    @IsString()
    @IsNotEmpty()
    password: string;
}
