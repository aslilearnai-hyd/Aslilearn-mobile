import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAdminTheme } from './useAdminTheme';
import type { AdminNavView } from '../_components/AdminNavDrawer';

const TAB_BAR_VIEWS = ['overview', 'students', 'classes', 'teachers', 'vidya-ai'] as const;
export type AdminTabBarView = (typeof TAB_BAR_VIEWS)[number];

type Tab = {
  id: AdminTabBarView;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
};

const TABS: Tab[] = [
  { id: 'overview', label: 'Dashboard', icon: 'bar-chart-outline', activeIcon: 'bar-chart' },
  { id: 'students', label: 'Students', icon: 'people-outline', activeIcon: 'people' },
  { id: 'classes', label: 'Classes', icon: 'school-outline', activeIcon: 'school' },
  { id: 'teachers', label: 'Teachers', icon: 'person-circle-outline', activeIcon: 'person-circle' },
  { id: 'vidya-ai', label: 'Vidya AI', icon: 'sparkles-outline', activeIcon: 'sparkles' },
];

type Props = {
  activeView: AdminNavView;
  onTabChange: (id: AdminNavView) => void;
};

/**
 * Fixed footer tab bar — lives in dashboard layout flow (not absolute),
 * so scrolling content above it cannot move this bar.
 */
export default function AdminTabBar({ activeView, onTabChange }: Props) {
  const { colors } = useAdminTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingBottom: Math.max(insets.bottom, 10),
          backgroundColor: 'transparent',
        },
      ]}
    >
      <View
        style={[
          styles.bar,
          {
            backgroundColor: '#FFFFFF',
            borderColor: colors.primaryLight,
          },
        ]}
      >
        {TABS.map((tab) => {
          const active = tab.id === activeView;
          return (
            <Pressable
              key={tab.id}
              onPress={() => onTabChange(tab.id)}
              style={[styles.tab, active && { backgroundColor: colors.primaryMuted }]}
              accessibilityLabel={tab.label}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Ionicons
                name={active ? tab.activeIcon : tab.icon}
                size={22}
                color={active ? colors.primary : colors.textMuted}
              />
              <Text style={[styles.label, { color: active ? colors.primary : colors.textMuted }]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexShrink: 0,
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  bar: {
    borderRadius: 9999,
    borderWidth: 1.5,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    borderRadius: 9999,
    marginHorizontal: 2,
    gap: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
  },
});
