import React from 'react';
import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAdminTheme } from './useAdminTheme';

type Props = TextInputProps & {
  sticky?: boolean;
};

/** Solid search bar — no BlurView (frosted search over scroll was janky). */
export default function AdminSearchBar({ sticky, style, ...rest }: Props) {
  const { colors, radius, spacing } = useAdminTheme();

  return (
    <View
      style={[
        styles.wrap,
        sticky && styles.sticky,
        {
          borderRadius: radius.md,
          backgroundColor: colors.surface,
          borderColor: colors.surfaceBorder,
        },
      ]}
    >
      <View style={[styles.wrapInner, { paddingHorizontal: spacing.md }]}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          {...rest}
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { color: colors.text }, style]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: 48,
    borderWidth: 1,
  },
  wrapInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 48,
  },
  sticky: {
    zIndex: 10,
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    fontWeight: '500',
    paddingVertical: 10,
    paddingRight: 16,
  },
});
