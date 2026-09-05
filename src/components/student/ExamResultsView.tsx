import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DetailedAnalysisView from '../../../app/dashboard/_components/DetailedAnalysisView';
import {
  ExamAnalysisResult,
  getDisplayPercentage,
  getGradeFromResult,
  getMarksPercentage,
  resolveTotalMarks,
} from '../../lib/exam-analysis-helpers';

type Props = {
  result: ExamAnalysisResult;
  examTitle: string;
  onBack: () => void;
  onRetake?: () => void;
  attemptsRemaining?: number;
  /** Match web `openDetailedByDefault` when opening from attempted exams. */
  openDetailedByDefault?: boolean;
};

function formatTime(seconds: number) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return `${hours > 0 ? `${hours}h ` : ''}${minutes}m ${secs}s`;
}

function gradeTone(pct: number) {
  if (pct >= 70) return { ring: '#10B981', chipBg: '#D1FAE5', chipText: '#047857' };
  if (pct >= 50) return { ring: '#F59E0B', chipBg: '#FEF3C7', chipText: '#B45309' };
  return { ring: '#EF4444', chipBg: '#FEE2E2', chipText: '#B91C1C' };
}

const SUBJECT_COLORS: Record<string, { bg: string; text: string }> = {
  maths: { bg: '#DBEAFE', text: '#2563EB' },
  physics: { bg: '#D1FAE5', text: '#059669' },
  chemistry: { bg: '#EDE9FE', text: '#7C3AED' },
  biology: { bg: '#D1FAE5', text: '#047857' },
};

/**
 * Web-parity results: summary scorecard first, then optional detailed analysis.
 */
export default function ExamResultsView({
  result,
  examTitle,
  onBack,
  onRetake,
  attemptsRemaining = 0,
  openDetailedByDefault = false,
}: Props) {
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(openDetailedByDefault);

  const summary = useMemo(() => {
    const totalQuestionCount =
      Number(result.totalQuestions || 0) ||
      Number(result.correctAnswers || 0) +
        Number(result.wrongAnswers || 0) +
        Number(result.unattempted || 0);
    const attemptedCount =
      Number(result.correctAnswers || 0) + Number(result.wrongAnswers || 0);
    const displayPercentage = getDisplayPercentage(result);
    const marksPercentage =
      resolveTotalMarks(result) > 0 ? getMarksPercentage(result) : displayPercentage;
    const accuracyRate =
      attemptedCount > 0
        ? (Number(result.correctAnswers || 0) / attemptedCount) * 100
        : 0;
    const completionRate =
      totalQuestionCount > 0 ? (attemptedCount / totalQuestionCount) * 100 : 0;
    const grade = getGradeFromResult(result);
    const tone = gradeTone(displayPercentage);
    const totalMarks = resolveTotalMarks(result) || Number(result.totalMarks || 0);
    const avgPerQuestion =
      totalQuestionCount > 0 ? Math.floor(Number(result.timeTaken || 0) / totalQuestionCount) : 0;

    const subjects = Object.entries(result.subjectWiseScore || {}).filter(
      ([, score]) => score && (Number(score.total) > 0 || Number(score.marks) > 0)
    );

    return {
      totalQuestionCount,
      attemptedCount,
      displayPercentage,
      marksPercentage,
      accuracyRate,
      completionRate,
      grade,
      tone,
      totalMarks,
      avgPerQuestion,
      subjects,
    };
  }, [result]);

  if (showDetailedAnalysis) {
    return (
      <DetailedAnalysisView
        result={result}
        examTitle={examTitle}
        onBack={() => setShowDetailedAnalysis(false)}
        onRetake={onRetake}
        attemptsRemaining={attemptsRemaining}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Ionicons name="trophy" size={44} color="#F59E0B" />
          <Text style={styles.headerTitle}>Exam Completed!</Text>
          <Text style={styles.headerSub}>{examTitle}</Text>
          {Number(result.attemptNumber) >= 1 ? (
            <Text style={styles.attemptLabel}>Attempt {Number(result.attemptNumber)}</Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Performance</Text>
          <View style={styles.scoreRow}>
            <View style={[styles.ringOuter, { borderColor: summary.tone.ring }]}>
              <Text style={styles.ringPct}>{summary.displayPercentage.toFixed(1)}%</Text>
              <Text style={[styles.ringGrade, { color: summary.tone.chipText }]}>
                {summary.grade}
              </Text>
            </View>
            <View style={styles.scoreMeta}>
              <Text style={styles.marksBig}>{result.obtainedMarks ?? 0}</Text>
              <Text style={styles.marksSub}>out of {summary.totalMarks} marks</Text>
              <View style={[styles.gradeChip, { backgroundColor: summary.tone.chipBg }]}>
                <Ionicons name="ribbon-outline" size={14} color={summary.tone.chipText} />
                <Text style={[styles.gradeChipText, { color: summary.tone.chipText }]}>
                  {summary.grade} Grade
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.statGrid}>
            <View style={styles.statCell}>
              <Text style={[styles.statValue, { color: '#059669' }]}>{result.correctAnswers ?? 0}</Text>
              <Text style={styles.statLabel}>Correct</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={[styles.statValue, { color: '#DC2626' }]}>{result.wrongAnswers ?? 0}</Text>
              <Text style={styles.statLabel}>Wrong</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={[styles.statValue, { color: '#64748B' }]}>{result.unattempted ?? 0}</Text>
              <Text style={styles.statLabel}>Unattempted</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={[styles.statValue, { color: '#2563EB' }]}>
                {formatTime(result.timeTaken || 0)}
              </Text>
              <Text style={styles.statLabel}>Time</Text>
            </View>
          </View>

          <View style={styles.barBlock}>
            <View style={styles.barHeader}>
              <Text style={styles.barLabel}>Accuracy</Text>
              <Text style={styles.barValue}>{summary.accuracyRate.toFixed(1)}%</Text>
            </View>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  { width: `${Math.min(100, summary.accuracyRate)}%`, backgroundColor: '#10B981' },
                ]}
              />
            </View>
          </View>
          <View style={styles.barBlock}>
            <View style={styles.barHeader}>
              <Text style={styles.barLabel}>Completion</Text>
              <Text style={styles.barValue}>{summary.completionRate.toFixed(1)}%</Text>
            </View>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  { width: `${Math.min(100, summary.completionRate)}%`, backgroundColor: '#6366F1' },
                ]}
              />
            </View>
          </View>
        </View>

        {summary.subjects.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Subject-Wise Performance</Text>
            <View style={styles.subjectGrid}>
              {summary.subjects.map(([subject, score]) => {
                const total = Number(score.total) || 0;
                const correct = Number(score.correct) || 0;
                const pct = total > 0 ? (correct / total) * 100 : 0;
                const colors = SUBJECT_COLORS[subject] || { bg: '#F1F5F9', text: '#475569' };
                return (
                  <View key={subject} style={styles.subjectCard}>
                    <View style={[styles.subjectIcon, { backgroundColor: colors.bg }]}>
                      <Ionicons name="book-outline" size={20} color={colors.text} />
                    </View>
                    <Text style={styles.subjectName}>{subject}</Text>
                    <Text style={styles.subjectPct}>{pct.toFixed(1)}%</Text>
                    <Text style={styles.subjectMeta}>
                      {correct}/{total} correct
                    </Text>
                    <Text style={styles.subjectMarks}>{Number(score.marks) || 0} marks</Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Question & Time</Text>
          <View style={styles.breakdownRow}>
            <Ionicons name="checkmark-circle" size={18} color="#10B981" />
            <Text style={styles.breakdownLabel}>Correct Answers</Text>
            <Text style={[styles.breakdownValue, { color: '#059669' }]}>
              {result.correctAnswers ?? 0}
            </Text>
          </View>
          <View style={styles.breakdownRow}>
            <Ionicons name="close-circle" size={18} color="#EF4444" />
            <Text style={styles.breakdownLabel}>Wrong Answers</Text>
            <Text style={[styles.breakdownValue, { color: '#DC2626' }]}>
              {result.wrongAnswers ?? 0}
            </Text>
          </View>
          <View style={styles.breakdownRow}>
            <Ionicons name="alert-circle" size={18} color="#94A3B8" />
            <Text style={styles.breakdownLabel}>Unattempted</Text>
            <Text style={styles.breakdownValue}>{result.unattempted ?? 0}</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Ionicons name="time-outline" size={18} color="#3B82F6" />
            <Text style={styles.breakdownLabel}>Time Taken</Text>
            <Text style={[styles.breakdownValue, { color: '#2563EB' }]}>
              {formatTime(result.timeTaken || 0)}
            </Text>
          </View>
          <View style={styles.breakdownRow}>
            <Ionicons name="calculator-outline" size={18} color="#8B5CF6" />
            <Text style={styles.breakdownLabel}>Avg. Per Question</Text>
            <Text style={[styles.breakdownValue, { color: '#7C3AED' }]}>
              {formatTime(summary.avgPerQuestion)}
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => setShowDetailedAnalysis(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="analytics-outline" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>View Detailed Analysis</Text>
          </TouchableOpacity>

          {attemptsRemaining > 0 && onRetake ? (
            <TouchableOpacity style={styles.secondaryBtn} onPress={onRetake} activeOpacity={0.85}>
              <Ionicons name="refresh-outline" size={18} color="#C2410C" />
              <Text style={styles.secondaryBtnText}>
                Retake exam ({attemptsRemaining} left)
              </Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity style={styles.ghostBtn} onPress={onBack} activeOpacity={0.85}>
            <Ionicons name="arrow-back" size={18} color="#475569" />
            <Text style={styles.ghostBtnText}>Back To Exams</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16, paddingBottom: 40, gap: 14 },
  header: { alignItems: 'center', paddingVertical: 12, gap: 4 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#0F172A', marginTop: 6 },
  headerSub: { fontSize: 15, color: '#64748B', textAlign: 'center' },
  attemptLabel: { marginTop: 4, fontSize: 12, fontWeight: '700', color: '#4F46E5' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 14 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  ringOuter: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  ringPct: { fontSize: 22, fontWeight: '800', color: '#0F172A' },
  ringGrade: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  scoreMeta: { flex: 1, gap: 4 },
  marksBig: { fontSize: 32, fontWeight: '800', color: '#0F172A' },
  marksSub: { fontSize: 13, color: '#64748B' },
  gradeChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 6,
  },
  gradeChipText: { fontSize: 12, fontWeight: '700' },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  statCell: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  statValue: { fontSize: 16, fontWeight: '800' },
  statLabel: { marginTop: 2, fontSize: 11, color: '#64748B', fontWeight: '600' },
  barBlock: { marginTop: 14 },
  barHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  barLabel: { fontSize: 12, color: '#475569', fontWeight: '600' },
  barValue: { fontSize: 12, color: '#0F172A', fontWeight: '700' },
  barTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 999 },
  subjectGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  subjectCard: {
    width: '47%',
    flexGrow: 1,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
  },
  subjectIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  subjectName: { fontSize: 13, fontWeight: '700', color: '#0F172A', textTransform: 'capitalize' },
  subjectPct: { marginTop: 4, fontSize: 20, fontWeight: '800', color: '#0F172A' },
  subjectMeta: { fontSize: 11, color: '#64748B', marginTop: 2 },
  subjectMarks: { fontSize: 12, fontWeight: '600', color: '#334155', marginTop: 4 },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
  },
  breakdownLabel: { flex: 1, fontSize: 14, color: '#334155' },
  breakdownValue: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  actions: { gap: 10, marginTop: 4 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EA580C',
    borderRadius: 14,
    paddingVertical: 14,
  },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 14,
    paddingVertical: 13,
  },
  secondaryBtnText: { color: '#C2410C', fontWeight: '800', fontSize: 14 },
  ghostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  ghostBtnText: { color: '#475569', fontWeight: '700', fontSize: 14 },
});
