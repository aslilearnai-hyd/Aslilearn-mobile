import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Item = { color: string; label: string; value?: string | number };

export default function ChartLegend({ items }: { items: Item[] }) {
  return (
    <View style={styles.wrap}>
      {items.map((item) => (
        <View key={item.label} style={styles.pill}>
          <View style={[styles.dot, { backgroundColor: item.color }]} />
          <Text style={styles.label}>
            {item.label}
            {item.value != null ? (
              <Text style={styles.value}> · {item.value}</Text>
            ) : null}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 10,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '700',
  },
  value: {
    fontWeight: '600',
    color: '#94A3B8',
  },
});
