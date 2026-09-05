import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { COLORS } from '../../../theme';
import { barHeight, buildTicks, chartMax, CHART_THEME, gridBottom, slotWidthForCount } from './chart-theme';

type DataPoint = {
  label: string;
  value: number;
  color?: string;
};

type Props = {
  data: DataPoint[];
  height?: number;
  maxValue?: number;
  formatYTick?: (value: number) => string;
  formatBarValue?: (value: number) => string;
};

function defaultFormatYTick(value: number) {
  return String(Math.round(value));
}

export default function BarChart({
  data,
  height = 210,
  maxValue,
  formatYTick = defaultFormatYTick,
  formatBarValue,
}: Props) {
  const { width: screenW } = useWindowDimensions();
  const [measuredW, setMeasuredW] = useState(0);
  const formatBar = formatBarValue ?? formatYTick;
  const plotH = height - 56;

  const rawMax = Math.max(...data.map((d) => d.value), 0);
  const max = maxValue ?? chartMax(rawMax > 0 ? rawMax : 1);
  const yTicks = useMemo(() => buildTicks(max), [max]);

  const shellWidth = measuredW > 0 ? measuredW : Math.max(280, screenW - 64);
  const plotWidth = Math.max(180, shellWidth - 44);
  const slotWidth = slotWidthForCount(plotWidth, data.length, 72, 120);
  const chartContentW = data.length * slotWidth;
  const needsScroll = chartContentW > plotWidth + 8;
  const barW = Math.min(64, Math.max(28, Math.floor(slotWidth * 0.52)));

  const onShellLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    if (next > 0 && Math.abs(next - measuredW) > 2) {
      setMeasuredW(next);
    }
  };

  if (!data.length) return null;

  const plotBody = (
    <>
      <View style={[styles.plotArea, { height: plotH }]}>
        {yTicks.map((tick) => (
          <View
            key={`grid-${tick}`}
            style={[styles.gridLine, { bottom: gridBottom(tick, max, plotH) }]}
          />
        ))}
        <View style={[styles.barsLayer, needsScroll ? { width: chartContentW } : undefined]}>
          {data.map((item, i) => {
            const h = barHeight(item.value, max, plotH, 8);
            return (
              <View
                key={`${item.label}-${i}`}
                style={[styles.barSlot, needsScroll ? { width: slotWidth } : undefined]}
              >
                {h > 0 ? (
                  <Text style={[styles.barValue, { bottom: h + 4, width: slotWidth }]}>{formatBar(item.value)}</Text>
                ) : null}
                <View
                  style={[
                    styles.bar,
                    {
                      width: barW,
                      height: h,
                      backgroundColor: item.color || COLORS.primary,
                    },
                  ]}
                />
              </View>
            );
          })}
        </View>
      </View>
      <View style={[styles.xRow, needsScroll ? { width: chartContentW } : undefined]}>
        {data.map((item, i) => (
          <Text
            key={`xl-${item.label}-${i}`}
            style={[styles.xLabel, needsScroll ? { width: slotWidth } : undefined]}
            numberOfLines={2}
          >
            {item.label}
          </Text>
        ))}
      </View>
    </>
  );

  return (
    <View style={styles.shell} collapsable={false} onLayout={onShellLayout}>
      <View style={styles.chartRow}>
        <View style={[styles.yAxis, { height: plotH }]}>
          {yTicks.map((tick) => (
            <Text key={`y-${tick}`} style={[styles.yTick, { bottom: gridBottom(tick, max, plotH) - 6 }]}>
              {formatYTick(tick)}
            </Text>
          ))}
        </View>

        {needsScroll ? (
          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={data.length > 4}
            style={styles.plotScroll}
            contentContainerStyle={{ minWidth: chartContentW }}
          >
            <View style={{ width: chartContentW }}>{plotBody}</View>
          </ScrollView>
        ) : (
          <View style={styles.plotCol}>{plotBody}</View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    width: '100%',
    backgroundColor: CHART_THEME.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CHART_THEME.surfaceBorder,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  chartRow: { flexDirection: 'row', alignItems: 'flex-start' },
  yAxis: {
    width: 36,
    position: 'relative',
    marginRight: 4,
  },
  yTick: {
    position: 'absolute',
    left: 0,
    width: 32,
    fontSize: 9,
    fontWeight: '600',
    color: CHART_THEME.label,
    textAlign: 'right',
  },
  plotCol: { flex: 1, minWidth: 0 },
  plotScroll: { flex: 1, minWidth: 0 },
  plotArea: {
    position: 'relative',
    borderBottomWidth: 1.5,
    borderBottomColor: CHART_THEME.axis,
    overflow: 'hidden',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: CHART_THEME.grid,
  },
  barsLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingHorizontal: 4,
  },
  barSlot: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
    height: '100%',
    position: 'relative',
  },
  barValue: {
    position: 'absolute',
    fontSize: 9,
    fontWeight: '700',
    color: CHART_THEME.value,
    textAlign: 'center',
    width: 56,
  },
  bar: {
    borderTopLeftRadius: CHART_THEME.barRadius,
    borderTopRightRadius: CHART_THEME.barRadius,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  xRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  xLabel: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: CHART_THEME.label,
    textAlign: 'center',
    lineHeight: 14,
    paddingHorizontal: 2,
  },
});
