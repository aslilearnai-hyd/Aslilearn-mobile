import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, ViewStyle, TextStyle } from 'react-native';
import { uiTheme, UIButtonVariant } from './theme';

type Props = {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: UIButtonVariant;
  style?: ViewStyle;
  textStyle?: TextStyle;
};

export default function AppButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  style,
  textStyle,
}: Props) {
  const isDisabled = disabled || loading;
  return (
    <TouchableOpacity
      style={[styles.base, styles[variant], isDisabled && styles.disabled, style]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.9}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' || variant === 'ghost' ? uiTheme.colors.text : '#fff'} />
      ) : (
        <Text style={[styles.baseText, styles[`${variant}Text`], textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 54,
    borderRadius: uiTheme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: uiTheme.spacing.lg,
    borderWidth: 1,
  },
  baseText: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
  },
  primary: {
    backgroundColor: uiTheme.colors.primary,
    borderColor: uiTheme.colors.primary,
  },
  secondary: {
    backgroundColor: uiTheme.colors.surface,
    borderColor: uiTheme.colors.border,
  },
  danger: {
    backgroundColor: uiTheme.colors.danger,
    borderColor: uiTheme.colors.danger,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  primaryText: { color: '#fff' },
  secondaryText: { color: uiTheme.colors.text },
  dangerText: { color: '#fff' },
  ghostText: { color: uiTheme.colors.primary },
  disabled: {
    opacity: 0.6,
  },
});
