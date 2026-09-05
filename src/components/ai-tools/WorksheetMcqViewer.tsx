import { useMemo, type ReactNode } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { stripStructuredAiToolMetadata } from '../../lib/strip-ai-tool-metadata';
import {
  resolveWorksheetFromPayload,
  type NormalizedWorksheet,
  type WorksheetSection,
} from '../../lib/parse-worksheet-mcq';
import AiToolStackedSection from './AiToolStackedSection';
import AiToolMarkdownFallback from './AiToolMarkdownFallback';
import AiToolQuestionCard from './AiToolQuestionCard';
import { ExpandableText, SelfCheckList, TapToRevealCard } from '../shared/ai-tool-interactive';

type Props = {
  content: string;
  rawContent?: unknown;
  variant?: 'student' | 'teacher' | 'default';
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

function SectionQuestions({ sec, showAnswer }: { sec: WorksheetSection; showAnswer: boolean }) {
  return (
    <View style={styles.gap}>
      {sec.questions.map((q, i) => (
        <AiToolQuestionCard
          key={`${sec.id}-q-${i}`}
          index={i}
          question={q.question}
          options={q.options}
          answer={showAnswer ? q.answer : undefined}
          explanation={showAnswer ? q.explanation : undefined}
          marks={q.marks}
          type={q.type}
          accent="#059669"
        />
      ))}
    </View>
  );
}

function WorksheetBody({ worksheet }: { worksheet: NormalizedWorksheet }) {
  const nodes: ReactNode[] = [];
  nodes.push(
    <View key="title" style={styles.titleCard}>
      <Text style={styles.kicker}>Worksheet · Ready To Print</Text>
      <Text style={styles.title}>{worksheet.title || 'Practice worksheet'}</Text>
    </View>,
  );
  if (worksheet.learningObjectives.length > 0) {
    nodes.push(
      <AiToolStackedSection key="lo" num="1" title="Learning Objectives" icon="flag-outline">
        <SelfCheckList items={worksheet.learningObjectives} tone="emerald" />
      </AiToolStackedSection>,
    );
  }
  if (worksheet.instructions) {
    nodes.push(
      <AiToolStackedSection key="inst" num="2" title="Instructions To Students" icon="book-outline">
        <ExpandableText text={worksheet.instructions} />
      </AiToolStackedSection>,
    );
  }
  const sorted = [...worksheet.sections].sort((a, b) => a.order - b.order).filter((s) => s.questions.length > 0);
  for (const sec of sorted) {
    nodes.push(
      <AiToolStackedSection
        key={sec.id}
        num={String(sec.order)}
        title={sec.label}
        icon="help-circle-outline"
      >
        <SectionQuestions sec={sec} showAnswer={false} />
      </AiToolStackedSection>,
    );
  }
  if (worksheet.answerKey) {
    nodes.push(
      <AiToolStackedSection key="ak" num="9" title="Answer Key" icon="checkmark-circle-outline">
        <TapToRevealCard prompt="Answer key" detail={worksheet.answerKey} tone="sky" revealLabel="Show answer key" />
      </AiToolStackedSection>,
    );
  }
  const tags = [worksheet.bloomLevel, worksheet.difficultyTag].filter(Boolean).join(' — ');
  if (tags) {
    nodes.push(
      <AiToolStackedSection key="bloom" num="10" title="Bloom's Level & Difficulty" icon="school-outline">
        <Text style={styles.body}>{tags}</Text>
      </AiToolStackedSection>,
    );
  }
  return <View style={styles.root}>{nodes}</View>;
}

export default function WorksheetMcqViewer({
  content,
  rawContent,
  variant = 'teacher',
  fill = false,
}: Props) {
  const { worksheet, markdownFallback } = useMemo(() => {
    const text = stripStructuredAiToolMetadata(content);
    return resolveWorksheetFromPayload(text, rawContent);
  }, [content, rawContent]);

  if (markdownFallback || !worksheet) {
    return (
      <AiToolMarkdownFallback
        toolType="worksheet-mcq-generator"
        content={content}
        rawContent={rawContent}
        variant={variant === 'student' ? 'student' : 'teacher'}
        fill={fill}
      />
    );
  }

  return wrapFill(<WorksheetBody worksheet={worksheet} />, fill);
}

const styles = StyleSheet.create({
  fill: { flex: 1, minHeight: 0 },
  fillContent: { paddingBottom: 12 },
  root: { gap: 8 },
  gap: { gap: 8 },
  titleCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    backgroundColor: '#FFFFFF',
    padding: 12,
  },
  kicker: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase', color: '#047857' },
  title: { marginTop: 4, fontSize: 18, fontWeight: '800', color: '#0f172a', lineHeight: 24 },
  body: { fontSize: 15, lineHeight: 22, color: '#334155' },
});
