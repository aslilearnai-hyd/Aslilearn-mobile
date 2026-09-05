import { storageGetItem } from '../../../src/lib/safe-storage';
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE_URL } from '../../../src/lib/api-config';
import { GlassPanel } from '../../../src/components/ui';

interface StudentRanking {
  examId: string;
  examTitle: string;
  rank: number;
  totalStudents: number;
  percentile: number;
  percentage: number;
  obtainedMarks: number;
  totalMarks: number;
  completedAt: string;
}

export default function StudentRankingView() {
  const [rankings, setRankings] = useState<StudentRanking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStudentRanking();
  }, []);

  const fetchStudentRanking = async () => {
    setIsLoading(true);
    try {
      const token = await storageGetItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/student/rankings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setRankings(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch student ranking:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPercentileBadge = (percentile: number) => {
    if (percentile >= 90) return { color: '#fef3c7', text: '#d97706', label: 'Top 10%' };
    if (percentile >= 75) return { color: '#d1fae5', text: '#059669', label: 'Top 25%' };
    if (percentile >= 50) return { color: '#dbeafe', text: '#2563eb', label: 'Top 50%' };
    return { color: '#f3f4f6', text: '#6b7280', label: 'Below 50%' };
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading Rankings...</Text>
      </View>
    );
  }

  if (rankings.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="trophy-outline" size={64} color="#5B6779" />
        <Text style={styles.emptyText}>No Rankings Yet</Text>
        <Text style={styles.emptySubtext}>Complete Exams To See Your Rankings</Text>
      </View>
    );
  }

  const averagePercentile = Math.round(rankings.reduce((sum, r) => sum + r.percentile, 0) / rankings.length);
  const averageScore = (rankings.reduce((sum, r) => sum + r.percentage, 0) / rankings.length).toFixed(1);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Overall Summary */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <Ionicons name="bar-chart" size={24} color="#9333ea" />
          <Text style={styles.summaryTitle}>Overall Performance Summary</Text>
        </View>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Average Percentile</Text>
            <Text style={styles.summaryValue}>{averagePercentile}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Exams Completed</Text>
            <Text style={styles.summaryValue}>{rankings.length}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Average Score</Text>
            <Text style={styles.summaryValue}>{averageScore}%</Text>
          </View>
        </View>
      </View>

      {/* Individual Rankings */}
      {rankings.map((ranking, idx) => {
        const percentileBadge = getPercentileBadge(ranking.percentile);
        
        return (
          <GlassPanel key={ranking.examId || idx} radius={12} style={styles.rankingCard}>
            <View style={styles.rankingHeader}>
              <View style={styles.rankingPosition}>
                <Text style={styles.rankingPositionText}>#{ranking.rank}</Text>
              </View>
              <View style={styles.rankingInfo}>
                <Text style={styles.rankingTitle}>{ranking.examTitle || 'Exam'}</Text>
                <Text style={styles.rankingSubtitle}>
                  Score: {ranking.percentage.toFixed(1)}% | Marks: {ranking.obtainedMarks}/{ranking.totalMarks}
                </Text>
              </View>
              {ranking.rank <= 3 && (
                <View style={styles.rankingTrophy}>
                  <Ionicons 
                    name="trophy" 
                    size={24} 
                    color={ranking.rank === 1 ? '#fbbf24' : ranking.rank === 2 ? '#94a3b8' : '#cd7f32'} 
                  />
                </View>
              )}
            </View>
            <View style={styles.rankingStats}>
              <View style={[styles.rankingStatCard, { backgroundColor: '#dbeafe' }]}>
                <Ionicons name="trophy" size={16} color="#2563eb" />
                <Text style={styles.rankingStatLabel}>Rank</Text>
                <Text style={[styles.rankingStatValue, { color: '#2563eb' }]}>
                  #{ranking.rank}
                </Text>
                <Text style={styles.rankingStatSubtext}>Out Of {ranking.totalStudents}</Text>
              </View>
              <View style={[styles.rankingStatCard, { backgroundColor: percentileBadge.color }]}>
                <Ionicons name="trending-up" size={16} color={percentileBadge.text} />
                <Text style={styles.rankingStatLabel}>Percentile</Text>
                <Text style={[styles.rankingStatValue, { color: percentileBadge.text }]}>
                  {ranking.percentile}
                </Text>
                <View style={[styles.percentileBadge, { backgroundColor: percentileBadge.color }]}>
                  <Text style={[styles.percentileBadgeText, { color: percentileBadge.text }]}>
                    {percentileBadge.label}
                  </Text>
                </View>
              </View>
            </View>
            {ranking.completedAt && (
              <View style={styles.rankingFooter}>
                <Ionicons name="calendar" size={14} color="#6b7280" />
                <Text style={styles.rankingFooterText}>
                  Completed: {new Date(ranking.completedAt).toLocaleDateString()}
                </Text>
              </View>
            )}
          </GlassPanel>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: '#f3e8ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#9333ea',
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryItem: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#9333ea',
  },
  rankingCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rankingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  rankingPosition: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankingPositionText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  rankingInfo: {
    flex: 1,
    gap: 4,
  },
  rankingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  rankingSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  rankingTrophy: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankingStats: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  rankingStatCard: {
    flex: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  rankingStatLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  rankingStatValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  rankingStatSubtext: {
    fontSize: 10,
    color: '#5B6779',
    marginTop: 4,
  },
  percentileBadge: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  percentileBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  rankingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  rankingFooterText: {
    fontSize: 12,
    color: '#6b7280',
  },
});


