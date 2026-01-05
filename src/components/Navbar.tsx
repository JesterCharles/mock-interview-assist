'use client';

// Global navigation bar component - simplified

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
    Home,
    FileText,
    History,
    Menu,
    X,
    LogIn,
    LogOut
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
        <nav className="bg-slate-900 border-b border-slate-700 sticky top-0 z-50">
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between h-14">
                    {/* Logo / Brand */}
                    <Link href={isAuthenticated ? "/dashboard" : "/login"} className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <FileText className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-semibold text-white hidden sm:block">Interview Assessment</span>
                    </Link>

                    {/* Show loading state or navigation based on auth */}
                    {isLoading ? (
                        <div className="text-gray-500 text-sm">Loading...</div>
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
                                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${active
                                                ? 'bg-indigo-600 text-white'
                                                : 'text-gray-300 hover:text-white hover:bg-slate-800'
                                                }`}
                                        >
                                            {item.icon}
                                            {item.label}
                                        </Link>
                                    );
                                })}
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-slate-800 transition-colors ml-2"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Logout
                                </button>
                            </div>

                            {/* Mobile Menu Button */}
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="md:hidden p-2 text-gray-400 hover:text-white"
                            >
                                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                            </button>
                        </>
                    ) : (
                        /* Not authenticated - show login link */
                        <Link
                            href="/login"
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
                        >
                            <LogIn className="w-4 h-4" />
                            Login
                        </Link>
                    )}
                </div>

                {/* Mobile Navigation - only when authenticated */}
                {isAuthenticated && mobileMenuOpen && (
                    <div className="md:hidden py-2 border-t border-slate-700">
                        {navItems.map((item) => {
                            const active = isItemActive(item);

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center gap-3 px-4 py-3 text-sm font-medium ${active
                                        ? 'bg-indigo-600 text-white'
                                        : 'text-gray-300 hover:bg-slate-800'
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
                            className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-300 hover:bg-slate-800 w-full text-left"
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
