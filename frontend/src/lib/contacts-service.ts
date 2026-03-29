import apiClient from './api-client';

/**
 * Contact interface
 */
export interface Contact {
    id: string;
    phoneNumber: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    email?: string;
    tags: string[];
    customFields?: Record<string, any>;
    status: 'active' | 'blocked' | 'unsubscribed';
    createdAt: string;
    updatedAt: string;
}

/**
 * Create contact DTO
 */
export interface CreateContactDto {
    phoneNumber: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    tags?: string[];
    customFields?: Record<string, any>;
    status?: 'active' | 'blocked' | 'unsubscribed';
}

/**
 * Update contact DTO
 */
export interface UpdateContactDto {
    firstName?: string;
    lastName?: string;
    email?: string;
    tags?: string[];
    customFields?: Record<string, any>;
    status?: 'active' | 'blocked' | 'unsubscribed';
}

/**
 * Paginated response
 */
export interface PaginatedContacts {
    data: Contact[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

/**
 * Contact statistics
 */
export interface ContactStatistics {
    total: number;
    byStatus: {
        active: number;
        blocked: number;
        unsubscribed: number;
    };
}

/**
 * Bulk import response
 */
export interface BulkImportResponse {
    imported: number;
    failed: number;
    errors: Array<{
        row: number;
        phoneNumber: string;
        error: string;
    }>;
}

/**
 * Contacts Service
 * 
 * Handles contact-related API calls
 */
export const contactsService = {
    /**
     * Get all contacts (paginated)
     */
    async getAll(
        page: number = 1,
        limit: number = 10,
        search?: string,
        tags?: string[],
        status?: string,
    ): Promise<PaginatedContacts> {
        const params: any = { page, limit };
        if (search) params.search = search;
        if (tags && tags.length > 0) params.tags = tags;
        if (status) params.status = status;

        const response = await apiClient.get<PaginatedContacts>('/contacts', { params });
        return response.data;
    },

    /**
     * Get contact by ID
     */
    async getById(id: string): Promise<Contact> {
        const response = await apiClient.get<Contact>(`/contacts/${id}`);
        return response.data;
    },

    /**
     * Create contact
     */
    async create(data: CreateContactDto): Promise<Contact> {
        const response = await apiClient.post<Contact>('/contacts', data);
        return response.data;
    },

    /**
     * Update contact
     */
    async update(id: string, data: UpdateContactDto): Promise<Contact> {
        const response = await apiClient.patch<Contact>(`/contacts/${id}`, data);
        return response.data;
    },

    /**
     * Delete contact
     */
    async delete(id: string): Promise<void> {
        await apiClient.delete(`/contacts/${id}`);
    },

    /**
     * Get all tags
     */
    async getTags(): Promise<string[]> {
        const response = await apiClient.get<string[]>('/contacts/tags');
        return response.data;
    },

    /**
     * Get statistics
     */
    async getStatistics(): Promise<ContactStatistics> {
        const response = await apiClient.get<ContactStatistics>('/contacts/statistics');
        return response.data;
    },

    /**
     * Import contacts from CSV
     */
    async importCsv(file: File): Promise<BulkImportResponse> {
        const formData = new FormData();
        formData.append('file', file);

        const response = await apiClient.post<BulkImportResponse>('/contacts/import', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    /**
     * Export contacts to CSV
     */
    async exportCsv(): Promise<Blob> {
        const response = await apiClient.get('/contacts/export', {
            responseType: 'blob',
        });
        return response.data;
    },
};
