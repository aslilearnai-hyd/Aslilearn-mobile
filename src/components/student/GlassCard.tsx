import React from 'react';
import { Pressable, Platform, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { STUDENT, STUDENT_ANIMATION, STUDENT_RADIUS } from '../../theme/student';
import { GLASS_RIM, GLASS_SHADOW } from '../../theme/glass';
import GlassPanel from '../ui/GlassPanel';

type Variant = 'default' | 'elevated' | 'gradient' | 'dark' | 'glass';

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  padding?: number;
  animate?: boolean;
  delay?: number;
  variant?: Variant;
};

const PRESS_SPRING = { damping: 18, stiffness: 260 };

/**
 * Student card wrapper. `variant="glass"` delegates to shared GlassPanel
 * so student/teacher/admin liquid glass stay aligned.
 */
export default function GlassCard({
  children,
  style,
  onPress,
  padding = 16,
  animate = false,
  delay = 0,
  variant = 'default',
}: Props) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const fillsParent =
    !!style &&
    ((style as ViewStyle).height === '100%' ||
      (style as ViewStyle).flex === 1 ||
      (style as ViewStyle).minHeight != null);

  if (variant === 'glass') {
    const glassInner = (
      <GlassPanel
        tone="medium"
        elevated
        style={[styles.glassOuter, fillsParent && styles.cardFillParent, style]}
        contentStyle={{ padding }}
        onPress={onPress}
      >
        {children}
      </GlassPanel>
    );

    if (animate && Platform.OS !== 'android') {
      return (
        <Animated.View
          style={[styles.outer, fillsParent && styles.pressableFill]}
          entering={FadeInDown.duration(STUDENT_ANIMATION.normal).delay(delay)}
        >
          {glassInner}
        </Animated.View>
      );
    }
    return <View style={[styles.outer, fillsParent && styles.pressableFill]}>{glassInner}</View>;
  }

  const variantStyle = getVariantStyle(variant);
  const cardStyle = [
    styles.card,
    variantStyle,
    styles.cardFill,
    fillsParent && styles.cardFillParent,
    { padding },
  ];

  const inner =
    variant === 'gradient' ? (
      <LinearGradient colors={[...STUDENT.cardGradient]} style={cardStyle}>
        {children}
      </LinearGradient>
    ) : (
      <View style={cardStyle}>{children}</View>
    );

  const animatedInner =
    animate && Platform.OS !== 'android' ? (
      <Animated.View entering={FadeInDown.duration(STUDENT_ANIMATION.normal).delay(delay)}>
        {inner}
      </Animated.View>
    ) : (
      inner
    );

  if (onPress) {
    return (
      <Pressable
        style={[styles.pressable, fillsParent && styles.pressableFill, style]}
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.96, PRESS_SPRING);
        }}
        onPressOut={() => {
          scale.value = withSpring(1, PRESS_SPRING);
        }}
        accessibilityRole="button"
      >
        <Animated.View style={[animStyle, fillsParent && styles.pressableInnerFill]}>
          {animatedInner}
        </Animated.View>
      </Pressable>
    );
  }

  if (animate && Platform.OS !== 'android') {
    return (
      <Animated.View
        style={[styles.outer, style]}
        entering={FadeInDown.duration(STUDENT_ANIMATION.normal).delay(delay)}
      >
        {inner}
      </Animated.View>
    );
  }

  return <View style={[styles.outer, style]}>{inner}</View>;
}

function getVariantStyle(variant: Variant): ViewStyle {
  switch (variant) {
    case 'elevated':
      return {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: GLASS_RIM.border,
        ...STUDENT.shadow.soft,
      };
    case 'gradient':
      return {
        borderWidth: 1,
        borderColor: STUDENT.surfaceBorder,
        ...STUDENT.shadow.sm,
      };
    case 'dark':
      return {
        backgroundColor: STUDENT.surfaceDark,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        ...STUDENT.shadow.soft,
      };
    default:
      return {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: GLASS_RIM.border,
        ...GLASS_SHADOW.sm,
      };
  }
}

const styles = StyleSheet.create({
  outer: {
    width: '100%',
    alignSelf: 'stretch',
  },
  pressable: {
    alignSelf: 'flex-start',
  },
  pressableFill: {
    alignSelf: 'stretch',
    height: '100%',
    flex: 1,
  },
  pressableInnerFill: {
    flex: 1,
    width: '100%',
  },
  card: {
    borderRadius: STUDENT_RADIUS.card,
    overflow: 'hidden',
  },
  cardFill: {
    width: '100%',
  },
  cardFillParent: {
    flex: 1,
    minHeight: '100%',
  },
  glassOuter: {
    width: '100%',
  },
});
