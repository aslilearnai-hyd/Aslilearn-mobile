import { useMemo, type ReactNode } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { stripStructuredAiToolMetadata } from '../../lib/strip-ai-tool-metadata';
import {
  resolveShortNotesFromPayload,
  type LegacyShortNote,
  type ShortNoteItem,
} from '../../lib/parse-short-notes';
import AiToolStackedSection from './AiToolStackedSection';
import AiToolMarkdownFallback from './AiToolMarkdownFallback';
import { ExpandableText } from '../shared/ai-tool-interactive';

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

function TemplateNote({ item }: { item: ShortNoteItem }) {
  const chips = [
    item.meta?.classLabel ? `Class: ${item.meta.classLabel}` : '',
    item.meta?.subject ? `Subject: ${item.meta.subject}` : '',
    item.meta?.subtopic ? `Subtopic: ${item.meta.subtopic}` : '',
    item.meta?.bloomLevel ? `Bloom: ${item.meta.bloomLevel}` : '',
    item.meta?.skillFocus ? `Skill: ${item.meta.skillFocus}` : '',
  ].filter(Boolean);

  return (
    <View style={styles.root}>
      <View style={styles.titleCard}>
        <Text style={styles.kicker}>Short Notes & Summaries</Text>
        <Text style={styles.title}>{item.title}</Text>
        {chips.length ? (
          <View style={styles.chips}>
            {chips.map((chip) => (
              <Text key={chip} style={styles.chip}>
                {chip}
              </Text>
            ))}
          </View>
        ) : null}
      </View>
      {item.sections
        .filter((section) => String(section.body || '').trim())
        .map((section, index) => (
          <AiToolStackedSection
            key={`${section.num}-${section.label}`}
            num={String(section.num || index + 1)}
            title={section.label}
            icon="document-text-outline"
          >
            <ExpandableText text={section.body} />
          </AiToolStackedSection>
        ))}
    </View>
  );
}

function LegacyNote({ note }: { note: LegacyShortNote }) {
  return (
    <View style={styles.root}>
      <View style={styles.titleCard}>
        <Text style={styles.kicker}>Short Notes & Summaries</Text>
        <Text style={styles.title}>{note.concept_name || 'Notes'}</Text>
      </View>
      {note.summary ? (
        <AiToolStackedSection num="1" title="Summary" icon="document-text-outline">
          <ExpandableText text={note.summary} />
        </AiToolStackedSection>
      ) : null}
      {note.importance ? (
        <AiToolStackedSection num="2" title="Why it matters" icon="bulb-outline">
          <ExpandableText text={note.importance} />
        </AiToolStackedSection>
      ) : null}
      {note.quick_facts?.length ? (
        <AiToolStackedSection num="3" title="Quick facts" icon="star-outline">
          <View style={styles.gap}>
            {note.quick_facts.map((fact, i) => (
              <Text key={`${fact}-${i}`} style={styles.fact}>
                {i + 1}. {fact}
              </Text>
            ))}
          </View>
        </AiToolStackedSection>
      ) : null}
    </View>
  );
}

export default function ShortNotesViewer({ content, rawContent, fill = false }: Props) {
  const resolved = useMemo(() => {
    const text = stripStructuredAiToolMetadata(content);
    return resolveShortNotesFromPayload(text, rawContent);
  }, [content, rawContent]);

  if (!resolved) {
    return (
      <AiToolMarkdownFallback
        toolType="short-notes-summaries-maker"
        content={content}
        rawContent={rawContent}
        variant="teacher"
        fill={fill}
      />
    );
  }

  if (resolved.mode === 'template') {
    return wrapFill(
      <View style={styles.stack}>
        {resolved.items.map((item, i) => (
          <TemplateNote key={`${item.title}-${i}`} item={item} />
        ))}
      </View>,
      fill,
    );
  }

  return wrapFill(
    <View style={styles.stack}>
      {resolved.notes.map((note, i) => (
        <LegacyNote key={`${note.concept_name}-${i}`} note={note} />
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
  titleCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#a5f3fc',
    backgroundColor: '#FFFFFF',
    padding: 12,
  },
  kicker: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase', color: '#0e7490' },
  title: { marginTop: 4, fontSize: 18, fontWeight: '800', color: '#0f172a', lineHeight: 24 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 11,
    color: '#475569',
  },
  fact: { fontSize: 14, lineHeight: 20, color: '#334155' },
});
