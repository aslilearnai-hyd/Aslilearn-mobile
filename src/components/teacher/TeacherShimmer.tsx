import React, { useEffect } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { TEACHER, TEACHER_RADIUS, TEACHER_SPACING } from '../../theme/teacher';

function ShimmerBlock({ style }: { style?: ViewStyle }) {
  const shimX = useSharedValue(-200);

  useEffect(() => {
    shimX.value = withRepeat(withTiming(200, { duration: 1100 }), -1, false);
  }, [shimX]);

  const shimStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shimX.value }] }));

  return (
    <View style={[styles.block, style]}>
      <Animated.View style={[styles.shimSweep, shimStyle]}>
        <LinearGradient
          colors={['transparent', 'rgba(99,102,241,0.18)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

type Props = {
  variant?: 'card' | 'list' | 'stats';
  count?: number;
};

export default function TeacherShimmer({ variant = 'card', count = 3 }: Props) {
  if (variant === 'stats') {
    return (
      <View style={styles.statsRow}>
        {[0, 1, 2, 3].map((i) => (
          <ShimmerBlock key={i} style={styles.statBlock} />
        ))}
      </View>
    );
  }

  if (variant === 'list') {
    return (
      <View style={styles.list}>
        {Array.from({ length: count }).map((_, i) => (
          <ShimmerBlock key={i} style={styles.listBlock} />
        ))}
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <ShimmerBlock key={i} style={styles.cardBlock} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: TEACHER.surfaceElevated,
    borderRadius: TEACHER_RADIUS.md,
    overflow: 'hidden',
  },
  shimSweep: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 100,
  },
  statsRow: {
    flexDirection: 'row',
    gap: TEACHER_SPACING.md,
    paddingHorizontal: TEACHER_SPACING.lg,
    paddingVertical: TEACHER_SPACING.md,
  },
  statBlock: {
    width: 80,
    height: 72,
    borderRadius: TEACHER_RADIUS.lg,
  },
  list: {
    gap: TEACHER_SPACING.md,
    padding: TEACHER_SPACING.lg,
  },
  listBlock: {
    height: 72,
    borderRadius: TEACHER_RADIUS.lg,
  },
  cardBlock: {
    height: 160,
    borderRadius: TEACHER_RADIUS.card,
  },
});
