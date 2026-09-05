import { useMemo, useState, createContext, useContext, type ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  cleanReflectionProse,
  dedupeStringLines,
  normalizeParsedActivityFields,
  resolveActivitiesFromPayload,
  studentActivitySectionsComplete,
  teacherActivitySectionsComplete,
  type ParsedActivity,
} from '../../lib/parse-activity-markdown';
import { stripStructuredAiToolMetadata } from '../../lib/strip-ai-tool-metadata';
import { stripAiToolGenerationLabel } from '../../lib/strip-ai-tool-generation-label';
import { getAiToolIonicon } from '../../lib/ai-tool-icons';
import AiToolStackedSection from './AiToolStackedSection';
import {
  aiToolViewerTabletStyles,
  useAiToolTabletLayout,
  viewerTabletStyle,
  AI_TOOL_OUTPUT_MOBILE,
} from './ai-tool-tablet-layout';
import { TabletSectionsLayout } from './TabletSectionsLayout';
import { AI_SECTION_RAINBOW } from '../../lib/ai-tool-section-palette';
import { SelfCheckList, TapToMarkItem, CheckableSteps } from '../shared/ai-tool-interactive';

type ViewerOutputCtx = { isTablet: boolean; isDigitalBoard: boolean };
const ViewerTabletContext = createContext<ViewerOutputCtx>({ isTablet: false, isDigitalBoard: false });
function useViewerTablet() {
  return useContext(ViewerTabletContext);
}

function PreWrapText({ children }: { children: string }) {
  const { isTablet, isDigitalBoard } = useViewerTablet();
  return <Text style={[styles.preWrap, viewerTabletStyle(isTablet, 'preWrap', isDigitalBoard)]}>{children}</Text>;
}

type NormalizedActivity = {
  sl: number;
  title: string;
  subtopicLink: string;
  learningObjectives: string[];
  ncfAlignment: string[];
  materials: string[];
  steps: string[];
  teacherInstructions: string[];
  studentInstructions: string[];
  differentiation: string;
  assessmentRubric: string[];
  expectedOutcomes: string;
  realLife: string;
  reflection: string;
  safetyCareInstructions: string[];
  observationTable: string;
  creativeOutput: string;
  selfAssessmentRubric: string[];
};

type SectionDef = {
  num: number;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  stripe: string;
  hasContent: (a: NormalizedActivity) => boolean;
  render: (a: NormalizedActivity) => ReactNode;
};

type Props = {
  content: string;
  rawContent?: unknown;
  variant?: 'student' | 'teacher';
  toolType?: string;
};

function stripOrderedPrefix(line: string): string {
  return String(line || '')
    .replace(/^\s*\d+[\).\s]+/i, '')
    .replace(/^\s*[-*•]\s*/, '')
    .trim();
}

function coalesceLines(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => stripOrderedPrefix(String(x ?? ''))).filter(Boolean);
  if (typeof v === 'string' && v.trim()) {
    return v.split(/\n+/).map(stripOrderedPrefix).filter(Boolean);
  }
  return [];
}

function firstNonEmptyFromActivity(...values: unknown[]): string {
  for (const v of values) {
    if (Array.isArray(v)) {
      const joined = v.map((x) => String(x ?? '').trim()).filter(Boolean).join('\n');
      if (joined.trim()) return joined.trim();
    } else {
      const s = String(v ?? '').trim();
      if (s) return s;
    }
  }
  return '';
}

function normalizeActivity(raw: ParsedActivity, idx: number, mode: 'student' | 'teacher'): NormalizedActivity {
  const a = normalizeParsedActivityFields((raw || {}) as ParsedActivity);
  const ncfRaw = a.ncf_competency_alignment;
  const ncf = dedupeStringLines(
    Array.isArray(ncfRaw)
      ? ncfRaw.map((x) => String(x).trim()).filter(Boolean)
      : String(ncfRaw || '')
          .split(/[;\n]+/)
          .map((x) => x.trim())
          .filter(Boolean)
  );
  const studentSteps = coalesceLines(a.student_instructions);
  const procedureSteps = coalesceLines(a.step_by_step_procedure || a.steps || a.instructions);
  const steps = mode === 'teacher' ? procedureSteps : studentSteps.length ? studentSteps : procedureSteps;

  return {
    sl: Number(a.sl_no) || idx + 1,
    title: stripAiToolGenerationLabel(String(a.title || a.name || ''), 'Activity'),
    subtopicLink: firstNonEmptyFromActivity(a.subtopic_link_prior_knowledge),
    learningObjectives: dedupeStringLines(coalesceLines(a.learning_objectives || a.learningObjectives)),
    ncfAlignment: ncf,
    materials: dedupeStringLines(coalesceLines(a.materials_required || a.materials)),
    steps,
    teacherInstructions: coalesceLines(a.teacher_instructions || a.teacherInstructions),
    studentInstructions: studentSteps.length
      ? studentSteps
      : coalesceLines(a.student_instructions || a.studentInstructions),
    differentiation: String(a.differentiation_support_extension || a.differentiation || '').trim(),
    assessmentRubric: dedupeStringLines(
      coalesceLines(a.assessment_criteria_rubric || a.assessment || a.evaluation)
    ),
    expectedOutcomes: firstNonEmptyFromActivity(
      a.expected_learning_outcomes,
      a.learning_outcome,
      a.learning_outcomes,
      a.expected_outcome
    ),
    realLife: String(a.real_life_application || '').trim(),
    reflection: cleanReflectionProse(String(a.reflection_exit_ticket || a.reflection || '')),
    safetyCareInstructions: dedupeStringLines(
      coalesceLines(a.safety_care_instructions || a.safety_instructions),
    ),
    observationTable: firstNonEmptyFromActivity(
      a.observation_data_recording_table,
      a.observation_table,
    ),
    creativeOutput: firstNonEmptyFromActivity(
      a.creative_output_final_product,
      a.creative_output,
    ),
    selfAssessmentRubric: dedupeStringLines(coalesceLines(a.self_assessment_rubric)),
  };
}

const TEACHER_SECTIONS: SectionDef[] = [
  {
    num: 2,
    title: 'Subtopic link and prior knowledge required',
    icon: 'book-outline',
    stripe: '#7dd3fc',
    hasContent: (a) => !!a.subtopicLink,
    render: (a) => <PreWrapText>{a.subtopicLink}</PreWrapText>,
  },
  {
    num: 3,
    title: 'Learning objectives',
    icon: 'radio-button-on-outline',
    stripe: '#c4b5fd',
    hasContent: (a) => a.learningObjectives.length > 0,
    render: (a) => <SelfCheckList items={a.learningObjectives} tone="violet" />,
  },
  {
    num: 4,
    title: 'NCF competency / learning outcome alignment',
    icon: 'school-outline',
    stripe: '#93c5fd',
    hasContent: (a) => a.ncfAlignment.length > 0,
    render: (a) => (
      <SelfCheckList items={a.ncfAlignment} tone="sky" prompt="Tap each alignment point once reviewed" />
    ),
  },
  {
    num: 5,
    title: 'Materials required',
    icon: 'cube-outline',
    stripe: '#fcd34d',
    hasContent: (a) => a.materials.length > 0,
    render: (a) => (
      <View style={styles.checkList}>
        {a.materials.map((m, i) => (
          <TapToMarkItem key={`${m}-${i}`} text={m} tone="amber" markedStyle="strike" />
        ))}
      </View>
    ),
  },
  {
    num: 6,
    title: 'Step-by-step procedure',
    icon: 'list-outline',
    stripe: '#6ee7b7',
    hasContent: (a) => a.steps.length > 0,
    render: (a) => <CheckableSteps items={a.steps} tone="emerald" />,
  },
  {
    num: 7,
    title: 'Teacher instructions',
    icon: 'people-outline',
    stripe: '#a5b4fc',
    hasContent: (a) => a.teacherInstructions.length > 0,
    render: (a) => (
      <SelfCheckList items={a.teacherInstructions} tone="indigo" prompt="Tap each once done" />
    ),
  },
  {
    num: 8,
    title: 'Student instructions',
    icon: 'school-outline',
    stripe: '#5eead4',
    hasContent: (a) => a.studentInstructions.length > 0,
    render: (a) => (
      <SelfCheckList items={a.studentInstructions} tone="teal" prompt="Tap each once done" />
    ),
  },
  {
    num: 9,
    title: 'Differentiation',
    icon: 'git-branch-outline',
    stripe: '#f9a8d4',
    hasContent: (a) => !!a.differentiation,
    render: (a) => <PreWrapText>{a.differentiation}</PreWrapText>,
  },
  {
    num: 10,
    title: 'Assessment rubric',
    icon: 'clipboard-outline',
    stripe: '#fcd34d',
    hasContent: (a) => a.assessmentRubric.length > 0,
    render: (a) => (
      <SelfCheckList items={a.assessmentRubric} tone="rose" prompt="Tap each once assessed" />
    ),
  },
  {
    num: 11,
    title: 'Expected learning outcomes',
    icon: 'trophy-outline',
    stripe: '#67e8f9',
    hasContent: (a) => !!a.expectedOutcomes,
    render: (a) => <PreWrapText>{a.expectedOutcomes}</PreWrapText>,
  },
  {
    num: 12,
    title: 'Real-life application',
    icon: 'sparkles-outline',
    stripe: '#e879f9',
    hasContent: (a) => !!a.realLife,
    render: (a) => <PreWrapText>{a.realLife}</PreWrapText>,
  },
  {
    num: 13,
    title: 'Reflection / exit ticket',
    icon: 'bulb-outline',
    stripe: '#fdba74',
    hasContent: (a) => !!a.reflection,
    render: (a) => <PreWrapText>{a.reflection}</PreWrapText>,
  },
];

const SECTION_CARD_THEMES = AI_SECTION_RAINBOW.map((t) => ({
  stripe: t.hex,
  border: `${t.hex}55`,
  bg: t.glassFrom,
  label: t.hexDeep,
  title: '#0f172a',
}));

function SectionCard({
  sectionNum,
  title,
  icon,
  themeIndex = 0,
  children,
}: {
  sectionNum: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  stripe?: string;
  themeIndex?: number;
  children: ReactNode;
}) {
  const theme = SECTION_CARD_THEMES[themeIndex % SECTION_CARD_THEMES.length];
  const num = sectionNum.replace(/^section\s*/i, '').trim();
  return (
    <AiToolStackedSection num={num} title={title} icon={icon} accentColor={theme.stripe}>
      {children}
    </AiToolStackedSection>
  );
}

const TABLET_FULL_WIDTH_SECTION_NUMS = new Set([5, 6, 7, 8, 10, 11, 12, 13]);

function sectionFullWidthOnTablet(sectionNum: number): boolean {
  return TABLET_FULL_WIDTH_SECTION_NUMS.has(sectionNum);
}

function ActivitySectionsLayout({
  defs,
  activity,
  tabletUi,
}: {
  defs: SectionDef[];
  activity: NormalizedActivity;
  tabletUi: boolean;
}) {
  const visible = defs.filter((sec) => sec.hasContent(activity));
  const sections = visible.map((sec, index) => ({
    key: String(sec.num),
    fullWidth: tabletUi && sectionFullWidthOnTablet(sec.num),
    node: (
      <SectionCard
        sectionNum={`Section ${sec.num}`}
        title={sec.title}
        icon={sec.icon}
        themeIndex={index}
      >
        {sec.render(activity)}
      </SectionCard>
    ),
  }));
  return <TabletSectionsLayout sections={sections} isTablet={tabletUi} style={styles.sectionsWrap} />;
}

const STUDENT_SECTIONS: SectionDef[] = [
  {
    num: 2,
    title: 'Subtopic link and prior knowledge required',
    icon: 'book-outline',
    stripe: '#7dd3fc',
    hasContent: (a) => !!a.subtopicLink,
    render: (a) => <PreWrapText>{a.subtopicLink}</PreWrapText>,
  },
  {
    num: 3,
    title: "Learning Objectives - Bloom's Taxonomy Aligned",
    icon: 'radio-button-on-outline',
    stripe: '#c4b5fd',
    hasContent: (a) => a.learningObjectives.length > 0,
    render: (a) => <SelfCheckList items={a.learningObjectives} tone="violet" />,
  },
  {
    num: 4,
    title: 'NCF competency / learning outcome alignment',
    icon: 'school-outline',
    stripe: '#93c5fd',
    hasContent: (a) => a.ncfAlignment.length > 0,
    render: (a) => (
      <SelfCheckList items={a.ncfAlignment} tone="sky" prompt="Tap each alignment point once reviewed" />
    ),
  },
  {
    num: 5,
    title: 'Materials required',
    icon: 'cube-outline',
    stripe: '#fcd34d',
    hasContent: (a) => a.materials.length > 0,
    render: (a) => (
      <View style={styles.checkList}>
        {a.materials.map((m, i) => (
          <TapToMarkItem key={`${m}-${i}`} text={m} tone="amber" markedStyle="strike" />
        ))}
      </View>
    ),
  },
  {
    num: 6,
    title: 'Step-by-step Student Procedure',
    icon: 'list-outline',
    stripe: '#6ee7b7',
    hasContent: (a) => a.steps.length > 0,
    render: (a) => <CheckableSteps items={a.steps} tone="emerald" />,
  },
  {
    num: 7,
    title: 'Safety and Care Instructions',
    icon: 'warning-outline',
    stripe: '#cbd5e1',
    hasContent: (a) => a.safetyCareInstructions.length > 0,
    render: (a) => (
      <SelfCheckList items={a.safetyCareInstructions} tone="slate" prompt="Tap each once you've checked it" />
    ),
  },
  {
    num: 8,
    title: 'Observation / Data Recording Table',
    icon: 'clipboard-outline',
    stripe: '#a5b4fc',
    hasContent: (a) => !!a.observationTable,
    render: (a) => <PreWrapText>{a.observationTable}</PreWrapText>,
  },
  {
    num: 9,
    title: 'Creative Output / Final Product',
    icon: 'sparkles-outline',
    stripe: '#c4b5fd',
    hasContent: (a) => !!a.creativeOutput,
    render: (a) => <PreWrapText>{a.creativeOutput}</PreWrapText>,
  },
  {
    num: 10,
    title: 'Differentiation: Support and Extension',
    icon: 'people-outline',
    stripe: '#f9a8d4',
    hasContent: (a) => !!a.differentiation,
    render: (a) => <PreWrapText>{a.differentiation}</PreWrapText>,
  },
  {
    num: 11,
    title: 'Self-Assessment Rubric',
    icon: 'clipboard-outline',
    stripe: '#fda4af',
    hasContent: (a) => a.selfAssessmentRubric.length > 0,
    render: (a) => (
      <SelfCheckList items={a.selfAssessmentRubric} tone="rose" prompt="Tap each criterion once assessed" />
    ),
  },
  {
    num: 12,
    title: 'Expected Learning Outcomes',
    icon: 'trophy-outline',
    stripe: '#67e8f9',
    hasContent: (a) => !!a.expectedOutcomes,
    render: (a) => <PreWrapText>{a.expectedOutcomes}</PreWrapText>,
  },
  {
    num: 13,
    title: 'Real-life Application',
    icon: 'sparkles-outline',
    stripe: '#e879f9',
    hasContent: (a) => !!a.realLife,
    render: (a) => <PreWrapText>{a.realLife}</PreWrapText>,
  },
  {
    num: 14,
    title: 'Reflection / Exit Ticket',
    icon: 'bulb-outline',
    stripe: '#fdba74',
    hasContent: (a) => !!a.reflection,
    render: (a) => <PreWrapText>{a.reflection}</PreWrapText>,
  },
];

function StudentActivityCard({
  activity,
  heroIcon,
}: {
  activity: NormalizedActivity;
  heroIcon: keyof typeof Ionicons.glyphMap;
}) {
  const { isTablet, isDigitalBoard } = useViewerTablet();
  const vt = <K extends keyof typeof aiToolViewerTabletStyles>(key: K) =>
    viewerTabletStyle(isTablet, key, isDigitalBoard);
  return (
    <View style={[styles.activityBody, vt('activityBody')]}>
      <View style={[styles.heroCard, styles.heroCardStudent, vt('heroCard')]}>
        <View style={styles.heroRow}>
          <View style={[styles.heroIconWrap, styles.heroIconWrapStudent]}>
            <Ionicons name={heroIcon} size={isTablet ? 32 : 28} color="#ea580c" />
          </View>
          <View style={styles.heroContent}>
            <Text style={[styles.heroEyebrow, styles.heroEyebrowStudent, vt('heroEyebrow')]}>
              Project / Activity Title
            </Text>
            <Text style={[styles.heroTitle, vt('heroTitle')]}>{activity.title}</Text>
          </View>
        </View>
      </View>
      <ActivitySectionsLayout defs={STUDENT_SECTIONS} activity={activity} tabletUi={isTablet} />
    </View>
  );
}

function TeacherActivityCard({
  activity,
  heroIcon,
}: {
  activity: NormalizedActivity;
  heroIcon: keyof typeof Ionicons.glyphMap;
}) {
  const { isTablet, isDigitalBoard } = useViewerTablet();
  const vt = <K extends keyof typeof aiToolViewerTabletStyles>(key: K) =>
    viewerTabletStyle(isTablet, key, isDigitalBoard);
  return (
    <View style={[styles.activityBody, vt('activityBody')]}>
      <View style={[styles.heroCard, vt('heroCard')]}>
        <View style={styles.heroRow}>
          <View style={styles.heroIconWrap}>
            <Ionicons name={heroIcon} size={isTablet ? 32 : 28} color="#4f46e5" />
          </View>
          <View style={styles.heroContent}>
            <Text style={[styles.heroEyebrow, vt('heroEyebrow')]}>Title of activity / project</Text>
            <Text style={[styles.heroTitle, vt('heroTitle')]}>{activity.title}</Text>
          </View>
        </View>
      </View>

      <ActivitySectionsLayout defs={TEACHER_SECTIONS} activity={activity} tabletUi={isTablet} />
    </View>
  );
}

function activitiesFromRaw(rawContent: unknown): ParsedActivity[] | undefined {
  if (!rawContent || typeof rawContent !== 'object') return undefined;
  const rc = rawContent as Record<string, unknown>;
  if (Array.isArray(rc.activities)) return rc.activities as ParsedActivity[];
  return undefined;
}

export default function ActivityProjectViewer({
  content,
  rawContent,
  variant = 'teacher',
  toolType = 'activity-project-generator',
}: Props) {
  const { isTablet, isDigitalBoard } = useAiToolTabletLayout();
  const heroIcon = getAiToolIonicon(toolType);
  const parsedContent = useMemo(() => stripStructuredAiToolMetadata(String(content || '')), [content]);
  const mode = variant === 'student' ? 'student' : 'teacher';

  const resolved = useMemo(() => {
    const rows = resolveActivitiesFromPayload(activitiesFromRaw(rawContent), parsedContent).filter((row) =>
      mode === 'student' ? studentActivitySectionsComplete(row) : teacherActivitySectionsComplete(row),
    );
    return rows.map((a, i) => normalizeActivity(a, i, mode));
  }, [parsedContent, rawContent, mode]);

  const [activeIdx, setActiveIdx] = useState(0);
  const safeIdx = Math.min(activeIdx, Math.max(0, resolved.length - 1));
  const current = resolved[safeIdx];

  if (!resolved.length) {
    return (
      <View style={styles.emptyWrap}>
        <Ionicons name={heroIcon} size={40} color="#cbd5e1" />
        <Text style={styles.emptyTitle}>Complete activity content is not available</Text>
        <Text style={styles.emptyHint}>
          All template sections must be filled. Try generating again or ask Super Admin to add full content.
        </Text>
      </View>
    );
  }

  const isTeacher = mode === 'teacher';
  const vt = <K extends keyof typeof aiToolViewerTabletStyles>(key: K) =>
    viewerTabletStyle(isTablet, key, isDigitalBoard);

  return (
    <ViewerTabletContext.Provider value={{ isTablet, isDigitalBoard }}>
    <View style={[styles.shell, isTeacher ? styles.shellTeacher : styles.shellStudent]}>
      <View
        style={[
          styles.shellHeader,
          isTeacher ? styles.shellHeaderTeacher : styles.shellHeaderStudent,
          vt('shellHeader'),
        ]}
      >
        <View style={styles.shellHeaderIcon}>
          <Ionicons name={heroIcon} size={isTablet ? 22 : 20} color="#fff" />
        </View>
        <View>
          <Text style={[styles.shellEyebrow, vt('shellEyebrow')]}>
            {isTeacher ? 'Activity & Project Generator' : 'Lab journal'}
          </Text>
          <Text style={[styles.shellTitle, vt('shellTitle')]}>
            {isTeacher ? 'Teacher lesson kit' : 'Project Idea Lab'}
          </Text>
        </View>
      </View>

      {resolved.length > 1 ? (
        <ScrollView
          horizontal
          nestedScrollEnabled
          directionalLockEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.tabScroll}
          contentContainerStyle={styles.tabRow}
          keyboardShouldPersistTaps="handled"
        >
          {resolved.map((act, idx) => (
            <Pressable
              key={act.sl}
              onPress={() => setActiveIdx(idx)}
              accessibilityRole="tab"
              accessibilityLabel={act.title?.trim() ? act.title : `Activity ${idx + 1}`}
              accessibilityState={{ selected: idx === safeIdx }}
              style={[styles.tab, idx === safeIdx && styles.tabActive]}
            >
              <Text style={[styles.tabText, idx === safeIdx && styles.tabTextActive, vt('tabText')]} numberOfLines={1}>
                {act.title?.trim() ? act.title.slice(0, isTablet ? 40 : 28) : 'Activity'}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <View style={[styles.scrollBody, vt('scrollBody')]}>
        {isTeacher ? (
          <TeacherActivityCard activity={current} heroIcon={heroIcon} />
        ) : (
          <StudentActivityCard activity={current} heroIcon={heroIcon} />
        )}
      </View>
    </View>
    </ViewerTabletContext.Provider>
  );
}

const M = AI_TOOL_OUTPUT_MOBILE;

const styles = StyleSheet.create({
  shell: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  shellTeacher: { borderColor: '#E2E8F0' },
  shellStudent: { borderColor: '#E2E8F0' },
  shellHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  shellHeaderTeacher: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  shellHeaderStudent: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  shellHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shellEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: '#64748b',
  },
  shellTitle: { fontSize: M.shellTitle, fontWeight: '800', color: '#0f172a', marginTop: 2 },
  tabScroll: { maxHeight: 40, backgroundColor: '#F8FAFC' },
  tabRow: { paddingHorizontal: 8, paddingVertical: 6, gap: 6 },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabActive: { backgroundColor: '#F1F5F9', borderColor: '#CBD5E1' },
  tabText: { fontSize: M.tab, fontWeight: '700', color: '#64748B', maxWidth: 140 },
  tabTextActive: { color: '#0F172A' },
  scrollBody: { width: '100%' },
  activityBody: { padding: 0, gap: 8 },
  sectionsWrap: { gap: 8 },
  heroCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 12,
  },
  heroCardStudent: { borderColor: '#E2E8F0' },
  heroRow: { flexDirection: 'row', gap: 10 },
  heroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIconWrapStudent: { backgroundColor: '#F1F5F9' },
  heroContent: { flex: 1 },
  sectionsBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 4,
    backgroundColor: '#F8FAFC',
  },
  sectionsBadgeText: { fontSize: 10, fontWeight: '700', color: '#64748B' },
  heroEyebrow: {
    fontSize: M.heroEyebrow,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: '#64748B',
    marginBottom: 2,
  },
  heroEyebrowStudent: { color: '#64748B' },
  heroTitle: { fontSize: M.heroTitle, fontWeight: '800', color: '#0f172a', lineHeight: M.heroTitle + 4 },
  progressWrap: { marginTop: 10 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  progressLabel: { fontSize: M.caption, fontWeight: '600', color: '#64748b' },
  progressTrack: { height: 8, borderRadius: 999, backgroundColor: '#e0e7ff', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999, backgroundColor: '#a5b4fc' },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderLeftWidth: 5,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderText: { flex: 1 },
  sectionNum: {
    fontSize: M.sectionNum,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: '#5B6779',
  },
  sectionTitle: { fontSize: M.sectionTitle, fontWeight: '800', color: '#0f172a' },
  sectionBody: { paddingHorizontal: 12, paddingBottom: 12, paddingTop: 6 },
  preWrap: { fontSize: M.body, lineHeight: M.bodyLh, color: '#334155' },
  checkList: { gap: 8 },
  checkRow: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.62)',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.85)',
    borderLeftWidth: 4,
    borderLeftColor: '#8b5cf6',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  checkIcon: { marginTop: 2 },
  checkText: { flex: 1, fontSize: M.body, lineHeight: M.bodyLh, color: '#1e293b', fontWeight: '500' },
  bulletList: { gap: 8 },
  bulletRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  bulletDot: { color: '#8b5cf6', fontSize: M.body, marginTop: 2, fontWeight: '900' },
  bulletText: { flex: 1, fontSize: M.body, lineHeight: M.bodyLh, color: '#1e293b', fontWeight: '500' },
  matList: { gap: 8 },
  matRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.85)',
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
    backgroundColor: 'rgba(255,251,235,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  matBadge: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  matBadgeText: { fontSize: 11, fontWeight: '900', color: '#fff' },
  matText: { flex: 1, fontSize: M.body, color: '#1e293b', fontWeight: '500' },
  stepList: { gap: 10 },
  stepRow: { flexDirection: 'row', gap: 10 },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: { fontSize: 12, fontWeight: '700', color: '#047857' },
  stepText: { flex: 1, fontSize: M.body, lineHeight: M.bodyLh, color: '#334155', paddingTop: 4 },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#e2e8f0',
    backgroundColor: 'rgba(255,255,255,0.42)',
  },
  emptyTitle: { marginTop: 10, fontSize: 14, fontWeight: '700', color: '#334155' },
  emptyHint: { marginTop: 4, fontSize: 12, color: '#64748b', textAlign: 'center' },
  emptySectionHint: {
    fontSize: 13,
    fontStyle: 'italic',
    color: '#a8a29e',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#e7e5e4',
    backgroundColor: '#fafaf9',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
});
