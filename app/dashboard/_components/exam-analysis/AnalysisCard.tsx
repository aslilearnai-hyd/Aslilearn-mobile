import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassPanel } from '../../../../src/components/ui';
import { RADIUS } from '../../../../src/theme';
import { analysisStyles, ANALYSIS } from './exam-analysis-ui';

type Props = {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  accent?: string;
  children: React.ReactNode;
};

export default function AnalysisCard({ title, icon = 'document-text', accent = ANALYSIS.accent, children }: Props) {
  return (
    <GlassPanel style={analysisStyles.card} radius={RADIUS.lg}>
      {/* Inner view carries the row spacing GlassPanel's wrapper would swallow. */}
      <View style={analysisStyles.cardInner}>
        <View style={analysisStyles.cardHeader}>
          <View style={analysisStyles.cardIconWrap}>
            <Ionicons name={icon} size={18} color={accent} />
          </View>
          <Text style={analysisStyles.cardTitle}>{title}</Text>
        </View>
        <View style={analysisStyles.cardBody}>{children}</View>
      </View>
    </GlassPanel>
  );
}
