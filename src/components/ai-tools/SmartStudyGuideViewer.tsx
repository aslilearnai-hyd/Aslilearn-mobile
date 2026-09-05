import { useMemo, useState, type ReactNode } from 'react';
import { View, Text, StyleSheet, Platform, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AiToolWebView from './AiToolWebView';
import {
  useAiToolTabletLayout,
  viewerTabletStyle,
  aiToolViewerTabletStyles,
  AI_TOOL_OUTPUT_MOBILE,
} from './ai-tool-tablet-layout';
import { TabletSectionsLayout, type TabletSectionItem } from './TabletSectionsLayout';
import { stripStructuredAiToolMetadata } from '../../lib/strip-ai-tool-metadata';
import { stripAiToolGenerationLabel } from '../../lib/strip-ai-tool-generation-label';
import {
  resolveStudyGuideFromPayload,
  studyGuideViewerPayloadFromRecord,
  getMissingStudyGuideSections,
  isStudyGuideComplete,
  studyGuideHasVisibleBody,
  type StudyGuideContent,
  type StudyGuidePracticeQuestion,
} from '../../lib/parse-smart-study-guide';
import { getAiToolIonicon } from '../../lib/ai-tool-icons';
import AiToolStackedSection from './AiToolStackedSection';
import { SelfCheckList, TapToMarkItem, CheckableSteps, TapToRevealCard } from '../shared/ai-tool-interactive';

type Props = {
  content: string;
  rawContent?: unknown;
  toolType?: string;
  fill?: boolean;
};

function RichTextBlock({ text, tabletUi, boardUi }: { text: string; tabletUi?: boolean; boardUi?: boolean }) {
  if (!text.trim()) return null;
  return <Text style={[styles.bodyText, viewerTabletStyle(!!tabletUi, 'bodyText', !!boardUi)]}>{text}</Text>;
}

function PracticeQuestionCard({
  q,
  index,
  tabletUi,
  boardUi,
}: {
  q: StudyGuidePracticeQuestion;
  index: number;
  tabletUi?: boolean;
  boardUi?: boolean;
}) {
  const isMcq = q.type === 'objective' && q.options.length >= 2;
  const accents = ['#8b5cf6', '#0ea5e9', '#f59e0b', '#f43f5e', '#6366f1', '#06b6d4', '#f97316', '#d946ef'];
  const accent = accents[index % accents.length];
  const [revealed, setRevealed] = useState(false);
  return (
    <View
      style={[
        styles.practiceCard,
        { borderLeftColor: accent },
        tabletUi && aiToolViewerTabletStyles.practiceCardCol,
      ]}
    >
      <View style={styles.practiceHeader}>
        <LinearGradient colors={[accent, `${accent}CC`]} style={styles.practiceBadge}>
          <Text style={styles.practiceBadgeText}>Q{index + 1}</Text>
        </LinearGradient>
        <View style={[styles.typeBadge, isMcq ? styles.typeBadgeMcq : styles.typeBadgeSubjective]}>
          <Text style={[styles.typeBadgeText, isMcq ? styles.typeBadgeTextMcq : styles.typeBadgeTextSubjective]}>
            {isMcq ? 'MCQ' : 'Subjective'}
          </Text>
        </View>
      </View>
      <Text style={[styles.practiceQuestion, viewerTabletStyle(!!tabletUi, 'practiceQuestion', !!boardUi)]}>{q.question}</Text>
      {isMcq ? (
        <View style={styles.optionsGrid}>
          {q.options.map((opt, i) => {
            const label = opt.match(/^([A-D])\)/i)?.[1]?.toUpperCase() || String.fromCharCode(65 + i);
            const text = opt.replace(/^[A-D]\)\s*/i, '').trim();
            return (
              <View key={`${opt}-${i}`} style={styles.optionRow}>
                <View style={[styles.optionLabel, { backgroundColor: accent }]}>
                  <Text style={styles.optionLabelText}>{label}</Text>
                </View>
                <Text style={styles.optionText}>{text}</Text>
              </View>
            );
          })}
        </View>
      ) : null}
      {q.answer ? (
        revealed ? (
          <View style={[styles.answerBox, { borderLeftColor: accent }]}>
            <Text style={styles.answerLabel}>Answer</Text>
            <Text style={styles.answerText}>{q.answer}</Text>
          </View>
        ) : (
          <Pressable
            style={[styles.revealAnswerBtn, { borderColor: accent }]}
            onPress={() => setRevealed(true)}
            accessibilityRole="button"
            accessibilityLabel="Reveal answer"
          >
            <Text style={[styles.revealAnswerText, { color: accent }]}>Reveal answer</Text>
          </Pressable>
        )
      ) : null}
    </View>
  );
}

function GuideSectionCard({
  sectionNum,
  title,
  icon,
  stripe,
  children,
}: {
  sectionNum: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  stripe: string;
  children: ReactNode;
  tabletUi?: boolean;
  boardUi?: boolean;
}) {
  const num = sectionNum.replace(/^section\s*/i, '').trim();
  return (
    <AiToolStackedSection num={num} title={title} icon={icon} accentColor={stripe}>
      {children}
    </AiToolStackedSection>
  );
}

function buildBodySections(guide: StudyGuideContent, tabletUi = false, boardUi = false): TabletSectionItem[] {
  const sections: TabletSectionItem[] = [];
  const isFullWidth = (key: string) => tabletUi && ['5', '6', '10'].includes(key);
  const push = (key: string, node: ReactNode, fullWidth = false) => {
    sections.push({ key, node, fullWidth });
  };

  if (guide.title.trim()) {
    push(
      '1',
      <GuideSectionCard sectionNum="Section 1" title="Study Guide Title" icon="book-outline" stripe="#a5b4fc" tabletUi={tabletUi} boardUi={boardUi}>
        <Text style={[styles.guideTitle, viewerTabletStyle(tabletUi, 'guideTitle', boardUi)]}>{guide.title}</Text>
      </GuideSectionCard>,
    );
  }

  if (guide.chapterOverview.trim()) {
    push(
      '2',
      <GuideSectionCard sectionNum="Section 2" title="Chapter & Subtopic Overview" icon="book-outline" stripe="#93c5fd" tabletUi={tabletUi} boardUi={boardUi}>
        <RichTextBlock text={guide.chapterOverview} tabletUi={tabletUi} boardUi={boardUi} />
      </GuideSectionCard>,
    );
  }
  if (guide.learningObjectives.length > 0) {
    push(
      '3',
      <GuideSectionCard sectionNum="Section 3" title="Learning Objectives" icon="flag-outline" stripe="#c4b5fd" tabletUi={tabletUi} boardUi={boardUi}>
        <CheckableSteps items={guide.learningObjectives} tone="violet" />
      </GuideSectionCard>,
    );
  }
  if (guide.priorKnowledge.length > 0) {
    push(
      '4',
      <GuideSectionCard sectionNum="Section 4" title="Prior Knowledge Required" icon="school-outline" stripe="#67e8f9" tabletUi={tabletUi} boardUi={boardUi}>
        <SelfCheckList items={guide.priorKnowledge} tone="teal" />
      </GuideSectionCard>,
    );
  }
  if (guide.keyConcepts.some((c) => c.name.trim() && c.explanation.trim())) {
    push(
      '5',
      <GuideSectionCard sectionNum="Section 5" title="Key Concepts Explained" icon="bulb-outline" stripe="#a5b4fc" tabletUi={tabletUi} boardUi={boardUi}>
        <View style={styles.conceptList}>
          {guide.keyConcepts
            .filter((c) => c.name.trim() && c.explanation.trim())
            .map((c, i) => (
            <View key={`${c.name}-${i}`} style={styles.conceptCard}>
              <Text style={[styles.conceptName, viewerTabletStyle(tabletUi, 'conceptName', boardUi)]}>{c.name}</Text>
              <Text style={[styles.conceptExplanation, viewerTabletStyle(tabletUi, 'conceptExplanation', boardUi)]}>{c.explanation}</Text>
            </View>
          ))}
        </View>
      </GuideSectionCard>,
      isFullWidth('5'),
    );
  }
  if (guide.definitions.length > 0 || guide.formulae.length > 0) {
    push(
      '6',
      <GuideSectionCard sectionNum="Section 6" title="Definitions & Formulae" icon="calculator-outline" stripe="#fcd34d" tabletUi={tabletUi} boardUi={boardUi}>
        {guide.definitions.map((d, i) => (
          <TapToRevealCard key={`def-${i}`} prompt={d.term} detail={d.definition} tone="amber" />
        ))}
        {guide.formulae.map((f, i) => (
          <View key={`fm-${i}`} style={styles.formulaRow}>
            <Text style={styles.formulaName}>{f.name}</Text>
            <Text style={styles.formulaText}>{f.formula}</Text>
            {f.note ? <Text style={styles.formulaNote}>{f.note}</Text> : null}
          </View>
        ))}
      </GuideSectionCard>,
      isFullWidth('6'),
    );
  }
  if (guide.conceptFlow.trim()) {
    push(
      '7',
      <GuideSectionCard sectionNum="Section 7" title="Concept Flow / Mind Map" icon="git-network-outline" stripe="#5eead4" tabletUi={tabletUi} boardUi={boardUi}>
        <RichTextBlock text={guide.conceptFlow} tabletUi={tabletUi} boardUi={boardUi} />
      </GuideSectionCard>,
    );
  }
  if (guide.realLifeExamples.length > 0) {
    push(
      '8',
      <GuideSectionCard sectionNum="Section 8" title="Real-life Examples" icon="leaf-outline" stripe="#bef264" tabletUi={tabletUi} boardUi={boardUi}>
        <View style={styles.markList}>
          {guide.realLifeExamples.map((item, i) => (
            <TapToMarkItem key={`${item}-${i}`} text={item} tone="lime" />
          ))}
        </View>
      </GuideSectionCard>,
    );
  }
  if (guide.quickRevisionNotes.length > 0) {
    push(
      '9',
      <GuideSectionCard sectionNum="Section 9" title="Quick Revision Notes" icon="flash-outline" stripe="#fdba74" tabletUi={tabletUi} boardUi={boardUi}>
        <View style={styles.markList}>
          {guide.quickRevisionNotes.map((item, i) => (
            <TapToMarkItem key={`${item}-${i}`} text={item} tone="orange" markedStyle="strike" />
          ))}
        </View>
      </GuideSectionCard>,
    );
  }
  if (guide.practiceQuestions.length > 0) {
    push(
      '10',
      <GuideSectionCard sectionNum="Section 10" title="Practice Questions" icon="help-circle-outline" stripe="#a5b4fc" tabletUi={tabletUi} boardUi={boardUi}>
        <View style={[styles.practiceList, tabletUi && aiToolViewerTabletStyles.practiceListGrid]}>
          {guide.practiceQuestions.map((q, i) => (
            <PracticeQuestionCard key={`${q.question}-${i}`} q={q} index={i} tabletUi={tabletUi} boardUi={boardUi} />
          ))}
        </View>
      </GuideSectionCard>,
      isFullWidth('10'),
    );
  }
  if (guide.improvementTips.length > 0) {
    push(
      '11',
      <GuideSectionCard sectionNum="Section 11" title="Tips for Further Improvement" icon="sparkles-outline" stripe="#f0abfc" tabletUi={tabletUi} boardUi={boardUi}>
        <SelfCheckList items={guide.improvementTips} tone="fuchsia" prompt="Tap each tip once you've tried it" />
      </GuideSectionCard>,
    );
  }

  return sections;
}

export default function SmartStudyGuideViewer({
  content,
  rawContent,
  toolType = 'smart-study-guide-generator',
  fill = false,
}: Props) {
  const { isTablet, isDigitalBoard } = useAiToolTabletLayout();
  const payload = useMemo(
    () =>
      studyGuideViewerPayloadFromRecord({
        generatedContent: content,
        structuredContent: rawContent ?? undefined,
      }),
    [content, rawContent],
  );

  const { guide, markdownFallback } = useMemo(() => {
    const text = stripStructuredAiToolMetadata(payload.content);
    return resolveStudyGuideFromPayload(text, payload.rawContent);
  }, [payload.content, payload.rawContent]);

  if (markdownFallback) {
    return (
      <View style={[styles.markdownWrap, fill && styles.markdownWrapFill]}>
        <AiToolWebView
          toolType="smart-study-guide-generator"
          content={payload.content}
          rawContent={payload.rawContent}
          variant="student"
          fill={fill}
        />
      </View>
    );
  }

  const bodySections = buildBodySections(guide, isTablet, isDigitalBoard);
  const missingSections = getMissingStudyGuideSections(guide);
  const complete = isStudyGuideComplete(guide);

  if (!bodySections.length && !studyGuideHasVisibleBody(guide)) {
    return (
      <View style={styles.warningBox}>
        <Text style={styles.warningTitle}>Study guide incomplete</Text>
        <Text style={styles.warningText}>
          No study guide sections could be loaded. Ask your Super Admin to regenerate with all 11 sections filled.
          {missingSections.length > 0 ? ` Missing: ${missingSections.join(', ')}.` : ''}
        </Text>
      </View>
    );
  }

  const mcqCount = guide.practiceQuestions.filter((q) => q.type === 'objective' && q.options.length >= 2).length;

  const body = (
    <>
      {!complete && missingSections.length > 0 ? (
        <View style={styles.incompleteBanner}>
          <Text style={styles.incompleteBannerTitle}>Some sections are incomplete</Text>
          <Text style={styles.incompleteBannerText}>
            Showing available content below. Missing: {missingSections.join(', ')}. Regenerate with all 11
            sections filled for the student dashboard.
          </Text>
        </View>
      ) : null}
      <View style={styles.guideShell}>
        <LinearGuideHeader
          title={stripAiToolGenerationLabel(guide.title, 'Study Guide')}
          conceptCount={guide.keyConcepts.length}
          practiceCount={guide.practiceQuestions.length}
          mcqCount={mcqCount}
          tabletUi={isTablet}
          boardUi={isDigitalBoard}
          toolType={toolType}
        />

        <TabletSectionsLayout sections={bodySections} isTablet={isTablet} style={styles.guideBody} />
      </View>
    </>
  );

  if (fill) {
    return (
      <ScrollView
        style={styles.fillScroll}
        contentContainerStyle={styles.root}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
      >
        {body}
      </ScrollView>
    );
  }

  return <View style={styles.root}>{body}</View>;
}

function LinearGuideHeader({
  title,
  conceptCount,
  practiceCount,
  mcqCount,
  tabletUi,
  boardUi,
  toolType = 'smart-study-guide-generator',
}: {
  title: string;
  conceptCount: number;
  practiceCount: number;
  mcqCount: number;
  tabletUi?: boolean;
  boardUi?: boolean;
  toolType?: string;
}) {
  const heroIcon = getAiToolIonicon(toolType);
  return (
    <View style={styles.heroHeader}>
      <View style={styles.heroIcon}>
        <Ionicons name={heroIcon} size={tabletUi ? 22 : 20} color="#6366f1" />
      </View>
      <View style={styles.heroText}>
        <Text style={[styles.heroEyebrow, viewerTabletStyle(!!tabletUi, 'heroEyebrow', !!boardUi)]}>Smart Study Guide</Text>
        <Text style={[styles.heroTitle, viewerTabletStyle(!!tabletUi, 'guideTitle', !!boardUi)]} numberOfLines={2}>
          {title}
        </Text>
        <View style={styles.heroBadges}>
          <Text style={styles.heroBadge}>{conceptCount} concepts</Text>
          <Text style={styles.heroBadge}>{practiceCount} practice Qs</Text>
          {mcqCount > 0 ? <Text style={styles.heroBadge}>{mcqCount} MCQs</Text> : null}
        </View>
      </View>
    </View>
  );
}

const M = AI_TOOL_OUTPUT_MOBILE;

const styles = StyleSheet.create({
  root: { gap: 10 },
  fillScroll: { flex: 1, minHeight: 0 },
  markdownWrap: { borderRadius: 18, overflow: 'hidden' },
  markdownWrapFill: { flex: 1, minHeight: 0 },
  warningBox: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fcd34d',
    backgroundColor: 'rgba(255,251,235,0.55)',
    padding: 12,
  },
  warningTitle: { fontSize: 14, fontWeight: '800', color: '#92400e' },
  warningText: { marginTop: 4, fontSize: 13, lineHeight: 20, color: '#b45309' },
  incompleteBanner: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fcd34d',
    backgroundColor: 'rgba(255,251,235,0.55)',
    padding: 12,
  },
  incompleteBannerTitle: { fontSize: 14, fontWeight: '800', color: '#92400e' },
  incompleteBannerText: { marginTop: 4, fontSize: 13, lineHeight: 20, color: '#b45309' },
  guideShell: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#c7d2fe',
    backgroundColor: '#eef2ff',
    overflow: 'hidden',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 6,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  heroIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: { flex: 1 },
  heroEyebrow: {
    fontSize: M.heroEyebrow,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: '#64748B',
  },
  heroTitle: { marginTop: 2, fontSize: M.heroTitle, fontWeight: '800', color: '#0f172a' },
  heroBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  heroBadge: {
    fontSize: M.badge,
    fontWeight: '700',
    color: '#475569',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
  guideBody: { padding: 2, gap: 6 },
  markList: { gap: 8 },
  titleSection: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#c7d2fe',
    backgroundColor: '#FFFFFF',
    padding: 12,
  },
  titleSectionNum: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: '#4338ca',
  },
  titleBadge: {
    alignSelf: 'flex-start',
    marginTop: 4,
    marginBottom: 6,
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  titleBadgeText: { fontSize: 11, fontWeight: '700', color: '#312e81' },
  guideTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', lineHeight: 28 },
  sectionCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#c7d2fe',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  sectionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderLeftWidth: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.42)',
  },
  sectionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderText: { flex: 1 },
  sectionNumLabel: { fontSize: M.sectionNum, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase', color: '#818cf8' },
  sectionTitle: { fontSize: M.sectionTitle, fontWeight: '800', color: '#0f172a' },
  sectionBody: { paddingHorizontal: 10, paddingBottom: 10, paddingTop: 4 },
  bulletList: { gap: 8 },
  bulletRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.75)',
    borderLeftWidth: 4,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  bulletOrb: {
    width: 10,
    height: 10,
    borderRadius: 99,
    marginTop: 6,
  },
  bulletDot: { marginTop: 2, fontSize: M.body, fontWeight: '800' },
  bulletText: { flex: 1, fontSize: M.body, lineHeight: M.bodyLh, color: '#1e293b', fontWeight: '500' },
  bodyText: { fontSize: M.body, lineHeight: M.bodyLh, color: '#334155' },
  conceptList: { gap: 8 },
  conceptCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.8)',
    borderLeftWidth: 4,
    borderLeftColor: '#8b5cf6',
    backgroundColor: 'rgba(255,255,255,0.58)',
    padding: 12,
  },
  conceptName: { fontSize: M.concept, fontWeight: '800', color: '#0f172a' },
  conceptExplanation: { marginTop: 4, fontSize: M.small, lineHeight: M.smallLh, color: '#475569' },
  definitionRow: {
    marginBottom: 8,
    borderRadius: 14,
    padding: 12,
    backgroundColor: 'rgba(255,251,235,0.65)',
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  definitionTerm: { fontSize: M.formula, fontWeight: '800', color: '#92400e' },
  definitionText: { marginTop: 2, fontSize: M.small, lineHeight: M.smallLh, color: '#475569' },
  formulaRow: {
    marginBottom: 8,
    borderRadius: 14,
    padding: 12,
    backgroundColor: 'rgba(238,242,255,0.7)',
    borderLeftWidth: 4,
    borderLeftColor: '#6366f1',
  },
  formulaName: { fontSize: M.formula, fontWeight: '800', color: '#4338ca' },
  formulaText: { marginTop: 2, fontSize: M.small, lineHeight: M.smallLh, color: '#0f172a', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  formulaNote: { marginTop: 2, fontSize: M.caption, color: '#64748b' },
  practiceList: { gap: 10 },
  practiceCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.85)',
    borderLeftWidth: 5,
    backgroundColor: 'rgba(255,255,255,0.62)',
    padding: 12,
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  practiceHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  practiceBadge: {
    minWidth: 34,
    height: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  practiceBadgeText: { fontSize: 11, fontWeight: '900', color: '#fff' },
  typeBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  typeBadgeMcq: { backgroundColor: '#ede9fe' },
  typeBadgeSubjective: { backgroundColor: '#e0f2fe' },
  typeBadgeText: { fontSize: 10, fontWeight: '700' },
  typeBadgeTextMcq: { color: '#5b21b6' },
  typeBadgeTextSubjective: { color: '#0369a1' },
  practiceQuestion: { fontSize: M.body, fontWeight: '700', lineHeight: M.bodyLh, color: '#0f172a' },
  optionsGrid: { marginTop: 10, gap: 8 },
  optionRow: {
    flexDirection: 'row',
    gap: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(226,232,240,0.95)',
    backgroundColor: 'rgba(255,255,255,0.78)',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  optionLabel: {
    width: 26,
    height: 26,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabelText: { fontSize: 11, fontWeight: '900', color: '#fff' },
  optionText: { flex: 1, fontSize: M.small, lineHeight: M.smallLh, color: '#334155', paddingTop: 3, fontWeight: '500' },
  answerBox: {
    marginTop: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderLeftWidth: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  answerLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: '#64748b',
    marginBottom: 2,
  },
  answerText: { fontSize: 13, lineHeight: 19, color: '#1e293b', fontWeight: '600' },
  revealAnswerBtn: {
    marginTop: 10,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  revealAnswerText: { fontSize: 12, fontWeight: '800' },
});
