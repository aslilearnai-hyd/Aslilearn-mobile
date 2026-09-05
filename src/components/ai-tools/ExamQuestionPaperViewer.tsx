import { useMemo, useState, type ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { stripStructuredAiToolMetadata } from '../../lib/strip-ai-tool-metadata';
import {
  examPaperHasVisibleContent,
  resolveExamPaperFromPayload,
  type ExamSection,
  type NormalizedExamPaper,
} from '../../lib/parse-exam-question-paper';
import { resolveMockTestFromPayload } from '../../lib/parse-mock-test';
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

function RevealBlock({ label, children }: { label: string; children: ReactNode }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <View style={styles.gap}>
      <Pressable onPress={() => setRevealed((v) => !v)} style={styles.revealBtn} accessibilityRole="button">
        <Ionicons name={revealed ? 'eye-off-outline' : 'eye-outline'} size={14} color="#0369a1" />
        <Text style={styles.revealLabel}>{revealed ? `Hide ${label.toLowerCase()}` : `Reveal ${label.toLowerCase()}`}</Text>
      </Pressable>
      {revealed ? children : null}
    </View>
  );
}

function ExamSectionBlock({ section, showAnswers }: { section: ExamSection; showAnswers: boolean }) {
  return (
    <View style={styles.gap}>
      <Text style={styles.sectionLabel}>{section.title}</Text>
      {section.questions.map((q, i) => (
        <AiToolQuestionCard
          key={`${section.id}-${i}`}
          index={i}
          question={q.question}
          options={q.options}
          answer={showAnswers ? q.answer : undefined}
          marks={q.marks ?? undefined}
          accent="#e11d48"
        />
      ))}
    </View>
  );
}

function TeacherExamBody({ paper }: { paper: NormalizedExamPaper }) {
  const active = paper.sections.filter((s) => s.questions.length > 0);
  const totalQuestions = active.reduce((n, s) => n + s.questions.length, 0);
  const totalMarks = active.reduce(
    (n, s) => n + s.questions.reduce((m, q) => m + (q.marks != null ? q.marks : 0), 0),
    0,
  );

  const nodes: ReactNode[] = [
    <AiToolStackedSection key="overview" num="1" title="Paper Overview" icon="clipboard-outline">
      <View style={styles.gap}>
        <Text style={styles.title}>{paper.paperTitle || 'Exam Question Paper'}</Text>
        <Text style={styles.meta}>
          {totalQuestions} questions · {totalMarks || '—'} marks
        </Text>
        {paper.instructions ? <ExpandableText text={paper.instructions} /> : null}
      </View>
    </AiToolStackedSection>,
  ];

  if (paper.blueprint?.trim()) {
    nodes.push(
      <AiToolStackedSection key="blueprint" num="2" title="Blueprint / Question Distribution" icon="flag-outline">
        <ExpandableText text={paper.blueprint} />
      </AiToolStackedSection>,
    );
  }

  active.forEach((sec, i) => {
    nodes.push(
      <AiToolStackedSection key={sec.id} num={String(i + 3)} title={sec.title} icon="help-circle-outline">
        <ExamSectionBlock section={sec} showAnswers={false} />
      </AiToolStackedSection>,
    );
  });

  if (paper.internalChoices?.trim()) {
    nodes.push(
      <AiToolStackedSection key="choices" num="8" title="Internal Choices" icon="git-branch-outline">
        <ExpandableText text={paper.internalChoices} />
      </AiToolStackedSection>,
    );
  }
  if (paper.answerKey?.trim()) {
    nodes.push(
      <AiToolStackedSection key="ak" num="9" title="Answer Key Snapshot" icon="checkmark-circle-outline">
        <TapToRevealCard prompt="Answer key" detail={paper.answerKey} tone="emerald" revealLabel="Show answer key" />
      </AiToolStackedSection>,
    );
  }
  if (paper.markingScheme?.trim()) {
    nodes.push(
      <AiToolStackedSection key="marking" num="10" title="Detailed Marking Scheme" icon="list-outline">
        <ExpandableText text={paper.markingScheme} />
      </AiToolStackedSection>,
    );
  }
  if (paper.openEndedRubric?.trim()) {
    nodes.push(
      <AiToolStackedSection key="rubric" num="11" title="Rubric for Open-ended Questions" icon="document-text-outline">
        <ExpandableText text={paper.openEndedRubric} />
      </AiToolStackedSection>,
    );
  }

  return <View style={styles.root}>{nodes}</View>;
}

export default function ExamQuestionPaperViewer({ content, rawContent, fill = false }: Props) {
  const parsed = useMemo(() => stripStructuredAiToolMetadata(String(content || '')), [content]);
  const { paper, markdownFallback } = useMemo(
    () => resolveExamPaperFromPayload(parsed, rawContent),
    [parsed, rawContent],
  );

  if (markdownFallback || !paper || !examPaperHasVisibleContent(paper)) {
    return (
      <AiToolMarkdownFallback
        toolType="exam-question-paper-generator"
        content={content}
        rawContent={rawContent}
        variant="teacher"
        fill={fill}
      />
    );
  }

  return wrapFill(<TeacherExamBody paper={paper} />, fill);
}

export function MockTestViewer({ content, rawContent, fill = false }: Props) {
  const { meta, paper, markdownFallback } = useMemo(
    () => resolveMockTestFromPayload(stripStructuredAiToolMetadata(content), rawContent),
    [content, rawContent],
  );

  if (markdownFallback && (!paper || !examPaperHasVisibleContent(paper))) {
    return (
      <AiToolMarkdownFallback
        toolType="mock-test-builder"
        content={content}
        rawContent={rawContent}
        fill={fill}
      />
    );
  }

  const active = paper?.sections.filter((s) => s.questions.length > 0) ?? [];
  const defs: Array<{ title: string; icon: 'flag-outline' | 'bulb-outline' | 'school-outline' | 'clipboard-outline' | 'help-circle-outline' | 'checkmark-circle-outline' | 'book-outline' | 'refresh-outline' | 'trophy-outline' | 'leaf-outline' | 'chatbubble-ellipses-outline'; has: boolean; body: ReactNode }> = [
    {
      title: 'Test Purpose and Subtopic Link',
      icon: 'flag-outline',
      has: !!meta.testPurpose.trim(),
      body: <ExpandableText text={meta.testPurpose} />,
    },
    {
      title: "Learning Objectives – Bloom's Taxonomy",
      icon: 'bulb-outline',
      has: meta.learningObjectives.length > 0,
      body: <SelfCheckList items={meta.learningObjectives} tone="violet" />,
    },
    {
      title: 'NCF Competency / Learning Outcome Alignment',
      icon: 'school-outline',
      has: !!meta.ncfAlignment.trim(),
      body: <ExpandableText text={meta.ncfAlignment} />,
    },
    {
      title: 'Instructions for Students',
      icon: 'clipboard-outline',
      has: !!meta.instructions.trim(),
      body: <ExpandableText text={meta.instructions} />,
    },
    {
      title: 'Question Paper',
      icon: 'help-circle-outline',
      has: active.length > 0,
      body: (
        <View style={styles.gap}>
          {active.map((sec) => (
            <ExamSectionBlock key={sec.id} section={sec} showAnswers={false} />
          ))}
        </View>
      ),
    },
    {
      title: 'Answer Key',
      icon: 'checkmark-circle-outline',
      has: !!meta.answerKey.trim() || !!paper?.answerKey?.trim(),
      body: (
        <RevealBlock label="Answer key">
          <ExpandableText text={meta.answerKey || paper?.answerKey || ''} />
        </RevealBlock>
      ),
    },
    {
      title: 'Step-by-step Solutions / Explanations',
      icon: 'book-outline',
      has: !!meta.solutions.trim(),
      body: (
        <RevealBlock label="Solutions">
          <ExpandableText text={meta.solutions} />
        </RevealBlock>
      ),
    },
    {
      title: 'Remedial Revision Suggestions',
      icon: 'refresh-outline',
      has: meta.remedial.length > 0,
      body: <SelfCheckList items={meta.remedial} tone="amber" prompt="Tap each suggestion once tried" />,
    },
    {
      title: 'Expected Learning Outcomes',
      icon: 'trophy-outline',
      has: meta.outcomes.length > 0,
      body: <SelfCheckList items={meta.outcomes} tone="indigo" prompt="Tap each once reviewed" />,
    },
    {
      title: 'Real-life Application',
      icon: 'leaf-outline',
      has: !!meta.realLife.trim(),
      body: <ExpandableText text={meta.realLife} />,
    },
    {
      title: 'Reflection / Exit Ticket',
      icon: 'chatbubble-ellipses-outline',
      has: !!meta.reflection.trim(),
      body: <ExpandableText text={meta.reflection} />,
    },
  ];

  const body = (
    <View style={styles.root}>
      <View style={styles.titleCard}>
        <Text style={styles.kicker}>Mock Test Builder</Text>
        <Text style={styles.title}>{meta.title || paper?.paperTitle || 'Mock test paper'}</Text>
      </View>
      {defs
        .filter((d) => d.has)
        .map((d, i) => (
          <AiToolStackedSection key={d.title} num={String(i + 2)} title={d.title} icon={d.icon}>
            {d.body}
          </AiToolStackedSection>
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
  titleCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fecdd3',
    backgroundColor: '#FFFFFF',
    padding: 12,
  },
  kicker: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase', color: '#be123c' },
  title: { marginTop: 4, fontSize: 18, fontWeight: '800', color: '#0f172a', lineHeight: 24 },
  meta: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  sectionLabel: { fontSize: 13, fontWeight: '800', color: '#9f1239' },
  revealBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  revealLabel: { fontSize: 12, fontWeight: '700', color: '#0369a1' },
});
