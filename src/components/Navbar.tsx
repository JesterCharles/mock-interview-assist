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
        <nav className="bg-slate-900/80 backdrop-blur-xl border-b border-white/[0.06] sticky top-0 z-50">
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between h-14">
                    {/* Logo / Brand */}
                    <Link href={isAuthenticated ? "/dashboard" : "/"} className="flex items-center gap-2.5 group">
                        <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-indigo-500 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-shadow duration-300">
                            <Zap className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-bold text-white hidden sm:block tracking-tight">
                            Next Level <span className="gradient-text-static">Mock</span>
                        </span>
                    </Link>

                    {/* Show loading state or navigation based on auth */}
                    {isLoading ? (
                        <div className="text-slate-500 text-sm">Loading...</div>
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
                                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${active
                                                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                                : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                                                }`}
                                        >
                                            {item.icon}
                                            {item.label}
                                        </Link>
                                    );
                                })}
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all duration-200 ml-2"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Logout
                                </button>
                            </div>

                            {/* Mobile Menu Button */}
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="md:hidden p-2 text-slate-400 hover:text-white transition-colors"
                            >
                                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                            </button>
                        </>
                    ) : (
                        /* Not authenticated - show public features + login link */
                        <div className="flex items-center gap-3">
                            <Link
                                href="/login"
                                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white/[0.06] border border-white/[0.08] text-slate-300 hover:text-white hover:bg-white/[0.1] hover:border-white/[0.15] transition-all duration-200"
                            >
                                <LogIn className="w-4 h-4" />
                                Trainer Login
                            </Link>
                        </div>
                    )}
                </div>

                {/* Mobile Navigation - only when authenticated */}
                {isAuthenticated && mobileMenuOpen && (
                    <div className="md:hidden py-2 border-t border-white/[0.06] animate-slide-up">
                        {navItems.map((item) => {
                            const active = isItemActive(item);

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${active
                                        ? 'bg-indigo-500/20 text-indigo-300'
                                        : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
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
                            className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-400 hover:text-white hover:bg-white/[0.06] w-full text-left rounded-lg transition-all duration-200"
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
