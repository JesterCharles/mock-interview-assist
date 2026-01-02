'use client';

// Global navigation bar component - simplified

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
    Home,
    FileText,
    History,
    Menu,
    X
} from 'lucide-react';
import { useState } from 'react';

interface NavItem {
    href: string;
    label: string;
    icon: React.ReactNode;
}

export default function Navbar() {
    const pathname = usePathname();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const navItems: NavItem[] = [
        {
            href: '/',
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

    return (
        <nav className="bg-slate-900 border-b border-slate-700 sticky top-0 z-50">
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between h-14">
                    {/* Logo / Brand */}
                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <FileText className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-semibold text-white hidden sm:block">Interview Assessment</span>
                    </Link>

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
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="md:hidden p-2 text-gray-400 hover:text-white"
                    >
                        {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>

                {/* Mobile Navigation */}
                {mobileMenuOpen && (
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
                    </div>
                )}
            </div>
        </nav>
    );
}
