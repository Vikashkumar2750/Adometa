import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { IsNull } from 'typeorm';
import { SegmentRepository } from './repositories/segment.repository';
import { Segment } from './entities/segment.entity';
import { CreateSegmentDto, ImportContactsDto } from './dto/segment.dto';

export interface ImportResult {
    added: number;
    duplicates: number;
    total: number;
    duplicatePhones: string[];
}

@Injectable()
export class SegmentsService {
    constructor(private readonly segmentRepository: SegmentRepository) { }

    async create(tenantId: string, dto: CreateSegmentDto): Promise<Segment> {
        // Check for duplicate name within tenant
        const existing = await this.segmentRepository.findOne({
            where: { tenantId, name: dto.name, deletedAt: IsNull() },
        });
        if (existing) {
            throw new ConflictException(`A segment named "${dto.name}" already exists`);
        }

        const segment = this.segmentRepository.create({
            tenantId,
            name: dto.name,
            description: dto.description,
            source: dto.source || 'manual',
            contactCount: 0,
            contactPhones: [],
            contacts: [],
            isActive: true,
        });

        return this.segmentRepository.save(segment);
    }

    async findAll(tenantId: string, page = 1, limit = 20, search?: string, activeOnly?: boolean) {
        const [segments, total] = await this.segmentRepository.findByTenant(
            tenantId, page, limit, search, activeOnly,
        );
        return {
            data: segments,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findOne(id: string, tenantId: string): Promise<Segment> {
        const segment = await this.segmentRepository.findByIdAndTenant(id, tenantId);
        if (!segment) throw new NotFoundException(`Segment ${id} not found`);
        return segment;
    }

    async update(id: string, tenantId: string, dto: Partial<CreateSegmentDto>): Promise<Segment> {
        const segment = await this.findOne(id, tenantId);
        Object.assign(segment, dto);
        return this.segmentRepository.save(segment);
    }

    async remove(id: string, tenantId: string): Promise<void> {
        const segment = await this.findOne(id, tenantId);
        await this.segmentRepository.softDelete(segment.id);
    }

    async toggleActive(id: string, tenantId: string): Promise<Segment> {
        const segment = await this.findOne(id, tenantId);
        segment.isActive = !segment.isActive;
        return this.segmentRepository.save(segment);
    }

    /**
     * Import contacts into an existing segment.
     * Deduplicates by phone number (skips already-present numbers).
     */
    async importContacts(id: string, tenantId: string, dto: ImportContactsDto): Promise<ImportResult> {
        const segment = await this.findOne(id, tenantId);

        const existingPhones = new Set(segment.contactPhones);
        const duplicatePhones: string[] = [];
        const newContacts: typeof segment.contacts = [];
        const newPhones: string[] = [];

        for (const contact of dto.contacts) {
            // Normalise: strip non-digits then prefix +91 if 10 digits (India default)
            const normalised = contact.phone.replace(/\s+/g, '').replace(/^\+/, '');
            if (existingPhones.has(normalised)) {
                duplicatePhones.push(contact.phone);
            } else {
                existingPhones.add(normalised);
                newPhones.push(normalised);
                newContacts.push({ ...contact, phone: normalised });
            }
        }

        segment.contacts = [...segment.contacts, ...newContacts];
        segment.contactPhones = [...segment.contactPhones, ...newPhones];
        segment.contactCount = segment.contacts.length;
        segment.source = 'csv';

        await this.segmentRepository.save(segment);

        return {
            added: newContacts.length,
            duplicates: duplicatePhones.length,
            total: segment.contactCount,
            duplicatePhones,
        };
    }
}
