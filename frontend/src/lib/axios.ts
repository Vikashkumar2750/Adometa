import axios from 'axios';
import Cookies from 'js-cookie';

/**
 * Axios instance configured for API requests.
 * Uses local proxy /api which forwards to Backend /api.
 */
const api = axios.create({
    baseURL: '/api', // Proxied via next.config.ts
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // If we use httpOnly cookies later
});

// Request Interceptor: Attach JWT Token
api.interceptors.request.use(
    (config) => {
        // We assume token is stored in localStorage or accessible cookie for client-side requests
        // Ideally we use server-side cookies, but for MVP local dev, we might use localStorage fallback.
        // However, if we set token in cookie on login, js-cookie can read it.
        const token = Cookies.get('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor: Handle Global Errors (401)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid
            console.warn('Session expired. Redirecting to login.');
            Cookies.remove('token');
            if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
