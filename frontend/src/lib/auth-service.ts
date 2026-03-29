import apiClient from './api-client';
import { User } from './auth-store';

/**
 * Login credentials
 */
export interface LoginCredentials {
    email: string;
    password: string;
}

/**
 * Login response
 */
export interface LoginResponse {
    access_token: string;
    user: User;
}

/**
 * Auth Service
 * 
 * Handles authentication API calls
 */
export const authService = {
    /**
     * Login user
     */
    async login(credentials: LoginCredentials): Promise<LoginResponse> {
        const response = await apiClient.post<LoginResponse>('/auth/login', credentials);
        return response.data;
    },

    /**
     * Get current user
     */
    async me(): Promise<User> {
        const response = await apiClient.get<User>('/auth/me');
        return response.data;
    },

    /**
     * Logout user
     */
    async logout(): Promise<void> {
        // Currently no backend logout endpoint
        // Just clear local data
        return Promise.resolve();
    },
};
