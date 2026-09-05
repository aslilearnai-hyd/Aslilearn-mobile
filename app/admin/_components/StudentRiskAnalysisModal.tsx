import { storageGetItem } from '../../../src/lib/safe-storage';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../../src/services/api/api';
import { API_BASE_URL } from '../../../src/lib/api-config';
import { useAdminTheme } from '../_ui/useAdminTheme';
import AdminScalePressable from '../_ui/AdminScalePressable';

type AnalysisData = {
  riskLevel: 'high' | 'medium' | 'low';
  riskScore: number;
  analysis: {
    summary: string;
    trends: string;
    strengths: string[];
    weaknesses: string[];
    rootCauses: string[];
  };
  predictions: {
    nextExamPrediction: number;
    confidence: number;
    trend: 'declining' | 'stable' | 'improving';
  };
  interventions: Array<{
    priority: 'high' | 'medium' | 'low';
    action: string;
    reasoning: string;
    expectedImpact: string;
  }>;
  subjectBreakdown: Record<
    string,
    {
      performance: 'strong' | 'average' | 'weak';
      trend: 'improving' | 'stable' | 'declining';
      recommendation: string;
    }
  >;
  generatedAt?: string;
  dataPoints?: number;
};

type Props = {
  visible: boolean;
  studentId: string;
  studentName?: string;
  onClose: () => void;
  isSuperAdmin?: boolean;
  analysisType?: 'comprehensive' | 'quick' | 'subject-specific';
  timeRange?: '30days' | '90days' | 'all';
};

function isNoExamDataResponse(message?: string) {
  return Boolean(
    message?.includes('No exam data available') ||
      message?.includes('complete at least one exam'),
  );
}

function riskScorePercent(score: number) {
  if (!Number.isFinite(score)) return 0;
  return score <= 1 ? Math.round(score * 100) : Math.round(score);
}

function riskBarColor(level?: string) {
  if (level === 'high') return '#ef4444';
  if (level === 'medium') return '#eab308';
  return '#22c55e';
}

function riskBadgeStyle(level?: string) {
  if (level === 'high') return { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' };
  if (level === 'medium') return { bg: '#fefce8', text: '#854d0e', border: '#fde047' };
  return { bg: '#ecfdf5', text: '#166534', border: '#a7f3d0' };
}

function performanceStyle(performance: string) {
  if (performance === 'strong') return { bg: '#ecfdf5', text: '#166534' };
  if (performance === 'weak') return { bg: '#fef2f2', text: '#991b1b' };
  return { bg: '#fefce8', text: '#854d0e' };
}

function interventionStyle(priority: string) {
  if (priority === 'high') return { bg: '#fef2f2', border: '#fecaca', badge: '#dc2626' };
  if (priority === 'medium') return { bg: '#fefce8', border: '#fde047', badge: '#ca8a04' };
  return { bg: '#ecfdf5', border: '#a7f3d0', badge: '#16a34a' };
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === 'improving') return <Ionicons name="trending-up" size={18} color="#16a34a" />;
  if (trend === 'declining') return <Ionicons name="trending-down" size={18} color="#dc2626" />;
  return <Ionicons name="remove" size={18} color="#64748b" />;
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  children: ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={18} color="#ea580c" />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

export default function StudentRiskAnalysisModal({
  visible,
  studentId,
  studentName,
  onClose,
  isSuperAdmin = false,
  analysisType = 'comprehensive',
  timeRange = '90days',
}: Props) {
  const { colors, radius } = useAdminTheme();
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const sheetHeight = Math.round(windowHeight * 0.92);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noExamData, setNoExamData] = useState(false);
  const [data, setData] = useState<AnalysisData | null>(null);
  const showFooter = Boolean(data && !loading);

  const apiPrefix = isSuperAdmin ? '/api/super-admin' : '/api/admin';

  const fetchAnalysis = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    setError(null);
    setNoExamData(false);
    setData(null);
    try {
      const response = await api.post(`${apiPrefix}/ai/student-risk-analysis`, {
        studentId,
        analysisType,
        timeRange,
      });
      const body = response?.data;
      if (body?.success && body?.data) {
        setData(body.data as AnalysisData);
      } else if (isNoExamDataResponse(body?.message)) {
        setNoExamData(true);
      } else {
        setError(body?.message || 'Failed to analyze student risk.');
      }
    } catch (err: any) {
      const message = err?.friendlyMessage || err?.message || 'Failed to analyze student risk.';
      if (isNoExamDataResponse(message)) {
        setNoExamData(true);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }, [studentId, apiPrefix, analysisType, timeRange]);

  useEffect(() => {
    if (visible && studentId) void fetchAnalysis();
    if (!visible) {
      setData(null);
      setError(null);
      setNoExamData(false);
    }
  }, [visible, studentId, fetchAnalysis]);

  const handleDownloadPdf = async () => {
    if (!data || !studentId) return;
    setDownloading(true);
    try {
      const genRes = await api.post(`${apiPrefix}/ai/student-risk-analysis/download-send`, {
        studentId,
        analysisData: data,
      });
      const body = genRes?.data;
      if (!body?.success || !body?.data?.reportId) {
        throw new Error(body?.message || 'Failed to generate PDF');
      }
      const reportId = body.data.reportId;
      const filename = body.data.filename || `risk-analysis-${studentId}.pdf`;
      const token = await storageGetItem('authToken');
      const url = `${API_BASE_URL}${apiPrefix}/reports/download/${reportId}`;
      const path = `${FileSystem.cacheDirectory}${filename}`;
      await FileSystem.downloadAsync(url, path, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path, {
          mimeType: 'application/pdf',
          dialogTitle: filename,
          UTI: 'com.adobe.pdf',
        });
      } else {
        await Share.share({ url: path, title: filename });
      }
      Alert.alert('Success', 'PDF downloaded and sent to student successfully!');
    } catch (err: any) {
      Alert.alert('Error', err?.friendlyMessage || err?.message || 'Failed to download PDF');
    } finally {
      setDownloading(false);
    }
  };

  const riskBadge = riskBadgeStyle(data?.riskLevel);
  const scorePct = data ? riskScorePercent(data.riskScore) : 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" />
        <View
          style={[
            styles.sheet,
            {
              height: sheetHeight,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
            },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons name="sparkles" size={20} color="#ea580c" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.title}>AI Student Risk Analysis</Text>
              {studentName ? <Text style={styles.subtitle}>— {studentName}</Text> : null}
              <Text style={styles.description}>
                Comprehensive AI-powered analysis of student performance patterns and risk assessment
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close risk analysis"
            >
              <Ionicons name="close" size={22} color="#64748b" />
            </Pressable>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            bounces
          >
            {loading ? (
              <View style={styles.centerBox}>
                <ActivityIndicator size="large" color="#ea580c" />
                <Text style={styles.loadingTitle}>Analyzing Student Performance With AI…</Text>
                <Text style={styles.mutedText}>This May Take A Few Moments</Text>
              </View>
            ) : noExamData ? (
              <View style={styles.centerBox}>
                <View style={styles.emptyIconWrap}>
                  <Ionicons name="sparkles" size={32} color="#ea580c" />
                </View>
                <Text style={styles.emptyTitle}>Not Enough Data Yet</Text>
                <Text style={styles.mutedText}>
                  {studentName ? `${studentName} hasn't` : "This student hasn't"} completed any exams in the
                  selected period. AI risk analysis will be available after their first exam result is recorded.
                </Text>
                <AdminScalePressable style={styles.outlineBtn} onPress={onClose}>
                  <Text style={styles.outlineBtnText}>Close</Text>
                </AdminScalePressable>
              </View>
            ) : error ? (
              <View style={styles.errorBox}>
                <Ionicons name="warning-outline" size={22} color={colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : data ? (
              <View style={styles.content}>
                <SectionCard title="Risk Assessment" icon="warning-outline">
                  <View style={styles.riskHeaderRow}>
                    <View
                      style={[
                        styles.riskBadge,
                        { backgroundColor: riskBadge.bg, borderColor: riskBadge.border },
                      ]}
                    >
                      <Text style={[styles.riskBadgeText, { color: riskBadge.text }]}>
                        {String(data.riskLevel).toUpperCase()} RISK
                      </Text>
                    </View>
                  </View>
                  <View style={styles.scoreRow}>
                    <Text style={styles.scoreLabel}>Risk Score</Text>
                    <Text style={styles.scoreValue}>{scorePct}%</Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${Math.min(100, Math.max(0, scorePct))}%`, backgroundColor: riskBarColor(data.riskLevel) },
                      ]}
                    />
                  </View>
                  <Text style={styles.blockText}>{data.analysis.summary}</Text>
                </SectionCard>

                <SectionCard title="Performance Trends" icon="trending-up-outline">
                  <Text style={styles.blockText}>{data.analysis.trends}</Text>
                  <View style={styles.twoCol}>
                    <View style={[styles.highlightBox, styles.strengthBox]}>
                      <View style={styles.highlightTitleRow}>
                        <Ionicons name="checkmark-circle-outline" size={16} color="#16a34a" />
                        <Text style={styles.highlightTitle}>Strengths</Text>
                      </View>
                      {(data.analysis.strengths || []).map((item, i) => (
                        <Text key={`s-${i}`} style={styles.bullet}>
                          • {item}
                        </Text>
                      ))}
                    </View>
                    <View style={[styles.highlightBox, styles.weaknessBox]}>
                      <View style={styles.highlightTitleRow}>
                        <Ionicons name="close-circle-outline" size={16} color="#dc2626" />
                        <Text style={styles.highlightTitle}>Weaknesses</Text>
                      </View>
                      {(data.analysis.weaknesses || []).map((item, i) => (
                        <Text key={`w-${i}`} style={styles.bullet}>
                          • {item}
                        </Text>
                      ))}
                    </View>
                  </View>
                </SectionCard>

                <SectionCard title="Root Causes" icon="locate-outline">
                  {(data.analysis.rootCauses || []).map((cause, i) => (
                    <Text key={`c-${i}`} style={styles.bullet}>
                      • {cause}
                    </Text>
                  ))}
                </SectionCard>

                <SectionCard title="AI Predictions" icon="sparkles-outline">
                  <View style={styles.predGrid}>
                    <LinearGradient colors={['#eff6ff', '#dbeafe']} style={styles.predTile}>
                      <Text style={styles.predLabel}>Next Exam Prediction</Text>
                      <Text style={[styles.predValue, { color: '#2563eb' }]}>
                        {Math.round(data.predictions.nextExamPrediction)}%
                      </Text>
                    </LinearGradient>
                    <LinearGradient colors={['#faf5ff', '#f3e8ff']} style={styles.predTile}>
                      <Text style={styles.predLabel}>Confidence</Text>
                      <Text style={[styles.predValue, { color: '#9333ea' }]}>
                        {Math.round(data.predictions.confidence * 100)}%
                      </Text>
                    </LinearGradient>
                    <LinearGradient colors={['#ecfdf5', '#d1fae5']} style={styles.predTile}>
                      <Text style={styles.predLabel}>Trend</Text>
                      <View style={styles.trendRow}>
                        <TrendIcon trend={data.predictions.trend} />
                        <Text style={styles.trendText}>{data.predictions.trend}</Text>
                      </View>
                    </LinearGradient>
                  </View>
                </SectionCard>

                <SectionCard title="Recommended Interventions" icon="locate-outline">
                  {(data.interventions || []).map((item, i) => {
                    const tone = interventionStyle(item.priority);
                    return (
                      <View
                        key={`int-${i}`}
                        style={[styles.interventionCard, { backgroundColor: tone.bg, borderColor: tone.border }]}
                      >
                        <View style={[styles.priorityBadge, { backgroundColor: tone.badge }]}>
                          <Text style={styles.priorityBadgeText}>{item.priority.toUpperCase()} PRIORITY</Text>
                        </View>
                        <Text style={styles.interventionAction}>{item.action}</Text>
                        <Text style={styles.interventionMeta}>
                          <Text style={styles.interventionMetaLabel}>Reasoning: </Text>
                          {item.reasoning}
                        </Text>
                        <Text style={styles.interventionMeta}>
                          <Text style={styles.interventionMetaLabel}>Expected Impact: </Text>
                          {item.expectedImpact}
                        </Text>
                      </View>
                    );
                  })}
                </SectionCard>

                {Object.keys(data.subjectBreakdown || {}).length > 0 ? (
                  <SectionCard title="Subject-Wise Analysis" icon="book-outline">
                    {Object.entries(data.subjectBreakdown).map(([subject, subjectData]) => {
                      const perf = performanceStyle(subjectData.performance);
                      return (
                        <View key={subject} style={styles.subjectCard}>
                          <View style={styles.subjectHeader}>
                            <View style={styles.subjectNameWrap}>
                              <Text style={styles.subjectName}>{subject}</Text>
                            </View>
                            <View style={styles.subjectMeta}>
                              <TrendIcon trend={subjectData.trend} />
                              <View style={[styles.perfBadge, { backgroundColor: perf.bg }]}>
                                <Text style={[styles.perfBadgeText, { color: perf.text }]}>
                                  {subjectData.performance}
                                </Text>
                              </View>
                            </View>
                          </View>
                          <Text style={styles.blockText}>{subjectData.recommendation}</Text>
                        </View>
                      );
                    })}
                  </SectionCard>
                ) : null}

                {data.generatedAt ? (
                  <View style={styles.metaRow}>
                    <Ionicons name="time-outline" size={14} color="#5B6779" />
                    <Text style={styles.metaText}>
                      Generated: {new Date(data.generatedAt).toLocaleString()}
                    </Text>
                    {data.dataPoints ? (
                      <Text style={styles.metaText}>
                        Based On {data.dataPoints} exam{data.dataPoints !== 1 ? 's' : ''}
                      </Text>
                    ) : null}
                  </View>
                ) : null}
              </View>
            ) : null}
          </ScrollView>

          {showFooter ? (
            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 18) }]}>
              <AdminScalePressable style={styles.outlineBtn} onPress={onClose}>
                <Text style={styles.outlineBtnText}>Close</Text>
              </AdminScalePressable>
              <AdminScalePressable
                style={[styles.primaryBtn, downloading && styles.btnDisabled]}
                onPress={() => void handleDownloadPdf()}
                disabled={downloading}
              >
                {downloading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="download-outline" size={18} color="#fff" />
                )}
                <Text style={styles.primaryBtnText}>
                  {downloading ? 'Generating…' : 'Download PDF & send to student'}
                </Text>
              </AdminScalePressable>
              <AdminScalePressable style={styles.refreshBtn} onPress={() => void fetchAnalysis()}>
                <Ionicons name="sparkles-outline" size={18} color="#fff" />
                <Text style={styles.refreshBtnText}>Refresh Analysis</Text>
              </AdminScalePressable>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  sheet: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  header: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,247,237,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
  description: { fontSize: 12, color: '#64748b', marginTop: 4, lineHeight: 18 },
  body: {
    flex: 1,
    minHeight: 0,
  },
  bodyContent: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingBottom: 24,
    flexGrow: 1,
  },
  centerBox: { alignItems: 'center', gap: 10, paddingVertical: 28, paddingHorizontal: 12 },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,247,237,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingTitle: { fontSize: 15, fontWeight: '600', color: '#334155' },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  mutedText: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 20 },
  errorBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: { flex: 1, fontSize: 13, color: '#991b1b', lineHeight: 20 },
  content: { gap: 12 },
  sectionCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 14,
    backgroundColor: '#FFFFFF',
    gap: 10,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  riskHeaderRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  riskBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  riskBadgeText: { fontSize: 11, fontWeight: '800' },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  scoreLabel: { fontSize: 13, fontWeight: '600', color: '#475569' },
  scoreValue: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#e2e8f0',
    overflow: 'hidden',
  },
  progressFill: { height: 8, borderRadius: 999 },
  blockText: { fontSize: 13, color: '#334155', lineHeight: 20 },
  twoCol: { gap: 10 },
  highlightBox: { borderRadius: 12, padding: 12, gap: 6 },
  strengthBox: { backgroundColor: '#eff6ff' },
  weaknessBox: { backgroundColor: '#fef2f2' },
  highlightTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  highlightTitle: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  bullet: { fontSize: 13, color: '#475569', lineHeight: 20 },
  predGrid: { gap: 10 },
  predTile: { borderRadius: 12, padding: 14, alignItems: 'center', gap: 4 },
  predLabel: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  predValue: { fontSize: 24, fontWeight: '800' },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  trendText: { fontSize: 16, fontWeight: '700', color: '#0f172a', textTransform: 'capitalize' },
  interventionCard: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  priorityBadge: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  priorityBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  interventionAction: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  interventionMeta: { fontSize: 13, color: '#475569', lineHeight: 19 },
  interventionMetaLabel: { fontWeight: '700', color: '#334155' },
  subjectCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    gap: 8,
    marginBottom: 4,
  },
  subjectHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  subjectNameWrap: { flex: 1, minWidth: 0 },
  subjectName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  subjectMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  perfBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  perfBadgeText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  metaText: { fontSize: 11, color: '#5B6779' },
  footer: {
    flexShrink: 0,
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  outlineBtn: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  outlineBtnText: { fontSize: 14, fontWeight: '700', color: '#334155' },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f97316',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 13, textAlign: 'center' },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 12,
  },
  refreshBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnDisabled: { opacity: 0.65 },
});
