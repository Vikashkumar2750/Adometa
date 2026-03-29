import { Injectable } from '@nestjs/common';
import { DataSource, Repository, IsNull } from 'typeorm';
import { Segment } from '../entities/segment.entity';

@Injectable()
export class SegmentRepository extends Repository<Segment> {
    constructor(private dataSource: DataSource) {
        super(Segment, dataSource.createEntityManager());
    }

    async findByTenant(
        tenantId: string,
        page: number = 1,
        limit: number = 20,
        search?: string,
        activeOnly?: boolean,
    ): Promise<[Segment[], number]> {
        const query = this.createQueryBuilder('segment')
            .where('segment.tenantId = :tenantId', { tenantId })
            .andWhere('segment.deletedAt IS NULL');

        if (search) {
            query.andWhere(
                '(segment.name ILIKE :search OR segment.description ILIKE :search)',
                { search: `%${search}%` },
            );
        }
        if (activeOnly) {
            query.andWhere('segment.isActive = true');
        }

        return query
            .orderBy('segment.createdAt', 'DESC')
            .skip((page - 1) * limit)
            .take(limit)
            .getManyAndCount();
    }

    async findByIdAndTenant(id: string, tenantId: string): Promise<Segment | null> {
        return this.findOne({
            where: { id, tenantId, deletedAt: IsNull() },
        });
    }
}
