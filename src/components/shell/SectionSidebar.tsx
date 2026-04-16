'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { SidebarGroup } from './types';

interface SectionSidebarProps {
  groups: SidebarGroup[];
}

export function SectionSidebar({ groups }: SectionSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // Hydrate from localStorage — no SSR flash
  useEffect(() => {
    const stored = localStorage.getItem('nlm_sidebar_collapsed');
    if (stored === 'true') setCollapsed(true);
  }, []);

  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem('nlm_sidebar_collapsed', String(next));
      return next;
    });
  };

  const isItemActive = (href: string) => {
    if (href === '/trainer') return pathname === '/trainer';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <aside
      className="hidden md:flex flex-col shrink-0 overflow-hidden"
      style={{
        width: collapsed ? 48 : 200,
        transition: 'width 200ms ease-in-out',
        background: 'var(--surface-muted)',
        borderRight: '1px solid var(--border)',
        minHeight: 0,
        position: 'sticky',
        top: 56,
        height: 'calc(100vh - 56px)',
      }}
    >
      <nav className="flex-1 overflow-y-auto py-4">
        {groups.map((group) => (
          <div key={group.label} style={{ marginBottom: 16 }}>
            {/* Group label — hidden when collapsed */}
            {!collapsed && (
              <div
                style={{
                  padding: '0 12px 4px',
                  fontSize: 12,
                  fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
                  fontWeight: 500,
                  color: 'var(--muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                {group.label}
              </div>
            )}

            {/* Items */}
            {group.items.map((item) => {
              const active = isItemActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: collapsed ? 0 : 8,
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    padding: collapsed ? '8px 0' : '6px 12px',
                    margin: '1px 6px',
                    borderRadius: 6,
                    fontSize: 13,
                    fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
                    fontWeight: 500,
                    color: active ? 'var(--accent)' : 'var(--ink)',
                    background: 'transparent',
                    borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
                    transition: 'background 150ms ease-out, color 150ms ease-out',
                    textDecoration: 'none',
                  }}
                  className="hover:bg-[var(--highlight)]"
                >
                  <Icon
                    className="shrink-0"
                    style={{ width: 16, height: 16, color: active ? 'var(--accent)' : 'var(--ink)' }}
                    aria-hidden="true"
                  />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={toggle}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '12px',
          borderTop: '1px solid var(--border)',
          background: 'transparent',
          color: 'var(--muted)',
          cursor: 'pointer',
          border: 'none',
          borderTopColor: 'var(--border)',
          borderTopWidth: 1,
          borderTopStyle: 'solid',
          width: '100%',
        }}
        className="hover:bg-[var(--highlight)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4" aria-hidden="true" />
        ) : (
          <ChevronLeft className="w-4 h-4" aria-hidden="true" />
        )}
      </button>
    </aside>
  );
}
