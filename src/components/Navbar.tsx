'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
    LayoutDashboard,
    PlayCircle,
    FileText,
    History,
    Menu,
    X,
    LogIn,
    LogOut,
    User,
    Zap,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { ThemeToggle } from '@/components/ThemeToggle';

interface NavItem {
    href: string;
    label: string;
    icon: React.ReactNode;
}

type Role = 'anonymous' | 'trainer' | 'associate';

export default function Navbar() {
    const pathname = usePathname();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { isAuthenticated: isTrainer, isLoading, logout } = useAuth();
    const [associateSlug, setAssociateSlug] = useState<string | null>(null);

    // Self-fetch associate identity (cookie-only) so the navbar can adapt.
    // No-op + null when anonymous or trainer.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch('/api/associate/me', { cache: 'no-store' });
                if (!res.ok) {
                    if (!cancelled) setAssociateSlug(null);
                    return;
                }
                const data = (await res.json()) as { slug?: string };
                if (!cancelled) setAssociateSlug(data.slug ?? null);
            } catch {
                if (!cancelled) setAssociateSlug(null);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [pathname]);

    // Trainer takes precedence; the same browser can hold both cookies (e.g.,
    // trainer demoing the associate flow), and trainer chrome is the more
    // useful surface in that case.
    const role: Role = isTrainer ? 'trainer' : associateSlug ? 'associate' : 'anonymous';

    const trainerItems: NavItem[] = [
        { href: '/trainer', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
        { href: '/interview/new', label: 'New Interview', icon: <PlayCircle className="w-4 h-4" /> },
        { href: '/question-banks', label: 'Question Banks', icon: <FileText className="w-4 h-4" /> },
        { href: '/history', label: 'History', icon: <History className="w-4 h-4" /> },
    ];

    const associateItems: NavItem[] = associateSlug
        ? [
              { href: `/associate/${associateSlug}`, label: 'Profile', icon: <User className="w-4 h-4" /> },
              {
                  href: `/associate/${associateSlug}/interview`,
                  label: 'New Interview',
                  icon: <PlayCircle className="w-4 h-4" /> ,
              },
          ]
        : [];

    const navItems: NavItem[] =
        role === 'trainer' ? trainerItems : role === 'associate' ? associateItems : [];

    const isItemActive = (item: NavItem) => {
        if (item.href === '/trainer') {
            return pathname === '/trainer' || pathname.startsWith('/trainer/');
        }
        return pathname === item.href;
    };

    const handleTrainerLogout = async () => {
        await logout();
        window.location.href = '/signin';
    };

    const handleAssociateLogout = async () => {
        try {
            await fetch('/api/associate/logout', { method: 'POST' });
        } catch {
            // ignore — still navigate away
        }
        setAssociateSlug(null);
        window.location.href = '/';
    };

    const brandHref = role === 'trainer' ? '/trainer' : role === 'associate' && associateSlug ? `/associate/${associateSlug}` : '/';

    return (
        <nav
            className="bg-[var(--surface)] border-b border-[var(--border)] sticky top-0 z-50"
        >
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between h-14">
                    {/* Logo / Brand */}
                    <Link href={brandHref} className="flex items-center gap-2.5 group">
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

                    {isLoading ? (
                        <div className="text-[var(--muted)] text-sm">Loading...</div>
                    ) : role === 'anonymous' ? (
                        <div className="flex items-center gap-3">
                            <ThemeToggle />
                            <Link
                                href="/signin"
                                className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-[var(--surface)] border border-[var(--border)] text-[var(--ink)] hover:bg-[var(--highlight)] transition-colors duration-150"
                            >
                                <LogIn className="w-4 h-4" />
                                Sign in
                            </Link>
                        </div>
                    ) : (
                        <>
                            {/* Desktop Navigation */}
                            <div className="hidden md:flex items-center gap-1">
                                {navItems.map((item) => {
                                    const active = isItemActive(item);
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 ${
                                                active
                                                    ? 'bg-[var(--highlight)] text-[var(--accent)]'
                                                    : 'text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--highlight)]'
                                            }`}
                                        >
                                            {item.icon}
                                            {item.label}
                                        </Link>
                                    );
                                })}
                                <span
                                    className="ml-2 text-xs uppercase tracking-wider px-2 py-1 rounded"
                                    style={{
                                        background: 'var(--highlight)',
                                        color: 'var(--accent)',
                                        fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
                                        fontWeight: 600,
                                        fontSize: 10,
                                        letterSpacing: '0.1em',
                                    }}
                                    title={role === 'trainer' ? 'Signed in as trainer' : 'Signed in as associate'}
                                >
                                    {role}
                                </span>
                                <button
                                    onClick={role === 'trainer' ? handleTrainerLogout : handleAssociateLogout}
                                    className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--highlight)] transition-colors duration-150 ml-2"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Sign out
                                </button>
                                <div className="ml-2"><ThemeToggle /></div>
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
                    )}
                </div>

                {/* Mobile Navigation */}
                {role !== 'anonymous' && mobileMenuOpen && (
                    <div className="md:hidden py-2 border-t border-[var(--border-subtle)] animate-slide-up">
                        {navItems.map((item) => {
                            const active = isItemActive(item);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-md transition-colors duration-150 ${
                                        active
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
                            onClick={role === 'trainer' ? handleTrainerLogout : handleAssociateLogout}
                            className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--highlight)] w-full text-left rounded-md transition-colors duration-150"
                        >
                            <LogOut className="w-4 h-4" />
                            Sign out
                        </button>
                    </div>
                )}
            </div>
        </nav>
    );
}
