import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { uiTheme } from './theme';

type Props = {
  label?: string;
  fullScreen?: boolean;
};

export default function AppLoader({ label = 'Loading...', fullScreen = false }: Props) {
  return (
    <View style={[styles.container, fullScreen && styles.fullScreen]}>
      <ActivityIndicator size="large" color={uiTheme.colors.primary} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: uiTheme.spacing.lg,
  },
  fullScreen: {
    flex: 1,
    backgroundColor: uiTheme.colors.background,
  },
  label: {
    marginTop: uiTheme.spacing.sm,
    color: uiTheme.colors.textMuted,
    fontSize: 14,
  },
});
