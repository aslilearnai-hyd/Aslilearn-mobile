import { useMemo, type ReactNode } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { stripStructuredAiToolMetadata } from '../../lib/strip-ai-tool-metadata';
import {
  conceptHasVisibleContent,
  resolveConceptsFromPayload,
  type NormalizedConcept,
} from '../../lib/parse-concept-mastery';
import AiToolStackedSection from './AiToolStackedSection';
import AiToolMarkdownFallback from './AiToolMarkdownFallback';
import { ExpandableText, SelfCheckList, TapToMarkItem } from '../shared/ai-tool-interactive';

type Props = {
  content: string;
  rawContent?: unknown;
  variant?: 'student' | 'teacher';
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

const CONCEPT_SECTIONS: Array<{
  num: number;
  title: string;
  icon: 'book-outline' | 'flag-outline' | 'help-circle-outline' | 'bulb-outline' | 'eye-outline' | 'sparkles-outline' | 'warning-outline' | 'clipboard-outline' | 'checkbox-outline' | 'school-outline' | 'flash-outline';
  has: (c: NormalizedConcept) => boolean;
  render: (c: NormalizedConcept) => ReactNode;
}> = [
  {
    num: 1,
    title: 'Simple definition',
    icon: 'book-outline',
    has: (c) => !!c.simpleDefinition,
    render: (c) => <ExpandableText text={c.simpleDefinition} />,
  },
  {
    num: 2,
    title: 'Why this concept is important',
    icon: 'flag-outline',
    has: (c) => !!c.whyImportant,
    render: (c) => <ExpandableText text={c.whyImportant} />,
  },
  {
    num: 3,
    title: 'Prior knowledge needed',
    icon: 'help-circle-outline',
    has: (c) => !!c.priorKnowledge,
    render: (c) => <ExpandableText text={c.priorKnowledge} />,
  },
  {
    num: 4,
    title: 'Step-by-step explanation',
    icon: 'bulb-outline',
    has: (c) => !!c.explanation,
    render: (c) => <ExpandableText text={c.explanation} />,
  },
  {
    num: 5,
    title: 'Diagram / visualisation suggestion',
    icon: 'eye-outline',
    has: (c) => !!c.diagramSuggestion,
    render: (c) => <ExpandableText text={c.diagramSuggestion} />,
  },
  {
    num: 6,
    title: 'Real-life examples',
    icon: 'sparkles-outline',
    has: (c) => !!c.realLifeExamples,
    render: (c) => <ExpandableText text={c.realLifeExamples} />,
  },
  {
    num: 7,
    title: 'Common misconceptions and corrections',
    icon: 'warning-outline',
    has: (c) => c.misconceptions.length > 0,
    render: (c) => (
      <SelfCheckList items={c.misconceptions} tone="amber" prompt="Tap each one once you've corrected it" />
    ),
  },
  {
    num: 8,
    title: 'Concept check questions',
    icon: 'clipboard-outline',
    has: (c) => c.conceptCheckQuestions.length > 0,
    render: (c) => (
      <SelfCheckList items={c.conceptCheckQuestions} tone="rose" prompt="Tap each once you've answered it" />
    ),
  },
  {
    num: 9,
    title: 'Key points to remember',
    icon: 'checkbox-outline',
    has: (c) => c.keyPoints.length > 0,
    render: (c) => (
      <View style={styles.gap}>
        {c.keyPoints.map((point, i) => (
          <TapToMarkItem key={i} text={point} tone="emerald" markedStyle="strike" />
        ))}
      </View>
    ),
  },
  {
    num: 10,
    title: 'Exam tips',
    icon: 'school-outline',
    has: (c) => !!c.examTips,
    render: (c) => <ExpandableText text={c.examTips} />,
  },
  {
    num: 11,
    title: 'Higher-order thinking question',
    icon: 'flash-outline',
    has: (c) => !!c.hotsQuestion,
    render: (c) => <ExpandableText text={c.hotsQuestion} />,
  },
  {
    num: 12,
    title: 'Quick self-reflection prompt',
    icon: 'sparkles-outline',
    has: (c) => !!c.reflectionPrompt,
    render: (c) => <ExpandableText text={c.reflectionPrompt} />,
  },
];

function ConceptCard({ concept, index, total }: { concept: NormalizedConcept; index: number; total: number }) {
  return (
    <View style={index > 0 ? styles.nextConcept : undefined}>
      {total > 1 ? (
        <Text style={styles.badge}>
          Concept {index + 1} of {total}
        </Text>
      ) : null}
      <View style={styles.titleCard}>
        <Text style={styles.kicker}>Concept Mastery Helper</Text>
        <Text style={styles.title}>{concept.conceptName}</Text>
        {concept.difficulty ? <Text style={styles.diff}>{concept.difficulty}</Text> : null}
      </View>
      {CONCEPT_SECTIONS.filter((s) => s.has(concept)).map((s) => (
        <AiToolStackedSection key={s.num} num={String(s.num)} title={s.title} icon={s.icon}>
          {s.render(concept)}
        </AiToolStackedSection>
      ))}
    </View>
  );
}

export default function ConceptMasteryViewer({
  content,
  rawContent,
  variant = 'teacher',
  fill = false,
}: Props) {
  const { concepts, markdownFallback } = useMemo(() => {
    const text = stripStructuredAiToolMetadata(content);
    return resolveConceptsFromPayload(text, rawContent);
  }, [content, rawContent]);

  const visible = concepts.filter(conceptHasVisibleContent);
  if (markdownFallback || !visible.length) {
    return (
      <AiToolMarkdownFallback
        toolType="concept-mastery-helper"
        content={content}
        rawContent={rawContent}
        variant={variant}
        fill={fill}
      />
    );
  }

  return wrapFill(
    <View style={styles.root}>
      {visible.map((c, i) => (
        <ConceptCard key={`${c.conceptName}-${i}`} concept={c} index={i} total={visible.length} />
      ))}
    </View>,
    fill,
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, minHeight: 0 },
  fillContent: { paddingBottom: 12 },
  root: { gap: 8 },
  gap: { gap: 8 },
  nextConcept: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f0abfc' },
  badge: {
    alignSelf: 'flex-start',
    marginBottom: 8,
    borderRadius: 999,
    backgroundColor: '#fae8ff',
    color: '#86198f',
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  titleCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#f0abfc',
    backgroundColor: '#FFFFFF',
    padding: 12,
  },
  kicker: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase', color: '#a21caf' },
  title: { marginTop: 4, fontSize: 18, fontWeight: '800', color: '#0f172a', lineHeight: 24 },
  diff: {
    alignSelf: 'flex-start',
    marginTop: 8,
    borderRadius: 999,
    backgroundColor: '#f1f5f9',
    color: '#334155',
    fontSize: 11,
    fontWeight: '700',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
});
