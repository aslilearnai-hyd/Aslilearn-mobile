import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import studentService from '../src/services/api/studentService';
import { GlassPanel } from '../src/components/ui';
import { setStudentDashboardTabIntent } from '../src/lib/dashboard-tab-intent';
import { useSchoolOnlyGuard } from '../src/components/b2c/SchoolOnlyGuard';

type AssignmentItem = {
  _id?: string;
  homeworkId?: string;
  subject?: string;
  submissionLink?: string;
  status?: string;
  createdAt?: string;
  gradedAt?: string;
  score?: number;
  feedback?: string;
};

export default function AssignmentsScreen() {
  const blocked = useSchoolOnlyGuard();
  const router = useRouter();
  const handlingBack = useRef(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState<AssignmentItem[]>([]);

  const goBack = useCallback(() => {
    if (handlingBack.current) return;
    handlingBack.current = true;
    setStudentDashboardTabIntent('home');
    router.replace('/dashboard');
    setTimeout(() => {
      handlingBack.current = false;
    }, 350);
  }, [router]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      goBack();
      return true;
    });
    return () => sub.remove();
  }, [goBack]);

  const loadAssignments = useCallback(async () => {
    try {
      setError('');
      const data = await studentService.getAssignments();
      const list = Array.isArray(data) ? data : data?.submissions || data?.data || [];
      setItems(Array.isArray(list) ? list : []);
    } catch (err: any) {
      setError(err?.friendlyMessage || 'Failed to load assignments.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAssignments();
    setRefreshing(false);
  };

  if (blocked) return null;

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={goBack}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={20} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Assignments</Text>
          <View style={styles.iconBtn} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading assignments...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={goBack}
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Assignments</Text>
        <TouchableOpacity
          onPress={goBack}
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel="Home"
        >
          <Ionicons name="home-outline" size={20} color="#111827" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {items.length === 0 ? (
          <GlassPanel style={styles.emptyCard} radius={14} tone="medium">
            <Ionicons name="document-text-outline" size={26} color="#5B6779" />
            <Text style={styles.emptyText}>No assignments found.</Text>
          </GlassPanel>
        ) : (
          items.map((item, index) => {
            const status = item.status || (item.gradedAt ? 'graded' : 'submitted');
            const statusColor = status === 'graded' ? '#16a34a' : '#2563eb';
            const createdAt = item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A';
            return (
              <GlassPanel
                key={item._id || item.homeworkId || `${status}-${index}`}
                style={styles.assignmentCard}
                radius={14}
                tone="medium"
              >
                <View style={styles.assignmentTop}>
                  <Text style={styles.assignmentTitle}>{item.subject || 'General Assignment'}</Text>
                  <View style={[styles.statusChip, { backgroundColor: `${statusColor}18` }]}>
                    <Text style={[styles.statusText, { color: statusColor }]}>{status}</Text>
                  </View>
                </View>
                <Text style={styles.assignmentMeta}>Submitted: {createdAt}</Text>
                {typeof item.score === 'number' ? (
                  <Text style={styles.scoreText}>Score: {item.score}</Text>
                ) : null}
                {item.feedback ? <Text style={styles.feedbackText}>Feedback: {item.feedback}</Text> : null}
                <TouchableOpacity style={styles.actionBtn}>
                  <Ionicons name="open-outline" size={16} color="#2563eb" />
                  <Text style={styles.actionBtnText}>View details</Text>
                </TouchableOpacity>
              </GlassPanel>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#6b7280' },
  header: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.55)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  scroll: { flex: 1 },
  content: { padding: 14, paddingBottom: 36 },
  assignmentCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
    padding: 14,
    marginBottom: 10,
  },
  assignmentTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  assignmentTitle: { fontSize: 16, fontWeight: '700', color: '#111827', flex: 1, marginRight: 8 },
  statusChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  assignmentMeta: { marginTop: 8, fontSize: 12, color: '#64748b' },
  scoreText: { marginTop: 6, fontSize: 13, fontWeight: '700', color: '#0f172a' },
  feedbackText: { marginTop: 6, color: '#374151', fontSize: 13 },
  actionBtn: { marginTop: 10, flexDirection: 'row', alignItems: 'center' },
  actionBtnText: { marginLeft: 6, color: '#2563eb', fontWeight: '600' },
  emptyCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
    padding: 16,
    alignItems: 'center',
  },
  emptyText: { marginTop: 8, color: '#6b7280' },
  errorText: { color: '#dc2626', marginBottom: 10 },
});
