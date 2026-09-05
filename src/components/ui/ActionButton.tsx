import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONT, RADIUS, SPACING } from '../../theme';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

type Props = {
  label: string;
  onPress?: () => void;
  gradient?: readonly [string, string];
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  variant?: Variant;
  style?: ViewStyle;
  fullWidth?: boolean;
};

export default function ActionButton({
  label,
  onPress,
  gradient = COLORS.gradientBlue,
  icon,
  loading = false,
  variant = 'primary',
  style,
  fullWidth = true,
}: Props) {
  const disabled = loading || !onPress;

  if (variant === 'primary') {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled, busy: loading }}
        style={({ pressed }) => [
          styles.pressable,
          fullWidth && styles.fullWidth,
          pressed && styles.pressed,
          disabled && styles.disabled,
          style,
        ]}
      >
        <LinearGradient colors={[...gradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradient}>
          {loading ? (
            <ActivityIndicator color={COLORS.textInverse} />
          ) : (
            <View style={styles.inner}>
              {icon ? <Ionicons name={icon} size={18} color={COLORS.textInverse} /> : null}
              <Text style={styles.primaryText}>{label}</Text>
            </View>
          )}
        </LinearGradient>
      </Pressable>
    );
  }

  const variantStyle =
    variant === 'secondary'
      ? styles.secondary
      : variant === 'danger'
        ? styles.danger
        : styles.ghost;

  const textStyle =
    variant === 'secondary'
      ? styles.secondaryText
      : variant === 'danger'
        ? styles.dangerText
        : styles.ghostText;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        variantStyle,
        fullWidth && styles.fullWidth,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'ghost' ? COLORS.primary : COLORS.textInverse} />
      ) : (
        <View style={styles.inner}>
          {icon ? (
            <Ionicons
              name={icon}
              size={18}
              color={variant === 'ghost' ? COLORS.primary : variant === 'secondary' ? COLORS.text : COLORS.textInverse}
            />
          ) : null}
          <Text style={textStyle}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  base: {
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md + 2,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  fullWidth: {
    width: '100%',
  },
  gradient: {
    paddingVertical: SPACING.md + 2,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.lg,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  primaryText: {
    color: COLORS.textInverse,
    fontSize: FONT.md,
    fontWeight: FONT.bold,
  },
  secondary: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
  },
  secondaryText: {
    color: COLORS.text,
    fontSize: FONT.md,
    fontWeight: FONT.semibold,
  },
  danger: {
    backgroundColor: COLORS.danger,
    borderColor: COLORS.danger,
  },
  dangerText: {
    color: COLORS.textInverse,
    fontSize: FONT.md,
    fontWeight: FONT.bold,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  ghostText: {
    color: COLORS.primary,
    fontSize: FONT.md,
    fontWeight: FONT.semibold,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
  },
  disabled: {
    opacity: 0.6,
  },
});
