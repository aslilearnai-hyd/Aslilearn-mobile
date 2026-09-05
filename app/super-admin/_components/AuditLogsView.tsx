import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { apiFetch } from '../../../src/lib/api-config';
import { EmptyState, ErrorState, GlassPanel, LoadingState } from '../../../src/components/ui';
import { useSuperAdminTheme } from '../_ui/useSuperAdminTheme';

type AuditRow = {
  _id?: string;
  at?: string;
  action?: string;
  summary?: string;
  actor?: { email?: string; role?: string; name?: string };
};

export default function AuditLogsView() {
  const t = useSuperAdminTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [rows, setRows] = useState<AuditRow[]>([]);

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError('');
      const res = await apiFetch('/api/super-admin/audit-logs?page=1&limit=50');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Failed to Load Audit Logs');
      const list = json?.data?.items || json?.data?.logs || json?.logs || json?.data || [];
      setRows(Array.isArray(list) ? list : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to Load Audit Logs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingState variant="list" />;
  if (error && rows.length === 0) return <ErrorState message={error} onRetry={() => load()} />;

  return (
    <FlatList
      data={rows}
      keyExtractor={(item, i) => String(item._id || i)}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
      contentContainerStyle={styles.list}
      ListEmptyComponent={<EmptyState icon="shield-checkmark-outline" title="No Audit Events" subtitle="Security and admin actions will appear here." />}
      renderItem={({ item }) => (
        <GlassPanel style={[styles.card, { borderColor: t.border }]}>
          <Text style={[styles.action, { color: t.text }]}>{item.action || 'Event'}</Text>
          <Text style={[styles.summary, { color: t.textMuted }]} numberOfLines={3}>
            {item.summary || '—'}
          </Text>
          <Text style={[styles.meta, { color: t.textMuted }]}>
            {(item.actor?.name || item.actor?.email || 'System') +
              (item.actor?.role ? ` · ${item.actor.role}` : '') +
              (item.at ? ` · ${new Date(item.at).toLocaleString()}` : '')}
          </Text>
        </GlassPanel>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 120, gap: 10 },
  card: { padding: 14, marginBottom: 10, borderRadius: 14, borderWidth: 1 },
  action: { fontWeight: '700', fontSize: 14, marginBottom: 4 },
  summary: { fontSize: 13, lineHeight: 18 },
  meta: { fontSize: 11, marginTop: 8 },
});
