import React from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT, RADIUS, SPACING } from '../../theme';
import { GLASS_RIM, GLASS_ROW, GLASS_SHADOW, glassFillColor } from '../../theme/glass';

export type TabItem = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon?: keyof typeof Ionicons.glyphMap;
};

type Props = {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  roleColor?: string;
};

export default function BottomTabBar({ tabs, activeTab, onTabChange, roleColor = COLORS.primary }: Props) {
  const { width } = useWindowDimensions();
  const compact = width < 380;

  return (
    <View style={styles.wrap}>
      <View style={styles.bar}>
        {tabs.map((tab) => {
          const active = tab.id === activeTab;
          const iconName = active && tab.activeIcon ? tab.activeIcon : tab.icon;
          return (
            <Pressable
              key={tab.id}
              onPress={() => onTabChange(tab.id)}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: active }}
              style={styles.tab}
            >
              <View
                style={[
                  styles.pill,
                  active && {
                    backgroundColor: GLASS_ROW.fillStrong,
                    borderColor: `${roleColor}55`,
                  },
                ]}
              >
                <Ionicons
                  name={iconName}
                  size={compact ? 18 : 20}
                  color={active ? roleColor : COLORS.textMuted}
                />
                {!compact ? (
                  <Text
                    style={[
                      styles.label,
                      active
                        ? { color: roleColor, fontWeight: FONT.bold }
                        : styles.inactiveLabel,
                    ]}
                    numberOfLines={1}
                  >
                    {tab.label}
                  </Text>
                ) : null}
              </View>
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
    left: SPACING.lg,
    right: SPACING.lg,
    bottom: SPACING.lg,
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: glassFillColor('medium'),
    borderRadius: RADIUS.xl,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    borderWidth: 1,
    borderColor: GLASS_RIM.border,
    overflow: 'hidden',
    ...GLASS_SHADOW.soft,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  label: {
    fontSize: 12,
    fontWeight: FONT.medium,
  },
  inactiveLabel: {
    color: COLORS.textMuted,
  },
});
