import { storageGetItem } from '../../../src/lib/safe-storage';
import { useState, useEffect, useMemo, useCallback, useRef, type ReactNode } from 'react';
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
  Share,
  InteractionManager,
} from 'react-native';
import { ScrollView as GHScrollView } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { API_BASE_URL } from '../../../src/lib/api-config';
import { formatAiToolText } from '../../../src/lib/title-case';
import {
  parseStudentDashboardTab,
  useStudentDashboardBack,
} from '../../../src/hooks/useBackNavigation';
import {
  resolveStudentAiApiToolType,
  resolveStudentToolConfigKey,
  filterSubjectsForAiTool,
  filterSubjectsForIitBoard,
  isIitAiToolBoard,
  isLanguageExcludedTool,
  isStoryPassageLanguageSubject,
  READING_PRACTICE_TOOL_ID,
} from '../../../src/lib/student-ai-tools';
import {
  CLASS_OPTIONS,
  getStudentToolConfig,
  type StudentToolFieldConfig,
} from '../../../src/lib/student-ai-tool-configs';
import {
  getAiToolBoardOptions,
  getDefaultAiToolBoard,
  mapGradeLevelForIitBoard,
  resolveCurriculumBoardForAiTools,
  resolveIsAsliPrepExclusive,
  resolveStudentCurriculumGradeLevel,
} from '../../../src/lib/school-program-ai';
import { resolveSchoolIitCategories } from '../../../src/lib/school-program';
import {
  useCurriculumCascade,
} from '../../../src/hooks/useCurriculumCascade';
import StudentScreenHeader from '../../../src/components/student/StudentScreenHeader';
import { GlassPanel } from '../../../src/components/ui';
import AiToolContentRenderer from '../../../src/components/ai-tools/AiToolContentRenderer';
import AiToolFieldIcon from '../../../src/components/ai-tools/AiToolFieldIcon';
import AiToolParamsGrid from '../../../src/components/ai-tools/AiToolParamsGrid';
import AiToolPremiumIcon from '../../../src/components/ai-tools/AiToolPremiumIcon';
import AiToolResultShell from '../../../src/components/ai-tools/AiToolResultShell';
import AiToolOptionPicker from '../../../src/components/ai-tools/AiToolOptionPicker';
import AiGenerateIcon from '../../../src/components/ai-tools/AiGenerateIcon';
import * as Clipboard from 'expo-clipboard';
import { getAiToolIonicon } from '../../../src/lib/ai-tool-icons';
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
  executeStudentAiToolGenerate,
  fetchAiToolGeneratedContentFallback,
  storeAiToolSuccessPayload,
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
import {
  STUDENT,
  STUDENT_RADIUS,
  STUDENT_SPACING,
  STUDENT_TYPO,
} from '../../../src/theme/student';
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

/**
 * Local draft while typing so parent (cascade + result UI) does not re-render every keystroke.
 * Commits to form state on blur / end editing, and keeps a live ref for Generate.
 */
function DeferredToolTextInput({
  value,
  onCommit,
  style,
  multiline,
  ...rest
}: {
  value: string;
  onCommit: (next: string) => void;
  style?: any;
  multiline?: boolean;
  placeholder?: string;
  numberOfLines?: number;
  textAlignVertical?: 'top' | 'center' | 'bottom' | 'auto';
  placeholderTextColor?: string;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
}) {
  const [draft, setDraft] = useState(value || '');
  const draftRef = useRef(draft);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  draftRef.current = draft;

  useEffect(() => {
    setDraft(value || '');
  }, [value]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const commit = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const next = draftRef.current;
    if (next !== (value || '')) onCommit(next);
  }, [onCommit, value]);

  const onChangeText = useCallback(
    (text: string) => {
      setDraft(text);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        onCommit(text);
      }, 180);
    },
    [onCommit]
  );

  return (
    <TextInput
      {...rest}
      style={style}
      multiline={multiline}
      value={draft}
      onChangeText={onChangeText}
      onBlur={commit}
      onEndEditing={commit}
      cursorColor={AI.primary}
      selectionColor={`${AI.primary}40`}
    />
  );
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
  assignmentType: 'clipboard-outline',
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
    <GlassPanel style={styles.formCard} radius={AI_RADIUS.lg} tone="strong" elevated>
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

export default function StudentToolPage() {
  const { toolType, returnTab: returnTabRaw } = useLocalSearchParams<{
    toolType: string;
    returnTab?: string;
  }>();
  const [formParams, setFormParams] = useState<Record<string, any>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [rawGeneratedContent, setRawGeneratedContent] = useState<unknown>(null);
  const [responseMeta, setResponseMeta] = useState<AiToolGenerationMeta | null>(null);
  const [fallbackEmptyMessage, setFallbackEmptyMessage] = useState('');
  const [fromAiFailure, setFromAiFailure] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  /** Wait for the stack transition before heavy form/network work. */
  const [uiReady, setUiReady] = useState(false);
  const [availableNCERTTopics, setAvailableNCERTTopics] = useState<string[]>([]);
  const [schoolBoardName, setSchoolBoardName] = useState('CBSE');
  const [isAsliPrepExclusive, setIsAsliPrepExclusive] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<DropdownState | null>(null);
  const [copied, setCopied] = useState(false);
  const { isTablet, useSplitLayout, outputBleedStyle } = useAiToolTabletLayout();
  const { scrollRef, onOutputLayout, queueScrollToOutput, resetOutputScroll } =
    useAiToolOutputScroll(isTablet);

  const configKey = toolType ? resolveStudentToolConfigKey(toolType) : '';
  const config = configKey ? getStudentToolConfig(configKey) || getStudentToolConfig(toolType || '') : null;
  const boardOptions = getAiToolBoardOptions(isAsliPrepExclusive, schoolBoardName);
  const selectedBoard = formParams.board || getDefaultAiToolBoard(isAsliPrepExclusive, schoolBoardName);
  const effectiveConfig = useMemo(() => {
    if (!config) return config;
    // Batch (Alpha/Beta/Gamma) already covers IIT track — never show a second productCategory field.
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
  const apiToolType = toolType ? resolveStudentAiApiToolType(toolType) : '';
  const contentRenderKey = useMemo(
    () => buildAiToolContentRenderKey(toolType || '', generatedContent, responseMeta),
    [toolType, generatedContent, responseMeta]
  );
  const isReadingPractice =
    toolType === READING_PRACTICE_TOOL_ID || toolType === 'story-passage-creator';
  const accent = AI.primary;

  const isIitBoard = String(selectedBoard || '').toUpperCase().replace(/[\s/\\-]+/g, '').includes('IIT');

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

  const cascadeTopic = formParams.topic || formParams.chapter || '';
  const assignedGradeLevel = useMemo(
    () => resolveStudentCurriculumGradeLevel(user),
    [user]
  );

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

  const classSelectOptions = useMemo(() => {
    if (assignedGradeLevel) return [assignedGradeLevel];
    return cascade.classOptions.length > 0 ? cascade.classOptions : CLASS_OPTIONS;
  }, [assignedGradeLevel, cascade.classOptions]);

  const availableSubjects = useMemo(() => {
    if (!formParams.gradeLevel) return [];
    const raw = cascade.subjects;
    if (cascade.loadingSubjects && raw.length === 0) return [];
    if (raw.length === 0) return [];
    if (isIitAiToolBoard(selectedBoard)) {
      return filterSubjectsForIitBoard(raw);
    }
    return raw;
  }, [formParams.gradeLevel, cascade.subjects, cascade.loadingSubjects, selectedBoard]);

  const subjectsForTool = useMemo(
    () => filterSubjectsForAiTool(apiToolType, availableSubjects),
    [apiToolType, availableSubjects]
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
    const curriculum: StudentToolFieldConfig[] = [];
    const topic: StudentToolFieldConfig[] = [];
    const extra: StudentToolFieldConfig[] = [];
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

  const returnTab = parseStudentDashboardTab(
    typeof returnTabRaw === 'string' ? returnTabRaw : Array.isArray(returnTabRaw) ? returnTabRaw[0] : undefined,
  );
  const goBack = useStudentDashboardBack(returnTab);

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
    void fetchUser();
  }, [uiReady]);

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
  }, [isReadingPractice, apiToolType, formParams.subject]);

  useEffect(() => {
    if (!assignedGradeLevel) return;
    setFormParams((prev) => {
      if (prev.gradeLevel === assignedGradeLevel) return prev;
      return { ...prev, gradeLevel: assignedGradeLevel };
    });
  }, [assignedGradeLevel]);

  const fetchUser = async () => {
    try {
      const token = await storageGetItem('authToken');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData.user);
        const exclusive = resolveIsAsliPrepExclusive(userData.user);
        setIsAsliPrepExclusive(exclusive);
        const curriculumBoard = resolveCurriculumBoardForAiTools(userData.user);
        const defaultBoard = getDefaultAiToolBoard(exclusive, curriculumBoard);
        setSchoolBoardName(curriculumBoard);
        setFormParams((prev) => ({
          ...prev,
          board: prev.board || defaultBoard,
        }));

        const curriculumGrade = resolveStudentCurriculumGradeLevel(userData.user);
        const tracks = resolveSchoolIitCategories(userData.user);
        const batchLabel = BATCH_OPTIONS.find(
          (option) => option.toUpperCase() === String(tracks[0] || '').toUpperCase(),
        );
        if (curriculumGrade) {
          setFormParams((prev) => ({
            ...prev,
            gradeLevel: curriculumGrade,
            ...(batchLabel && !prev.batch ? { batch: batchLabel } : {}),
          }));
        } else if (batchLabel) {
          setFormParams((prev) => (prev.batch ? prev : { ...prev, batch: batchLabel }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
    } finally {
      setIsLoadingUser(false);
    }
  };

  const handleInputChange = (name: string, value: any) => {
    if (name === 'gradeLevel' && assignedGradeLevel) return;

    setFormParams((prev) => {
      const newParams = { ...prev, [name]: value };

      if (name === 'productCategory') {
        const next = value === 'NONE' ? '' : value;
        newParams.productCategory = next;
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
        if (assignedGradeLevel) {
          newParams.gradeLevel = assignedGradeLevel;
        }
      }

      return newParams;
    });
  };

  const getFieldOptions = useCallback(
    (field: StudentToolFieldConfig): string[] => {
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

      if (field.dependsOn && field.getOptions) {
        const parentValue = formParams[field.dependsOn];
        if (parentValue) return field.getOptions(parentValue);
      return [];
    }
    
    return [];
    },
    [formParams, subjectsForTool, cascade.subtopics, availableNCERTTopics]
  );

  const getFieldDisabledState = (field: StudentToolFieldConfig) => {
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

    const isClassFieldDisabled = field.name === 'gradeLevel' && !!assignedGradeLevel;
    return { isDisabled: isDisabled || isClassFieldDisabled, loading, isClassFieldDisabled };
  };

  const getPlaceholderHint = (
    field: StudentToolFieldConfig,
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
      const parent = config?.fields.find((f) => f.name === field.dependsOn);
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
    if (!config) return;

    // Load heavy generate/HTML helpers only when the user taps Generate.
    const {
      validateAiToolForm,
      executeStudentAiToolGenerate,
      fetchAiToolGeneratedContentFallback,
      storeAiToolSuccessPayload,
      isAiToolClientValidationError,
      isAiToolInlineOnlyError,
      resolveAiToolApiInlineMessage,
    } = await import('../../../src/lib/ai-tool-generate');

    const validationError = validateAiToolForm({
      config: effectiveConfig || config,
      formParams: { ...formParams, board: selectedBoard },
      toolType: apiToolType,
      isReadingPractice,
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

      const result = await executeStudentAiToolGenerate({
        apiBaseUrl: API_BASE_URL,
        token,
        apiToolType,
        formParams,
        selectedBoard,
        mapGradeLevel: mapGradeLevelForIitBoard,
      });

      if (!result.ok) {
        if (isAiToolInlineOnlyError(result.code)) {
          showInlineOutputMessage(
            resolveAiToolApiInlineMessage({ message: result.message, code: result.code }, config?.name),
          );
          return;
        }
        throw new Error(result.message || 'Content Fetch Failed');
      }

      const stored = storeAiToolSuccessPayload(apiToolType, result.content, result.rawContent, 'student');

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
        const mappedTopic =
          formParams.topic ||
          formParams.concept ||
          formParams.chapter ||
          formParams.projectTopic ||
          '';
        const token = await storageGetItem('authToken');
        if (!token) throw new Error('Please sign in again.');

        const fallbackResult = await fetchAiToolGeneratedContentFallback({
          apiBaseUrl: API_BASE_URL,
          token,
          classLabel: String(selectedClass),
          subject: String(selectedSubject),
          topic: String(mappedTopic),
          subTopic: resolveSubTopicForRequest(formParams.subTopic),
          toolType: apiToolType,
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

        const stored = storeAiToolSuccessPayload(apiToolType, fallbackResult.content, fallbackResult.rawContent, 'student');

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
          <AiToolFieldIcon name={icon} accent={accent} />
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
            <Ionicons name="chevron-down" size={16} color={disabled ? STUDENT.navInactive : accent} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderSelectField = (field: StudentToolFieldConfig) => {
    const { isDisabled, loading } = getFieldDisabledState(field);

    if (field.name === 'gradeLevel' && assignedGradeLevel) {
      return (
        <View key={field.name} style={[styles.fieldCard, styles.fieldCardDisabled]}>
          <View style={[styles.fieldIconChip, { backgroundColor: `${accent}14`, borderColor: `${accent}2e` }]}>
            <AiToolFieldIcon name="layers-outline" accent={accent} />
          </View>
          <View style={styles.fieldCardText}>
            <Text style={[styles.fieldCardLabel, isTablet && aiToolTabletPageStyles.fieldLabel]}>Class</Text>
            <Text style={[styles.fieldCardValue, isTablet && aiToolTabletPageStyles.lockedValue]} numberOfLines={1}>
              {assignedGradeLevel}
            </Text>
          </View>
          <View style={styles.lockedBadge}>
            <Ionicons name="lock-closed" size={12} color={STUDENT.textMuted} />
            <Text style={styles.lockedBadgeText}>Assigned</Text>
          </View>
        </View>
      );
    }

    let fieldOptions = getFieldOptions(field);
    if (field.name === 'gradeLevel') fieldOptions = classSelectOptions;
    else if (field.name === 'subject' && field.dependsOn === 'gradeLevel') fieldOptions = subjectsForTool;
    const rawValue = formParams[field.name] || '';
    const value =
      field.isCascadeSubtopic && !field.required && !rawValue
        ? WHOLE_CHAPTER_VALUE
        : rawValue;
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

  const renderField = (field: StudentToolFieldConfig) => {
    const value = formParams[field.name] || '';

    if (field.type === 'select') return renderSelectField(field);

    if (field.type === 'textarea') {
      return (
        <View key={field.name} style={styles.fieldInputCard}>
          <View style={styles.fieldInputHeader}>
            <View style={[styles.fieldIconChipSm, { backgroundColor: `${accent}14`, borderColor: `${accent}2e` }]}>
              <AiToolFieldIcon name={FIELD_ICONS[field.name] || 'create-outline'} accent={accent} />
            </View>
            <Text style={[styles.fieldCardLabel, isTablet && aiToolTabletPageStyles.fieldLabel]}>
              {formatAiToolText(field.label.replace(' *', ''))}
              {field.required ? <Text style={styles.required}> *</Text> : null}
            </Text>
          </View>
          <DeferredToolTextInput
            style={[styles.textArea, styles.textInput, isTablet && aiToolTabletPageStyles.textInput]}
            placeholder={field.placeholder}
            value={value}
            onCommit={(text) => handleInputChange(field.name, text)}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            placeholderTextColor={STUDENT.navInactive}
          />
        </View>
      );
    }

    return (
      <View key={field.name} style={styles.fieldInputCard}>
        <View style={styles.fieldInputHeader}>
          <View style={[styles.fieldIconChipSm, { backgroundColor: `${accent}14`, borderColor: `${accent}2e` }]}>
            <AiToolFieldIcon name={FIELD_ICONS[field.name] || 'options-outline'} accent={accent} />
          </View>
          <Text style={[styles.fieldCardLabel, isTablet && aiToolTabletPageStyles.fieldLabel]}>
            {formatAiToolText(field.label.replace(' *', ''))}
            {field.required ? <Text style={styles.required}> *</Text> : null}
          </Text>
        </View>
        <DeferredToolTextInput
          style={[styles.textInput, isTablet && aiToolTabletPageStyles.textInput]}
          placeholder={field.placeholder}
          value={value}
          onCommit={(text) => handleInputChange(field.name, text)}
          keyboardType={field.type === 'number' ? 'numeric' : 'default'}
          placeholderTextColor={STUDENT.navInactive}
        />
      </View>
    );
  };

  if (!config) {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar style="dark" />
        <StudentScreenHeader title="Tool Not Found" onBack={goBack} />
        <View style={styles.errorContainer}>
          <View style={styles.errorIconWrap}>
            <Ionicons name="alert-circle-outline" size={48} color={STUDENT.danger} />
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

  const parameterTitle = 'Choose What To Generate';
  const pageBgStyle = styles.container;

  const chapterValue = String(formParams.topic || formParams.chapter || '');
  const classLocked = !!assignedGradeLevel;
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
      value: String(formParams.gradeLevel || assignedGradeLevel || ''),
      disabled: classLocked || (cascade.loadingClasses && classSelectOptions.length === 0),
      onPress: () =>
        openDropdown(
          'gradeLevel',
          'Class',
          mergeSelectedIntoOptions(classSelectOptions, formParams.gradeLevel),
          String(formParams.gradeLevel || ''),
          classLocked || (cascade.loadingClasses && classSelectOptions.length === 0),
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
          <FormSection
            title={parameterTitle}
            subtitle="Start With Your Board And Class Details"
            accent={accent}
            icon="sparkles"
            tabletUi={isTablet}
          >
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
              title="Topic Details"
              subtitle="Pick Chapter And Sub-Topic From Syllabus"
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
        toolType={apiToolType || toolType}
        toolName={config?.name || 'AI Tool'}
        toolDescription={config?.description}
        accent={accent}
        variant="student"
        fill={fill}
        meta={{
          board: selectedBoard || formParams.board || '',
          classLabel: String(formParams.gradeLevel || assignedGradeLevel || ''),
          subject: String(formParams.subject || formParams.subjects || ''),
          chapter: String(formParams.topic || formParams.chapter || formParams.concept || ''),
          subtopic: String(formParams.subTopic || ''),
        }}
        isLoading={isGenerating}
        citations={
          generatedContent &&
          Array.isArray(responseMeta?.citations) &&
          responseMeta.citations.length > 0 ? (
            <View style={styles.citationsBox}>
              <Text style={styles.citationsTitle}>Top Citations</Text>
              {responseMeta.citations.slice(0, 3).map((c) => (
                <Text key={`${c.index}-${c.chapter}`} style={styles.citationLine}>
                  [{c.index}] {c.subject} / {c.chapter} ({c.score})
                </Text>
              ))}
            </View>
          ) : null
        }
        actions={
          generatedContent ? (
            <View style={styles.resultActions}>
              <Pressable
                style={styles.actionBtn}
                accessibilityRole="button"
                accessibilityLabel={copied ? 'Content copied' : 'Copy generated content'}
                onPress={async () => {
                  await Clipboard.setStringAsync(generatedContent);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1800);
                }}
              >
                <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color={AI.textSecondary} />
                <Text style={styles.actionBtnText}>{copied ? 'Copied' : 'Copy'}</Text>
              </Pressable>
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
          ) : null
        }
        empty={
          <View style={styles.emptyResult}>
            <AiToolPremiumIcon
              name={
                fallbackEmptyMessage
                  ? 'alert-circle'
                  : getAiToolIonicon(toolType || '')
              }
              color={fallbackEmptyMessage ? STUDENT.danger : accent}
              size={64}
              iconSize={28}
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
        }
      >
        {generatedContent ? (
          <View style={[styles.outputWrap, fill && styles.outputWrapFill]} collapsable={false}>
            <AiToolContentRenderer
              key={contentRenderKey}
              toolType={apiToolType}
              content={generatedContent}
              rawContent={rawGeneratedContent}
              accent={accent}
              variant="student"
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
            <ActivityIndicator size="small" color={STUDENT.textOnPrimary} />
            <Text style={[styles.generateBtnText, isTablet && aiToolTabletPageStyles.generateBtnText]}>
              Generating...
            </Text>
          </>
        ) : (
          <>
            <AiGenerateIcon size={isTablet ? 22 : 20} color={STUDENT.textOnPrimary} />
            <Text style={[styles.generateBtnText, isTablet && aiToolTabletPageStyles.generateBtnText]}>
              Generate With AI
            </Text>
          </>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={pageBgStyle} edges={['top', 'bottom']}>
      <StatusBar style="light" />

      <StudentScreenHeader
        title={formatAiToolText(config.name)}
        subtitle={formatAiToolText(config.description)}
        onBack={goBack}
        tabletUi={isTablet}
        variant="ai"
        icon={getAiToolIonicon(toolType || '')}
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
  // Transparent so the app background artwork shows through.
  container: { flex: 1, backgroundColor: 'transparent' },
  containerPremium: { flex: 1, backgroundColor: 'transparent' },
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
  resultActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: AI_SPACING.sm,
  },
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
  actionBtnText: {
    ...AI_TYPE.caption,
    color: AI.textSecondary,
  },
  actionBtnPrimary: { borderColor: AI.primary, backgroundColor: AI.primary },
  actionBtnPrimaryText: { ...AI_TYPE.caption, color: '#FFFFFF' },
  citationsBox: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_ROW.border,
    backgroundColor: GLASS_ROW.fillSoft,
    padding: 8,
    maxHeight: 96,
  },
  citationsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1d4ed8',
    marginBottom: 4,
  },
  citationLine: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 16,
  },
  generatingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 42,
    paddingHorizontal: STUDENT_SPACING.xl,
    gap: 8,
  },
  generatingTitle: { fontSize: 16, fontWeight: '800', color: STUDENT.text },
  generatingText: { fontSize: 13, color: STUDENT.textMuted, textAlign: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: AI_SPACING.lg, gap: AI_SPACING.md },
  formCard: {
    overflow: 'hidden',
    borderRadius: AI_RADIUS.lg,
    borderWidth: 1,
    borderColor: AI.border,
    ...AI_SHADOW,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: STUDENT_SPACING.md,
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
  sectionBody: { padding: AI_SPACING.lg, gap: STUDENT_SPACING.md },
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
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: STUDENT.surfaceBorder,
    paddingHorizontal: STUDENT_SPACING.sm,
    paddingVertical: 4,
    borderRadius: STUDENT_RADIUS.sm,
  },
  lockedBadgeText: { ...STUDENT_TYPO.label, color: STUDENT.textMuted },
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
  fieldInputHeader: { flexDirection: 'row', alignItems: 'center', gap: STUDENT_SPACING.sm },
  textInput: {
    minHeight: 48,
    borderRadius: AI_RADIUS.sm,
    borderWidth: 1.5,
    borderColor: AI.primaryBorder,
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
    gap: STUDENT_SPACING.sm,
    backgroundColor: STUDENT.accentSoft,
    borderRadius: STUDENT_RADIUS.md,
    padding: STUDENT_SPACING.md,
    borderWidth: 1,
    borderColor: STUDENT.surfaceBorder,
  },
  infoBannerText: { flex: 1, ...STUDENT_TYPO.caption, color: STUDENT.accent, lineHeight: 18 },
  infoBannerWarning: {
    backgroundColor: 'rgba(255,251,235,0.55)',
    borderColor: '#fcd34d',
  },
  infoBannerWarningText: { color: '#92400e' },
  emptyResult: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: STUDENT_SPACING.xxl,
  },
  emptyResultIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  emptyResultTitle: {
    marginTop: STUDENT_SPACING.md,
    ...STUDENT_TYPO.body,
    fontWeight: '700',
    color: STUDENT.textMuted,
    textAlign: 'center',
  },
  emptyResultTitleError: { color: '#b91c1c' },
  emptyResultText: { marginTop: 4, ...STUDENT_TYPO.caption, color: STUDENT.navInactive, textAlign: 'center' },
  footer: {
    paddingHorizontal: STUDENT_SPACING.lg,
    paddingTop: 10,
    paddingBottom: STUDENT_SPACING.md,
    // Transparent so the app background artwork shows through.
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
    gap: STUDENT_SPACING.sm,
    minHeight: 58,
    paddingVertical: AI_SPACING.md,
  },
  generateBtnText: { fontSize: 17, lineHeight: 22, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.2 },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: STUDENT_SPACING.xxxl },
  errorIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: STUDENT.bgAccent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: STUDENT_SPACING.lg,
  },
  errorTitle: { ...STUDENT_TYPO.section, fontSize: 20, color: STUDENT.text },
  errorSubtitle: { ...STUDENT_TYPO.caption, color: STUDENT.textMuted, marginTop: STUDENT_SPACING.sm, textAlign: 'center' },
  errorButton: {
    marginTop: STUDENT_SPACING.xxl,
    backgroundColor: STUDENT.accent,
    paddingHorizontal: STUDENT_SPACING.xxl,
    paddingVertical: STUDENT_SPACING.md,
    borderRadius: STUDENT_RADIUS.md,
  },
  errorButtonText: { color: STUDENT.textOnPrimary, ...STUDENT_TYPO.body, fontWeight: '700' },
});
