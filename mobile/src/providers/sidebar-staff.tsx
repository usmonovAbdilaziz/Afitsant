import { Ionicons } from '@expo/vector-icons';

export type StaffSidebarItem = {
  title: string;
  path: 'profile' | 'booking' | 'home' | 'archive' | 'progress';
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
};

export const sidebarUseStaff: StaffSidebarItem[] = [
  {
    title: 'Profile',
    path: 'profile',
    icon: 'person-outline',
    activeIcon: 'person',
  },
  {
    title: 'Booking',
    path: 'booking',
    icon: 'calendar-outline',
    activeIcon: 'calendar',
  },
  {
    title: 'Home',
    path: 'home',
    icon: 'home-outline',
    activeIcon: 'home',
  },
  {
    title: 'Archive',
    path: 'archive',
    icon: 'archive-outline',
    activeIcon: 'archive',
  },
  {
    title: 'Progress',
    path: 'progress',
    icon: 'stats-chart-outline',
    activeIcon: 'stats-chart',
  },
];
