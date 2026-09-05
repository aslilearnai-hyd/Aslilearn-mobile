import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { COLORS, FONT, RADIUS, SPACING } from '../../../theme';

type Props = {
  progress: number;
  color?: string;
  height?: number;
  label?: string;
  showPercent?: boolean;
};

export default function ProgressBar({
  progress,
  color = COLORS.primary,
  height = 8,
  label,
  showPercent = true,
}: Props) {
  const clamped = Math.min(100, Math.max(0, progress));
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(clamped, { duration: 600 });
  }, [clamped, width]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }));

  return (
    <View style={styles.wrap}>
      {label || showPercent ? (
        <View style={styles.labelRow}>
          {label ? <Text style={styles.label}>{label}</Text> : <View />}
          {showPercent ? <Text style={styles.percent}>{Math.round(clamped)}%</Text> : null}
        </View>
      ) : null}
      <View style={[styles.track, { height, borderRadius: height / 2 }]}>
        <Animated.View style={[styles.fill, { backgroundColor: color, height, borderRadius: height / 2 }, barStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  label: {
    fontSize: FONT.sm,
    fontWeight: FONT.semibold,
    color: COLORS.text,
  },
  percent: {
    fontSize: FONT.sm,
    fontWeight: FONT.bold,
    color: COLORS.textSecondary,
  },
  track: {
    backgroundColor: COLORS.divider,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
