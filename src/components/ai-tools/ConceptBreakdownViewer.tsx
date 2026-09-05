import { useMemo, type ReactNode } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { stripStructuredAiToolMetadata } from '../../lib/strip-ai-tool-metadata';
import {
  resolveConceptBreakdownFromPayload,
  type ConceptBreakdownContent,
} from '../../lib/parse-concept-breakdown';
import AiToolStackedSection from './AiToolStackedSection';
import AiToolMarkdownFallback from './AiToolMarkdownFallback';
import {
  CheckableTimeline,
  ExpandableText,
  FlipCard,
  SelfCheckList,
  TapToMarkItem,
} from '../shared/ai-tool-interactive';

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

function buildSections(concept: ConceptBreakdownContent): ReactNode[] {
  const slots: Array<{
    title: string;
    icon: keyof typeof Ionicons.glyphMap;
    has: boolean;
    body: ReactNode;
  }> = [
    {
      title: 'Simple Definition',
      icon: 'bulb-outline',
      has: !!concept.simpleDefinition.trim(),
      body: <ExpandableText text={concept.simpleDefinition} />,
    },
    {
      title: 'Step-by-step Concept Breakdown',
      icon: 'list-outline',
      has: concept.breakdownSteps.length > 0,
      body: <CheckableTimeline items={concept.breakdownSteps} tone="indigo" />,
    },
    {
      title: 'Real-life and Indian Context Examples',
      icon: 'sunny-outline',
      has: concept.realLifeExamples.length > 0,
      body: (
        <View style={styles.gap}>
          {concept.realLifeExamples.map((item, i) => (
            <TapToMarkItem key={i} text={item} tone="emerald" iconOff="lightbulb" iconOn="star" markedStyle="highlight" />
          ))}
        </View>
      ),
    },
    {
      title: 'Important Terms and Keywords',
      icon: 'pricetag-outline',
      has: concept.importantTerms.length > 0,
      body: (
        <View style={styles.gap}>
          {concept.importantTerms.map((term, i) => (
            <FlipCard
              key={`${term.term}-${i}`}
              tone="amber"
              front={
                <View>
                  <Text style={styles.termName}>{term.term}</Text>
                  <Text style={styles.flipHint}>Tap to flip ↻</Text>
                </View>
              }
              back={<Text style={styles.body}>{term.definition || term.term}</Text>}
            />
          ))}
        </View>
      ),
    },
    {
      title: 'Concept Check Questions',
      icon: 'help-circle-outline',
      has: concept.conceptCheckQuestions.length > 0,
      body: (
        <SelfCheckList
          items={concept.conceptCheckQuestions}
          tone="cyan"
          prompt="Tap each question once you've answered it"
        />
      ),
    },
    {
      title: 'Application-based Thinking Question',
      icon: 'chatbubble-ellipses-outline',
      has: !!concept.applicationThinkingQuestion.trim(),
      body: <ExpandableText text={concept.applicationThinkingQuestion} />,
    },
    {
      title: 'Higher-order Thinking Prompt',
      icon: 'flash-outline',
      has: !!concept.higherOrderThinkingPrompt.trim(),
      body: <ExpandableText text={concept.higherOrderThinkingPrompt} />,
    },
    {
      title: 'Quick Revision Summary',
      icon: 'sparkles-outline',
      has: !!concept.quickRevisionSummary.trim(),
      body: <ExpandableText text={concept.quickRevisionSummary} />,
    },
  ];

  let n = 1;
  return slots
    .filter((s) => s.has)
    .map((s) => {
      n += 1;
      return (
        <AiToolStackedSection key={s.title} num={String(n)} title={s.title} icon={s.icon}>
          {s.body}
        </AiToolStackedSection>
      );
    });
}

export default function ConceptBreakdownViewer({ content, rawContent, fill = false }: Props) {
  const { concepts, markdownFallback } = useMemo(() => {
    const text = stripStructuredAiToolMetadata(content);
    return resolveConceptBreakdownFromPayload(text, rawContent);
  }, [content, rawContent]);

  if (markdownFallback || !concepts.length) {
    return (
      <AiToolMarkdownFallback
        toolType="concept-breakdown-explainer"
        content={content}
        rawContent={rawContent}
        fill={fill}
      />
    );
  }

  const body = (
    <View style={styles.root}>
      {concepts.map((concept, index) => (
        <View key={`${concept.conceptTitle}-${index}`} style={index > 0 ? styles.nextConcept : undefined}>
          {concepts.length > 1 ? (
            <Text style={styles.conceptBadge}>
              Concept {index + 1} of {concepts.length}
            </Text>
          ) : null}
          <View style={styles.titleCard}>
            <Text style={styles.kicker}>Section 1</Text>
            <Text style={styles.titleBadge}>Concept Title</Text>
            <Text style={styles.title}>{concept.conceptTitle}</Text>
          </View>
          {buildSections(concept)}
        </View>
      ))}
    </View>
  );

  return wrapFill(body, fill);
}

const styles = StyleSheet.create({
  fill: { flex: 1, minHeight: 0 },
  fillContent: { paddingBottom: 12 },
  root: { gap: 8 },
  gap: { gap: 8 },
  nextConcept: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#ddd6fe' },
  conceptBadge: {
    alignSelf: 'flex-start',
    marginBottom: 8,
    borderRadius: 999,
    backgroundColor: '#ede9fe',
    color: '#5b21b6',
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  titleCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ddd6fe',
    backgroundColor: '#FFFFFF',
    padding: 12,
  },
  kicker: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase', color: '#6d28d9' },
  titleBadge: {
    alignSelf: 'flex-start',
    marginTop: 4,
    marginBottom: 6,
    borderRadius: 8,
    backgroundColor: '#ede9fe',
    color: '#4c1d95',
    fontSize: 11,
    fontWeight: '700',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  title: { fontSize: 18, fontWeight: '800', color: '#0f172a', lineHeight: 24 },
  termName: { fontSize: 15, fontWeight: '800', color: '#92400e' },
  flipHint: { marginTop: 4, fontSize: 11, fontWeight: '600', color: '#d97706' },
  body: { fontSize: 15, lineHeight: 22, color: '#334155' },
});
