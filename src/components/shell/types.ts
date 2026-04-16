import type React from 'react';

export interface SidebarItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface SidebarGroup {
  label: string;
  items: SidebarItem[];
}
