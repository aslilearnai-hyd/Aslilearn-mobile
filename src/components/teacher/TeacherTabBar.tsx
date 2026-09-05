import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { TEACHER, TEACHER_RADIUS, TEACHER_SPACING } from '../../theme/teacher';
import { glassFillColor } from '../../theme/glass';

export type TeacherTab = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
};

type Props = {
  tabs: TeacherTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  /** Render as a frosted-glass pill over a colourful backdrop instead of a solid one. */
  glass?: boolean;
};

const SPRING = { damping: 16, stiffness: 280 };

function TabButton({
  tab,
  active,
  onPress,
}: {
  tab: TeacherTab;
  active: boolean;
  onPress: () => void;
}) {
  const iconName = active ? tab.activeIcon : tab.icon;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      style={styles.tab}
      accessibilityLabel={tab.label}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <View style={[styles.iconSlot, active && styles.iconGlow]}>
        <Ionicons
          name={iconName}
          size={20}
          color={active ? TEACHER.navActiveText : TEACHER.navInactive}
        />
      </View>
      <Text style={[styles.label, active ? styles.labelActive : styles.labelInactive]} numberOfLines={1}>
        {tab.label}
      </Text>
    </Pressable>
  );
}

export default function TeacherTabBar({ tabs, activeTab, onTabChange, glass = true }: Props) {
  const insets = useSafeAreaInsets();
  const [barWidth, setBarWidth] = useState(0);
  const activeIndex = Math.max(0, tabs.findIndex((t) => t.id === activeTab));
  const indicatorX = useSharedValue(0);
  const tabWidth = barWidth > 0 ? barWidth / tabs.length : 0;

  useEffect(() => {
    indicatorX.value = withSpring(activeIndex, SPRING);
  }, [activeIndex, indicatorX]);

  const slideStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value * tabWidth }],
    width: Math.max(tabWidth - 6, 0),
  }));

  return (
    <View style={[styles.wrap, glass && styles.wrapGlass, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <LinearGradient
        colors={['transparent', TEACHER.primary + '60', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.topGlow}
      />
      <View style={[styles.bar, glass && styles.barGlass]} onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}>
        {tabWidth > 0 ? (
          <Animated.View style={[styles.indicator, slideStyle, { left: 3 }]}>
            <LinearGradient
              colors={[TEACHER.primary + '38', TEACHER.primaryDark + '28']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        ) : null}
        {tabs.map((tab) => (
          <TabButton
            key={tab.id}
            tab={tab}
            active={tab.id === activeTab}
            onPress={() => onTabChange(tab.id)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: TEACHER_SPACING.md,
    right: TEACHER_SPACING.md,
    bottom: 0,
    zIndex: 50,
  },
  wrapGlass: {
    shadowColor: '#475569',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 6,
  },
  topGlow: {
    height: 1,
    marginHorizontal: 20,
    marginBottom: 2,
    borderRadius: 1,
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: TEACHER.tabBarBg,
    borderRadius: TEACHER_RADIUS.pill,
    borderWidth: 1,
    borderColor: TEACHER.tabBarBorder,
    paddingVertical: TEACHER_SPACING.sm,
    ...TEACHER.shadow.lg,
  },
  barGlass: {
    backgroundColor: glassFillColor('medium'),
    borderColor: 'rgba(255,255,255,0.55)',
    overflow: 'hidden',
    shadowOpacity: 0,
    elevation: 0,
  },
  indicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    borderRadius: TEACHER_RADIUS.lg,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: TEACHER_SPACING.xs,
    gap: 2,
    zIndex: 1,
  },
  iconSlot: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGlow: {
    shadowColor: TEACHER.primary,
    shadowOpacity: 0.7,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  label: {
    fontSize: 10,
  },
  labelActive: {
    color: TEACHER.navActiveText,
    fontWeight: '800',
  },
  labelInactive: {
    color: TEACHER.navInactive,
    fontWeight: '600',
  },
});
