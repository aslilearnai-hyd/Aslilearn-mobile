import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { STUDENT, STUDENT_RADIUS } from '../../theme/student';

type Props = {
  width: number | `${number}%`;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
};

const SHIMMER_COLORS = [STUDENT.surfaceBorder, STUDENT.surfaceHover, STUDENT.surfaceBorder] as const;

export default function StudentShimmer({ width, height, borderRadius = 8, style }: Props) {
  const anim = useRef(new Animated.Value(0)).current;
  const numericWidth = typeof width === 'number' ? width : 300;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(anim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-numericWidth, numericWidth],
  });

  return (
    <View
      style={[
        styles.base,
        { width, height, borderRadius, backgroundColor: STUDENT.surfaceBorder },
        style,
      ]}
    >
      <Animated.View style={[styles.shimmerWrap, { transform: [{ translateX }] }]}>
        <LinearGradient
          colors={[...SHIMMER_COLORS]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ width: numericWidth * 2, height }}
        />
      </Animated.View>
    </View>
  );
}

export function ShimmerCard({ style }: { style?: ViewStyle }) {
  return (
    <StudentShimmer
      width="100%"
      height={120}
      borderRadius={STUDENT_RADIUS.card}
      style={style}
    />
  );
}

export function ShimmerRow({ style }: { style?: ViewStyle }) {
  return <StudentShimmer width="70%" height={16} borderRadius={8} style={style} />;
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
  shimmerWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
  },
});
