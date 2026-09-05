import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassPanel } from '../../../src/components/ui';

const { width } = Dimensions.get('window');

interface ProgressChartProps {
  title: string;
  data: { label: string; value: number; color: string }[];
  maxValue?: number;
}

export default function ProgressChart({ title, data, maxValue }: ProgressChartProps) {
  const max = maxValue || Math.max(...data.map(d => d.value), 100);

  return (
    <GlassPanel style={styles.container} radius={12}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.chartContainer}>
        {data.map((item, index) => {
          const percentage = max > 0 ? (item.value / max) * 100 : 0;
          return (
            <View key={index} style={styles.barContainer}>
              <View style={styles.barLabelRow}>
                <Text style={styles.barLabel}>{item.label}</Text>
                <Text style={styles.barValue}>{item.value}%</Text>
              </View>
              <View style={styles.barBackground}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${Math.min(percentage, 100)}%`,
                      backgroundColor: item.color
                    }
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>
    </GlassPanel>
  );
}

const styles = StyleSheet.create({
  container: {
    // Fill comes from GlassPanel's blur + tint, not a solid colour.
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  chartContainer: {
    gap: 16,
  },
  barContainer: {
    gap: 8,
  },
  barLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  barLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  barValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  barBackground: {
    height: 12,
    backgroundColor: '#e5e7eb',
    borderRadius: 6,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 6,
  },
});


