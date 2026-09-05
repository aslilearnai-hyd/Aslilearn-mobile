import React, { ReactNode } from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';

type Props = PressableProps & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Kept for API compatibility — scale animation removed (Reanimated cost in lists). */
  scaleTo?: number;
};

/**
 * Plain pressable for admin UI. Reanimated spring scale on every list row
 * caused shared-value overhead across dozens of cards.
 */
export default function AdminScalePressable({
  children,
  style,
  scaleTo: _scaleTo,
  disabled,
  ...rest
}: Props) {
  return (
    <Pressable
      {...rest}
      disabled={disabled}
      style={({ pressed }) => [
        style,
        { opacity: disabled ? 0.5 : pressed ? 0.72 : 1 },
      ]}
    >
      {children}
    </Pressable>
  );
}
