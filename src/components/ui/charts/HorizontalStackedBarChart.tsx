import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ChartLegend from './ChartLegend';
import { CHART_THEME } from './chart-theme';

export type HStackSeries = { key: string; color: string; label: string };
export type HStackDatum = { label: string; sublabel?: string; [key: string]: string | number | undefined };

type Props = {
  data: HStackDatum[];
  series: HStackSeries[];
};

export default function HorizontalStackedBarChart({ data, series }: Props) {
  return (
    <View style={styles.shell}>
      {data.map((row, index) => {
        const total = series.reduce((sum, s) => sum + (Number(row[s.key]) || 0), 0);
        const accuracy = typeof row.accuracy === 'number' ? row.accuracy : 0;
        return (
          <View key={`${row.label}-${row.sublabel || ''}-${index}`} style={styles.row}>
            <View style={styles.labelCol}>
              <Text style={styles.label} numberOfLines={1}>
                {row.label}
              </Text>
              {row.sublabel ? (
                <Text style={styles.sublabel} numberOfLines={1}>
                  {row.sublabel}
                </Text>
              ) : null}
            </View>
            <View style={styles.barTrack}>
              {total <= 0 ? (
                <View style={styles.emptyTrack} />
              ) : (
                series.map((s, si) => {
                  const value = Number(row[s.key]) || 0;
                  if (value <= 0) return null;
                  const isLast = series.slice(si + 1).every((n) => (Number(row[n.key]) || 0) <= 0);
                  return (
                    <View
                      key={s.key}
                      style={[
                        styles.segment,
                        {
                          flex: value,
                          backgroundColor: s.color,
                          borderTopRightRadius: isLast ? 8 : 0,
                          borderBottomRightRadius: isLast ? 8 : 0,
                        },
                      ]}
                    />
                  );
                })
              )}
            </View>
            <View style={styles.metricCol}>
              <Text style={styles.total}>
                {accuracy > 0 ? `${total} · ${Math.round(accuracy)}%` : total}
              </Text>
            </View>
          </View>
        );
      })}
      <ChartLegend items={series.map((s) => ({ color: s.color, label: s.label }))} />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    gap: 12,
    width: '100%',
    backgroundColor: CHART_THEME.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CHART_THEME.surfaceBorder,
    padding: 12,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  labelCol: { width: 84 },
  label: { fontSize: 12, fontWeight: '800', color: '#1e293b' },
  sublabel: { fontSize: 10, color: '#94a3b8', marginTop: 1 },
  barTrack: {
    flex: 1,
    flexDirection: 'row',
    height: 18,
    borderRadius: 9,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTrack: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  segment: { minWidth: 4 },
  metricCol: { width: 52, alignItems: 'flex-end' },
  total: { fontSize: 10, fontWeight: '800', color: '#334155', textAlign: 'right' },
});
