import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import adminService from '../../src/services/api/adminService';
import { exportCsvFile } from '../../src/utils/csvExport';
import { useBackNavigation } from '../../src/hooks/useBackNavigation';
import { ErrorState, GlassPanel, LoadingState } from '../../src/components/ui';
import { AdminScalePressable, AdminSectionHeader, useAdminTheme } from './_ui';

const REPORTS = [
  { id: 'attendance', label: 'Attendance Report', icon: 'calendar-outline' as const, desc: 'Daily & monthly attendance summaries' },
  { id: 'performance', label: 'Performance Report', icon: 'trending-up-outline' as const, desc: 'Student scores and class averages' },
  { id: 'exams', label: 'Exam Results', icon: 'document-text-outline' as const, desc: 'Detailed exam outcome reports' },
];

export default function AdminReports() {
  const { colors, spacing, radius } = useAdminTheme();
  const [loadingType, setLoadingType] = useState<string | null>(null);
  const [error, setError] = useState('');

  useBackNavigation('/admin/dashboard', false);

  const download = useCallback(async (type: string, format: 'csv' | 'pdf') => {
    setLoadingType(`${type}-${format}`);
    setError('');
    try {
      const response = await adminService.downloadReport(type, format);
      if (format === 'pdf') {
        const message = response?.data?.message || 'Report generated on server.';
        Alert.alert('Report Ready', message);
      } else if (typeof response?.data === 'string') {
        await exportCsvFile(
          response.data,
          `${type}_report_${new Date().toISOString().slice(0, 10)}.csv`
        );
      } else {
        Alert.alert('Export Failed', 'No CSV data returned from the server.');
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Could not download report');
    } finally {
      setLoadingType(null);
    }
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <GlassPanel style={[styles.header, { borderBottomColor: colors.surfaceBorder }]} radius={0} bordered={false} tone="strong">
        <View style={styles.headerInner}>
          <AdminScalePressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.bgElevated, borderRadius: radius.full }]}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </AdminScalePressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Reports Center</Text>
          <View style={styles.backBtn} />
        </View>
      </GlassPanel>

      {loadingType ? <LoadingState variant="list" style={{ padding: spacing.lg }} /> : null}
      {error ? <ErrorState message={error} onRetry={() => setError('')} style={{ margin: spacing.lg }} /> : null}

      <ScrollView contentContainerStyle={[styles.content, { padding: spacing.lg }]}>
        <AdminSectionHeader
          title="Export Reports"
          subtitle="Download attendance, performance, and exam data"
          icon="download-outline"
        />

        {REPORTS.map((r, idx) => {
            const palette = colors.dashboardStatCards[idx % colors.dashboardStatCards.length];
            return (
            <View key={r.id} style={[styles.reportCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, borderRadius: radius.lg }]}>
              <View
                style={[styles.reportIcon, { borderRadius: radius.md, backgroundColor: palette.iconBg }]}
              >
                <Ionicons name={r.icon} size={22} color={palette.accent} />
              </View>
              <View style={styles.reportInfo}>
                <Text style={[styles.reportTitle, { color: colors.text }]}>{r.label}</Text>
                <Text style={[styles.reportDesc, { color: colors.textMuted }]}>{r.desc}</Text>
              </View>
              <View style={styles.reportActions}>
                <AdminScalePressable
                  onPress={() => download(r.id, 'csv')}
                  style={[styles.exportBtn, { backgroundColor: colors.primaryMuted, borderRadius: radius.sm }]}
                >
                  <Ionicons name="document-outline" size={16} color={colors.primary} />
                  <Text style={[styles.exportText, { color: colors.primary }]}>
                    {loadingType === `${r.id}-csv` ? '...' : 'CSV'}
                  </Text>
                </AdminScalePressable>
                <AdminScalePressable
                  onPress={() => download(r.id, 'pdf')}
                  style={[styles.exportBtn, { backgroundColor: colors.bgElevated, borderRadius: radius.sm }]}
                >
                  <Ionicons name="document-text-outline" size={16} color={colors.textSecondary} />
                  <Text style={[styles.exportText, { color: colors.textSecondary }]}>
                    {loadingType === `${r.id}-pdf` ? '...' : 'PDF'}
                  </Text>
                </AdminScalePressable>
              </View>
            </View>
            );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Transparent so the shared app background artwork shows through.
  container: { flex: 1, backgroundColor: 'transparent' },
  header: {
    borderBottomWidth: 1,
  },
  // Row layout and padding move inside the frosted panel.
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  content: { gap: 16, paddingBottom: 40 },
  reportCard: {
    padding: 16,
    borderWidth: 1,
    gap: 14,
  },
  reportIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  reportInfo: { gap: 4 },
  reportTitle: { fontSize: 17, fontWeight: '800' },
  reportDesc: { fontSize: 13, lineHeight: 18 },
  reportActions: { flexDirection: 'row', gap: 8 },
  exportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  exportText: { fontSize: 14, fontWeight: '700' },
});
