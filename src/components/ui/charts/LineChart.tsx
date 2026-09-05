import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { COLORS, FONT, SPACING } from '../../../theme';

type Props = {
  data: number[];
  labels?: string[];
  color?: string;
  height?: number;
  width?: number;
};

export default function LineChart({
  data,
  labels = [],
  color = COLORS.primary,
  height = 120,
  width = 280,
}: Props) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const padding = 12;
  const chartW = width - padding * 2;
  const chartH = height - padding * 2;

  const points = data
    .map((v, i) => {
      const x = padding + (i / Math.max(data.length - 1, 1)) * chartW;
      const y = padding + chartH - ((v - min) / range) * chartH;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <View>
      <Svg width={width} height={height}>
        <Polyline points={points} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" />
        {data.map((v, i) => {
          const x = padding + (i / Math.max(data.length - 1, 1)) * chartW;
          const y = padding + chartH - ((v - min) / range) * chartH;
          return <Circle key={i} cx={x} cy={y} r={4} fill={color} />;
        })}
      </Svg>
      {labels.length > 0 ? (
        <View style={[styles.labels, { width }]}>
          {labels.map((l) => (
            <Text key={l} style={styles.label}>
              {l}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.sm,
    marginTop: SPACING.xs,
  },
  label: {
    fontSize: FONT.xs,
    color: COLORS.textMuted,
  },
});
