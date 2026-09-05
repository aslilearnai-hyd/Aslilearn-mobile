import React from 'react';
import { G, Line, Text as SvgText } from 'react-native-svg';
import { ChartPadding, getPlotArea } from './chart-math';

type Props = {
  width: number;
  height: number;
  maxValue: number;
  padding?: ChartPadding;
  gridLines?: number;
};

export default function ChartGrid({
  width,
  height,
  maxValue,
  padding = { left: 36, top: 14, right: 12, bottom: 36 },
  gridLines = 4,
}: Props) {
  const plot = getPlotArea(width, height, padding);

  return (
    <G>
      {Array.from({ length: gridLines + 1 }).map((_, i) => {
        const y = plot.topY + (plot.height / gridLines) * i;
        const value = Math.round(maxValue - (maxValue / gridLines) * i);
        return (
          <G key={i}>
            <Line
              x1={plot.baseX}
              y1={y}
              x2={plot.baseX + plot.width}
              y2={y}
              stroke="#d1d5db"
              strokeWidth={1}
              strokeDasharray="5 4"
            />
            <SvgText x={plot.baseX - 6} y={y + 4} fontSize={9} fill="#64748b" textAnchor="end">
              {String(value)}
            </SvgText>
          </G>
        );
      })}
      <Line
        x1={plot.baseX}
        y1={plot.topY}
        x2={plot.baseX}
        y2={plot.baseY}
        stroke="#64748b"
        strokeWidth={1.5}
      />
      <Line
        x1={plot.baseX}
        y1={plot.baseY}
        x2={plot.baseX + plot.width}
        y2={plot.baseY}
        stroke="#64748b"
        strokeWidth={1.5}
      />
    </G>
  );
}
