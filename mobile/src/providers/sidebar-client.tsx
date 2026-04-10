import { Ionicons } from '@expo/vector-icons';

export type StaffSidebarItem = {
  title: string;
  path: 'profile' | 'booking' | 'home' | 'archive' | 'progress';
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
};

export const sidebarUseClient: StaffSidebarItem[] = [
  {
    title: 'Booking',
    path: 'booking',
    icon: 'calendar-outline',
    activeIcon: 'calendar',
  },
  {
    title: 'Archive',
    path: 'archive',
    icon: 'archive-outline',
    activeIcon: 'archive',
  },
  {
    title: 'Home',
    path: 'home',
    icon: 'home-outline',
    activeIcon: 'home',
  },

  {
    title: 'Progress',
    path: 'progress',
    icon: 'stats-chart-outline',
    activeIcon: 'stats-chart',
  },
  {
    title: 'Profile',
    path: 'profile',
    icon: 'person-outline',
    activeIcon: 'person',
  },
];
