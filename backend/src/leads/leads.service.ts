import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead } from './entities/lead.entity';
import { CreateLeadDto } from './dto/create-lead.dto';

@Injectable()
export class LeadsService {
    constructor(
        @InjectRepository(Lead)
        private readonly repo: Repository<Lead>,
    ) { }

    async create(dto: CreateLeadDto): Promise<Lead> {
        const lead = this.repo.create(dto);
        return this.repo.save(lead);
    }

    async findAll(page = 1, limit = 50, status?: string) {
        const qb = this.repo.createQueryBuilder('lead').orderBy('lead.created_at', 'DESC');
        if (status) qb.where('lead.status = :status', { status });
        const total = await qb.getCount();
        const data = await qb.skip((page - 1) * limit).take(limit).getMany();
        return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
    }

    async updateStatus(id: string, status: string, notes?: string): Promise<Lead> {
        const lead = await this.repo.findOneOrFail({ where: { id } });
        lead.status = status;
        if (notes !== undefined) lead.notes = notes;
        return this.repo.save(lead);
    }

    async exportCsv(): Promise<string> {
        const leads = await this.repo.find({ order: { created_at: 'DESC' } });
        const header = ['ID', 'Name', 'Email', 'Phone', 'Company', 'Company Size', 'Website', 'Use Case', 'Status', 'Source', 'Created At'];
        const rows = leads.map(l => [
            l.id,
            `"${(l.name || '').replace(/"/g, '""')}"`,
            l.email,
            l.phone,
            `"${(l.company || '').replace(/"/g, '""')}"`,
            l.company_size || '',
            l.website || '',
            `"${(l.use_case || '').replace(/"/g, '""')}"`,
            l.status,
            l.source || '',
            l.created_at?.toISOString() || '',
        ].join(','));
        return [header.join(','), ...rows].join('\n');
    }
}
