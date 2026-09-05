import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SHADOW } from '../../theme';

type Props = {
  onPress: () => void;
  gradient?: readonly [string, string];
  icon?: keyof typeof Ionicons.glyphMap;
  bottom?: number;
  right?: number;
  accessibilityLabel?: string;
};

export default function FAB({
  onPress,
  gradient = COLORS.gradientBlue,
  icon = 'add',
  bottom = 80,
  right = 20,
  accessibilityLabel = 'Add new item',
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.wrap, { bottom, right }, pressed && styles.pressed]}
    >
      <LinearGradient colors={[...gradient]} style={styles.btn}>
        <Ionicons name={icon} size={26} color={COLORS.textInverse} />
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    zIndex: 50,
    ...SHADOW.lg,
  },
  btn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    transform: [{ scale: 0.92 }],
  },
});
