import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Line, Polygon, Text as SvgText } from 'react-native-svg';
import type { DnaScores } from '../../../lib/exam-analysis-helpers';

type Props = {
  scores: DnaScores;
  size?: number;
};

const AXES = [
  { key: 'accuracy' as const, label: 'Accuracy' },
  { key: 'speed' as const, label: 'Speed' },
  { key: 'concept' as const, label: 'Concept' },
  { key: 'difficulty' as const, label: 'Difficulty' },
  { key: 'consistency' as const, label: 'Consistency' },
];

export default function PerformanceDNARadar({ scores, size = 240 }: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.33;
  const n = AXES.length;
  const angleStep = (2 * Math.PI) / n;

  const point = (i: number, radius: number) => {
    const a = -Math.PI / 2 + i * angleStep;
    return { x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a) };
  };

  const valueAt = (i: number) => {
    const k = AXES[i].key;
    return (scores[k] / 100) * r;
  };

  const dataPoints = AXES.map((_, i) => point(i, valueAt(i)));
  const polyPoints = dataPoints.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <View style={styles.wrap}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {[0.25, 0.5, 0.75, 1].map((level) => {
          const gridPoints = AXES.map((_, i) => {
            const p = point(i, r * level);
            return `${p.x},${p.y}`;
          }).join(' ');
          return (
            <Polygon
              key={level}
              points={gridPoints}
              fill="none"
              stroke="#94a3b8"
              strokeWidth={1.5}
              strokeDasharray="4 4"
            />
          );
        })}
        {AXES.map((ax, i) => {
          const p = point(i, r);
          const lp = point(i, r + size * 0.075);
          return (
            <React.Fragment key={ax.key}>
              <Line x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#64748b" strokeWidth={1.5} />
              <SvgText
                x={lp.x}
                y={lp.y}
                fontSize={9}
                fill="#6b7280"
                textAnchor="middle"
                alignmentBaseline="middle"
              >
                {ax.label}
              </SvgText>
            </React.Fragment>
          );
        })}
        <Polygon
          points={polyPoints}
          fill="rgba(124,58,237,0.22)"
          stroke="#7C3AED"
          strokeWidth={2.5}
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
});
