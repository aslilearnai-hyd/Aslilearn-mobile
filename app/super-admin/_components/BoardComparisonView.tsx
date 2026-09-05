import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  type BoardAnalytics,
  buildComparisonCsv,
  fetchBoardComparison,
  fetchBoardExportData,
} from '../../../src/lib/board-comparison';
import { exportCsvFile } from '../../../src/utils/csvExport';
import { SUPER_ADMIN_FLOATING_TAB_BAR_PAD } from '../../../src/lib/responsive-layout';

type ChartKey = keyof Pick<
  BoardAnalytics,
  'students' | 'averageScore' | 'totalAttempts' | 'participationRate'
>;

const CHART_CONFIG: Array<{ title: string; key: ChartKey; color: string; max?: number }> = [
  { title: 'Number Of Students', key: 'students', color: '#3b82f6' },
  { title: 'Average Score (%)', key: 'averageScore', color: '#10b981', max: 100 },
  { title: 'Total Exam Attempts', key: 'totalAttempts', color: '#8b5cf6' },
  { title: 'Participation Rate (%)', key: 'participationRate', color: '#f97316', max: 100 },
];

const BORDER_COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f97316', '#ef4444', '#06b6d4'];

function BarChartCard({
  title,
  dataKey,
  color,
  maxValue,
  analytics,
  exporting,
  onExport,
}: {
  title: string;
  dataKey: ChartKey;
  color: string;
  maxValue?: number;
  analytics: BoardAnalytics[];
  exporting: boolean;
  onExport: () => void;
}) {
  const max =
    maxValue ||
    Math.max(
      ...analytics.map((a) => {
        const value = a[dataKey];
        return typeof value === 'string' ? parseFloat(value) : Number(value);
      }),
      1
    );

  return (
    <View style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <View style={styles.chartTitleRow}>
          <Ionicons name="bar-chart" size={20} color="#6b7280" />
          <Text style={styles.chartTitle}>{title}</Text>
        </View>
        <TouchableOpacity style={styles.exportButton} onPress={onExport} disabled={exporting}>
          <Ionicons name="download-outline" size={16} color="#6b7280" />
          <Text style={styles.exportButtonText}>{exporting ? 'Exporting...' : 'Export'}</Text>
        </TouchableOpacity>
      </View>
      {analytics.map((item, idx) => {
        const value = item[dataKey];
        const numericValue = typeof value === 'string' ? parseFloat(value) : Number(value);
        const percentage = max > 0 ? (numericValue / max) * 100 : 0;
        return (
          <View key={idx} style={styles.chartRow}>
            <View style={styles.chartRowHeader}>
              <Text style={styles.chartRowLabel}>{item.board}</Text>
              <Text style={styles.chartRowValue}>
                {typeof value === 'string' ? value : value.toLocaleString()}
                {dataKey === 'averageScore' || dataKey === 'participationRate' ? '%' : ''}
              </Text>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${Math.min(percentage, 100)}%`, backgroundColor: color }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

export default function BoardComparisonView() {
  const [analytics, setAnalytics] = useState<BoardAnalytics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exportingKey, setExportingKey] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setIsLoading(true);
    try {
      setError('');
      const rows = await fetchBoardComparison();
      setAnalytics(rows);
    } catch (err: any) {
      setError(err?.friendlyMessage || err?.message || 'Failed to load board analytics.');
      setAnalytics([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const exportChart = async (title: string, dataKey: ChartKey) => {
    setExportingKey(dataKey);
    try {
      let dataType = 'attempts';
      if (dataKey === 'students') dataType = 'students';
      else if (dataKey === 'totalAttempts') dataType = 'attempts';
      else if (dataKey === 'averageScore') dataType = 'scores';
      else if (dataKey === 'participationRate') dataType = 'participation';

      const remote = await fetchBoardExportData(dataType);
      const csv =
        remote.length > 0
          ? [
              Object.keys(remote[0]).map((h) => `"${h}"`).join(','),
              ...remote.map((row) =>
                Object.values(row)
                  .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
                  .join(',')
              ),
            ].join('\n')
          : buildComparisonCsv(title, analytics, dataKey);

      await exportCsvFile(csv, `${title.replace(/\s+/g, '_')}.csv`);
    } finally {
      setExportingKey(null);
    }
  };

  if (isLoading && analytics.length === 0) {
    return (
      <ScrollView style={styles.content}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f97316" />
          <Text style={styles.loadingText}>Loading Board Analytics...</Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.content}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Board Performance Comparison</Text>
        <Text style={styles.headerSubtitle}>Compare Performance Across Curriculum Boards</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={() => load(true)}>
          <Ionicons name="refresh" size={18} color="#374151" />
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {analytics.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="bar-chart" size={64} color="#5B6779" />
          <Text style={styles.emptyTitle}>No Board Data Available</Text>
          <Text style={styles.emptyText}>There is no data to display for board comparison.</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={() => load(true)}>
            <Ionicons name="refresh" size={18} color="#374151" />
            <Text style={styles.refreshButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.summaryGrid}>
            {analytics.map((item, idx) => (
              <View
                key={item.board}
                style={[styles.summaryCard, { borderLeftColor: BORDER_COLORS[idx % BORDER_COLORS.length] }]}
              >
                <Text style={styles.summaryBoard}>{item.board}</Text>
                <Text style={styles.summaryStudents}>{item.students}</Text>
                <Text style={styles.summaryStudentsLabel}>Students</Text>
                <View style={styles.summaryMeta}>
                  <Text style={styles.summaryMetaText}>
                    Avg Score: <Text style={styles.summaryMetaBold}>{item.averageScore}%</Text>
                  </Text>
                  <Text style={styles.summaryMetaText}>
                    Participation: <Text style={styles.summaryMetaBold}>{item.participationRate}%</Text>
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {CHART_CONFIG.map((chart) => (
            <BarChartCard
              key={chart.key}
              title={chart.title}
              dataKey={chart.key}
              color={chart.color}
              maxValue={chart.max}
              analytics={analytics}
              exporting={exportingKey === chart.key}
              onExport={() => exportChart(chart.title, chart.key)}
            />
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1 },
  scrollContent: { paddingBottom: SUPER_ADMIN_FLOATING_TAB_BAR_PAD + 48, flexGrow: 1 },
  loadingContainer: { alignItems: 'center', padding: 40 },
  loadingText: { marginTop: 16, color: '#6b7280', fontSize: 14 },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: '#6b7280', marginBottom: 12 },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#FFFFFF',
  },
  refreshButtonText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  errorText: { color: '#dc2626', paddingHorizontal: 16, marginBottom: 8, fontSize: 13 },
  emptyBox: { alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginTop: 8, marginBottom: 16 },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  summaryBoard: { fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 4 },
  summaryStudents: { fontSize: 24, fontWeight: '800', color: '#111827' },
  summaryStudentsLabel: { fontSize: 11, color: '#5B6779' },
  summaryMeta: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6', gap: 4 },
  summaryMetaText: { fontSize: 11, color: '#6b7280' },
  summaryMetaBold: { fontWeight: '700', color: '#111827' },
  chartCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  chartTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  chartTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  exportButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  exportButtonText: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
  chartRow: { marginBottom: 14 },
  chartRowHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  chartRowLabel: { fontSize: 13, fontWeight: '600', color: '#374151', flex: 1 },
  chartRowValue: { fontSize: 13, fontWeight: '700', color: '#111827' },
  barTrack: { height: 10, backgroundColor: '#e5e7eb', borderRadius: 5, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 5 },
});
