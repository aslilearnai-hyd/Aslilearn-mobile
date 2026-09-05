import { storageGetItem } from '../src/lib/safe-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { fetchStudentNotifications } from '../src/lib/student-notifications';
import { useBackNavigation } from '../src/hooks/useBackNavigation';
import { Badge, EmptyState, ErrorState, GlassPanel, LoadingState, SectionHeader } from '../src/components/ui';
import { COLORS, FONT, RADIUS, SHADOW, SPACING } from '../src/theme';

type NotificationItem = {
  _id?: string;
  id?: string;
  title?: string;
  message?: string;
  body?: string;
  type?: string;
  createdAt?: string;
  read?: boolean;
};

function groupLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return 'Earlier';
}

const typeColor: Record<string, string> = {
  assignment: COLORS.warning,
  exam: COLORS.danger,
  system: COLORS.info,
  ai: COLORS.secondary,
};

export default function NotificationsScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState<NotificationItem[]>([]);

  useBackNavigation('/dashboard', false);

  const load = useCallback(async () => {
    try {
      setError('');
      const token = await storageGetItem('authToken');
      if (!token) throw new Error('Not authenticated');
      const list = await fetchStudentNotifications(token);
      setItems(list);
    } catch (e: any) {
      setError(e?.message || 'Could not load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const grouped = useMemo(() => {
    const map = new Map<string, NotificationItem[]>();
    items.forEach((n) => {
      const key = groupLabel(n.createdAt || new Date().toISOString());
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(n);
    });
    return Array.from(map.entries());
  }, [items]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <LoadingState variant="list" style={{ padding: SPACING.lg }} />
      ) : error ? (
        <ErrorState message={error} onRetry={load} style={{ margin: SPACING.lg }} />
      ) : items.length === 0 ? (
        <EmptyState icon="notifications-outline" title="No notifications" subtitle="You're all caught up!" />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {grouped.map(([label, group]) => (
            <View key={label}>
              <SectionHeader title={label} />
              {group.map((n) => (
                <GlassPanel key={n._id || n.id || n.title} style={styles.card} radius={RADIUS.lg} tone="strong">
                  <View style={styles.cardTop}>
                    <Text style={styles.cardTitle}>{n.title || 'Notification'}</Text>
                    <Badge label={n.type || 'system'} color={typeColor[n.type || 'system'] || COLORS.info} size="sm" />
                  </View>
                  <Text style={styles.cardBody}>{n.message || n.body || ''}</Text>
                </GlassPanel>
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // transparent so the app-wide pastel artwork shows through the glass surfaces
  container: { flex: 1, backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.55)',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FONT.xl, fontWeight: FONT.bold, color: COLORS.text },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxxl },
  card: {
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
    ...SHADOW.sm,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  cardTitle: { fontSize: FONT.md, fontWeight: FONT.semibold, color: COLORS.text, flex: 1, marginRight: SPACING.sm },
  cardBody: { fontSize: FONT.base, color: COLORS.textSecondary, lineHeight: 20 },
});
