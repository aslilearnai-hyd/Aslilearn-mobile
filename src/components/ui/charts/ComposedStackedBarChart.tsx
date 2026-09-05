import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { formatSeconds } from '../../../lib/advanced-analytics';
import StackedBarChart from './StackedBarChart';
import type { StackedBarDatum, StackedBarSeries } from './StackedBarChart';

type Props = {
  data: StackedBarDatum[];
  series: StackedBarSeries[];
  height?: number;
  idealTimeKey?: string;
};

export default function ComposedStackedBarChart({
  data,
  series,
  height = 240,
  idealTimeKey = 'idealTime',
}: Props) {
  const idealMax = Math.max(...data.map((r) => Number(r[idealTimeKey]) || 0), 120);

  return (
    <View style={styles.wrap}>
      <StackedBarChart
        data={data}
        series={series}
        height={height}
        idealTimeKey={idealTimeKey}
        idealTimeMax={idealMax}
      />
      {idealTimeKey ? (
        <View style={styles.metaGrid}>
          {data.map((row, index) => {
            const ideal = Number(row[idealTimeKey]) || 0;
            const avg = Number(row.avgTime) || 0;
            const count = Number(row.count) || 0;
            if (count <= 0 && ideal <= 0) return null;
            return (
              <View key={`${row.label}-${index}`} style={styles.metaChip}>
                <Text style={styles.metaTitle}>{row.label}</Text>
                <Text style={styles.metaText}>
                  {count > 0 ? `${count} Q · ` : ''}
                  ideal {formatSeconds(ideal)}
                  {avg > 0 ? ` · avg ${formatSeconds(avg)}` : ''}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', gap: 10 },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metaChip: {
    flexGrow: 1,
    minWidth: '46%',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  metaTitle: { fontSize: 11, fontWeight: '800', color: '#334155' },
  metaText: { fontSize: 10, color: '#64748b', lineHeight: 15, marginTop: 2 },
});
