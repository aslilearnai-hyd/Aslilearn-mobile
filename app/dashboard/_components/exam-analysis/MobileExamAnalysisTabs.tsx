import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { API_BASE_URL } from '../../../../src/lib/api-config';
import MathRenderer from '../../../../src/components/MathRenderer';
import DonutChart from '../../../../src/components/ui/charts/DonutChart';
import BarChart from '../../../../src/components/ui/charts/BarChart';
import ChartLegend from '../../../../src/components/ui/charts/ChartLegend';
import PerformanceDNARadar from '../../../../src/components/ui/charts/PerformanceDNARadar';
import StackedTaxonomyBar from '../../../../src/components/ui/charts/StackedTaxonomyBar';
import { GlassPanel } from '../../../../src/components/ui';
import AdvancedPerformanceDashboardMobile from './AdvancedPerformanceDashboardMobile';
import AnalysisCard from './AnalysisCard';
import { ANALYSIS, analysisStyles, useExamAnalysisLayout } from './exam-analysis-ui';
import {
  AiExamAnalysis,
  ExamAnalysisResult,
  QuestionFilterId,
  buildMistakeTaxonomy,
  buildPatternAlerts,
  buildPerformanceInsights,
  buildConceptPressureCards,
  getDnaSummaryMessage,
  buildQuestionFilterCounts,
  buildQuestionRowStatuses,
  buildScoreReconciliation,
  buildWeakAreas,
  classifyErrorType,
  compareAnswers,
  formatExamTime,
  generatePlanQueueItems,
  generatePlanTopics,
  getDNAScores,
  getDNAProfileLabel,
  buildQuestionDistributionSegments,
  getDisplayPercentage,
  getGradeFromResult,
  getMarksPercentage,
  strongAttemptLabel,
  resolveTotalMarks,
  getOptionText,
  getQuestionAnalysisBlocks,
  getQuestionInsightByIndex,
  getQuestionOptions,
  getQuestionTimeForIndex,
  getSpeedRatingLabel,
  getTimeXAccuracyQuadrant,
  getUserAnswerForQuestion,
  matchesQuestionFilter,
  normalizeMongoId,
  resolveAnswerTexts,
  resolveQuestionAnalysisStatus,
} from '../../../../src/lib/exam-analysis-helpers';

type TabProps = {
  result: ExamAnalysisResult;
  examTitle: string;
  studentName: string;
  aiAnalysis: AiExamAnalysis | null;
  aiLoading: boolean;
  aiError: string;
};

export function AiReportTabMobile({ result, examTitle, studentName, aiAnalysis, aiLoading, aiError }: TabProps) {
  const { isTablet } = useExamAnalysisLayout();
  const ringSize = isTablet ? 150 : 132;
  const attemptedCount = (result.correctAnswers || 0) + (result.wrongAnswers || 0);
  const totalQuestionCount =
    Number(result.totalQuestions || 0) || attemptedCount + (result.unattempted || 0);
  const accuracyRate = attemptedCount > 0 ? (result.correctAnswers / attemptedCount) * 100 : 0;
  const completionRate = totalQuestionCount > 0 ? (attemptedCount / totalQuestionCount) * 100 : 0;
  const marksPercent = getMarksPercentage(result);
  const gradeLetter = getGradeFromResult(result);

  const subjectRows = Object.entries(result.subjectWiseScore || {})
    .map(([subject, score]) => ({
      subject: subject.charAt(0).toUpperCase() + subject.slice(1),
      pct: score.total > 0 ? (score.correct / score.total) * 100 : 0,
      correct: score.correct,
      total: score.total,
    }))
    .filter((row) => row.total > 0);

  const conceptCards = useMemo(() => buildConceptPressureCards(aiAnalysis), [aiAnalysis]);

  const mistakeTaxonomy = useMemo(() => buildMistakeTaxonomy(result, aiAnalysis), [result, aiAnalysis]);
  const scoreReconciliation = useMemo(() => buildScoreReconciliation(result), [result]);
  const questionStatuses = useMemo(() => buildQuestionRowStatuses(result, aiAnalysis), [result, aiAnalysis]);
  const wrongQuickCount = useMemo(
    () => questionStatuses.filter((s) => s.isWrongQuick).length,
    [questionStatuses]
  );

  const examTotalMarks = useMemo(() => resolveTotalMarks(result), [result]);

  const reconciliation = useMemo(() => {
    const net = scoreReconciliation.net;
    const total = Math.max(1, Math.round(examTotalMarks));
    const earned = scoreReconciliation.marksEarned;
    const neg = scoreReconciliation.negativePenalty;
    const maxBar = Math.max(earned, total, 1);
    return {
      earned,
      neg,
      net,
      earnedPct: (earned / maxBar) * 100,
      negPct: Math.max(neg > 0 ? 4 : 0, (neg / maxBar) * 100),
      netPct: (net / maxBar) * 100,
      costPerWrong: scoreReconciliation.costPerWrong,
    };
  }, [examTotalMarks, scoreReconciliation]);

  const potentialMetrics = useMemo(() => {
    const net = reconciliation.net;
    const total = Math.max(0, Math.round(examTotalMarks));
    const wrong = result.wrongAnswers || 0;
    let swing = 0;
    if (wrong > 0) {
      swing = Math.round(scoreReconciliation.marksNotEarnedOnWrong + scoreReconciliation.negativePenalty);
      if (swing <= 0) swing = Math.round(Math.max(0, total - net));
    }
    return { net, total, wrong, swing, ceiling: Math.min(total, net + swing) };
  }, [reconciliation, examTotalMarks, result.wrongAnswers, scoreReconciliation]);

  const planSteps = [
    ...(aiAnalysis?.actionPlan?.today || []),
    ...(aiAnalysis?.actionPlan?.thisWeek || []),
    ...(aiAnalysis?.actionPlan?.beforeNextExam || []),
  ].filter(Boolean).slice(0, 4);

  const summaryParagraphs = useMemo(() => {
    const name = studentName.split(' ')[0] || studentName;
    const lead = [
      `${name}, you scored ${result.obtainedMarks || 0} / ${examTotalMarks} marks on this attempt (${marksPercent.toFixed(1)}% of total marks).`,
      `${attemptedCount} of ${totalQuestionCount} questions attempted (${completionRate.toFixed(0)}% completion).`,
      `Accuracy on attempted questions was ${accuracyRate.toFixed(1)}%.`,
    ];
    if (aiAnalysis?.summary) {
      const parts = aiAnalysis.summary
        .split(/\n\n+/)
        .map((s) => s.replace(/\s+/g, ' ').trim())
        .filter((s) => s.length > 20)
        .slice(0, 3);
      return [...lead, ...parts];
    }
    return lead;
  }, [aiAnalysis, studentName, result, examTotalMarks, marksPercent, attemptedCount, totalQuestionCount, completionRate, accuracyRate]);

  const statsBoxes = (
    <View style={[panelStyles.statsRow3, isTablet && panelStyles.statsRow3Tablet]}>
      <View style={[panelStyles.statBox, { backgroundColor: '#ECFDF5', borderColor: '#BBF7D0' }]}>
        <Text style={[panelStyles.statVal, { color: '#34D399' }]}>{result.correctAnswers || 0}</Text>
        <Text style={panelStyles.statLab}>Correct</Text>
      </View>
      <View style={[panelStyles.statBox, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
        <Text style={[panelStyles.statVal, { color: '#F87171' }]}>{result.wrongAnswers || 0}</Text>
        <Text style={panelStyles.statLab}>Wrong</Text>
      </View>
      <View style={[panelStyles.statBox, { backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }]}>
        <Text style={[panelStyles.statVal, { color: '#64748b' }]}>{result.unattempted || 0}</Text>
        <Text style={panelStyles.statLab}>Skipped</Text>
      </View>
    </View>
  );

  const progressSection = (
    <View style={[panelStyles.progressSection, isTablet && panelStyles.progressSectionTablet]}>
      <View style={panelStyles.progressBlock}>
        <View style={panelStyles.progressRow}>
          <Text style={panelStyles.progressLabel}>Accuracy Rate</Text>
          <Text style={panelStyles.progressPct}>{accuracyRate.toFixed(1)}%</Text>
        </View>
        <View style={panelStyles.progressTrack}>
          <View style={[panelStyles.progressFill, { width: `${Math.min(100, accuracyRate)}%` }]} />
        </View>
      </View>
      <View style={panelStyles.progressBlock}>
        <View style={panelStyles.progressRow}>
          <Text style={panelStyles.progressLabel}>Completion Rate</Text>
          <Text style={panelStyles.progressPct}>{completionRate.toFixed(0)}%</Text>
        </View>
        <View style={panelStyles.progressTrack}>
          <View style={[panelStyles.progressFillPink, { width: `${Math.min(100, completionRate)}%` }]} />
        </View>
      </View>
    </View>
  );

  const timeBox = (
    <View style={panelStyles.timeBox}>
      <Ionicons name="time-outline" size={18} color="#2563eb" />
      <Text style={panelStyles.timeLabel}>Time Taken</Text>
      <Text style={panelStyles.timeVal}>{formatExamTime(result.timeTaken)}</Text>
    </View>
  );

  const scoreRing = (
    <View style={panelStyles.scoreRingCol}>
      <View style={panelStyles.scoreRingWrap}>
        <DonutChart
          size={ringSize}
          segments={[
            { value: Math.max(0.5, marksPercent), color: '#9333EA' },
            { value: Math.max(0.5, 100 - marksPercent), color: '#ECEEF3' },
          ]}
        />
        <View style={[panelStyles.scoreRingCenter, { width: ringSize, height: ringSize }]}>
          <Text style={[panelStyles.scoreRingMarks, isTablet && panelStyles.scoreRingMarksTablet]}>
            {result.obtainedMarks || 0}
          </Text>
          <Text style={panelStyles.scoreRingTotal}>/ {examTotalMarks}</Text>
          <Text style={panelStyles.scoreRingGrade}>Grade {gradeLetter}</Text>
        </View>
      </View>
      <View style={panelStyles.attemptBadge}>
        <Text style={panelStyles.attemptBadgeText}>{strongAttemptLabel(marksPercent)}</Text>
      </View>
    </View>
  );

  return (
    <ScrollView
      style={panelStyles.tabScroll}
      contentContainerStyle={[analysisStyles.scrollContent, isTablet && analysisStyles.scrollContentTablet]}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
    >
      <View style={panelStyles.performanceReportWrap}>
        <LinearGradient colors={[...ANALYSIS.gradientHero]} style={analysisStyles.hero}>
          <Text style={analysisStyles.heroEyebrow}>{examTitle || result.examTitle || 'Exam'} · {totalQuestionCount} Qs</Text>
          <Text style={analysisStyles.heroTitle}>Performance Report</Text>
          <Text style={analysisStyles.heroSub}>Personalised For {studentName}</Text>
        </LinearGradient>

        <GlassPanel style={panelStyles.scoreCardBody} radius={20} tone="strong">
        {isTablet ? (
          <View style={panelStyles.scoreCardTablet}>
            {scoreRing}
            <View style={panelStyles.scoreCardTabletMid}>
              <Text style={panelStyles.scoreBigTablet}>{result.obtainedMarks || 0}</Text>
              <Text style={panelStyles.scoreDenomTablet}>Out Of {examTotalMarks} Marks (Net)</Text>
              <Text style={panelStyles.scoreRingPct}>{marksPercent.toFixed(1)}% Score</Text>
              {statsBoxes}
            </View>
            <View style={panelStyles.scoreCardTabletEnd}>
              {progressSection}
              {timeBox}
            </View>
          </View>
        ) : (
          <>
            <View style={panelStyles.scoreRingRow}>
              {scoreRing}
              <View style={panelStyles.scoreRingMeta}>
                <Text style={panelStyles.scoreBig}>{result.obtainedMarks || 0}</Text>
                <Text style={panelStyles.scoreDenom}>Out Of {examTotalMarks} Marks (Net)</Text>
                <Text style={panelStyles.scoreRingPct}>{marksPercent.toFixed(1)}% Score</Text>
              </View>
            </View>
            {statsBoxes}
            {progressSection}
            <View style={panelStyles.scoreFooterSection}>{timeBox}</View>
          </>
        )}
        </GlassPanel>
      </View>

      {aiError ? <Text style={panelStyles.errorText}>{aiError}</Text> : null}
      {aiLoading && !aiAnalysis?.summary ? (
        <View style={panelStyles.loadingRow}>
          <ActivityIndicator color="#9333ea" />
          <Text style={panelStyles.loadingText}>Generating AI Report…</Text>
        </View>
      ) : null}

      <AnalysisCard title="AI Performance Snapshot" icon="pie-chart" accent={ANALYSIS.accent}>
        <View style={panelStyles.chartCenter}>
          <DonutChart
            size={140}
            centerLabel={String(totalQuestionCount)}
            segments={buildQuestionDistributionSegments(result)}
          />
          <ChartLegend
            items={[
              { color: '#10b981', label: 'Correct', value: result.correctAnswers || 0 },
              { color: '#ef4444', label: 'Wrong', value: result.wrongAnswers || 0 },
              { color: '#9ca3af', label: 'Skipped', value: result.unattempted || 0 },
            ]}
          />
        </View>
        <View style={[panelStyles.snapshotGrid, isTablet && panelStyles.snapshotGridTablet]}>
          {[
            { l: 'Attempted', v: String(attemptedCount), c: '#059669' },
            { l: 'Unattempted', v: String(result.unattempted || 0), c: '#2563eb' },
            { l: 'Wrong', v: String(result.wrongAnswers || 0), c: '#dc2626' },
            { l: 'Accuracy', v: `${accuracyRate.toFixed(0)}%`, c: '#9333ea' },
          ].map((cell) => (
            <View key={cell.l} style={[panelStyles.snapshotCell, isTablet && panelStyles.snapshotCellTablet]}>
              <Text style={panelStyles.snapshotLab}>{cell.l}</Text>
              <Text style={[panelStyles.snapshotVal, { color: cell.c }]}>{cell.v}</Text>
            </View>
          ))}
        </View>
      </AnalysisCard>

      <AnalysisCard title="Score Reconciliation" icon="calculator-outline" accent="#0EA5E9">
        {[
          { lab: 'Marks Earned', pct: reconciliation.earnedPct, val: `+${reconciliation.earned}`, color: '#16a34a' },
          { lab: 'Negative Penalty', pct: reconciliation.negPct, val: `−${reconciliation.neg}`, color: '#dc2626' },
          { lab: 'Final Score (Net)', pct: reconciliation.netPct, val: String(reconciliation.net), color: '#9333ea' },
        ].map((row) => (
          <View key={row.lab} style={panelStyles.reconRow}>
            <Text style={panelStyles.reconLabel}>{row.lab}</Text>
            <View style={panelStyles.reconTrack}>
              <View style={[panelStyles.reconFill, { width: `${Math.min(100, row.pct)}%`, backgroundColor: row.color }]} />
            </View>
            <Text style={[panelStyles.reconVal, { color: row.color }]}>{row.val}</Text>
          </View>
        ))}
        <Text style={panelStyles.reconNote}>
          Net {reconciliation.net} of {examTotalMarks}: {reconciliation.earned} from correct answers minus{' '}
          {reconciliation.neg} negative marking
          {(result.wrongAnswers || 0) > 0
            ? ` (~${reconciliation.costPerWrong} marks impact per wrong answer).`
            : '.'}
        </Text>
      </AnalysisCard>

      <View style={panelStyles.potentialBox}>
        <View style={panelStyles.potentialHeadline}>
          <Text style={panelStyles.potentialBig}>
            {potentialMetrics.wrong > 0 ? `+${potentialMetrics.swing}` : String(potentialMetrics.net)}
          </Text>
          {potentialMetrics.wrong > 0 ? (
            <Text style={panelStyles.potentialCaption}>Marks Recoverable</Text>
          ) : null}
        </View>
        <Text style={panelStyles.potentialBody}>
          <Text style={panelStyles.potentialBodyStrong}>
            You scored {potentialMetrics.net}/{potentialMetrics.total} marks.
          </Text>
          {potentialMetrics.wrong > 0
            ? ` Fixing your ${potentialMetrics.wrong} wrong answer${potentialMetrics.wrong === 1 ? '' : 's'} could recover up to +${potentialMetrics.swing} marks (potential ${potentialMetrics.ceiling}/${potentialMetrics.total}).`
            : ' No marks left on the table from wrong answers.'}
        </Text>
      </View>

      <AnalysisCard title="Marks-Lost Analysis" icon="trending-down" accent={ANALYSIS.wrong}>
        <StackedTaxonomyBar taxonomy={mistakeTaxonomy} />
        <View style={panelStyles.taxonomyGrid}>
          {[
            { label: 'Silly Slips', count: mistakeTaxonomy.careless },
            { label: 'Conceptual Gaps', count: mistakeTaxonomy.conceptual },
            { label: 'Procedural', count: mistakeTaxonomy.procedural },
            { label: 'Time Pressure', count: mistakeTaxonomy.time },
          ].map((item) => (
            <View key={item.label} style={[panelStyles.taxonomyCell, isTablet && panelStyles.taxonomyCellTablet]}>
              <Text style={panelStyles.taxonomyCount}>{item.count}</Text>
              <Text style={panelStyles.taxonomyLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
        {wrongQuickCount > 0 ? (
          <Text style={panelStyles.metaText}>{wrongQuickCount} wrong-quick answer(s) detected under 30s.</Text>
        ) : null}
      </AnalysisCard>

      {subjectRows.length > 0 && (
        <AnalysisCard title="Subject Mastery" icon="school" accent={ANALYSIS.purple}>
          <BarChart
            data={subjectRows.map((row) => ({
              label: isTablet ? row.subject : row.subject.slice(0, 4),
              value: Math.round(row.pct),
              color: row.pct >= 80 ? '#16a34a' : row.pct >= 60 ? '#2563eb' : '#ea580c',
            }))}
            height={isTablet ? 220 : 180}
            maxValue={100}
          />
          {subjectRows.map((row) => (
            <View key={row.subject} style={panelStyles.subjectRow}>
              <Text style={panelStyles.subjectName}>{row.subject}</Text>
              <View style={panelStyles.subjectBarTrack}>
                <View style={[panelStyles.subjectBarFill, { width: `${Math.max(8, row.pct)}%` }]} />
              </View>
              <Text style={panelStyles.subjectPct}>{row.correct}/{row.total}</Text>
            </View>
          ))}
        </AnalysisCard>
      )}

      {conceptCards.length > 0 && (
        <AnalysisCard title="Concept Pressure Points" icon="flash" accent="#F59E0B">
          {conceptCards.map((c, i) => (
            <View key={`${c.tag}-${c.name}-${i}`} style={panelStyles.conceptCard}>
              <Text style={panelStyles.conceptTag}>{c.tag}</Text>
              <Text style={panelStyles.conceptTitle}>{c.name}</Text>
              <Text style={panelStyles.conceptMeta}>{c.meta}</Text>
            </View>
          ))}
        </AnalysisCard>
      )}

      <AnalysisCard title="Personalised Improvement Plan" icon="rocket" accent={ANALYSIS.correct}>
        {(planSteps.length > 0 ? planSteps : [
          'Recall drill on your weakest chapters.',
          'Slow down on answers under 30s.',
          'Redo each wrong question blind.',
          'Take a timed mixed set.',
        ]).map((step, i) => (
          <View key={i} style={panelStyles.planStep}>
            <View style={panelStyles.planNum}><Text style={panelStyles.planNumText}>{i + 1}</Text></View>
            <Text style={panelStyles.planStepText}>{step}</Text>
          </View>
        ))}
      </AnalysisCard>

      <AnalysisCard title="Vidya Performance Report" icon="document-text" accent={ANALYSIS.purple}>
        {summaryParagraphs.map((p, i) => (
          <Text key={i} style={panelStyles.reportPara}>{p}</Text>
        ))}
        <View style={panelStyles.motivationBox}>
          <Text style={panelStyles.motivationText}>
            {aiAnalysis?.motivation || 'Deep, consistent practice beats intensity spikes — small daily wins compound.'}
          </Text>
        </View>
      </AnalysisCard>
    </ScrollView>
  );
}

function QuestionAnalysisSection({
  questionIndex,
  question,
  result,
  aiAnalysis,
  aiLoading,
}: {
  questionIndex: number;
  question: any;
  result: ExamAnalysisResult;
  aiAnalysis: AiExamAnalysis | null;
  aiLoading: boolean;
}) {
  const item = getQuestionInsightByIndex(questionIndex, question, aiAnalysis);
  const blocks = getQuestionAnalysisBlocks(questionIndex, question, aiAnalysis, result.answers);
  const status = resolveQuestionAnalysisStatus(questionIndex, question, result.answers, aiAnalysis);
  const isCorrect = status === 'correct';
  const isWrong = status === 'wrong';

  const shellStyle = isCorrect
    ? panelStyles.analysisCorrect
    : isWrong
      ? panelStyles.analysisWrong
      : panelStyles.analysisNeutral;
  const titleStyle = isCorrect
    ? panelStyles.analysisTitleCorrect
    : isWrong
      ? panelStyles.analysisTitleWrong
      : panelStyles.analysisTitleNeutral;
  const bodyStyle = isCorrect
    ? panelStyles.analysisBodyCorrect
    : isWrong
      ? panelStyles.analysisBodyWrong
      : panelStyles.analysisBodyNeutral;

  return (
    <View style={[panelStyles.analysisShell, shellStyle]}>
      <Text style={[panelStyles.analysisHeading, titleStyle]}>Question Analysis</Text>
      {item ? (
        <>
          <View style={panelStyles.analysisMetaRow}>
            <Text style={titleStyle}>Q{questionIndex + 1}</Text>
            <View style={panelStyles.analysisBadges}>
              <View style={[panelStyles.statusBadge, isCorrect ? panelStyles.badgeCorrect : isWrong ? panelStyles.badgeWrong : panelStyles.badgeNeutral]}>
                <Text style={panelStyles.statusBadgeText}>{status}</Text>
              </View>
              <View style={panelStyles.priorityBadge}>
                <Text style={panelStyles.priorityBadgeText}>{String(item.priority || 'medium')}</Text>
              </View>
            </View>
          </View>
          {aiLoading && blocks.length === 0 ? (
            <View style={panelStyles.analysisLoading}>
              <ActivityIndicator size="small" color="#7c3aed" />
              <Text style={panelStyles.metaText}>Loading Explanation…</Text>
            </View>
          ) : blocks.length > 0 ? (
            blocks.map((block, bi) => (
              <Text key={bi} style={[panelStyles.analysisBlock, bodyStyle]}>{block}</Text>
            ))
          ) : (
            <Text style={[panelStyles.analysisBlock, bodyStyle, { opacity: 0.8 }]}>
              No explanation available for this question.
            </Text>
          )}
        </>
      ) : aiLoading ? (
        <View style={panelStyles.analysisLoading}>
          <ActivityIndicator size="small" color="#7c3aed" />
          <Text style={panelStyles.metaText}>Loading Question Analysis…</Text>
        </View>
      ) : (
        <Text style={panelStyles.metaText}>Open this question after the report finishes loading.</Text>
      )}
    </View>
  );
}

export function QuestionsTabMobile({
  result,
  aiAnalysis,
  aiLoading = false,
}: {
  result: ExamAnalysisResult;
  aiAnalysis: AiExamAnalysis | null;
  aiLoading?: boolean;
}) {
  const { isTablet, isWide } = useExamAnalysisLayout();
  const questionCardWidth = isWide ? '31.5%' : isTablet ? '48.5%' : '100%';
  const [filter, setFilter] = useState<QuestionFilterId>('all');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const questions = result.questions || [];
  const totalQuestionCount =
    Number(result.totalQuestions || 0) ||
    (result.correctAnswers || 0) + (result.wrongAnswers || 0) + (result.unattempted || 0);
  const avgTimePerQuestion = totalQuestionCount > 0 ? Math.floor(result.timeTaken / totalQuestionCount) : 60;

  const questionStatuses = useMemo(
    () => buildQuestionRowStatuses(result, aiAnalysis),
    [result, aiAnalysis]
  );

  const counts = useMemo(() => buildQuestionFilterCounts(questionStatuses), [questionStatuses]);

  const filteredIndices = useMemo(() => {
    return questions
      .map((_, index) => index)
      .filter((index) => matchesQuestionFilter(filter, questionStatuses[index] || {
        attempted: false,
        correct: false,
        isWrongQuick: false,
        isHardWrong: false,
        isTimePressure: false,
      }));
  }, [questions, filter, questionStatuses]);

  const selectedQuestion = selectedIndex != null ? questions[selectedIndex] : null;

  const filterOptions: { id: QuestionFilterId; label: string }[] = [
    { id: 'all', label: `All · ${counts.all}` },
    { id: 'correct', label: `Correct · ${counts.correct}` },
    { id: 'wrong', label: `Wrong · ${counts.wrong}` },
    { id: 'skipped', label: `Skipped · ${counts.skipped}` },
    { id: 'wrong-quick', label: `⚡ Wrong-Quick · ${counts.wrongQuick}` },
    { id: 'hard-wrong', label: `Hard+Wrong · ${counts.hardWrong}` },
    { id: 'time-pressure', label: `⏱ Time-Pressure · ${counts.timePressure}` },
  ];

  const filterPills = filterOptions.map((pill) => (
    <TouchableOpacity
      key={pill.id}
      style={[
        analysisStyles.filterPill,
        panelStyles.filterPillWrap,
        filter === pill.id && analysisStyles.filterPillActive,
      ]}
      onPress={() => setFilter(pill.id)}
    >
      <Text style={[analysisStyles.filterPillText, filter === pill.id && analysisStyles.filterPillTextActive]}>
        {pill.label}
      </Text>
    </TouchableOpacity>
  ));

  return (
    <View style={panelStyles.questionsTabRoot}>
      {isTablet ? (
        <View style={[panelStyles.filterRowModern, panelStyles.filterRowTablet, analysisStyles.headerConstrained]}>
          {filterPills}
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={panelStyles.filterScroll}
          contentContainerStyle={[panelStyles.filterRowModern, panelStyles.filterRowContent]}
        >
          {filterPills}
        </ScrollView>
      )}

      <ScrollView
        style={panelStyles.questionsTabScroll}
        contentContainerStyle={[analysisStyles.scrollContent, isTablet && analysisStyles.scrollContentTablet]}
        showsVerticalScrollIndicator={false}
      >
        {filteredIndices.length === 0 ? (
          <Text style={[panelStyles.emptyText, panelStyles.emptyTextFull]}>No questions match this filter.</Text>
        ) : (
          <View style={[panelStyles.questionsList, isTablet && panelStyles.questionsListTablet]}>
          {filteredIndices.map((index) => {
            const question = questions[index];
            const ua = getUserAnswerForQuestion(question, index, result.answers);
            const attempted = ua !== undefined && ua !== null && ua !== '';
            const correct = compareAnswers(question, ua, question.correctAnswer);
            const timeSeconds = getQuestionTimeForIndex(question, index, ua, result);
            const qi = aiAnalysis?.questionInsights?.find((x) => x.index === index + 1 || x.index === index);
            const errType = classifyErrorType(question, ua, timeSeconds, {
              isCorrect: correct,
              isAttempted: attempted,
              avgTime: avgTimePerQuestion || 60,
              aiInsight: qi?.insight,
            });
            const qText = getOptionText(question.questionText || question.question, question.subject);
            return (
              <TouchableOpacity
                key={index}
                style={[
                  panelStyles.questionCard,
                  isTablet && { width: questionCardWidth, marginBottom: 0 },
                  correct ? panelStyles.qCorrect : attempted ? panelStyles.qWrong : panelStyles.qSkipped,
                ]}
                onPress={() => setSelectedIndex(index)}
              >
                <View style={panelStyles.qHeader}>
                  <Text style={panelStyles.qNum}>Q{index + 1}</Text>
                  <Ionicons
                    name={correct ? 'checkmark-circle' : attempted ? 'close-circle' : 'ellipse-outline'}
                    size={18}
                    color={correct ? '#10b981' : attempted ? '#ef4444' : '#9ca3af'}
                  />
                  <Text style={panelStyles.qSubject}>{String(question.subject || 'General')}</Text>
                  {timeSeconds != null ? (
                    <Text style={panelStyles.qTime}>{formatExamTime(timeSeconds)}</Text>
                  ) : null}
                </View>
                <MathRenderer formula={qText} style={panelStyles.qText} />
                {errType ? (
                  <Text style={panelStyles.qErrorTag}>
                    {errType === 'careless' ? 'Careless' : errType === 'conceptual' ? 'Conceptual' : errType === 'time-pressure' ? 'Time Pressure' : 'Reading'}
                  </Text>
                ) : null}
              </TouchableOpacity>
            );
          })}
          </View>
        )}
      </ScrollView>

      <Modal visible={selectedIndex != null} animationType="slide" onRequestClose={() => setSelectedIndex(null)}>
        <View style={[panelStyles.modalWrap, isTablet && panelStyles.modalWrapTablet]}>
          <View style={[panelStyles.modalSheet, isTablet && panelStyles.modalSheetTablet]}>
          {selectedQuestion && selectedIndex != null && (() => {
            const ua = getUserAnswerForQuestion(selectedQuestion, selectedIndex, result.answers);
            const userAnswerTexts = resolveAnswerTexts(selectedQuestion, ua);
            const correctAnswerTexts = resolveAnswerTexts(selectedQuestion, selectedQuestion.correctAnswer);
            const options = getQuestionOptions(selectedQuestion);
            const qImage = selectedQuestion.questionImage
              ? String(selectedQuestion.questionImage).startsWith('http')
                ? String(selectedQuestion.questionImage)
                : `${API_BASE_URL}${selectedQuestion.questionImage}`
              : null;
            const solutionText = getOptionText(selectedQuestion.explanation, selectedQuestion.subject);
            const insight = getQuestionInsightByIndex(selectedIndex, selectedQuestion, aiAnalysis);
            const geminiSolution = insight?.geminiExplanation
              ? getOptionText(insight.geminiExplanation, selectedQuestion.subject)
              : '';

            return (
              <ScrollView contentContainerStyle={panelStyles.modalBody}>
                <View style={panelStyles.modalHeader}>
                  <Text style={panelStyles.modalTitle}>Question {selectedIndex + 1}</Text>
                  <TouchableOpacity onPress={() => setSelectedIndex(null)}>
                    <Ionicons name="close" size={24} color="#111827" />
                  </TouchableOpacity>
                </View>

                <View style={panelStyles.modalBadgeRow}>
                  <View style={panelStyles.subjectBadge}>
                    <Text style={panelStyles.subjectBadgeText}>
                      {String(selectedQuestion.subject || 'General')}
                    </Text>
                  </View>
                  <View style={panelStyles.marksBadge}>
                    <Text style={panelStyles.marksBadgeText}>{selectedQuestion.marks || 0} marks</Text>
                  </View>
                </View>

                <MathRenderer
                  formula={getOptionText(selectedQuestion.questionText || selectedQuestion.question, selectedQuestion.subject)}
                  style={panelStyles.modalQText}
                />

                {qImage ? (
                  <Image source={{ uri: qImage }} style={panelStyles.questionImage} resizeMode="contain" />
                ) : null}

                {selectedQuestion.questionType === 'mcq' && options.length > 0 ? (
                  <View style={panelStyles.optionsBlock}>
                    {options.map((opt: { text: string; index: number; letter: string }) => {
                      const isUser = userAnswerTexts.includes(opt.text);
                      const isRight = correctAnswerTexts.includes(opt.text);
                      const isCorrectSelection = isUser && isRight;
                      return (
                        <View
                          key={opt.index}
                          style={[
                            panelStyles.optionRowDetailed,
                            isCorrectSelection
                              ? panelStyles.optionCorrectSelected
                              : isRight
                                ? panelStyles.optionCorrect
                                : isUser
                                  ? panelStyles.optionWrong
                                  : null,
                          ]}
                        >
                          <Text style={panelStyles.optionLetter}>{opt.letter}.</Text>
                          <View style={{ flex: 1 }}>
                            <MathRenderer formula={opt.text} style={panelStyles.optionText} />
                          </View>
                          {isCorrectSelection ? (
                            <Text style={panelStyles.optionYourAnswerBadge}>Your answer</Text>
                          ) : null}
                          {isRight || isCorrectSelection ? (
                            <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
                          ) : null}
                          {isUser && !isRight ? <Ionicons name="close-circle" size={20} color="#dc2626" /> : null}
                        </View>
                      );
                    })}
                  </View>
                ) : null}

                <View style={panelStyles.answerCardsRow}>
                  <View style={panelStyles.yourAnswerCard}>
                    <Text style={panelStyles.answerCardLabel}>Your Answer</Text>
                    <MathRenderer
                      formula={userAnswerTexts.length > 0 ? userAnswerTexts.join(', ') : 'Not Attempted'}
                      style={panelStyles.answerCardValue}
                    />
                  </View>
                  <View style={panelStyles.correctAnswerCard}>
                    <Text style={panelStyles.answerCardLabelGreen}>Correct Answer</Text>
                    <MathRenderer
                      formula={correctAnswerTexts.length > 0 ? correctAnswerTexts.join(', ') : 'N/A'}
                      style={panelStyles.answerCardValueGreen}
                    />
                  </View>
                </View>

                <View style={panelStyles.solutionBox}>
                  <Text style={panelStyles.solutionTitle}>Solution</Text>
                  <MathRenderer
                    formula={solutionText || geminiSolution || 'Solution not provided for this question.'}
                    style={panelStyles.solutionText}
                  />
                </View>

                <QuestionAnalysisSection
                  questionIndex={selectedIndex}
                  question={selectedQuestion}
                  result={result}
                  aiAnalysis={aiAnalysis}
                  aiLoading={aiLoading}
                />
              </ScrollView>
            );
          })()}
          </View>
        </View>
      </Modal>
    </View>
  );
}

export function AdvancedTabMobile({
  examId,
  resultId,
  result,
  aiAnalysis,
}: {
  examId: string;
  resultId?: string;
  result?: ExamAnalysisResult;
  aiAnalysis?: AiExamAnalysis | null;
}) {
  const { isTablet } = useExamAnalysisLayout();
  const mistakeTaxonomy = useMemo(
    () => (result ? buildMistakeTaxonomy(result, aiAnalysis || null) : null),
    [result, aiAnalysis]
  );
  const marksLost = result
    ? Math.max(0, (result.totalMarks || 0) - (result.obtainedMarks || 0))
    : 0;

  return (
    <ScrollView
      style={panelStyles.tabScroll}
      contentContainerStyle={[analysisStyles.scrollContent, isTablet && analysisStyles.scrollContentTablet]}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
      keyboardShouldPersistTaps="handled"
    >
      {mistakeTaxonomy && result ? (
        <AnalysisCard title="Mistake Taxonomy" icon="analytics" accent={ANALYSIS.wrong}>
          <Text style={panelStyles.metaText}>
            How the {result.wrongAnswers || 0} wrong answers break down · {marksLost} marks lost
          </Text>
          <StackedTaxonomyBar taxonomy={mistakeTaxonomy} />
          <View style={panelStyles.taxonomyGrid}>
            {[
              { label: 'Careless', count: mistakeTaxonomy.careless },
              { label: 'Conceptual', count: mistakeTaxonomy.conceptual },
              { label: 'Procedural', count: mistakeTaxonomy.procedural },
              { label: 'Time', count: mistakeTaxonomy.time },
              { label: 'Reading', count: mistakeTaxonomy.reading },
            ].map((item) => (
              <View key={item.label} style={[panelStyles.taxonomyCell, isTablet && panelStyles.taxonomyCellTablet]}>
                <Text style={panelStyles.taxonomyCount}>{item.count}</Text>
                <Text style={panelStyles.taxonomyLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </AnalysisCard>
      ) : null}

      <AdvancedPerformanceDashboardMobile examId={examId} resultId={resultId} />
    </ScrollView>
  );
}

function DnaBar({ label, value }: { label: string; value: number }) {
  return (
    <View style={panelStyles.dnaRow}>
      <Text style={panelStyles.dnaLabel}>{label}</Text>
      <View style={panelStyles.dnaTrack}>
        <View style={[panelStyles.dnaFill, { width: `${Math.min(100, Math.max(0, value))}%` }]} />
      </View>
      <Text style={panelStyles.dnaPct}>{Math.round(value)}%</Text>
    </View>
  );
}

function DistributionBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <View style={panelStyles.distRow}>
      <Text style={panelStyles.distLabel}>{label}</Text>
      <View style={panelStyles.distTrack}>
        <View style={[panelStyles.distFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={panelStyles.distCount}>{count}</Text>
    </View>
  );
}

export function InsightsTabMobile({ result, aiAnalysis }: { result: ExamAnalysisResult; aiAnalysis: AiExamAnalysis | null }) {
  const { isTablet, isWide } = useExamAnalysisLayout();
  const mistakeTaxonomy = useMemo(() => buildMistakeTaxonomy(result, aiAnalysis), [result, aiAnalysis]);
  const insights = useMemo(
    () => buildPerformanceInsights(result, aiAnalysis),
    [result, aiAnalysis]
  );
  const patternAlerts = useMemo(
    () => buildPatternAlerts(result, aiAnalysis, mistakeTaxonomy),
    [result, aiAnalysis, mistakeTaxonomy]
  );
  const weakAreas = buildWeakAreas(result);
  const displayPercentage = getDisplayPercentage(result);
  const totalQuestionCount =
    Number(result.totalQuestions || 0) ||
    (result.correctAnswers || 0) + (result.wrongAnswers || 0) + (result.unattempted || 0);
  const avgTimePerQuestion = totalQuestionCount > 0 ? Math.floor(result.timeTaken / totalQuestionCount) : 0;
  const dnaScores = useMemo(() => getDNAScores(result, aiAnalysis), [result, aiAnalysis]);
  const dnaProfileLabel = useMemo(
    () => getDNAProfileLabel(dnaScores, displayPercentage, avgTimePerQuestion),
    [dnaScores, displayPercentage, avgTimePerQuestion]
  );
  const timeQuadrant = useMemo(() => getTimeXAccuracyQuadrant(result), [result]);
  const speedRatingLabel = getSpeedRatingLabel(result);

  return (
    <ScrollView
      style={panelStyles.tabScroll}
      contentContainerStyle={[analysisStyles.scrollContent, isTablet && analysisStyles.scrollContentTablet]}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
    >
      <View style={isWide ? panelStyles.insightsTopRow : undefined}>
      <View style={isWide ? panelStyles.insightsTopCol : undefined}>
      <AnalysisCard title="Question Distribution" icon="pie-chart-outline" accent={ANALYSIS.accent}>
        <View style={panelStyles.chartCenter}>
          <DonutChart
            size={150}
            centerLabel={`${totalQuestionCount}`}
            segments={buildQuestionDistributionSegments(result)}
          />
          <ChartLegend
            items={[
              { color: '#10b981', label: 'Correct', value: result.correctAnswers || 0 },
              { color: '#ef4444', label: 'Wrong', value: result.wrongAnswers || 0 },
              { color: '#9ca3af', label: 'Unattempted', value: result.unattempted || 0 },
            ]}
          />
        </View>
        <DistributionBar label="Correct" count={result.correctAnswers || 0} total={totalQuestionCount} color="#10b981" />
        <DistributionBar label="Wrong" count={result.wrongAnswers || 0} total={totalQuestionCount} color="#ef4444" />
        <DistributionBar label="Unattempted" count={result.unattempted || 0} total={totalQuestionCount} color="#9ca3af" />
      </AnalysisCard>
      </View>

      <View style={isWide ? panelStyles.insightsTopCol : undefined}>
      <AnalysisCard title="Performance DNA" icon="git-network" accent={ANALYSIS.purple}>
        <PerformanceDNARadar scores={dnaScores} size={260} />
        <DnaBar label="Accuracy" value={dnaScores.accuracy} />
        <DnaBar label="Speed" value={dnaScores.speed} />
        <DnaBar label="Concept" value={dnaScores.concept} />
        <DnaBar label="Difficulty" value={dnaScores.difficulty} />
        <DnaBar label="Consistency" value={dnaScores.consistency} />
        <View style={panelStyles.dnaBadge}>
          <Text style={panelStyles.dnaBadgeText}>{dnaProfileLabel}</Text>
        </View>
        <Text style={panelStyles.metaText}>
          {getDnaSummaryMessage(dnaScores, dnaProfileLabel, result)}
        </Text>
      </AnalysisCard>
      </View>
      </View>

      <AnalysisCard title="Time Intelligence" icon="timer" accent="#0EA5E9">
        <View style={panelStyles.timeIntelHero}>
          <Text style={panelStyles.timeIntelBig}>{formatExamTime(result.timeTaken)}</Text>
          <Text style={panelStyles.metaText}>Total Time Taken</Text>
        </View>
        <View style={panelStyles.timeIntelGrid}>
          <View style={panelStyles.timeIntelCell}>
            <Text style={panelStyles.timeIntelVal}>{formatExamTime(avgTimePerQuestion)}</Text>
            <Text style={panelStyles.metaText}>Avg Per Question</Text>
          </View>
          <View style={panelStyles.timeIntelCell}>
            <Text style={panelStyles.timeIntelVal}>{speedRatingLabel}</Text>
            <Text style={panelStyles.metaText}>Speed Rating</Text>
          </View>
        </View>
        <Text style={panelStyles.queueHeading}>Time × Accuracy Quadrant</Text>
        <View style={panelStyles.quadrantGrid}>
          {[
            { label: 'Fast + Wrong', val: timeQuadrant.fastWrong, bg: '#fef2f2', color: '#b91c1c' },
            { label: 'Fast + Right', val: timeQuadrant.fastRight, bg: '#ecfdf5', color: '#047857' },
            { label: 'Slow + Wrong', val: timeQuadrant.slowWrong, bg: '#fff7ed', color: '#c2410c' },
            { label: 'Slow + Right', val: timeQuadrant.slowRight, bg: '#eff6ff', color: '#1d4ed8' },
          ].map((cell) => (
            <View key={cell.label} style={[panelStyles.quadrantCell, { backgroundColor: cell.bg }]}>
              <Text style={[panelStyles.quadrantVal, { color: cell.color }]}>{cell.val}</Text>
              <Text style={panelStyles.metaText}>{cell.label}</Text>
            </View>
          ))}
        </View>
      </AnalysisCard>

      <Text style={panelStyles.sectionHeading}>Subject-Wise Performance</Text>
      <View style={[panelStyles.subjectGrid, isTablet && panelStyles.subjectGridTablet]}>
        {Object.entries(result.subjectWiseScore || {}).map(([subject, score]) => {
          const pct = score.total > 0 ? (score.correct / score.total) * 100 : 0;
          return (
            <GlassPanel key={subject} style={[panelStyles.insightSubjectCard, isTablet && panelStyles.insightSubjectCardTablet]} radius={14}>
              <Text style={panelStyles.insightSubjectName}>{subject.charAt(0).toUpperCase() + subject.slice(1)}</Text>
              <Text style={panelStyles.insightSubjectPct}>{pct.toFixed(1)}%</Text>
              <Text style={panelStyles.metaText}>{score.correct}/{score.total} correct</Text>
            </GlassPanel>
          );
        })}
      </View>

      <AnalysisCard title="Performance Highlights" icon="sparkles" accent={ANALYSIS.correct}>
        {insights.length > 0 ? insights.map((insight, i) => (
          <View key={i} style={[panelStyles.insightCard, { backgroundColor: insight.bg }]}>
            <Ionicons name={insight.icon as any} size={20} color={insight.color} />
            <View style={{ flex: 1 }}>
              <Text style={[panelStyles.insightTitle, { color: insight.color }]}>{insight.title}</Text>
              <Text style={panelStyles.bodyText}>{insight.description}</Text>
            </View>
          </View>
        )) : (
          <Text style={panelStyles.emptyText}>Complete more exams to unlock insights!</Text>
        )}
      </AnalysisCard>

      <AnalysisCard title="Areas For Improvement" icon="flag" accent="#F59E0B">
        {weakAreas.length > 0 ? weakAreas.map((area, i) => (
          <View key={i} style={[panelStyles.weakCard, { backgroundColor: area.bg }]}>
            <View style={panelStyles.weakHeader}>
              <Text style={panelStyles.weakSubject}>{area.subject}</Text>
              <Text style={{ color: area.color, fontWeight: '800' }}>{area.percentage.toFixed(1)}%</Text>
            </View>
            <Text style={panelStyles.metaText}>{area.correct}/{area.total} questions correct</Text>
          </View>
        )) : (
          <Text style={panelStyles.emptyText}>Excellent! No weak areas identified.</Text>
        )}
      </AnalysisCard>

      {patternAlerts.length > 0 ? (
        <>
          <Text style={panelStyles.sectionHeading}>Pattern Alerts</Text>
          {patternAlerts.map((alert, i) => (
            <View key={`${alert.title}-${i}`} style={panelStyles.alertCard}>
              <Text style={panelStyles.alertTitle}>{alert.icon} {alert.title}</Text>
              <Text style={panelStyles.bodyText}>{alert.desc}</Text>
              <Text style={panelStyles.alertFix}>→ Fix: {alert.fix}</Text>
            </View>
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}

const PLAN_DAY_CARD_WIDTH = 160;
const PLAN_DAY_CARD_GAP = 10;

export function PlanTabMobile({
  studentName,
  aiAnalysis,
  result,
  onOpenQuestions,
}: {
  studentName: string;
  aiAnalysis: AiExamAnalysis | null;
  result?: ExamAnalysisResult;
  onOpenQuestions?: () => void;
}) {
  const { isTablet, isWide, contentWidth, width } = useExamAnalysisLayout();
  const [selectedDay, setSelectedDay] = useState(0);
  const verticalScrollRef = useRef<ScrollView>(null);
  const planDaysScrollRef = useRef<ScrollView>(null);
  const planQueueOffsetRef = useRef(0);
  const planTopics = useMemo(() => generatePlanTopics(aiAnalysis, result), [aiAnalysis, result]);
  const activeTopic = planTopics[selectedDay] ?? planTopics[0];
  const planQueue = useMemo(() => generatePlanQueueItems(activeTopic?.title || 'Focus', selectedDay), [activeTopic?.title, selectedDay]);

  const listViewportWidth = (isTablet ? contentWidth : width) - 32;

  const scrollPlanDayIntoView = useCallback(
    (index: number) => {
      const cardStep = PLAN_DAY_CARD_WIDTH + PLAN_DAY_CARD_GAP;
      const scrollX = Math.max(
        0,
        index * cardStep + PLAN_DAY_CARD_WIDTH / 2 - listViewportWidth / 2
      );
      planDaysScrollRef.current?.scrollTo({ x: scrollX, animated: true });
    },
    [listViewportWidth]
  );

  const scrollPlanQueueIntoView = useCallback(() => {
    verticalScrollRef.current?.scrollTo({
      y: Math.max(0, planQueueOffsetRef.current - 12),
      animated: true,
    });
  }, []);

  const selectPlanDay = useCallback(
    (index: number) => {
      setSelectedDay(index);
      requestAnimationFrame(() => {
        scrollPlanDayIntoView(index);
        requestAnimationFrame(() => {
          scrollPlanQueueIntoView();
        });
      });
    },
    [scrollPlanDayIntoView, scrollPlanQueueIntoView]
  );

  const focusChapterCards = useMemo(() => {
    const fromFocus = (aiAnalysis?.focusAreas || []).slice(0, 6).map((f, i) => {
      const chapter = String((f as { topic?: string }).topic || f.issue || f.subject || 'Focus Chapter').trim();
      const subject = String(f.subject || 'General');
      return {
        subj: subject.toUpperCase(),
        title: chapter.slice(0, 48),
        mastery: Math.max(18, 100 - (i + 1) * 16),
        bg: i === 0 ? '#fff7ed' : i === 1 ? '#ecfdf5' : i === 2 ? '#eff6ff' : '#fefce8',
        subjectId: (f as { subjectId?: string }).subjectId,
        focus: chapter,
      };
    });
    if (fromFocus.length > 0) return fromFocus;
    return planTopics.slice(0, 4).map((t, i) => ({
      subj: 'FOCUS',
      title: t.title,
      mastery: Math.max(20, 70 - i * 12),
      bg: i === 0 ? '#fff7ed' : i === 1 ? '#ecfdf5' : '#eff6ff',
      subjectId: undefined as string | undefined,
      focus: t.title,
    }));
  }, [aiAnalysis, planTopics]);

  const openLearningPath = useCallback((card: { subjectId?: string; focus?: string; title?: string }) => {
    const focus = encodeURIComponent(String(card.focus || card.title || '').trim());
    const focusQ = focus ? `?focus=${focus}` : '';
    if (card.subjectId) {
      router.push(`/subject/${card.subjectId}${focusQ}` as any);
      return;
    }
    router.push(`/learning-paths${focusQ}` as any);
  }, []);

  return (
    <ScrollView
      ref={verticalScrollRef}
      contentContainerStyle={[analysisStyles.scrollContent, isTablet && analysisStyles.scrollContentTablet]}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
    >
      <LinearGradient colors={[...ANALYSIS.gradientHero]} style={panelStyles.planHero}>
        <Text style={panelStyles.planHeroTitle}>YOUR TOPIC PLAN</Text>
        <Text style={panelStyles.planHeroSub}>Built from this paper — review misses, then drill chapters</Text>
        <Text style={panelStyles.planHeroMeta}>
          {planTopics.length} focus topic{planTopics.length === 1 ? '' : 's'} · tap to open checklist
        </Text>
      </LinearGradient>

      <View style={panelStyles.planWhyBox}>
        <View style={panelStyles.planAvatar}><Text style={panelStyles.planAvatarText}>V</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={panelStyles.planWhyTitle}>Why this plan, in one minute</Text>
          <Text style={panelStyles.bodyText}>
            {studentName}, this week targets your weak chapters. {(aiAnalysis?.actionPlan?.thisWeek || [])[0] || 'Short daily drills on focus chapters.'}
          </Text>
        </View>
      </View>

      {onOpenQuestions ? (
        <TouchableOpacity
          style={panelStyles.missReviewBtn}
          onPress={onOpenQuestions}
          activeOpacity={0.85}
        >
          <Ionicons name="create-outline" size={18} color="#0369A1" />
          <View style={{ flex: 1 }}>
            <Text style={panelStyles.missReviewTitle}>Review Wrong Answers</Text>
            <Text style={panelStyles.metaText}>Open The Questions Tab To Revisit Misses</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#64748B" />
        </TouchableOpacity>
      ) : null}

      <View style={panelStyles.planDaysScrollWrap}>
      <ScrollView
        ref={planDaysScrollRef}
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={panelStyles.planDaysRow}
      >
        {planTopics.map((topic, i) => (
          <TouchableOpacity
            key={topic.topicNum}
            style={[panelStyles.planDayCard, selectedDay === i && panelStyles.planDayCardActive]}
            onPress={() => selectPlanDay(i)}
          >
            {selectedDay === i && <Text style={panelStyles.planActiveLabel}>ACTIVE</Text>}
            <Text style={panelStyles.planDayTitle} numberOfLines={2}>{topic.title}</Text>
            <Text style={panelStyles.metaText}>{topic.subtitle}</Text>
            <Text style={panelStyles.planDayDur}>{topic.duration}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      </View>

      <View
        collapsable={false}
        onLayout={(event) => {
          planQueueOffsetRef.current = event.nativeEvent.layout.y;
        }}
      >
      <AnalysisCard title={activeTopic?.title || 'Focus Topic'} icon="bookmark" accent={ANALYSIS.accent}>
        <Text style={panelStyles.metaText}>{activeTopic?.subtitle} · {activeTopic?.duration}</Text>
        <Text style={panelStyles.queueHeading}>WARM-UP · {planQueue.warmup.length} EASY Qs</Text>
        {planQueue.warmup.map((item, i) => (
          <Text key={item.id} style={panelStyles.queueItem}>Q{i + 1} · {item.minutes}m — {item.title}</Text>
        ))}
        <Text style={panelStyles.queueHeading}>CORE · {planQueue.core.length} Qs</Text>
        {planQueue.core.map((item, i) => (
          <Text key={item.id} style={panelStyles.queueItem}>Q{i + 1} · {item.minutes}m — {item.title}</Text>
        ))}
        <Text style={panelStyles.queueHeading}>STRETCH · optional</Text>
        {planQueue.stretch.map((item, i) => (
          <Text key={item.id} style={panelStyles.queueItem}>+{i + 1} · {item.minutes}m — {item.title}</Text>
        ))}
      </AnalysisCard>
      </View>

      <AnalysisCard title="Chapters & Subtopics To Focus On" icon="book" accent="#0D9488">
        <Text style={panelStyles.metaText}>Opens Learning Paths — Not YouTube</Text>
        <View style={panelStyles.videoGrid}>
          {focusChapterCards.map((v, i) => (
            <TouchableOpacity
              key={`${v.subj}-${v.title}-${i}`}
              style={[
                panelStyles.videoCard,
                isWide && panelStyles.videoCardWide,
                { backgroundColor: v.bg },
              ]}
              onPress={() => openLearningPath(v)}
              activeOpacity={0.88}
            >
              <Text style={panelStyles.videoSubj}>{v.subj}</Text>
              <Ionicons name="library-outline" size={26} color="#0F766E" style={{ alignSelf: 'center', marginVertical: 8 }} />
              <Text style={panelStyles.videoTitle}>{v.title}</Text>
              <Text style={panelStyles.metaText}>Focus Score: {Math.round(v.mastery)}%</Text>
              <Text style={[panelStyles.metaText, { color: '#0F766E', fontWeight: '700', marginTop: 4 }]}>
                Open In Learning Paths →
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </AnalysisCard>

      {(aiAnalysis?.actionPlan?.beforeNextExam || []).length > 0 && (
        <AnalysisCard title="Before Next Exam" icon="trophy" accent={ANALYSIS.correct}>
          {(aiAnalysis?.actionPlan?.beforeNextExam || []).map((step, i) => (
            <Text key={i} style={panelStyles.bulletText}>• {step}</Text>
          ))}
        </AnalysisCard>
      )}
    </ScrollView>
  );
}

const panelStyles = StyleSheet.create({
  tabScroll: { flex: 1 },
  performanceReportWrap: { gap: 16 },
  scoreCardBody: {
    // Fill comes from GlassPanel's blur + tint, not a solid colour.
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    gap: 0,
  },
  progressSection: { marginTop: 20, gap: 12 },
  scoreFooterSection: { marginTop: 20, gap: 12 },
  questionsTabRoot: { flex: 1 },
  questionsTabScroll: { flex: 1 },
  filterScroll: { flexGrow: 0, flexShrink: 0 },
  filterRowContent: { alignItems: 'center' },
  // Page band, not a card — let the app background artwork show through.
  filterRowModern: { paddingHorizontal: 16, paddingVertical: 12, gap: 8, backgroundColor: 'transparent', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  filterRowTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignSelf: 'center',
    width: '100%',
  },
  filterPillWrap: { alignSelf: 'flex-start' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  hero: { borderRadius: 18, padding: 20, gap: 6 },
  heroBadge: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600' },
  heroTitle: { color: '#fff', fontSize: 24, fontWeight: '800' },
  heroSub: { color: 'rgba(255,255,255,0.9)', fontSize: 14 },
  scoreCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 18, gap: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  scoreCardTablet: { flexDirection: 'row', alignItems: 'flex-start', gap: 20 },
  scoreCardTabletMid: { flex: 1.1, minWidth: 0, alignItems: 'center' },
  scoreCardTabletEnd: { flex: 1.2, minWidth: 0, gap: 12 },
  scoreBigTablet: { fontSize: 46, fontWeight: '800', color: '#111827', textAlign: 'center' },
  scoreDenomTablet: { color: '#6b7280', fontSize: 13, textAlign: 'center', marginBottom: 8 },
  statsRow3Tablet: { marginTop: 12, paddingTop: 0, borderTopWidth: 0, width: '100%' },
  progressSectionTablet: { marginTop: 0 },
  scoreRingMarksTablet: { fontSize: 30 },
  snapshotGridTablet: { gap: 10 },
  snapshotCellTablet: { width: '23.5%' },
  questionsList: { width: '100%' },
  questionsListTablet: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  modalWrapTablet: {
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalSheet: { flex: 1 },
  modalSheetTablet: {
    flex: 0,
    width: '100%',
    maxWidth: 720,
    maxHeight: '92%',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  insightsTopRow: { flexDirection: 'row', gap: 16, alignItems: 'stretch' },
  insightsTopCol: { flex: 1, minWidth: 0 },
  subjectGridTablet: { gap: 14 },
  insightSubjectCardTablet: { width: '31%' },
  scoreRingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, marginBottom: 0 },
  scoreRingCol: { alignItems: 'center', gap: 10 },
  scoreRingWrap: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  scoreRingCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreRingMarks: { fontSize: 28, fontWeight: '800', color: '#1E293B', lineHeight: 30 },
  scoreRingTotal: { fontSize: 13, fontWeight: '700', color: '#64748B', marginTop: 2 },
  scoreRingGrade: { fontSize: 12, fontWeight: '700', color: '#7C3AED', marginTop: 4 },
  attemptBadge: {
    backgroundColor: '#ECFDF5',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  attemptBadgeText: { color: '#059669', fontWeight: '700', fontSize: 12 },
  scoreRingMeta: { flex: 1, gap: 2, paddingTop: 8 },
  scoreRingPct: { fontSize: 13, fontWeight: '700', color: '#7C3AED', marginTop: 4 },
  scoreBig: { fontSize: 42, fontWeight: '800', color: '#111827' },
  scoreDenom: { color: '#6b7280', fontSize: 14 },
  chartCenter: { alignItems: 'center', gap: 12, marginBottom: 4 },
  statsRow3: { flexDirection: 'row', gap: 12, marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  statBox: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  statVal: { fontSize: 20, fontWeight: '800' },
  statLab: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  progressBlock: { gap: 6 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  progressPct: { fontSize: 13, fontWeight: '700', color: '#7C3AED' },
  progressTrack: { height: 8, backgroundColor: '#E2E8F0', borderRadius: 6, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#93C5FD', borderRadius: 6 },
  progressFillPink: { height: '100%', backgroundColor: '#7DD3FC', borderRadius: 6 },
  timeBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#eff6ff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#bfdbfe' },
  timeLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: '#1e40af' },
  timeVal: { fontSize: 14, fontWeight: '700', color: '#111827' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e9edf3', gap: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardIcon: { fontSize: 16 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
  errorText: { color: '#dc2626', backgroundColor: '#fef2f2', padding: 12, borderRadius: 12, fontSize: 13 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  loadingText: { color: '#6b7280', fontSize: 14 },
  snapshotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  snapshotCell: { width: '47%', backgroundColor: '#f8fafc', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  snapshotLab: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  snapshotVal: { fontSize: 22, fontWeight: '800', marginTop: 4 },
  subjectRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  subjectName: { width: 72, fontWeight: '700', color: '#1e293b', fontSize: 13 },
  subjectBarTrack: { flex: 1, height: 18, backgroundColor: '#f1f5f9', borderRadius: 8, overflow: 'hidden' },
  subjectBarFill: { height: '100%', backgroundColor: '#93C5FD', borderRadius: 8 },
  subjectPct: { width: 44, textAlign: 'right', fontSize: 12, color: '#64748b' },
  conceptCard: { borderWidth: 1, borderColor: '#e2e8f0', borderTopWidth: 3, borderTopColor: '#7c3aed', borderRadius: 12, padding: 12, marginBottom: 8 },
  conceptTag: { fontSize: 10, fontWeight: '800', color: '#7c3aed', textTransform: 'uppercase' },
  conceptTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginTop: 4 },
  conceptMeta: { fontSize: 12, color: '#64748b', marginTop: 4 },
  planStep: { flexDirection: 'row', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  planNum: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#93C5FD', alignItems: 'center', justifyContent: 'center' },
  planNumText: { color: '#1E40AF', fontWeight: '800', fontSize: 13 },
  planStepText: { flex: 1, fontSize: 13, color: '#475569', lineHeight: 18 },
  reportPara: { fontSize: 13, color: '#475569', lineHeight: 20, marginBottom: 8 },
  motivationBox: { backgroundColor: '#EEF2FF', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#C7D2FE', marginTop: 8 },
  motivationText: { color: '#6366F1', fontWeight: '600', fontSize: 13, lineHeight: 18 },
  filterRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterPill: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#FFFFFF' },
  filterPillActive: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  filterPillText: { fontSize: 12, fontWeight: '600', color: '#4b5563' },
  filterPillTextActive: { color: '#fff' },
  questionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  qCorrect: { borderLeftColor: '#10b981' },
  qWrong: { borderLeftColor: '#ef4444' },
  qSkipped: { borderLeftColor: '#9ca3af' },
  qHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  qNum: { fontWeight: '800', color: '#111827' },
  qSubject: { fontSize: 12, color: '#6b7280', textTransform: 'capitalize' },
  qText: { fontSize: 14, color: '#111827', lineHeight: 20 },
  emptyText: { textAlign: 'center', color: '#5B6779', padding: 24, fontSize: 14 },
  emptyTextFull: { width: '100%' },
  modalWrap: { flex: 1, backgroundColor: '#FFFFFF' },
  modalBody: { padding: 20, paddingTop: 48 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  modalQText: { fontSize: 16, color: '#111827', lineHeight: 24, marginBottom: 16 },
  optionRow: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, marginBottom: 8 },
  optionCorrect: { backgroundColor: '#ecfdf5', borderColor: '#10b981' },
  optionCorrectSelected: { backgroundColor: '#ecfdf5', borderColor: '#10b981', borderWidth: 2 },
  optionWrong: { backgroundColor: '#fef2f2', borderColor: '#ef4444' },
  optionYourAnswerBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6d28d9',
    backgroundColor: '#ede9fe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    textTransform: 'uppercase',
  },
  optionText: { fontSize: 14, color: '#111827' },
  modalBadgeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  subjectBadge: { backgroundColor: '#f3f4f6', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  subjectBadgeText: { fontSize: 12, fontWeight: '700', color: '#374151', textTransform: 'capitalize' },
  marksBadge: { backgroundColor: '#ede9fe', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  marksBadgeText: { fontSize: 12, fontWeight: '700', color: '#6d28d9' },
  questionImage: { width: '100%', height: 180, borderRadius: 12, marginBottom: 14, backgroundColor: '#f9fafb' },
  optionsBlock: { gap: 8, marginBottom: 14 },
  optionRowDetailed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#f9fafb',
  },
  optionLetter: { fontSize: 13, fontWeight: '700', color: '#6b7280', width: 22 },
  answerCardsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  yourAnswerCard: {
    flex: 1,
    backgroundColor: '#faf5ff',
    borderWidth: 1,
    borderColor: '#e9d5ff',
    borderRadius: 12,
    padding: 12,
  },
  correctAnswerCard: {
    flex: 1,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 12,
    padding: 12,
  },
  answerCardLabel: { fontSize: 11, fontWeight: '800', color: '#6b21a8', marginBottom: 6 },
  answerCardLabelGreen: { fontSize: 11, fontWeight: '800', color: '#047857', marginBottom: 6 },
  answerCardValue: { fontSize: 13, color: '#581c87', lineHeight: 18 },
  answerCardValueGreen: { fontSize: 13, color: '#065f46', lineHeight: 18 },
  solutionBox: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  solutionTitle: { fontSize: 12, fontWeight: '800', color: '#1e40af', marginBottom: 8 },
  solutionText: { fontSize: 14, color: '#1e3a8a', lineHeight: 22 },
  analysisShell: { borderRadius: 12, borderWidth: 2, padding: 14, marginBottom: 20 },
  analysisCorrect: { borderColor: '#6ee7b7', backgroundColor: '#ecfdf5' },
  analysisWrong: { borderColor: '#fca5a5', backgroundColor: '#fef2f2' },
  analysisNeutral: { borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
  analysisHeading: { fontSize: 15, fontWeight: '800', marginBottom: 10 },
  analysisTitleCorrect: { color: '#065f46', fontWeight: '700' },
  analysisTitleWrong: { color: '#991b1b', fontWeight: '700' },
  analysisTitleNeutral: { color: '#111827', fontWeight: '700' },
  analysisBodyCorrect: { color: '#065f46', fontSize: 13, lineHeight: 20 },
  analysisBodyWrong: { color: '#991b1b', fontSize: 13, lineHeight: 20 },
  analysisBodyNeutral: { color: '#374151', fontSize: 13, lineHeight: 20 },
  analysisMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  analysisBadges: { flexDirection: 'row', gap: 6 },
  statusBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  badgeCorrect: { backgroundColor: '#d1fae5', borderColor: '#6ee7b7' },
  badgeWrong: { backgroundColor: '#fee2e2', borderColor: '#fca5a5' },
  badgeNeutral: { backgroundColor: '#f1f5f9', borderColor: '#cbd5e1' },
  statusBadgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', color: '#374151' },
  priorityBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#FFFFFF' },
  priorityBadgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', color: '#64748b' },
  analysisBlock: { marginBottom: 8 },
  analysisLoading: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  warnText: { color: '#9a3412', backgroundColor: 'rgba(255,247,237,0.55)', padding: 12, borderRadius: 10, fontSize: 13 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  badgeBlue: { backgroundColor: '#dbeafe', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  badgeBlueText: { color: '#1d4ed8', fontWeight: '700', fontSize: 12 },
  badgeGreen: { backgroundColor: '#dcfce7', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  badgeGreenText: { color: '#15803d', fontWeight: '700', fontSize: 12 },
  bodyText: { fontSize: 14, color: '#374151', lineHeight: 20 },
  metaText: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  chapterRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 8 },
  chapterTitle: { fontWeight: '700', color: '#111827', fontSize: 14 },
  chapterPct: { fontSize: 16, fontWeight: '800' },
  obsBox: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 8 },
  bulletText: { fontSize: 14, color: '#374151', marginBottom: 6, lineHeight: 20 },
  sectionHeading: { fontSize: 18, fontWeight: '800', color: '#111827' },
  subjectGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  insightSubjectCard: {
    width: '47%',
    // Fill comes from GlassPanel's blur + tint, not a solid colour.
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  insightSubjectName: { fontWeight: '700', color: '#111827' },
  insightSubjectPct: { fontSize: 22, fontWeight: '800', color: '#111827', marginTop: 4 },
  insightCard: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: 12, marginBottom: 8 },
  insightTitle: { fontWeight: '800', fontSize: 14, marginBottom: 2 },
  weakCard: { borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  weakHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  weakSubject: { fontWeight: '800', color: '#111827' },
  alertCard: { backgroundColor: 'rgba(255,251,235,0.55)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#FDE68A', marginBottom: 10 },
  alertTitle: { fontWeight: '800', color: '#111827', fontSize: 14 },
  alertFix: { color: '#6366F1', fontWeight: '600', fontSize: 13, marginTop: 6 },
  planHero: { borderRadius: 18, padding: 20, borderWidth: 1, borderColor: '#BFDBFE' },
  planHeroTitle: { color: '#0F172A', fontSize: 22, fontWeight: '800' },
  planHeroSub: { color: '#475569', fontSize: 13, marginTop: 4 },
  planHeroMeta: { color: '#64748B', fontSize: 12, marginTop: 6 },
  missReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    backgroundColor: '#F0F9FF',
  },
  missReviewTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  planWhyBox: { flexDirection: 'row', gap: 12, backgroundColor: '#fff1f2', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#fecdd3' },
  planAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#93C5FD', alignItems: 'center', justifyContent: 'center' },
  planAvatarText: { color: '#fff', fontWeight: '800' },
  planWhyTitle: { fontWeight: '800', color: '#111827', marginBottom: 4 },
  planDaysScrollWrap: { flexGrow: 0, flexShrink: 0 },
  planDaysRow: { gap: 10, paddingVertical: 4, paddingHorizontal: 2 },
  planDayCard: { width: 160, backgroundColor: '#f9fafb', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e5e7eb' },
  planDayCardActive: { backgroundColor: '#EFF6FF', borderColor: '#93C5FD' },
  planActiveLabel: { fontSize: 10, fontWeight: '800', color: '#3B82F6', marginBottom: 4 },
  planDayTitle: { fontWeight: '800', color: '#111827', fontSize: 14 },
  planDayDur: { fontSize: 12, fontWeight: '700', color: '#4b5563', marginTop: 6 },
  queueHeading: { fontSize: 11, fontWeight: '800', color: '#6b7280', marginTop: 12, marginBottom: 6, textTransform: 'uppercase' },
  queueItem: { fontSize: 13, color: '#374151', marginBottom: 4, lineHeight: 18 },
  reconRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  reconLabel: { width: 110, fontSize: 12, fontWeight: '600', color: '#374151' },
  reconTrack: { flex: 1, height: 10, backgroundColor: '#eef0f4', borderRadius: 5, overflow: 'hidden' },
  reconFill: { height: '100%', borderRadius: 5 },
  reconVal: { width: 44, textAlign: 'right', fontSize: 12, fontWeight: '800' },
  reconNote: { fontSize: 12, color: '#6b7280', lineHeight: 18, marginTop: 4 },
  potentialBox: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#F0F9FF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    width: '100%',
  },
  potentialHeadline: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: 8,
  },
  potentialBig: { fontSize: 36, fontWeight: '800', color: '#38BDF8', lineHeight: 40 },
  potentialCaption: { fontSize: 13, fontWeight: '700', color: '#0284C7', flexShrink: 1 },
  potentialBody: { fontSize: 14, color: '#374151', lineHeight: 21, width: '100%', flexShrink: 1 },
  potentialBodyStrong: { fontWeight: '700', color: '#111827' },
  taxonomyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  taxonomyCell: {
    width: '47%',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  taxonomyCellTablet: { width: '22.5%' },
  taxonomyCount: { fontSize: 24, fontWeight: '800', color: '#111827' },
  taxonomyLabel: { fontSize: 11, color: '#6b7280', fontWeight: '600', marginTop: 4, textAlign: 'center' },
  qTime: { fontSize: 11, color: '#6b7280', marginLeft: 'auto' },
  qErrorTag: {
    alignSelf: 'flex-start',
    fontSize: 11,
    fontWeight: '700',
    color: '#9a3412',
    backgroundColor: '#ffedd5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
  },
  dnaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  dnaLabel: { width: 80, fontSize: 12, fontWeight: '600', color: '#374151' },
  dnaTrack: { flex: 1, height: 10, backgroundColor: '#f1f5f9', borderRadius: 5, overflow: 'hidden' },
  dnaFill: { height: '100%', backgroundColor: '#93C5FD', borderRadius: 5 },
  dnaPct: { width: 36, textAlign: 'right', fontSize: 12, fontWeight: '700', color: '#111827' },
  dnaBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF9C3',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 8,
    marginBottom: 6,
  },
  dnaBadgeText: { fontSize: 12, fontWeight: '800', color: '#92400e' },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  distLabel: { width: 90, fontSize: 12, fontWeight: '600', color: '#374151' },
  distTrack: { flex: 1, height: 8, backgroundColor: '#f3f4f6', borderRadius: 4, overflow: 'hidden' },
  distFill: { height: '100%', borderRadius: 4 },
  distCount: { width: 28, textAlign: 'right', fontSize: 12, fontWeight: '800', color: '#111827' },
  timeIntelHero: { alignItems: 'center', backgroundColor: '#EFF6FF', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#BFDBFE' },
  timeIntelBig: { fontSize: 22, fontWeight: '800', color: '#111827' },
  timeIntelGrid: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  timeIntelCell: { flex: 1, backgroundColor: '#f9fafb', borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' },
  timeIntelVal: { fontSize: 15, fontWeight: '800', color: '#111827' },
  quadrantGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quadrantCell: { width: '47%', borderRadius: 10, padding: 10, alignItems: 'center' },
  quadrantVal: { fontSize: 20, fontWeight: '800' },
  videoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  videoCard: { width: '47%', borderRadius: 12, padding: 12, minHeight: 120 },
  videoCardWide: { width: '31%' },
  videoSubj: { fontSize: 10, fontWeight: '800', color: '#6b7280' },
  videoTitle: { fontSize: 12, fontWeight: '700', color: '#111827', textAlign: 'center', marginTop: 4 },
});
