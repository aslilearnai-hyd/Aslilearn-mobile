import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSuperAdminTheme } from './useSuperAdminTheme';
import type { SuperAdminView } from '../_components/SuperAdminNavDrawer';

const TAB_BAR_VIEWS = ['dashboard', 'admins', 'analytics', 'vidya-ai', 'settings'] as const;
export type SuperAdminTabBarView = (typeof TAB_BAR_VIEWS)[number];

type Tab = {
  id: SuperAdminTabBarView;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
};

const TABS: Tab[] = [
  { id: 'dashboard', label: 'Overview', icon: 'bar-chart-outline', activeIcon: 'bar-chart' },
  { id: 'admins', label: 'Schools', icon: 'shield-outline', activeIcon: 'shield' },
  { id: 'analytics', label: 'Analytics', icon: 'stats-chart-outline', activeIcon: 'stats-chart' },
  { id: 'vidya-ai', label: 'Vidya AI', icon: 'sparkles-outline', activeIcon: 'sparkles' },
  { id: 'settings', label: 'Settings', icon: 'settings-outline', activeIcon: 'settings' },
];

const ORANGE = '#F97316';
const ORANGE_MUTED = 'rgba(249, 115, 22, 0.15)';
const ORANGE_BORDER = 'rgba(249, 115, 22, 0.22)';

type Props = {
  activeView: SuperAdminView;
  onTabChange: (id: SuperAdminView) => void;
};

/** Solid footer-style tab bar — no BlurView / elevation over scroll. */
export default function SuperAdminTabBar({ activeView, onTabChange }: Props) {
  const { colors } = useSuperAdminTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]} pointerEvents="box-none">
      <View
        style={[
          styles.bar,
          {
            backgroundColor: '#FFFFFF',
            borderColor: ORANGE_BORDER,
          },
        ]}
      >
        {TABS.map((tab) => {
          const active = tab.id === activeView;
          return (
            <Pressable
              key={tab.id}
              onPress={() => onTabChange(tab.id)}
              style={[styles.tab, active && { backgroundColor: ORANGE_MUTED }]}
              accessibilityLabel={tab.label}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Ionicons
                name={active ? tab.activeIcon : tab.icon}
                size={22}
                color={active ? ORANGE : colors.textMuted}
              />
              <Text style={[styles.label, { color: active ? ORANGE : colors.textMuted }]}>
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
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 12,
    zIndex: 50,
  },
  bar: {
    borderRadius: 9999,
    borderWidth: 1,
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
