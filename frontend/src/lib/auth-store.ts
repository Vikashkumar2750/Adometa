import { create } from 'zustand';
import Cookies from 'js-cookie';

/**
 * User interface
 */
export interface User {
    id: string;
    email: string;
    name: string;
    role: 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'TENANT_MARKETER' | 'TENANT_VIEWER';
    tenantId?: string;
}

/**
 * Auth store state
 */
interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;

    // Actions
    setAuth: (user: User, token: string) => void;
    setUser: (user: User) => void;
    logout: () => void;
    loadFromStorage: () => void;
}

/**
 * Auth Store
 * 
 * Global authentication state management
 */
export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,

    /**
     * Set authentication data
     */
    setAuth: (user: User, token: string) => {
        // Save to cookies and localStorage
        Cookies.set('token', token, { expires: 1 }); // 1 day
        localStorage.setItem('user', JSON.stringify(user));

        set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
        });
    },

    /**
     * Update user without changing token
     */
    setUser: (user: User) => {
        localStorage.setItem('user', JSON.stringify(user));
        set({ user });
    },

    /**
     * Logout user
     */
    logout: () => {
        // Clear cookies and localStorage
        Cookies.remove('token');
        localStorage.removeItem('user');

        set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
        });
    },

    /**
     * Load auth data from storage
     */
    loadFromStorage: () => {
        const token = Cookies.get('token');
        const userStr = localStorage.getItem('user');

        if (token && userStr) {
            try {
                const user = JSON.parse(userStr);
                set({
                    user,
                    token,
                    isAuthenticated: true,
                    isLoading: false,
                });
            } catch (error) {
                console.error('Failed to parse user data:', error);
                set({ isLoading: false });
            }
        } else {
            set({ isLoading: false });
        }
    },
}));
