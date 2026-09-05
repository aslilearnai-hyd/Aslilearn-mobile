import { useMemo, type ReactNode } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { stripStructuredAiToolMetadata } from '../../lib/strip-ai-tool-metadata';
import { resolveKeyPointsFromPayload, type KeyPointsContent } from '../../lib/parse-key-points';
import AiToolStackedSection from './AiToolStackedSection';
import AiToolMarkdownFallback from './AiToolMarkdownFallback';
import {
  ExpandableText,
  FlipCard,
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

function buildSections(kp: KeyPointsContent): ReactNode[] {
  const sections: ReactNode[] = [];
  let n = 0;
  const next = () => String(++n);

  if (kp.importantConcepts.length) {
    sections.push(
      <AiToolStackedSection key="concepts" num={next()} title="Most Important Concepts" icon="bulb-outline">
        <View style={styles.gap}>
          {kp.importantConcepts.map((c, i) => (
            <FlipCard
              key={i}
              tone="amber"
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
      </AiToolStackedSection>,
    );
  }
  if (kp.essentialDefinitions.length) {
    sections.push(
      <AiToolStackedSection key="defs" num={next()} title="Essential Definitions" icon="bookmark-outline">
        <View style={styles.gap}>
          {kp.essentialDefinitions.map((d, i) => (
            <TapToRevealCard key={i} prompt={d.term} detail={d.definition} tone="sky" />
          ))}
        </View>
      </AiToolStackedSection>,
    );
  }
  if (kp.formulae.length) {
    sections.push(
      <AiToolStackedSection key="formulae" num={next()} title="Important Formulae / Rules" icon="calculator-outline">
        <View style={styles.gap}>
          {kp.formulae.map((f, i) => (
            <View key={i} style={styles.formulaRow}>
              <Text style={styles.formulaName}>{f.name}</Text>
              <Text style={styles.formulaText}>{f.formula}</Text>
              {f.note ? <Text style={styles.formulaNote}>{f.note}</Text> : null}
            </View>
          ))}
        </View>
      </AiToolStackedSection>,
    );
  }
  if (kp.keywords.length) {
    sections.push(
      <AiToolStackedSection key="keywords" num={next()} title="Keywords & Terminologies" icon="key-outline">
        <Text style={styles.hint}>Tap a word to see what it means.</Text>
        <View style={styles.gap}>
          {kp.keywords.map((k, i) => (
            <TapToRevealCard key={i} prompt={k.term} detail={k.meaning} tone="amber" revealLabel="What's this?" />
          ))}
        </View>
      </AiToolStackedSection>,
    );
  }
  if (kp.mustRememberFacts.length) {
    sections.push(
      <AiToolStackedSection key="facts" num={next()} title="Must-remember Facts" icon="checkbox-outline">
        <SelfCheckList items={kp.mustRememberFacts} tone="rose" prompt="Tap each fact once it's locked in" />
      </AiToolStackedSection>,
    );
  }
  if (kp.realLifeConnections.length) {
    sections.push(
      <AiToolStackedSection key="real" num={next()} title="Real-life Connections" icon="sunny-outline">
        <View style={styles.gap}>
          {kp.realLifeConnections.map((item, i) => (
            <TapToMarkItem key={i} text={item} tone="lime" iconOff="lightbulb" iconOn="star" markedStyle="highlight" />
          ))}
        </View>
      </AiToolStackedSection>,
    );
  }
  if (kp.examPoints.length) {
    sections.push(
      <AiToolStackedSection key="exam" num={next()} title="Frequently Asked Exam Points" icon="flag-outline">
        <SelfCheckList items={kp.examPoints} tone="indigo" prompt="Tap each point you're ready to answer" />
      </AiToolStackedSection>,
    );
  }
  if (kp.mnemonics.length) {
    sections.push(
      <AiToolStackedSection key="mnemonic" num={next()} title="Mnemonics / Memory Tricks" icon="flash-outline">
        <View style={styles.gap}>
          {kp.mnemonics.map((item, i) => (
            <TapToMarkItem key={i} text={item} tone="violet" iconOff="sparkle" iconOn="star" markedStyle="highlight" />
          ))}
        </View>
      </AiToolStackedSection>,
    );
  }
  if (kp.oneMinuteSummary) {
    sections.push(
      <AiToolStackedSection key="summary" num={next()} title="One-minute Revision Summary" icon="sparkles-outline">
        <ExpandableText text={kp.oneMinuteSummary} />
      </AiToolStackedSection>,
    );
  }
  return sections;
}

export default function KeyPointsViewer({ content, rawContent, fill = false }: Props) {
  const { keyPoints, markdownFallback } = useMemo(() => {
    const text = stripStructuredAiToolMetadata(content);
    return resolveKeyPointsFromPayload(text, rawContent);
  }, [content, rawContent]);

  if (markdownFallback || !keyPoints) {
    return (
      <AiToolMarkdownFallback
        toolType="key-points-formula-extractor"
        content={content}
        rawContent={rawContent}
        fill={fill}
      />
    );
  }

  return wrapFill(<View style={styles.root}>{buildSections(keyPoints)}</View>, fill);
}

const styles = StyleSheet.create({
  fill: { flex: 1, minHeight: 0 },
  fillContent: { paddingBottom: 12 },
  root: { gap: 8 },
  gap: { gap: 8 },
  hint: { marginBottom: 8, fontSize: 12, fontWeight: '600', color: '#94a3b8' },
  conceptName: { fontSize: 15, fontWeight: '800', color: '#78350f' },
  flipHint: { marginTop: 4, fontSize: 11, fontWeight: '600', color: '#d97706' },
  body: { fontSize: 15, lineHeight: 22, color: '#334155' },
  formulaRow: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd6fe',
    backgroundColor: '#f5f3ff',
    padding: 10,
  },
  formulaName: { fontSize: 11, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase', color: '#6d28d9' },
  formulaText: { marginTop: 4, fontSize: 14, fontFamily: 'monospace', color: '#0f172a' },
  formulaNote: { marginTop: 4, fontSize: 12, color: '#64748b' },
});
