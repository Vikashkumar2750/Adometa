import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';

/**
 * API Client for Techaasvik Platform
 * 
 * Features:
 * - Automatic token injection
 * - Error handling
 * - Request/response interceptors
 */

const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
// Ensure /api suffix is always present
const API_BASE_URL = RAW_API_URL.endsWith('/api')
    ? RAW_API_URL
    : `${RAW_API_URL.replace(/\/$/, '')}/api`;


// Create axios instance
const apiClient: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 30000, // 30 seconds
});

// Request interceptor - Add auth token + tenant context header
apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = Cookies.get('token');

        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Inject x-tenant-id for tenant-scoped endpoints
        // Tenant users have tenantId in their stored user object
        if (typeof window !== 'undefined' && config.headers) {
            try {
                const userStr = localStorage.getItem('user');
                if (userStr) {
                    const user = JSON.parse(userStr);
                    if (user?.tenantId) {
                        config.headers['x-tenant-id'] = user.tenantId;
                    }
                }
            } catch (_) { /* ignore */ }
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);


// Response interceptor - Handle errors
apiClient.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        // Handle 401 Unauthorized
        if (error.response?.status === 401) {
            // Clear auth data
            Cookies.remove('token');
            localStorage.removeItem('user');

            // Redirect to login (only in browser)
            if (typeof window !== 'undefined') {
                window.location.href = '/login';
            }
        }

        return Promise.reject(error);
    }
);

export default apiClient;

// API response types
export interface ApiResponse<T = any> {
    data: T;
    message?: string;
}

export interface ApiError {
    message: string;
    statusCode: number;
    error?: string;
}
