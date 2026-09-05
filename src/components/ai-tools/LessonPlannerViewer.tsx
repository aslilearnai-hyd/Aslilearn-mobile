import { useMemo, type ReactNode } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { stripStructuredAiToolMetadata } from '../../lib/strip-ai-tool-metadata';
import {
  lessonHasVisibleContent,
  resolveLessonsFromPayload,
  type NormalizedLesson,
} from '../../lib/parse-lesson-planner';
import AiToolStackedSection from './AiToolStackedSection';
import AiToolMarkdownFallback from './AiToolMarkdownFallback';
import {
  CheckableTimeline,
  ExpandableText,
  SelfCheckList,
  TapToMarkItem,
} from '../shared/ai-tool-interactive';

type Props = {
  content: string;
  rawContent?: unknown;
  variant?: 'student' | 'teacher' | 'default';
  toolKind?: 'lesson-planner' | 'study-schedule-maker';
  fill?: boolean;
};

type SectionDef = {
  num: number;
  title: string;
  icon: 'flag-outline' | 'help-circle-outline' | 'school-outline' | 'time-outline' | 'book-outline' | 'checkbox-outline' | 'cafe-outline' | 'people-outline' | 'trophy-outline' | 'chatbubble-ellipses-outline' | 'bulb-outline' | 'list-outline' | 'clipboard-outline' | 'sparkles-outline' | 'document-text-outline' | 'cube-outline' | 'checkmark-circle-outline';
  has: (l: NormalizedLesson) => boolean;
  render: (l: NormalizedLesson) => ReactNode;
};

const STUDY_SCHEDULE_SECTIONS: SectionDef[] = [
  {
    num: 2,
    title: 'Study Goal and Subtopic Link',
    icon: 'flag-outline',
    has: (l) => !!l.studyGoalSubtopicLink,
    render: (l) => <ExpandableText text={l.studyGoalSubtopicLink} />,
  },
  {
    num: 3,
    title: 'Prior Knowledge and Readiness Check',
    icon: 'help-circle-outline',
    has: (l) => !!l.priorKnowledgeReadiness || !!l.priorKnowledge,
    render: (l) => <ExpandableText text={l.priorKnowledgeReadiness || l.priorKnowledge} />,
  },
  {
    num: 4,
    title: "Learning Objectives - Bloom's Taxonomy Aligned",
    icon: 'flag-outline',
    has: (l) => l.learningObjectives.length > 0,
    render: (l) => <SelfCheckList items={l.learningObjectives} tone="indigo" />,
  },
  {
    num: 5,
    title: 'NCF Competency / Learning Outcome Alignment',
    icon: 'school-outline',
    has: (l) => l.ncfAlignment.length > 0,
    render: (l) => (
      <SelfCheckList items={l.ncfAlignment} tone="sky" prompt="Tap each alignment point once reviewed" />
    ),
  },
  {
    num: 6,
    title: 'Study Plan Table',
    icon: 'time-outline',
    has: (l) => l.studyPlanTable.length > 0 || l.timeline.length > 0,
    render: (l) => (
      <CheckableTimeline items={l.studyPlanTable.length ? l.studyPlanTable : l.timeline} tone="amber" />
    ),
  },
  {
    num: 7,
    title: 'Concept Learning Slot',
    icon: 'book-outline',
    has: (l) => !!l.conceptLearningSlot || !!l.introductionWarmup || !!l.teachingStrategy,
    render: (l) => (
      <ExpandableText
        text={l.conceptLearningSlot || [l.introductionWarmup, l.teachingStrategy].filter(Boolean).join('\n\n')}
      />
    ),
  },
  {
    num: 8,
    title: 'Practice Slot',
    icon: 'checkbox-outline',
    has: (l) => !!l.practiceSlot || l.studentTasks.length > 0 || !!l.homeworkPractice,
    render: (l) => (
      <ExpandableText
        text={l.practiceSlot || [...l.studentTasks, l.homeworkPractice].filter(Boolean).join('\n')}
      />
    ),
  },
  {
    num: 9,
    title: 'Breaks and Focus Tips',
    icon: 'cafe-outline',
    has: (l) => !!l.breaksFocusTips,
    render: (l) => <ExpandableText text={l.breaksFocusTips} />,
  },
  {
    num: 10,
    title: 'Self-Assessment Checkpoint',
    icon: 'checkbox-outline',
    has: (l) => !!l.selfAssessmentCheckpoint,
    render: (l) => <ExpandableText text={l.selfAssessmentCheckpoint} />,
  },
  {
    num: 11,
    title: 'Support and Extension Plan',
    icon: 'people-outline',
    has: (l) => !!l.supportExtensionPlan,
    render: (l) => <ExpandableText text={l.supportExtensionPlan} />,
  },
  {
    num: 12,
    title: 'Expected Learning Outcomes',
    icon: 'trophy-outline',
    has: (l) => l.expectedLearningOutcomes.length > 0,
    render: (l) => <SelfCheckList items={l.expectedLearningOutcomes} tone="teal" prompt="Tap each once reviewed" />,
  },
  {
    num: 13,
    title: 'Reflection / Exit Ticket',
    icon: 'chatbubble-ellipses-outline',
    has: (l) => !!l.reflectionExitTicket || !!l.closureExitTicket,
    render: (l) => <ExpandableText text={l.reflectionExitTicket || l.closureExitTicket} />,
  },
];

const LESSON_PLANNER_SECTIONS: SectionDef[] = [
  {
    num: 2,
    title: 'Learning Objectives',
    icon: 'flag-outline',
    has: (l) => l.learningObjectives.length > 0,
    render: (l) => <SelfCheckList items={l.learningObjectives} tone="indigo" />,
  },
  {
    num: 3,
    title: 'NCF Competency / Learning Outcome Alignment',
    icon: 'school-outline',
    has: (l) => l.ncfAlignment.length > 0,
    render: (l) => (
      <SelfCheckList items={l.ncfAlignment} tone="sky" prompt="Tap each alignment point once reviewed" />
    ),
  },
  {
    num: 4,
    title: 'Prior Knowledge / Diagnostic Question',
    icon: 'help-circle-outline',
    has: (l) => !!l.priorKnowledgeReadiness || !!l.priorKnowledge,
    render: (l) => <ExpandableText text={l.priorKnowledgeReadiness || l.priorKnowledge} />,
  },
  {
    num: 5,
    title: 'Introduction / Warm-up',
    icon: 'bulb-outline',
    has: (l) => !!l.introductionWarmup,
    render: (l) => <ExpandableText text={l.introductionWarmup} />,
  },
  {
    num: 6,
    title: 'Teaching Strategy',
    icon: 'book-outline',
    has: (l) => !!l.teachingStrategy,
    render: (l) => <ExpandableText text={l.teachingStrategy} />,
  },
  {
    num: 7,
    title: 'Classroom Activities',
    icon: 'list-outline',
    has: (l) => l.classroomActivities.length > 0,
    render: (l) => <SelfCheckList items={l.classroomActivities} tone="emerald" prompt="Tap each once planned" />,
  },
  {
    num: 8,
    title: 'Teacher Talk Points',
    icon: 'chatbubble-ellipses-outline',
    has: (l) => l.teacherTalkPoints.length > 0,
    render: (l) => <SelfCheckList items={l.teacherTalkPoints} tone="indigo" prompt="Tap each once covered" />,
  },
  {
    num: 9,
    title: 'Student Tasks',
    icon: 'people-outline',
    has: (l) => l.studentTasks.length > 0,
    render: (l) => <SelfCheckList items={l.studentTasks} tone="sky" prompt="Tap each once assigned" />,
  },
  {
    num: 10,
    title: 'Formative Assessment Questions',
    icon: 'clipboard-outline',
    has: (l) => l.formativeQuestions.length > 0,
    render: (l) => <SelfCheckList items={l.formativeQuestions} tone="rose" prompt="Tap each once asked" />,
  },
  {
    num: 11,
    title: 'Differentiation Plan',
    icon: 'sparkles-outline',
    has: (l) => !!l.differentiationPlan,
    render: (l) => <ExpandableText text={l.differentiationPlan} />,
  },
  {
    num: 12,
    title: 'Homework / Practice',
    icon: 'document-text-outline',
    has: (l) => !!l.homeworkPractice,
    render: (l) => <ExpandableText text={l.homeworkPractice} />,
  },
  {
    num: 13,
    title: 'Teaching Aids Required',
    icon: 'cube-outline',
    has: (l) => l.teachingAids.length > 0,
    render: (l) => (
      <View style={styles.gap}>
        {l.teachingAids.map((item, i) => (
          <TapToMarkItem key={i} text={item} tone="amber" iconOff="notebook" iconOn="checklist" markedStyle="strike" />
        ))}
      </View>
    ),
  },
  {
    num: 14,
    title: 'Closure / Exit Ticket',
    icon: 'checkmark-circle-outline',
    has: (l) => !!l.closureExitTicket,
    render: (l) => <ExpandableText text={l.closureExitTicket} />,
  },
];

function wrapFill(node: ReactNode, fill: boolean) {
  if (!fill) return node;
  return (
    <ScrollView style={styles.fill} contentContainerStyle={styles.fillContent} nestedScrollEnabled>
      {node}
    </ScrollView>
  );
}

function LessonCard({
  lesson,
  sections,
  eyebrow,
}: {
  lesson: NormalizedLesson;
  sections: SectionDef[];
  eyebrow: string;
}) {
  return (
    <View style={styles.root}>
      <View style={styles.titleCard}>
        <Text style={styles.kicker}>{eyebrow}</Text>
        <Text style={styles.title}>{lesson.lessonName || 'Lesson plan'}</Text>
        {lesson.durationLabel ? <Text style={styles.meta}>{lesson.durationLabel}</Text> : null}
      </View>
      {sections
        .filter((s) => s.has(lesson))
        .map((s) => (
          <AiToolStackedSection key={s.num} num={String(s.num)} title={s.title} icon={s.icon}>
            {s.render(lesson)}
          </AiToolStackedSection>
        ))}
    </View>
  );
}

export default function LessonPlannerViewer({
  content,
  rawContent,
  variant = 'default',
  toolKind,
  fill = false,
}: Props) {
  const resolvedKind =
    toolKind || (variant === 'student' ? 'study-schedule-maker' : 'lesson-planner');
  const { lessons, markdownFallback } = useMemo(() => {
    const text = stripStructuredAiToolMetadata(content);
    return resolveLessonsFromPayload(text, rawContent);
  }, [content, rawContent]);

  const visible = lessons.filter(lessonHasVisibleContent);
  if (markdownFallback || !visible.length) {
    return (
      <AiToolMarkdownFallback
        toolType={resolvedKind}
        content={content}
        rawContent={rawContent}
        variant={variant === 'student' ? 'student' : 'teacher'}
        fill={fill}
      />
    );
  }

  const sections = resolvedKind === 'study-schedule-maker' ? STUDY_SCHEDULE_SECTIONS : LESSON_PLANNER_SECTIONS;
  const eyebrow = resolvedKind === 'study-schedule-maker' ? 'Study Schedule Maker' : 'Lesson Planner';

  return wrapFill(
    <View style={styles.stack}>
      {visible.map((lesson, i) => (
        <LessonCard key={`${lesson.lessonName}-${i}`} lesson={lesson} sections={sections} eyebrow={eyebrow} />
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
    borderColor: '#fde68a',
    backgroundColor: '#FFFFFF',
    padding: 12,
  },
  kicker: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase', color: '#b45309' },
  title: { marginTop: 4, fontSize: 18, fontWeight: '800', color: '#0f172a', lineHeight: 24 },
  meta: { marginTop: 6, fontSize: 13, fontWeight: '600', color: '#64748b' },
});
