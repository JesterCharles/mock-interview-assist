import {
  Users,
  BarChart2,
  Scale,
  PlayCircle,
  FileText,
  Sliders,
  Users2,
  BookOpen,
  UserCog,
  User,
  LayoutDashboard,
  Upload,
  Settings,
  Shield,
} from 'lucide-react';
import type { SidebarGroup, SettingsAccordionGroup } from './types';

export const dashboardSidebarGroups: SidebarGroup[] = [
  {
    label: 'Overview',
    items: [
      { href: '/trainer', label: 'Roster', icon: Users },
      { href: '/trainer/gap-analysis', label: 'Gap Analysis', icon: BarChart2 },
      { href: '/trainer/calibration', label: 'Calibration', icon: Scale },
    ],
  },
  {
    label: 'Actions',
    items: [
      { href: '/interview/new', label: 'New Mock', icon: PlayCircle },
      { href: '/trainer/reports', label: 'Reports', icon: FileText },
      { href: '/trainer/onboarding', label: 'Batch Upload', icon: Upload },
    ],
  },
];

export function associateSidebarGroups(slug: string): SidebarGroup[] {
  return [
    {
      label: '',
      items: [
        { href: `/associate/${slug}/dashboard`, label: 'Dashboard', icon: LayoutDashboard },
        { href: '/', label: 'Interviews', icon: PlayCircle },
        { href: `/associate/${slug}/curriculum`, label: 'Curriculum', icon: BookOpen },
      ],
    },
  ];
}

export const trainerSettingsAccordion: SettingsAccordionGroup = {
  label: 'Settings',
  icon: Settings,
  items: [
    { href: '/trainer/settings/threshold', label: 'Threshold', icon: Sliders },
    { href: '/trainer/settings/cohorts', label: 'Cohorts', icon: Users2 },
    { href: '/trainer/settings/curriculum', label: 'Curriculum', icon: BookOpen },
    { href: '/trainer/settings/users', label: 'Users', icon: UserCog },
    { href: '/trainer/settings/associates', label: 'Associates', icon: User },
  ],
};

export function associateSettingsAccordion(
  onOpenProfile?: () => void,
  onOpenSecurity?: () => void,
): SettingsAccordionGroup {
  return {
    label: 'Settings',
    icon: Settings,
    items: [
      { label: 'Profile', icon: User, action: onOpenProfile },
      { label: 'Security', icon: Shield, action: onOpenSecurity },
    ],
  };
}
