import { storageGetItem } from '../../../src/lib/safe-storage';
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE_URL } from '../../../src/lib/api-config';
import { GlassPanel } from '../../../src/components/ui';

interface ProgressRecord {
  _id: string;
  contentId?: {
    _id: string;
    title: string;
    type: string;
    subject?: {
      _id: string;
      name: string;
    } | string;
  };
  videoId?: {
    _id: string;
    title: string;
    subject?: {
      _id: string;
      name: string;
    } | string;
  };
  assessmentId?: {
    _id: string;
    title: string;
    subject?: {
      _id: string;
      name: string;
    } | string;
  };
  completed: boolean;
  progress: number;
  timeSpent: number;
  score?: number;
  lastAccessed: string;
}

interface ProgressStats {
  overallProgress: number;
  completedContent: number;
  totalContent: number;
  totalTimeSpent: number;
  averageScore: number;
  subjectProgress: Array<{
    subjectId: string;
    subjectName: string;
    progress: number;
    completed: number;
    total: number;
  }>;
}

export default function StudentProgressView() {
  const [progressRecords, setProgressRecords] = useState<ProgressRecord[]>([]);
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [subjects, setSubjects] = useState<any[]>([]);

  useEffect(() => {
    fetchProgress();
    fetchSubjects();
  }, [selectedSubject]);

  const fetchSubjects = async () => {
    try {
      const token = await storageGetItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/subjects`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSubjects(data.subjects || data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
    }
  };

  const fetchProgress = async () => {
    try {
      setIsLoading(true);
      const token = await storageGetItem('authToken');
      const url = selectedSubject !== 'all'
        ? `${API_BASE_URL}/api/student/learning-progress?subjectId=${selectedSubject}`
        : `${API_BASE_URL}/api/student/learning-progress`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProgressRecords(data.data?.progressRecords || data.progressRecords || []);
        
        // Calculate stats
        const overallProgress = data.data?.overallProgress || data.overallProgress || 0;
        const completedContent = data.data?.completedContent || data.completedContent || 0;
        const totalContent = data.data?.totalContent || data.totalContent || 0;
        
        // Calculate total time spent
        const totalTimeSpent = progressRecords.reduce((sum, record) => sum + (record.timeSpent || 0), 0);
        
        // Calculate average score
        const scores = progressRecords.filter(r => r.score !== undefined).map(r => r.score!);
        const averageScore = scores.length > 0
          ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
          : 0;

        // Group by subject
        const subjectMap = new Map<string, { completed: number; total: number }>();
        progressRecords.forEach(record => {
          const subjectId = getSubjectId(record);
          const subjectName = getSubjectName(record);
          if (subjectId && subjectName) {
            if (!subjectMap.has(subjectId)) {
              subjectMap.set(subjectId, { completed: 0, total: 0 });
            }
            const subjectData = subjectMap.get(subjectId)!;
            subjectData.total++;
            if (record.completed) {
              subjectData.completed++;
            }
          }
        });

        const subjectProgress = Array.from(subjectMap.entries()).map(([subjectId, data]) => {
          const subject = subjects.find(s => (s._id || s.id) === subjectId);
          return {
            subjectId,
            subjectName: subject?.name || 'Unknown',
            progress: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
            completed: data.completed,
            total: data.total
          };
        });

        setStats({
          overallProgress,
          completedContent,
          totalContent,
          totalTimeSpent,
          averageScore,
          subjectProgress
        });
      }
    } catch (error) {
      console.error('Failed to fetch progress:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getSubjectId = (record: ProgressRecord): string | null => {
    if (record.contentId) {
      const subject = record.contentId.subject;
      return typeof subject === 'object' ? subject?._id : subject || null;
    }
    if (record.videoId) {
      const subject = record.videoId.subject;
      return typeof subject === 'object' ? subject?._id : subject || null;
    }
    if (record.assessmentId) {
      const subject = record.assessmentId.subject;
      return typeof subject === 'object' ? subject?._id : subject || null;
    }
    return null;
  };

  const getSubjectName = (record: ProgressRecord): string | null => {
    if (record.contentId) {
      const subject = record.contentId.subject;
      return typeof subject === 'object' ? subject?.name : subject || null;
    }
    if (record.videoId) {
      const subject = record.videoId.subject;
      return typeof subject === 'object' ? subject?.name : subject || null;
    }
    if (record.assessmentId) {
      const subject = record.assessmentId.subject;
      return typeof subject === 'object' ? subject?.name : subject || null;
    }
    return null;
  };

  const getItemTitle = (record: ProgressRecord): string => {
    if (record.contentId) return record.contentId.title;
    if (record.videoId) return record.videoId.title;
    if (record.assessmentId) return record.assessmentId.title;
    return 'Unknown';
  };

  const getItemType = (record: ProgressRecord): string => {
    if (record.contentId) return record.contentId.type || 'Content';
    if (record.videoId) return 'Video';
    if (record.assessmentId) return 'Assessment';
    return 'Unknown';
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading Progress...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Stats Overview */}
      {stats && (
        <View style={styles.statsContainer}>
          <LinearGradient
            colors={['#3b82f6', '#2563eb']}
            style={styles.overallProgressCard}
          >
            <Text style={styles.overallProgressLabel}>Overall Progress</Text>
            <Text style={styles.overallProgressValue}>{stats.overallProgress}%</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${stats.overallProgress}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {stats.completedContent} Of {stats.totalContent} Items Completed
            </Text>
          </LinearGradient>

          <View style={styles.statsGrid}>
            {/* Inner views carry the centring GlassPanel's wrapper would swallow. */}
            <GlassPanel style={styles.statCard} radius={12} tone="light">
              <View style={styles.statCardInner}>
                <Ionicons name="time" size={24} color="#3b82f6" />
                <Text style={styles.statValue}>{formatTime(stats.totalTimeSpent)}</Text>
                <Text style={styles.statLabel}>Time Spent</Text>
              </View>
            </GlassPanel>
            <GlassPanel style={styles.statCard} radius={12} tone="light">
              <View style={styles.statCardInner}>
                <Ionicons name="trophy" size={24} color="#10b981" />
                <Text style={styles.statValue}>{stats.averageScore}%</Text>
                <Text style={styles.statLabel}>Avg Score</Text>
              </View>
            </GlassPanel>
            <GlassPanel style={styles.statCard} radius={12} tone="light">
              <View style={styles.statCardInner}>
                <Ionicons name="checkmark-circle" size={24} color="#f59e0b" />
                <Text style={styles.statValue}>{stats.completedContent}</Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>
            </GlassPanel>
          </View>
        </View>
      )}

      {/* Subject Filter */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.filterChip, selectedSubject === 'all' && styles.filterChipActive]}
            onPress={() => setSelectedSubject('all')}
          >
            <Text style={[styles.filterChipText, selectedSubject === 'all' && styles.filterChipTextActive]}>
              All Subjects
            </Text>
          </TouchableOpacity>
          {subjects.map(subject => (
            <TouchableOpacity
              key={subject._id || subject.id}
              style={[styles.filterChip, selectedSubject === (subject._id || subject.id) && styles.filterChipActive]}
              onPress={() => setSelectedSubject(subject._id || subject.id)}
            >
              <Text style={[styles.filterChipText, selectedSubject === (subject._id || subject.id) && styles.filterChipTextActive]}>
                {subject.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Subject Progress */}
      {stats && stats.subjectProgress.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subject-Wise Progress</Text>
          {stats.subjectProgress.map((subject) => (
            <GlassPanel key={subject.subjectId} style={styles.subjectCard} radius={12}>
              <View style={styles.subjectHeader}>
                <Text style={styles.subjectName}>{subject.subjectName}</Text>
                <Text style={styles.subjectProgress}>{subject.progress}%</Text>
              </View>
              <View style={styles.subjectProgressBar}>
                <View style={[styles.subjectProgressFill, { width: `${subject.progress}%` }]} />
              </View>
              <Text style={styles.subjectStats}>
                {subject.completed} Of {subject.total} Completed
              </Text>
            </GlassPanel>
          ))}
        </View>
      )}

      {/* Progress Records */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {progressRecords.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#5B6779" />
            <Text style={styles.emptyText}>No Progress Records Yet</Text>
            <Text style={styles.emptySubtext}>Start Learning To See Your Progress Here</Text>
          </View>
        ) : (
          progressRecords.map((record) => (
            <GlassPanel key={record._id} style={styles.recordCard} radius={12}>
              <View style={styles.recordHeader}>
                <View style={styles.recordIcon}>
                  <Ionicons
                    name={getItemType(record) === 'Video' ? 'videocam' : 'document-text'}
                    size={20}
                    color="#3b82f6"
                  />
                </View>
                <View style={styles.recordInfo}>
                  <Text style={styles.recordTitle}>{getItemTitle(record)}</Text>
                  <Text style={styles.recordType}>{getItemType(record)}</Text>
                </View>
                {record.completed && (
                  <View style={styles.completedBadge}>
                    <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                  </View>
                )}
              </View>
              <View style={styles.recordProgress}>
                <View style={styles.recordProgressBar}>
                  <View style={[styles.recordProgressFill, { width: `${record.progress}%` }]} />
                </View>
                <Text style={styles.recordProgressText}>{record.progress}%</Text>
              </View>
              <View style={styles.recordMeta}>
                {record.timeSpent > 0 && (
                  <View style={styles.metaItem}>
                    <Ionicons name="time" size={14} color="#6b7280" />
                    <Text style={styles.metaText}>{formatTime(record.timeSpent)}</Text>
                  </View>
                )}
                {record.score !== undefined && (
                  <View style={styles.metaItem}>
                    <Ionicons name="star" size={14} color="#f59e0b" />
                    <Text style={styles.metaText}>{record.score}%</Text>
                  </View>
                )}
                <Text style={styles.metaText}>
                  {new Date(record.lastAccessed).toLocaleDateString()}
                </Text>
              </View>
            </GlassPanel>
          ))
        )}
      </View>
    </View>
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
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  statsContainer: {
    padding: 16,
    // Page band, not a card — let the app background artwork show through.
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  overallProgressCard: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
  },
  overallProgressLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8,
  },
  overallProgressValue: {
    fontSize: 48,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  // Box props only — `statCard` is passed to GlassPanel, so the centring that
  // used to live here now sits on `statCardInner`.
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
  },
  statCardInner: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  filtersContainer: {
    // Page band, not a card — let the app background artwork show through.
    backgroundColor: 'transparent',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#3b82f6',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 16,
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
  subjectProgressBar: {
    height: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  subjectProgressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 4,
  },
  subjectStats: {
    fontSize: 12,
    color: '#6b7280',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
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
  recordCard: {
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
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  recordIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  recordInfo: {
    flex: 1,
  },
  recordTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  recordType: {
    fontSize: 12,
    color: '#6b7280',
  },
  completedBadge: {
    marginLeft: 8,
  },
  recordProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  recordProgressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 3,
    overflow: 'hidden',
    marginRight: 12,
  },
  recordProgressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 3,
  },
  recordProgressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
  },
  recordMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#6b7280',
  },
});


