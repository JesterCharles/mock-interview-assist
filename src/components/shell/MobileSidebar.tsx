'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import { Menu, X } from 'lucide-react';
import type { SidebarGroup, SettingsAccordionGroup } from './types';

interface MobileSidebarProps {
  groups: SidebarGroup[];
  settingsGroup?: SettingsAccordionGroup;
}

export function MobileSidebar({ groups, settingsGroup }: MobileSidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Auto-close on navigation
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const isItemActive = (href: string) => {
    if (href === '/trainer') return pathname === '/trainer';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          className="md:hidden p-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          aria-label="Open menu"
          style={{ color: 'var(--ink)', background: 'transparent', border: 'none', cursor: 'pointer' }}
        >
          <Menu className="w-5 h-5" aria-hidden="true" />
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-40"
          style={{ background: 'rgba(0,0,0,0.30)' }}
        />
        <Dialog.Content
          className="fixed inset-y-0 left-0 z-50 w-64 flex flex-col focus:outline-none"
          style={{
            background: 'var(--surface)',
            borderRight: '1px solid var(--border)',
          }}
          aria-label="Navigation menu"
        >
          {/* Close button */}
          <Dialog.Close asChild>
            <button
              aria-label="Close menu"
              className="absolute top-4 right-4 p-1 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              style={{
                color: 'var(--muted)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </Dialog.Close>

          {/* Sidebar content */}
          <nav className="flex-1 overflow-y-auto pt-14 pb-4">
            {groups.map((group) => (
              <div key={group.label} style={{ marginBottom: 16 }}>
                {/* Group label */}
                {group.label && (
                  <div
                    style={{
                      padding: '0 16px 4px',
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

                {/* Items — always expanded in mobile sheet */}
                {group.items.map((item) => {
                  const active = isItemActive(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '6px 16px',
                        margin: '1px 8px',
                        borderRadius: 6,
                        fontSize: 13,
                        fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
                        fontWeight: 500,
                        color: active ? 'var(--accent)' : 'var(--ink)',
                        background: 'transparent',
                        borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
                        transition: 'background 150ms ease-out',
                        textDecoration: 'none',
                      }}
                      className="hover:bg-[var(--highlight)]"
                    >
                      <Icon
                        className="shrink-0"
                        style={{ width: 16, height: 16, color: active ? 'var(--accent)' : 'var(--ink)' }}
                        aria-hidden="true"
                      />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            ))}

            {/* Settings sub-items — always expanded in mobile (no accordion) */}
            {settingsGroup && (
              <div style={{ marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                <div
                  style={{
                    padding: '0 16px 4px',
                    fontSize: 12,
                    fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
                    fontWeight: 500,
                    color: 'var(--muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  {settingsGroup.label}
                </div>
                {settingsGroup.items.map((item) => {
                  const Icon = item.icon;
                  const subItemStyle = {
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 16px',
                    margin: '1px 8px',
                    borderRadius: 6,
                    fontSize: 13,
                    fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
                    fontWeight: 500,
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textDecoration: 'none',
                    width: 'calc(100% - 16px)',
                  };

                  if (item.href) {
                    const active = isItemActive(item.href);
                    return (
                      <Link
                        key={item.label}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        style={{
                          ...subItemStyle,
                          color: active ? 'var(--accent)' : 'var(--ink)',
                          borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
                        }}
                        className="hover:bg-[var(--highlight)]"
                      >
                        <Icon
                          className="shrink-0"
                          style={{ width: 16, height: 16, color: active ? 'var(--accent)' : 'var(--ink)' }}
                          aria-hidden="true"
                        />
                        <span>{item.label}</span>
                      </Link>
                    );
                  }

                  return (
                    <button
                      key={item.label}
                      onClick={() => { item.action?.(); setOpen(false); }}
                      style={{ ...subItemStyle, color: 'var(--ink)' }}
                      className="hover:bg-[var(--highlight)]"
                    >
                      <Icon
                        className="shrink-0"
                        style={{ width: 16, height: 16 }}
                        aria-hidden="true"
                      />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </nav>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
