import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AutomationRule } from './entities/automation-rule.entity';
import { AutomationService } from './automation.service';
import { AutomationController } from './automation.controller';
import { AutomationScheduler } from './automation.scheduler';

@Module({
    imports: [TypeOrmModule.forFeature([AutomationRule])],
    controllers: [AutomationController],
    providers: [AutomationService, AutomationScheduler],
    exports: [AutomationService],
})
export class AutomationModule { }
