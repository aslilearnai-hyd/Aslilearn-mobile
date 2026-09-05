import { useMemo, type ReactNode } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { stripStructuredAiToolMetadata } from '../../lib/strip-ai-tool-metadata';
import {
  homeworkHasVisibleContent,
  resolveHomeworkFromPayload,
  type NormalizedHomework,
} from '../../lib/parse-homework-creator';
import AiToolStackedSection from './AiToolStackedSection';
import AiToolMarkdownFallback from './AiToolMarkdownFallback';
import AiToolQuestionCard from './AiToolQuestionCard';
import { ExpandableText, SelfCheckList, TapToRevealCard } from '../shared/ai-tool-interactive';

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

function buildSections(h: NormalizedHomework): ReactNode[] {
  const defs: Array<{ num: number; title: string; icon: 'book-outline' | 'checkbox-outline' | 'bulb-outline' | 'sparkles-outline' | 'eye-outline' | 'help-circle-outline' | 'clipboard-outline' | 'people-outline'; has: boolean; body: ReactNode }> = [
    {
      num: 2,
      title: 'Clear Student Instructions',
      icon: 'book-outline',
      has: !!h.instructions,
      body: <ExpandableText text={h.instructions} />,
    },
    {
      num: 3,
      title: 'Practice Questions',
      icon: 'checkbox-outline',
      has: h.practiceQuestions.length > 0,
      body: (
        <View style={styles.gap}>
          {h.practiceQuestions.map((q, i) => (
            <AiToolQuestionCard
              key={i}
              index={i}
              question={q.question}
              options={q.options}
              answer={q.answer}
              explanation={q.explanation}
              marks={q.marks}
              type={q.type}
              accent="#ea580c"
            />
          ))}
        </View>
      ),
    },
    {
      num: 4,
      title: 'Application-based Tasks',
      icon: 'bulb-outline',
      has: h.applicationTasks.length > 0,
      body: <SelfCheckList items={h.applicationTasks} tone="amber" prompt="Tap each task once it's done" />,
    },
    {
      num: 5,
      title: 'One Creative / Thinking Question',
      icon: 'sparkles-outline',
      has: !!h.creativeThinkingQuestion,
      body: <ExpandableText text={h.creativeThinkingQuestion} />,
    },
    {
      num: 6,
      title: 'One Real-life Observation Task',
      icon: 'eye-outline',
      has: !!h.realLifeObservationTask,
      body: <ExpandableText text={h.realLifeObservationTask} />,
    },
    {
      num: 7,
      title: 'Challenge Question',
      icon: 'sparkles-outline',
      has: !!h.challengeQuestion,
      body: <ExpandableText text={h.challengeQuestion} />,
    },
    {
      num: 8,
      title: 'Support Hint for Struggling Learners',
      icon: 'help-circle-outline',
      has: !!h.supportHint,
      body: (
        <TapToRevealCard prompt="Stuck? Tap for a hint" detail={h.supportHint} tone="teal" revealLabel="Show hint" />
      ),
    },
    {
      num: 9,
      title: 'Answer Hints / Key Points',
      icon: 'clipboard-outline',
      has: !!h.answerHints,
      body: (
        <TapToRevealCard
          prompt="Check your answers"
          detail={h.answerHints}
          tone="emerald"
          revealLabel="Show key points"
        />
      ),
    },
    {
      num: 10,
      title: 'Parent Note',
      icon: 'people-outline',
      has: !!h.parentNote,
      body: <ExpandableText text={h.parentNote} />,
    },
  ];

  const nodes: ReactNode[] = [];
  if (h.title.trim()) {
    nodes.push(
      <View key="title" style={styles.titleCard}>
        <Text style={styles.kicker}>Section 1</Text>
        <Text style={styles.title}>{h.title}</Text>
      </View>,
    );
  }
  for (const d of defs.filter((s) => s.has)) {
    nodes.push(
      <AiToolStackedSection key={d.num} num={String(d.num)} title={d.title} icon={d.icon}>
        {d.body}
      </AiToolStackedSection>,
    );
  }
  return nodes;
}

export default function HomeworkCreatorViewer({ content, rawContent, fill = false }: Props) {
  const { homework, markdownFallback } = useMemo(() => {
    const text = stripStructuredAiToolMetadata(content);
    return resolveHomeworkFromPayload(text, rawContent);
  }, [content, rawContent]);

  if (markdownFallback || !homework || !homeworkHasVisibleContent(homework)) {
    return (
      <AiToolMarkdownFallback
        toolType="homework-creator"
        content={content}
        rawContent={rawContent}
        variant="teacher"
        fill={fill}
      />
    );
  }

  return wrapFill(<View style={styles.root}>{buildSections(homework)}</View>, fill);
}

const styles = StyleSheet.create({
  fill: { flex: 1, minHeight: 0 },
  fillContent: { paddingBottom: 12 },
  root: { gap: 8 },
  gap: { gap: 8 },
  titleCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fed7aa',
    backgroundColor: '#FFFFFF',
    padding: 12,
  },
  kicker: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase', color: '#c2410c' },
  title: { marginTop: 4, fontSize: 18, fontWeight: '800', color: '#0f172a', lineHeight: 24 },
});
