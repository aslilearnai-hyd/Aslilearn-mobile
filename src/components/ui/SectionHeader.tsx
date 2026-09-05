import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, FONT, SPACING } from '../../theme';

type Props = {
  title: string;
  onViewAll?: () => void;
  viewAllLabel?: string;
};

export default function SectionHeader({ title, onViewAll, viewAllLabel = 'View All' }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {onViewAll ? (
        <Pressable
          onPress={onViewAll}
          hitSlop={13}
          accessibilityRole="button"
          accessibilityLabel={`${viewAllLabel} ${title}`}
        >
          <Text style={styles.link}>{viewAllLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT.lg,
    fontWeight: FONT.bold,
    color: COLORS.text,
  },
  link: {
    fontSize: FONT.sm,
    fontWeight: FONT.semibold,
    color: COLORS.primary,
  },
});
