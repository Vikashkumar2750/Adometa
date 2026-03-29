import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { SuperAdmin } from '../entities/super-admin.entity';
import { TenantUser } from '../entities/tenant.entities';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            SuperAdmin,
            TenantUser
        ])
    ],
    providers: [UsersService],
    exports: [UsersService],
})
export class UsersModule { }
