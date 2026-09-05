import { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { STUDENT, STUDENT_RADIUS, STUDENT_SPACING, STUDENT_TYPO } from '../../theme/student';

type InstructionsQuestion = {
  questionType?: string;
  marks?: number;
  subject?: string;
};

export type ExamInstructionsExam = {
  _id: string;
  title: string;
  description?: string;
  examType?: string;
  duration?: number;
  totalQuestions?: number;
  totalMarks?: number;
  instructions?: string;
  classNumber?: string | number;
  negativeMarking?: boolean;
  questions?: InstructionsQuestion[];
};

const QUESTION_TYPE_LABELS: Record<string, string> = {
  mcq: 'Multiple Choice (single answer)',
  multiple: 'Multiple Choice (multiple answers)',
  integer: 'Integer / Numerical answer',
  assertion_reason: 'Assertion & Reason',
  match_following: 'Match the Following',
};

function labelForType(type: string) {
  return QUESTION_TYPE_LABELS[type] || 'Multiple Choice';
}

const DEFAULT_RULES = [
  'Answer all questions to the best of your ability.',
  'You can review and change answers anytime before submitting.',
  'Use All questions to jump between questions.',
  'Mark any question for review if you want to revisit it later.',
  'Your answers are saved automatically as you go.',
  'Leaving the exam repeatedly will auto-submit.',
  'Once submitted, you cannot change your answers.',
];

export default function ExamInstructionsScreen({
  exam,
  questionCount,
  onStart,
  onBack,
  isStarting,
}: {
  exam: ExamInstructionsExam;
  questionCount: number;
  onStart: () => void;
  onBack: () => void;
  isStarting?: boolean;
}) {
  const typeBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    (exam.questions || []).forEach((q) => {
      const type = String(q.questionType || 'mcq').toLowerCase();
      counts.set(type, (counts.get(type) || 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({ type, count, label: labelForType(type) }));
  }, [exam.questions]);

  const totalMarks =
    exam.totalMarks ||
    (exam.questions || []).reduce((sum, q) => sum + (Number(q.marks) || 0), 0) ||
    0;

  const customInstructions = (exam.instructions || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const overview = [
    { label: 'Total Questions', value: String(questionCount), icon: 'document-text-outline' as const, bg: '#ede9fe', fg: '#6d28d9' },
    { label: 'Total Marks', value: totalMarks ? String(totalMarks) : '—', icon: 'ribbon-outline' as const, bg: '#e0f2fe', fg: '#0369a1' },
    { label: 'Duration', value: exam.duration ? `${exam.duration} min` : '—', icon: 'time-outline' as const, bg: '#d1fae5', fg: '#047857' },
    { label: 'Negative Marking', value: exam.negativeMarking ? 'Yes' : 'No', icon: 'alert-circle-outline' as const, bg: '#ffedd5', fg: '#c2410c' },
  ];

  const examBadge = exam.examType
    ? String(exam.examType).toUpperCase()
    : exam.classNumber
      ? `CLASS ${exam.classNumber}`
      : 'EXAM';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={[...STUDENT.heroGradient]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroTopRow}>
            <View style={styles.heroIcon}>
              <Ionicons name="document-text" size={20} color="#fff" />
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.heroEyebrow}>Before you begin</Text>
              <Text style={styles.heroTitle}>{exam.title}</Text>
              <Text style={styles.heroBadge}>{examBadge}</Text>
              <Text style={styles.heroWelcome}>
                {exam.description
                  ? exam.description
                  : exam.classNumber
                    ? `Class ${exam.classNumber} · Read the instructions, then tap Start Exam`
                    : 'Read the instructions, then tap Start Exam'}
              </Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <View style={styles.summaryIcon}>
              <Ionicons name="clipboard" size={20} color={STUDENT.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryTitle}>Exam overview</Text>
              <Text style={styles.summarySubtitle}>Questions, marks, time and marking</Text>
            </View>
          </View>
          <View style={styles.overviewGrid}>
            {overview.map((item) => (
              <View key={item.label} style={styles.overviewCard}>
                <View style={[styles.overviewIcon, { backgroundColor: item.bg }]}>
                  <Ionicons name={item.icon} size={16} color={item.fg} />
                </View>
                <Text style={styles.overviewValue}>{item.value}</Text>
                <Text style={styles.overviewLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.sectionTitle}>Question types in this exam</Text>
          {typeBreakdown.length === 0 ? (
            <Text style={styles.muted}>{questionCount} questions — multiple choice.</Text>
          ) : (
            typeBreakdown.map((entry) => (
              <View key={entry.type} style={styles.typeRow}>
                <Text style={styles.typeLabel}>{entry.label}</Text>
                <View style={styles.typeCount}>
                  <Text style={styles.typeCountText}>{entry.count}</Text>
                </View>
              </View>
            ))
          )}

          <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Instructions</Text>
          {[...customInstructions, ...DEFAULT_RULES].map((rule, index) => (
            <View key={`${rule}-${index}`} style={styles.ruleRow}>
              <Ionicons name="checkmark-circle" size={16} color="#10b981" />
              <Text style={styles.ruleText}>{rule}</Text>
            </View>
          ))}

          <View style={styles.timerWarn}>
            <Ionicons name="timer-outline" size={20} color="#c2410c" />
            <Text style={styles.timerWarnText}>
              The timer starts the moment you press <Text style={styles.bold}>Start Exam</Text>. Your exam
              will be auto-submitted when time runs out.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} disabled={isStarting}>
          <Ionicons name="arrow-back" size={16} color={STUDENT.primaryDark} />
          <Text style={styles.backBtnText}>Back to exams</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.startBtn}
          onPress={onStart}
          disabled={isStarting}
          activeOpacity={0.9}
        >
          {isStarting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.startBtnText}>Start Exam</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: STUDENT.bg },
  scroll: {
    paddingHorizontal: STUDENT_SPACING.md,
    paddingTop: STUDENT_SPACING.md,
    paddingBottom: 16,
  },
  hero: {
    borderRadius: STUDENT_RADIUS.xxl,
    paddingHorizontal: STUDENT_SPACING.md,
    paddingVertical: 14,
    marginBottom: 12,
    ...STUDENT.shadow.md,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  heroCopy: { flex: 1, minWidth: 0 },
  heroEyebrow: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    marginBottom: 2,
  },
  heroTitle: {
    ...STUDENT_TYPO.section,
    color: STUDENT.textOnPrimary,
    lineHeight: 28,
  },
  heroBadge: {
    marginTop: 4,
    alignSelf: 'flex-start',
    overflow: 'hidden',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.55)',
    backgroundColor: 'rgba(251, 191, 36, 0.18)',
    color: '#FDE68A',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  heroWelcome: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    marginTop: 4,
    fontWeight: '600',
  },
  summaryCard: {
    borderRadius: STUDENT_RADIUS.inner,
    padding: STUDENT_SPACING.md,
    marginBottom: STUDENT_SPACING.md,
    backgroundColor: STUDENT.surface,
    ...STUDENT.shadow.sm,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: STUDENT.accentSoft,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: STUDENT.text,
  },
  summarySubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: STUDENT.textMuted,
    marginTop: 1,
  },
  overviewGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  overviewCard: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: STUDENT.surfaceElevated,
    borderRadius: STUDENT_RADIUS.md,
    borderWidth: 1,
    borderColor: STUDENT.surfaceBorder,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  overviewIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  overviewValue: { fontSize: 16, fontWeight: '800', color: STUDENT.text },
  overviewLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: STUDENT.textMuted,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  body: { paddingTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 10 },
  muted: { fontSize: 13, color: '#64748b', marginBottom: 8 },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  typeLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: '#334155' },
  typeCount: { backgroundColor: STUDENT.bgAccent, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  typeCountText: { fontSize: 12, fontWeight: '800', color: STUDENT.primaryDark },
  ruleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  ruleText: { flex: 1, fontSize: 13, color: '#334155', lineHeight: 18 },
  timerWarn: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 14,
    padding: 12,
  },
  timerWarnText: { flex: 1, fontSize: 13, color: '#9a3412', lineHeight: 18 },
  bold: { fontWeight: '800', color: '#7c2d12' },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  backBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: STUDENT.navActiveBg,
    borderRadius: 999,
    paddingVertical: 14,
  },
  backBtnText: { fontSize: 14, fontWeight: '800', color: STUDENT.primaryDark },
  startBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: STUDENT.primary,
    borderRadius: 999,
    paddingVertical: 14,
  },
  startBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
