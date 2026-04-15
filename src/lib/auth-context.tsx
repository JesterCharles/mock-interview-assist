'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextType {
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (password: string) => Promise<boolean>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_KEY = 'interview-app-auth';

export function AuthProvider({ children }: { children: ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Cookie truth — localStorage is just a render-fast hint. Always
        // confirm with the server so a stale localStorage value can't trigger
        // the trainer-page-redirect loop (login -> signin -> trainer -> login).
        let cancelled = false;
        const cached = localStorage.getItem(AUTH_KEY) === 'true';
        setIsAuthenticated(cached);
        (async () => {
            try {
                const res = await fetch('/api/auth', { cache: 'no-store' });
                if (!res.ok) throw new Error('check failed');
                const data = (await res.json()) as { authenticated?: boolean };
                if (cancelled) return;
                const truth = !!data.authenticated;
                setIsAuthenticated(truth);
                if (truth) localStorage.setItem(AUTH_KEY, 'true');
                else localStorage.removeItem(AUTH_KEY);
            } catch {
                // network failure — keep cached value, don't flip auth state
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const login = async (password: string): Promise<boolean> => {
        try {
            const response = await fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });

            if (response.ok) {
                localStorage.setItem(AUTH_KEY, 'true');
                setIsAuthenticated(true);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Login error:', error);
            return false;
        }
    };

    const logout = async () => {
        // MUST await — navigation after logout will hit /signin which checks
        // the cookie server-side. If the cookie clear hasn't landed, /signin
        // redirects back to /trainer, looking like sign-out 'didn't work'.
        try {
            await fetch('/api/auth', { method: 'DELETE' });
        } catch {
            // ignore — proceed to local clear regardless
        }
        localStorage.removeItem(AUTH_KEY);
        setIsAuthenticated(false);
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
