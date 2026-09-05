import { storageGetItem } from '../../../src/lib/safe-storage';
import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE_URL } from '../../../src/lib/api-config';
import { getMergedStudyTime } from '../../../src/lib/session-time-sync';
import { GlassPanel } from '../../../src/components/ui';

interface RealTimeMetric {
  label: string;
  value: number | string;
  change?: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

type ActivityItem = {
  id: string;
  text: string;
  time: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
};

function timeAgo(dateStr?: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just Now';
  if (mins < 60) return `${mins}m Ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h Ago`;
  return `${Math.floor(hrs / 24)}d Ago`;
}

export default function RealTimeAnalyticsView() {
  const [metrics, setMetrics] = useState<RealTimeMetric[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [weekTrend, setWeekTrend] = useState(0);
  const [monthTrend, setMonthTrend] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchAnalytics();
    intervalRef.current = setInterval(() => fetchAnalytics(), 15000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const fetchAnalytics = async () => {
    try {
      const token = await storageGetItem('authToken');
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const [studyTime, progressRes, examsRes, homeworkRes] = await Promise.all([
        getMergedStudyTime(),
        fetch(`${API_BASE_URL}/api/student/learning-progress`, { headers }),
        fetch(`${API_BASE_URL}/api/student/exam-results`, { headers }),
        fetch(`${API_BASE_URL}/api/student/homework-submissions`, { headers }),
      ]);

      const newMetrics: RealTimeMetric[] = [];
      const todayMins = studyTime.today;
      newMetrics.push({
        label: 'Study Time Today',
        value: todayMins >= 60 ? `${Math.floor(todayMins / 60)}h ${todayMins % 60}m` : `${todayMins}m`,
        icon: 'time',
        color: '#3b82f6',
      });

      if (progressRes.ok) {
        const progressData = await progressRes.json();
        const overallProgress = progressData.data?.overallProgress || progressData.overallProgress || 0;
        newMetrics.push({
          label: 'Overall Progress',
          value: `${Math.round(overallProgress)}%`,
          icon: 'trending-up',
          color: '#10b981',
        });
      }

      let examResults: any[] = [];
      if (examsRes.ok) {
        const examsData = await examsRes.json();
        examResults = Array.isArray(examsData.data) ? examsData.data : [];
        if (examResults.length > 0) {
          const latest = examResults[0];
          const latestScore = latest.percentage ?? latest.score ?? 0;
          newMetrics.push({
            label: 'Latest Exam Score',
            value: `${Math.round(latestScore)}%`,
            icon: 'trophy',
            color: '#f59e0b',
          });
        }
      }

      newMetrics.push({
        label: 'Exams Taken',
        value: String(examResults.length),
        icon: 'document-text',
        color: '#8b5cf6',
      });

      const activityFeed: ActivityItem[] = [];
      examResults.slice(0, 3).forEach((r) => {
        activityFeed.push({
          id: `exam-${r._id}`,
          text: `Completed Exam: ${r.examTitle || r.examName || 'Exam'} — ${Math.round(r.percentage || 0)}%`,
          time: timeAgo(r.completedAt || r.createdAt),
          icon: 'checkmark-circle',
          iconColor: '#10b981',
        });
      });

      if (homeworkRes.ok) {
        const hwData = await homeworkRes.json();
        const homework = Array.isArray(hwData.data) ? hwData.data : [];
        homework
          .filter((h: any) => h.status === 'submitted' || h.submittedAt)
          .slice(0, 2)
          .forEach((h: any) => {
            activityFeed.push({
              id: `hw-${h._id}`,
              text: `Submitted Homework: ${h.title || h.subject || 'Assignment'}`,
              time: timeAgo(h.submittedAt || h.updatedAt),
              icon: 'document-text',
              iconColor: '#f59e0b',
            });
          });
      }

      const now = Date.now();
      const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
      const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
      const weekScores = examResults.filter((r) => new Date(r.completedAt || 0).getTime() >= weekAgo);
      const monthScores = examResults.filter((r) => new Date(r.completedAt || 0).getTime() >= monthAgo);
      const avg = (rows: any[]) =>
        rows.length
          ? rows.reduce((s, r) => s + (Number(r.percentage) || 0), 0) / rows.length
          : 0;
      const weekAvg = avg(weekScores);
      const monthAvg = avg(monthScores);
      const prevWeek = examResults.filter((r) => {
        const t = new Date(r.completedAt || 0).getTime();
        return t >= weekAgo * 2 - now + weekAgo && t < weekAgo;
      });
      const prevMonth = examResults.filter((r) => {
        const t = new Date(r.completedAt || 0).getTime();
        return t >= monthAgo * 2 - now + monthAgo && t < monthAgo;
      });
      setWeekTrend(Math.round(weekAvg - avg(prevWeek)));
      setMonthTrend(Math.round(monthAvg - avg(prevMonth)));

      setMetrics(newMetrics);
      setActivities(activityFeed.slice(0, 5));
      setLastUpdate(new Date());
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      setIsLoading(false);
    }
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading Analytics...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <GlassPanel radius={0} bordered={false} tone="light" style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Real-Time Analytics</Text>
            <Text style={styles.headerSubtitle}>Last Updated: {formatTime(lastUpdate)}</Text>
          </View>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>
      </GlassPanel>

      <View style={styles.metricsGrid}>
        {metrics.map((metric, index) => (
          <View key={index} style={styles.metricCard}>
            <LinearGradient colors={[metric.color, `${metric.color}DD`]} style={styles.metricGradient}>
              <Ionicons name={metric.icon} size={32} color="#fff" />
              <Text style={styles.metricValue}>{metric.value}</Text>
              <Text style={styles.metricLabel}>{metric.label}</Text>
            </LinearGradient>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.activityList}>
          {activities.length === 0 ? (
            <Text style={styles.emptyText}>No Recent Activity Yet.</Text>
          ) : (
            activities.map((item) => (
              <GlassPanel key={item.id} radius={12} style={styles.activityItem}>
                <View style={styles.activityRow}>
                  <View style={styles.activityIcon}>
                    <Ionicons name={item.icon} size={20} color={item.iconColor} />
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityText}>{item.text}</Text>
                    <Text style={styles.activityTime}>{item.time}</Text>
                  </View>
                </View>
              </GlassPanel>
            ))
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance Trends</Text>
        {/* tone="strong" keeps the trend bars legible against the artwork. */}
        <GlassPanel radius={12} tone="strong" style={styles.trendCard}>
          <View style={styles.trendHeader}>
            <Text style={styles.trendLabel}>This Week</Text>
            <Text style={[styles.trendValue, weekTrend < 0 && styles.trendDown]}>
              {weekTrend >= 0 ? '+' : ''}
              {weekTrend}%
            </Text>
          </View>
          <View style={styles.trendBar}>
            <LinearGradient
              colors={weekTrend >= 0 ? ['#10b981', '#059669'] : ['#ef4444', '#dc2626']}
              style={[styles.trendBarFill, { width: `${Math.min(100, Math.max(10, 50 + weekTrend))}%` }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </View>
        </GlassPanel>
        <GlassPanel radius={12} tone="strong" style={styles.trendCard}>
          <View style={styles.trendHeader}>
            <Text style={styles.trendLabel}>This Month</Text>
            <Text style={[styles.trendValue, monthTrend < 0 && styles.trendDown]}>
              {monthTrend >= 0 ? '+' : ''}
              {monthTrend}%
            </Text>
          </View>
          <View style={styles.trendBar}>
            <LinearGradient
              colors={monthTrend >= 0 ? ['#3b82f6', '#2563eb'] : ['#ef4444', '#dc2626']}
              style={[styles.trendBarFill, { width: `${Math.min(100, Math.max(10, 50 + monthTrend))}%` }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </View>
        </GlassPanel>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Transparent so the app background artwork shows through.
  container: { flex: 1, backgroundColor: 'transparent' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#6b7280' },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 4 },
  headerSubtitle: { fontSize: 12, color: '#6b7280' },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' },
  liveText: { fontSize: 12, fontWeight: '700', color: '#ef4444' },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 12 },
  metricCard: {
    width: '47%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  metricGradient: { padding: 20, alignItems: 'center', minHeight: 140 },
  metricValue: { fontSize: 32, fontWeight: '800', color: '#fff', marginTop: 12, marginBottom: 8 },
  metricLabel: { fontSize: 14, color: 'rgba(255, 255, 255, 0.9)', textAlign: 'center' },
  section: { padding: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 16 },
  activityList: { gap: 12 },
  emptyText: { color: '#5B6779', textAlign: 'center', padding: 16 },
  activityItem: {
    borderRadius: 12,
    padding: 16,
    elevation: 3,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: { flex: 1 },
  activityText: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 4 },
  activityTime: { fontSize: 12, color: '#6b7280' },
  trendCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 3,
  },
  trendHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  trendLabel: { fontSize: 14, fontWeight: '600', color: '#111827' },
  trendValue: { fontSize: 18, fontWeight: '800', color: '#10b981' },
  trendDown: { color: '#ef4444' },
  trendBar: { height: 8, backgroundColor: '#f3f4f6', borderRadius: 4, overflow: 'hidden' },
  trendBarFill: { height: '100%', borderRadius: 4 },
});
