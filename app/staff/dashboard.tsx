import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import staffService from '../../src/services/api/staffService';
import adminService from '../../src/services/api/adminService';
import { useAuth } from '../../src/context/AuthContext';
import { GlassPanel } from '../../src/components/ui';

export default function StaffDashboardScreen() {
  const { role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    try {
      setError('');
      if (role === 'admin') {
        const [dashboardStats, teachers] = await Promise.all([
          adminService.getDashboardStats(),
          adminService.getTeachers(),
        ]);
        setStats(dashboardStats);
        const list = Array.isArray(teachers) ? teachers : teachers?.teachers || teachers?.data || [];
        setStudents(Array.isArray(list) ? list : []);
      } else {
        const [dashboard, performance] = await Promise.all([
          staffService.getDashboard(),
          staffService.getStudentsPerformance(),
        ]);
        setStats(dashboard);
        const list = Array.isArray(performance) ? performance : performance?.students || performance?.data || [];
        setStudents(Array.isArray(list) ? list : []);
      }
    } catch (err: any) {
      setError(err?.friendlyMessage || 'Unable to load staff dashboard.');
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const cards = useMemo(
    () => [
      { label: 'Role', value: role || 'staff', icon: 'person-outline' as const },
      { label: 'Total Users', value: String(stats?.totalStudents || stats?.totalUsers || students.length || 0), icon: 'people-outline' as const },
      { label: 'Classes', value: String(stats?.totalClasses || stats?.classesCount || 0), icon: 'school-outline' as const },
      { label: 'Videos', value: String(stats?.totalVideos || 0), icon: 'videocam-outline' as const },
    ],
    [role, stats, students.length]
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading Staff Dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <GlassPanel style={styles.header} radius={0} bordered={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={20} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Staff Dashboard</Text>
          <TouchableOpacity onPress={() => router.push('/profile')} style={styles.iconBtn}>
            <Ionicons name="person-outline" size={20} color="#111827" />
          </TouchableOpacity>
        </View>
      </GlassPanel>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.cardsGrid}>
          {cards.map((card) => (
            <GlassPanel key={card.label} style={styles.metricCard} radius={12}>
              <Ionicons name={card.icon} size={18} color="#2563eb" />
              <Text style={styles.metricValue}>{card.value}</Text>
              <Text style={styles.metricLabel}>{card.label}</Text>
            </GlassPanel>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{role === 'admin' ? 'Teachers' : 'Students Performance'}</Text>
        </View>
        {(students || []).slice(0, 20).map((item, idx) => (
          <GlassPanel key={item?._id || item?.id || idx} style={styles.listCard} radius={12} tone="strong">
            <Text style={styles.listTitle}>{item?.fullName || item?.name || item?.email || 'User'}</Text>
            <Text style={styles.listSubtitle}>{item?.email || item?.subject || 'No Additional Details'}</Text>
          </GlassPanel>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Transparent so the app background artwork shows through.
  container: { flex: 1, backgroundColor: 'transparent' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#6b7280' },
  header: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  // Row layout lives on an inner view because GlassPanel wraps its children.
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  scroll: { flex: 1 },
  content: { padding: 14, paddingBottom: 36 },
  cardsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 14 },
  metricCard: {
    width: '48.5%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
    marginBottom: 10,
  },
  metricValue: { fontSize: 24, fontWeight: '800', color: '#0f172a', marginTop: 6 },
  metricLabel: { marginTop: 4, color: '#64748b', fontSize: 12 },
  sectionHeader: { marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  listCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
    marginBottom: 8,
  },
  listTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  listSubtitle: { marginTop: 4, color: '#64748b', fontSize: 12 },
  errorText: { color: '#dc2626', marginBottom: 10 },
});
