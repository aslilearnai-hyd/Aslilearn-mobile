import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, isValid, parseISO } from 'date-fns';
import teacherService from '../../../src/services/api/teacherService';
import { TeacherShimmer } from '../../../src/components/teacher';
import { GlassPanel } from '../../../src/components/ui';
import {
  dateKeyForDate,
  formatEventScheduleDetail,
  formatEventScheduleSummary,
  getExamBoundaryMarkers,
  hasTimetableOnDate,
  timetableEntriesForDate,
  type TimetableEntryLike,
  type UnifiedScheduleEntry,
} from '../../../src/lib/timetable-utils';
import { TEACHER, TEACHER_RADIUS, TEACHER_SPACING, TEACHER_TYPO, glassCard } from '../../../src/theme/teacher';

const WEEK_HEADERS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

type RemoteEvent = {
  id?: string;
  title?: string;
  startDate?: string;
  endDate?: string;
  eventType?: 'exam' | 'admin_event' | string;
  subject?: string;
  classNumber?: string;
  room?: string;
  description?: string;
};

function normalizeTime(rawDate: string | undefined, fallback: string): string {
  if (!rawDate) return fallback;
  const parsed = parseISO(rawDate);
  if (!isValid(parsed)) return fallback;
  return format(parsed, 'HH:mm');
}

function toDateKey(rawDate: string | undefined): string {
  if (!rawDate) return '';
  const parsed = parseISO(rawDate);
  if (!isValid(parsed)) return String(rawDate).slice(0, 10);
  return format(parsed, 'yyyy-MM-dd');
}

function isDateWithinEvent(date: Date, entry: UnifiedScheduleEntry): boolean {
  const current = dateKeyForDate(date);
  const end = entry.endDateKey || entry.date;
  return current >= entry.date && current <= end;
}

function getEventBadgeStyle(eventType: UnifiedScheduleEntry['eventType']) {
  if (eventType === 'exam') return styles.badgeExam;
  if (eventType === 'admin_event') return styles.badgeAdmin;
  return styles.badgeClass;
}

function getEventLabel(eventType: UnifiedScheduleEntry['eventType']) {
  if (eventType === 'exam') return 'Exam';
  if (eventType === 'admin_event') return 'Admin Event';
  return 'Class';
}

export default function ScheduleCalendarView() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMonth, setViewMonth] = useState(new Date());
  const [timetable, setTimetable] = useState<TimetableEntryLike[]>([]);
  const [externalEvents, setExternalEvents] = useState<UnifiedScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailEntry, setDetailEntry] = useState<UnifiedScheduleEntry | null>(null);

  const monthKey = useMemo(
    () => format(viewMonth, 'yyyy-MM'),
    [viewMonth]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [calRes, ttRes] = await Promise.all([
        teacherService.calendarEvents(monthKey),
        teacherService.timetable(),
      ]);
      const rows = Array.isArray(calRes.data) ? calRes.data : [];
      const tt = Array.isArray(ttRes.data) ? ttRes.data : [];
      setTimetable(tt);

      const mapped: UnifiedScheduleEntry[] = rows.map((row: RemoteEvent) => {
        const startDateKey = toDateKey(row.startDate);
        const endDateKey = toDateKey(row.endDate) || startDateKey;
        const eventType: UnifiedScheduleEntry['eventType'] =
          row.eventType === 'exam' ? 'exam' : 'admin_event';

        return {
          id: String(row.id || `remote-${Math.random().toString(36).slice(2, 10)}`),
          date: startDateKey,
          endDateKey,
          startAt: row.startDate,
          endAt: row.endDate || row.startDate,
          startTime: normalizeTime(row.startDate, eventType === 'exam' ? '09:00' : '00:00'),
          endTime: normalizeTime(row.endDate, eventType === 'exam' ? '12:00' : '23:59'),
          title: row.title || 'Untitled Event',
          room: row.room || '',
          eventType,
          subject: row.subject || '',
          classNumber: row.classNumber || '',
          description: row.description || '',
          removable: false,
        };
      });
      setExternalEvents(mapped);
    } catch {
      setTimetable([]);
      setExternalEvents([]);
    } finally {
      setLoading(false);
    }
  }, [monthKey]);

  useEffect(() => {
    load();
  }, [load]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const days: Date[] = [];
    const current = new Date(startDate);
    for (let i = 0; i < 42; i += 1) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return days;
  }, [viewMonth]);

  const hasScheduleOnDate = useCallback(
    (date: Date) =>
      hasTimetableOnDate(timetable, date) ||
      externalEvents.some((e) => isDateWithinEvent(date, e)),
    [timetable, externalEvents]
  );

  const dayEntries = useMemo(() => {
    const dateKey = dateKeyForDate(selectedDate);
    const classEntries = timetableEntriesForDate(timetable, selectedDate);
    const remote = externalEvents.filter((e) => isDateWithinEvent(selectedDate, e));
    return [...classEntries, ...remote].sort((a, b) => {
      const aKey = a.startAt || `${a.date}T${a.startTime}`;
      const bKey = b.startAt || `${b.date}T${b.startTime}`;
      return aKey.localeCompare(bKey);
    });
  }, [selectedDate, timetable, externalEvents]);

  const dateLabel = format(selectedDate, 'EEEE, MMM d, yyyy');

  const shiftMonth = (delta: number) => {
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + delta, 1));
  };

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const isCurrentMonth = (date: Date) =>
    date.getMonth() === viewMonth.getMonth() && date.getFullYear() === viewMonth.getFullYear();

  if (loading) {
    return (
      <View style={styles.wrap}>
        <GlassPanel style={styles.outerCard} radius={TEACHER_RADIUS.lg} tone="medium">
          <View style={styles.outerCardBody}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: TEACHER.secondary }]}>
              <Ionicons name="calendar" size={20} color="#fff" />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Schedule & Calendar</Text>
              <Text style={styles.sectionSub}>Pick A Date And Manage Your Daily Class Slots</Text>
            </View>
          </View>
          <TeacherShimmer variant="list" count={4} />
          </View>
        </GlassPanel>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <GlassPanel style={styles.outerCard} radius={TEACHER_RADIUS.lg} tone="medium">
        <View style={styles.outerCardBody}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: TEACHER.secondary }]}>
            <Ionicons name="calendar" size={20} color={TEACHER.textOnPrimary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Schedule & Calendar</Text>
            <Text style={styles.sectionSub}>Pick A Date And Manage Your Daily Class Slots</Text>
          </View>
        </View>

        <GlassPanel style={styles.calendarCard} radius={TEACHER_RADIUS.lg} tone="light">
          <View style={styles.monthNav}>
            <Pressable style={styles.navBtn} onPress={() => shiftMonth(-1)}>
              <Ionicons name="chevron-back" size={18} color={TEACHER.textSecondary} />
            </Pressable>
            <Text style={styles.monthLabel}>{format(viewMonth, 'MMMM yyyy')}</Text>
            <Pressable style={styles.navBtn} onPress={() => shiftMonth(1)}>
              <Ionicons name="chevron-forward" size={18} color={TEACHER.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.weekHeaderRow}>
            {WEEK_HEADERS.map((d) => (
              <Text key={d} style={styles.weekHeader}>
                {d}
              </Text>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {Array.from({ length: 6 }, (_, rowIndex) => (
              <View key={`week-row-${rowIndex}`} style={styles.daysRow}>
                {calendarDays.slice(rowIndex * 7, rowIndex * 7 + 7).map((day) => {
                  const selected = isSameDay(day, selectedDate);
                  const today = isSameDay(day, new Date());
                  const inMonth = isCurrentMonth(day);
                  const hasSchedule = hasScheduleOnDate(day);
                  const examMarkers = getExamBoundaryMarkers(day, externalEvents);

                  return (
                    <Pressable
                      key={day.toISOString()}
                      style={styles.dayCellWrap}
                      onPress={() => {
                        setSelectedDate(day);
                        if (!isCurrentMonth(day)) {
                          setViewMonth(new Date(day.getFullYear(), day.getMonth(), 1));
                        }
                      }}
                    >
                      <View
                        style={[
                          styles.dayCell,
                          !inMonth && styles.dayCellOutside,
                          today && !selected && styles.dayCellToday,
                          hasSchedule && !selected && !today && styles.dayCellMarked,
                          selected && styles.dayCellSelected,
                        ]}
                      >
                        {examMarkers.isStart && examMarkers.isEnd ? (
                          <View style={[styles.examDot, styles.examDotSingle]} />
                        ) : examMarkers.isStart ? (
                          <View style={[styles.examDot, styles.examDotStart]} />
                        ) : examMarkers.isEnd ? (
                          <View style={[styles.examDot, styles.examDotEnd]} />
                        ) : null}
                        <Text
                          style={[
                            styles.dayText,
                            !inMonth && styles.dayTextOutside,
                            hasSchedule && !selected && styles.dayTextMarked,
                            today && !selected && styles.dayTextToday,
                            selected && styles.dayTextSelected,
                          ]}
                        >
                          {day.getDate()}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        </GlassPanel>

        <GlassPanel style={styles.scheduleCard} radius={TEACHER_RADIUS.lg} tone="light">
          <View style={styles.scheduleHeader}>
            <View style={styles.scheduleIcon}>
              <Ionicons name="time" size={18} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.scheduleTitle}>Schedule</Text>
              <Text style={styles.scheduleDate} numberOfLines={1}>
                {dateLabel}
              </Text>
            </View>
          </View>

          {dayEntries.length === 0 ? (
            <View style={styles.scheduleEmpty}>
              <View style={styles.scheduleEmptyIcon}>
                <Ionicons name="calendar-outline" size={28} color={TEACHER.textMuted} />
              </View>
              <Text style={styles.scheduleEmptyTitle}>No Schedule For This Day</Text>
              <Text style={styles.scheduleEmptySub}>Select Another Date To View Your Schedule</Text>
            </View>
          ) : (
            <ScrollView style={styles.entriesList} nestedScrollEnabled>
              {dayEntries.map((entry) => (
                <Pressable key={entry.id} onPress={() => setDetailEntry(entry)}>
                  <GlassPanel style={styles.entryCard} radius={TEACHER_RADIUS.md} tone="strong">
                  <View style={styles.entryTimeRow}>
                    <Ionicons name="time-outline" size={14} color={TEACHER.primaryLight} />
                    <Text style={styles.entryTime} numberOfLines={2}>
                      {formatEventScheduleSummary(entry)}
                    </Text>
                  </View>
                  <View style={styles.entryTitleRow}>
                    <View style={[styles.eventBadge, getEventBadgeStyle(entry.eventType)]}>
                      <Text
                        style={[
                          styles.eventBadgeText,
                          entry.eventType === 'admin_event' && styles.eventBadgeTextAdmin,
                          entry.eventType === 'class' && styles.eventBadgeTextClass,
                        ]}
                      >
                        {getEventLabel(entry.eventType)}
                      </Text>
                    </View>
                    <Text style={styles.entryTitle} numberOfLines={2}>
                      {entry.title}
                    </Text>
                  </View>
                  {entry.subject ? (
                    <Text style={styles.entryMeta}>Subject: {entry.subject}</Text>
                  ) : null}
                  {entry.classNumber ? (
                    <Text style={styles.entryMeta}>Class: {entry.classNumber}</Text>
                  ) : null}
                  {entry.room ? (
                    <View style={styles.roomRow}>
                      <Ionicons name="location-outline" size={14} color={TEACHER.textMuted} />
                      <Text style={styles.entryMeta}>{entry.room}</Text>
                    </View>
                  ) : null}
                  </GlassPanel>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </GlassPanel>
        </View>
      </GlassPanel>

      <Modal visible={!!detailEntry} transparent animationType="fade">
        <Pressable style={styles.detailOverlay} onPress={() => setDetailEntry(null)}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <GlassPanel style={styles.detailCard} radius={TEACHER_RADIUS.lg} tone="strong">
            <Text style={styles.detailTitle}>{detailEntry?.title || 'Event Details'}</Text>
            <Text style={styles.detailType}>
              {detailEntry ? getEventLabel(detailEntry.eventType) : ''} Details
            </Text>
            {detailEntry ? (
              (() => {
                const schedule = formatEventScheduleDetail(detailEntry);
                if (schedule.mode === 'class') {
                  return (
                    <Text style={styles.detailLine}>
                      <Text style={styles.detailLabel}>Time: </Text>
                      {schedule.startLabel}
                    </Text>
                  );
                }
                if (schedule.mode === 'range') {
                  return (
                    <>
                      <Text style={styles.detailLine}>
                        <Text style={styles.detailLabel}>Starts: </Text>
                        {schedule.startLabel}
                      </Text>
                      <Text style={styles.detailLine}>
                        <Text style={styles.detailLabel}>Ends: </Text>
                        {schedule.endLabel}
                      </Text>
                    </>
                  );
                }
                return (
                  <Text style={styles.detailLine}>
                    <Text style={styles.detailLabel}>When: </Text>
                    {schedule.startLabel}
                  </Text>
                );
              })()
            ) : null}
            {detailEntry?.subject ? (
              <Text style={styles.detailLine}>
                <Text style={styles.detailLabel}>Subject: </Text>
                {detailEntry.subject}
              </Text>
            ) : null}
            {detailEntry?.classNumber ? (
              <Text style={styles.detailLine}>
                <Text style={styles.detailLabel}>Class: </Text>
                {detailEntry.classNumber}
              </Text>
            ) : null}
            {detailEntry?.room ? (
              <Text style={styles.detailLine}>
                <Text style={styles.detailLabel}>Room: </Text>
                {detailEntry.room}
              </Text>
            ) : null}
            {detailEntry?.description ? (
              <Text style={styles.detailLine}>
                <Text style={styles.detailLabel}>Notes: </Text>
                {detailEntry.description}
              </Text>
            ) : null}
            <Pressable style={styles.detailClose} onPress={() => setDetailEntry(null)}>
              <Text style={styles.detailCloseText}>Close</Text>
            </Pressable>
            </GlassPanel>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: TEACHER_SPACING.lg,
    paddingBottom: 120,
  },
  outerCard: {
    ...glassCard,
    // GlassPanel supplies the frosted fill.
    backgroundColor: 'transparent',
    padding: TEACHER_SPACING.lg,
  },
  // Child layout, kept inside GlassPanel's content wrapper.
  outerCardBody: {
    gap: TEACHER_SPACING.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    ...TEACHER_TYPO.section,
    color: TEACHER.text,
  },
  sectionSub: {
    ...TEACHER_TYPO.caption,
    color: TEACHER.textMuted,
    marginTop: 2,
  },
  calendarCard: {
    borderRadius: TEACHER_RADIUS.lg,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
    padding: 12,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
    backgroundColor: TEACHER.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: TEACHER.text,
  },
  weekHeaderRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  weekHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: TEACHER.textMuted,
  },
  daysGrid: {
    gap: 4,
  },
  daysRow: {
    flexDirection: 'row',
  },
  dayCellWrap: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  dayCell: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dayCellOutside: {
    opacity: 0.45,
  },
  dayCellToday: {
    backgroundColor: 'rgba(123,80,255,0.20)',
  },
  dayCellMarked: {
    backgroundColor: TEACHER.surfaceElevated,
  },
  dayCellSelected: {
    backgroundColor: TEACHER.primary,
  },
  examDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: TEACHER.danger,
  },
  examDotStart: {
    top: 4,
    left: 4,
  },
  examDotEnd: {
    top: 4,
    right: 4,
  },
  examDotSingle: {
    top: 4,
    right: 4,
  },
  dayText: {
    fontSize: 13,
    fontWeight: '600',
    color: TEACHER.textSecondary,
  },
  dayTextOutside: {
    color: TEACHER.textMuted,
  },
  dayTextToday: {
    color: TEACHER.primaryLight,
    fontWeight: '700',
  },
  dayTextMarked: {
    color: TEACHER.primaryLight,
    fontWeight: '700',
  },
  dayTextSelected: {
    color: TEACHER.textOnPrimary,
    fontWeight: '800',
  },
  scheduleCard: {
    borderRadius: TEACHER_RADIUS.lg,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
    padding: 14,
    minHeight: 280,
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  scheduleIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: TEACHER.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEACHER.text,
  },
  scheduleDate: {
    fontSize: 12,
    color: TEACHER.textMuted,
    marginTop: 2,
  },
  scheduleEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: TEACHER.surfaceBorder,
    backgroundColor: 'rgba(123,80,255,0.07)',
    paddingVertical: 36,
    paddingHorizontal: 16,
  },
  scheduleEmptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: TEACHER.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  scheduleEmptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: TEACHER.text,
  },
  scheduleEmptySub: {
    fontSize: 13,
    color: TEACHER.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  entriesList: {
    maxHeight: 360,
  },
  entryCard: {
    borderRadius: TEACHER_RADIUS.md,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
    padding: 12,
    marginBottom: 8,
  },
  entryTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  entryTime: {
    fontSize: 13,
    fontWeight: '700',
    color: TEACHER.primaryLight,
  },
  entryTitleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  eventBadge: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeExam: {
    borderColor: 'rgba(255,77,106,0.4)',
    backgroundColor: 'rgba(255,77,106,0.15)',
  },
  badgeAdmin: {
    borderColor: TEACHER.surfaceBorder,
    backgroundColor: TEACHER.surfaceElevated,
  },
  badgeClass: {
    borderColor: 'rgba(123,80,255,0.35)',
    backgroundColor: 'rgba(123,80,255,0.12)',
  },
  eventBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: TEACHER.danger,
  },
  eventBadgeTextAdmin: {
    color: TEACHER.primaryLight,
  },
  eventBadgeTextClass: {
    color: TEACHER.primaryLight,
  },
  entryTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: TEACHER.text,
  },
  entryMeta: {
    fontSize: 13,
    color: TEACHER.textMuted,
    marginTop: 2,
  },
  roomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: 24,
  },
  detailCard: {
    ...glassCard,
    backgroundColor: 'transparent',
    padding: 20,
  },
  detailTitle: {
    ...TEACHER_TYPO.section,
    fontSize: 18,
    color: TEACHER.text,
  },
  detailType: {
    fontSize: 13,
    color: TEACHER.textMuted,
    marginTop: 4,
    marginBottom: 12,
  },
  detailLine: {
    fontSize: 14,
    color: TEACHER.textSecondary,
    marginTop: 8,
    lineHeight: 20,
  },
  detailLabel: {
    fontWeight: '700',
    color: TEACHER.text,
  },
  detailClose: {
    marginTop: 20,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: TEACHER.surfaceElevated,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
  },
  detailCloseText: {
    fontWeight: '700',
    color: TEACHER.textSecondary,
  },
});
