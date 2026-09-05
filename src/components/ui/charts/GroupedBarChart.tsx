import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import ChartLegend from './ChartLegend';
import { barHeight, buildTicks, chartMax, CHART_THEME, gridBottom, slotWidthForCount } from './chart-theme';

export type GroupedBarSeries = { key: string; color: string; label: string };
export type GroupedBarDatum = { label: string; [key: string]: string | number };

type Props = {
  data: GroupedBarDatum[];
  series: GroupedBarSeries[];
  height?: number;
  slotWidth?: number;
};

export default function GroupedBarChart({
  data,
  series,
  height = 280,
  slotWidth: slotWidthProp,
}: Props) {
  const { width: screenW } = useWindowDimensions();
  const plotH = height - 56;
  const slotWidth = slotWidthProp ?? slotWidthForCount(screenW, data.length);

  const maxValue = useMemo(
    () => chartMax(Math.max(1, ...data.flatMap((row) => series.map((s) => Number(row[s.key]) || 0)))),
    [data, series]
  );
  const yTicks = useMemo(() => buildTicks(maxValue), [maxValue]);

  if (!data.length) return null;

  const barW = Math.min(20, Math.max(12, Math.floor((slotWidth - 16) / series.length) - 3));
  const barGap = 3;
  const chartW = Math.max(screenW - 88, data.length * slotWidth);

  return (
    <View style={styles.shell} collapsable={false}>
      <View style={styles.chartRow}>
        <View style={[styles.yAxis, { height: plotH }]}>
          {yTicks.map((tick) => (
            <Text key={`y-${tick}`} style={[styles.yTick, { bottom: gridBottom(tick, maxValue, plotH) - 6 }]}>
              {tick}
            </Text>
          ))}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={data.length > 3}
          nestedScrollEnabled
          style={styles.scroll}
          contentContainerStyle={{ minWidth: chartW }}
        >
          <View style={{ width: chartW }}>
            <View style={[styles.plotArea, { height: plotH }]}>
              {yTicks.map((tick) => (
                <View
                  key={`grid-${tick}`}
                  style={[styles.gridLine, { bottom: gridBottom(tick, maxValue, plotH) }]}
                />
              ))}
              <View style={styles.columnsRow}>
                {data.map((row, groupIndex) => {
                  const label = String(row.label);
                  const groupTotal = series.reduce((s, ser) => s + (Number(row[ser.key]) || 0), 0);
                  return (
                    <View key={`${label}-${groupIndex}`} style={[styles.column, { width: slotWidth }]}>
                      {groupTotal <= 0 ? (
                        <Text style={styles.noData}>—</Text>
                      ) : null}
                      <View style={styles.barsRow}>
                        {series.map((s) => {
                          const value = Number(row[s.key]) || 0;
                          const h = barHeight(value, maxValue, plotH, 5);
                          return (
                            <View key={s.key} style={[styles.barSlot, { width: barW, marginHorizontal: barGap / 2 }]}>
                              {value > 0 ? (
                                <Text style={[styles.barValue, { bottom: h + 3 }]}>{value}</Text>
                              ) : null}
                              <View
                                style={[
                                  styles.bar,
                                  {
                                    width: barW,
                                    height: h,
                                    backgroundColor: s.color,
                                  },
                                ]}
                              />
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
            <View style={styles.xRow}>
              {data.map((row, groupIndex) => (
                <Text
                  key={`xl-${row.label}-${groupIndex}`}
                  style={[styles.xLabel, { width: slotWidth }]}
                  numberOfLines={2}
                >
                  {row.label}
                </Text>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
      <ChartLegend items={series.map((s) => ({ color: s.color, label: s.label }))} />
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
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 6,
  },
  chartRow: { flexDirection: 'row' },
  yAxis: {
    width: 28,
    position: 'relative',
    marginRight: 2,
  },
  yTick: {
    position: 'absolute',
    left: 0,
    width: 24,
    fontSize: 9,
    fontWeight: '600',
    color: CHART_THEME.label,
    textAlign: 'right',
  },
  scroll: { flex: 1 },
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
  columnsRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    flexDirection: 'row',
  },
  column: {
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  barSlot: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
    position: 'relative',
  },
  barValue: {
    position: 'absolute',
    fontSize: 9,
    fontWeight: '700',
    color: CHART_THEME.value,
    width: 28,
    textAlign: 'center',
  },
  bar: {
    borderTopLeftRadius: CHART_THEME.barRadius,
    borderTopRightRadius: CHART_THEME.barRadius,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  noData: {
    position: 'absolute',
    bottom: 10,
    fontSize: 11,
    color: '#CBD5E1',
    fontWeight: '700',
    zIndex: 1,
  },
  xRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  xLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: CHART_THEME.label,
    textAlign: 'center',
    lineHeight: 13,
    paddingHorizontal: 2,
  },
});
