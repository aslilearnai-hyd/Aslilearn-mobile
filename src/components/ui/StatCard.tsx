import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONT, RADIUS, SHADOW, SPACING } from '../../theme';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  trend?: number;
  gradient?: readonly [string, string];
  color?: string;
  style?: ViewStyle;
  compact?: boolean;
};

export default function StatCard({
  icon,
  label,
  value,
  trend,
  gradient,
  color = COLORS.primary,
  style,
  compact = false,
}: Props) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [anim]);

  const numericValue = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.]/g, ''));
  const displayValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isNaN(numericValue)) {
      Animated.timing(displayValue, {
        toValue: numericValue,
        duration: 800,
        useNativeDriver: false,
      }).start();
    }
  }, [numericValue, displayValue]);

  const inner = (
    <Animated.View style={[styles.card, compact && styles.compact, { opacity: anim }, style]}>
      <View style={[styles.iconCircle, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={compact ? 18 : 22} color={color} />
      </View>
      <Text style={[styles.label, compact && styles.labelCompact]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.value, compact && styles.valueCompact]}>{value}</Text>
      {trend !== undefined ? (
        <View style={styles.trendRow}>
          <Ionicons
            name={trend >= 0 ? 'trending-up' : 'trending-down'}
            size={14}
            color={trend >= 0 ? COLORS.success : COLORS.danger}
          />
          <Text style={[styles.trendText, { color: trend >= 0 ? COLORS.success : COLORS.danger }]}>
            {Math.abs(trend)}%
          </Text>
        </View>
      ) : null}
    </Animated.View>
  );

  if (gradient) {
    return (
      <LinearGradient colors={[...gradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.gradientWrap, compact && styles.compact]}>
        <View style={styles.gradientInner}>
          <Ionicons name={icon} size={compact ? 18 : 22} color={COLORS.textInverse} />
          <Text style={[styles.labelLight, compact && styles.labelCompact]} numberOfLines={1}>
            {label}
          </Text>
          <Text style={[styles.valueLight, compact && styles.valueCompact]}>{value}</Text>
        </View>
      </LinearGradient>
    );
  }

  return inner;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 130,
    ...SHADOW.sm,
  },
  compact: {
    minWidth: 110,
    padding: SPACING.md,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  label: {
    fontSize: FONT.sm,
    color: COLORS.textMuted,
    fontWeight: FONT.medium,
    marginBottom: SPACING.xs,
  },
  labelCompact: {
    fontSize: FONT.xs,
  },
  value: {
    fontSize: FONT.xxl,
    fontWeight: FONT.extrabold,
    color: COLORS.text,
  },
  valueCompact: {
    fontSize: FONT.xl,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: SPACING.xs,
  },
  trendText: {
    fontSize: FONT.sm,
    fontWeight: FONT.semibold,
  },
  gradientWrap: {
    borderRadius: RADIUS.lg,
    minWidth: 130,
    ...SHADOW.md,
  },
  gradientInner: {
    padding: SPACING.lg,
  },
  labelLight: {
    fontSize: FONT.sm,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: FONT.medium,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  valueLight: {
    fontSize: FONT.xxl,
    fontWeight: FONT.extrabold,
    color: COLORS.textInverse,
  },
});
