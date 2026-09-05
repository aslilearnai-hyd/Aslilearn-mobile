import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../../theme';

type Props = {
  rows?: number;
  style?: ViewStyle;
  variant?: 'cards' | 'list' | 'stats';
};

function SkeletonBlock({ style }: { style?: ViewStyle }) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.35, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return <Animated.View style={[styles.block, style, { opacity }]} />;
}

export default function LoadingState({ rows = 3, style, variant = 'cards' }: Props) {
  if (variant === 'stats') {
    return (
      <View style={[styles.wrap, style]}>
        <View style={styles.statsRow}>
          <SkeletonBlock style={styles.statCard} />
          <SkeletonBlock style={styles.statCard} />
        </View>
        <SkeletonBlock style={styles.card} />
        <SkeletonBlock style={styles.cardTall} />
      </View>
    );
  }

  if (variant === 'list') {
    return (
      <View style={[styles.wrap, style]}>
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonBlock key={i} style={styles.listItem} />
        ))}
      </View>
    );
  }

  return (
    <View style={[styles.wrap, style]}>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonBlock key={i} style={i === 0 ? styles.cardTall : styles.card} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  block: {
    backgroundColor: COLORS.divider,
    borderRadius: RADIUS.md,
  },
  card: {
    height: 100,
    borderRadius: RADIUS.lg,
  },
  cardTall: {
    height: 160,
    borderRadius: RADIUS.lg,
  },
  listItem: {
    height: 72,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  statCard: {
    flex: 1,
    height: 90,
    borderRadius: RADIUS.lg,
  },
});
