import { useMemo, type ReactNode } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { stripStructuredAiToolMetadata } from '../../lib/strip-ai-tool-metadata';
import {
  PRACTICE_QA_REAL_LIFE_SECTION,
  resolvePracticeQaFromPayload,
  type NormalizedPracticeQa,
  type PracticeQaSection,
} from '../../lib/parse-practice-qa';
import AiToolStackedSection from './AiToolStackedSection';
import AiToolMarkdownFallback from './AiToolMarkdownFallback';
import AiToolQuestionCard from './AiToolQuestionCard';
import { ExpandableText, SelfCheckList } from '../shared/ai-tool-interactive';

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

const SECTION_ICONS: Record<string, 'checkbox-outline' | 'create-outline' | 'flag-outline' | 'help-circle-outline' | 'book-outline' | 'sparkles-outline' | 'flash-outline'> = {
  'Section A: MCQs': 'checkbox-outline',
  'Section B: Fill in the Blanks': 'create-outline',
  'Section C: True or False': 'flag-outline',
  'Section D: Very Short Answer Questions': 'help-circle-outline',
  'Section E: Short Answer Questions': 'book-outline',
  'Section F: Application / Case-based Questions': 'sparkles-outline',
  'Section G: HOTS / Analytical Questions': 'flash-outline',
  [PRACTICE_QA_REAL_LIFE_SECTION]: 'sparkles-outline',
};

function PracticeQaBody({ practice }: { practice: NormalizedPracticeQa }) {
  let nextNum = 2;
  const nodes: ReactNode[] = [];

  if (practice.title.trim()) {
    nodes.push(
      <View key="title" style={styles.titleCard}>
        <Text style={styles.kicker}>Section 1</Text>
        <Text style={styles.title}>{practice.title}</Text>
      </View>,
    );
  }

  if (practice.learningObjectives.length > 0) {
    const n = nextNum++;
    nodes.push(
      <AiToolStackedSection key="lo" num={String(n)} title="Learning Objectives" icon="flag-outline">
        <SelfCheckList items={practice.learningObjectives} tone="teal" />
      </AiToolStackedSection>,
    );
  }
  if (practice.instructions) {
    const n = nextNum++;
    nodes.push(
      <AiToolStackedSection key="inst" num={String(n)} title="Instructions to Students" icon="book-outline">
        <ExpandableText text={practice.instructions} />
      </AiToolStackedSection>,
    );
  }

  for (const sec of practice.sections.filter((s) => s.questions.length > 0)) {
    const n = nextNum++;
    const shortTitle = sec.label.replace(/^Section [A-G]:\s*/i, '');
    nodes.push(
      <AiToolStackedSection
        key={sec.id}
        num={String(n)}
        title={shortTitle}
        icon={SECTION_ICONS[sec.label] || 'help-circle-outline'}
      >
        <SectionQuestions sec={sec} />
      </AiToolStackedSection>,
    );
  }

  if (practice.realLifeQuestions.length > 0) {
    const n = nextNum++;
    nodes.push(
      <AiToolStackedSection key="rl" num={String(n)} title="Problem-solving Questions" icon="sparkles-outline">
        <View style={styles.gap}>
          {practice.realLifeQuestions.map((q, i) => (
            <AiToolQuestionCard
              key={`rl-${i}`}
              index={i}
              question={q.question}
              options={q.options}
              answer={q.answer}
              explanation={q.explanation}
              marks={q.marks}
              type={q.type}
              accent="#16a34a"
            />
          ))}
        </View>
      </AiToolStackedSection>,
    );
  }

  if (practice.answerKey) {
    const n = nextNum++;
    nodes.push(
      <AiToolStackedSection key="ak" num={String(n)} title="Answer Key with Explanations" icon="checkmark-circle-outline">
        <ExpandableText text={practice.answerKey} />
      </AiToolStackedSection>,
    );
  }

  return <View style={styles.root}>{nodes}</View>;
}

function SectionQuestions({ sec }: { sec: PracticeQaSection }) {
  return (
    <View style={styles.gap}>
      {sec.questions.map((q, i) => (
        <AiToolQuestionCard
          key={`${sec.id}-q-${i}`}
          index={i}
          question={q.question}
          options={q.options}
          answer={q.answer}
          explanation={q.explanation}
          marks={q.marks}
          type={q.type}
        />
      ))}
    </View>
  );
}

export default function PracticeQaViewer({ content, rawContent, fill = false }: Props) {
  const { practice, markdownFallback } = useMemo(() => {
    const text = stripStructuredAiToolMetadata(content);
    return resolvePracticeQaFromPayload(text, rawContent);
  }, [content, rawContent]);

  if (markdownFallback || !practice) {
    return (
      <AiToolMarkdownFallback
        toolType="smart-qa-practice-generator"
        content={content}
        rawContent={rawContent}
        fill={fill}
      />
    );
  }

  return wrapFill(<PracticeQaBody practice={practice} />, fill);
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
});
