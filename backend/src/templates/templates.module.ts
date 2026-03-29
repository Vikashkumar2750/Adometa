import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TemplatesService } from './templates.service';
import { TemplatesController, AdminTemplatesController } from './templates.controller';
import { Template } from './entities/template.entity';
import { TemplateRepository } from './repositories/template.repository';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Template]),
        WhatsAppModule,   // provides WhatsAppOAuthService
    ],
    controllers: [TemplatesController, AdminTemplatesController],
    providers: [TemplatesService, TemplateRepository],
    exports: [TemplatesService, TemplateRepository],
})
export class TemplatesModule { }
