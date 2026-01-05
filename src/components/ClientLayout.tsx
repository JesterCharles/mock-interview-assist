'use client';

// Client-side wrapper for layout components that need client state

import Navbar from '@/components/Navbar';
import { AuthProvider } from '@/lib/auth-context';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <Navbar />
            <main className="min-h-[calc(100vh-3.5rem)]">
                {children}
            </main>
        </AuthProvider>
    );
}
