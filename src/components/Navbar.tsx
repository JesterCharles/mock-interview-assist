'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
    Home,
    FileText,
    History,
    Menu,
    X,
    LogIn,
    LogOut,
    Zap
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';

interface NavItem {
    href: string;
    label: string;
    icon: React.ReactNode;
}

export default function Navbar() {
    const pathname = usePathname();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { isAuthenticated, isLoading, logout } = useAuth();

    const navItems: NavItem[] = [
        {
            href: '/dashboard',
            label: 'Setup',
            icon: <Home className="w-4 h-4" />
        },
        {
            href: '/question-banks',
            label: 'Question Banks',
            icon: <FileText className="w-4 h-4" />
        },
        {
            href: '/history',
            label: 'History',
            icon: <History className="w-4 h-4" />
        },
    ];

    const isItemActive = (item: NavItem) => {
        return pathname === item.href;
    };

    const handleLogout = () => {
        logout();
        window.location.href = '/login';
    };

    // Don't show navbar on login page
    if (pathname === '/login') {
        return null;
    }

    return (
        <nav
            className="bg-[var(--surface)] border-b border-[var(--border)] sticky top-0 z-50"
        >
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between h-14">
                    {/* Logo / Brand */}
                    <Link
                        href={isAuthenticated ? "/dashboard" : "/"}
                        className="flex items-center gap-2.5 group"
                    >
                        <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ background: 'var(--accent)' }}
                        >
                            <Zap className="w-4 h-4 text-white" />
                        </div>
                        <span
                            className="hidden sm:block tracking-tight text-[var(--ink)]"
                            style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16 }}
                        >
                            Next Level Mock
                        </span>
                    </Link>

                    {/* Show loading state or navigation based on auth */}
                    {isLoading ? (
                        <div className="text-[var(--muted)] text-sm">Loading...</div>
                    ) : isAuthenticated ? (
                        <>
                            {/* Desktop Navigation */}
                            <div className="hidden md:flex items-center gap-1">
                                {navItems.map((item) => {
                                    const active = isItemActive(item);

                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 ${active
                                                ? 'bg-[var(--highlight)] text-[var(--accent)]'
                                                : 'text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--highlight)]'
                                                }`}
                                        >
                                            {item.icon}
                                            {item.label}
                                        </Link>
                                    );
                                })}
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--highlight)] transition-colors duration-150 ml-2"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Logout
                                </button>
                            </div>

                            {/* Mobile Menu Button */}
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="md:hidden p-2 text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
                                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                            >
                                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                            </button>
                        </>
                    ) : (
                        /* Not authenticated - show public features + login link */
                        <div className="flex items-center gap-3">
                            <Link
                                href="/login"
                                className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-[var(--surface)] border border-[var(--border)] text-[var(--ink)] hover:bg-[var(--highlight)] transition-colors duration-150"
                            >
                                <LogIn className="w-4 h-4" />
                                Trainer Login
                            </Link>
                        </div>
                    )}
                </div>

                {/* Mobile Navigation - only when authenticated */}
                {isAuthenticated && mobileMenuOpen && (
                    <div className="md:hidden py-2 border-t border-[var(--border-subtle)] animate-slide-up">
                        {navItems.map((item) => {
                            const active = isItemActive(item);

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-md transition-colors duration-150 ${active
                                        ? 'bg-[var(--highlight)] text-[var(--accent)]'
                                        : 'text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--highlight)]'
                                        }`}
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    {item.icon}
                                    {item.label}
                                </Link>
                            );
                        })}
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--highlight)] w-full text-left rounded-md transition-colors duration-150"
                        >
                            <LogOut className="w-4 h-4" />
                            Logout
                        </button>
                    </div>
                )}
            </div>
        </nav>
    );
}
