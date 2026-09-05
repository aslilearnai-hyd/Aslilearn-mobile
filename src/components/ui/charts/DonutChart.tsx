import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import { describeArc } from './chart-math';
import { COLORS, FONT } from '../../../theme';

type Segment = {
  value: number;
  color: string;
  label?: string;
};

type Props = {
  segments: Segment[];
  size?: number;
  centerLabel?: string;
};

export default function DonutChart({ segments, size = 120, centerLabel }: Props) {
  const strokeWidth = 14;
  const cx = size / 2;
  const cy = size / 2;
  const radius = (size - strokeWidth) / 2;
  const total = segments.reduce((sum, seg) => sum + seg.value, 0) || 1;

  let cursor = 0;
  const arcs = segments.map((seg, index) => {
    const sweep = (seg.value / total) * 360;
    const start = cursor;
    const end = cursor + sweep;
    cursor = end;
    if (seg.value <= 0 || sweep <= 0) return null;
    return (
      <Path
        key={`${seg.label || 'seg'}-${index}`}
        d={describeArc(cx, cy, radius, start, end)}
        stroke={seg.color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="butt"
      />
    );
  });

  return (
    <View style={styles.wrap}>
      <Svg width={size} height={size}>
        <G>
          <Path
            d={describeArc(cx, cy, radius, 0, 359.99)}
            stroke="#cbd5e1"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {arcs}
        </G>
      </Svg>
      {centerLabel ? (
        <View style={[styles.center, { width: size, height: size }]}>
          <Text style={styles.centerText}>{centerLabel}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: {
    fontSize: FONT.lg,
    fontWeight: FONT.bold,
    color: COLORS.text,
  },
});
