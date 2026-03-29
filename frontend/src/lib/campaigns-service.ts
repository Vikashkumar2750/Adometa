import apiClient from './axios';

// Interfaces
export interface Campaign {
    id: string;
    name: string;
    description?: string;
    templateId: string;
    templateName?: string;
    segmentId?: string;
    segmentName?: string;
    status: 'draft' | 'scheduled' | 'running' | 'completed' | 'paused' | 'failed';
    scheduledAt?: string;
    startedAt?: string;
    completedAt?: string;
    totalRecipients: number;
    sentCount: number;
    deliveredCount: number;
    readCount: number;
    failedCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface CreateCampaignDto {
    name: string;
    description?: string;
    templateId: string;
    segmentId?: string;
    contactIds?: string[];
    scheduledAt?: string;
    variables?: Record<string, string>;
}

export interface UpdateCampaignDto {
    name?: string;
    description?: string;
    scheduledAt?: string;
    status?: 'draft' | 'scheduled' | 'paused';
}

export interface CampaignStats {
    totalCampaigns: number;
    activeCampaigns: number;
    totalMessagesSent: number;
    averageDeliveryRate: number;
    averageReadRate: number;
}

export interface PaginatedCampaignsResponse {
    data: Campaign[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface Template {
    id: string;
    name: string;
    category: string;
    language: string;
    status: 'approved' | 'pending' | 'rejected';
    content: string;
    variables?: string[];
}

export interface Segment {
    id: string;
    name: string;
    description?: string;
    contactCount: number;
    filters: any;
}

class CampaignsService {
    /**
     * Get all campaigns (paginated)
     */
    async getAll(
        page: number = 1,
        limit: number = 10,
        search?: string,
        status?: string
    ): Promise<PaginatedCampaignsResponse> {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
        });

        if (search) params.append('search', search);
        if (status) params.append('status', status);

        const response = await apiClient.get(`/campaigns?${params.toString()}`);
        return response.data;
    }

    /**
     * Get campaign by ID
     */
    async getById(id: string): Promise<Campaign> {
        const response = await apiClient.get(`/campaigns/${id}`);
        return response.data;
    }

    /**
     * Create a new campaign
     */
    async create(data: CreateCampaignDto): Promise<Campaign> {
        const response = await apiClient.post('/campaigns', data);
        return response.data;
    }

    /**
     * Update a campaign
     */
    async update(id: string, data: UpdateCampaignDto): Promise<Campaign> {
        const response = await apiClient.patch(`/campaigns/${id}`, data);
        return response.data;
    }

    /**
     * Delete a campaign
     */
    async delete(id: string): Promise<void> {
        await apiClient.delete(`/campaigns/${id}`);
    }

    /**
     * Start a campaign
     */
    async start(id: string): Promise<Campaign> {
        const response = await apiClient.post(`/campaigns/${id}/start`);
        return response.data;
    }

    /**
     * Pause a campaign
     */
    async pause(id: string): Promise<Campaign> {
        const response = await apiClient.post(`/campaigns/${id}/pause`);
        return response.data;
    }

    /**
     * Resume a paused campaign
     */
    async resume(id: string): Promise<Campaign> {
        const response = await apiClient.post(`/campaigns/${id}/resume`);
        return response.data;
    }

    /**
     * Get campaign statistics
     */
    async getStatistics(): Promise<CampaignStats> {
        const response = await apiClient.get('/campaigns/statistics');
        return response.data;
    }

    /**
     * Get available templates
     */
    async getTemplates(): Promise<Template[]> {
        const response = await apiClient.get('/templates');
        return response.data;
    }

    /**
     * Get available segments
     */
    async getSegments(): Promise<Segment[]> {
        const response = await apiClient.get('/segments');
        return response.data;
    }

    /**
     * Test campaign with sample contacts
     */
    async test(id: string, phoneNumbers: string[]): Promise<any> {
        const response = await apiClient.post(`/campaigns/${id}/test`, {
            phoneNumbers,
        });
        return response.data;
    }
}

export const campaignsService = new CampaignsService();
