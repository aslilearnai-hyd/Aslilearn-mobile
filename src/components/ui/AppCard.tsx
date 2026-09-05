import React, { ReactNode } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import GlassPanel from './GlassPanel';
import { GLASS_RADIUS } from '../../theme/glass';
import { uiTheme } from './theme';

type Props = {
  children: ReactNode;
  style?: ViewStyle;
  tone?: 'light' | 'medium' | 'strong';
};

/** App-wide card — liquid glass over the page artwork. */
export default function AppCard({ children, style, tone = 'medium' }: Props) {
  return (
    <GlassPanel
      tone={tone}
      elevated
      radius={GLASS_RADIUS.card}
      style={style}
      contentStyle={styles.content}
    >
      {children}
    </GlassPanel>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: uiTheme.spacing.md,
  },
});
