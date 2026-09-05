import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import {
  WEEKDAY_LABELS,
  buildWeekdayPlacements,
  formatHourLabel,
  formatSlotRange,
  getCellEntries,
  getTimeSlots,
  refName,
  teacherSlotLabel,
  todayWeekdayIndex,
  type TimetableEntryLike,
  type WeekdayIndex,
} from '../../lib/timetable-utils';
import { TEACHER } from '../../theme/teacher';

type GridVariant = 'teacher' | 'admin';

type GridTheme = {
  shellBorder: string;
  shellBg: string;
  headerGradient: readonly [string, string];
  cornerBg: string;
  cornerIcon: string;
  cornerText: string;
  timeBorder: string;
  timeDot: string;
  timeLabel: string;
  timeRange: string;
  dayBg: string;
  dayTodayBg: string;
  dayBorder: string;
  todayAccent: string;
  dayLabel: string;
  dayLabelToday: string;
  todayBadge: string;
  slotBg: string;
  slotAltBg: string;
  emptyBorder: string;
  emptyBg: string;
  entryBg: string;
  entryBorder: string;
  entryText: string;
  success: string;
  footerBg: string;
  footerBorder: string;
  footerDotBorder: string;
  footerDotBg: string;
  footerText: string;
};

const TEACHER_THEME: GridTheme = {
  shellBorder: TEACHER.surfaceBorder,
  shellBg: TEACHER.cardBg,
  headerGradient: ['#EEF2FF', '#E0E7FF'],
  cornerBg: TEACHER.surfaceHover,
  cornerIcon: TEACHER.primaryDark,
  cornerText: TEACHER.primaryDark,
  timeBorder: TEACHER.surfaceBorder,
  timeDot: TEACHER.primary,
  timeLabel: TEACHER.text,
  timeRange: TEACHER.textMuted,
  dayBg: TEACHER.surface,
  dayTodayBg: TEACHER.surfaceHover,
  dayBorder: TEACHER.surfaceBorder,
  todayAccent: TEACHER.primary,
  dayLabel: TEACHER.textSecondary,
  dayLabelToday: TEACHER.primaryDark,
  todayBadge: TEACHER.primary,
  slotBg: TEACHER.cardBg,
  slotAltBg: TEACHER.surface,
  emptyBorder: TEACHER.surfaceBorder,
  emptyBg: TEACHER.surface,
  entryBg: TEACHER.surfaceHover,
  entryBorder: 'rgba(99,102,241,0.20)',
  entryText: TEACHER.text,
  success: TEACHER.success,
  footerBg: TEACHER.surface,
  footerBorder: TEACHER.surfaceBorder,
  footerDotBorder: TEACHER.primary,
  footerDotBg: TEACHER.cardBg,
  footerText: TEACHER.textMuted,
};

const ADMIN_THEME: GridTheme = {
  shellBorder: 'rgba(251, 146, 60, 0.45)',
  shellBg: 'rgba(255,255,255,0.42)',
  headerGradient: ['#EA580C', '#F59E0B'],
  cornerBg: 'rgba(194, 65, 12, 0.92)',
  cornerIcon: '#FFFFFF',
  cornerText: '#FFFFFF',
  timeBorder: 'rgba(255, 255, 255, 0.25)',
  timeDot: '#FFFFFF',
  timeLabel: '#FFFFFF',
  timeRange: 'rgba(255, 255, 255, 0.85)',
  dayBg: '#F8FAFC',
  dayTodayBg: '#FFEDD5',
  dayBorder: 'rgba(251, 146, 60, 0.25)',
  todayAccent: '#EA580C',
  dayLabel: '#475569',
  dayLabelToday: '#9A3412',
  todayBadge: '#EA580C',
  slotBg: 'rgba(255,255,255,0.42)',
  slotAltBg: '#FFF7ED',
  emptyBorder: 'rgba(251, 146, 60, 0.35)',
  emptyBg: '#FFFBEB',
  entryBg: '#FFF7ED',
  entryBorder: 'rgba(234, 88, 12, 0.28)',
  entryText: '#7C2D12',
  success: '#10B981',
  footerBg: '#FFF7ED',
  footerBorder: 'rgba(251, 146, 60, 0.25)',
  footerDotBorder: '#EA580C',
  footerDotBg: '#FFFFFF',
  footerText: '#9A3412',
};

type Props = {
  entries: TimetableEntryLike[];
  variant?: GridVariant;
  interactive?: boolean;
  onEntryClick?: (entry: TimetableEntryLike) => void;
  onEmptyClick?: (dayIndex: WeekdayIndex, hour: number) => void;
  footerHint?: string;
};

const DAY_COL = 84;
const TIME_COL = 92;

function usePressScale(to = 0.96) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const onPressIn = () => { scale.value = withSpring(to, { damping: 14, stiffness: 300 }); };
  const onPressOut = () => { scale.value = withSpring(1.0, { damping: 14, stiffness: 300 }); };
  return { style, onPressIn, onPressOut };
}

function EntryCard({
  entry,
  theme,
  variant,
  onEntryClick,
}: {
  entry: TimetableEntryLike;
  theme: GridTheme;
  variant: GridVariant;
  onEntryClick?: (entry: TimetableEntryLike) => void;
}) {
  const animatedPress = variant !== 'teacher';
  const press = usePressScale();
  const done = entry.status === 'Completed';
  const label =
    variant === 'admin'
      ? refName(entry.subjectId as string | { name?: string }) ||
        entry.subject ||
        teacherSlotLabel(entry)
      : teacherSlotLabel(entry);

  const cardStyle = [
    styles.entryCard,
    {
      backgroundColor: theme.entryBg,
      borderColor: theme.entryBorder,
    },
    done && styles.entryDone,
    animatedPress ? press.style : null,
  ];

  return (
    <Pressable
      onPress={() => onEntryClick?.(entry)}
      onPressIn={animatedPress ? press.onPressIn : undefined}
      onPressOut={animatedPress ? press.onPressOut : undefined}
      accessibilityRole="button"
      accessibilityLabel={done ? `${label}, completed` : label}
    >
      {animatedPress ? (
        <Animated.View style={cardStyle}>
          <Text style={[styles.entryText, { color: theme.entryText }]} numberOfLines={3}>
            {label}
          </Text>
          {done ? (
            <Ionicons name="checkmark-circle" size={12} color={theme.success} style={styles.doneIcon} />
          ) : null}
        </Animated.View>
      ) : (
        <View style={cardStyle}>
          <Text style={[styles.entryText, { color: theme.entryText }]} numberOfLines={3}>
            {label}
          </Text>
          {done ? (
            <Ionicons name="checkmark-circle" size={12} color={theme.success} style={styles.doneIcon} />
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

export default function WeeklyTimetableGrid({
  entries,
  variant = 'teacher',
  interactive = false,
  onEntryClick,
  onEmptyClick,
  footerHint,
}: Props) {
  const theme = variant === 'admin' ? ADMIN_THEME : TEACHER_THEME;
  const placements = buildWeekdayPlacements(entries);
  const timeSlots = getTimeSlots();
  const todayIdx = todayWeekdayIndex(new Date());
  const minWidth = DAY_COL + timeSlots.length * TIME_COL;
  const defaultFooterHint =
    variant === 'admin' && interactive
      ? 'Tap Empty Slot To Add · Tap Session To Edit'
      : variant === 'admin'
        ? 'Tap A Session For Details'
        : onEntryClick
          ? 'Tap A Class To Mark As Completed'
          : undefined;
  const hint = footerHint ?? defaultFooterHint;

  const shellStyle = useMemo(
    () => ({
      borderColor: theme.shellBorder,
      backgroundColor: theme.shellBg,
    }),
    [theme]
  );

  return (
    <View style={[styles.shell, shellStyle]}>
      <ScrollView horizontal showsHorizontalScrollIndicator nestedScrollEnabled bounces={false}>
        <View style={{ minWidth }}>
          <LinearGradient
            colors={[...theme.headerGradient]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.headerRow}
          >
            <View style={[styles.cornerCell, { width: DAY_COL, backgroundColor: theme.cornerBg, borderRightColor: theme.timeBorder }]}>
              <Ionicons name="time-outline" size={14} color={theme.cornerIcon} />
              <Text style={[styles.cornerText, { color: theme.cornerText }]}>Time</Text>
            </View>
            {timeSlots.map((hour) => (
              <View key={hour} style={[styles.timeHeader, { width: TIME_COL, borderRightColor: theme.timeBorder }]}>
                <View style={[styles.timeDot, { backgroundColor: theme.timeDot }]} />
                <Text style={[styles.timeHeaderLabel, { color: theme.timeLabel }]}>{formatHourLabel(hour)}</Text>
                <Text style={[styles.timeHeaderRange, { color: theme.timeRange }]}>{formatSlotRange(hour)}</Text>
              </View>
            ))}
          </LinearGradient>

          {WEEKDAY_LABELS.map((label, dayIndex) => {
            const isToday = todayIdx === dayIndex;
            return (
              <View key={label} style={[styles.dayRow, { borderBottomColor: theme.dayBorder }]}>
                <View
                  style={[
                    styles.dayCell,
                    {
                      width: DAY_COL,
                      backgroundColor: isToday ? theme.dayTodayBg : theme.dayBg,
                      borderRightColor: theme.dayBorder,
                    },
                  ]}
                >
                  {isToday ? <View style={[styles.todayAccent, { backgroundColor: theme.todayAccent }]} /> : null}
                  <Text
                    style={[styles.dayLabel, { color: isToday ? theme.dayLabelToday : theme.dayLabel }]}
                    numberOfLines={1}
                  >
                    {label.slice(0, 3).toUpperCase()}
                  </Text>
                  {isToday ? (
                    <View style={[styles.todayBadge, { backgroundColor: theme.todayBadge }]}>
                      <Text style={styles.todayBadgeText}>Today</Text>
                    </View>
                  ) : null}
                </View>

                {timeSlots.map((hour, colIdx) => {
                  const cellEntries = getCellEntries(placements, dayIndex as WeekdayIndex, hour);
                  return (
                    <View
                      key={`${dayIndex}-${hour}`}
                      style={[
                        styles.slotCell,
                        {
                          width: TIME_COL,
                          borderRightColor: theme.dayBorder,
                          backgroundColor: colIdx % 2 === 0 ? theme.slotBg : theme.slotAltBg,
                        },
                      ]}
                    >
                      {cellEntries.length === 0 ? (
                        interactive && onEmptyClick ? (
                          <Pressable
                            onPress={() => onEmptyClick(dayIndex as WeekdayIndex, hour)}
                            accessibilityRole="button"
                            accessibilityLabel={`Add entry for ${label} at ${formatHourLabel(hour)}`}
                            style={({ pressed }) => [
                              styles.emptyCell,
                              {
                                borderColor: theme.emptyBorder,
                                backgroundColor: pressed ? theme.slotAltBg : theme.emptyBg,
                              },
                            ]}
                          />
                        ) : (
                          <View
                            style={[
                              styles.emptyCell,
                              { borderColor: theme.emptyBorder, backgroundColor: theme.emptyBg },
                            ]}
                          />
                        )
                      ) : (
                        cellEntries.map((entry) => (
                          <EntryCard
                            key={entry._id || entry.id || `${teacherSlotLabel(entry)}-${hour}`}
                            entry={entry}
                            theme={theme}
                            variant={variant}
                            onEntryClick={onEntryClick}
                          />
                        ))
                      )}
                    </View>
                  );
                })}
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: theme.footerBorder, backgroundColor: theme.footerBg }]}>
        <View style={[styles.footerDot, { backgroundColor: theme.footerDotBg, borderColor: theme.footerDotBorder }]} />
        <Text style={[styles.footerText, { color: theme.footerText }]}>Monday – Saturday · Same Weekly Pattern</Text>
        {hint ? <Text style={[styles.footerHint, { color: theme.footerText }]}>{hint}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
  },
  cornerCell: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRightWidth: 1,
    gap: 4,
  },
  cornerText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  timeHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRightWidth: 1,
  },
  timeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  timeHeaderLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  timeHeaderRange: {
    fontSize: 8,
    marginTop: 2,
  },
  dayRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  dayCell: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRightWidth: 1,
    position: 'relative',
  },
  todayAccent: {
    position: 'absolute',
    left: 0,
    top: 6,
    bottom: 6,
    width: 3,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  todayBadge: {
    marginTop: 4,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  todayBadgeText: {
    fontSize: 7,
    fontWeight: '800',
    color: '#fff',
  },
  slotCell: {
    minHeight: 52,
    padding: 4,
    borderRightWidth: 1,
  },
  emptyCell: {
    flex: 1,
    minHeight: 44,
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  entryCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 6,
    marginBottom: 4,
  },
  entryDone: {
    opacity: 0.5,
  },
  entryText: {
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 12,
  },
  doneIcon: {
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  footerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
  },
  footerText: {
    fontSize: 10,
  },
  footerHint: {
    fontSize: 10,
  },
});
