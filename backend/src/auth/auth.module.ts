import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';
import { SuperAdmin } from '../entities/super-admin.entity';
import { TenantUser } from '../entities/tenant.entities';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
    imports: [
        UsersModule,
        TenantsModule,
        TypeOrmModule.forFeature([SuperAdmin, TenantUser]),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET') || 'jwt_secret_should_not_use_fallback',
                signOptions: {
                    expiresIn: (configService.get<string>('JWT_ACCESS_EXPIRY') || '15m') as any,
                },
            }),
        }),
    ],
    providers: [AuthService, JwtStrategy],
    controllers: [AuthController],
    exports: [AuthService, JwtModule],
})
export class AuthModule { }
