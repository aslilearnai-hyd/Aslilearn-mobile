import { useMemo, type ReactNode } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { stripStructuredAiToolMetadata } from '../../lib/strip-ai-tool-metadata';
import {
  resolveStoryFromPayload,
  type ParsedStory,
} from '../../lib/parse-story-content';
import AiToolStackedSection from './AiToolStackedSection';
import AiToolMarkdownFallback from './AiToolMarkdownFallback';
import { ExpandableText, SelfCheckList, TapToRevealCard } from '../shared/ai-tool-interactive';

type Props = {
  content: string;
  rawContent?: unknown;
  variant?: 'student' | 'teacher' | 'default';
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

function questionLines(items: { question: string; answer?: string }[]): string[] {
  return items.map((q) => q.question).filter(Boolean);
}

function StudentStory({ story }: { story: ParsedStory }) {
  const defs: Array<{ title: string; icon: 'book-outline' | 'flag-outline' | 'school-outline' | 'text-outline' | 'document-text-outline' | 'help-circle-outline' | 'bulb-outline' | 'sparkles-outline' | 'create-outline' | 'checkmark-circle-outline' | 'trophy-outline' | 'chatbubble-ellipses-outline'; has: boolean; body: ReactNode }> = [
    {
      title: 'Reading Practice Title',
      icon: 'book-outline',
      has: !!story.title,
      body: <ExpandableText text={story.title} />,
    },
    {
      title: 'Subtopic Link and Prior Knowledge Required',
      icon: 'flag-outline',
      has: !!story.subtopicLinkPriorKnowledge || !!story.priorKnowledgeRequired,
      body: <ExpandableText text={story.subtopicLinkPriorKnowledge || story.priorKnowledgeRequired} />,
    },
    {
      title: "Learning Objectives - Bloom's Taxonomy Aligned",
      icon: 'flag-outline',
      has: story.learningObjectives.length > 0,
      body: <SelfCheckList items={story.learningObjectives} tone="indigo" />,
    },
    {
      title: 'NCF Competency / Learning Outcome Alignment',
      icon: 'school-outline',
      has: !!story.ncfAlignment || !!story.alignment,
      body: <ExpandableText text={story.ncfAlignment || story.alignment} />,
    },
    {
      title: 'Vocabulary Warm-up',
      icon: 'text-outline',
      has: story.vocabulary.length > 0,
      body: <SelfCheckList items={story.vocabulary} tone="amber" prompt="Tap each word once you've reviewed it" />,
    },
    {
      title: 'Passage / Story',
      icon: 'document-text-outline',
      has: !!story.passage,
      body: <ExpandableText text={story.passage} threshold={400} />,
    },
    {
      title: 'Read and Recall Questions',
      icon: 'help-circle-outline',
      has: story.readRecallQuestions.length > 0,
      body: <SelfCheckList items={questionLines(story.readRecallQuestions)} tone="sky" prompt="Tap each once answered" />,
    },
    {
      title: 'Think and Infer Questions',
      icon: 'bulb-outline',
      has: story.thinkInferQuestions.length > 0,
      body: <SelfCheckList items={questionLines(story.thinkInferQuestions)} tone="violet" prompt="Tap each once answered" />,
    },
    {
      title: 'Apply and Connect Questions',
      icon: 'sparkles-outline',
      has: story.applyConnectQuestions.length > 0,
      body: <SelfCheckList items={questionLines(story.applyConnectQuestions)} tone="emerald" prompt="Tap each once answered" />,
    },
    {
      title: 'Vocabulary Practice',
      icon: 'create-outline',
      has: story.vocabularyPractice.length > 0 || !!story.vocabularyGrammarPractice,
      body: story.vocabularyPractice.length ? (
        <SelfCheckList items={story.vocabularyPractice} tone="amber" />
      ) : (
        <ExpandableText text={story.vocabularyGrammarPractice} />
      ),
    },
    {
      title: 'Answer Key / Suggested Responses',
      icon: 'checkmark-circle-outline',
      has: !!story.answerKeySuggestedResponses || story.answerHints.length > 0,
      body: (
        <TapToRevealCard
          prompt="Check your answers"
          detail={story.answerKeySuggestedResponses || story.answerHints.join('\n')}
          tone="emerald"
          revealLabel="Show suggested responses"
        />
      ),
    },
    {
      title: 'Expected Learning Outcomes',
      icon: 'trophy-outline',
      has: !!story.expectedLearningOutcomes,
      body: <ExpandableText text={story.expectedLearningOutcomes} />,
    },
    {
      title: 'Reflection / Exit Ticket',
      icon: 'chatbubble-ellipses-outline',
      has: !!story.reflection,
      body: <ExpandableText text={story.reflection} />,
    },
  ];

  return (
    <View style={styles.root}>
      {defs
        .filter((d) => d.has)
        .map((d, i) => (
          <AiToolStackedSection key={d.title} num={String(i + 1)} title={d.title} icon={d.icon}>
            {d.body}
          </AiToolStackedSection>
        ))}
    </View>
  );
}

function TeacherStory({ story }: { story: ParsedStory }) {
  const defs: Array<{ title: string; has: boolean; body: ReactNode; icon: 'book-outline' | 'flag-outline' | 'help-circle-outline' | 'school-outline' | 'text-outline' | 'bulb-outline' | 'document-text-outline' | 'sparkles-outline' | 'create-outline' | 'checkmark-circle-outline' | 'warning-outline' | 'people-outline' | 'trophy-outline' | 'globe-outline' | 'chatbubble-ellipses-outline' }> = [
    { title: 'Story / Passage Title', icon: 'book-outline', has: !!story.title, body: <ExpandableText text={story.title} /> },
    {
      title: 'Topic and Subtopic Connection',
      icon: 'flag-outline',
      has: !!story.topicSubtopicConnection || !!story.subtopicLinkPriorKnowledge,
      body: <ExpandableText text={story.topicSubtopicConnection || story.subtopicLinkPriorKnowledge} />,
    },
    {
      title: 'Prior Knowledge Required',
      icon: 'help-circle-outline',
      has: !!story.priorKnowledgeRequired,
      body: <ExpandableText text={story.priorKnowledgeRequired} />,
    },
    {
      title: "Learning Objectives – Bloom's Taxonomy Aligned",
      icon: 'flag-outline',
      has: story.learningObjectives.length > 0,
      body: <SelfCheckList items={story.learningObjectives} tone="indigo" />,
    },
    {
      title: 'NCF Competency / Learning Outcome Alignment',
      icon: 'school-outline',
      has: !!story.ncfAlignment || !!story.alignment,
      body: <ExpandableText text={story.ncfAlignment || story.alignment} />,
    },
    {
      title: 'Vocabulary Warm-up',
      icon: 'text-outline',
      has: story.vocabulary.length > 0,
      body: <SelfCheckList items={story.vocabulary} tone="amber" prompt="Tap each word once reviewed" />,
    },
    {
      title: 'Pre-reading Thinking Prompt',
      icon: 'bulb-outline',
      has: !!story.preReadingPrompt,
      body: <ExpandableText text={story.preReadingPrompt} />,
    },
    {
      title: 'Story / Passage Content',
      icon: 'document-text-outline',
      has: !!story.passage,
      body: <ExpandableText text={story.passage} threshold={400} />,
    },
    {
      title: 'Read and Recall Questions',
      icon: 'help-circle-outline',
      has: story.readRecallQuestions.length > 0,
      body: <SelfCheckList items={questionLines(story.readRecallQuestions)} tone="sky" prompt="Tap each once asked" />,
    },
    {
      title: 'Think and Infer Questions',
      icon: 'bulb-outline',
      has: story.thinkInferQuestions.length > 0,
      body: <SelfCheckList items={questionLines(story.thinkInferQuestions)} tone="violet" prompt="Tap each once asked" />,
    },
    {
      title: 'Apply and Connect Questions',
      icon: 'sparkles-outline',
      has: story.applyConnectQuestions.length > 0,
      body: <SelfCheckList items={questionLines(story.applyConnectQuestions)} tone="emerald" prompt="Tap each once asked" />,
    },
    {
      title: 'Vocabulary and Grammar Practice',
      icon: 'create-outline',
      has: !!story.vocabularyGrammarPractice || story.vocabularyPractice.length > 0,
      body: story.vocabularyPractice.length ? (
        <SelfCheckList items={story.vocabularyPractice} tone="amber" />
      ) : (
        <ExpandableText text={story.vocabularyGrammarPractice} />
      ),
    },
    {
      title: 'Creative Response Activity',
      icon: 'sparkles-outline',
      has: !!story.creativeResponseActivity,
      body: <ExpandableText text={story.creativeResponseActivity} />,
    },
    {
      title: 'Answer Key / Suggested Responses',
      icon: 'checkmark-circle-outline',
      has: !!story.answerKeySuggestedResponses || story.answerHints.length > 0,
      body: (
        <TapToRevealCard
          prompt="Suggested responses"
          detail={story.answerKeySuggestedResponses || story.answerHints.join('\n')}
          tone="emerald"
          revealLabel="Show answer key"
        />
      ),
    },
    {
      title: 'Common Mistakes to Avoid',
      icon: 'warning-outline',
      has: !!story.commonMistakesToAvoid,
      body: <ExpandableText text={story.commonMistakesToAvoid} />,
    },
    {
      title: 'Differentiation Support',
      icon: 'people-outline',
      has: !!story.differentiationSupport || !!story.differentiationExtension,
      body: (
        <ExpandableText
          text={[story.differentiationSupport, story.differentiationExtension].filter(Boolean).join('\n\n')}
        />
      ),
    },
    {
      title: 'Expected Learning Outcomes',
      icon: 'trophy-outline',
      has: !!story.expectedLearningOutcomes,
      body: <ExpandableText text={story.expectedLearningOutcomes} />,
    },
    {
      title: 'Real-life Application',
      icon: 'globe-outline',
      has: !!story.realLifeApplication,
      body: <ExpandableText text={story.realLifeApplication} />,
    },
    {
      title: 'Reflection / Exit Ticket',
      icon: 'chatbubble-ellipses-outline',
      has: !!story.reflection,
      body: <ExpandableText text={story.reflection} />,
    },
  ];

  return (
    <View style={styles.root}>
      {defs
        .filter((d) => d.has)
        .map((d, i) => (
          <AiToolStackedSection key={d.title} num={String(i + 1)} title={d.title} icon={d.icon}>
            {d.body}
          </AiToolStackedSection>
        ))}
    </View>
  );
}

export default function StoryPassageViewer({
  content,
  rawContent,
  variant = 'default',
  fill = false,
}: Props) {
  const isStudent = variant === 'student';
  const resolved = useMemo(() => {
    const text = stripStructuredAiToolMetadata(content);
    return resolveStoryFromPayload(text, rawContent, { format: isStudent ? 'reading' : 'teacher' });
  }, [content, rawContent, isStudent]);

  if (resolved.mode === 'empty') {
    return (
      <AiToolMarkdownFallback
        toolType={isStudent ? 'reading-practice-room' : 'story-passage-creator'}
        content={content}
        rawContent={rawContent}
        variant={isStudent ? 'student' : 'teacher'}
        fill={fill}
      />
    );
  }

  if (resolved.mode === 'passages') {
    return (
      <AiToolMarkdownFallback
        toolType={isStudent ? 'reading-practice-room' : 'story-passage-creator'}
        content={content}
        rawContent={rawContent}
        variant={isStudent ? 'student' : 'teacher'}
        fill={fill}
      />
    );
  }

  const StoryView = isStudent ? StudentStory : TeacherStory;
  return wrapFill(
    <View style={styles.stack}>
      {resolved.stories.map((story, i) => (
        <StoryView key={`${story.title}-${i}`} story={story} />
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
});
