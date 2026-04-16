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
} from 'lucide-react';
import type { SidebarGroup } from './types';

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
    ],
  },
];

export const settingsSidebarGroups: SidebarGroup[] = [
  {
    label: 'Settings',
    items: [
      { href: '/trainer/settings/threshold', label: 'Threshold', icon: Sliders },
      { href: '/trainer/settings/cohorts', label: 'Cohorts', icon: Users2 },
      { href: '/trainer/settings/curriculum', label: 'Curriculum', icon: BookOpen },
      { href: '/trainer/settings/users', label: 'Users', icon: UserCog },
      { href: '/trainer/settings/associates', label: 'Associates', icon: User },
    ],
  },
];
