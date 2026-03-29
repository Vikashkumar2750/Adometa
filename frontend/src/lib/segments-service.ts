import apiClient from './api-client';

export interface Segment {
    id: string;
    name: string;
    description?: string;
    contactCount: number;
    isActive: boolean;
    source?: string;
    contactPhones?: string[];
    contacts?: Array<{
        phone: string;
        firstName?: string;
        lastName?: string;
        email?: string;
        tags?: string[];
    }>;
    createdAt: string;
    updatedAt: string;
}

export interface CreateSegmentDto {
    name: string;
    description?: string;
}

export interface ImportContactsDto {
    contacts: Array<{
        phone: string;
        firstName?: string;
        lastName?: string;
        email?: string;
        tags?: string[];
    }>;
}

export interface ImportResult {
    added: number;
    duplicates: number;
    total: number;
    duplicatePhones: string[];
}

export interface PaginatedSegments {
    data: Segment[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export const segmentsService = {
    async getAll(page = 1, limit = 20, search?: string, activeOnly?: boolean): Promise<PaginatedSegments> {
        const params: any = { page, limit };
        if (search) params.search = search;
        if (activeOnly) params.activeOnly = 'true';
        const res = await apiClient.get<PaginatedSegments>('/segments', { params });
        return res.data;
    },

    async getById(id: string): Promise<Segment> {
        const res = await apiClient.get<Segment>(`/segments/${id}`);
        return res.data;
    },

    async create(dto: CreateSegmentDto): Promise<Segment> {
        const res = await apiClient.post<Segment>('/segments', dto);
        return res.data;
    },

    async toggle(id: string): Promise<Segment> {
        const res = await apiClient.post<Segment>(`/segments/${id}/toggle`);
        return res.data;
    },

    async importContacts(id: string, dto: ImportContactsDto): Promise<ImportResult> {
        const res = await apiClient.post<ImportResult>(`/segments/${id}/import`, dto);
        return res.data;
    },

    async delete(id: string): Promise<void> {
        await apiClient.delete(`/segments/${id}`);
    },
};
