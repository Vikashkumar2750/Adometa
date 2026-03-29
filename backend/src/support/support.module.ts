import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SupportTicket, SupportMessage } from './entities/support.entities';
import { SupportService } from './support.service';
import { SupportGateway } from './support.gateway';
import { SupportController, SupportAdminController } from './support.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([SupportTicket, SupportMessage]),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (cfg: ConfigService) => ({
                secret: cfg.get<string>('JWT_SECRET'),
                signOptions: { expiresIn: (cfg.get<string>('JWT_ACCESS_EXPIRY') || '15m') as any },
            }),
        }),
    ],
    controllers: [SupportController, SupportAdminController],
    providers: [SupportService, SupportGateway],
    exports: [SupportService],
})
export class SupportModule { }
