import React, { useMemo } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import GlassCard from '../../../src/components/student/GlassCard';
import { STUDENT, STUDENT_RADIUS, STUDENT_SPACING } from '../../../src/theme/student';

export type StudentRankingRow = {
  resultId?: string;
  _id?: string;
  examId?: string | { title?: string };
  examTitle?: string;
  attemptNumber?: number;
  rank?: number;
  totalStudents?: number;
  percentile?: number;
  percentage?: number;
  obtainedMarks?: number;
  totalMarks?: number;
  completedAt?: string;
};

function getRankingPercentile(ranking: StudentRankingRow): number {
  if (typeof ranking.percentile === 'number' && Number.isFinite(ranking.percentile)) {
    return ranking.percentile;
  }
  const rank = Number(ranking.rank);
  const total = Number(ranking.totalStudents);
  if (rank >= 1 && total > 0) {
    return Math.round(((total - (rank - 1)) / total) * 100);
  }
  return 0;
}

function getPercentileBadge(percentile: number) {
  if (percentile >= 90) return { bg: '#fef3c7', text: '#92400e', label: 'Top 10%' };
  if (percentile >= 75) return { bg: '#d1fae5', text: '#065f46', label: 'Top 25%' };
  if (percentile >= 50) return { bg: '#dbeafe', text: '#1e40af', label: 'Top 50%' };
  return { bg: '#f3f4f6', text: '#374151', label: 'Below 50%' };
}

function rankingRowKey(ranking: StudentRankingRow, idx: number): string {
  return [ranking.resultId, ranking._id, ranking.examId, ranking.completedAt, idx]
    .map((x) => String(x ?? ''))
    .join('|');
}

function podiumIcon(index: number): keyof typeof Ionicons.glyphMap {
  if (index === 0) return 'ribbon';
  if (index === 1) return 'medal';
  return 'trophy';
}

function podiumIconColor(index: number): string {
  if (index === 0) return '#f59e0b';
  if (index === 1) return '#64748b';
  return '#ea580c';
}

type Props = {
  rankings: StudentRankingRow[];
};

export default function RankingsTab({ rankings }: Props) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const sortedRankings = useMemo(
    () =>
      [...rankings].sort((a, b) => {
        const rankA = Number(a.rank) || 9999;
        const rankB = Number(b.rank) || 9999;
        if (rankA !== rankB) return rankA - rankB;
        return Number(b.percentage ?? 0) - Number(a.percentage ?? 0);
      }),
    [rankings]
  );

  const topThree = sortedRankings.slice(0, 3);

  const avgPercentile = sortedRankings.length
    ? Math.round(
        sortedRankings.reduce((sum, r) => sum + getRankingPercentile(r), 0) / sortedRankings.length
      )
    : 0;

  const avgScore = sortedRankings.length
    ? sortedRankings.reduce((sum, r) => sum + Number(r.percentage ?? 0), 0) / sortedRankings.length
    : 0;

  if (sortedRankings.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="trophy-outline" size={48} color="#5B6779" />
        <Text style={styles.emptyText}>No exam results found. Complete an exam to see your rankings.</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Your Performance Rankings</Text>
        <Text style={styles.pageSub}>Your Rank And Percentile Across All Exams</Text>
      </View>

      <View style={[styles.topThreeGrid, isTablet && styles.topThreeGridTablet]}>
        {topThree.map((ranking, idx) => {
          const percentile = getRankingPercentile(ranking);
          const badge = getPercentileBadge(percentile);
          const attempt = Number(ranking.attemptNumber) >= 1 ? Number(ranking.attemptNumber) : null;

          return (
            <LinearGradient
              key={rankingRowKey(ranking, idx)}
              colors={['rgba(239,246,255,0.92)', 'rgba(219,234,254,0.78)', 'rgba(191,219,254,0.62)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.podiumCard}
            >
              <View style={styles.podiumHead}>
                <View style={styles.podiumTitleWrap}>
                  <Text style={styles.podiumTitle} numberOfLines={2}>
                    {ranking.examTitle || 'Exam'}
                  </Text>
                  <Text style={styles.podiumAttempt}>
                    {attempt != null ? `Attempt ${attempt}` : `Result #${idx + 1}`}
                  </Text>
                </View>
                <View style={styles.podiumIconWrap}>
                  <Ionicons name={podiumIcon(idx)} size={18} color={podiumIconColor(idx)} />
                </View>
              </View>

              <View style={styles.podiumRankRow}>
                <Text style={styles.podiumRank}>#{ranking.rank ?? idx + 1}</Text>
                <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                  <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
                </View>
              </View>

              <View style={styles.podiumStats}>
                <View style={styles.podiumStatBox}>
                  <Text style={styles.podiumStatLabel}>Score</Text>
                  <Text style={styles.podiumStatValue}>{Number(ranking.percentage ?? 0).toFixed(1)}%</Text>
                </View>
                <View style={styles.podiumStatBox}>
                  <Text style={styles.podiumStatLabel}>Percentile</Text>
                  <Text style={styles.podiumStatValue}>{percentile}</Text>
                </View>
              </View>
            </LinearGradient>
          );
        })}
      </View>

      <GlassCard variant="glass" padding={16} style={styles.leaderboardCard}>
        <Text style={styles.leaderboardTitle}>Leaderboard</Text>
        <View style={styles.leaderboardList}>
          {sortedRankings.map((ranking, idx) => {
            const percentile = getRankingPercentile(ranking);
            const badge = getPercentileBadge(percentile);
            const attempt = Number(ranking.attemptNumber) >= 1 ? Number(ranking.attemptNumber) : null;
            const completedLabel = ranking.completedAt
              ? new Date(ranking.completedAt).toLocaleDateString()
              : '';

            return (
              <View key={rankingRowKey(ranking, idx)} style={styles.leaderboardRow}>
                <View style={styles.leaderboardMain}>
                  <Text style={styles.leaderboardExamTitle} numberOfLines={2}>
                    {ranking.examTitle || 'Exam'}
                  </Text>
                  <Text style={styles.leaderboardMeta} numberOfLines={2}>
                    {attempt != null ? `Attempt ${attempt} • ` : ''}
                    {ranking.obtainedMarks ?? 0}/{ranking.totalMarks ?? 0} Marks
                    {completedLabel ? ` • ${completedLabel}` : ''}
                  </Text>
                </View>
                <View style={styles.leaderboardBadges}>
                  <View style={[styles.badge, styles.rankBadge]}>
                    <Text style={[styles.badgeText, styles.rankBadgeText]}>
                      Rank #{ranking.rank ?? idx + 1}/{ranking.totalStudents ?? '—'}
                    </Text>
                  </View>
                  <View style={[styles.badge, styles.scoreBadge]}>
                    <Text style={[styles.badgeText, styles.scoreBadgeText]}>
                      {Number(ranking.percentage ?? 0).toFixed(1)}%
                    </Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.badgeText, { color: badge.text }]}>P{percentile}</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </GlassCard>

      <LinearGradient colors={['#faf5ff', '#fdf2f8']} style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <Ionicons name="bar-chart" size={20} color="#581c87" />
          <Text style={styles.summaryTitle}>Overall Performance Summary</Text>
        </View>
        <View style={[styles.summaryGrid, isTablet && styles.summaryGridTablet]}>
          <View style={[styles.summaryItem, isTablet && styles.summaryItemTablet]}>
            <Text style={styles.summaryLabel}>Average Percentile</Text>
            <Text style={styles.summaryValue}>{avgPercentile}</Text>
          </View>
          <View style={[styles.summaryItem, isTablet && styles.summaryItemTablet]}>
            <Text style={styles.summaryLabel}>Exams Completed</Text>
            <Text style={styles.summaryValue}>{sortedRankings.length}</Text>
          </View>
          <View style={[styles.summaryItem, isTablet && styles.summaryItemTablet]}>
            <Text style={styles.summaryLabel}>Average Score</Text>
            <Text style={styles.summaryValue}>{avgScore.toFixed(1)}%</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: STUDENT_SPACING.lg },
  pageHeader: { gap: 4 },
  pageTitle: { fontSize: 22, fontWeight: '800', color: STUDENT.text },
  pageSub: { fontSize: 14, color: STUDENT.textMuted },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 12,
  },
  emptyText: { fontSize: 14, color: STUDENT.textMuted, textAlign: 'center', lineHeight: 20 },
  topThreeGrid: { gap: STUDENT_SPACING.md },
  topThreeGridTablet: { flexDirection: 'row', alignItems: 'stretch' },
  podiumCard: {
    borderRadius: STUDENT_RADIUS.lg,
    padding: 16,
    gap: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(147,197,253,0.85)',
    backgroundColor: 'rgba(239,246,255,0.55)',
    shadowColor: '#93c5fd',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 3,
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
  },
  podiumHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  podiumTitleWrap: { flex: 1, minWidth: 0 },
  podiumTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a', lineHeight: 20 },
  podiumAttempt: { fontSize: 12, color: '#64748b', marginTop: 4 },
  podiumIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(191,219,254,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumRankRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 },
  podiumRank: { fontSize: 30, fontWeight: '800', color: '#1d4ed8' },
  podiumStats: { flexDirection: 'row', gap: 10 },
  podiumStatBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(147,197,253,0.7)',
    padding: 10,
    gap: 4,
  },
  podiumStatLabel: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  podiumStatValue: { fontSize: 14, fontWeight: '700', color: '#1e3a8a' },
  leaderboardCard: { gap: 12 },
  leaderboardTitle: { fontSize: 17, fontWeight: '800', color: STUDENT.text },
  leaderboardList: { gap: 10 },
  leaderboardRow: {
    borderWidth: 1,
    borderColor: '#f3f4f6',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    padding: 12,
    gap: 10,
  },
  leaderboardMain: { gap: 4, minWidth: 0 },
  leaderboardExamTitle: { fontSize: 15, fontWeight: '700', color: STUDENT.text },
  leaderboardMeta: { fontSize: 12, color: STUDENT.textMuted, lineHeight: 16 },
  leaderboardBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  rankBadge: { backgroundColor: '#e0e7ff' },
  rankBadgeText: { color: '#3730a3' },
  scoreBadge: { backgroundColor: '#d1fae5' },
  scoreBadgeText: { color: '#065f46' },
  summaryCard: {
    borderRadius: STUDENT_RADIUS.lg,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: '#f3e8ff',
  },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryTitle: { fontSize: 17, fontWeight: '800', color: '#581c87' },
  summaryGrid: { gap: 10 },
  summaryGridTablet: { flexDirection: 'row', gap: 12 },
  summaryItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 6,
  },
  summaryItemTablet: { flex: 1, minWidth: 0 },
  summaryLabel: { fontSize: 13, color: STUDENT.textMuted, textAlign: 'center' },
  summaryValue: { fontSize: 28, fontWeight: '800', color: '#581c87', textAlign: 'center' },
});
