import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Svg, { Defs, Line, Pattern, Rect } from 'react-native-svg';
import { useAdminTheme } from './useAdminTheme';

const CELL = 24;

type Props = {
  cellSize?: number;
};

export default function AdminGridBackground({ cellSize = CELL }: Props) {
  const { isDark } = useAdminTheme();
  const { width, height } = Dimensions.get('window');
  const lineColor = isDark ? 'rgba(249, 168, 192, 0.12)' : 'rgba(212, 91, 140, 0.14)';

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height * 2} style={StyleSheet.absoluteFill}>
        <Defs>
          <Pattern id="adminGrid" width={cellSize} height={cellSize} patternUnits="userSpaceOnUse">
            <Line x1={cellSize} y1={0} x2={cellSize} y2={cellSize} stroke={lineColor} strokeWidth={0.75} />
            <Line x1={0} y1={cellSize} x2={cellSize} y2={cellSize} stroke={lineColor} strokeWidth={0.75} />
          </Pattern>
        </Defs>
        <Rect x={0} y={0} width={width} height={height * 2} fill="url(#adminGrid)" />
      </Svg>
    </View>
  );
}
