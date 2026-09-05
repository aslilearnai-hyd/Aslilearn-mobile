import { storageGetItem } from '../../../../src/lib/safe-storage';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { API_BASE_URL } from '../../../../src/lib/api-config';
import {
  ADVANCED_CHART_COLORS,
  AdvancedAnalyticsPayload,
  advancedAnalyticsMockData,
  difficultyChartLabel,
  difficultyLabel,
  formatSeconds,
  normalizeAdvancedAnalyticsPayload,
} from '../../../../src/lib/advanced-analytics';
import DonutChart from '../../../../src/components/ui/charts/DonutChart';
import ChartLegend from '../../../../src/components/ui/charts/ChartLegend';
import GroupedBarChart from '../../../../src/components/ui/charts/GroupedBarChart';
import ComposedStackedBarChart from '../../../../src/components/ui/charts/ComposedStackedBarChart';
import HorizontalStackedBarChart from '../../../../src/components/ui/charts/HorizontalStackedBarChart';
import BarChart from '../../../../src/components/ui/charts/BarChart';
import { GlassPanel } from '../../../../src/components/ui';
import AnalysisCard from './AnalysisCard';
import { ANALYSIS, ANALYSIS_CONTENT_MAX, useExamAnalysisLayout } from './exam-analysis-ui';

const difficultyRows = ['easy', 'moderate', 'difficult', 'highly_difficult'] as const;

function DashboardCard({
  title,
  subtitle,
  children,
  icon = 'bar-chart' as const,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  icon?: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
}) {
  return (
    <AnalysisCard title={title} icon={icon} accent={ANALYSIS.accent}>
      {subtitle ? <Text style={styles.cardSub}>{subtitle}</Text> : null}
      {children}
    </AnalysisCard>
  );
}

function ChartEmpty({ message }: { message: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

export default function AdvancedPerformanceDashboardMobile({
  examId,
  resultId,
}: {
  examId: string;
  resultId?: string;
}) {
  const { width: screenWidth } = useWindowDimensions();
  const { isTablet } = useExamAnalysisLayout();
  const [data, setData] = useState<AdvancedAnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const loadAnalytics = useCallback(async (cancelled: () => boolean) => {
    setLoading(true);
    setError('');
    try {
      const token = await storageGetItem('authToken');
      const resultQuery =
        resultId && String(resultId).trim()
          ? `?resultId=${encodeURIComponent(String(resultId).trim())}`
          : '';
      const response = await fetch(
        `${API_BASE_URL}/api/student/exam/${examId}/advanced-analytics${resultQuery}`,
        {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        }
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Failed to load advanced analytics');
      }
      if (!cancelled()) {
        setData(normalizeAdvancedAnalyticsPayload(payload.data));
      }
    } catch (e: unknown) {
      if (!cancelled()) {
        setError(e instanceof Error ? e.message : 'Advanced analytics unavailable');
        setData(normalizeAdvancedAnalyticsPayload(advancedAnalyticsMockData));
      }
    } finally {
      if (!cancelled()) setLoading(false);
    }
  }, [examId, resultId]);

  useEffect(() => {
    let cancelled = false;
    void loadAnalytics(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [loadAnalytics, reloadKey]);

  const analytics = useMemo(
    () => (data ? data : normalizeAdvancedAnalyticsPayload(advancedAnalyticsMockData)),
    [data]
  );
  const usedMockFallback = Boolean(error);

  const difficultyMap = useMemo(() => {
    const mapped = new Map(analytics.difficultyTimeIntelligence.map((row) => [row.difficulty, row]));
    return difficultyRows
      .map((row) => mapped.get(row))
      .filter(Boolean) as AdvancedAnalyticsPayload['difficultyTimeIntelligence'];
  }, [analytics]);

  const questionTypeChartData = useMemo(
    () =>
      analytics.questionTypeMatrix.map((row) => ({
        label: row.type,
        correct: row.correct.physics + row.correct.chemistry + row.correct.maths,
        wrong: row.wrong.physics + row.wrong.chemistry + row.wrong.maths,
        notAnswered: row.notAnswered.physics + row.notAnswered.chemistry + row.notAnswered.maths,
        correctPhysics: row.correct.physics,
        correctChemistry: row.correct.chemistry,
        correctMaths: row.correct.maths,
        wrongPhysics: row.wrong.physics,
        wrongChemistry: row.wrong.chemistry,
        wrongMaths: row.wrong.maths,
        notAnsweredPhysics: row.notAnswered.physics,
        notAnsweredChemistry: row.notAnswered.chemistry,
        notAnsweredMaths: row.notAnswered.maths,
      })),
    [analytics.questionTypeMatrix]
  );

  const questionTypeHasData = questionTypeChartData.some(
    (r) => r.correct + r.wrong + r.notAnswered > 0
  );

  const questionTypeChartRows = useMemo(
    () => questionTypeChartData.filter((r) => r.correct + r.wrong + r.notAnswered > 0),
    [questionTypeChartData]
  );

  const difficultyOutcomeData = useMemo(
    () =>
      difficultyMap.map((row) => ({
        label: difficultyChartLabel(row.difficulty),
        correct: row.correctAnswered.count,
        wrong: row.wrongAnswered.count,
        correctAvg: row.correctAnswered.avgTime,
        wrongAvg: row.wrongAnswered.avgTime,
        idealTime: row.idealTimeSec,
      })),
    [difficultyMap]
  );

  const correctTimeBucketData = useMemo(
    () =>
      difficultyMap.map((row) => ({
        label: difficultyChartLabel(row.difficulty),
        inTime: row.correctAnswered.inTime,
        lessTime: row.correctAnswered.lessTime,
        overTime: row.correctAnswered.overTime,
        idealTime: row.idealTimeSec,
        avgTime: row.correctAnswered.avgTime,
        count: row.correctAnswered.count,
      })),
    [difficultyMap]
  );

  const wrongTimeBucketData = useMemo(
    () =>
      difficultyMap.map((row) => ({
        label: difficultyChartLabel(row.difficulty),
        inTime: row.wrongAnswered.inTime,
        lessTime: row.wrongAnswered.lessTime,
        overTime: row.wrongAnswered.overTime,
        idealTime: row.idealTimeSec,
        avgTime: row.wrongAnswered.avgTime,
        count: row.wrongAnswered.count,
      })),
    [difficultyMap]
  );

  const correctBucketsHaveData = correctTimeBucketData.some(
    (r) => r.inTime + r.lessTime + r.overTime > 0
  );
  const wrongBucketsHaveData = wrongTimeBucketData.some(
    (r) => r.inTime + r.lessTime + r.overTime > 0
  );

  const conceptChartData = useMemo(
    () =>
      analytics.conceptVsApplication.map((row) => {
        const attempted = row.correct + row.wrong;
        return {
          label: row.type,
          correct: row.correct,
          wrong: row.wrong,
          notAnswered: row.notAnswered,
          hitRate: attempted > 0 ? Math.round((row.correct / attempted) * 100) : 0,
          totalTime: row.totalTime,
          avgTime: row.avgTimePerQuestion,
        };
      }),
    [analytics.conceptVsApplication]
  );

  const conceptHasData = conceptChartData.some((r) => r.correct + r.wrong + r.notAnswered > 0);

  const chapterChartData = useMemo(
    () =>
      analytics.chapterWeakness.map((row) => ({
        label: row.subject.charAt(0).toUpperCase() + row.subject.slice(1),
        sublabel: row.chapter,
        correct: row.correct,
        errors: row.errors,
        notAnswered: row.notAnswered,
        total: row.correct + row.errors + row.notAnswered,
        accuracy: row.accuracy,
      })),
    [analytics.chapterWeakness]
  );

  const chapterRowsForChart = useMemo(
    () => chapterChartData.filter((r) => r.total > 0).slice(0, 10),
    [chapterChartData]
  );

  const chapterHasData = chapterRowsForChart.length > 0;

  const chapterPieSegments = useMemo(() => {
    const totals = { correct: 0, errors: 0, notAnswered: 0 };
    chapterChartData.forEach((r) => {
      totals.correct += r.correct;
      totals.errors += r.errors;
      totals.notAnswered += r.notAnswered;
    });
    return [
      { value: totals.correct, color: ADVANCED_CHART_COLORS.correct, label: 'Correct' },
      { value: totals.errors, color: ADVANCED_CHART_COLORS.wrong, label: 'Errors' },
      { value: totals.notAnswered, color: ADVANCED_CHART_COLORS.notAnswered, label: 'Not Answered' },
    ].filter((s) => s.value > 0);
  }, [chapterChartData]);

  const outcomeSeries = [
    { key: 'correct', color: ADVANCED_CHART_COLORS.correct, label: 'Correct' },
    { key: 'wrong', color: ADVANCED_CHART_COLORS.wrong, label: 'Wrong' },
    { key: 'notAnswered', color: ADVANCED_CHART_COLORS.notAnswered, label: 'Not Answered' },
  ];

  const timeBucketSeries = [
    { key: 'inTime', color: ADVANCED_CHART_COLORS.inTime, label: 'In Time' },
    { key: 'lessTime', color: ADVANCED_CHART_COLORS.lessTime, label: 'Less Time' },
    { key: 'overTime', color: ADVANCED_CHART_COLORS.overTime, label: 'Over Time' },
  ];

  const chapterSeries = [
    { key: 'correct', color: ADVANCED_CHART_COLORS.correct, label: 'Correct' },
    { key: 'errors', color: ADVANCED_CHART_COLORS.wrong, label: 'Errors' },
    { key: 'notAnswered', color: ADVANCED_CHART_COLORS.notAnswered, label: 'Not Answered' },
  ];

  const chartMinWidth = Math.max(280, Math.min(screenWidth, ANALYSIS_CONTENT_MAX) - 48);

  const subjectBarColor = (subject: string) => {
    const key = subject.toLowerCase();
    if (key.includes('phys')) return '#8B5CF6';
    if (key.includes('chem')) return '#06B6D4';
    if (key.includes('math')) return '#EC4899';
    return ADVANCED_CHART_COLORS.notAnswered;
  };

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading Advanced Intelligence…</Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { minWidth: chartMinWidth }, isTablet && styles.wrapTablet]}>
      {error ? (
        <View style={styles.warnBox}>
          <Text style={styles.warnText}>
            {error}
            {usedMockFallback ? '. Showing sample layout until live analytics loads.' : ''}
          </Text>
          <TouchableOpacity style={styles.retryBtnInline} onPress={() => setReloadKey((k) => k + 1)}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <GlassPanel style={styles.header} radius={14}>
        {/* Inner view carries the row spacing GlassPanel's wrapper would swallow. */}
        <View style={styles.headerInner}>
          <Text style={styles.headerTitle}>Advanced Performance Intelligence</Text>
          <Text style={styles.headerSub}>Live Data: Time × Difficulty × Question Type × Chapter</Text>
          <View style={styles.badgeRow}>
            <View style={styles.badgeBlue}>
              <Text style={styles.badgeBlueText}>Risk: {analytics.recommendation?.riskLevel || 'N/A'}</Text>
            </View>
            <View style={styles.badgeGreen}>
              <Text style={styles.badgeGreenText}>
                Trend: {analytics.recommendation?.confidenceTrend || 'Stable'}
              </Text>
            </View>
          </View>
        </View>
      </GlassPanel>

      <DashboardCard
        title="Question-Type Intelligence Matrix"
        subtitle="Outcome Counts By Question Type (All Subjects Combined)"
      >
        {!questionTypeHasData ? (
          <ChartEmpty message="No question-type data for this exam yet." />
        ) : (
          <>
            <GroupedBarChart data={questionTypeChartRows} series={outcomeSeries} height={320} />
            {questionTypeChartData
              .filter((row) => row.correct + row.wrong + row.notAnswered > 0)
              .map((row) => (
              <View key={row.label} style={styles.breakdownRow}>
                <Text style={styles.breakdownTitle}>{row.label}</Text>
                <Text style={styles.breakdownMeta}>
                  Correct: Phy {row.correctPhysics} · Chem {row.correctChemistry} · Math {row.correctMaths}
                </Text>
                <Text style={styles.breakdownMeta}>
                  Wrong: Phy {row.wrongPhysics} · Chem {row.wrongChemistry} · Math {row.wrongMaths}
                </Text>
                <Text style={styles.breakdownMeta}>
                  Skipped: Phy {row.notAnsweredPhysics} · Chem {row.notAnsweredChemistry} · Math{' '}
                  {row.notAnsweredMaths}
                </Text>
              </View>
            ))}
          </>
        )}
      </DashboardCard>

      <DashboardCard
        title="Difficulty + Time Intelligence"
        subtitle="Correct vs wrong counts, time buckets, and ideal benchmarks"
      >
        <Text style={styles.sectionLabel}>Correct Vs Wrong By Difficulty</Text>
        <GroupedBarChart
          data={difficultyOutcomeData}
          series={[
            { key: 'correct', color: ADVANCED_CHART_COLORS.correct, label: 'Correct' },
            { key: 'wrong', color: ADVANCED_CHART_COLORS.wrong, label: 'Wrong' },
          ]}
          height={260}
        />

        <View style={styles.bucketBoxGreen}>
          <Text style={styles.bucketTitleGreen}>Correct — Time Buckets</Text>
          {!correctBucketsHaveData ? (
            <ChartEmpty message="No correct-answer timing data." />
          ) : (
            <>
              <ComposedStackedBarChart
                data={correctTimeBucketData}
                series={timeBucketSeries}
                height={240}
                idealTimeKey="idealTime"
              />
            </>
          )}
        </View>

        <View style={styles.bucketBoxOrange}>
          <Text style={styles.bucketTitleOrange}>Wrong — Time Buckets</Text>
          {!wrongBucketsHaveData ? (
            <ChartEmpty message="No wrong-answer timing data." />
          ) : (
            <>
              <ComposedStackedBarChart
                data={wrongTimeBucketData}
                series={timeBucketSeries}
                height={240}
                idealTimeKey="idealTime"
              />
            </>
          )}
        </View>
      </DashboardCard>

      <DashboardCard title="Concept Vs Application Analysis">
        {!conceptHasData ? (
          <ChartEmpty message="No concept vs application data for this exam yet." />
        ) : (
          <>
            <GroupedBarChart data={conceptChartData} series={outcomeSeries} height={280} />
            {conceptChartData.map((row) => (
              <View key={row.label} style={styles.conceptRow}>
                <Text style={styles.conceptTitle}>{row.label}</Text>
                <Text style={styles.conceptMeta}>
                  Hit Rate: {row.hitRate}% · Total Time: {formatSeconds(row.totalTime)} · Avg/Q:{' '}
                  {formatSeconds(row.avgTime)}
                </Text>
              </View>
            ))}
          </>
        )}
      </DashboardCard>

      <DashboardCard title="Chapter-Wise Weakness Detection">
        {!chapterHasData ? (
          <ChartEmpty message="No chapter weakness data for this exam yet." />
        ) : (
          <>
            <HorizontalStackedBarChart data={chapterRowsForChart} series={chapterSeries} />
            {chapterPieSegments.length > 0 ? (
              <View style={styles.pieWrap}>
                <DonutChart
                  size={150}
                  centerLabel={String(chapterPieSegments.reduce((s, seg) => s + seg.value, 0))}
                  segments={chapterPieSegments}
                />
                <ChartLegend
                  items={chapterPieSegments.map((s) => ({
                    color: s.color,
                    label: s.label,
                    value: s.value,
                  }))}
                />
              </View>
            ) : null}
          </>
        )}
      </DashboardCard>

      <View style={styles.footerGrid}>
        {/* Inner views carry the row spacing GlassPanel's wrapper would swallow. */}
        <GlassPanel style={[styles.footerCard, styles.footerBlue]} radius={14} tone="strong">
          <View style={styles.footerCardInner}>
          <Text style={styles.footerTitleBlue}>Time Efficiency</Text>
          {analytics.timeEfficiency.avgTimePerSubject.length > 0 ? (
            <>
              <BarChart
                data={analytics.timeEfficiency.avgTimePerSubject.map((item) => ({
                  label: item.subject.charAt(0).toUpperCase() + item.subject.slice(1, 4),
                  value: item.avgTime,
                  color: subjectBarColor(item.subject),
                }))}
                height={210}
                formatYTick={(v) => {
                  if (v < 60) return `${Math.round(v)}s`;
                  return formatSeconds(v);
                }}
                formatBarValue={(v) => formatSeconds(v)}
              />
              {analytics.timeEfficiency.avgTimePerSubject.map((item) => (
                <Text key={item.subject} style={styles.metaText}>
                  {item.subject.charAt(0).toUpperCase() + item.subject.slice(1)}:{' '}
                  {formatSeconds(item.avgTime)} avg · {item.totalQuestions} Q · {Math.round(item.accuracy)}%
                  accuracy
                </Text>
              ))}
            </>
          ) : (
            <Text style={styles.metaText}>No subject timing data.</Text>
          )}
          </View>
        </GlassPanel>

        <GlassPanel style={[styles.footerCard, styles.footerGreen]} radius={14} tone="strong">
          <View style={styles.footerCardInner}>
          <Text style={styles.footerTitleGreen}>Summary</Text>
          <Text style={styles.metaText}>
            Slowest: <Text style={styles.orangeBold}>{analytics.timeEfficiency.slowestSubject || '—'}</Text>
          </Text>
          <Text style={styles.metaText}>
            Fastest: <Text style={styles.greenBold}>{analytics.timeEfficiency.fastestSubject || '—'}</Text>
          </Text>
          <Text style={styles.metaText}>
            Time On Wrong:{' '}
            <Text style={styles.orangeBold}>
              {formatSeconds(analytics.timeEfficiency.timeWastedOnWrongQuestions)}
            </Text>
          </Text>
          <Text style={styles.metaText}>
            Questions Analysed:{' '}
            <Text style={styles.blueBold}>{analytics.metadata.totalQuestionsAnalyzed}</Text>
          </Text>
          </View>
        </GlassPanel>
      </View>

      {(analytics.aiObservations || []).map((obs, i) => (
        <GlassPanel key={i} style={styles.obsBox} radius={10} tone="strong">
          <Text style={styles.obsText}>{obs}</Text>
        </GlassPanel>
      ))}

      {analytics.recommendation?.actionPlan?.thisWeek?.length ? (
        <DashboardCard title="Recommended Action Plan">
          {analytics.recommendation.actionPlan.thisWeek.map((step, i) => (
            <Text key={i} style={styles.bullet}>
              • {step}
            </Text>
          ))}
        </DashboardCard>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14, width: '100%' },
  wrapTablet: { alignSelf: 'center' },
  loadingWrap: { alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  loadingText: { color: '#6b7280', fontSize: 14 },
  errorTitle: { fontSize: 15, fontWeight: '800', color: '#334155' },
  errorText: { color: '#64748b', fontSize: 13, textAlign: 'center', lineHeight: 18 },
  retryBtn: {
    marginTop: 8,
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryBtnInline: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  // Box props only — `header` is passed to GlassPanel, so the child spacing that
  // used to live here now sits on `headerInner`.
  header: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  headerInner: { gap: 6 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#334155' },
  headerSub: { fontSize: 11, color: '#5B6779' },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  badgeBlue: {
    backgroundColor: '#EFF6FF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  badgeBlueText: { color: '#3B82F6', fontSize: 11, fontWeight: '700' },
  badgeGreen: {
    backgroundColor: '#ECFDF5',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  badgeGreenText: { color: '#10B981', fontSize: 11, fontWeight: '700' },
  warnBox: {
    backgroundColor: 'rgba(255,247,237,0.55)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fed7aa',
    padding: 10,
  },
  warnText: { color: '#9a3412', fontSize: 12 },
  cardSub: { fontSize: 11, color: '#64748b', marginTop: -4 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#334155' },
  empty: {
    height: 180,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  emptyText: { color: '#5B6779', fontSize: 13, textAlign: 'center' },
  breakdownRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 10,
    gap: 2,
    marginTop: 8,
  },
  breakdownTitle: { fontSize: 13, fontWeight: '700', color: '#1e293b' },
  breakdownMeta: { fontSize: 11, color: '#64748b', lineHeight: 16 },
  bucketBoxGreen: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
    padding: 10,
    gap: 8,
  },
  bucketTitleGreen: { fontSize: 13, fontWeight: '800', color: '#34D399' },
  bucketBoxOrange: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FED7AA',
    backgroundColor: 'rgba(255,251,235,0.55)',
    padding: 10,
    gap: 8,
  },
  bucketTitleOrange: { fontSize: 13, fontWeight: '800', color: '#FB923C' },
  bucketMeta: { fontSize: 11, color: '#64748b' },
  conceptRow: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 10,
    gap: 4,
  },
  conceptTitle: { fontSize: 13, fontWeight: '700', color: '#1e293b' },
  conceptMeta: { fontSize: 11, color: '#64748b' },
  pieWrap: {
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    backgroundColor: '#FAFBFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8EDF3',
    paddingVertical: 14,
  },
  footerGrid: { gap: 10 },
  // Box props only — footer cards are passed to GlassPanel, so the child spacing
  // that used to live here now sits on `footerCardInner`.
  footerCard: { borderRadius: 14, borderWidth: 1, padding: 14 },
  footerCardInner: { gap: 8 },
  footerBlue: { borderColor: '#BFDBFE' },
  footerGreen: { borderColor: '#BBF7D0' },
  footerTitleBlue: { fontSize: 14, fontWeight: '800', color: '#60A5FA' },
  footerTitleGreen: { fontSize: 14, fontWeight: '800', color: '#34D399' },
  metaText: { fontSize: 12, color: '#475569', lineHeight: 18 },
  orangeBold: { fontWeight: '800', color: '#ea580c', textTransform: 'capitalize' },
  greenBold: { fontWeight: '800', color: '#16a34a', textTransform: 'capitalize' },
  blueBold: { fontWeight: '800', color: '#2563eb' },
  obsBox: {
    // Fill comes from GlassPanel's blur + tint, not a solid colour.
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  obsText: { fontSize: 13, color: '#334155', lineHeight: 18 },
  bullet: { fontSize: 13, color: '#475569', lineHeight: 20 },
});
