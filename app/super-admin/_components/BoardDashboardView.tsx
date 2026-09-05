import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../src/services/api/api';
import { SUPER_ADMIN_FLOATING_TAB_BAR_PAD } from '../../../src/lib/responsive-layout';

interface BoardDashboardViewProps {
  boardCode?: string;
  onBack?: () => void;
}

interface BoardAnalytics {
  board: string;
  students: number;
  exams: number;
  totalAttempts: number;
  averageScore: string;
  participationRate: string;
}

export default function BoardDashboardView({ boardCode = 'ASLI_EXCLUSIVE_SCHOOLS' }: BoardDashboardViewProps) {
  const [boardData, setBoardData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [comparisonData, setComparisonData] = useState<BoardAnalytics[]>([]);
  const [isLoadingComparison, setIsLoadingComparison] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBoardDashboard();
  }, [boardCode]);

  useEffect(() => {
    if (boardData) {
      fetchBoardComparison();
    }
  }, [boardData]);

  const formatBoardName = (name: string): string => {
    if (!name) return name;
    if (name === 'ASLI EXCLUSIVE SCHOOLS' || name === 'ASLI_EXCLUSIVE_SCHOOLS') {
      return 'Asli Exclusive Schools';
    }
    return name;
  };

  const fetchBoardDashboard = async () => {
    setIsLoading(true);
    try {
      setError('');
      const response = await api.get(`/api/super-admin/boards/${boardCode}/dashboard`);
      const data = response?.data;
      if (data?.success) {
        setBoardData(data.data);
      } else {
        setBoardData(data?.data || data || null);
      }
    } catch (err: any) {
      const isNetwork = err?.code === 'ERR_NETWORK' || err?.message === 'Network Error';
      setError(
        err?.friendlyMessage ||
          (isNetwork
            ? 'Could not reach the server. Check your connection and try again.'
            : 'Error Fetching Board Dashboard'),
      );
      console.warn('Board dashboard fetch failed:', err?.code || err?.message || err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBoardComparison = async () => {
    setIsLoadingComparison(true);
    try {
      // Try comparison endpoint first
      const comparisonResponse = await api.get('/api/super-admin/boards/analytics/comparison');
      const comparisonData = comparisonResponse?.data;

      if (comparisonData?.success && comparisonData?.data) {
        const formatted = comparisonData.data.map((item: any) => ({
          board: formatBoardName(item.boardName || item.board),
          students: item.students || 0,
          exams: item.exams || 0,
          totalAttempts: item.totalAttempts || 0,
          averageScore: item.averageScore || '0.00',
          participationRate: item.participationRate || '0.0'
        }));
        setComparisonData(formatted);
        setIsLoadingComparison(false);
        return;
      }

      // Fallback: use dashboard data
      if (boardData && boardData.stats) {
        const stats = boardData.stats;
        const totalStudents = stats.students || 0;
        const totalAttempts = stats.examResults || stats.totalExamAttempts || 0;
        
        // Calculate participation rate: (total attempts / (students * exams)) * 100
        // Or simpler: (total attempts / students) * 100 if we want per-student participation
        let participationRate = '0.0';
        if (totalStudents > 0) {
          if (stats.exams > 0) {
            participationRate = ((totalAttempts / (totalStudents * stats.exams)) * 100).toFixed(1);
          } else {
            participationRate = ((totalAttempts / totalStudents) * 100).toFixed(1);
          }
        }
        
        const avgScore = stats.averageScore ? 
          (typeof stats.averageScore === 'number' ? stats.averageScore.toFixed(2) : String(stats.averageScore)) : 
          '0.00';
        
        const comparisonItem = {
          board: formatBoardName(boardData.board?.name || 'Asli Exclusive Schools'),
          students: totalStudents,
          exams: stats.exams || 0,
          totalAttempts: totalAttempts,
          averageScore: avgScore,
          participationRate: participationRate
        };
        
        console.log('Setting comparison data:', comparisonItem);
        setComparisonData([comparisonItem]);
      } else {
        // If no boardData yet, set empty array
        setComparisonData([]);
      }
    } catch (err: any) {
      console.warn('Board comparison fetch failed:', err?.code || err?.message || err);
    } finally {
      setIsLoadingComparison(false);
    }
  };

  const renderBarChart = (title: string, dataKey: keyof BoardAnalytics, color: string, maxValue?: number) => {
    if (comparisonData.length === 0) return null;

    const max = maxValue || Math.max(...comparisonData.map(a => {
      const value = a[dataKey];
      return typeof value === 'string' ? parseFloat(value) : value as number;
    }), 1);

    return (
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <View style={styles.chartTitleContainer}>
            <Ionicons name="bar-chart" size={20} color="#6b7280" />
            <Text style={styles.chartTitle}>{title}</Text>
          </View>
          <TouchableOpacity style={styles.exportButton}>
            <Ionicons name="download-outline" size={16} color="#6b7280" />
            <Text style={styles.exportButtonText}>Export</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.chartContent}>
          {comparisonData.map((item, idx) => {
            const value = item[dataKey];
            const numericValue = typeof value === 'string' ? parseFloat(value) : value as number;
            const percentage = max > 0 ? (numericValue / max) * 100 : 0;
            
            return (
              <View key={idx} style={styles.chartItem}>
                <View style={styles.chartItemHeader}>
                  <Text style={styles.chartItemLabel}>{item.board}</Text>
                  <Text style={styles.chartItemValue}>
                    {typeof value === 'string' ? value : value.toLocaleString()}
                    {dataKey === 'averageScore' || dataKey === 'participationRate' ? '%' : ''}
                  </Text>
                </View>
                <View style={styles.barContainer}>
                  <View style={[styles.bar, { width: `${Math.min(percentage, 100)}%`, backgroundColor: color }]}>
                    {percentage > 10 && (
                      <Text style={styles.barText}>
                        {typeof value === 'string' ? value : value.toLocaleString()}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f97316" />
          <Text style={styles.loadingText}>Loading Board Data...</Text>
        </View>
      </ScrollView>
    );
  }

  if (!boardData) {
    return (
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#5B6779" />
          <Text style={styles.errorText}>{error || 'No Board Data Available'}</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={fetchBoardDashboard}>
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  let boardName = boardData.board?.name || boardCode;
  if (boardName === 'ASLI EXCLUSIVE SCHOOLS' || boardName === 'ASLI_EXCLUSIVE_SCHOOLS') {
    boardName = 'Asli Exclusive Schools';
  }

  return (
    <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} nestedScrollEnabled>
      {/* Title — navigation via dashboard menu / FAB */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>{boardName}</Text>
          <Text style={styles.headerSubtitle}>Manage content, exams, subjects, and view analytics</Text>
        </View>
      </View>

      {/* Board Stats — clean cards (single surface, accent stripe + icon) */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { borderLeftColor: '#fb923c' }]}>
          <View style={styles.statCardTop}>
            <View style={[styles.statIconBadge, { backgroundColor: 'rgba(255,247,237,0.55)' }]}>
              <Ionicons name="people" size={20} color="#ea580c" />
            </View>
            <Text style={styles.statLabel}>Students</Text>
          </View>
          <Text style={styles.statValue}>
            {typeof boardData.stats?.students === 'number' ? boardData.stats.students.toLocaleString() : '0'}
          </Text>
        </View>

        <View style={[styles.statCard, { borderLeftColor: '#14b8a6' }]}>
          <View style={styles.statCardTop}>
            <View style={[styles.statIconBadge, { backgroundColor: '#f0fdfa' }]}>
              <Ionicons name="school" size={20} color="#0d9488" />
            </View>
            <Text style={styles.statLabel}>Teachers</Text>
          </View>
          <Text style={styles.statValue}>
            {typeof boardData.stats?.teachers === 'number' ? boardData.stats.teachers.toLocaleString() : '0'}
          </Text>
        </View>

        <View style={[styles.statCard, { borderLeftColor: '#f59e0b' }]}>
          <View style={styles.statCardTop}>
            <View style={[styles.statIconBadge, { backgroundColor: 'rgba(255,251,235,0.55)' }]}>
              <Ionicons name="document-text" size={20} color="#d97706" />
            </View>
            <Text style={styles.statLabel}>Exams</Text>
          </View>
          <Text style={styles.statValue}>
            {typeof boardData.stats?.exams === 'number' ? boardData.stats.exams.toLocaleString() : '0'}
          </Text>
        </View>

        <View style={[styles.statCard, { borderLeftColor: '#8b5cf6' }]}>
          <View style={styles.statCardTop}>
            <View style={[styles.statIconBadge, { backgroundColor: '#f5f3ff' }]}>
              <Ionicons name="analytics" size={20} color="#7c3aed" />
            </View>
            <Text style={styles.statLabel}>Avg Score</Text>
          </View>
          <Text style={styles.statValue}>
            {boardData.stats?.averageScore ? `${boardData.stats.averageScore}%` : '0.00%'}
          </Text>
        </View>
      </View>

      {/* Board Performance Comparison Section */}
      <View style={styles.section}>
        <View style={styles.comparisonHeader}>
          <View>
            <Text style={styles.sectionTitle}>Board Performance Comparison</Text>
            <Text style={styles.comparisonSubtitle}>Compare Performance Across All Boards</Text>
          </View>
          <TouchableOpacity style={styles.refreshButtonSmall} onPress={fetchBoardComparison}>
            <Ionicons name="refresh" size={16} color="#6b7280" />
            <Text style={styles.refreshButtonSmallText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {isLoadingComparison ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#f97316" />
            <Text style={styles.loadingText}>Loading Comparison Data...</Text>
          </View>
        ) : comparisonData.length === 0 ? (
          <View style={styles.emptyComparisonCard}>
            <Ionicons name="bar-chart" size={48} color="#5B6779" />
            <Text style={styles.emptyComparisonText}>No Comparison Data Available</Text>
          </View>
        ) : (
          <>
            {/* Summary Card - Single card for the board */}
            {comparisonData.length > 0 && (
              <View style={styles.summaryCardSingle}>
                <Text style={styles.summaryCardSingleTitle}>
                  {comparisonData[0].board}
                </Text>
                <Text style={styles.summaryCardSingleValue}>
                  {comparisonData[0].students.toLocaleString()}
                </Text>
                <Text style={styles.summaryCardSingleSubtext}>Students</Text>
                <View style={styles.summaryCardSingleDetails}>
                  <Text style={styles.summaryCardSingleDetail}>
                    Avg Score: {comparisonData[0].averageScore}%
                  </Text>
                  <Text style={styles.summaryCardSingleDetail}>
                    Participation: {comparisonData[0].participationRate}%
                  </Text>
                </View>
              </View>
            )}

            {/* Charts - Stacked vertically */}
            <View style={styles.chartsContainer}>
              {renderBarChart('Number Of Students', 'students', '#3b82f6')}
              {renderBarChart('Average Score (%)', 'averageScore', '#10b981', 100)}
              {renderBarChart('Total Exam Attempts', 'totalAttempts', '#a855f7')}
              {renderBarChart('Participation Rate (%)', 'participationRate', '#f97316', 100)}
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  scrollContent: { paddingBottom: SUPER_ADMIN_FLOATING_TAB_BAR_PAD + 48, flexGrow: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 24,
  },
  refreshButton: {
    backgroundColor: '#f97316',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerText: {
    marginTop: 0,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  statIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.4,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 16,
  },
  schoolList: {
    gap: 12,
  },
  schoolCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  schoolCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  schoolCardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  schoolCardName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  schoolCardAdmin: {
    fontSize: 12,
    color: '#6b7280',
  },
  schoolCardStats: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  schoolStatItem: {
    flex: 1,
  },
  schoolStatLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  schoolStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  comparisonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  comparisonSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  refreshButtonSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#FFFFFF',
    gap: 6,
  },
  refreshButtonSmallText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  summaryCardSingle: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryCardSingleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  summaryCardSingleValue: {
    fontSize: 36,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  summaryCardSingleSubtext: {
    fontSize: 14,
    color: '#5B6779',
    marginBottom: 16,
  },
  summaryCardSingleDetails: {
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  summaryCardSingleDetail: {
    fontSize: 14,
    color: '#6b7280',
  },
  chartsContainer: {
    gap: 16,
  },
  chartCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 4,
  },
  exportButtonText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  chartContent: {
    gap: 16,
  },
  chartItem: {
    gap: 8,
  },
  chartItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chartItemLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  chartItemValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  barContainer: {
    width: '100%',
    height: 24,
    backgroundColor: '#e5e7eb',
    borderRadius: 12,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 8,
  },
  barText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  emptyComparisonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyComparisonText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
  },
});

