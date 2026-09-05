import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT, RADIUS, SPACING } from '../../theme';
import ActionButton from './ActionButton';

type Props = {
  message: string;
  onRetry?: () => void;
  style?: ViewStyle;
};

export default function ErrorState({ message, onRetry, style }: Props) {
  return (
    <View style={[styles.wrap, style]}>
      <Ionicons name="alert-circle-outline" size={28} color={COLORS.danger} />
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <ActionButton label="Retry" onPress={onRetry} variant="secondary" fullWidth={false} icon="refresh" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.md,
  },
  message: {
    fontSize: FONT.base,
    color: COLORS.danger,
    textAlign: 'center',
    lineHeight: 20,
  },
});
