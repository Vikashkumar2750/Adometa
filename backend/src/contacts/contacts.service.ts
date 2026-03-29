import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { ContactRepository } from './repositories/contact.repository';
import { Contact } from './entities/contact.entity';
import {
    CreateContactDto,
    UpdateContactDto,
    ContactResponseDto,
    PaginatedContactsResponseDto,
    BulkImportResponseDto,
} from './dto/contact.dto';
import * as Papa from 'papaparse';

/**
 * Contacts Service
 * 
 * Handles all contact-related business logic
 */
@Injectable()
export class ContactsService {
    constructor(private readonly contactRepository: ContactRepository) { }

    /**
     * Create a new contact
     */
    async create(tenantId: string, dto: CreateContactDto): Promise<ContactResponseDto> {
        // Check if phone number already exists
        const exists = await this.contactRepository.phoneNumberExists(tenantId, dto.phoneNumber);
        if (exists) {
            throw new ConflictException('Contact with this phone number already exists');
        }

        const contact = this.contactRepository.create({
            ...dto,
            tenantId,
            tags: dto.tags || [],
            status: dto.status || 'active',
        });

        const saved = await this.contactRepository.save(contact);
        return this.toResponseDto(saved);
    }

    /**
     * Get all contacts for tenant (paginated)
     */
    async findAll(
        tenantId: string,
        page: number = 1,
        limit: number = 10,
        search?: string,
        tags?: string[],
        status?: string,
    ): Promise<PaginatedContactsResponseDto> {
        const [contacts, total] = await this.contactRepository.findByTenantPaginated(
            tenantId,
            page,
            limit,
            search,
            tags,
            status,
        );

        return {
            data: contacts.map((c) => this.toResponseDto(c)),
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Get contact by ID
     */
    async findOne(tenantId: string, id: string): Promise<ContactResponseDto> {
        const contact = await this.contactRepository.findOne({
            where: { id, tenantId },
        });

        if (!contact) {
            throw new NotFoundException('Contact not found');
        }

        return this.toResponseDto(contact);
    }

    /**
     * Update contact
     */
    async update(tenantId: string, id: string, dto: UpdateContactDto): Promise<ContactResponseDto> {
        const contact = await this.contactRepository.findOne({
            where: { id, tenantId },
        });

        if (!contact) {
            throw new NotFoundException('Contact not found');
        }

        Object.assign(contact, dto);
        const updated = await this.contactRepository.save(contact);
        return this.toResponseDto(updated);
    }

    /**
     * Delete contact (soft delete)
     */
    async remove(tenantId: string, id: string): Promise<void> {
        const contact = await this.contactRepository.findOne({
            where: { id, tenantId },
        });

        if (!contact) {
            throw new NotFoundException('Contact not found');
        }

        await this.contactRepository.softDelete(id);
    }

    /**
     * Get all tags for tenant
     */
    async getAllTags(tenantId: string): Promise<string[]> {
        return this.contactRepository.getAllTags(tenantId);
    }

    /**
     * Get contact statistics
     */
    async getStatistics(tenantId: string): Promise<any> {
        const statusCounts = await this.contactRepository.countByStatus(tenantId);
        const total = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);

        return {
            total,
            byStatus: statusCounts,
        };
    }

    /**
     * Bulk import contacts from CSV
     */
    async bulkImport(tenantId: string, csvData: string): Promise<BulkImportResponseDto> {
        const parsed = Papa.parse(csvData, {
            header: true,
            skipEmptyLines: true,
        });

        const result: BulkImportResponseDto = {
            imported: 0,
            failed: 0,
            errors: [],
        };

        for (let i = 0; i < parsed.data.length; i++) {
            const row: any = parsed.data[i];

            try {
                // Validate required field
                if (!row.phoneNumber && !row.phone_number) {
                    throw new Error('Phone number is required');
                }

                const phoneNumber = row.phoneNumber || row.phone_number;

                // Check if already exists
                const exists = await this.contactRepository.phoneNumberExists(tenantId, phoneNumber);
                if (exists) {
                    throw new Error('Contact already exists');
                }

                // Parse tags if string
                let tags = row.tags || [];
                if (typeof tags === 'string') {
                    tags = tags.split(',').map((t: string) => t.trim()).filter(Boolean);
                }

                // Create contact
                const contact = this.contactRepository.create({
                    tenantId,
                    phoneNumber,
                    firstName: row.firstName || row.first_name || null,
                    lastName: row.lastName || row.last_name || null,
                    email: row.email || null,
                    tags,
                    status: row.status || 'active',
                });

                await this.contactRepository.save(contact);
                result.imported++;
            } catch (error) {
                result.failed++;
                result.errors.push({
                    row: i + 1,
                    phoneNumber: row.phoneNumber || row.phone_number || 'N/A',
                    error: error.message,
                });
            }
        }

        return result;
    }

    /**
     * Export contacts to CSV
     */
    async exportToCsv(tenantId: string): Promise<string> {
        const [contacts] = await this.contactRepository.findByTenantPaginated(tenantId, 1, 10000);

        const data = contacts.map((contact) => ({
            phoneNumber: contact.phoneNumber,
            firstName: contact.firstName || '',
            lastName: contact.lastName || '',
            email: contact.email || '',
            tags: contact.tags.join(','),
            status: contact.status,
            createdAt: contact.createdAt.toISOString(),
        }));

        return Papa.unparse(data);
    }

    /**
     * Convert entity to response DTO
     */
    private toResponseDto(contact: Contact): ContactResponseDto {
        return {
            id: contact.id,
            phoneNumber: contact.phoneNumber,
            firstName: contact.firstName,
            lastName: contact.lastName,
            fullName: contact.fullName,
            email: contact.email,
            tags: contact.tags,
            customFields: contact.customFields,
            status: contact.status,
            createdAt: contact.createdAt,
            updatedAt: contact.updatedAt,
        };
    }
}
