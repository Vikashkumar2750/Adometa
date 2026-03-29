import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeamController } from './team.controller';
import { TeamService } from './team.service';
import { TeamActivityLog } from './entities/team-activity.entity';
import { TenantUser } from '../entities/tenant.entities';

@Module({
    imports: [
        TypeOrmModule.forFeature([TeamActivityLog, TenantUser]),
    ],
    controllers: [TeamController],
    providers: [TeamService],
    exports: [TeamService],
})
export class TeamModule { }
