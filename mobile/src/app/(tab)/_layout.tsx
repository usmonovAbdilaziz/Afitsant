import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';

import { sidebarUseStaff } from '../../providers/sidebar-staff';
import { sidebarUseClient } from '@/providers/sidebar-client';

type TabIconProps = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  color: string;
  focused: boolean;
};

function TabIcon({ label, icon, activeIcon, color, focused }: TabIconProps) {
  return (
    <View className="items-center justify-center gap-1">
      <Ionicons name={focused ? activeIcon : icon} size={22} color={color} />
      <Text
        className={focused ? 'text-[11px] font-semibold text-slate-900' : 'text-[11px] text-slate-500'}
      >
        {label}
      </Text>
    </View>
  );
}

export default function StaffTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        sceneStyle: { backgroundColor: '#f8fafc' },
        tabBarActiveTintColor: '#0f172a',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: {
          position: 'absolute',
          left: 14,
          right: 14,
          bottom: 16,
          height: 78,
          paddingTop: 20,
          paddingBottom: 10,
          borderTopWidth: 0,
          borderRadius: 24,
          backgroundColor: '#ffffff',
          shadowColor: '#0f172a',
          shadowOpacity: 0.08,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
          elevation: 10,
        },
        tabBarItemStyle: {
          borderRadius: 20,
        },
        tabBarShowLabel: false,
      }}
    >
      {sidebarUseClient.map((item) => (
        <Tabs.Screen
          key={item.path}
          name={item.path}
          options={{
            title: item.title,
            tabBarIcon: ({ color, focused }) => (
              <TabIcon
                label={item.title}
                icon={item.icon}
                activeIcon={item.activeIcon}
                color={color}
                focused={focused}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
