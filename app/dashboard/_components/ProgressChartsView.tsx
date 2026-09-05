import { storageGetItem } from '../../../src/lib/safe-storage';
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../../../src/lib/api-config';
import { getWeeklyStudyData } from '../../../src/utils/studyTimeTracker';
import { GlassPanel } from '../../../src/components/ui';

const { width } = Dimensions.get('window');

interface ChartData {
  labels: string[];
  values: number[];
  maxValue: number;
}

export default function ProgressChartsView() {
  const [studyTimeData, setStudyTimeData] = useState<ChartData | null>(null);
  const [subjectProgress, setSubjectProgress] = useState<any[]>([]);
  const [performanceData, setPerformanceData] = useState<ChartData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchChartData();
  }, []);

  const fetchChartData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch study time data
      const weeklyData = await getWeeklyStudyData();
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const labels = days;
      const values = Object.values(weeklyData).slice(0, 7).reverse();
      const maxValue = Math.max(...values, 1);
      
      setStudyTimeData({ labels, values, maxValue });

      // Fetch subject progress
      const token = await storageGetItem('authToken');
      const progressRes = await fetch(`${API_BASE_URL}/api/student/learning-progress`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (progressRes.ok) {
        const progressData = await progressRes.json();
        const records = progressData.data?.progressRecords || progressData.progressRecords || [];
        
        // Group by subject
        const subjectMap = new Map<string, { completed: number; total: number }>();
        records.forEach((record: any) => {
          const subjectId = record.contentId?.subject?._id || record.videoId?.subject?._id;
          const subjectName = record.contentId?.subject?.name || record.videoId?.subject?.name || 'General';
          if (subjectId) {
            if (!subjectMap.has(subjectId)) {
              subjectMap.set(subjectId, { completed: 0, total: 0 });
            }
            const data = subjectMap.get(subjectId)!;
            data.total++;
            if (record.completed) {
              data.completed++;
            }
          }
        });

        const subjectProgressData = Array.from(subjectMap.entries()).map(([subjectId, data]) => ({
          subjectId,
          subjectName: records.find((r: any) => 
            (r.contentId?.subject?._id || r.videoId?.subject?._id) === subjectId
          )?.contentId?.subject?.name || 'General',
          progress: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
          completed: data.completed,
          total: data.total
        }));

        setSubjectProgress(subjectProgressData);
      }

      // Fetch performance data (exam scores over time)
      const examsRes = await fetch(`${API_BASE_URL}/api/student/exam-results`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (examsRes.ok) {
        const examsData = await examsRes.json();
        const results = examsData.data || examsData || [];
        
        // Get last 7 exam results
        const recentResults = results.slice(0, 7).reverse();
        const performanceLabels = recentResults.map((r: any, i: number) => `Exam ${i + 1}`);
        const performanceValues = recentResults.map((r: any) => r.score || r.percentage || 0);
        const performanceMax = Math.max(...performanceValues, 100);

        setPerformanceData({
          labels: performanceLabels,
          values: performanceValues,
          maxValue: performanceMax
        });
      }
    } catch (error) {
      console.error('Failed to fetch chart data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderBarChart = (data: ChartData, title: string, color: string) => {
    const barWidth = (width - 64) / data.labels.length - 8;
    
    return (
      <GlassPanel style={styles.chartContainer} radius={16}>
        <Text style={styles.chartTitle}>{title}</Text>
        <View style={styles.chartContent}>
          <View style={styles.chartBars}>
            {data.labels.map((label, index) => {
              const height = (data.values[index] / data.maxValue) * 150;
              return (
                <View key={index} style={styles.barContainer}>
                  <View style={styles.barWrapper}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: Math.max(height, 4),
                          backgroundColor: color,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.barLabel} numberOfLines={1}>
                    {label}
                  </Text>
                  <Text style={styles.barValue}>{data.values[index]}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </GlassPanel>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading Charts...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Study Time Chart */}
      {studyTimeData && (
        <View style={styles.section}>
          {renderBarChart(studyTimeData, 'Weekly Study Time (Minutes)', '#3b82f6')}
        </View>
      )}

      {/* Subject Progress */}
      {subjectProgress.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subject Progress</Text>
          {subjectProgress.map((subject) => (
            <GlassPanel key={subject.subjectId} style={styles.subjectCard} radius={12}>
              <View style={styles.subjectHeader}>
                <Text style={styles.subjectName}>{subject.subjectName}</Text>
                <Text style={styles.subjectProgress}>{subject.progress}%</Text>
              </View>
              <View style={styles.progressBarContainer}>
                <LinearGradient
                  colors={['#3b82f6', '#2563eb']}
                  style={[styles.progressBarFill, { width: `${subject.progress}%` }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
              </View>
              <Text style={styles.subjectStats}>
                {subject.completed} Of {subject.total} Completed
              </Text>
            </GlassPanel>
          ))}
        </View>
      )}

      {/* Performance Chart */}
      {performanceData && performanceData.values.length > 0 && (
        <View style={styles.section}>
          {renderBarChart(performanceData, 'Exam Performance (%)', '#10b981')}
        </View>
      )}

      {/* Summary Cards */}
      <View style={styles.summarySection}>
        <View style={styles.summaryCard}>
          <LinearGradient
            colors={['#3b82f6', '#2563eb']}
            style={styles.summaryCardGradient}
          >
            <Ionicons name="time" size={32} color="#fff" />
            <Text style={styles.summaryValue}>
              {studyTimeData ? studyTimeData.values.reduce((a, b) => a + b, 0) : 0}
            </Text>
            <Text style={styles.summaryLabel}>Total Minutes</Text>
          </LinearGradient>
        </View>
        <View style={styles.summaryCard}>
          <LinearGradient
            colors={['#10b981', '#059669']}
            style={styles.summaryCardGradient}
          >
            <Ionicons name="trophy" size={32} color="#fff" />
            <Text style={styles.summaryValue}>
              {performanceData && performanceData.values.length > 0
                ? Math.round(performanceData.values.reduce((a, b) => a + b, 0) / performanceData.values.length)
                : 0}%
            </Text>
            <Text style={styles.summaryLabel}>Avg Score</Text>
          </LinearGradient>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Transparent so the app background artwork shows through.
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  section: {
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 16,
  },
  chartContainer: {
    // Fill comes from GlassPanel's blur + tint, not a solid colour.
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
    textAlign: 'center',
  },
  chartContent: {
    alignItems: 'center',
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    width: '100%',
    height: 200,
    paddingBottom: 40,
  },
  barContainer: {
    alignItems: 'center',
    flex: 1,
  },
  barWrapper: {
    width: '80%',
    height: 150,
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  bar: {
    width: '100%',
    borderRadius: 4,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 10,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
  },
  barValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
    marginTop: 4,
  },
  subjectCard: {
    // Fill comes from GlassPanel's blur + tint, not a solid colour.
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  subjectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  subjectName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  subjectProgress: {
    fontSize: 18,
    fontWeight: '800',
    color: '#3b82f6',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  subjectStats: {
    fontSize: 12,
    color: '#6b7280',
  },
  summarySection: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    paddingBottom: 32,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  summaryCardGradient: {
    padding: 24,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginTop: 12,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
});


