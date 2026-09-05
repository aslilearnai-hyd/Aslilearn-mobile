import { storageGetItem } from '../../../src/lib/safe-storage';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../../../src/lib/api-config';
import { ExamAnalysisResult, normalizeMongoId } from '../../../src/lib/exam-analysis-helpers';
import DetailedAnalysisView from './DetailedAnalysisView';
import { STUDENT } from '../../../src/theme/student';

function getExamIdFromResult(row: any): string {
  if (!row?.examId) return '';
  if (typeof row.examId === 'object' && row.examId._id) return String(row.examId._id);
  return String(row.examId);
}

export default function ExamAnalysisEntryView() {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<ExamAnalysisResult | null>(null);
  const [examTitle, setExamTitle] = useState('Exam');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await storageGetItem('authToken');
        const response = await fetch(`${API_BASE_URL}/api/student/exam-results`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (!response.ok || cancelled) return;
        const data = await response.json();
        const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        if (!list.length || cancelled) return;

        const latest = [...list].sort(
          (a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime()
        )[0];

        const examId = normalizeMongoId(getExamIdFromResult(latest));
        if (!examId || cancelled) return;

        setExamTitle(
          latest.examTitle ||
            (typeof latest.examId === 'object' ? latest.examId?.title : null) ||
            'Latest Exam'
        );
        setResult({
          ...latest,
          examId,
          totalQuestions: Number(latest.totalQuestions || 0),
          correctAnswers: Number(latest.correctAnswers || 0),
          wrongAnswers: Number(latest.wrongAnswers || 0),
          unattempted: Number(latest.unattempted || 0),
          totalMarks: Number(latest.totalMarks || 0),
          obtainedMarks: Number(latest.obtainedMarks || 0),
          percentage: Number(latest.percentage || 0),
          timeTaken: Number(latest.timeTaken || 0),
        });
      } catch {
        /* non-fatal */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={STUDENT.primary} />
        <Text style={styles.loadingText}>Loading Your Latest Exam Analysis…</Text>
      </View>
    );
  }

  if (!result?.examId) {
    return (
      <View style={styles.centered}>
        <Ionicons name="analytics-outline" size={48} color={STUDENT.textMuted} />
        <Text style={styles.emptyTitle}>No Exam Analysis Yet</Text>
        <Text style={styles.emptyText}>
          Complete an exam, then open Attempted Exams → View Details for the full AI Report, Questions,
          Advanced, Insights, and Plan tabs.
        </Text>
      </View>
    );
  }

  return (
    <DetailedAnalysisView
      result={result}
      examTitle={examTitle}
      embedded
      onBack={() => {}}
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
    minHeight: 280,
  },
  loadingText: { fontSize: 14, color: STUDENT.textMuted, textAlign: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: STUDENT.text, textAlign: 'center' },
  emptyText: { fontSize: 14, color: STUDENT.textMuted, textAlign: 'center', lineHeight: 20 },
});
