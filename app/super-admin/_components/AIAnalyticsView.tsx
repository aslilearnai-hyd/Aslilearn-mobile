import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Pressable,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  type AdminRecord,
  type DetailedAnalytics,
  BOARD_OPTIONS,
  STATE_OPTIONS,
  fetchDetailedAnalytics,
  fetchPlatformAdmins,
  getDifficultyBadgeStyle,
  getFilteredDetailedAnalytics,
  getPerformanceBarColor,
  getScoreColor,
} from '../../../src/lib/super-admin-analytics';
import { SUPER_ADMIN_FLOATING_TAB_BAR_PAD } from '../../../src/lib/responsive-layout';

type TabType =
  | 'admin-comparison'
  | 'top-scorers'
  | 'difficulty-analysis'
  | 'performance-distribution'
  | 'subject-analysis'
  | 'trends';

type AIAnalyticsViewProps = {
  singleAdminId?: string | null;
  onClearSchoolFocus?: () => void;
};

function OptionPicker({
  visible,
  title,
  options,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: { value: string; label: string }[];
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={pickerStyles.overlay}>
        <View style={pickerStyles.sheet}>
          <Text style={pickerStyles.title}>{title}</Text>
          <ScrollView style={{ maxHeight: 360 }}>
            {options.map((item) => (
              <Pressable
                key={item.value}
                style={pickerStyles.item}
                onPress={() => {
                  onSelect(item.value);
                  onClose();
                }}
              >
                <Text style={pickerStyles.itemText}>{item.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Pressable style={pickerStyles.close} onPress={onClose}>
            <Text style={pickerStyles.closeText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export default function AIAnalyticsView({
  singleAdminId = null,
  onClearSchoolFocus,
}: AIAnalyticsViewProps) {
  const [analytics, setAnalytics] = useState<DetailedAnalytics | null>(null);
  const [admins, setAdmins] = useState<AdminRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('admin-comparison');
  const [error, setError] = useState('');
  const [filterBoard, setFilterBoard] = useState('all');
  const [filterState, setFilterState] = useState('all');
  const [boardPickerOpen, setBoardPickerOpen] = useState(false);
  const [statePickerOpen, setStatePickerOpen] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setIsLoading(true);
    try {
      setError('');
      const [detailed, adminList] = await Promise.all([
        fetchDetailedAnalytics(),
        fetchPlatformAdmins(),
      ]);
      setAnalytics(detailed);
      setAdmins(adminList);
    } catch (err: any) {
      setError(err?.friendlyMessage || 'Failed to fetch detailed analytics.');
      console.error('Detailed analytics error:', err);
      setAnalytics(null);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredAnalytics = useMemo(
    () => getFilteredDetailedAnalytics(analytics, admins, filterBoard, filterState, singleAdminId),
    [analytics, admins, filterBoard, filterState, singleAdminId]
  );

  const boardLabel = BOARD_OPTIONS.find((b) => b.value === filterBoard)?.label || 'All Boards';
  const stateLabel = STATE_OPTIONS.find((s) => s.value === filterState)?.label || 'All States';

  if (isLoading && !analytics) {
    return (
      <ScrollView style={styles.content}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Generating Detailed Analytics...</Text>
          <Text style={styles.loadingSubtext}>Analyzing exam data and performance patterns</Text>
        </View>
      </ScrollView>
    );
  }

  if (!analytics) {
    return (
      <ScrollView style={styles.content}>
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle" size={64} color="#5B6779" />
          <Text style={styles.emptyText}>No Analytics Data</Text>
          <Text style={styles.emptySubtext}>Tap below to generate detailed analytics</Text>
          <TouchableOpacity style={styles.generateButton} onPress={() => loadData()}>
            <Ionicons name="sparkles" size={20} color="#fff" />
            <Text style={styles.generateButtonText}>Generate Analytics</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.content}
      contentContainerStyle={styles.scrollContent}
      nestedScrollEnabled
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} />}
    >
      <View style={styles.header}>
        <View>
          <View style={styles.headerTitleRow}>
            <Ionicons name="bar-chart" size={32} color="#8b5cf6" />
            <Text style={styles.headerTitle}>Detailed AI Analytics</Text>
          </View>
          <Text style={styles.headerSubtitle}>Comprehensive exam analysis with performance insights</Text>
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={() => loadData(true)} disabled={isLoading}>
          <LinearGradient colors={['#7dd3fc', '#2dd4bf']} style={styles.refreshButtonGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Ionicons name="sparkles" size={18} color="#fff" />
            <Text style={styles.refreshButtonText}>{isLoading ? 'Analyzing...' : 'Refresh Analytics'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.filtersCard}>
        <Text style={styles.filtersTitle}>Filter Options</Text>
        <TouchableOpacity style={styles.filterRow} onPress={() => setBoardPickerOpen(true)}>
          <Text style={styles.filterLabel}>Filter by Board</Text>
          <Text style={styles.filterValue}>{boardLabel}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterRow} onPress={() => setStatePickerOpen(true)}>
          <Text style={styles.filterLabel}>Filter by State</Text>
          <Text style={styles.filterValue}>{stateLabel}</Text>
        </TouchableOpacity>
        {(filterBoard !== 'all' || filterState !== 'all') && (
          <View style={styles.filterActions}>
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>
                Showing {filteredAnalytics?.adminAnalytics.length || 0} schools
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                setFilterBoard('all');
                setFilterState('all');
              }}
            >
              <Text style={styles.clearFiltersText}>Clear Filters</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {singleAdminId && (
        <View style={styles.schoolFocusCard}>
          <View style={styles.schoolFocusText}>
            <Text style={styles.schoolFocusTitle}>School detail view</Text>
            <Text style={styles.schoolFocusDesc}>
              {filteredAnalytics?.adminAnalytics?.[0]?.adminName || 'Selected school'} — exam difficulty, scorers, and
              trends below are scoped to this school.
            </Text>
          </View>
          {onClearSchoolFocus && (
            <TouchableOpacity style={styles.backAllButton} onPress={onClearSchoolFocus}>
              <Text style={styles.backAllButtonText}>Back to all schools</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {singleAdminId && filteredAnalytics && filteredAnalytics.adminAnalytics.length === 0 && (
        <View style={styles.noDataCard}>
          <Text style={styles.noDataText}>
            No exam analytics data matched this school in the AI pipeline yet. Try refreshing analytics or check that
            exams exist for this administrator.
          </Text>
        </View>
      )}

      {filteredAnalytics && (
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <LinearGradient colors={['#fdba74', '#fb923c']} style={styles.statCardGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <View style={styles.statCardContent}>
                <View>
                  <Text style={styles.statCardLabel}>Total Admins</Text>
                  <Text style={styles.statCardValue}>{filteredAnalytics.globalAnalytics.totalAdmins}</Text>
                  <Text style={styles.statCardSubtext}>Active administrators</Text>
                </View>
                <Ionicons name="people" size={48} color="#fff" />
              </View>
            </LinearGradient>
          </View>
          <View style={styles.statCard}>
            <LinearGradient colors={['#7dd3fc', '#38bdf8']} style={styles.statCardGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <View style={styles.statCardContent}>
                <View>
                  <Text style={styles.statCardLabel}>Overall Average</Text>
                  <Text style={styles.statCardValue}>
                    {filteredAnalytics.globalAnalytics.overallAverageScore?.toFixed(1) || 'N/A'}%
                  </Text>
                  <Text style={styles.statCardSubtext}>Platform performance</Text>
                </View>
                <Ionicons name="trending-up" size={48} color="#fff" />
              </View>
            </LinearGradient>
          </View>
          <View style={styles.statCard}>
            <LinearGradient colors={['#2dd4bf', '#14b8a6']} style={styles.statCardGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <View style={styles.statCardContent}>
                <View>
                  <Text style={styles.statCardLabel}>Total Exams</Text>
                  <Text style={styles.statCardValue}>{filteredAnalytics.globalAnalytics.totalExams}</Text>
                  <Text style={styles.statCardSubtext}>Conducted</Text>
                </View>
                <Ionicons name="document-text" size={48} color="#fff" />
              </View>
            </LinearGradient>
          </View>
          <View style={styles.statCard}>
            <LinearGradient colors={['#fdba74', '#fb923c']} style={styles.statCardGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <View style={styles.statCardContent}>
                <View>
                  <Text style={styles.statCardLabel}>Exam Results</Text>
                  <Text style={styles.statCardValue}>{filteredAnalytics.globalAnalytics.totalExamResults}</Text>
                  <Text style={styles.statCardSubtext}>Total submissions</Text>
                </View>
                <Ionicons name="trophy" size={48} color="#fff" />
              </View>
            </LinearGradient>
          </View>
        </View>
      )}

      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
          {(
            [
              ['admin-comparison', 'Admin Comparison'],
              ['top-scorers', 'Top Scorers'],
              ['difficulty-analysis', 'Difficulty Analysis'],
              ['performance-distribution', 'Performance Distribution'],
              ['subject-analysis', 'Subject Analysis'],
              ['trends', 'Performance Trends'],
            ] as [TabType, string][]
          ).map(([tab, label]) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.tabContent}>
        {activeTab === 'admin-comparison' && (
          <AdminComparisonTab filteredAnalytics={filteredAnalytics} />
        )}
        {activeTab === 'top-scorers' && <TopScorersTab filteredAnalytics={filteredAnalytics} />}
        {activeTab === 'difficulty-analysis' && <DifficultyTab filteredAnalytics={filteredAnalytics} />}
        {activeTab === 'performance-distribution' && (
          <PerformanceDistributionTab filteredAnalytics={filteredAnalytics} />
        )}
        {activeTab === 'subject-analysis' && <SubjectAnalysisTab filteredAnalytics={filteredAnalytics} />}
        {activeTab === 'trends' && (
          <TrendsTab filteredAnalytics={filteredAnalytics} analytics={analytics} />
        )}
      </View>

      {filteredAnalytics?.aiInsights && filteredAnalytics.aiInsights.length > 0 && (
        <View style={styles.insightsSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="hardware-chip" size={24} color="#111827" />
            <Text style={styles.sectionTitle}>AI-Generated Insights</Text>
          </View>
          {filteredAnalytics.aiInsights.map((insight, index) => (
            <View key={index} style={styles.insightCard}>
              <View style={styles.insightHeader}>
                <Text style={styles.insightTitle}>{insight.title}</Text>
                <View
                  style={[
                    styles.insightTypeBadge,
                    insight.type === 'alert'
                      ? styles.insightAlert
                      : insight.type === 'recommendation'
                        ? styles.insightRecommendation
                        : styles.insightDefault,
                  ]}
                >
                  <Text style={styles.insightTypeText}>{insight.type}</Text>
                </View>
              </View>
              <Text style={styles.insightDesc}>{insight.description}</Text>
              <View style={styles.insightFooter}>
                <Text style={styles.insightMeta}>{insight.confidence}% confidence</Text>
                <View
                  style={[
                    styles.impactBadge,
                    insight.impact === 'high'
                      ? styles.impactHigh
                      : insight.impact === 'medium'
                        ? styles.impactMedium
                        : styles.impactLow,
                  ]}
                >
                  <Text style={styles.impactText}>{insight.impact} impact</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      <OptionPicker
        visible={boardPickerOpen}
        title="Filter by Board"
        options={BOARD_OPTIONS}
        onSelect={setFilterBoard}
        onClose={() => setBoardPickerOpen(false)}
      />
      <OptionPicker
        visible={statePickerOpen}
        title="Filter by State"
        options={STATE_OPTIONS}
        onSelect={setFilterState}
        onClose={() => setStatePickerOpen(false)}
      />
    </ScrollView>
  );
}

function AdminComparisonTab({ filteredAnalytics }: { filteredAnalytics: DetailedAnalytics | null }) {
  if (!filteredAnalytics?.adminAnalytics.length) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="people" size={64} color="#5B6779" />
        <Text style={styles.emptyText}>No schools found matching the selected filters</Text>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="people" size={24} color="#111827" />
        <Text style={styles.sectionTitle}>Admin Performance Comparison</Text>
      </View>
      <View style={styles.adminList}>
        {filteredAnalytics.adminAnalytics.map((admin) => (
          <View key={admin.adminId} style={styles.adminCard}>
            <LinearGradient colors={['#7dd3fc', '#2dd4bf', '#14b8a6']} style={styles.adminCardGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <View style={styles.adminCardHeader}>
                <View style={styles.adminCardHeaderLeft}>
                  <Text style={styles.adminCardName}>{admin.adminName}</Text>
                  <Text style={styles.adminCardEmail}>{admin.adminEmail}</Text>
                </View>
                <View style={styles.adminCardScore}>
                  <Text style={[styles.adminCardScoreValue, { color: getScoreColor(admin.averageScore) }]}>
                    {admin.averageScore?.toFixed(1) || 'N/A'}%
                  </Text>
                  <Text style={styles.adminCardScoreLabel}>Average Score</Text>
                </View>
              </View>
              <View style={styles.adminCardStats}>
                <View style={styles.adminStatItem}>
                  <Text style={styles.adminStatValue}>
                    {(admin.uniqueStudents ?? admin.totalStudents) || 0}
                  </Text>
                  <Text style={styles.adminStatLabel}>Students</Text>
                </View>
                <View style={styles.adminStatItem}>
                  <Text style={styles.adminStatValue}>
                    {(admin.totalAttempts ?? admin.totalStudents) || 0}
                  </Text>
                  <Text style={styles.adminStatLabel}>Attempts</Text>
                </View>
                <View style={styles.adminStatItem}>
                  <Text style={styles.adminStatValue}>{admin.totalExams || 0}</Text>
                  <Text style={styles.adminStatLabel}>Exams</Text>
                </View>
                <View style={styles.adminStatItem}>
                  <Text style={styles.adminStatValue}>
                    {admin.examDifficulty?.overallDifficulty?.toFixed(1) || 'N/A'}
                  </Text>
                  <Text style={styles.adminStatLabel}>Difficulty</Text>
                </View>
                <View style={styles.adminStatItem}>
                  <Text style={styles.adminStatValue}>{admin.topScorers?.length || 0}</Text>
                  <Text style={styles.adminStatLabel}>Top Scorers</Text>
                </View>
              </View>
              <View style={styles.progressSection}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>Performance Progress</Text>
                  <Text style={styles.progressValue}>{admin.averageScore?.toFixed(1) || 'N/A'}%</Text>
                </View>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(admin.averageScore || 0, 100)}%`,
                        backgroundColor: getScoreColor(admin.averageScore || 0),
                      },
                    ]}
                  />
                </View>
              </View>
            </LinearGradient>
          </View>
        ))}
      </View>
    </View>
  );
}

function TopScorersTab({ filteredAnalytics }: { filteredAnalytics: DetailedAnalytics | null }) {
  const scorers = filteredAnalytics?.globalAnalytics.topPerformers || [];
  if (!scorers.length) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="trophy" size={64} color="#5B6779" />
        <Text style={styles.emptyText}>No top performers found matching the selected filters</Text>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="trophy" size={24} color="#111827" />
        <Text style={styles.sectionTitle}>Top Performers Across All Admins</Text>
      </View>
      <View style={styles.scorersList}>
        {scorers.map((scorer, index) => (
          <View key={scorer.studentId || index} style={styles.scorerCard}>
            <View style={styles.scorerRank}>
              <Text style={styles.scorerRankText}>#{index + 1}</Text>
            </View>
            <View style={styles.scorerInfo}>
              <Text style={styles.scorerName}>{scorer.studentName || 'Unknown'}</Text>
              <Text style={styles.scorerEmail}>{scorer.studentEmail || 'No email'}</Text>
              <Text style={styles.scorerExams}>{scorer.totalExams || 0} exams taken</Text>
            </View>
            <View style={styles.scorerScore}>
              <Text style={[styles.scorerScoreValue, { color: getScoreColor(scorer.averageScore || 0) }]}>
                {scorer.averageScore?.toFixed(1) || 'N/A'}%
              </Text>
              <Text style={styles.scorerScoreLabel}>Average Score</Text>
              <Text style={styles.scorerBest}>Best: {scorer.highestScore?.toFixed(1) || 'N/A'}%</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function DifficultyTab({ filteredAnalytics }: { filteredAnalytics: DetailedAnalytics | null }) {
  if (!filteredAnalytics?.adminAnalytics.length) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="calculator" size={64} color="#5B6779" />
        <Text style={styles.emptyText}>No schools found matching the selected filters</Text>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="calculator" size={24} color="#111827" />
        <Text style={styles.sectionTitle}>Difficulty Analysis</Text>
      </View>
      <View style={styles.difficultyList}>
        {filteredAnalytics.adminAnalytics.map((admin) => (
          <View key={admin.adminId} style={styles.difficultyCard}>
            <Text style={styles.difficultyCardTitle}>{admin.adminName} - Exam Difficulty</Text>
            <View style={styles.difficultyOverall}>
              <Text style={styles.difficultyOverallValue}>
                {admin.examDifficulty?.overallDifficulty?.toFixed(1) || 'N/A'}
              </Text>
              <Text style={styles.difficultyOverallLabel}>Overall Difficulty Score</Text>
            </View>
            {(admin.examDifficulty?.exams || []).slice(0, 5).map((exam) => {
              const badge = getDifficultyBadgeStyle(exam.difficulty);
              return (
                <View key={exam.examId} style={styles.examDifficultyRow}>
                  <View style={styles.examDifficultyInfo}>
                    <Text style={styles.examDifficultyTitle}>{exam.examTitle}</Text>
                    <Text style={styles.examDifficultyAttempts}>{exam.totalAttempts} attempts</Text>
                  </View>
                  <View style={styles.examDifficultyRight}>
                    <View style={[styles.difficultyBadge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.difficultyBadgeText, { color: badge.text }]}>{exam.difficulty}</Text>
                    </View>
                    <Text style={styles.examDifficultyScore}>{exam.averageScore?.toFixed(1) || 'N/A'}%</Text>
                  </View>
                </View>
              );
            })}
            <View style={styles.hardestExamBox}>
              <Text style={styles.hardestExamLabel}>Hardest Exam</Text>
              <Text style={styles.hardestExamTitle}>
                {admin.examDifficulty?.hardestExam?.examTitle || 'No exams available'}
              </Text>
              <Text style={styles.hardestExamScore}>
                Score: {admin.examDifficulty?.hardestExam?.averageScore?.toFixed(1) || 'N/A'}%
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function PerformanceDistributionTab({
  filteredAnalytics,
}: {
  filteredAnalytics: DetailedAnalytics | null;
}) {
  if (!filteredAnalytics?.adminAnalytics.length) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="pie-chart" size={64} color="#5B6779" />
        <Text style={styles.emptyText}>No schools found matching the selected filters</Text>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="pie-chart" size={24} color="#111827" />
        <Text style={styles.sectionTitle}>Performance Distribution</Text>
      </View>
      {filteredAnalytics.adminAnalytics.map((admin) => (
        <View key={admin.adminId} style={styles.distributionCard}>
          <Text style={styles.distributionCardTitle}>{admin.adminName} - Performance Distribution</Text>
          {admin.performanceDistribution &&
            Object.entries(admin.performanceDistribution).map(([key, data]) => (
              <View key={key} style={styles.distributionRow}>
                <View style={styles.distributionRowHeader}>
                  <Text style={styles.distributionKey}>{key}</Text>
                  <Text style={styles.distributionMeta}>
                    {data.count} students ({data.percentage}%)
                  </Text>
                </View>
                <View style={styles.progressBarLight}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(data.percentage, 100)}%`,
                        backgroundColor: getPerformanceBarColor(data.range),
                      },
                    ]}
                  />
                </View>
              </View>
            ))}
        </View>
      ))}
    </View>
  );
}

function SubjectAnalysisTab({ filteredAnalytics }: { filteredAnalytics: DetailedAnalytics | null }) {
  const subjects = filteredAnalytics?.globalAnalytics.subjectWiseAnalysis || [];
  if (!subjects.length) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="book" size={64} color="#5B6779" />
        <Text style={styles.emptyText}>No subject data found matching the selected filters</Text>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="book" size={24} color="#111827" />
        <Text style={styles.sectionTitle}>Subject-wise Performance Analysis</Text>
      </View>
      <View style={styles.subjectList}>
        {subjects.map((subject, index) => (
          <View key={subject.subject || index} style={styles.subjectCard}>
            <View style={styles.subjectCardHeader}>
              <Text style={styles.subjectCardTitle}>{subject.subject || 'Unknown'}</Text>
              <Text style={[styles.subjectCardScore, { color: getScoreColor(subject.averageScore || 0) }]}>
                {subject.averageScore?.toFixed(1) || 'N/A'}%
              </Text>
            </View>
            <View style={styles.subjectCardStats}>
              <View style={styles.subjectStatItem}>
                <Text style={styles.subjectStatValue}>{subject.totalExams || 0}</Text>
                <Text style={styles.subjectStatLabel}>Total Exams</Text>
              </View>
              <View style={styles.subjectStatItem}>
                <Text style={[styles.subjectStatValue, { color: '#10b981' }]}>
                  {subject.highestScore?.toFixed(1) || 'N/A'}%
                </Text>
                <Text style={styles.subjectStatLabel}>Highest Score</Text>
              </View>
              <View style={styles.subjectStatItem}>
                <Text style={[styles.subjectStatValue, { color: '#f97316' }]}>
                  {subject.lowestScore?.toFixed(1) || 'N/A'}%
                </Text>
                <Text style={styles.subjectStatLabel}>Lowest Score</Text>
              </View>
              <View style={styles.subjectStatItem}>
                <Text style={styles.subjectStatValue}>{subject.examCount || 0}</Text>
                <Text style={styles.subjectStatLabel}>Exam Count</Text>
              </View>
            </View>
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabelDark}>Performance Range</Text>
                <Text style={styles.progressValueDark}>
                  {subject.lowestScore?.toFixed(1) || 'N/A'}% - {subject.highestScore?.toFixed(1) || 'N/A'}%
                </Text>
              </View>
              <View style={styles.progressBarLight}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(subject.averageScore || 0, 100)}%`,
                      backgroundColor: getScoreColor(subject.averageScore || 0),
                    },
                  ]}
                />
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function TrendsTab({
  filteredAnalytics,
  analytics,
}: {
  filteredAnalytics: DetailedAnalytics | null;
  analytics: DetailedAnalytics;
}) {
  const trends = analytics.globalAnalytics.trendsAnalysis;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="trending-up" size={24} color="#111827" />
        <Text style={styles.sectionTitle}>Performance Trends Analysis</Text>
      </View>

      {trends && (
        <View style={styles.trendSummaryRow}>
          <View style={[styles.trendSummaryCard, styles.trendImproving]}>
            <Ionicons name="trending-up" size={28} color="#16a34a" />
            <Text style={styles.trendSummaryValue}>{trends.improving}</Text>
            <Text style={styles.trendSummaryLabel}>Students Improving</Text>
          </View>
          <View style={[styles.trendSummaryCard, styles.trendDeclining]}>
            <Ionicons name="trending-down" size={28} color="#dc2626" />
            <Text style={styles.trendSummaryValue}>{trends.declining}</Text>
            <Text style={styles.trendSummaryLabel}>Students Declining</Text>
          </View>
          <View style={[styles.trendSummaryCard, styles.trendStable]}>
            <Ionicons name="pulse" size={28} color="#2563eb" />
            <Text style={styles.trendSummaryValue}>{trends.stable}</Text>
            <Text style={styles.trendSummaryLabel}>Stable Performance</Text>
          </View>
        </View>
      )}

      {!filteredAnalytics?.adminAnalytics.length ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="trending-up" size={64} color="#5B6779" />
          <Text style={styles.emptyText}>No performance trends found matching the selected filters</Text>
        </View>
      ) : (
        filteredAnalytics.adminAnalytics.map((admin) => (
          <View key={admin.adminId} style={styles.monthlyTrendCard}>
            <Text style={styles.monthlyTrendTitle}>{admin.adminName} - Monthly Trends</Text>
            {(admin.performanceTrends || []).slice(-6).map((trend) => (
              <View key={trend.month} style={styles.monthlyTrendRow}>
                <Text style={styles.monthlyTrendMonth}>{trend.month}</Text>
                <View style={styles.monthlyTrendRight}>
                  <Text style={styles.monthlyTrendExams}>{trend.examCount} exams</Text>
                  <Text style={[styles.monthlyTrendScore, { color: getScoreColor(trend.averageScore) }]}>
                    {trend.averageScore?.toFixed(1) || 'N/A'}%
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ))
      )}
    </View>
  );
}

const pickerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '70%',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: '#111827',
  },
  item: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    backgroundColor: '#FFFFFF',
  },
  itemText: {
    fontSize: 15,
    color: '#111827',
  },
  close: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  closeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
});

const styles = StyleSheet.create({
  content: { flex: 1 },
  scrollContent: { paddingBottom: SUPER_ADMIN_FLOATING_TAB_BAR_PAD + 48, flexGrow: 1 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  refreshButton: {
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 8,
  },
  refreshButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  filtersCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  filtersTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  filterRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  filterLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  filterValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  filterActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  filterBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterBadgeText: {
    fontSize: 12,
    color: '#374151',
  },
  clearFiltersText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0d9488',
  },
  schoolFocusCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#f0fdfa',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#99f6e4',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  schoolFocusText: {
    flex: 1,
    minWidth: 200,
  },
  schoolFocusTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#134e4a',
    marginBottom: 4,
  },
  schoolFocusDesc: {
    fontSize: 12,
    color: '#115e59',
  },
  backAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#14b8a6',
    backgroundColor: '#FFFFFF',
  },
  backAllButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f766e',
  },
  noDataCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: 'rgba(255,251,235,0.55)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  noDataText: {
    fontSize: 13,
    color: '#92400e',
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  statCardGradient: {
    padding: 14,
    minHeight: 100,
  },
  statCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statCardLabel: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 8,
  },
  statCardValue: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  statCardSubtext: {
    fontSize: 11,
    color: '#fff',
    opacity: 0.9,
  },
  tabsContainer: {
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  tabsScroll: {
    flexGrow: 0,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: '#f3f4f6',
  },
  tabActive: {
    backgroundColor: '#8b5cf6',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#fff',
  },
  tabContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  adminList: {
    gap: 16,
  },
  adminCard: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  adminCardGradient: {
    padding: 20,
  },
  adminCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  adminCardHeaderLeft: {
    flex: 1,
  },
  adminCardName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  adminCardEmail: {
    fontSize: 14,
    color: '#6b7280',
  },
  adminCardScore: {
    alignItems: 'flex-end',
  },
  adminCardScoreValue: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  adminCardScoreLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  adminCardStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  adminStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  adminStatValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  adminStatLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  progressSection: {
    marginTop: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  progressLabelDark: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  progressValue: {
    fontSize: 14,
    color: '#6b7280',
  },
  progressValueDark: {
    fontSize: 14,
    color: '#6b7280',
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarLight: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  scorersList: {
    gap: 16,
  },
  scorerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  scorerRank: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  scorerRankText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#92400e',
  },
  scorerInfo: {
    flex: 1,
  },
  scorerName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  scorerEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  scorerExams: {
    fontSize: 12,
    color: '#5B6779',
  },
  scorerScore: {
    alignItems: 'flex-end',
  },
  scorerScoreValue: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  scorerScoreLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  scorerBest: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
  },
  difficultyList: {
    gap: 16,
  },
  difficultyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  difficultyCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  difficultyOverall: {
    alignItems: 'center',
    marginBottom: 16,
  },
  difficultyOverallValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#8b5cf6',
    marginBottom: 4,
  },
  difficultyOverallLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  examDifficultyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 8,
  },
  examDifficultyInfo: {
    flex: 1,
    marginRight: 8,
  },
  examDifficultyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  examDifficultyAttempts: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  examDifficultyRight: {
    alignItems: 'flex-end',
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  difficultyBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  examDifficultyScore: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  hardestExamBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
  },
  hardestExamLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 4,
  },
  hardestExamTitle: {
    fontSize: 13,
    color: '#2563eb',
  },
  hardestExamScore: {
    fontSize: 11,
    color: '#3b82f6',
    marginTop: 2,
  },
  distributionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  distributionCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  distributionRow: {
    marginBottom: 12,
  },
  distributionRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  distributionKey: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    textTransform: 'capitalize',
  },
  distributionMeta: {
    fontSize: 12,
    color: '#6b7280',
  },
  subjectList: {
    gap: 16,
  },
  subjectCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  subjectCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  subjectCardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    textTransform: 'capitalize',
    flex: 1,
  },
  subjectCardScore: {
    fontSize: 28,
    fontWeight: '800',
  },
  subjectCardStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  subjectStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  subjectStatValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  subjectStatLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  trendSummaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  trendSummaryCard: {
    flex: 1,
    minWidth: '30%',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
  },
  trendImproving: {
    backgroundColor: '#f0fdf4',
  },
  trendDeclining: {
    backgroundColor: '#fef2f2',
  },
  trendStable: {
    backgroundColor: '#eff6ff',
  },
  trendSummaryValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginTop: 8,
    marginBottom: 4,
  },
  trendSummaryLabel: {
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'center',
  },
  monthlyTrendCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  monthlyTrendTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  monthlyTrendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  monthlyTrendMonth: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  monthlyTrendRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  monthlyTrendExams: {
    fontSize: 12,
    color: '#6b7280',
  },
  monthlyTrendScore: {
    fontSize: 13,
    fontWeight: '700',
  },
  insightsSection: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  insightCard: {
    backgroundColor: '#faf5ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9d5ff',
  },
  insightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  insightTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  insightTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  insightAlert: {
    backgroundColor: '#fee2e2',
  },
  insightRecommendation: {
    backgroundColor: '#dcfce7',
  },
  insightDefault: {
    backgroundColor: '#dbeafe',
  },
  insightTypeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#374151',
    textTransform: 'capitalize',
  },
  insightDesc: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 10,
  },
  insightFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  insightMeta: {
    fontSize: 11,
    color: '#5B6779',
  },
  impactBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  impactHigh: {
    backgroundColor: '#fee2e2',
  },
  impactMedium: {
    backgroundColor: '#fef9c3',
  },
  impactLow: {
    backgroundColor: '#dcfce7',
  },
  impactText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#374151',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 4,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    color: '#dc2626',
    paddingHorizontal: 16,
    marginBottom: 8,
    fontSize: 13,
  },
});
