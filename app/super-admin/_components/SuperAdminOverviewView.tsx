import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSuperAdminTheme } from '../_ui';
import { GlassPanel } from '../../../src/components/ui';
import VidyaAvatar from '../../../src/components/vidya/VidyaAvatar';
import VidyaAnalyticsCard from './VidyaAnalyticsCard';
import type { SuperAdminView } from './SuperAdminNavDrawer';
import type { DashboardStats, RealtimeAnalytics } from '../../../src/lib/super-admin-dashboard';
import { SUPER_ADMIN_FLOATING_TAB_BAR_PAD } from '../../../src/lib/responsive-layout';

type Props = {
  stats: DashboardStats;
  isLoading: boolean;
  statsError: string;
  refreshing: boolean;
  onRefresh: () => void;
  realtimeAnalytics: RealtimeAnalytics | null;
  isLoadingAnalytics: boolean;
  onRefreshAnalytics: () => void;
  onNavigate: (view: SuperAdminView) => void;
};

const EXAM_GRADIENTS: readonly [string, string][] = [
  ['#FDBA74', '#FB923C'],
  ['#7DD3FC', '#38BDF8'],
  ['#2DD4BF', '#14B8A6'],
];

export default function SuperAdminOverviewView({
  stats,
  isLoading,
  statsError,
  refreshing,
  onRefresh,
  realtimeAnalytics,
  isLoadingAnalytics,
  onRefreshAnalytics,
  onNavigate,
}: Props) {
  const { colors } = useSuperAdminTheme();
  const contentVolume = isLoading ? 0 : Number(stats.contentVolume ?? stats.contentEngagement ?? 0);
  const activeRate = isLoading ? 0 : Math.min(100, Number(stats.activeStudentsPercentage) || 0);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.welcomeHeader}>
        <Text style={styles.welcomeTitle}>Welcome back, Super Admin</Text>
        <Text style={styles.welcomeSubtitle}>
          Manage boards, schools, exams, and AI analytics in one place.
        </Text>
      </View>

      {isLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <>
          {statsError ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color="#dc2626" style={{ marginRight: 8 }} />
              <Text style={styles.errorBannerText}>{statsError}</Text>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Board Management</Text>
            <TouchableOpacity
              style={styles.boardCard}
              onPress={() => onNavigate('board')}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#FB923C', '#F97316']}
                style={styles.boardCardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <View style={styles.boardCardContent}>
                  <View>
                    <Text style={styles.boardCardTitle}>Asli Exclusive Schools</Text>
                    <Text style={styles.boardCardSubtitle}>All Boards Content — Unified Platform</Text>
                  </View>
                  <Ionicons name="people" size={48} color="#fff" />
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.twoColumnGrid}>
              <TouchableOpacity
                style={styles.featureCard}
                onPress={() => onNavigate('subjects-and-content')}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={['#7DD3FC', '#38BDF8']}
                  style={styles.featureCardGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.featureCardContent}>
                    <View style={styles.featureCardTextContainer}>
                      <Text style={styles.featureCardTitle}>Content Management</Text>
                      <Text style={styles.featureCardSubtitle}>Manage videos, notes & materials</Text>
                    </View>
                    <Ionicons name="cloud-upload" size={36} color="#fff" />
                  </View>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.featureCard}
                onPress={() => {
                  onNavigate('analytics');
                  onRefreshAnalytics();
                }}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={['#2DD4BF', '#14B8A6']}
                  style={styles.featureCardGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.featureCardContent}>
                    <View style={styles.featureCardTextContainer}>
                      <Text style={styles.featureCardTitle}>Analytics</Text>
                      <Text style={styles.featureCardSubtitle}>Schools, exams & AI insights</Text>
                    </View>
                    <Ionicons name="analytics-outline" size={36} color="#fff" />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.statsRow}>
            <GlassPanel style={styles.statsWidget} radius={10} tone="medium">
              <View style={styles.statsWidgetInner}>
                <Text style={styles.statsWidgetLabel}>Total Students</Text>
                <Text style={styles.statsWidgetValue}>
                  {(stats.totalStudents || 0).toLocaleString()}
                </Text>
              </View>
            </GlassPanel>
            <GlassPanel style={styles.statsWidget} radius={10} tone="medium">
              <View style={styles.statsWidgetInner}>
                <Text style={styles.statsWidgetValue}>{`${(stats.passRate || 0).toFixed(0)}%`}</Text>
                <Text style={styles.statsWidgetLabel}>Pass Rate Data</Text>
              </View>
            </GlassPanel>
          </View>

          {/* The old solid-white wash overlay is gone — the frosted panel now
              supplies the card surface, with the orange tint layered on top. */}
          <GlassPanel style={styles.vidyaCard} radius={10} tone="medium">
            <TouchableOpacity
              onPress={() => onNavigate('vidya-ai')}
              activeOpacity={0.9}
            >
            <View style={styles.vidyaCardTint} />
            <View style={styles.vidyaCardContent}>
              <View style={styles.vidyaCardText}>
                <Text style={styles.vidyaCardTitle}>Vidya AI</Text>
                <Text style={styles.vidyaCardSubtitle}>24/7 AI Tutor Support</Text>
                <Text style={styles.vidyaCardClick}>Click To Access Vidya AI →</Text>
              </View>
              <View style={styles.vidyaCardImage}>
                <VidyaAvatar size={72} borderColor="#fff" />
              </View>
            </View>
            </TouchableOpacity>
          </GlassPanel>

          <GlassPanel style={styles.studentAnalyticsCard} radius={10} tone="strong">
            <TouchableOpacity
              style={styles.studentAnalyticsCardInner}
              onPress={() => onNavigate('analytics')}
              activeOpacity={0.9}
            >
            <View style={styles.studentAnalyticsHeader}>
              <Text style={styles.studentAnalyticsTitle}>Student Analytics</Text>
              <Text style={styles.studentAnalyticsLink}>View Details →</Text>
            </View>
            <View style={styles.studentAnalyticsRow}>
              <Text style={styles.studentAnalyticsLabel}>Total Students</Text>
              <Text style={styles.studentAnalyticsValue}>
                {(stats.totalStudents || 0).toLocaleString()}
              </Text>
            </View>
            <View style={styles.studentAnalyticsRow}>
              <Text style={styles.studentAnalyticsLabel}>Active Students</Text>
              <Text style={[styles.studentAnalyticsValue, { color: '#F97316' }]}>
                {(stats.activeStudents || 0).toLocaleString()} ({stats.activeStudentsPercentage || 0}%)
              </Text>
            </View>
            <View style={styles.studentAnalyticsRow}>
              <Text style={styles.studentAnalyticsLabel}>Avg Exams Per Student</Text>
              <Text style={[styles.studentAnalyticsValue, { color: '#14B8A6' }]}>
                {(Number(stats.avgExamsPerStudent) || 0).toFixed(1)}
              </Text>
            </View>
            <View style={styles.engagementBlock}>
              <View style={styles.studentAnalyticsRow}>
                <Text style={styles.studentAnalyticsLabel}>Content Items</Text>
                <Text style={styles.studentAnalyticsValue}>{contentVolume.toLocaleString()}</Text>
              </View>
              <View style={[styles.studentAnalyticsRow, { marginTop: 8 }]}>
                <Text style={styles.studentAnalyticsLabel}>Active Student Rate</Text>
                <Text style={styles.studentAnalyticsValue}>{activeRate.toFixed(0)}%</Text>
              </View>
              <View style={styles.engagementBar}>
                <LinearGradient
                  colors={['#FB923C', '#38BDF8']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.engagementFill, { width: `${activeRate}%` }]}
                />
              </View>
            </View>
            </TouchableOpacity>
          </GlassPanel>

          <VidyaAnalyticsCard />

          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="locate-outline" size={20} color="#FB923C" />
              <Text style={styles.sectionTitle}>AI-Powered Recommendations</Text>
            </View>
            <GlassPanel style={styles.placeholderCard} radius={10} tone="medium">
              <View style={styles.placeholderCardInner}>
              <Ionicons name="locate-outline" size={40} color="#5B6779" />
              <Text style={styles.placeholderTitle}>AI Recommendations</Text>
              <Text style={styles.placeholderSub}>
                AI-powered insights and recommendations will appear here
              </Text>
              </View>
            </GlassPanel>
          </View>

          <View style={styles.realtimeSection}>
            <View style={styles.realtimeHeader}>
              <View style={styles.realtimeTitleRow}>
                <Ionicons name="stats-chart" size={22} color="#14B8A6" />
                <Text style={styles.realtimeTitle}>Real-Time Analytics</Text>
              </View>
              <TouchableOpacity
                style={styles.realtimeRefresh}
                onPress={onRefreshAnalytics}
                disabled={isLoadingAnalytics}
              >
                <Ionicons name="refresh" size={16} color="#374151" />
                <Text style={styles.realtimeRefreshText}>Refresh</Text>
              </TouchableOpacity>
            </View>

            {isLoadingAnalytics ? (
              <GlassPanel style={styles.realtimeLoading} radius={10} tone="medium">
                <View style={styles.realtimeLoadingInner}>
                  <ActivityIndicator size="small" color="#14B8A6" />
                  <Text style={styles.realtimeLoadingText}>Loading Real-Time Analytics...</Text>
                </View>
              </GlassPanel>
            ) : realtimeAnalytics ? (
              <>
                <View style={styles.realtimeGrid}>
                  <View style={styles.realtimeCard}>
                    <Text style={[styles.realtimeCardLabel, { color: '#EA580C' }]}>Total Students</Text>
                    <Text style={styles.realtimeCardValue}>
                      {stats.totalStudents || realtimeAnalytics.overallMetrics?.totalStudents || 0}
                    </Text>
                  </View>
                  <View style={styles.realtimeCard}>
                    <Text style={[styles.realtimeCardLabel, { color: '#0D9488' }]}>Total Exams</Text>
                    <Text style={styles.realtimeCardValue}>
                      {realtimeAnalytics.overallMetrics?.totalExams || 0}
                    </Text>
                  </View>
                  <View style={styles.realtimeCard}>
                    <Text style={[styles.realtimeCardLabel, { color: '#EA580C' }]}>Exam Results</Text>
                    <Text style={styles.realtimeCardValue}>
                      {realtimeAnalytics.overallMetrics?.totalExamResults || 0}
                    </Text>
                  </View>
                  <View style={styles.realtimeCard}>
                    <Text style={[styles.realtimeCardLabel, { color: '#6D28D9' }]}>Overall Average</Text>
                    <Text style={styles.realtimeCardValue}>
                      {realtimeAnalytics.overallMetrics?.overallAverage || 0}%
                    </Text>
                  </View>
                </View>

                {(realtimeAnalytics.topScorersByExam || []).slice(0, 3).map((exam, examIdx) => {
                  const gradient = EXAM_GRADIENTS[examIdx % EXAM_GRADIENTS.length];
                  return (
                    // `strong` — this panel carries a dense scorer table.
                    <GlassPanel key={`${exam.examTitle || 'exam'}-${examIdx}`} style={styles.topScorersWrap} radius={10} tone="strong">
                      <LinearGradient colors={[...gradient]} style={styles.topScorersHeader}>
                        <Text style={styles.topScorersTitle}>{exam.examTitle || 'Exam'}</Text>
                      </LinearGradient>
                      {(exam.topScorers || []).slice(0, 5).map((scorer: any, idx) => (
                        <View key={idx} style={styles.scorerRow}>
                          <View>
                            <Text style={styles.scorerName}>{scorer.studentName || 'Student'}</Text>
                            {scorer.studentEmail ? (
                              <Text style={styles.scorerEmail}>{scorer.studentEmail}</Text>
                            ) : null}
                          </View>
                          <View style={styles.scorerScoreWrap}>
                            <Text style={styles.scorerScore}>
                              {scorer.percentage != null ? `${Number(scorer.percentage).toFixed(1)}%` : '—'}
                            </Text>
                            {scorer.marks != null && scorer.totalMarks != null ? (
                              <Text style={styles.scorerMarks}>
                                {scorer.marks}/{scorer.totalMarks} Marks
                              </Text>
                            ) : null}
                          </View>
                        </View>
                      ))}
                    </GlassPanel>
                  );
                })}

                {(realtimeAnalytics.lowPerformingAdmins || []).length > 0 ? (
                  <View style={styles.lowPerformingCard}>
                    <View style={styles.lowPerformingHeader}>
                      <Ionicons name="warning" size={18} color="#B91C1C" />
                      <Text style={styles.lowPerformingTitle}>
                        Low-Performing Admins (Needs Attention)
                      </Text>
                    </View>
                    {(realtimeAnalytics.lowPerformingAdmins || []).map((admin, idx) => (
                      <View key={idx} style={styles.adminRow}>
                        <View>
                          <Text style={styles.adminName}>{admin.adminName || 'Admin'}</Text>
                          <Text style={styles.adminMeta}>
                            {admin.totalStudents ?? 0} Students
                          </Text>
                        </View>
                        <Text style={styles.adminScore}>{admin.averageScore ?? 0}%</Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                {(realtimeAnalytics.adminAnalytics || []).length > 0 ? (
                  <LinearGradient
                    colors={['#7DD3FC', '#2DD4BF', '#14B8A6']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.adminPerfCard}
                  >
                    <View style={styles.adminPerfHeader}>
                      <Ionicons name="trending-up" size={20} color="#111827" />
                      <Text style={styles.adminPerfTitle}>Admin Performance Overview</Text>
                    </View>
                    {(realtimeAnalytics.adminAnalytics || []).slice(0, 5).map((admin, idx) => (
                      <View key={idx} style={styles.adminPerfRow}>
                        <View>
                          <Text style={styles.adminPerfName}>{admin.adminName || 'Admin'}</Text>
                          <Text style={styles.adminPerfSub}>
                            {admin.totalStudents ?? 0} Students
                          </Text>
                        </View>
                        <Text style={styles.adminPerfScore}>{admin.averageScore ?? 0}%</Text>
                      </View>
                    ))}
                  </LinearGradient>
                ) : null}
              </>
            ) : (
              <GlassPanel style={styles.placeholderCard} radius={10} tone="medium">
                <View style={styles.placeholderCardInner}>
                  <Ionicons name="stats-chart" size={40} color="#5B6779" />
                  <Text style={styles.placeholderSub}>No Analytics Data Available</Text>
                </View>
              </GlassPanel>
            )}
          </View>

          {realtimeAnalytics?.insights && realtimeAnalytics.insights.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="bulb-outline" size={20} color="#FB923C" />
                <Text style={styles.sectionTitle}>AI-Powered Insights</Text>
              </View>
              <View style={styles.insightsGrid}>
                {realtimeAnalytics.insights.slice(0, 2).map((insight, index) => (
                  <View key={index} style={styles.insightCard}>
                    <View style={styles.insightIconWrap}>
                      <Ionicons name="bulb" size={18} color="#fff" />
                    </View>
                    <View style={styles.insightTextWrap}>
                      <Text style={styles.insightTitle}>
                        {insight.title || insight.description || 'Insight'}
                      </Text>
                      <Text style={styles.insightSub}>Recently Generated</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingBottom: SUPER_ADMIN_FLOATING_TAB_BAR_PAD + 48 },
  welcomeHeader: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorBanner: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorBannerText: {
    flex: 1,
    color: '#B91C1C',
    fontSize: 12,
    lineHeight: 16,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  boardCard: {
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 12,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  boardCardGradient: { padding: 16 },
  boardCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  boardCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  boardCardSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
  },
  twoColumnGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  featureCard: {
    flex: 1,
    minHeight: 110,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  featureCardGradient: {
    flex: 1,
    padding: 14,
    justifyContent: 'center',
  },
  featureCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  featureCardTextContainer: { flex: 1, marginRight: 8 },
  featureCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  featureCardSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 15,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  statsWidget: {
    flex: 1,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  // Padding moves to the inner view so it sits inside the frosted panel.
  statsWidgetInner: {
    padding: 16,
  },
  statsWidgetLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  statsWidgetValue: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
  },
  vidyaCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#93C5FD',
    overflow: 'hidden',
  },
  vidyaCardTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(253,186,116,0.15)',
  },
  vidyaCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    position: 'relative',
    zIndex: 1,
  },
  vidyaCardText: { flex: 1 },
  vidyaCardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  vidyaCardSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  vidyaCardClick: {
    fontSize: 12,
    color: '#F97316',
    fontWeight: '600',
    marginTop: 8,
  },
  vidyaCardImage: {
    marginLeft: 12,
  },
  studentAnalyticsCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  // Padding moves to the inner pressable so it sits inside the frosted panel.
  studentAnalyticsCardInner: {
    padding: 16,
  },
  studentAnalyticsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  studentAnalyticsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  studentAnalyticsLink: {
    fontSize: 12,
    color: '#EA580C',
    fontWeight: '600',
  },
  studentAnalyticsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  studentAnalyticsLabel: {
    fontSize: 13,
    color: '#374151',
  },
  studentAnalyticsValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  engagementBlock: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 10,
    marginTop: 4,
  },
  engagementBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 6,
  },
  engagementFill: {
    height: '100%',
    borderRadius: 4,
  },
  placeholderCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  // Padding and child alignment move inside the frosted panel.
  placeholderCardInner: {
    padding: 24,
    alignItems: 'center',
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginTop: 12,
    marginBottom: 6,
  },
  placeholderSub: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
  realtimeSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  realtimeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  realtimeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  realtimeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  realtimeRefresh: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  realtimeRefreshText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
  },
  realtimeLoading: {
    borderRadius: 10,
  },
  // Row layout and padding move inside the frosted panel.
  realtimeLoadingInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 20,
    justifyContent: 'center',
  },
  realtimeLoadingText: {
    fontSize: 13,
    color: '#6B7280',
  },
  realtimeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  realtimeCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  realtimeCardLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  realtimeCardValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  topScorersWrap: {
    marginBottom: 12,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  topScorersHeader: {
    padding: 12,
  },
  topScorersTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  scorerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    marginHorizontal: 8,
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  scorerName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  scorerEmail: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  scorerScoreWrap: { alignItems: 'flex-end' },
  scorerScore: {
    fontSize: 14,
    fontWeight: '800',
    color: '#EA580C',
  },
  scorerMarks: {
    fontSize: 11,
    color: '#6B7280',
  },
  lowPerformingCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 12,
    marginBottom: 12,
  },
  lowPerformingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  lowPerformingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#991B1B',
    flex: 1,
  },
  adminRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 8,
  },
  adminName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  adminMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  adminScore: {
    fontSize: 18,
    fontWeight: '800',
    color: '#DC2626',
  },
  adminPerfCard: {
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  adminPerfHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  adminPerfTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  adminPerfRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  adminPerfName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  adminPerfSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  adminPerfScore: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  insightsGrid: {
    gap: 10,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
  },
  insightIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#60A5FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightTextWrap: { flex: 1 },
  insightTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },
  insightSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
});
