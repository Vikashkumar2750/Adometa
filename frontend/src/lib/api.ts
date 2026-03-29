/**
 * Shared API utilities — single source of truth for all HTTP calls.
 *
 * Exports:
 *   api          — axios instance with auto-token + 401 redirect
 *   API_BASE     — base URL string
 *   getAuthHeaders() — plain header object (for pages that still use raw axios)
 *   getToken()   — raw token string
 */
import axios from 'axios';
import Cookies from 'js-cookie';

export const API_BASE =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

/** Returns JWT auth headers. */
export function getAuthHeaders(): Record<string, string> {
    const token = Cookies.get('token') || '';
    return { Authorization: `Bearer ${token}` };
}

/** Reads only the token string */
export function getToken(): string {
    return Cookies.get('token') || '';
}

// ── Shared axios instance ────────────────────────────────────────────────────
const api = axios.create({
    baseURL: API_BASE,
    timeout: 15_000,
});

// Inject token on every request
api.interceptors.request.use((config) => {
    const token = Cookies.get('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle 401 globally — redirect to login with reason param
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            Cookies.remove('token');
            if (typeof localStorage !== 'undefined') localStorage.removeItem('user');
            if (
                typeof window !== 'undefined' &&
                !window.location.pathname.startsWith('/login')
            ) {
                setTimeout(() => {
                    window.location.href = '/login?reason=session_expired';
                }, 150);
            }
        }
        return Promise.reject(error);
    },
);

export default api;
