import { useMemo, type ReactNode } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { stripStructuredAiToolMetadata } from '../../lib/strip-ai-tool-metadata';
import {
  resolveDailyPlansFromPayload,
  type NormalizedDailyPlan,
} from '../../lib/parse-daily-class-plan';
import AiToolStackedSection from './AiToolStackedSection';
import AiToolMarkdownFallback from './AiToolMarkdownFallback';
import { ExpandableText, SelfCheckList, TapToMarkItem } from '../shared/ai-tool-interactive';

type Props = {
  content: string;
  rawContent?: unknown;
  fill?: boolean;
};

function wrapFill(node: ReactNode, fill: boolean) {
  if (!fill) return node;
  return (
    <ScrollView style={styles.fill} contentContainerStyle={styles.fillContent} nestedScrollEnabled>
      {node}
    </ScrollView>
  );
}

function DayPlanBoard({ plan, index, total }: { plan: NormalizedDailyPlan; index: number; total: number }) {
  const cards: Array<{ title: string; icon: 'flag-outline' | 'bulb-outline' | 'people-outline' | 'clipboard-outline' | 'book-outline' | 'cube-outline' | 'chatbubble-ellipses-outline' | 'document-text-outline'; body: ReactNode }> = [];
  if (plan.objectives.length > 0) {
    cards.push({
      title: 'Learning objectives',
      icon: 'flag-outline',
      body: <SelfCheckList items={plan.objectives} tone="emerald" prompt="Tap each once covered" />,
    });
  }
  if (plan.teachingMethods.length > 0) {
    cards.push({
      title: 'Teaching methods',
      icon: 'bulb-outline',
      body: <SelfCheckList items={plan.teachingMethods} tone="amber" prompt="Tap each once planned" />,
    });
  }
  if (plan.classroomActivities.length > 0) {
    cards.push({
      title: 'Classroom activities',
      icon: 'people-outline',
      body: <SelfCheckList items={plan.classroomActivities} tone="sky" prompt="Tap each once run" />,
    });
  }
  if (plan.exitTicket) {
    cards.push({
      title: 'Exit ticket',
      icon: 'clipboard-outline',
      body: <ExpandableText text={plan.exitTicket} />,
    });
  }
  if (plan.differentiatedSupport) {
    cards.push({
      title: 'Differentiated support',
      icon: 'people-outline',
      body: <ExpandableText text={plan.differentiatedSupport} />,
    });
  }
  if (plan.homeworkFollowup) {
    cards.push({
      title: 'Homework & follow-up',
      icon: 'book-outline',
      body: <ExpandableText text={plan.homeworkFollowup} />,
    });
  }
  if (plan.teachingAids.length > 0) {
    cards.push({
      title: 'Teaching aids',
      icon: 'cube-outline',
      body: (
        <View style={styles.gap}>
          {plan.teachingAids.map((item, i) => (
            <TapToMarkItem key={i} text={item} tone="amber" iconOff="notebook" iconOn="checklist" markedStyle="strike" />
          ))}
        </View>
      ),
    });
  }
  if (plan.teacherReflection) {
    cards.push({
      title: 'Teacher reflection notes',
      icon: 'chatbubble-ellipses-outline',
      body: <ExpandableText text={plan.teacherReflection} />,
    });
  }
  if (plan.timeline.length > 0) {
    cards.push({
      title: 'Additional schedule notes',
      icon: 'document-text-outline',
      body: <SelfCheckList items={plan.timeline} tone="slate" prompt="Tap each note once reviewed" />,
    });
  }

  return (
    <View style={styles.root}>
      {total > 1 ? (
        <Text style={styles.badge}>
          Day {index + 1} of {total}
        </Text>
      ) : null}
      {plan.title || plan.dayPeriodBreakup ? (
        <View style={styles.overview}>
          <Text style={styles.kicker}>Day overview</Text>
          {plan.title ? <Text style={styles.title}>{plan.title}</Text> : null}
          {plan.dayPeriodBreakup ? <Text style={styles.body}>{plan.dayPeriodBreakup}</Text> : null}
        </View>
      ) : null}
      {plan.timeSlots.length > 0 ? (
        <View style={styles.timeline}>
          <Text style={styles.timelineTitle}>Period timeline</Text>
          {plan.timeSlots.map((slot, i) => (
            <View key={`${slot.time}-${i}`} style={styles.slot}>
              <Text style={styles.slotTime}>{slot.time || `Block ${i + 1}`}</Text>
              {slot.type ? <Text style={styles.slotType}>{slot.type}</Text> : null}
              <Text style={styles.slotActivity}>{slot.activity}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {cards.map((card, i) => (
        <AiToolStackedSection key={card.title} num={String(i + 1)} title={card.title} icon={card.icon}>
          {card.body}
        </AiToolStackedSection>
      ))}
    </View>
  );
}

export default function DailyClassPlanViewer({ content, rawContent, fill = false }: Props) {
  const { plans, markdownFallback } = useMemo(() => {
    const text = stripStructuredAiToolMetadata(content);
    return resolveDailyPlansFromPayload(text, rawContent);
  }, [content, rawContent]);

  if (markdownFallback || !plans.length) {
    return (
      <AiToolMarkdownFallback
        toolType="daily-class-plan-maker"
        content={content}
        rawContent={rawContent}
        variant="teacher"
        fill={fill}
      />
    );
  }

  return wrapFill(
    <View style={styles.stack}>
      {plans.map((plan, i) => (
        <DayPlanBoard key={`${plan.title}-${i}`} plan={plan} index={i} total={plans.length} />
      ))}
    </View>,
    fill,
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, minHeight: 0 },
  fillContent: { paddingBottom: 12 },
  stack: { gap: 16 },
  root: { gap: 8 },
  gap: { gap: 8 },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#e0e7ff',
    color: '#3730a3',
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  overview: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd6fe',
    backgroundColor: '#FFFFFF',
    padding: 14,
  },
  kicker: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase', color: '#7c3aed' },
  title: { marginTop: 4, fontSize: 18, fontWeight: '800', color: '#0f172a', lineHeight: 24 },
  body: { marginTop: 6, fontSize: 15, lineHeight: 22, color: '#334155' },
  timeline: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#c7d2fe',
    backgroundColor: '#eef2ff',
    padding: 12,
    gap: 8,
  },
  timelineTitle: { fontSize: 15, fontWeight: '800', color: '#312e81' },
  slot: {
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderWidth: 1,
    borderColor: '#e0e7ff',
  },
  slotTime: { fontSize: 12, fontWeight: '800', color: '#4338ca' },
  slotType: { marginTop: 2, fontSize: 11, fontWeight: '700', color: '#64748b' },
  slotActivity: { marginTop: 4, fontSize: 14, lineHeight: 20, color: '#334155' },
});
