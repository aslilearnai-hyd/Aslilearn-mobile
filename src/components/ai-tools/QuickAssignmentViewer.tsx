import { useMemo, type ReactNode } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { stripStructuredAiToolMetadata } from '../../lib/strip-ai-tool-metadata';
import {
  resolveQuickAssignmentFromPayload,
  type QuickAssignmentContent,
} from '../../lib/parse-quick-assignment';
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

function buildBody(a: QuickAssignmentContent): ReactNode[] {
  const defs: Array<{ title: string; icon: 'flag-outline' | 'clipboard-outline' | 'help-circle-outline' | 'sparkles-outline' | 'beaker-outline' | 'bulb-outline' | 'people-outline' | 'rocket-outline' | 'options-outline' | 'trophy-outline'; has: boolean; body: ReactNode }> = [
    {
      title: 'Learning Objectives',
      icon: 'flag-outline',
      has: a.learningObjectives.length > 0,
      body: <SelfCheckList items={a.learningObjectives} tone="rose" />,
    },
    {
      title: 'Instructions to Students',
      icon: 'clipboard-outline',
      has: !!a.instructions.trim(),
      body: <ExpandableText text={a.instructions} />,
    },
    {
      title: 'Concept-based Questions',
      icon: 'help-circle-outline',
      has: a.conceptQuestions.length > 0,
      body: (
        <View style={styles.gap}>
          {a.conceptQuestions.map((q, i) => (
            <AiToolQuestionCard
              key={`q-${i}`}
              index={i}
              question={q.question}
              options={q.options}
              answer={q.answer}
              marks={q.marks}
              accent="#d97706"
            />
          ))}
        </View>
      ),
    },
    {
      title: 'Application-oriented Tasks',
      icon: 'sparkles-outline',
      has: a.applicationTasks.length > 0,
      body: <SelfCheckList items={a.applicationTasks} tone="amber" prompt="Tap each task once it's done" />,
    },
    {
      title: 'Real-life / Competency-based Activity',
      icon: 'beaker-outline',
      has: !!a.realLifeActivity.trim(),
      body: <ExpandableText text={a.realLifeActivity} />,
    },
    {
      title: 'Creative Thinking Question',
      icon: 'bulb-outline',
      has: !!a.creativeQuestion.trim(),
      body: <ExpandableText text={a.creativeQuestion} />,
    },
    {
      title: 'Collaborative / Discussion Task (if suitable)',
      icon: 'people-outline',
      has: !!a.collaborativeTask.trim(),
      body: <ExpandableText text={a.collaborativeTask} />,
    },
    {
      title: 'Challenge Question for Advanced Learners',
      icon: 'rocket-outline',
      has: !!a.challengeQuestion.trim(),
      body: <ExpandableText text={a.challengeQuestion} />,
    },
    {
      title: 'Assessment Criteria / Rubric',
      icon: 'options-outline',
      has: !!a.assessmentRubric.trim(),
      body: <ExpandableText text={a.assessmentRubric} />,
    },
    {
      title: 'Expected Learning Outcomes',
      icon: 'trophy-outline',
      has: a.expectedOutcomes.length > 0,
      body: <SelfCheckList items={a.expectedOutcomes} tone="teal" prompt="Tap each outcome once reviewed" />,
    },
  ];

  const nodes: ReactNode[] = [];
  if (a.title.trim()) {
    nodes.push(
      <AiToolStackedSection key="title" num="1" title="Assignment Title" icon="document-text-outline">
        <ExpandableText text={a.title} />
      </AiToolStackedSection>,
    );
  }
  defs
    .filter((d) => d.has)
    .forEach((d, i) => {
      nodes.push(
        <AiToolStackedSection key={d.title} num={String(i + 2)} title={d.title} icon={d.icon}>
          {d.body}
        </AiToolStackedSection>,
      );
    });
  return nodes;
}

export default function QuickAssignmentViewer({ content, rawContent, fill = false }: Props) {
  const { assignment, markdownFallback } = useMemo(() => {
    const text = stripStructuredAiToolMetadata(content);
    return resolveQuickAssignmentFromPayload(text, rawContent);
  }, [content, rawContent]);

  if (markdownFallback || !assignment) {
    return (
      <AiToolMarkdownFallback
        toolType="quick-assignment-builder"
        content={content}
        rawContent={rawContent}
        fill={fill}
      />
    );
  }

  return wrapFill(<View style={styles.root}>{buildBody(assignment)}</View>, fill);
}

const styles = StyleSheet.create({
  fill: { flex: 1, minHeight: 0 },
  fillContent: { paddingBottom: 12 },
  root: { gap: 8 },
  gap: { gap: 8 },
});
