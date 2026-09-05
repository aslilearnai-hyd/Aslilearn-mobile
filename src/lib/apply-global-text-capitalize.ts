import React from 'react';
import { Text as RNText, StyleSheet, type TextProps } from 'react-native';

/**
 * Optional Text wrapper with capitalize styling.
 * Global ReactNative.Text patching was removed — RN 0.81+ exposes Text as read-only.
 */
export const CapitalizedText = React.forwardRef<React.ComponentRef<typeof RNText>, TextProps>(
  function CapitalizedText(props, ref) {
    const style = StyleSheet.flatten([{ textTransform: 'capitalize' }, props.style]);
    return React.createElement(RNText, { ...props, ref, style } as TextProps & { ref: typeof ref });
  },
);

CapitalizedText.displayName = 'CapitalizedText';
