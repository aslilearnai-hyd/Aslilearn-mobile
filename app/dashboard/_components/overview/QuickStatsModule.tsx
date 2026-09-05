import React, { memo } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, useAnimatedProps } from 'react-native-reanimated';
import { AnimatedStatInput, useCountUp } from '../../../../src/hooks/useCountUp';
import { STUDENT, STUDENT_ANIMATION, STUDENT_RADIUS } from '../../../../src/theme/student';
import { GLASS_ROW } from '../../../../src/theme/glass';
import GlassPanel from '../../../../src/components/ui/GlassPanel';

interface QuickStatsModuleProps {
  stats: {
    questionsAnswered: number;
    accuracyRate: number;
    rank: number;
  };
  dark?: boolean;
}

function StatValue({
  target,
  suffix = '',
  prefix = '',
  color,
}: {
  target: number;
  suffix?: string;
  prefix?: string;
  color: string;
}) {
  const value = useCountUp(target, 800);
  const animatedProps = useAnimatedProps(() => ({
    text: `${prefix}${Math.round(value.value)}${suffix}`,
  }));

  return (
    <AnimatedStatInput
      animatedProps={animatedProps as never}
      editable={false}
      style={[styles.value, { color }]}
      underlineColorAndroid="transparent"
    />
  );
}

const ITEMS = [
  {
    key: 'questions',
    label: 'Questions Solved',
    icon: 'checkmark-circle' as const,
    accent: STUDENT.statGradients.questions[0],
    getTarget: (s: QuickStatsModuleProps['stats']) => s.questionsAnswered,
    suffix: '',
    prefix: '',
  },
  {
    key: 'accuracy',
    label: 'Accuracy Rate',
    icon: 'trending-up' as const,
    accent: STUDENT.statGradients.accuracy[0],
    getTarget: (s: QuickStatsModuleProps['stats']) => s.accuracyRate,
    suffix: '%',
    prefix: '',
  },
  {
    key: 'rank',
    label: 'Rank',
    icon: 'bar-chart' as const,
    accent: STUDENT.statGradients.rank[0],
    getTarget: (s: QuickStatsModuleProps['stats']) => (s.rank > 0 ? s.rank : 0),
    suffix: '',
    prefix: '#',
    showDash: (s: QuickStatsModuleProps['stats']) => s.rank <= 0,
  },
];

function QuickStatsModuleComponent({ stats }: QuickStatsModuleProps) {
  const { width } = useWindowDimensions();
  const compact = width < 380;

  return (
    <View style={styles.grid}>
      {ITEMS.map((item, index) => (
        <Animated.View
          key={item.key}
          entering={FadeInDown.duration(STUDENT_ANIMATION.normal).delay(index * 70)}
          style={styles.cardWrap}
        >
          <GlassPanel
            tone="medium"
            elevated
            radius={STUDENT_RADIUS.card}
            style={styles.panel}
            contentStyle={[styles.card, compact && styles.cardCompact]}
          >
            <View style={[styles.iconBubble, { backgroundColor: `${item.accent}22` }]}>
              <Ionicons name={item.icon} size={compact ? 16 : 18} color={item.accent} />
            </View>
            <Text style={[styles.label, compact && styles.labelCompact]} numberOfLines={1}>
              {item.label}
            </Text>
            {'showDash' in item && item.showDash?.(stats) ? (
              <Text style={[styles.value, { color: item.accent }, compact && styles.valueCompact]}>
                —
              </Text>
            ) : (
              <StatValue
                target={item.getTarget(stats)}
                suffix={item.suffix}
                prefix={item.prefix}
                color={item.accent}
              />
            )}
          </GlassPanel>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  cardWrap: { flex: 1 },
  panel: { flex: 1 },
  card: {
    paddingHorizontal: 12,
    paddingVertical: 14,
    minHeight: 108,
    justifyContent: 'space-between',
  },
  cardCompact: {
    minHeight: 96,
    paddingVertical: 12,
  },
  iconBubble: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_ROW.border,
  },
  label: {
    fontSize: 11,
    color: STUDENT.textSecondary,
    fontWeight: '600',
  },
  labelCompact: { fontSize: 10 },
  value: {
    fontSize: 24,
    fontWeight: '800',
    marginTop: 2,
  },
  valueCompact: { fontSize: 20 },
});

export default memo(QuickStatsModuleComponent);
