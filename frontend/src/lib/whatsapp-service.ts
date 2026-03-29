import apiClient from './api-client';

/**
 * WhatsApp connection status
 */
export interface WhatsAppStatus {
    connected: boolean;
    id?: string;
    wabaId?: string;
    phoneNumberId?: string;
    phoneNumber?: string;
    displayName?: string;
    status?: string;
    qualityRating?: string;
}

/**
 * OAuth initiate response
 */
export interface OAuthInitiateResponse {
    oauthUrl: string;
    state: string;
}

/**
 * Message template
 */
export interface MessageTemplate {
    name: string;
    status: string;
    category: string;
    language: string;
    components: any[];
}

/**
 * Phone number details
 */
export interface PhoneDetails {
    verified_name: string;
    display_phone_number: string;
    quality_rating: string;
    messaging_limit_tier: string;
}

/**
 * WhatsApp Service
 * 
 * Handles WhatsApp-related API calls
 */
export const whatsappService = {
    /**
     * Get WhatsApp connection status
     */
    async getStatus(): Promise<WhatsAppStatus> {
        const response = await apiClient.get<WhatsAppStatus>('/whatsapp/oauth/status');
        return response.data;
    },

    /**
     * Initiate OAuth signup
     */
    async initiateSignup(redirectUrl: string): Promise<OAuthInitiateResponse> {
        const response = await apiClient.post<OAuthInitiateResponse>('/whatsapp/oauth/initiate', {
            redirectUrl,
        });
        return response.data;
    },

    /**
     * Handle OAuth callback
     */
    async handleCallback(code: string, state: string): Promise<WhatsAppStatus> {
        const response = await apiClient.post<WhatsAppStatus>('/whatsapp/oauth/callback', {
            code,
            state,
        });
        return response.data;
    },

    /**
     * Get message templates
     */
    async getTemplates(): Promise<MessageTemplate[]> {
        const response = await apiClient.get<MessageTemplate[]>('/whatsapp/messages/templates');
        return response.data;
    },

    /**
     * Get phone number details
     */
    async getPhoneDetails(): Promise<PhoneDetails> {
        const response = await apiClient.get<PhoneDetails>('/whatsapp/messages/phone-details');
        return response.data;
    },
};
