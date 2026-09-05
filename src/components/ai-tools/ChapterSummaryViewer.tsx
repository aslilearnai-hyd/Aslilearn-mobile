import { useMemo, type ReactNode } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { stripStructuredAiToolMetadata } from '../../lib/strip-ai-tool-metadata';
import {
  resolveChapterSummaryFromPayload,
  type ChapterSummaryContent,
} from '../../lib/parse-chapter-summary';
import AiToolStackedSection from './AiToolStackedSection';
import AiToolMarkdownFallback from './AiToolMarkdownFallback';
import {
  ExpandableText,
  FlipCard,
  OneAtATimeCarousel,
  SelfCheckList,
  TapToMarkItem,
  TapToRevealCard,
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

function buildBodySections(summary: ChapterSummaryContent): ReactNode[] {
  const defs: Array<{
    title: string;
    icon: keyof typeof Ionicons.glyphMap;
    has: boolean;
    body: ReactNode;
  }> = [
    {
      title: 'Overview of the Chapter',
      icon: 'book-outline',
      has: !!summary.chapterOverview.trim(),
      body: <ExpandableText text={summary.chapterOverview} />,
    },
    {
      title: 'Learning Objectives',
      icon: 'flag-outline',
      has: summary.learningObjectives.length > 0,
      body: <SelfCheckList items={summary.learningObjectives} tone="indigo" />,
    },
    {
      title: 'Important Concepts and Explanations',
      icon: 'sparkles-outline',
      has: summary.importantConcepts.length > 0,
      body: (
        <View style={styles.gap}>
          {summary.importantConcepts.map((c, i) => (
            <FlipCard
              key={`${c.name}-${i}`}
              tone="violet"
              front={
                <View>
                  <Text style={styles.conceptName}>{c.name}</Text>
                  <Text style={styles.flipHint}>Tap to flip ↻</Text>
                </View>
              }
              back={<Text style={styles.body}>{c.explanation || c.name}</Text>}
            />
          ))}
        </View>
      ),
    },
    {
      title: 'Key Definitions and Terms',
      icon: 'checkbox-outline',
      has: summary.definitions.length > 0,
      body: (
        <View style={styles.gap}>
          {summary.definitions.map((d, i) => (
            <TapToRevealCard key={`def-${i}`} prompt={d.term} detail={d.definition} tone="pink" />
          ))}
        </View>
      ),
    },
    {
      title: 'Formulae / Rules / Important Facts',
      icon: 'calculator-outline',
      has: summary.formulae.length > 0,
      body: (
        <View style={styles.gap}>
          {summary.formulae.map((f, i) => (
            <View key={`fm-${i}`} style={styles.formulaRow}>
              {f.name ? <Text style={styles.formulaName}>{f.name}</Text> : null}
              <Text style={styles.formulaText}>{f.formula}</Text>
              {f.note ? <Text style={styles.formulaNote}>{f.note}</Text> : null}
            </View>
          ))}
        </View>
      ),
    },
    {
      title: 'Concept Connections',
      icon: 'git-network-outline',
      has: !!summary.conceptConnections.trim(),
      body: <ExpandableText text={summary.conceptConnections} />,
    },
    {
      title: 'Real-life Applications',
      icon: 'sunny-outline',
      has: summary.realLifeApplications.length > 0,
      body: (
        <View style={styles.gap}>
          {summary.realLifeApplications.map((item, i) => (
            <TapToMarkItem key={i} text={item} tone="emerald" iconOff="lightbulb" iconOn="star" markedStyle="highlight" />
          ))}
        </View>
      ),
    },
    {
      title: 'Quick Revision Notes',
      icon: 'book-outline',
      has: summary.quickRevisionNotes.length > 0,
      body: (
        <View style={styles.gap}>
          {summary.quickRevisionNotes.map((note, i) => (
            <TapToMarkItem key={i} text={note} tone="amber" iconOff="checklist" iconOn="checklist" markedStyle="strike" />
          ))}
        </View>
      ),
    },
    {
      title: 'Practice Recall Questions',
      icon: 'help-circle-outline',
      has: summary.practiceRecallQuestions.length > 0,
      body: <OneAtATimeCarousel items={summary.practiceRecallQuestions} tone="sky" />,
    },
  ];

  return defs
    .filter((d) => d.has)
    .map((d, i) => (
      <AiToolStackedSection key={d.title} num={String(i + 2)} title={d.title} icon={d.icon}>
        {d.body}
      </AiToolStackedSection>
    ));
}

export default function ChapterSummaryViewer({ content, rawContent, fill = false }: Props) {
  const { summary, markdownFallback } = useMemo(() => {
    const text = stripStructuredAiToolMetadata(content);
    return resolveChapterSummaryFromPayload(text, rawContent);
  }, [content, rawContent]);

  if (markdownFallback || !summary) {
    return (
      <AiToolMarkdownFallback
        toolType="chapter-summary-creator"
        content={content}
        rawContent={rawContent}
        fill={fill}
      />
    );
  }

  const body = (
    <View style={styles.root}>
      {summary.title.trim() ? (
        <View style={styles.titleCard}>
          <Text style={styles.kicker}>Section 1</Text>
          <Text style={styles.title}>{summary.title}</Text>
        </View>
      ) : null}
      {buildBodySections(summary)}
    </View>
  );

  return wrapFill(body, fill);
}

const styles = StyleSheet.create({
  fill: { flex: 1, minHeight: 0 },
  fillContent: { paddingBottom: 12 },
  root: { gap: 8 },
  gap: { gap: 8 },
  titleCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#bae6fd',
    backgroundColor: '#FFFFFF',
    padding: 12,
  },
  kicker: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase', color: '#0369a1' },
  title: { marginTop: 4, fontSize: 18, fontWeight: '800', color: '#0f172a', lineHeight: 24 },
  conceptName: { fontSize: 15, fontWeight: '800', color: '#5b21b6' },
  flipHint: { marginTop: 4, fontSize: 11, fontWeight: '600', color: '#7c3aed' },
  body: { fontSize: 15, lineHeight: 22, color: '#334155' },
  formulaRow: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    padding: 10,
  },
  formulaName: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  formulaText: { marginTop: 2, fontSize: 14, fontFamily: 'monospace', color: '#1e293b' },
  formulaNote: { marginTop: 4, fontSize: 12, color: '#64748b' },
});
