import { storageGetItem } from '../../../src/lib/safe-storage';
import { useState, useEffect, useMemo, useCallback, type ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Share,
  InteractionManager,
} from 'react-native';
import { ScrollView as GHScrollView } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { API_BASE_URL } from '../../../src/lib/api-config';
import { formatAiToolText } from '../../../src/lib/title-case';
import {
  parseTeacherDashboardTab,
  useTeacherDashboardBack,
} from '../../../src/hooks/useBackNavigation';
import AiToolContentRenderer from '../../../src/components/ai-tools/AiToolContentRenderer';
import AiToolDownloadBar from '../../../src/components/ai-tools/AiToolDownloadBar';
import AiToolParamsGrid from '../../../src/components/ai-tools/AiToolParamsGrid';
import AiToolResultShell from '../../../src/components/ai-tools/AiToolResultShell';
import AiToolOptionPicker from '../../../src/components/ai-tools/AiToolOptionPicker';
import { GlassPanel } from '../../../src/components/ui';
import {
  aiToolTabletPageStyles,
  aiToolTabletStyles,
  useAiToolTabletLayout,
} from '../../../src/components/ai-tools/ai-tool-tablet-layout';
import {
  useAiToolOutputScroll,
  useQueueAiToolScrollOnGenerate,
} from '../../../src/components/ai-tools/useAiToolOutputScroll';
import {
  validateAiToolForm,
  executeAiToolGenerate,
  buildTeacherAiRequestBody,
  storeAiToolSuccessPayload,
  fetchAiToolGeneratedContentFallback,
  isAiToolClientValidationError,
  isAiToolInlineOnlyError,
  resolveAiToolApiInlineMessage,
  resolveSubTopicForRequest,
  WHOLE_CHAPTER_VALUE,
  type AiToolGenerationMeta,
} from '../../../src/lib/ai-tool-generate';
import {
  buildAiToolContentRenderKey,
} from '../../../src/lib/ai-tool-rotation-label';
import { getAiToolIonicon } from '../../../src/lib/ai-tool-icons';
import {
  filterSubjectsForAiTool,
  filterSubjectsForIitBoard,
  isIitAiToolBoard,
  isLanguageExcludedTool,
  isStoryPassageLanguageSubject,
  isStoryLanguageTool,
} from '../../../src/lib/student-ai-tools';
import {
  getTeacherToolConfig,
  isTeacherToolType,
  CLASS_OPTIONS,
  type TeacherToolFieldConfig,
} from '../../../src/lib/teacher-ai-tool-configs';
import {
  getAiToolBoardOptions,
  getDefaultAiToolBoard,
  mapGradeLevelForIitBoard,
  resolveCurriculumBoardForAiTools,
  resolveIsAsliPrepExclusive,
} from '../../../src/lib/school-program-ai';
import {
  useCurriculumCascade,
} from '../../../src/hooks/useCurriculumCascade';
import teacherService, { asArray } from '../../../src/services/api/teacherService';
import {
  TEACHER,
  TEACHER_RADIUS,
  TEACHER_SPACING,
  TEACHER_TYPO,
} from '../../../src/theme/teacher';
import { AI, AI_RADIUS, AI_SHADOW, AI_SPACING, AI_TYPE } from '../../../src/theme/ai';
import { GLASS_ROW } from '../../../src/theme/glass';
import {
  canonicalTopicKey,
  dedupeChapterWiseLabels,
} from '../../../src/lib/curriculum-chapter-sort';

function mergeSelectedIntoOptions(options: string[], selected: unknown): string[] {
  const v = typeof selected === 'string' ? selected.trim() : '';
  if (!v) return options;
  const selectedKey = canonicalTopicKey(v) || v.toLowerCase();
  if (options.some((o) => (canonicalTopicKey(o) || o.toLowerCase()) === selectedKey)) {
    return dedupeChapterWiseLabels(options);
  }
  return dedupeChapterWiseLabels([v, ...options]);
}

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

const FIELD_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  board: 'school-outline',
  gradeLevel: 'layers-outline',
  subject: 'book-outline',
  topic: 'document-text-outline',
  chapter: 'document-text-outline',
  subTopic: 'list-outline',
  concept: 'bulb-outline',
  projectTopic: 'construct-outline',
  questionCount: 'help-circle-outline',
  difficulty: 'speedometer-outline',
  duration: 'time-outline',
  focusAreas: 'telescope-outline',
  questionType: 'help-circle-outline',
  length: 'resize-outline',
  countMcq: 'checkbox-outline',
  countVsaq: 'reader-outline',
  countSaq: 'create-outline',
  countLaq: 'document-outline',
  countFib: 'ellipsis-horizontal-outline',
  date: 'calendar-outline',
  timeSlots: 'time-outline',
  className: 'people-outline',
  batch: 'ribbon-outline',
};

/** IIT-only batch tiers shown as an extra selector when Board is IIT. */
const BATCH_OPTIONS = ['Alpha', 'Beta', 'Gamma'];

type DropdownState = {
  fieldName: string;
  title: string;
  options: string[];
  value: string;
  disabled: boolean;
};

function normalizeSubjectName(value: string) {
  let compact = String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (compact === 'maths' || compact === 'math') return 'mathematics';
  if (
    compact === 'socialscience' ||
    compact === 'socialstudies' ||
    compact === 'sst' ||
    compact === 'social'
  ) {
    return 'socialscience';
  }
  if (compact === 'computerscience' || compact === 'computer' || compact === 'cs' || compact === 'it') {
    return 'computerscience';
  }
  if (compact === 'phy' || compact.startsWith('physics')) return 'physics';
  if (compact === 'chem' || compact.startsWith('chemistry')) return 'chemistry';
  if (compact === 'bio' || compact.startsWith('biology')) return 'biology';
  if (compact === 'sci' || compact === 'evs' || compact.startsWith('science')) return 'science';
  if (compact.startsWith('mathematics')) return 'mathematics';
  return compact;
}

function subjectDisplayLabel(value: string) {
  const key = normalizeSubjectName(value);
  const labels: Record<string, string> = {
    mathematics: 'Mathematics',
    physics: 'Physics',
    chemistry: 'Chemistry',
    biology: 'Biology',
    science: 'Science',
    socialscience: 'Social Science',
    computerscience: 'Computer Science',
    english: 'English',
    hindi: 'Hindi',
    telugu: 'Telugu',
  };
  if (labels[key]) return labels[key];
  return String(value || '').trim() || value;
}

function uniquePreserveOrder(items: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const key = normalizeSubjectName(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(String(item).trim());
  }
  return result;
}

function mergeAssignedWithCurriculum(assignedSubjectNames: string[], curriculumSubjects: string[]) {
  if (assignedSubjectNames.length === 0) {
    return uniquePreserveOrder(curriculumSubjects);
  }
  const assignedKeys = new Set(assignedSubjectNames.map(normalizeSubjectName));
  const fromCurriculum = uniquePreserveOrder(
    curriculumSubjects.filter((s) => assignedKeys.has(normalizeSubjectName(s)))
  );
  const matchedKeys = new Set(fromCurriculum.map(normalizeSubjectName));
  const assignedOnly = uniquePreserveOrder(
    assignedSubjectNames
      .filter((s) => !matchedKeys.has(normalizeSubjectName(s)))
      .map((s) => subjectDisplayLabel(s))
  );
  return uniquePreserveOrder([...fromCurriculum, ...assignedOnly]);
}

function FormSection({
  title,
  subtitle,
  accent,
  icon,
  children,
  tabletUi,
}: {
  title: string;
  subtitle?: string;
  accent: string;
  icon?: keyof typeof Ionicons.glyphMap;
  children: ReactNode;
  tabletUi?: boolean;
}) {
  return (
    <GlassPanel style={styles.sectionCard} radius={AI_RADIUS.lg} tone="strong" elevated>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIcon, { backgroundColor: `${accent}18`, borderColor: `${accent}33` }]}>
          <Ionicons name={icon || 'sparkles'} size={18} color={accent} />
        </View>
        <View style={[styles.sectionHeaderText, tabletUi && aiToolTabletPageStyles.sectionHeaderText]}>
          <Text style={[styles.sectionTitle, tabletUi && aiToolTabletPageStyles.sectionTitle]}>
            {formatAiToolText(title)}
          </Text>
          {subtitle ? (
            <Text style={[styles.sectionSubtitle, tabletUi && aiToolTabletPageStyles.sectionSubtitle]}>
              {formatAiToolText(subtitle)}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={[styles.sectionBody, tabletUi && aiToolTabletPageStyles.sectionBody]}>{children}</View>
    </GlassPanel>
  );
}

function TeacherToolHeader({
  title,
  subtitle,
  onBack,
  tabletUi,
  toolIcon,
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
  tabletUi?: boolean;
  toolIcon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={[styles.header, tabletUi && styles.headerTablet]}>
      <LinearGradient
        colors={['#EEF0FF', '#F5F3FF', '#FFFFFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Pressable
        onPress={onBack}
        style={styles.backBtn}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Ionicons name="arrow-back" size={tabletUi ? 24 : 22} color={AI.primary} />
      </Pressable>
      <View style={styles.headerText}>
        <Text style={[styles.headerTitle, tabletUi && styles.headerTitleTablet]} numberOfLines={2}>
          {formatAiToolText(title)}
        </Text>
        {subtitle ? (
          <Text style={[styles.headerSubtitle, tabletUi && styles.headerSubtitleTablet]} numberOfLines={2}>
            {formatAiToolText(subtitle)}
          </Text>
        ) : null}
      </View>
      <View style={styles.headerIconWrap}>
        <LinearGradient
          colors={[AI.primary, AI.primaryPressed]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerIconGradient}
        >
          <Ionicons name={toolIcon || 'sparkles'} size={tabletUi ? 30 : 26} color="#FFFFFF" />
        </LinearGradient>
      </View>
    </View>
  );
}

export default function TeacherToolPage() {
  const { toolType: rawToolType, returnTab: returnTabRaw } = useLocalSearchParams<{
    toolType: string;
    returnTab?: string;
  }>();
  const toolType = rawToolType || '';
  const [formParams, setFormParams] = useState<Record<string, any>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [rawGeneratedContent, setRawGeneratedContent] = useState<unknown>(null);
  const [responseMeta, setResponseMeta] = useState<AiToolGenerationMeta | null>(null);
  const [fallbackEmptyMessage, setFallbackEmptyMessage] = useState('');
  const [fromAiFailure, setFromAiFailure] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  /** Wait for the stack transition before heavy form/network work. */
  const [uiReady, setUiReady] = useState(false);
  const { isTablet, useSplitLayout, outputBleedStyle } = useAiToolTabletLayout();
  const { scrollRef, onOutputLayout, queueScrollToOutput, resetOutputScroll } =
    useAiToolOutputScroll(isTablet);
  const [assignedSubjectNames, setAssignedSubjectNames] = useState<string[]>([]);
  const [availableNCERTTopics, setAvailableNCERTTopics] = useState<string[]>([]);
  const [schoolBoardName, setSchoolBoardName] = useState('CBSE');
  const [isAsliPrepExclusive, setIsAsliPrepExclusive] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<DropdownState | null>(null);

  const config = toolType && isTeacherToolType(toolType) ? getTeacherToolConfig(toolType) : null;
  const boardOptions = getAiToolBoardOptions(isAsliPrepExclusive, schoolBoardName);
  const selectedBoard = formParams.board || getDefaultAiToolBoard(isAsliPrepExclusive, schoolBoardName);
  const effectiveConfig = useMemo(() => {
    if (!config) return config;
    // Batch already covers IIT track — never show a second productCategory field.
    if (!config.fields.some((f) => f.name === 'productCategory')) return config;
    return {
      ...config,
      fields: config.fields.filter((f) => f.name !== 'productCategory'),
    };
  }, [config]);

  useEffect(() => {
    setFormParams((prev) => {
      if (!prev.productCategory) return prev;
      const next = { ...prev };
      delete next.productCategory;
      return next;
    });
  }, [selectedBoard]);
  const contentRenderKey = useMemo(
    () => buildAiToolContentRenderKey(toolType, generatedContent, responseMeta),
    [toolType, generatedContent, responseMeta]
  );
  const accent = AI.primary;

  const isIitBoard = String(selectedBoard || '').toUpperCase().replace(/[\s/\\-]+/g, '').includes('IIT');

  useEffect(() => {
    if (toolType !== 'daily-class-plan-maker') return;
    setFormParams((prev) => {
      const raw = String(prev.date || '').trim();
      const ok = /^\d{4}-\d{2}-\d{2}$/.test(raw);
      if (ok) return prev;
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      return { ...prev, date: `${y}-${m}-${d}` };
    });
  }, [toolType]);

  const cascadeTopic = formParams.topic || formParams.chapter || '';

  const cascade = useCurriculumCascade(
    formParams.gradeLevel,
    formParams.subject,
    cascadeTopic,
    selectedBoard,
    {
      enabled: uiReady,
      productCategory: isIitBoard
        ? formParams.batch
          ? String(formParams.batch)
          : undefined
        : '',
    },
  );

  const classSelectOptions =
    cascade.classOptions.length > 0 ? cascade.classOptions : CLASS_OPTIONS;

  const availableSubjects = useMemo(() => {
    if (!formParams.gradeLevel) return [];
    const raw = cascade.subjects;
    if (cascade.loadingSubjects && raw.length === 0) return [];
    // IIT: AI Tool Topics / STEM only — do not merge CBSE assigned subjects
    if (isIitAiToolBoard(selectedBoard)) {
      return filterSubjectsForIitBoard(uniquePreserveOrder(raw));
    }
    if (assignedSubjectNames.length > 0) {
      return mergeAssignedWithCurriculum(assignedSubjectNames, raw);
    }
    if (raw.length === 0) return [];
    return uniquePreserveOrder(raw);
  }, [
    formParams.gradeLevel,
    cascade.subjects,
    cascade.loadingSubjects,
    assignedSubjectNames,
    selectedBoard,
  ]);

  const subjectsForTool = useMemo(
    () => filterSubjectsForAiTool(toolType, availableSubjects),
    [toolType, availableSubjects]
  );

  // Keep params collapsed whenever a result is on screen (including regenerate)
  // so the phone fill layout isn't crushed by the full form.
  const showCollapsedParams = !!generatedContent;
  const showParameterForms = !generatedContent;

  useQueueAiToolScrollOnGenerate(
    generatedContent,
    isGenerating,
    isTablet,
    queueScrollToOutput,
    fallbackEmptyMessage,
  );

  const { curriculumFields, topicFields, extraFields } = useMemo(() => {
    if (!effectiveConfig) return { curriculumFields: [], topicFields: [], extraFields: [] };
    const HIDDEN_EXTRA = new Set([
      'questionCount',
      'difficulty',
      'duration',
      'length',
      'countMcq',
      'countVsaq',
      'countSaq',
      'countLaq',
      'countFib',
    ]);
    const curriculum: TeacherToolFieldConfig[] = [];
    const topic: TeacherToolFieldConfig[] = [];
    const extra: TeacherToolFieldConfig[] = [];
    for (const field of effectiveConfig.fields) {
      if (HIDDEN_EXTRA.has(field.name)) continue;
      if (field.name === 'gradeLevel' || field.name === 'subject') {
        curriculum.push(field);
      } else if (field.isNCERT || field.isCascadeSubtopic) {
        topic.push(field);
      } else {
        extra.push(field);
      }
    }
    return { curriculumFields: curriculum, topicFields: topic, extraFields: extra };
  }, [effectiveConfig]);

  const returnTab = parseTeacherDashboardTab(
    typeof returnTabRaw === 'string' ? returnTabRaw : Array.isArray(returnTabRaw) ? returnTabRaw[0] : undefined,
  );
  const goBack = useTeacherDashboardBack(returnTab);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setUiReady(true);
    });
    const fallback = setTimeout(() => setUiReady(true), 280);
    return () => {
      task.cancel();
      clearTimeout(fallback);
    };
  }, []);

  useEffect(() => {
    if (!uiReady) return;
    let cancelled = false;
    (async () => {
      try {
        const meRes = await teacherService.me();
        if (cancelled) return;
        const user = meRes.data?.user ?? meRes.data;
        const exclusive = resolveIsAsliPrepExclusive(user);
        setIsAsliPrepExclusive(exclusive);
        const curriculumBoard = resolveCurriculumBoardForAiTools(user);
        const defaultBoard = getDefaultAiToolBoard(exclusive, curriculumBoard);
        setSchoolBoardName(curriculumBoard);
        const compositionDefaults =
          toolType === 'worksheet-mcq-generator' || toolType === 'exam-question-paper-generator'
            ? {
                countMcq: '5',
                countVsaq: '3',
                countSaq: '3',
                countLaq: '1',
                countFib: '2',
              }
            : {};
        setFormParams((prev) => ({
          ...compositionDefaults,
          ...prev,
          board: prev.board || defaultBoard,
        }));
      } catch (error) {
        console.error('Failed to fetch teacher profile:', error);
      } finally {
        if (!cancelled) setIsLoadingUser(false);
      }

      try {
        const subsRes = await teacherService.subjects();
        if (cancelled) return;
        const rows = asArray<any>(subsRes.data ?? subsRes);
        const names = rows
          .map((subj: any) => String(subj?.name || subj?.displayName || '').trim())
          .filter(Boolean);
        setAssignedSubjectNames(uniquePreserveOrder(names));
      } catch (error) {
        console.error('Failed to fetch teacher assigned subjects:', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uiReady, toolType]);

  useEffect(() => {
    if (isLoadingUser || !formParams.board) return;
    if (!boardOptions.includes(formParams.board)) {
      const fallback = getDefaultAiToolBoard(isAsliPrepExclusive, schoolBoardName);
      setFormParams((prev) => ({ ...prev, board: fallback }));
    }
  }, [boardOptions, formParams.board, isAsliPrepExclusive, isLoadingUser, schoolBoardName]);

  useEffect(() => {
    const classValue = formParams.gradeLevel;
    const subjectValue = formParams.subject;
    if (!classValue || !subjectValue) {
      setAvailableNCERTTopics([]);
      return;
    }
    if (cascade.loadingTopics && cascade.topics.length === 0) {
      setAvailableNCERTTopics([]);
      return;
    }
    setAvailableNCERTTopics([...cascade.topics]);
  }, [formParams.gradeLevel, formParams.subject, cascade.topics, cascade.loadingTopics]);

  useEffect(() => {
    // Do not clear subject based on language/tool pairing — delivery is not gated.
  }, [toolType, formParams.subject]);

  useEffect(() => {
    if (!formParams.gradeLevel || subjectsForTool.length === 0) return;
    if (cascade.loadingSubjects) return;
    setFormParams((prev) => {
      const currentSubject = prev.subject;
      if (!currentSubject) return prev;
      const hasCurrent = subjectsForTool.some(
        (s) => normalizeSubjectName(s) === normalizeSubjectName(String(currentSubject))
      );
      if (hasCurrent) return prev;
      const next = { ...prev };
      delete next.subject;
      delete next.topic;
      delete next.subTopic;
      return next;
    });
  }, [subjectsForTool, formParams.gradeLevel, cascade.loadingSubjects]);

  const handleInputChange = (name: string, value: any) => {
    setFormParams((prev) => {
      let next = value;
      if (name === 'date') {
        // Digits and hyphens only — blocks junk like !@#$%!@#$%.
        next = String(value ?? '')
          .replace(/[^\d-]/g, '')
          .slice(0, 10);
      }
      const newParams = { ...prev, [name]: next };

      if (name === 'productCategory') {
        const track = value === 'NONE' ? '' : value;
        newParams.productCategory = track;
        // Keep subject when changing IIT Track; only reset topic cascade
        delete newParams.topic;
        delete newParams.subTopic;
        delete newParams.concept;
        delete newParams.chapter;
        delete newParams.projectTopic;
      }
      if (name === 'gradeLevel') {
        delete newParams.subject;
        delete newParams.topic;
        delete newParams.subTopic;
        delete newParams.concept;
        delete newParams.chapter;
        delete newParams.projectTopic;
      }
      if (name === 'subject') {
        delete newParams.topic;
        delete newParams.subTopic;
        delete newParams.concept;
        delete newParams.chapter;
        delete newParams.projectTopic;
      }
      if (name === 'batch') {
        newParams.productCategory = String(value || '').trim();
        delete newParams.topic;
        delete newParams.subTopic;
        delete newParams.concept;
        delete newParams.chapter;
        delete newParams.projectTopic;
      }
      if (name === 'topic' || name === 'chapter') {
        delete newParams.subTopic;
      }
      if (name === 'board') {
        delete newParams.subject;
        delete newParams.topic;
        delete newParams.subTopic;
        delete newParams.concept;
        delete newParams.chapter;
        delete newParams.projectTopic;
        if (!String(value).toUpperCase().includes('IIT')) {
          delete newParams.batch;
          delete newParams.productCategory;
        }
        if (String(value).toUpperCase() === 'IIT') {
          const iitClass = cascade.classOptions.find((c) => /iit/i.test(c)) || 'Class 6';
          newParams.gradeLevel = iitClass;
        }
      }

      return newParams;
    });
  };

  const getFieldOptions = useCallback(
    (field: TeacherToolFieldConfig): string[] => {
      if (field.options) return field.options;

      if (field.name === 'subject' && field.dependsOn === 'gradeLevel') {
        const classValue = formParams[field.dependsOn];
        if (classValue && subjectsForTool.length > 0) return subjectsForTool;
        return [];
      }

      if (field.isCascadeSubtopic && field.name === 'subTopic') {
        return !field.required
          ? [WHOLE_CHAPTER_VALUE, ...cascade.subtopics]
          : cascade.subtopics;
      }

      if (
        field.isNCERT &&
        (field.name === 'topic' ||
          field.name === 'concept' ||
          field.name === 'chapter' ||
          field.name === 'projectTopic')
      ) {
        return availableNCERTTopics;
      }

      return [];
    },
    [formParams, subjectsForTool, cascade.subtopics, availableNCERTTopics]
  );

  const getFieldDisabledState = (field: TeacherToolFieldConfig) => {
    let isDisabled = !!(field.dependsOn && !formParams[field.dependsOn]);
    let loading = false;

    if (field.name === 'gradeLevel') {
      isDisabled = cascade.loadingClasses && classSelectOptions.length === 0;
      loading = cascade.loadingClasses;
    } else if (field.name === 'subject' && field.dependsOn === 'gradeLevel') {
      loading = cascade.loadingSubjects;
      isDisabled = !formParams.gradeLevel || cascade.loadingSubjects || isLoadingUser;
    } else if (
      field.isNCERT &&
      (field.name === 'topic' ||
        field.name === 'concept' ||
        field.name === 'chapter' ||
        field.name === 'projectTopic')
    ) {
      loading = cascade.loadingTopics;
      isDisabled = !formParams.gradeLevel || !formParams.subject || cascade.loadingTopics;
    } else if (field.isCascadeSubtopic && field.name === 'subTopic') {
      loading = cascade.loadingSubtopics;
      isDisabled =
        !formParams.gradeLevel ||
        !formParams.subject ||
        !(formParams.topic || formParams.chapter) ||
        cascade.loadingSubtopics;
    }

    return { isDisabled, loading };
  };

  const getPlaceholderHint = (
    field: TeacherToolFieldConfig,
    fieldOptions: string[],
    isDisabled: boolean
  ) => {
    if (!isDisabled) return field.placeholder || `Select ${field.label.replace(' *', '')}`;

    if (field.name === 'gradeLevel' && cascade.loadingClasses) return 'Loading Classes...';
    if (field.name === 'subject') {
      if (!formParams.gradeLevel || cascade.loadingSubjects) return 'Select Class First';
      if (subjectsForTool.length === 0) {
        return 'No Subjects Available';
      }
    }
    if (
      field.isNCERT &&
      (field.name === 'topic' ||
        field.name === 'concept' ||
        field.name === 'chapter' ||
        field.name === 'projectTopic')
    ) {
      if (!formParams.gradeLevel) return 'Select Class First';
      if (!formParams.subject || cascade.loadingTopics) return 'Select Subject First';
      if (cascade.loadingTopics) return 'Loading Topics...';
      if (fieldOptions.length === 0) return 'No Topics Available';
    }
    if (field.isCascadeSubtopic) {
      if (!(formParams.topic || formParams.chapter)) return 'Select Topic First';
      if (cascade.loadingSubtopics) return 'Loading Subtopics...';
      if (cascade.subtopics.length === 0 && !String(formParams.subTopic || '').trim()) {
        return 'No Subtopics Available';
      }
    }
    if (fieldOptions.length === 0 && field.dependsOn) {
      const parent = effectiveConfig?.fields.find((f) => f.name === field.dependsOn);
      return `Select ${parent?.label.replace(' *', '') || 'class'} first`;
    }
    return field.placeholder || 'No Options Available';
  };

  const openDropdown = (
    fieldName: string,
    title: string,
    options: string[],
    value: string,
    disabled: boolean
  ) => {
    if (disabled || options.length === 0) return;
    setActiveDropdown({ fieldName, title, options, value, disabled });
  };

  const showInlineOutputMessage = useCallback(
    (message: string) => {
      resetOutputScroll();
      setGeneratedContent('');
      setRawGeneratedContent(null);
      setResponseMeta(null);
      setFromAiFailure(false);
      setFallbackEmptyMessage(message);
      queueScrollToOutput();
    },
    [resetOutputScroll, queueScrollToOutput],
  );

  useEffect(() => {
    setFallbackEmptyMessage('');
  }, [
    formParams.board,
    formParams.gradeLevel,
    formParams.subject,
    formParams.topic,
    formParams.subTopic,
  ]);

  const handleGenerate = async () => {
    if (!config || !toolType) return;

    // Load heavy generate/HTML helpers only when the user taps Generate.
    const {
      validateAiToolForm,
      executeAiToolGenerate,
      buildTeacherAiRequestBody,
      storeAiToolSuccessPayload,
      fetchAiToolGeneratedContentFallback,
      isAiToolClientValidationError,
      isAiToolInlineOnlyError,
      resolveAiToolApiInlineMessage,
    } = await import('../../../src/lib/ai-tool-generate');

    const validationError = validateAiToolForm({
      config: effectiveConfig,
      formParams: { ...formParams, board: selectedBoard },
      toolType,
      isReadingPractice: isStoryLanguageTool(toolType),
      requireBoard: true,
    });
    if (validationError) {
      showInlineOutputMessage(validationError);
      return;
    }

    setIsGenerating(true);
    resetOutputScroll();
    setGeneratedContent('');
    setRawGeneratedContent(null);
    setResponseMeta(null);
    setFallbackEmptyMessage('');
    setFromAiFailure(false);

    try {
      const token = await storageGetItem('authToken');
      if (!token) {
        showInlineOutputMessage('Please sign in again.');
        return;
      }

      const requestBody = buildTeacherAiRequestBody(
        toolType,
        formParams,
        selectedBoard,
        mapGradeLevelForIitBoard
      );

      const result = await executeAiToolGenerate({
        endpoint: `${API_BASE_URL}/api/teacher/ai/generate-content`,
        token,
        requestBody,
      });

      if (!result.ok) {
        if (isAiToolInlineOnlyError(result.code)) {
          showInlineOutputMessage(
            resolveAiToolApiInlineMessage({ message: result.message, code: result.code }, config?.name),
          );
          return;
        }
        throw new Error(result.message || 'AI generation failed');
      }

      const stored = storeAiToolSuccessPayload(toolType, result.content, result.rawContent, 'teacher');

      setResponseMeta(result.metadata);
      setFromAiFailure(result.fromAiFailure);
      setGeneratedContent(stored.generatedContent);
      setRawGeneratedContent(stored.rawGeneratedContent);
    } catch (error: any) {
      console.error('Generation error:', error);
      const errMsg = String(error?.message || 'Network error. Please try again.');
      if (isAiToolClientValidationError(errMsg) || /AI_TOOL_DATA_NOT_FOUND/i.test(errMsg)) {
        showInlineOutputMessage(errMsg);
        return;
      }

      try {
        const selectedClass = formParams.gradeLevel;
        const selectedSubject = formParams.subject || formParams.subjects;
        if (!selectedClass || !selectedSubject) {
          throw new Error('Missing class or subject for fallback');
        }
        const token = await storageGetItem('authToken');
        if (!token) throw new Error('Please sign in again.');

        const fallbackResult = await fetchAiToolGeneratedContentFallback({
          apiBaseUrl: API_BASE_URL,
          token,
          classLabel: String(selectedClass),
          subject: String(selectedSubject),
          topic: String(formParams.topic || ''),
          subTopic: resolveSubTopicForRequest(formParams.subTopic),
          toolType: String(toolType || ''),
        });

        if (!fallbackResult.ok) {
          if (isAiToolInlineOnlyError(fallbackResult.code)) {
            showInlineOutputMessage(fallbackResult.fallbackMessage);
            return;
          }
          const lookupTimedOut = /exceeded time limit|multiplanner/i.test(errMsg);
          showInlineOutputMessage(
            lookupTimedOut
              ? 'Saved content is taking too long to load. Please try Generate again.'
              : fallbackResult.fallbackMessage ||
                  'Could not load saved content for this selection. Please try again.',
          );
          return;
        }

        const stored = storeAiToolSuccessPayload(
          toolType,
          fallbackResult.content,
          fallbackResult.rawContent,
          'teacher'
        );

        setResponseMeta(fallbackResult.metadata);
        setFromAiFailure(false);
        setGeneratedContent(stored.generatedContent);
        setRawGeneratedContent(stored.rawGeneratedContent);
      } catch (fallbackError: any) {
        const lookupTimedOut = /exceeded time limit|multiplanner/i.test(errMsg);
        showInlineOutputMessage(
          lookupTimedOut
            ? 'Saved content is taking too long to load. Please try Generate again.'
            : 'Could not load saved content for this selection. Please try again.',
        );
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const renderDropdownTrigger = (
    fieldName: string,
    label: string,
    value: string,
    hint: string,
    options: string[],
    disabled: boolean,
    loading: boolean,
    required?: boolean
  ) => {
    const icon = FIELD_ICONS[fieldName] || 'chevron-down-circle-outline';
    const displayLabel = value === WHOLE_CHAPTER_VALUE ? 'Whole Chapter' : value;
    const display = displayLabel || hint;
    const isPlaceholder = !value;

    return (
      <TouchableOpacity
        style={[styles.fieldCard, disabled && styles.fieldCardDisabled]}
        onPress={() => openDropdown(fieldName, label.replace(' *', ''), options, value, disabled)}
        activeOpacity={0.8}
        disabled={disabled}
      >
        <View style={[styles.fieldIconChip, { backgroundColor: `${accent}14`, borderColor: `${accent}2e` }]}>
          <Ionicons name={icon} size={18} color={accent} />
        </View>
        <View style={styles.fieldCardText}>
          <Text style={[styles.fieldCardLabel, isTablet && aiToolTabletPageStyles.fieldLabel]} numberOfLines={1}>
            {label.replace(' *', '')}
            {required ? <Text style={styles.required}> *</Text> : null}
          </Text>
          <Text
            style={[styles.fieldCardValue, isPlaceholder && styles.fieldCardPlaceholder, isTablet && aiToolTabletPageStyles.dropdownValue]}
            numberOfLines={2}
          >
            {display}
          </Text>
        </View>
        {loading ? (
          <ActivityIndicator size="small" color={accent} />
        ) : (
          <View style={[styles.fieldChevron, disabled && styles.fieldChevronDisabled]}>
            <Ionicons name="chevron-down" size={16} color={disabled ? TEACHER.navInactive : accent} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderSelectField = (field: TeacherToolFieldConfig) => {
    const rawValue = formParams[field.name] || '';
    const value =
      field.isCascadeSubtopic && !field.required && !rawValue
        ? WHOLE_CHAPTER_VALUE
        : rawValue;
    const { isDisabled, loading } = getFieldDisabledState(field);

    let fieldOptions = getFieldOptions(field);
    if (field.name === 'gradeLevel') fieldOptions = classSelectOptions;
    else if (field.name === 'subject' && field.dependsOn === 'gradeLevel') fieldOptions = subjectsForTool;
    fieldOptions = mergeSelectedIntoOptions(fieldOptions, value);
    const hint = getPlaceholderHint(field, fieldOptions, isDisabled);

    return (
      <View key={field.name}>
        {renderDropdownTrigger(
          field.name,
          field.label,
          value,
          hint,
          fieldOptions,
          isDisabled,
          loading,
          field.required
        )}
      </View>
    );
  };

  const renderField = (field: TeacherToolFieldConfig) => {
    const value = formParams[field.name] || '';

    if (field.type === 'select') return renderSelectField(field);

    if (field.type === 'textarea') {
      return (
        <View key={field.name} style={styles.fieldInputCard}>
          <View style={styles.fieldInputHeader}>
            <View style={[styles.fieldIconChipSm, { backgroundColor: `${accent}14`, borderColor: `${accent}2e` }]}>
              <Ionicons name={FIELD_ICONS[field.name] || 'create-outline'} size={15} color={accent} />
            </View>
            <Text style={[styles.fieldCardLabel, isTablet && aiToolTabletPageStyles.fieldLabel]}>
              {formatAiToolText(field.label.replace(' *', ''))}
              {field.required ? <Text style={styles.required}> *</Text> : null}
            </Text>
          </View>
          <TextInput
            style={[styles.textArea, styles.textInput, isTablet && aiToolTabletPageStyles.textInput]}
            placeholder={field.placeholder}
            value={value}
            onChangeText={(text) => handleInputChange(field.name, text)}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            placeholderTextColor={TEACHER.navInactive}
          />
        </View>
      );
    }

    return (
      <View key={field.name} style={styles.fieldInputCard}>
        <View style={styles.fieldInputHeader}>
          <View style={[styles.fieldIconChipSm, { backgroundColor: `${accent}14`, borderColor: `${accent}2e` }]}>
            <Ionicons name={FIELD_ICONS[field.name] || 'options-outline'} size={15} color={accent} />
          </View>
          <Text style={[styles.fieldCardLabel, isTablet && aiToolTabletPageStyles.fieldLabel]}>
            {formatAiToolText(field.label.replace(' *', ''))}
            {field.required ? <Text style={styles.required}> *</Text> : null}
          </Text>
        </View>
        <TextInput
          style={[styles.textInput, isTablet && aiToolTabletPageStyles.textInput]}
          placeholder={field.placeholder}
          value={value}
          onChangeText={(text) => handleInputChange(field.name, text)}
          keyboardType={field.type === 'number' ? 'numeric' : 'default'}
          placeholderTextColor={TEACHER.navInactive}
        />
      </View>
    );
  };

  if (!config) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" />
        <TeacherToolHeader title="Tool not found" onBack={goBack} />
        <View style={styles.errorContainer}>
          <View style={styles.errorIconWrap}>
            <Ionicons name="alert-circle-outline" size={48} color={TEACHER.danger} />
          </View>
          <Text style={styles.errorTitle}>Tool Not Found</Text>
          <Text style={styles.errorSubtitle}>This AI tool is not available on mobile yet.</Text>
          <TouchableOpacity style={styles.errorButton} onPress={goBack}>
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const chapterValue = String(formParams.topic || formParams.chapter || '');
  const editableParamItems = [
    {
      icon: 'school-outline' as const,
      label: 'Board',
      value: String(selectedBoard || ''),
      disabled: isLoadingUser,
      onPress: () =>
        openDropdown('board', 'Board', mergeSelectedIntoOptions(boardOptions, selectedBoard), selectedBoard, isLoadingUser),
    },
    ...(isIitBoard
      ? [
          {
            icon: 'ribbon-outline' as const,
            label: 'Batch',
            value: String(formParams.batch || ''),
            disabled: false,
            onPress: () =>
              openDropdown(
                'batch',
                'Batch',
                mergeSelectedIntoOptions(BATCH_OPTIONS, formParams.batch),
                String(formParams.batch || ''),
                false,
              ),
          },
        ]
      : []),
    {
      icon: 'people-outline' as const,
      label: 'Class',
      value: String(formParams.gradeLevel || ''),
      disabled: cascade.loadingClasses && classSelectOptions.length === 0,
      onPress: () =>
        openDropdown(
          'gradeLevel',
          'Class',
          mergeSelectedIntoOptions(classSelectOptions, formParams.gradeLevel),
          String(formParams.gradeLevel || ''),
          cascade.loadingClasses && classSelectOptions.length === 0,
        ),
    },
    {
      icon: 'book-outline' as const,
      label: 'Subject',
      value: String(formParams.subject || ''),
      disabled: !formParams.gradeLevel || cascade.loadingSubjects,
      onPress: () =>
        openDropdown(
          'subject',
          'Subject',
          mergeSelectedIntoOptions(subjectsForTool, formParams.subject),
          String(formParams.subject || ''),
          !formParams.gradeLevel || cascade.loadingSubjects,
        ),
    },
    {
      icon: 'document-text-outline' as const,
      label: 'Chapter',
      value: chapterValue,
      disabled: !formParams.subject || cascade.loadingTopics,
      onPress: () =>
        openDropdown(
          'topic',
          'Chapter',
          mergeSelectedIntoOptions(availableNCERTTopics, chapterValue),
          chapterValue,
          !formParams.subject || cascade.loadingTopics,
        ),
    },
    {
      icon: 'list-outline' as const,
      label: 'Subtopic',
      value: String(formParams.subTopic || ''),
      disabled: !chapterValue || cascade.loadingSubtopics,
      onPress: () =>
        openDropdown(
          'subTopic',
          'Sub Topic',
          mergeSelectedIntoOptions(cascade.subtopics, formParams.subTopic),
          String(formParams.subTopic || ''),
          !chapterValue || cascade.loadingSubtopics,
        ),
    },
  ];

  const formPanel = (
    <>
      {showCollapsedParams ? (
        <AiToolParamsGrid items={editableParamItems} accent={accent} tabletUi={isTablet} editable />
      ) : null}

      {showParameterForms ? (
        <>
          <FormSection title="Configure Your Tool" subtitle="Fill in the details to generate" accent={accent} icon="options-outline" tabletUi={isTablet}>
            {renderDropdownTrigger(
              'board',
              'Board',
              selectedBoard,
              'Select Board',
              boardOptions,
              isLoadingUser,
              false,
              true
            )}
            {isIitBoard
              ? renderDropdownTrigger(
                  'batch',
                  'Batch',
                  String(formParams.batch || ''),
                  'Select Batch',
                  BATCH_OPTIONS,
                  false,
                  false,
                  false
                )
              : null}
            {curriculumFields.map(renderField)}
          </FormSection>

          {topicFields.length > 0 || extraFields.length > 0 ? (
            <FormSection
              title="Topic details"
              subtitle="Pick chapter and sub-topic from syllabus"
              accent={accent}
              icon="book-outline"
              tabletUi={isTablet}
            >
              {topicFields.map(renderField)}
              {extraFields.map(renderField)}
            </FormSection>
          ) : null}
        </>
      ) : null}
    </>
  );

  const renderOutputPanel = (fill: boolean) => (
    <View
      style={[styles.outputSection, fill && styles.outputSectionFill, outputBleedStyle]}
      collapsable={false}
      onLayout={
        !fill && !isGenerating && (generatedContent || fallbackEmptyMessage)
          ? onOutputLayout
          : undefined
      }
    >
      <AiToolResultShell
        toolType={toolType}
        toolName={config?.name || 'AI Tool'}
        toolDescription={config?.description}
        accent={accent}
        variant="teacher"
        fill={fill}
        meta={{
          board: selectedBoard || formParams.board || '',
          classLabel: String(formParams.gradeLevel || ''),
          subject: String(formParams.subject || formParams.subjects || ''),
          chapter: String(formParams.topic || formParams.chapter || ''),
          subtopic: String(formParams.subTopic || ''),
        }}
        isLoading={isGenerating}
        actions={
          generatedContent ? (
            <View style={styles.resultActionStack}>
              <AiToolDownloadBar
                toolType={toolType}
                toolLabel={config?.name || 'AI Tool'}
                content={generatedContent}
                rawContent={rawGeneratedContent}
                accent={accent}
              />
              <View style={styles.resultActions}>
                <Pressable
                  style={styles.actionBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Share generated content"
                  onPress={() =>
                    Share.share({
                      title: `${config?.name || 'AI Tool'} | ASLILEARN AI`,
                      message: generatedContent,
                    })
                  }
                >
                  <Ionicons name="share-social-outline" size={16} color={AI.textSecondary} />
                  <Text style={styles.actionBtnText}>Share</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionBtn, styles.actionBtnPrimary]}
                  accessibilityRole="button"
                  accessibilityLabel="Regenerate content"
                  onPress={handleGenerate}
                >
                  <Ionicons name="refresh-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.actionBtnPrimaryText}>Regenerate</Text>
                </Pressable>
              </View>
            </View>
          ) : null
        }
        empty={
          <GlassPanel style={styles.emptyResult} radius={TEACHER_RADIUS.lg} tone="light">
            <View style={styles.emptyResultInner}>
              <Ionicons
                name={fallbackEmptyMessage ? 'alert-circle-outline' : 'sparkles'}
                size={28}
                color={fallbackEmptyMessage ? '#dc2626' : TEACHER.navInactive}
              />
              <Text
                style={[
                  styles.emptyResultTitle,
                  isTablet && aiToolTabletPageStyles.emptyResultTitle,
                  fallbackEmptyMessage ? styles.emptyResultTitleError : null,
                ]}
              >
                {fallbackEmptyMessage || 'Fill In The Form And Generate To See Your Result'}
              </Text>
              {!fallbackEmptyMessage ? (
                <Text style={[styles.emptyResultText, isTablet && aiToolTabletPageStyles.emptyResultText]}>
                  Choose tool parameters and tap Generate.
                </Text>
              ) : null}
            </View>
          </GlassPanel>
        }
      >
        {generatedContent ? (
          <View style={[styles.outputWrap, fill && styles.outputWrapFill]} collapsable={false}>
            <AiToolContentRenderer
              key={contentRenderKey}
              toolType={toolType}
              content={generatedContent}
              rawContent={rawGeneratedContent}
              accent={accent}
              variant="teacher"
              fill={fill}
            />
          </View>
        ) : null}
      </AiToolResultShell>
    </View>
  );

  const generateButton = (
    <TouchableOpacity
      style={[styles.generateBtn, isGenerating && styles.generateBtnDisabled]}
      onPress={handleGenerate}
      disabled={isGenerating}
      activeOpacity={0.9}
    >
      <LinearGradient
        colors={[AI.primary, AI.primaryPressed]}
        style={[styles.generateBtnGradient, isTablet && aiToolTabletPageStyles.generateBtnGradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        {isGenerating ? (
          <>
            <ActivityIndicator size="small" color={TEACHER.textOnPrimary} />
            <Text style={[styles.generateBtnText, isTablet && aiToolTabletPageStyles.generateBtnText]}>
              Generating...
            </Text>
          </>
        ) : (
          <>
            <Ionicons name="sparkles" size={isTablet ? 22 : 20} color={TEACHER.textOnPrimary} />
            <Text style={[styles.generateBtnText, isTablet && aiToolTabletPageStyles.generateBtnText]}>
              Generate With AI
            </Text>
          </>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" />

      <TeacherToolHeader
        title={config.name}
        subtitle={config.description}
        onBack={goBack}
        tabletUi={isTablet}
        toolIcon={getAiToolIonicon(toolType)}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        {!uiReady ? (
          <View style={styles.bootPlaceholder}>
            <ActivityIndicator size="small" color={AI.primary} />
          </View>
        ) : useSplitLayout ? (
          <View style={aiToolTabletStyles.tabletSplit}>
            <ScrollView
              style={aiToolTabletStyles.tabletFormPane}
              contentContainerStyle={aiToolTabletStyles.tabletPaneContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {formPanel}
            </ScrollView>
            <ScrollView
              style={aiToolTabletStyles.tabletOutputPane}
              contentContainerStyle={aiToolTabletStyles.tabletPaneContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
            >
              {renderOutputPanel(false)}
              {generatedContent ? (
                <View style={[styles.footer, styles.footerAfterResult, isTablet && aiToolTabletPageStyles.footer]}>
                  {generateButton}
                </View>
              ) : null}
            </ScrollView>
          </View>
        ) : generatedContent ? (
          // Phone + result: gesture-handler ScrollView owns vertical scroll with
          // an auto-height (non-scrolling) WebView — works both down and back up.
          <GHScrollView
            style={styles.scroll}
            contentContainerStyle={[
              styles.scrollContent,
              isTablet && aiToolTabletPageStyles.scrollContent,
              { paddingBottom: 16 },
            ]}
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            bounces={false}
            overScrollMode="never"
            removeClippedSubviews={false}
          >
            {formPanel}
            {renderOutputPanel(false)}
            <View style={[styles.footer, styles.footerAfterResult, isTablet && aiToolTabletPageStyles.footer]}>
              {generateButton}
            </View>
          </GHScrollView>
        ) : (
        <AnimatedScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            isTablet && aiToolTabletPageStyles.scrollContent,
            { paddingBottom: 28 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          bounces={false}
          overScrollMode="never"
        >
          {formPanel}
          {renderOutputPanel(false)}
        </AnimatedScrollView>
        )}

        {uiReady && !generatedContent ? (
          <View style={[styles.footer, isTablet && aiToolTabletPageStyles.footer]}>
            {generateButton}
          </View>
        ) : null}
      </KeyboardAvoidingView>

      <AiToolOptionPicker
        visible={!!activeDropdown}
        title={activeDropdown?.title || ''}
        options={activeDropdown?.options || []}
        value={activeDropdown?.value}
        accent={accent}
        onClose={() => setActiveDropdown(null)}
        onSelect={(option) => {
          if (activeDropdown) {
            const next =
              activeDropdown.fieldName === 'subTopic' && option === WHOLE_CHAPTER_VALUE
                ? ''
                : option;
            handleInputChange(activeDropdown.fieldName, next);
          }
          setActiveDropdown(null);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Transparent so AppBackground's artwork shows through.
  container: { flex: 1, backgroundColor: 'transparent' },
  flex: { flex: 1 },
  bootPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  paramsPeek: {
    paddingHorizontal: AI_SPACING.lg,
    paddingTop: AI_SPACING.md,
    paddingBottom: AI_SPACING.sm,
    gap: AI_SPACING.sm,
  },
  resultFillHost: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: AI_SPACING.lg,
    gap: AI_SPACING.sm,
  },
  outputSection: { alignSelf: 'stretch' },
  outputSectionFill: { flex: 1, minHeight: 0 },
  outputWrap: { width: '100%' },
  outputWrapFill: { flex: 1, minHeight: 0 },
  resultActionStack: { width: '100%', gap: AI_SPACING.sm },
  resultActions: { flexDirection: 'row', flexWrap: 'wrap', gap: AI_SPACING.sm },
  actionBtn: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_ROW.border,
    backgroundColor: GLASS_ROW.fillStrong,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  actionBtnText: { ...AI_TYPE.caption, color: AI.textSecondary },
  actionBtnPrimary: { borderColor: AI.primary, backgroundColor: AI.primary },
  actionBtnPrimaryText: { ...AI_TYPE.caption, color: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: TEACHER_SPACING.lg,
    paddingVertical: TEACHER_SPACING.md,
    gap: TEACHER_SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: AI.primaryBorder,
    overflow: 'hidden',
  },
  headerTablet: {
    paddingHorizontal: 28,
    paddingVertical: 18,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: AI_RADIUS.md,
    borderWidth: 1,
    borderColor: AI.primaryBorder,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, minWidth: 0 },
  headerTitle: { ...AI_TYPE.title, fontSize: 20, lineHeight: 26, color: AI.text },
  headerTitleTablet: { fontSize: 24, lineHeight: 30 },
  headerSubtitle: { ...AI_TYPE.caption, fontSize: 13, lineHeight: 18, color: AI.textSecondary, marginTop: 3 },
  headerSubtitleTablet: { fontSize: 14, lineHeight: 20 },
  headerIconWrap: {
    borderRadius: AI_RADIUS.md,
    shadowColor: AI.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 6,
  },
  headerIconGradient: {
    width: 52,
    height: 52,
    borderRadius: AI_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flex: 1 },
  scrollContent: { padding: AI_SPACING.lg, gap: AI_SPACING.md },
  sectionCard: {
    borderRadius: AI_RADIUS.lg,
    borderWidth: 1,
    borderColor: AI.border,
    overflow: 'hidden',
    ...AI_SHADOW,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: TEACHER_SPACING.md,
    paddingHorizontal: AI_SPACING.lg,
    paddingVertical: AI_SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: AI.border,
  },
  sectionIcon: {
    width: 38,
    height: 38,
    borderRadius: AI_RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderText: { flex: 1, minWidth: 0 },
  sectionTitle: { ...AI_TYPE.title, fontSize: 18, lineHeight: 24, color: AI.text },
  sectionSubtitle: { ...AI_TYPE.caption, fontSize: 13, lineHeight: 18, color: AI.textMuted, marginTop: 2 },
  sectionBody: { padding: AI_SPACING.lg, gap: TEACHER_SPACING.md },
  required: { color: AI.orange },
  fieldCard: {
    minHeight: 62,
    minWidth: 0,
    overflow: 'hidden',
    borderRadius: AI_RADIUS.md,
    borderWidth: 1,
    borderColor: AI.border,
    backgroundColor: AI.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fieldCardDisabled: { opacity: 0.55, backgroundColor: AI.surfaceMuted },
  fieldIconChip: {
    width: 40,
    height: 40,
    borderRadius: AI_RADIUS.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldIconChipSm: {
    width: 30,
    height: 30,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldCardText: { flex: 1, flexShrink: 1, minWidth: 0, gap: 2, overflow: 'hidden' },
  fieldCardLabel: { fontSize: 12, lineHeight: 16, fontWeight: '700', color: AI.textMuted, letterSpacing: 0.2 },
  fieldCardValue: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '700',
    color: AI.text,
    flexShrink: 1,
    minWidth: 0,
    overflow: 'hidden',
  },
  fieldCardPlaceholder: { color: AI.textMuted, fontWeight: '500' },
  fieldChevron: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: AI.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldChevronDisabled: { backgroundColor: 'transparent' },
  fieldInputCard: {
    borderRadius: AI_RADIUS.md,
    borderWidth: 1,
    borderColor: AI.border,
    backgroundColor: AI.surface,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 8,
  },
  fieldInputHeader: { flexDirection: 'row', alignItems: 'center', gap: TEACHER_SPACING.sm },
  textInput: {
    minHeight: 48,
    borderRadius: AI_RADIUS.sm,
    borderWidth: 1,
    borderColor: AI.border,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    ...AI_TYPE.body,
    fontSize: 16,
    color: AI.text,
  },
  textArea: { minHeight: 104, paddingTop: 12, paddingBottom: 12 },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: TEACHER_SPACING.sm,
    backgroundColor: TEACHER.navActiveBg,
    borderRadius: TEACHER_RADIUS.md,
    padding: TEACHER_SPACING.md,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
  },
  infoBannerTextWrap: { flex: 1, minWidth: 0 },
  infoBannerText: { ...TEACHER_TYPO.caption, color: TEACHER.primaryLight, lineHeight: 18 },
  infoBannerWarning: {
    backgroundColor: 'rgba(255,251,235,0.55)',
    borderColor: '#fcd34d',
  },
  infoBannerWarningText: { color: '#92400e' },
  generatingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 42,
    paddingHorizontal: TEACHER_SPACING.xl,
    gap: 8,
  },
  generatingTitle: { fontSize: 16, fontWeight: '800', color: TEACHER.text },
  generatingText: { fontSize: 13, color: TEACHER.textMuted, textAlign: 'center' },
  emptyResult: {
    paddingVertical: 36,
    paddingHorizontal: TEACHER_SPACING.xxl,
    borderRadius: TEACHER_RADIUS.lg,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
    borderStyle: 'dashed',
  },
  // Centering lives on an inner view because GlassPanel wraps its children.
  emptyResultInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyResultTitle: {
    marginTop: TEACHER_SPACING.md,
    ...TEACHER_TYPO.body,
    fontWeight: '700',
    color: TEACHER.textMuted,
    textAlign: 'center',
  },
  emptyResultTitleError: {
    color: '#b91c1c',
  },
  emptyResultText: {
    marginTop: 4,
    ...TEACHER_TYPO.caption,
    color: TEACHER.navInactive,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: TEACHER_SPACING.lg,
    paddingTop: 10,
    paddingBottom: TEACHER_SPACING.md,
    // Transparent so AppBackground's artwork shows through.
    backgroundColor: 'transparent',
    borderTopWidth: 1,
    borderTopColor: AI.border,
  },
  footerAfterResult: {
    marginTop: 8,
    paddingHorizontal: 0,
    paddingTop: 8,
    borderTopWidth: 0,
  },
  generateBtn: {
    borderRadius: AI_RADIUS.full,
    overflow: 'hidden',
    shadowColor: AI.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 16,
    elevation: 8,
  },
  generateBtnDisabled: { opacity: 0.7 },
  generateBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: TEACHER_SPACING.sm,
    minHeight: 58,
    paddingVertical: AI_SPACING.md,
  },
  generateBtnText: { fontSize: 17, lineHeight: 22, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.2 },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: TEACHER_SPACING.xxxl,
  },
  errorIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: TEACHER_SPACING.lg,
  },
  errorTitle: { ...TEACHER_TYPO.section, fontSize: 20, color: TEACHER.text },
  errorSubtitle: {
    ...TEACHER_TYPO.caption,
    color: TEACHER.textMuted,
    marginTop: TEACHER_SPACING.sm,
    textAlign: 'center',
  },
  errorButton: {
    marginTop: TEACHER_SPACING.xxl,
    backgroundColor: TEACHER.primary,
    paddingHorizontal: TEACHER_SPACING.xxl,
    paddingVertical: TEACHER_SPACING.md,
    borderRadius: TEACHER_RADIUS.md,
  },
  errorButtonText: { color: TEACHER.textOnPrimary, ...TEACHER_TYPO.body, fontWeight: '700' },
});
