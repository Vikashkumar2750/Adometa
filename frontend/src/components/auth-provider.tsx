'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/auth-store';

/**
 * Auth Provider
 * 
 * Loads authentication state from storage on mount
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
    const loadFromStorage = useAuthStore((state) => state.loadFromStorage);

    useEffect(() => {
        loadFromStorage();
    }, [loadFromStorage]);

    return <>{children}</>;
}
