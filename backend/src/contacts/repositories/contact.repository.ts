import { Injectable } from '@nestjs/common';
import { DataSource, Repository, Like, In } from 'typeorm';
import { Contact } from '../entities/contact.entity';

/**
 * Contact Repository
 * 
 * Provides custom query methods for contacts with tenant isolation
 */
@Injectable()
export class ContactRepository extends Repository<Contact> {
    constructor(private dataSource: DataSource) {
        super(Contact, dataSource.createEntityManager());
    }

    /**
     * Find contacts by tenant with pagination
     */
    async findByTenantPaginated(
        tenantId: string,
        page: number = 1,
        limit: number = 10,
        search?: string,
        tags?: string[],
        status?: string,
    ): Promise<[Contact[], number]> {
        const query = this.createQueryBuilder('contact')
            .where('contact.tenantId = :tenantId', { tenantId })
            .andWhere('contact.deletedAt IS NULL');

        // Search by name, phone, or email
        if (search) {
            query.andWhere(
                '(contact.firstName ILIKE :search OR contact.lastName ILIKE :search OR contact.phoneNumber ILIKE :search OR contact.email ILIKE :search)',
                { search: `%${search}%` },
            );
        }

        // Filter by tags
        if (tags && tags.length > 0) {
            query.andWhere('contact.tags && :tags', { tags });
        }

        // Filter by status
        if (status) {
            query.andWhere('contact.status = :status', { status });
        }

        // Pagination
        const skip = (page - 1) * limit;
        query.skip(skip).take(limit);

        // Order by created date (newest first)
        query.orderBy('contact.createdAt', 'DESC');

        return query.getManyAndCount();
    }

    /**
     * Find contact by phone number
     */
    async findByPhoneNumber(tenantId: string, phoneNumber: string): Promise<Contact | null> {
        return this.findOne({
            where: {
                tenantId,
                phoneNumber,
            },
        });
    }

    /**
     * Get all tags used by tenant
     */
    async getAllTags(tenantId: string): Promise<string[]> {
        const result = await this.createQueryBuilder('contact')
            .select('DISTINCT UNNEST(contact.tags)', 'tag')
            .where('contact.tenantId = :tenantId', { tenantId })
            .andWhere('contact.deletedAt IS NULL')
            .getRawMany();

        return result.map((r) => r.tag).filter(Boolean);
    }

    /**
     * Count contacts by status
     */
    async countByStatus(tenantId: string): Promise<Record<string, number>> {
        const result = await this.createQueryBuilder('contact')
            .select('contact.status', 'status')
            .addSelect('COUNT(*)', 'count')
            .where('contact.tenantId = :tenantId', { tenantId })
            .andWhere('contact.deletedAt IS NULL')
            .groupBy('contact.status')
            .getRawMany();

        const counts: Record<string, number> = {
            active: 0,
            blocked: 0,
            unsubscribed: 0,
        };

        result.forEach((r) => {
            counts[r.status] = parseInt(r.count, 10);
        });

        return counts;
    }

    /**
     * Bulk create contacts
     */
    async bulkCreate(contacts: Partial<Contact>[]): Promise<Contact[]> {
        const entities = this.create(contacts);
        return this.save(entities);
    }

    /**
     * Check if phone number exists for tenant
     */
    async phoneNumberExists(tenantId: string, phoneNumber: string, excludeId?: string): Promise<boolean> {
        const query = this.createQueryBuilder('contact')
            .where('contact.tenantId = :tenantId', { tenantId })
            .andWhere('contact.phoneNumber = :phoneNumber', { phoneNumber })
            .andWhere('contact.deletedAt IS NULL');

        if (excludeId) {
            query.andWhere('contact.id != :excludeId', { excludeId });
        }

        const count = await query.getCount();
        return count > 0;
    }
}
