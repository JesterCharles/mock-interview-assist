'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Fast-render hint — always verified via getUser() on mount
const AUTH_HINT_KEY = 'nlm-auth-hint';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let cancelled = false;

    // Fast hint from localStorage to avoid flash
    const hint = typeof window !== 'undefined' && localStorage.getItem(AUTH_HINT_KEY) === 'true';
    if (hint) setIsAuthenticated(true);

    // Server-validate immediately
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      const authed = !!data.user;
      setIsAuthenticated(authed);
      setUser(data.user ?? null);
      if (authed) {
        localStorage.setItem(AUTH_HINT_KEY, 'true');
      } else {
        localStorage.removeItem(AUTH_HINT_KEY);
      }
      setIsLoading(false);
    });

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      const authed = !!session?.user;
      setIsAuthenticated(authed);
      setUser(session?.user ?? null);
      if (authed) {
        localStorage.setItem(AUTH_HINT_KEY, 'true');
      } else {
        localStorage.removeItem(AUTH_HINT_KEY);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return false;
      return true;
    } catch (err) {
      console.error('[auth-context] Login error:', err);
      return false;
    }
  };

  const logout = async () => {
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
    } catch {
      // proceed regardless
    }
    localStorage.removeItem(AUTH_HINT_KEY);
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, user, login, logout }}>
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
