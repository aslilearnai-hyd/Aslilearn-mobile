import { type ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { resolveAiToolDisplayType } from '../../lib/ai-tool-generate';
import FlashcardViewer from './FlashcardViewer';
import ActivityProjectViewer from './ActivityProjectViewer';
import SmartStudyGuideViewer from './SmartStudyGuideViewer';
import ConceptBreakdownViewer from './ConceptBreakdownViewer';
import ChapterSummaryViewer from './ChapterSummaryViewer';
import KeyPointsViewer from './KeyPointsViewer';
import PracticeQaViewer from './PracticeQaViewer';
import QuickAssignmentViewer from './QuickAssignmentViewer';
import HomeworkCreatorViewer from './HomeworkCreatorViewer';
import ConceptMasteryViewer from './ConceptMasteryViewer';
import LessonPlannerViewer from './LessonPlannerViewer';
import DailyClassPlanViewer from './DailyClassPlanViewer';
import ShortNotesViewer from './ShortNotesViewer';
import StoryPassageViewer from './StoryPassageViewer';
import WorksheetMcqViewer from './WorksheetMcqViewer';
import ExamQuestionPaperViewer, { MockTestViewer } from './ExamQuestionPaperViewer';

export type InteractiveAiToolAudience = 'teacher' | 'student';

function wrapFill(node: ReactNode, fill: boolean) {
  if (!fill) return node;
  return (
    <ScrollView
      style={styles.fill}
      contentContainerStyle={styles.fillContent}
      nestedScrollEnabled
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator
    >
      {node}
    </ScrollView>
  );
}

/**
 * Resolve an interactive specialized viewer — same routing as web
 * `resolveInteractiveAiToolViewer`. Web is the source of truth for sections
 * and labels; these native viewers keep a mobile-friendly stacked layout.
 */
export function resolveInteractiveAiToolViewer({
  toolType,
  content,
  rawContent,
  audience = 'teacher',
  fill = false,
}: {
  toolType: string;
  content: string;
  rawContent?: unknown;
  audience?: InteractiveAiToolAudience;
  fill?: boolean;
}): ReactNode | null {
  const slug = resolveAiToolDisplayType(toolType, audience);
  const isStudent = audience === 'student';

  switch (slug) {
    case 'flashcard-generator':
      return wrapFill(
        <FlashcardViewer content={content} rawContent={rawContent} variant="teacher" toolType={slug} />,
        fill,
      );
    case 'my-study-decks':
      return wrapFill(
        <FlashcardViewer content={content} rawContent={rawContent} variant="student" toolType={slug} />,
        fill,
      );
    case 'worksheet-mcq-generator':
      return (
        <WorksheetMcqViewer
          content={content}
          rawContent={rawContent}
          variant={isStudent ? 'student' : 'teacher'}
          fill={fill}
        />
      );
    case 'homework-creator':
      return <HomeworkCreatorViewer content={content} rawContent={rawContent} fill={fill} />;
    case 'mock-test-builder':
      return <MockTestViewer content={content} rawContent={rawContent} fill={fill} />;
    case 'exam-question-paper-generator':
      return <ExamQuestionPaperViewer content={content} rawContent={rawContent} fill={fill} />;
    case 'smart-qa-practice-generator':
      return <PracticeQaViewer content={content} rawContent={rawContent} fill={fill} />;
    case 'quick-assignment-builder':
      return <QuickAssignmentViewer content={content} rawContent={rawContent} fill={fill} />;
    case 'smart-study-guide-generator':
      return (
        <SmartStudyGuideViewer content={content} rawContent={rawContent} toolType={slug} fill={fill} />
      );
    case 'concept-breakdown-explainer':
      return <ConceptBreakdownViewer content={content} rawContent={rawContent} fill={fill} />;
    case 'concept-mastery-helper':
      return (
        <ConceptMasteryViewer
          content={content}
          rawContent={rawContent}
          variant={isStudent ? 'student' : 'teacher'}
          fill={fill}
        />
      );
    case 'chapter-summary-creator':
      return <ChapterSummaryViewer content={content} rawContent={rawContent} fill={fill} />;
    case 'key-points-formula-extractor':
      return <KeyPointsViewer content={content} rawContent={rawContent} fill={fill} />;
    case 'short-notes-summaries-maker':
      return <ShortNotesViewer content={content} rawContent={rawContent} fill={fill} />;
    case 'lesson-planner':
      return (
        <LessonPlannerViewer
          content={content}
          rawContent={rawContent}
          variant="default"
          toolKind="lesson-planner"
          fill={fill}
        />
      );
    case 'study-schedule-maker':
      return (
        <LessonPlannerViewer
          content={content}
          rawContent={rawContent}
          variant="student"
          toolKind="study-schedule-maker"
          fill={fill}
        />
      );
    case 'daily-class-plan-maker':
      return <DailyClassPlanViewer content={content} rawContent={rawContent} fill={fill} />;
    case 'activity-project-generator':
    case 'project-idea-lab':
      return wrapFill(
        <ActivityProjectViewer
          content={content}
          rawContent={rawContent}
          variant={slug === 'project-idea-lab' ? 'student' : audience}
          toolType={slug}
        />,
        fill,
      );
    case 'story-passage-creator':
      return (
        <StoryPassageViewer
          content={content}
          rawContent={rawContent}
          variant={isStudent ? 'student' : 'default'}
          fill={fill}
        />
      );
    case 'reading-practice-room':
      return (
        <StoryPassageViewer content={content} rawContent={rawContent} variant="student" fill={fill} />
      );
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  fill: { flex: 1, minHeight: 0 },
  fillContent: { paddingBottom: 12 },
});
