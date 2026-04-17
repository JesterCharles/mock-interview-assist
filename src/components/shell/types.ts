import type React from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type IconComponent = React.ComponentType<any>;

export interface SidebarItem {
  href: string;
  label: string;
  icon: IconComponent;
}

export interface SidebarGroup {
  label: string;
  items: SidebarItem[];
}

export interface SettingsSubItem {
  label: string;
  icon: IconComponent;
  href?: string;
  action?: () => void;
}

export interface SettingsAccordionGroup {
  label: string;
  icon: IconComponent;
  items: SettingsSubItem[];
}
