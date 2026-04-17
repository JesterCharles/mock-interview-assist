'use client';

import type React from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import type { SidebarGroup, SettingsAccordionGroup } from './types';

interface SectionSidebarProps {
  groups: SidebarGroup[];
  sidebarHeader?: string | null;
  settingsGroup?: SettingsAccordionGroup;
  collapsed: boolean;
  mounted: boolean;
}

export function SectionSidebar({ groups, sidebarHeader, settingsGroup, collapsed, mounted }: SectionSidebarProps) {
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem('nlm_settings_open');
    if (stored === 'true') setSettingsOpen(true);
  }, []);

  const toggleSettings = () => {
    setSettingsOpen((o) => {
      const next = !o;
      localStorage.setItem('nlm_settings_open', String(next));
      return next;
    });
  };

  const isItemActive = (href: string) => {
    if (href === '/trainer') return pathname === '/trainer';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <aside
      suppressHydrationWarning
      className="hidden md:flex flex-col shrink-0 overflow-hidden"
      style={{
        width: collapsed ? 48 : 200,
        transition: mounted ? 'width 200ms ease-in-out' : 'none',
        background: 'var(--surface-muted)',
        borderRight: '1px solid var(--border)',
        height: '100%',
        minHeight: 0,
      }}
    >
      {/* NLM wordmark — top corner of sidebar, aligns with TopBar baseline */}
      <Link
        href="/trainer"
        style={{
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          paddingLeft: collapsed ? 0 : 16,
          paddingRight: collapsed ? 0 : 16,
          borderBottom: '1px solid var(--border)',
          fontFamily: 'var(--font-display), "Clash Display", sans-serif',
          fontWeight: 500,
          fontSize: 16,
          color: 'var(--ink)',
          textDecoration: 'none',
          letterSpacing: '-0.01em',
          flexShrink: 0,
        }}
      >
        NLM
      </Link>

      <nav
        className="overflow-y-auto py-4"
        style={{ display: 'flex', flexDirection: 'column', flex: 1 }}
      >
        {/* Cohort header — shown when sidebarHeader is set and sidebar is expanded */}
        {!collapsed && sidebarHeader && (
          <div
            style={{
              padding: '0 12px 8px',
              fontSize: 12,
              fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
              fontWeight: 500,
              color: 'var(--muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            {`Cohort: ${sidebarHeader}`}
          </div>
        )}
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

        {/* Settings accordion — pinned to bottom of nav */}
        {settingsGroup && (
          <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
            {collapsed ? (
              /* Collapsed: icon expands sidebar + opens accordion */
              <button
                title="Settings"
                aria-label="Settings"
                onClick={() => {
                  setSettingsOpen(true);
                  localStorage.setItem('nlm_settings_open', 'true');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  padding: '8px 0',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--ink)',
                }}
                className="hover:bg-[var(--highlight)]"
              >
                <settingsGroup.icon style={{ width: 16, height: 16 }} aria-hidden="true" />
              </button>
            ) : (
              /* Expanded sidebar: full accordion */
              <>
                <button
                  onClick={toggleSettings}
                  aria-expanded={settingsOpen}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    width: 'calc(100% - 12px)',
                    gap: 8,
                    padding: '6px 12px',
                    margin: '1px 6px',
                    borderRadius: 6,
                    fontSize: 13,
                    fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
                    fontWeight: 500,
                    color: 'var(--ink)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                  className="hover:bg-[var(--highlight)]"
                >
                  <settingsGroup.icon
                    style={{ width: 16, height: 16, flexShrink: 0 }}
                    aria-hidden="true"
                  />
                  <span style={{ flex: 1, textAlign: 'left' }}>{settingsGroup.label}</span>
                  <ChevronDown
                    style={{
                      width: 14,
                      height: 14,
                      flexShrink: 0,
                      transform: settingsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 150ms ease-out',
                    }}
                    aria-hidden="true"
                  />
                </button>

                <div
                  style={{
                    maxHeight: settingsOpen ? '300px' : 0,
                    overflow: 'hidden',
                    transition: 'max-height 150ms ease-out',
                  }}
                >
                  {settingsGroup.items.map((item) => {
                    const Icon = item.icon;
                    const subItemStyle: React.CSSProperties = {
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '5px 12px 5px 20px',
                      margin: '1px 6px',
                      borderRadius: 6,
                      fontSize: 13,
                      fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
                      fontWeight: 500,
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textDecoration: 'none',
                      width: 'calc(100% - 12px)',
                    };

                    if (item.href) {
                      const active = isItemActive(item.href);
                      return (
                        <Link
                          key={item.label}
                          href={item.href}
                          style={{
                            ...subItemStyle,
                            color: active ? 'var(--accent)' : 'var(--ink)',
                            borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
                          }}
                          className="hover:bg-[var(--highlight)]"
                        >
                          <Icon style={{ width: 14, height: 14, flexShrink: 0 }} aria-hidden="true" />
                          <span>{item.label}</span>
                        </Link>
                      );
                    }

                    return (
                      <button
                        key={item.label}
                        onClick={item.action}
                        style={{ ...subItemStyle, color: 'var(--ink)' }}
                        className="hover:bg-[var(--highlight)]"
                      >
                        <Icon style={{ width: 14, height: 14, flexShrink: 0 }} aria-hidden="true" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </nav>

    </aside>
  );
}
