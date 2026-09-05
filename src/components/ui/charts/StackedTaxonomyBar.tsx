import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { MistakeTaxonomy } from '../../../lib/exam-analysis-helpers';

type Props = {
  taxonomy: MistakeTaxonomy;
};

const SEGMENTS = [
  { key: 'careless' as const, color: '#ef4444', label: 'Careless' },
  { key: 'conceptual' as const, color: '#f97316', label: 'Conceptual' },
  { key: 'procedural' as const, color: '#eab308', label: 'Procedural' },
  { key: 'time' as const, color: '#a855f7', label: 'Time' },
  { key: 'reading' as const, color: '#3b82f6', label: 'Reading' },
];

export default function StackedTaxonomyBar({ taxonomy }: Props) {
  const total =
    taxonomy.careless +
    taxonomy.conceptual +
    taxonomy.procedural +
    taxonomy.time +
    taxonomy.reading;

  return (
    <View style={styles.wrap}>
      <View style={styles.bar}>
        {SEGMENTS.map((seg) => {
          const count = taxonomy[seg.key];
          if (count <= 0) return null;
          return (
            <View
              key={seg.key}
              style={[styles.segment, { flex: count, backgroundColor: seg.color }]}
            />
          );
        })}
      </View>
      <View style={styles.legend}>
        {SEGMENTS.map((seg) => (
          <View key={seg.key} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: seg.color }]} />
            <Text style={styles.legendText}>
              {seg.label} ({taxonomy[seg.key]})
            </Text>
          </View>
        ))}
      </View>
      {total <= 0 ? (
        <Text style={styles.hint}>No wrong answers to classify.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  bar: {
    flexDirection: 'row',
    height: 16,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
  },
  segment: { minWidth: 4 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: '#6b7280', fontWeight: '600' },
  hint: { fontSize: 12, color: '#9ca3af' },
});
