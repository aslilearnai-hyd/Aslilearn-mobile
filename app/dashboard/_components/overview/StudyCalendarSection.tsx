import { storageGetItem } from '../../../../src/lib/safe-storage';
import React, { memo, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, Modal, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE_URL } from '../../../../src/lib/api-config';
import StudentCardDecor from '../../../../src/components/student/StudentCardDecor';
import {
  buildExamCalendarEntries,
  buildSchoolEventCalendarEntries,
  formatCalendarDateKey,
  parseCalendarDate,
  type ExamDayRole,
} from '../../../../src/lib/exam-calendar-entries';
import { STUDENT, STUDENT_RADIUS, STUDENT_SKY } from '../../../../src/theme/student';

type CalendarEntry = {
  id: string;
  type: 'quiz' | 'exam' | 'timetable' | 'event';
  title: string;
  subject: string;
  date: Date;
  source?: any;
  startTime?: string;
  endTime?: string;
  teacher?: string;
  room?: string;
  examDayRole?: ExamDayRole;
  windowStart?: Date;
  windowEnd?: Date;
};

const CAL_SKY = STUDENT_SKY;
const DAY_SELECTED = '#4f46e5';
const DAY_TODAY_BG = '#eef2ff';
const DAY_TODAY_BORDER = '#c7d2fe';
const DAY_TODAY_TEXT = '#4338ca';
const COUNT_ORANGE_BG = '#ffedd5';
const COUNT_ORANGE_TEXT = '#c2410c';

const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

type StudyCalendarLayout = 'auto' | 'calendar-only' | 'events-only';

type Props = {
  incompleteQuizzes: any[];
  exams: any[];
  examAttemptCounts?: Record<string, number>;
  studentClassNumber?: string | number | null;
  onOpenQuiz: (quiz: any) => void;
  onOpenExam: (examId: string) => void;
  layout?: StudyCalendarLayout;
};

function StudyCalendarSectionComponent({
  incompleteQuizzes,
  exams,
  onOpenQuiz,
  onOpenExam,
  layout = 'auto',
}: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const isTablet = screenWidth >= 768;

  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [daySheetOpen, setDaySheetOpen] = useState(false);
  const [schoolCalendarEvents, setSchoolCalendarEvents] = useState<any[]>([]);

  const calendarMonthKey = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, '0')}`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await storageGetItem('authToken');
        const response = await fetch(`${API_BASE_URL}/api/student/calendar/events?month=${calendarMonthKey}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (!response.ok || cancelled) return;
        const payload = await response.json();
        if (!cancelled) {
          setSchoolCalendarEvents(Array.isArray(payload?.data) ? payload.data : []);
        }
      } catch {
        if (!cancelled) setSchoolCalendarEvents([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [calendarMonthKey]);

  const calendarEntries = useMemo(() => {
    const quizEntries = incompleteQuizzes
      .map((quiz: any) => {
        const date =
          parseCalendarDate(quiz.startDate) ||
          parseCalendarDate(quiz.scheduledDate) ||
          parseCalendarDate(quiz.deadline);
        if (!date) return null;
        return {
          id: String(quiz._id || quiz.id),
          type: 'quiz' as const,
          title: quiz.title || 'Quiz',
          subject: typeof quiz.subject === 'string' ? quiz.subject : quiz.subject?.name || 'General',
          date,
          source: quiz,
        };
      })
      .filter(Boolean) as CalendarEntry[];
    return [
      ...quizEntries,
      ...buildExamCalendarEntries(exams),
      ...buildSchoolEventCalendarEntries(schoolCalendarEvents),
    ];
  }, [incompleteQuizzes, exams, schoolCalendarEvents]);

  const entriesByDate = useMemo(() => {
    const acc: Record<string, CalendarEntry[]> = {};
    calendarEntries.forEach((entry) => {
      const key = formatCalendarDateKey(entry.date);
      if (!acc[key]) acc[key] = [];
      acc[key].push(entry);
    });
    return acc;
  }, [calendarEntries]);

  const selectedDateEntries = useMemo(() => {
    const key = formatCalendarDateKey(selectedDate);
    return (entriesByDate[key] || []).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [selectedDate, entriesByDate]);

  const today = useMemo(() => new Date(), []);

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const offset = (firstDay.getDay() + 6) % 7;
    const cells: (Date | null)[] = [];
    for (let i = 0; i < offset; i += 1) cells.push(null);
    for (let d = 1; d <= daysInMonth; d += 1) cells.push(new Date(year, month, d));
    // Keep a fixed 6x7 matrix to avoid row-wrapping glitches on some device widths.
    while (cells.length < 42) cells.push(null);
    return cells;
  }, [calendarMonth]);

  const goToToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setCalendarMonth(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  const shiftMonth = (delta: number) => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const openDay = (day: Date) => {
    setSelectedDate(day);
    setDaySheetOpen(true);
  };

  const closeDaySheet = () => setDaySheetOpen(false);

  const openEntry = (entry: CalendarEntry) => {
    closeDaySheet();
    if (entry.type === 'exam') {
      const examId = String(entry.id || entry.source?._id || entry.source?.id || '');
      if (examId) onOpenExam(examId);
      return;
    }
    if (entry.type === 'quiz' && entry.source) {
      onOpenQuiz(entry.source);
    }
  };

  const typeMeta = (type: CalendarEntry['type']) => {
    if (type === 'exam') return { label: 'EXAM', bg: '#e11d48', text: '#ffffff' };
    if (type === 'quiz') return { label: 'QUIZ', bg: '#0d9488', text: '#ffffff' };
    return { label: 'EVENT', bg: '#4f46e5', text: '#ffffff' };
  };

  const scheduledCount = selectedDateEntries.length;
  const scheduledLabel =
    scheduledCount === 0
      ? 'No Scheduled Items'
      : `${scheduledCount} scheduled item${scheduledCount === 1 ? '' : 's'}`;

  const renderCalendarCard = () => (
      <LinearGradient
        colors={[...CAL_SKY.gradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.calGradientShell, isTablet && styles.calGradientShellTablet]}
      >
        <StudentCardDecor variant="calendar" />
        <View style={styles.calHeader}>
          <Text style={styles.calTitleOnGradient}>Study Calendar</Text>
        </View>
        <View style={[styles.calInnerBody, isTablet && styles.calInnerBodyTablet]}>
          <View style={styles.monthNavRow}>
            <TouchableOpacity style={styles.navIconBtn} onPress={() => shiftMonth(-1)} hitSlop={8}>
              <Ionicons name="chevron-back" size={18} color={CAL_SKY.accentDark} />
            </TouchableOpacity>
            <View style={styles.monthLabelWrap}>
              <Text style={styles.monthLabelInner}>
                {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </Text>
            </View>
            <TouchableOpacity style={styles.navIconBtn} onPress={() => shiftMonth(1)} hitSlop={8}>
              <Ionicons name="chevron-forward" size={18} color={CAL_SKY.accentDark} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.todayChip} onPress={goToToday}>
              <Text style={styles.todayChipText}>Today</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.weekHead}>
            {WEEKDAY_LABELS.map((label, index) => (
              <View key={`${label}-${index}`} style={styles.weekHeadCell}>
                <Text style={styles.weekHeadText}>{label}</Text>
              </View>
            ))}
          </View>
          <View style={styles.weekHeadDivider} />

          <View style={styles.grid}>
            {Array.from({ length: 6 }, (_, rowIndex) => (
              <View key={`week-row-${rowIndex}`} style={styles.gridRow}>
                {calendarDays.slice(rowIndex * 7, rowIndex * 7 + 7).map((day, colIndex) => {
                  const idx = rowIndex * 7 + colIndex;
                  if (!day) {
                    return <View key={`e-${idx}`} style={styles.dayCell} />;
                  }
                  const dayKey = formatCalendarDateKey(day);
                  const itemCount = (entriesByDate[dayKey] || []).length;
                  const isSelected = isSameCalendarDay(selectedDate, day);
                  const isToday = isSameCalendarDay(today, day);

                  return (
                    <TouchableOpacity
                      key={dayKey}
                      style={styles.dayCell}
                      onPress={() => openDay(day)}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.dayCellInner,
                          isToday && !isSelected && styles.dayCellInnerToday,
                          isSelected && styles.dayCellInnerSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayNum,
                            isToday && !isSelected && styles.dayNumToday,
                            isSelected && styles.dayNumSelected,
                          ]}
                        >
                          {day.getDate()}
                        </Text>
                        {itemCount > 0 ? (
                          <View
                            style={[
                              styles.countBadge,
                              isSelected ? styles.countBadgeSelected : styles.countBadgeIdle,
                            ]}
                          >
                            <Text
                              style={[
                                styles.countBadgeText,
                                isSelected ? styles.countBadgeTextSelected : styles.countBadgeTextIdle,
                              ]}
                            >
                              {itemCount}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      </LinearGradient>
  );

  const renderDaySheet = () => (
    <Modal
      visible={daySheetOpen}
      transparent
      animationType="fade"
      onRequestClose={closeDaySheet}
    >
      <View style={styles.sheetOverlay}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={closeDaySheet} />
        <View style={styles.sheetCard}>
          <View style={styles.sheetHeader}>
            <View style={styles.sheetHeaderText}>
              <Text style={styles.sheetDate}>
                {selectedDate.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
              <Text style={styles.sheetCount}>{scheduledLabel}</Text>
            </View>
            <TouchableOpacity onPress={closeDaySheet} hitSlop={10} accessibilityLabel="Close">
              <Ionicons name="close" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.sheetList} contentContainerStyle={styles.sheetListContent}>
            {scheduledCount === 0 ? (
              <View style={styles.sheetEmpty}>
                <Ionicons name="calendar-outline" size={22} color="#cbd5e1" />
                <Text style={styles.sheetEmptyTitle}>Nothing On This Day</Text>
                <Text style={styles.sheetEmptySub}>Quizzes, exams, and school events will show here.</Text>
              </View>
            ) : (
              selectedDateEntries.map((entry) => {
                const meta = typeMeta(entry.type);
                const canOpen = entry.type === 'exam' || entry.type === 'quiz';
                return (
                  <TouchableOpacity
                    key={`${entry.type}-${entry.id}-${entry.date.getTime()}-${entry.examDayRole || ''}`}
                    style={styles.itemCard}
                    onPress={canOpen ? () => openEntry(entry) : undefined}
                    activeOpacity={canOpen ? 0.85 : 1}
                    disabled={!canOpen}
                  >
                    <View style={[styles.typeBadge, { backgroundColor: meta.bg }]}>
                      <Text style={[styles.typeBadgeText, { color: meta.text }]}>{meta.label}</Text>
                    </View>
                    <View style={styles.itemBody}>
                      <Text style={styles.itemTitle} numberOfLines={1}>
                        {entry.title || 'Scheduled Item'}
                      </Text>
                      <View style={styles.itemMetaRow}>
                        {entry.subject ? (
                          <Text style={styles.itemSubject} numberOfLines={1}>
                            {entry.subject}
                          </Text>
                        ) : null}
                        <View style={styles.itemTimeWrap}>
                          <Ionicons name="time-outline" size={12} color="#0ea5e9" />
                          <Text style={styles.itemTime}>
                            {entry.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={[styles.wrap, isTablet && styles.wrapTablet]}>
      {renderCalendarCard()}
      {layout !== 'calendar-only' ? renderDaySheet() : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12, width: '100%' },
  wrapTablet: {
    width: '100%',
  },
  calGradientShell: {
    width: '100%',
    alignSelf: 'stretch',
    borderRadius: 28,
    padding: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: CAL_SKY.shellBorder,
    ...STUDENT.shadow.md,
  },
  calGradientShellTablet: {
    flex: 1,
    height: '100%',
  },
  calInnerBody: {
    backgroundColor: CAL_SKY.innerBg,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginTop: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: CAL_SKY.innerBorder,
  },
  calInnerBodyTablet: {
    flex: 1,
  },
  calHeader: { marginBottom: 8, zIndex: 1 },
  calTitleOnGradient: { fontSize: 18, fontWeight: '800', color: CAL_SKY.title },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  navIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CAL_SKY.chipBg,
  },
  monthLabelWrap: {
    flex: 1,
    minWidth: 0,
  },
  monthLabelInner: {
    fontSize: 15,
    fontWeight: '700',
    color: CAL_SKY.title,
    textAlign: 'center',
  },
  todayChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: CAL_SKY.accent,
  },
  todayChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  weekHead: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 4,
    backgroundColor: CAL_SKY.weekHead,
    borderTopLeftRadius: STUDENT_RADIUS.inner,
    borderTopRightRadius: STUDENT_RADIUS.inner,
  },
  weekHeadCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekHeadText: { textAlign: 'center', fontSize: 11, fontWeight: '700', color: CAL_SKY.accentDark },
  weekHeadDivider: {
    height: 1,
    backgroundColor: CAL_SKY.divider,
    marginBottom: 8,
  },
  grid: { gap: 4, paddingTop: 2 },
  gridRow: { flexDirection: 'row', gap: 4 },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 1,
  },
  dayCellInner: {
    width: '100%',
    minHeight: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  dayCellInnerToday: {
    backgroundColor: DAY_TODAY_BG,
    borderColor: DAY_TODAY_BORDER,
  },
  dayCellInnerSelected: {
    backgroundColor: DAY_SELECTED,
    borderColor: DAY_SELECTED,
  },
  dayNum: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    lineHeight: 16,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  dayNumToday: { color: DAY_TODAY_TEXT, fontWeight: '700' },
  dayNumSelected: { color: '#ffffff', fontWeight: '700' },
  countBadge: {
    position: 'absolute',
    top: 3,
    right: 3,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeIdle: {
    backgroundColor: COUNT_ORANGE_BG,
  },
  countBadgeSelected: {
    backgroundColor: '#ffffff',
  },
  countBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 11,
  },
  countBadgeTextIdle: {
    color: COUNT_ORANGE_TEXT,
  },
  countBadgeTextSelected: {
    color: DAY_SELECTED,
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  sheetCard: {
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#f8fbff',
    borderWidth: 1,
    borderColor: '#e0f2fe',
    shadowColor: '#38bdf8',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e0f2fe',
    backgroundColor: '#f0f9ff',
  },
  sheetHeaderText: { flex: 1, minWidth: 0 },
  sheetDate: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  sheetCount: { marginTop: 2, fontSize: 12, color: '#64748b', fontWeight: '500' },
  sheetList: { maxHeight: 280 },
  sheetListContent: { padding: 10, gap: 8 },
  sheetEmpty: {
    alignItems: 'center',
    paddingVertical: 22,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    gap: 4,
  },
  sheetEmptyTitle: { fontSize: 13, fontWeight: '600', color: '#475569' },
  sheetEmptySub: { fontSize: 11, color: '#94a3b8', textAlign: 'center' },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  typeBadge: {
    marginTop: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
  itemBody: { flex: 1, minWidth: 0 },
  itemTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  itemMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  itemSubject: { fontSize: 12, color: '#64748b', flexShrink: 1 },
  itemTimeWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  itemTime: { fontSize: 11, color: '#64748b', fontWeight: '500' },
});

export default memo(StudyCalendarSectionComponent);
