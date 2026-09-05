import React, { ReactNode, useMemo } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useAdminTheme } from './useAdminTheme';

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Ignored — enter animations disabled for scroll FPS (kept for call-site compat). */
  delay?: number;
  /** Ignored — cards never animate on mount. */
  noAnimation?: boolean;
};

/**
 * Style keys that govern how the CHILDREN are laid out (plus padding).
 * Outer view owns border/background; inner owns flex/gap/padding.
 */
const INNER_STYLE_KEYS: readonly string[] = [
  'flexDirection',
  'flexWrap',
  'alignItems',
  'alignContent',
  'justifyContent',
  'gap',
  'rowGap',
  'columnGap',
  'padding',
  'paddingTop',
  'paddingBottom',
  'paddingLeft',
  'paddingRight',
  'paddingHorizontal',
  'paddingVertical',
  'paddingStart',
  'paddingEnd',
];

function splitCardStyle(flat: ViewStyle) {
  const outer: Record<string, unknown> = {};
  const inner: Record<string, unknown> = {};
  Object.entries(flat).forEach(([key, value]) => {
    if (INNER_STYLE_KEYS.includes(key)) inner[key] = value;
    else outer[key] = value;
  });
  return { outer: outer as ViewStyle, inner: inner as ViewStyle };
}

/**
 * Opaque admin card — solid white, no BlurView / GlassPanel / Reanimated.
 * Frosted glass over AppBackground was the primary scroll-jank source on iOS.
 */
export default function AdminGlassCard({ children, style }: Props) {
  const { colors, radius, spacing } = useAdminTheme();

  const { outer, inner } = useMemo(() => {
    const flat = (StyleSheet.flatten([{ padding: spacing.md }, style]) ?? {}) as ViewStyle;
    return splitCardStyle(flat);
  }, [style, spacing.md]);

  const cardRadius = (outer.borderRadius as number | undefined) ?? radius.lg;

  return (
    <View
      style={[
        styles.card,
        {
          borderRadius: cardRadius,
          backgroundColor: colors.surface,
          borderColor: colors.surfaceBorder,
        },
        outer,
      ]}
    >
      <View style={[styles.inner, inner]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderWidth: 1,
    overflow: 'hidden',
  },
  inner: {
    flexDirection: 'column',
  },
});
