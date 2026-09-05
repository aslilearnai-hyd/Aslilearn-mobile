import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import studentService from '../src/services/api/studentService';
import { GlassPanel } from '../src/components/ui';

type SessionItem = {
  _id?: string;
  date?: string;
  duration?: number;
  startTime?: string;
  endTime?: string;
};

export default function AttendanceScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [sessions, setSessions] = useState<SessionItem[]>([]);

  const loadAttendance = useCallback(async () => {
    try {
      setError('');
      const data = await studentService.getAttendance();
      const list = Array.isArray(data) ? data : data?.sessions || data?.data || [];
      setSessions(Array.isArray(list) ? list : []);
    } catch (err: any) {
      setError(err?.friendlyMessage || 'Failed to load attendance.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAttendance();
    setRefreshing(false);
  };

  const summary = useMemo(() => {
    // UserSession.duration is already minutes (not seconds).
    const totalMinutes = sessions.reduce((acc, item) => acc + Math.max(0, Math.round(item.duration || 0)), 0);
    const totalHours = (totalMinutes / 60).toFixed(1);
    const activeDays = new Set(
      sessions
        .map((s) => s.date || s.startTime)
        .filter(Boolean)
        .map((d) => new Date(String(d)).toDateString())
    ).size;
    return { totalMinutes, totalHours, activeDays, totalSessions: sessions.length };
  }, [sessions]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading attendance...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Attendance</Text>
        <TouchableOpacity onPress={() => router.push('/dashboard')} style={styles.iconBtn}>
          <Ionicons name="home-outline" size={20} color="#111827" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.summaryRow}>
          <GlassPanel style={styles.summaryCard} radius={14} tone="medium">
            <Text style={styles.summaryValue}>{summary.totalHours}h</Text>
            <Text style={styles.summaryLabel}>Total Study Time</Text>
          </GlassPanel>
          <GlassPanel style={styles.summaryCard} radius={14} tone="medium">
            <Text style={styles.summaryValue}>{summary.activeDays}</Text>
            <Text style={styles.summaryLabel}>Active Days</Text>
          </GlassPanel>
        </View>

        <GlassPanel style={styles.summaryCardSingle} radius={14} tone="medium">
          <Text style={styles.summaryValue}>{summary.totalSessions}</Text>
          <Text style={styles.summaryLabel}>Sessions Logged</Text>
        </GlassPanel>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Text style={styles.sectionTitle}>Recent Sessions</Text>
        {sessions.length === 0 ? (
          <GlassPanel style={styles.emptyCard} radius={14} tone="medium">
            <Ionicons name="calendar-clear-outline" size={24} color="#5B6779" />
            <Text style={styles.emptyText}>No attendance sessions found.</Text>
          </GlassPanel>
        ) : (
          sessions.slice(0, 25).map((item, index) => {
            const dateText = item.date || item.startTime;
            const durationMin = Math.max(0, Math.round(item.duration || 0));
            return (
              <GlassPanel key={item._id || `${dateText}-${index}`} style={styles.sessionCard} radius={12} tone="medium">
                {/* GlassPanel wraps children in its own view, so the row lives one level in */}
                <View style={styles.sessionRow}>
                  <View>
                    <Text style={styles.sessionDate}>
                      {dateText ? new Date(dateText).toLocaleDateString() : 'Unknown date'}
                    </Text>
                    <Text style={styles.sessionTime}>{durationMin} minutes</Text>
                  </View>
                  <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
                </View>
              </GlassPanel>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // transparent so the app-wide pastel artwork shows through the glass surfaces
  container: { flex: 1, backgroundColor: 'transparent' },
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
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  summaryCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
    padding: 14,
  },
  summaryCardSingle: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
    padding: 14,
    marginBottom: 14,
  },
  summaryValue: { fontSize: 26, fontWeight: '800', color: '#2563eb' },
  summaryLabel: { fontSize: 13, color: '#64748b', marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 10 },
  emptyCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
    padding: 16,
    alignItems: 'center',
  },
  emptyText: { marginTop: 8, color: '#6b7280' },
  sessionCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
    padding: 14,
    marginBottom: 8,
  },
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionDate: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  sessionTime: { fontSize: 12, color: '#64748b', marginTop: 3 },
  errorText: { color: '#dc2626', marginBottom: 10 },
});
