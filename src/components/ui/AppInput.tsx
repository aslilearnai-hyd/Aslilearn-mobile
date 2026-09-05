import React, { ReactNode } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { uiTheme } from './theme';

type Props = TextInputProps & {
  label?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
};

export default function AppInput({ label, error, leftIcon, rightIcon, style, ...props }: Props) {
  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.inputContainer, error && styles.inputError]}>
        {leftIcon ? <View style={styles.iconLeft}>{leftIcon}</View> : null}
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor="#9ca3af"
          {...props}
        />
        {rightIcon ? <View style={styles.iconRight}>{rightIcon}</View> : null}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: uiTheme.spacing.md,
  },
  label: {
    marginBottom: uiTheme.spacing.xs,
    color: uiTheme.colors.text,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  inputContainer: {
    minHeight: 56,
    borderRadius: uiTheme.radius.md,
    borderWidth: 1,
    borderColor: uiTheme.colors.border,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: uiTheme.spacing.md,
  },
  input: {
    flex: 1,
    color: uiTheme.colors.text,
    fontSize: 17,
    lineHeight: 24,
    paddingVertical: 12,
  },
  iconLeft: {
    marginRight: 10,
  },
  iconRight: {
    marginLeft: 10,
  },
  inputError: {
    borderColor: uiTheme.colors.danger,
  },
  errorText: {
    marginTop: 6,
    color: uiTheme.colors.danger,
    fontSize: 15,
    lineHeight: 20,
  },
});
