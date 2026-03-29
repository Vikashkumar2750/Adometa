import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactsService } from './contacts.service';
import { ContactsController } from './contacts.controller';
import { Contact } from './entities/contact.entity';
import { ContactRepository } from './repositories/contact.repository';

/**
 * Contacts Module
 * 
 * Manages contact-related functionality
 */
@Module({
    imports: [TypeOrmModule.forFeature([Contact])],
    controllers: [ContactsController],
    providers: [ContactsService, ContactRepository],
    exports: [ContactsService, ContactRepository],
})
export class ContactsModule { }
