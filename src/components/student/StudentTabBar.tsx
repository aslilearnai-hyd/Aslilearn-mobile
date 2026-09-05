import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { STUDENT, STUDENT_RADIUS } from '../../theme/student';
import { GLASS_RIM, GLASS_ROW, GLASS_SHADOW, glassFillColor } from '../../theme/glass';

export type StudentTab = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
};

type Props = {
  tabs: StudentTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
};

const TAB_BAR_MAX_WIDTH = 520;
const ICON_SIZE = 20;
const ACTIVE_CIRCLE = 36;

export default function StudentTabBar({ tabs, activeTab, onTabChange }: Props) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const isTablet = windowWidth >= 768;

  const handleTabPress = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onTabChange(id);
  };

  return (
    <View
      style={[
        styles.wrap,
        { paddingBottom: Math.max(insets.bottom, 10) },
        isTablet && styles.wrapTablet,
      ]}
    >
      <View style={[styles.bar, isTablet && styles.barTablet]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={styles.barInner}
        >
        {tabs.map((tab) => {
          const active = tab.id === activeTab;
          const iconName = active ? tab.activeIcon : tab.icon;
          return (
            <Pressable
              key={tab.id}
              onPress={() => handleTabPress(tab.id)}
              style={[styles.tab, tabs.length > 6 && styles.tabCompact]}
              accessibilityLabel={tab.label}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              {active ? (
                <Animated.View entering={FadeIn.duration(180)} style={styles.activeCircle}>
                  <Ionicons name={iconName} size={ICON_SIZE} color={STUDENT.navActiveText} />
                </Animated.View>
              ) : (
                <View style={styles.iconSlot}>
                  <Ionicons name={iconName} size={ICON_SIZE} color={STUDENT.navInactive} />
                </View>
              )}
              <Text
                style={[styles.label, active ? styles.labelActive : styles.labelInactive]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 50,
  },
  wrapTablet: {
    paddingHorizontal: 24,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: glassFillColor('medium'),
    borderRadius: STUDENT_RADIUS.xxl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: GLASS_RIM.border,
    paddingVertical: 6,
    paddingHorizontal: 4,
    ...GLASS_SHADOW.soft,
  },
  barInner: {
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: '100%',
  },
  barTablet: {
    maxWidth: TAB_BAR_MAX_WIDTH,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 2,
    minWidth: 0,
  },
  tabCompact: {
    flexGrow: 1,
    flexShrink: 0,
    minWidth: 58,
    maxWidth: 78,
  },
  activeCircle: {
    width: ACTIVE_CIRCLE,
    height: ACTIVE_CIRCLE,
    borderRadius: ACTIVE_CIRCLE / 2,
    backgroundColor: GLASS_ROW.fillStrong,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(109,91,208,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSlot: {
    width: ACTIVE_CIRCLE,
    height: ACTIVE_CIRCLE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 9,
    textAlign: 'center',
    width: '100%',
    paddingHorizontal: 1,
  },
  labelActive: {
    color: STUDENT.navActiveText,
    fontWeight: '800',
  },
  labelInactive: {
    color: STUDENT.navInactive,
    fontWeight: '600',
  },
});
