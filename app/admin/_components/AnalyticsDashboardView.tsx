import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import adminService from '../../../src/services/api/adminService';
import {
  AdminScreenShell,
  AdminStatsRow,
  AdminSectionHeader,
  AdminGlassCard,
  AdminAnimatedProgress,
  AdminScalePressable,
  AdminSkeletonStats,
  useAdminTheme,
} from '../_ui';

interface AnalyticsData {
  totalStudents: number;
  activeStudents: number;
  totalClasses: number;
  totalVideos: number;
  totalQuizzes: number;
  totalAssessments: number;
  averageScore: number;
  completionRate: number;
  recentActivity: Array<{ id: string; action: string; user: string; time: string; type: string }>;
  classPerformance: Array<{ classNumber: string; students: number; averageScore: number; completionRate: number }>;
  topPerformers: Array<{ name: string; class: string; score: number; rank: number }>;
}

const initialData: AnalyticsData = {
  totalStudents: 0,
  activeStudents: 0,
  totalClasses: 0,
  totalVideos: 0,
  totalQuizzes: 0,
  totalAssessments: 0,
  averageScore: 0,
  completionRate: 0,
  recentActivity: [],
  classPerformance: [],
  topPerformers: [],
};

export default function AnalyticsDashboardView() {
  const { colors, spacing, radius } = useAdminTheme();
  const [analytics, setAnalytics] = useState<AnalyticsData>(initialData);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setRefreshing(true);
    try {
      const [analyticsRes, studentRes] = await Promise.all([
        adminService.getAnalytics(),
        adminService.getStudentAnalytics(),
      ]);

      const overview = analyticsRes?.data?.overview || analyticsRes?.overview || {};
      const engagement = analyticsRes?.data?.engagement || analyticsRes?.engagement || {};
      const recent = analyticsRes?.data?.recentActivity || analyticsRes?.recentActivity || {};
      const studentPayload = studentRes?.data || studentRes || {};
      const performance = studentPayload.performanceMetrics || {};
      const classDistribution = studentPayload.classDistribution || [];
      const topPerformersRaw = performance.topPerformers || [];

      const recentActivity = [
        ...(recent.videos || []).map((video: any, idx: number) => ({
          id: `video-${idx}`,
          action: `Video: ${video.title || 'Untitled'}`,
          user: 'Content',
          time: video.createdAt ? new Date(video.createdAt).toLocaleDateString() : '',
          type: 'video',
        })),
        ...(recent.assessments || []).map((item: any, idx: number) => ({
          id: `assessment-${idx}`,
          action: `Assessment: ${item.title || 'Untitled'}`,
          user: 'Assessment',
          time: item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '',
          type: 'assessment',
        })),
      ];

      setAnalytics({
        totalStudents: overview.totalStudents || 0,
        activeStudents: overview.activeStudents || 0,
        totalClasses: classDistribution.length,
        totalVideos: overview.totalVideos || 0,
        totalQuizzes: overview.totalAssessments || 0,
        totalAssessments: overview.totalAssessments || 0,
        averageScore: Math.round(Number(performance.averageScore) || 0),
        completionRate: engagement.studentEngagement || 0,
        recentActivity,
        classPerformance: classDistribution.map((item: any) => ({
          classNumber: item.className || item.class || '—',
          students: item.count || 0,
          averageScore: Math.round(Number(performance.averageScore) || 0),
          completionRate: engagement.studentEngagement || 0,
        })),
        topPerformers: topPerformersRaw.map((item: any, idx: number) => ({
          name: item.studentName || item.name || 'Student',
          class: item.classNumber || item.class || '—',
          score: Math.round(Number(item.averageScore || item.score) || 0),
          rank: idx + 1,
        })),
      });
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (isLoading) {
    return <AdminSkeletonStats />;
  }

  return (
    <AdminScreenShell refreshing={refreshing} onRefresh={() => fetchAnalytics(true)}>
      <AdminSectionHeader
        title="Analytics Dashboard"
        subtitle="Real-time school performance insights"
        icon="analytics-outline"
        action={
          <AdminScalePressable
            onPress={() => fetchAnalytics(true)}
            style={[styles.refreshBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, borderRadius: radius.sm }]}
          >
            <Ionicons name="refresh" size={16} color={colors.primary} />
            <Text style={[styles.refreshText, { color: colors.primary }]}>Refresh</Text>
          </AdminScalePressable>
        }
      />

      <AdminStatsRow
        items={[
          { label: 'Total Students', value: analytics.totalStudents, icon: 'people', gradientIndex: 0 },
          { label: 'Active Students', value: analytics.activeStudents, icon: 'pulse', gradientIndex: 1 },
          { label: 'Average Score', value: `${analytics.averageScore}%`, icon: 'trophy', gradientIndex: 2 },
          { label: 'Completion Rate', value: `${analytics.completionRate}%`, icon: 'checkmark-done', gradientIndex: 3 },
        ]}
      />

      <AdminGlassCard delay={100} style={{ marginTop: spacing.md, padding: spacing.md }}>
        <AdminSectionHeader title="Class Performance" icon="school-outline" />
        {analytics.classPerformance.map((item, idx) => (
          <View
            key={`${item.classNumber}-${idx}`}
            style={[styles.rowCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, borderRadius: radius.md }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: colors.text }]}>Class {item.classNumber}</Text>
              <Text style={[styles.rowSub, { color: colors.textMuted }]}>{item.students} students</Text>
            </View>
            <AdminAnimatedProgress
              label=""
              value={item.averageScore}
              showLabel={false}
              color={colors.primary}
            />
            <Text style={[styles.score, { color: colors.primary }]}>{item.averageScore}%</Text>
          </View>
        ))}
      </AdminGlassCard>

      <AdminGlassCard delay={150} style={{ marginTop: spacing.md, padding: spacing.md }}>
        <AdminSectionHeader title="Top Performers" icon="ribbon-outline" />
        {analytics.topPerformers.map((item, idx) => (
          <View
            key={`${item.name}-${idx}`}
            style={[styles.rowCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, borderRadius: radius.md }]}
          >
            <View style={[styles.rankPill, { backgroundColor: colors.warning }]}>
              <Text style={styles.rankText}>{item.rank}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: colors.text }]}>{item.name}</Text>
              <Text style={[styles.rowSub, { color: colors.textMuted }]}>Class {item.class}</Text>
            </View>
            <Text style={[styles.score, { color: colors.success }]}>{item.score}%</Text>
          </View>
        ))}
      </AdminGlassCard>

      <AdminGlassCard delay={200} style={{ marginTop: spacing.md, padding: spacing.md }}>
        <AdminSectionHeader title="Recent Activity" icon="time-outline" />
        {analytics.recentActivity.map((item, idx) => (
          <View
            key={item.id || `${idx}`}
            style={[styles.rowCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, borderRadius: radius.md }]}
          >
            <View style={[styles.activityIcon, { backgroundColor: colors.infoMuted }]}>
              <Ionicons name="pulse" size={14} color={colors.info} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: colors.text }]}>{item.action}</Text>
              <Text style={[styles.rowSub, { color: colors.textMuted }]}>by {item.user}</Text>
            </View>
            <Text style={[styles.timeText, { color: colors.textMuted }]}>{item.time}</Text>
          </View>
        ))}
      </AdminGlassCard>
    </AdminScreenShell>
  );
}

const styles = StyleSheet.create({
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  refreshText: { fontWeight: '700', fontSize: 12 },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  rowTitle: { fontSize: 14, fontWeight: '700' },
  rowSub: { fontSize: 12, marginTop: 2 },
  score: { fontSize: 16, fontWeight: '800', minWidth: 44, textAlign: 'right' },
  rankPill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  activityIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeText: { fontSize: 11 },
});
