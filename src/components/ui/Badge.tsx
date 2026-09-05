import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { COLORS, FONT, RADIUS, SPACING } from '../../theme';

type BadgeSize = 'sm' | 'md';

type Props = {
  label: string;
  color?: string;
  size?: BadgeSize;
  style?: ViewStyle;
};

export default function Badge({ label, color = COLORS.primary, size = 'md', style }: Props) {
  return (
    <View style={[styles.base, size === 'sm' && styles.sm, { backgroundColor: `${color}18` }, style]}>
      <Text style={[styles.text, size === 'sm' && styles.textSm, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  sm: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  text: {
    fontSize: FONT.sm,
    fontWeight: FONT.semibold,
  },
  textSm: {
    fontSize: FONT.xs,
  },
});
