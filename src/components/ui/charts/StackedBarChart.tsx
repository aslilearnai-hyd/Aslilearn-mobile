import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import ChartLegend from './ChartLegend';
import { barHeight, buildTicks, chartMax, CHART_THEME, gridBottom, slotWidthForCount } from './chart-theme';

export type StackedBarSeries = { key: string; color: string; label: string };
export type StackedBarDatum = { label: string; [key: string]: string | number };

type Props = {
  data: StackedBarDatum[];
  series: StackedBarSeries[];
  height?: number;
  slotWidth?: number;
  idealTimeKey?: string;
  idealTimeMax?: number;
};

export default function StackedBarChart({
  data,
  series,
  height = 250,
  slotWidth: slotWidthProp,
  idealTimeKey,
  idealTimeMax,
}: Props) {
  const { width: screenW } = useWindowDimensions();
  const plotH = height - 56;
  const slotWidth = slotWidthProp ?? slotWidthForCount(screenW, data.length);
  const barW = Math.min(40, slotWidth - 24);

  const maxValue = useMemo(
    () =>
      chartMax(
        Math.max(
          1,
          ...data.map((row) => series.reduce((sum, s) => sum + (Number(row[s.key]) || 0), 0))
        )
      ),
    [data, series]
  );

  const idealMax =
    idealTimeMax ?? Math.max(...data.map((r) => Number(r[idealTimeKey || ''] || 0)), 60);

  const yTicks = useMemo(() => buildTicks(maxValue), [maxValue]);
  const chartW = Math.max(screenW - 88, data.length * slotWidth);

  if (!data.length) return null;

  return (
    <View style={styles.shell} collapsable={false}>
      <View style={styles.chartRow}>
        <View style={[styles.yAxis, { height: plotH }]}>
          {yTicks.map((tick) => (
            <Text key={`yl-${tick}`} style={[styles.yTick, { bottom: gridBottom(tick, maxValue, plotH) - 6 }]}>
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
                  const total = series.reduce((sum, s) => sum + (Number(row[s.key]) || 0), 0);
                  const idealSec = idealTimeKey ? Number(row[idealTimeKey]) || 0 : 0;
                  const idealBottom =
                    idealTimeKey && idealMax > 0 && idealSec > 0 && total > 0
                      ? gridBottom(idealSec, idealMax, plotH)
                      : null;

                  const segments = series
                    .map((s) => ({ s, value: Number(row[s.key]) || 0 }))
                    .filter((seg) => seg.value > 0);
                  const topKey = segments[segments.length - 1]?.s.key;

                  return (
                    <View key={`${row.label}-${groupIndex}`} style={[styles.column, { width: slotWidth }]}>
                      {idealBottom != null ? (
                        <View style={[styles.idealLine, { bottom: idealBottom, width: barW + 8 }]} />
                      ) : null}
                      {total > 0 ? (
                        <>
                          <Text style={[styles.totalLabel, { bottom: barHeight(total, maxValue, plotH, 4) + 4 }]}>
                            {total}
                          </Text>
                          <View style={[styles.stack, { width: barW }]}>
                            {segments.map(({ s, value }) => {
                              const segH = barHeight(value, maxValue, plotH, 3);
                              const isTop = s.key === topKey;
                              return (
                                <View
                                  key={s.key}
                                  style={[
                                    styles.segment,
                                    {
                                      height: segH,
                                      backgroundColor: s.color,
                                      borderTopLeftRadius: isTop ? CHART_THEME.barRadius : 0,
                                      borderTopRightRadius: isTop ? CHART_THEME.barRadius : 0,
                                    },
                                  ]}
                                />
                              );
                            })}
                          </View>
                        </>
                      ) : (
                        <View style={styles.emptyCol}>
                          <Text style={styles.emptyText}>0</Text>
                          <View style={[styles.emptyBar, { width: barW }]} />
                        </View>
                      )}
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
                  {String(row.label)}
                </Text>
              ))}
            </View>
          </View>
        </ScrollView>

        {idealTimeKey ? (
          <View style={[styles.yAxisRight, { height: plotH }]}>
            {yTicks.map((tick) => (
              <Text
                key={`yr-${tick}`}
                style={[styles.yTickRight, { bottom: gridBottom(tick, maxValue, plotH) - 6 }]}
              >
                {Math.round((tick / maxValue) * idealMax)}s
              </Text>
            ))}
          </View>
        ) : null}
      </View>

      <ChartLegend
        items={[
          ...series.map((s) => ({ color: s.color, label: s.label })),
          ...(idealTimeKey ? [{ color: CHART_THEME.ideal, label: 'Ideal time' }] : []),
        ]}
      />
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
    width: 26,
    position: 'relative',
    marginRight: 2,
  },
  yAxisRight: {
    width: 28,
    position: 'relative',
    marginLeft: 2,
  },
  yTick: {
    position: 'absolute',
    left: 0,
    width: 22,
    fontSize: 9,
    fontWeight: '600',
    color: CHART_THEME.label,
    textAlign: 'right',
  },
  yTickRight: {
    position: 'absolute',
    left: 0,
    width: 26,
    fontSize: 8,
    fontWeight: '600',
    color: CHART_THEME.ideal,
    textAlign: 'left',
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
  stack: {
    flexDirection: 'column-reverse',
    alignItems: 'center',
    zIndex: 2,
  },
  segment: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.75)',
  },
  totalLabel: {
    position: 'absolute',
    fontSize: 9,
    fontWeight: '700',
    color: CHART_THEME.value,
    zIndex: 3,
  },
  idealLine: {
    position: 'absolute',
    height: 2,
    backgroundColor: CHART_THEME.ideal,
    zIndex: 4,
    opacity: 0.85,
    borderRadius: 1,
  },
  emptyCol: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    opacity: 0.5,
    marginBottom: 2,
  },
  emptyText: {
    fontSize: 9,
    fontWeight: '700',
    color: CHART_THEME.label,
    marginBottom: 2,
  },
  emptyBar: {
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
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
