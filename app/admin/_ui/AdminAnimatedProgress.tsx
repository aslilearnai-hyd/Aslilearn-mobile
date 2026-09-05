import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAdminTheme } from './useAdminTheme';

type Props = {
  label: string;
  value: number;
  max?: number;
  color?: string;
  showLabel?: boolean;
  height?: number;
};

/** Lightweight static progress — no Reanimated (safer under scroll). */
export default function AdminAnimatedProgress({
  label,
  value,
  max = 100,
  color,
  showLabel = true,
  height = 8,
}: Props) {
  const { colors, radius } = useAdminTheme();
  const fillColor = color ?? colors.primary;
  const pct = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <View style={styles.wrap}>
      {showLabel ? (
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: colors.textSecondary }]} numberOfLines={1}>
            {label}
          </Text>
          <Text style={[styles.value, { color: colors.text }]}>{Math.round(value)}%</Text>
        </View>
      ) : null}
      <View
        style={[
          styles.track,
          {
            height,
            borderRadius: radius.full,
            backgroundColor: colors.bgElevated,
          },
        ]}
      >
        <View
          style={{
            width: `${pct}%`,
            height: '100%',
            backgroundColor: fillColor,
            borderRadius: radius.full,
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  value: {
    fontSize: 13,
    fontWeight: '700',
  },
  track: {
    overflow: 'hidden',
    width: '100%',
  },
});
