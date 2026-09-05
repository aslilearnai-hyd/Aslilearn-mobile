import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import teacherService from '../../../src/services/api/teacherService';
import { GlassPanel } from '../../../src/components/ui';
import { resolveAnswerTexts } from '../../../src/lib/exam-analysis-helpers';
import { TEACHER, TEACHER_RADIUS, TEACHER_SPACING, TEACHER_TYPO, glassCard } from '../../../src/theme/teacher';

type StudentRef = { id: string; name: string };

type QuestionStat = {
  questionNumber: number;
  index: number;
  questionId: string;
  questionText: string;
  assertionText?: string;
  reasonText?: string;
  subject?: string;
  chapter?: string;
  questionType?: string;
  options?: string[];
  correctAnswer?: unknown;
  totalStudents: number;
  correct: number;
  wrong: number;
  unattempted: number;
  classCorrectPct: number;
  studentsCorrect?: StudentRef[];
  studentsWrong?: StudentRef[];
  studentsUnattempted?: StudentRef[];
};

type StudentReport = {
  studentId: string;
  name: string;
  attempted: boolean;
  percentage: number | null;
  correctAnswers: number;
  wrongAnswers: number;
  unattempted: number;
  questionBreakdown: Array<{
    questionNumber: number;
    questionText: string;
    subject?: string;
    status: 'correct' | 'wrong' | 'not_answered';
  }>;
};

type AnalyticsPayload = {
  examId: string;
  examTitle: string;
  totalQuestions: number;
  totalStudents: number;
  studentsAttempted: number;
  questions: QuestionStat[];
  studentReports?: StudentReport[];
};

type ExamListItem = {
  _id: string;
  title: string;
  studentsAttempted?: number;
};

type Props = {
  classNumber?: string;
};

function qKey(q: QuestionStat) {
  return `${q.questionId}-${q.index}`;
}

const LIST_PREVIEW = 3;
const REPORT_PREVIEW = 5;

function optionLetter(i: number) {
  return String.fromCharCode(65 + i);
}

function StudentLists({ question }: { question: QuestionStat }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const groups = [
    {
      title: 'Attempted & Correct',
      color: TEACHER.success,
      bg: '#ECFDF5',
      students: question.studentsCorrect || [],
      icon: 'checkmark-circle' as const,
    },
    {
      title: 'Attempted But Wrong',
      color: TEACHER.danger,
      bg: '#FEF2F2',
      students: question.studentsWrong || [],
      icon: 'close-circle' as const,
    },
    {
      title: 'Unattempted',
      color: TEACHER.textMuted,
      bg: '#F8FAFC',
      students: question.studentsUnattempted || [],
      icon: 'ellipse-outline' as const,
    },
  ];

  return (
    <View style={styles.listsWrap}>
      {groups.map((g) => {
        const extra = Math.max(0, g.students.length - LIST_PREVIEW);
        const open = Boolean(expanded[g.title]);
        const shown = open || extra === 0 ? g.students : g.students.slice(0, LIST_PREVIEW);
        return (
          <View key={g.title} style={[styles.listCard, { backgroundColor: g.bg, borderColor: `${g.color}33` }]}>
            <View style={styles.listHead}>
              <Ionicons name={g.icon} size={14} color={g.color} />
              <Text style={[styles.listTitle, { color: g.color }]} numberOfLines={1}>
                {g.title}
              </Text>
              <Text style={[styles.listCount, { color: g.color }]}>({g.students.length})</Text>
            </View>
            {g.students.length === 0 ? (
              <Text style={styles.listEmpty}>None</Text>
            ) : (
              <>
                {shown.map((s) => (
                  <Text key={s.id} style={styles.listName} numberOfLines={1}>
                    {s.name}
                  </Text>
                ))}
                {extra > 0 ? (
                  <Pressable
                    onPress={() => setExpanded((prev) => ({ ...prev, [g.title]: !open }))}
                    accessibilityRole="button"
                    accessibilityLabel={open ? 'Show fewer students' : `Show ${extra} more students`}
                    hitSlop={6}
                    style={styles.moreBtn}
                  >
                    <Text style={[styles.moreBtnText, { color: g.color }]}>
                      {open ? 'Show less' : `+${extra} more`}
                    </Text>
                  </Pressable>
                ) : null}
              </>
            )}
          </View>
        );
      })}
    </View>
  );
}

function QuestionCard({
  question,
  revealAnswers,
  selected,
  onSelect,
}: {
  question: QuestionStat;
  revealAnswers: boolean;
  selected: string | null;
  onSelect: (opt: string) => void;
}) {
  const options = Array.isArray(question.options) ? question.options.filter(Boolean) : [];
  const correctTexts = resolveAnswerTexts(
    { questionType: question.questionType, options: question.options },
    question.correctAnswer,
  );
  const correctDisplay = correctTexts.length ? correctTexts.join(', ') : String(question.correctAnswer || '—');
  const showResult = revealAnswers || Boolean(selected);

  return (
    <View style={styles.qCard}>
      <View style={styles.qHead}>
        <View style={styles.qBadge}>
          <Text style={styles.qBadgeText}>Q{question.questionNumber}</Text>
        </View>
        {question.subject ? <Text style={styles.qSubject}>{question.subject}</Text> : null}
        <Text style={styles.qPct}>{question.classCorrectPct}% Class</Text>
      </View>
      <Text style={styles.qText}>{question.questionText || `Question ${question.questionNumber}`}</Text>

      {options.map((opt, index) => {
        const isSelected = selected === opt;
        const isRight = correctTexts.some(
          (t) => t.trim().toLowerCase() === opt.trim().toLowerCase(),
        );
        let borderColor = '#E2E8F0';
        let bg = '#F8FAFC';
        let textColor = TEACHER.text;
        if (showResult && isRight) {
          borderColor = '#34D399';
          bg = '#ECFDF5';
          textColor = '#065F46';
        } else if (showResult && isSelected && !isRight) {
          borderColor = '#F87171';
          bg = '#FEF2F2';
          textColor = '#991B1B';
        } else if (isSelected) {
          borderColor = TEACHER.primary;
          bg = '#EEF2FF';
        }

        return (
          <Pressable
            key={`${qKey(question)}-${index}`}
            onPress={() => onSelect(opt)}
            style={[styles.optBtn, { borderColor, backgroundColor: bg }]}
          >
            <Text style={styles.optLetter}>{optionLetter(index)}.</Text>
            <Text style={[styles.optText, { color: textColor }]}>{opt}</Text>
            {showResult && isRight ? <Ionicons name="checkmark-circle" size={18} color="#059669" /> : null}
            {showResult && isSelected && !isRight ? (
              <Ionicons name="close-circle" size={18} color="#DC2626" />
            ) : null}
          </Pressable>
        );
      })}

      {(showResult || options.length === 0) && (
        <View style={styles.answerRow}>
          <View style={[styles.answerBox, { backgroundColor: '#EEF2FF' }]}>
            <Text style={styles.answerLbl}>Your Pick</Text>
            <Text style={styles.answerVal}>{selected || 'Not Selected'}</Text>
          </View>
          <View style={[styles.answerBox, { backgroundColor: '#ECFDF5' }]}>
            <Text style={styles.answerLbl}>Correct</Text>
            <Text style={styles.answerVal}>{correctDisplay}</Text>
          </View>
        </View>
      )}

      <StudentLists question={question} />
    </View>
  );
}

export default function TeacherExamPaperReview({ classNumber = 'all' }: Props) {
  const [exams, setExams] = useState<ExamListItem[]>([]);
  const [examId, setExamId] = useState('');
  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null);
  const [loadingExams, setLoadingExams] = useState(false);
  const [loadingPaper, setLoadingPaper] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [discussOpen, setDiscussOpen] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);
  const [discussIndex, setDiscussIndex] = useState(0);
  const [selectedByQ, setSelectedByQ] = useState<Record<string, string>>({});
  const [report, setReport] = useState<StudentReport | null>(null);
  const [showAllReports, setShowAllReports] = useState(false);

  const loadExams = useCallback(async () => {
    setLoadingExams(true);
    setError(null);
    try {
      const json = await teacherService.exams(classNumber);
      const list: ExamListItem[] = Array.isArray(json?.data?.exams)
        ? json.data.exams
        : Array.isArray(json?.exams)
          ? json.exams
          : [];
      setExams(list);
      setExamId((prev) => {
        if (prev && list.some((e) => e._id === prev)) return prev;
        const withAttempts = list.find((e) => (e.studentsAttempted || 0) > 0);
        return withAttempts?._id || list[0]?._id || '';
      });
    } catch (e) {
      setExams([]);
      setError(e instanceof Error ? e.message : 'Could not load exams');
    } finally {
      setLoadingExams(false);
    }
  }, [classNumber]);

  const loadPaper = useCallback(
    async (id: string) => {
      if (!id) {
        setAnalytics(null);
        return;
      }
      setLoadingPaper(true);
      setError(null);
      try {
        const json = await teacherService.examQuestionAnalytics(id, classNumber);
        const data = (json?.data || json) as AnalyticsPayload;
        setAnalytics(data);
        setSelectedByQ({});
        setShowAnswers(false);
        setDiscussIndex(0);
        setShowAllReports(false);
      } catch (e) {
        setAnalytics(null);
        setError(e instanceof Error ? e.message : 'Could not load paper');
      } finally {
        setLoadingPaper(false);
      }
    },
    [classNumber],
  );

  useEffect(() => {
    loadExams();
  }, [loadExams]);

  useEffect(() => {
    if (examId) loadPaper(examId);
  }, [examId, loadPaper]);

  const questions = analytics?.questions || [];
  const studentReports = analytics?.studentReports || [];
  const selectedExamTitle = useMemo(
    () => exams.find((e) => e._id === examId)?.title || analytics?.examTitle || 'Select Exam',
    [exams, examId, analytics?.examTitle],
  );

  const selectOpt = (key: string, opt: string) => {
    setSelectedByQ((prev) => ({ ...prev, [key]: opt }));
  };

  const renderStudentSheet = () => {
    const extra = Math.max(0, studentReports.length - REPORT_PREVIEW);
    const shown =
      showAllReports || extra === 0 ? studentReports : studentReports.slice(0, REPORT_PREVIEW);
    return (
      <View style={styles.reportsBlock}>
        <Text style={styles.sectionTitle}>Individual Student Reports</Text>
        {shown.map((s) => (
          <Pressable key={s.studentId} style={styles.reportRow} onPress={() => setReport(s)}>
            <Ionicons name="person-circle-outline" size={22} color={TEACHER.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.reportName}>{s.name}</Text>
              <Text style={styles.reportMeta}>
                {s.attempted
                  ? `${s.percentage != null ? Number(s.percentage).toFixed(1) : '—'}% · ${s.correctAnswers}✓ ${s.wrongAnswers}✗`
                  : 'Not Attempted'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={TEACHER.textMuted} />
          </Pressable>
        ))}
        {extra > 0 ? (
          <Pressable
            onPress={() => setShowAllReports((open) => !open)}
            accessibilityRole="button"
            accessibilityLabel={
              showAllReports ? 'Show fewer student reports' : `Show ${extra} more student reports`
            }
            style={styles.moreRow}
          >
            <Text style={styles.moreRowText}>
              {showAllReports ? 'Show less' : `+${extra} more`}
            </Text>
          </Pressable>
        ) : null}
      </View>
    );
  };

  return (
    <GlassPanel style={styles.root} radius={TEACHER_RADIUS.lg} tone="strong">
      <View style={styles.headerRow}>
        <Ionicons name="document-text" size={20} color={TEACHER.primary} />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Exam Paper Review</Text>
          <Text style={styles.sub}>Discuss Paper Full-Screen Or Show Answers Inline</Text>
        </View>
        <Pressable
          onPress={() => {
            loadExams();
            if (examId) loadPaper(examId);
          }}
          hitSlop={8}
        >
          <Ionicons name="refresh" size={18} color={TEACHER.primary} />
        </Pressable>
      </View>

      <Pressable style={styles.picker} onPress={() => setPickerOpen(true)}>
        <Text style={styles.pickerText} numberOfLines={1}>
          {loadingExams ? 'Loading Exams…' : selectedExamTitle}
        </Text>
        <Ionicons name="chevron-down" size={16} color={TEACHER.textMuted} />
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loadingPaper ? (
        <ActivityIndicator color={TEACHER.primary} style={{ marginVertical: 20 }} />
      ) : !questions.length ? (
        <Text style={styles.empty}>No question data yet for this paper.</Text>
      ) : (
        <>
          <View style={styles.controlStack}>
            {analytics ? (
              <Text style={styles.metaLine}>
                {analytics.studentsAttempted}/{analytics.totalStudents} Attempted · {analytics.totalQuestions}{' '}
                Questions
              </Text>
            ) : null}

            <View style={styles.actions}>
              <Pressable
                style={[styles.actionBtn, styles.actionPrimary]}
                onPress={() => {
                  setDiscussIndex(0);
                  setDiscussOpen(true);
                }}
              >
                <Ionicons name="easel-outline" size={16} color="#fff" />
                <Text style={styles.actionPrimaryText}>Discuss Paper</Text>
              </Pressable>
              <Pressable
                style={[styles.actionBtn, showAnswers ? styles.actionActive : styles.actionOutline]}
                onPress={() => setShowAnswers((v) => !v)}
              >
                <Ionicons
                  name="eye-outline"
                  size={16}
                  color={showAnswers ? '#fff' : TEACHER.primary}
                />
                <Text style={showAnswers ? styles.actionPrimaryText : styles.actionOutlineText}>
                  {showAnswers ? 'Hide Answers' : 'Show Answers'}
                </Text>
              </Pressable>
            </View>

            {showAnswers ? (
              <View style={{ gap: 12 }}>
                {questions.map((q) => (
                  <QuestionCard
                    key={qKey(q)}
                    question={q}
                    revealAnswers
                    selected={selectedByQ[qKey(q)] || null}
                    onSelect={(opt) => selectOpt(qKey(q), opt)}
                  />
                ))}
              </View>
            ) : (
              <Text style={styles.hint}>
                Tap Discuss paper for a full-page walkthrough, or Show answers to review every question here.
              </Text>
            )}
          </View>

          {renderStudentSheet()}
        </>
      )}

      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setPickerOpen(false)}>
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerSheetTitle}>Select Exam</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {exams.map((e) => (
                <Pressable
                  key={e._id}
                  style={styles.pickerItem}
                  onPress={() => {
                    setExamId(e._id);
                    setPickerOpen(false);
                  }}
                >
                  <Text style={styles.pickerItemText}>{e.title}</Text>
                  <Text style={styles.pickerItemMeta}>
                    {(e.studentsAttempted || 0) > 0
                      ? `${e.studentsAttempted} Attempted`
                      : 'No Attempts Yet'}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={discussOpen} animationType="slide" onRequestClose={() => setDiscussOpen(false)}>
        <View style={styles.discussRoot}>
          <View style={styles.discussHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.discussEyebrow}>Discuss paper</Text>
              <Text style={styles.discussTitle} numberOfLines={1}>
                {analytics?.examTitle}
              </Text>
            </View>
            <Pressable onPress={() => setDiscussOpen(false)} style={styles.closeChip}>
              <Ionicons name="close" size={18} color={TEACHER.text} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.discussBody} showsVerticalScrollIndicator={false}>
            {questions[discussIndex] ? (
              <QuestionCard
                question={questions[discussIndex]}
                revealAnswers={false}
                selected={selectedByQ[qKey(questions[discussIndex])] || null}
                onSelect={(opt) => selectOpt(qKey(questions[discussIndex]), opt)}
              />
            ) : null}
            {renderStudentSheet()}
          </ScrollView>

          <View style={styles.discussFooter}>
            <Pressable
              style={[styles.navBtn, discussIndex <= 0 && styles.navDisabled]}
              disabled={discussIndex <= 0}
              onPress={() => setDiscussIndex((i) => Math.max(0, i - 1))}
            >
              <Ionicons name="chevron-back" size={18} color={TEACHER.primary} />
              <Text style={styles.navText}>Prev</Text>
            </Pressable>
            <Text style={styles.navCounter}>
              Q{discussIndex + 1}/{questions.length}
            </Text>
            <Pressable
              style={[styles.navBtn, discussIndex >= questions.length - 1 && styles.navDisabled]}
              disabled={discussIndex >= questions.length - 1}
              onPress={() => setDiscussIndex((i) => Math.min(questions.length - 1, i + 1))}
            >
              <Text style={styles.navText}>Next</Text>
              <Ionicons name="chevron-forward" size={18} color={TEACHER.primary} />
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={!!report} transparent animationType="slide" onRequestClose={() => setReport(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.reportModal}>
            <View style={styles.discussHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.discussTitle}>{report?.name}</Text>
                <Text style={styles.sub}>
                  {report?.attempted
                    ? `${report.percentage != null ? Number(report.percentage).toFixed(1) : '—'}% · ${report.correctAnswers} correct · ${report.wrongAnswers} wrong`
                    : 'Did Not Attempt'}
                </Text>
              </View>
              <Pressable onPress={() => setReport(null)} style={styles.closeChip}>
                <Ionicons name="close" size={18} color={TEACHER.text} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
              {(report?.questionBreakdown || []).map((row, i) => {
                const color =
                  row.status === 'correct'
                    ? '#059669'
                    : row.status === 'wrong'
                      ? '#DC2626'
                      : TEACHER.textMuted;
                const bg =
                  row.status === 'correct'
                    ? '#ECFDF5'
                    : row.status === 'wrong'
                      ? '#FEF2F2'
                      : '#F8FAFC';
                return (
                  <View key={`${row.questionNumber}-${i}`} style={[styles.breakdownRow, { backgroundColor: bg }]}>
                    <Text style={[styles.breakdownStatus, { color }]}>
                      Q{row.questionNumber} ·{' '}
                      {row.status === 'correct' ? 'Correct' : row.status === 'wrong' ? 'Wrong' : 'Unattempted'}
                    </Text>
                    <Text style={styles.breakdownText}>{row.questionText}</Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </GlassPanel>
  );
}

const styles = StyleSheet.create({
  root: {
    ...glassCard,
    backgroundColor: 'transparent',
    padding: 14,
    gap: 16,
    marginBottom: 4,
  },
  controlStack: {
    gap: 16,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { ...TEACHER_TYPO.subtitle, color: TEACHER.text, fontWeight: '700' },
  sub: { ...TEACHER_TYPO.caption, color: TEACHER.textMuted, marginTop: 2 },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  pickerText: { flex: 1, color: TEACHER.text, fontSize: 14, fontWeight: '600' },
  error: { color: TEACHER.danger, fontSize: 13 },
  empty: { color: TEACHER.textMuted, fontSize: 13, textAlign: 'center', paddingVertical: 16 },
  metaLine: { fontSize: 12, color: TEACHER.textMuted },
  actions: { flexDirection: 'row', alignItems: 'stretch', gap: 10 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 12,
    minHeight: 44,
  },
  actionPrimary: { backgroundColor: TEACHER.primary },
  actionActive: { backgroundColor: '#7C3AED' },
  actionOutline: { backgroundColor: '#fff', borderWidth: 1, borderColor: TEACHER.primary },
  actionPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  actionOutlineText: { color: TEACHER.primary, fontWeight: '700', fontSize: 13 },
  hint: {
    fontSize: 13,
    color: TEACHER.primary,
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 12,
    lineHeight: 18,
  },
  qCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 12,
    backgroundColor: '#fff',
    gap: 8,
  },
  qHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qBadge: {
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  qBadgeText: { color: TEACHER.primary, fontWeight: '800', fontSize: 12 },
  qSubject: { fontSize: 11, color: TEACHER.textMuted, textTransform: 'capitalize', flex: 1 },
  qPct: { fontSize: 11, color: TEACHER.textMuted, fontWeight: '600' },
  qText: { fontSize: 15, color: TEACHER.text, lineHeight: 22, fontWeight: '500' },
  optBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  optLetter: { fontSize: 12, fontWeight: '700', color: TEACHER.textMuted, width: 18 },
  optText: { flex: 1, fontSize: 14 },
  answerRow: { flexDirection: 'row', gap: 8 },
  answerBox: { flex: 1, borderRadius: 10, padding: 8 },
  answerLbl: { fontSize: 11, fontWeight: '700', color: TEACHER.textMuted, marginBottom: 2 },
  answerVal: { fontSize: 12, color: TEACHER.text, fontWeight: '600' },
  listsWrap: { gap: 8, marginTop: 4 },
  listCard: { borderWidth: 1, borderRadius: 12, padding: 8 },
  listHead: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  listTitle: { flex: 1, fontSize: 11, fontWeight: '700' },
  listCount: { fontSize: 11, fontWeight: '600' },
  listEmpty: { fontSize: 11, color: TEACHER.textMuted },
  listName: { fontSize: 12, color: TEACHER.text, marginTop: 2 },
  moreBtn: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingVertical: 2,
  },
  moreBtnText: { fontSize: 12, fontWeight: '800' },
  reportsBlock: { marginTop: 8, gap: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: TEACHER.text },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 10,
    backgroundColor: '#fff',
  },
  reportName: { fontSize: 14, fontWeight: '700', color: TEACHER.text },
  reportMeta: { fontSize: 11, color: TEACHER.textMuted, marginTop: 2 },
  moreRow: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    backgroundColor: '#EEF2FF',
  },
  moreRowText: { fontSize: 13, fontWeight: '800', color: TEACHER.primary },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '70%',
  },
  pickerSheetTitle: { fontSize: 16, fontWeight: '800', marginBottom: 10, color: TEACHER.text },
  pickerItem: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  pickerItemText: { fontSize: 14, fontWeight: '600', color: TEACHER.text },
  pickerItemMeta: { fontSize: 11, color: TEACHER.textMuted, marginTop: 2 },
  discussRoot: { flex: 1, backgroundColor: '#F7F8FC' },
  discussHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  discussEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: TEACHER.primary,
    textTransform: 'uppercase',
  },
  discussTitle: { fontSize: 16, fontWeight: '800', color: TEACHER.text },
  closeChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  discussBody: { padding: TEACHER_SPACING.lg, gap: 12, paddingBottom: 40 },
  discussFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 28,
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
  },
  navDisabled: { opacity: 0.4 },
  navText: { color: TEACHER.primary, fontWeight: '700', fontSize: 13 },
  navCounter: { fontSize: 13, fontWeight: '700', color: TEACHER.textMuted },
  reportModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    minHeight: '55%',
  },
  breakdownRow: { borderRadius: 12, padding: 10 },
  breakdownStatus: { fontSize: 12, fontWeight: '800', marginBottom: 4 },
  breakdownText: { fontSize: 13, color: TEACHER.text, lineHeight: 18 },
});
