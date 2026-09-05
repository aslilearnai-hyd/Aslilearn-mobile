import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useAdminTheme } from './useAdminTheme';

type Props = {
  width?: number | `${number}%`;
  height?: number;
  style?: ViewStyle;
  borderRadius?: number;
};

/** Static skeleton — no Reanimated (avoids Animated import crashes / scroll jank). */
export function AdminSkeletonBox({ width = '100%', height = 16, style, borderRadius = 8 }: Props) {
  const { colors } = useAdminTheme();

  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.skeleton,
          opacity: 0.7,
        },
        style,
      ]}
    />
  );
}

export function AdminSkeletonStats() {
  const { spacing } = useAdminTheme();
  return (
    <View style={{ gap: spacing.sm, padding: spacing.md, backgroundColor: '#F4F7F2', flex: 1 }}>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <AdminSkeletonBox height={96} style={{ flex: 1 }} borderRadius={20} />
        <AdminSkeletonBox height={96} style={{ flex: 1 }} borderRadius={20} />
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <AdminSkeletonBox height={96} style={{ flex: 1 }} borderRadius={20} />
        <AdminSkeletonBox height={96} style={{ flex: 1 }} borderRadius={20} />
      </View>
      <AdminSkeletonBox height={200} borderRadius={20} />
      <AdminSkeletonBox height={120} borderRadius={20} />
    </View>
  );
}

export function AdminSkeletonList({ count = 5 }: { count?: number }) {
  const { spacing } = useAdminTheme();
  return (
    <View style={{ gap: spacing.sm, padding: spacing.md }}>
      {Array.from({ length: count }).map((_, i) => (
        <AdminSkeletonBox key={i} height={72} borderRadius={16} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({});
