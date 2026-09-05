import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { format, isSameDay, parseISO } from 'date-fns';
import {
  refName,
  type TimetableEntryLike,
} from '../../../src/lib/timetable-utils';

type RowMode = 'teacher' | 'class' | 'room';

type Props = {
  entries: TimetableEntryLike[];
  rowMode: RowMode;
  weekDates: Date[];
  onEntryClick: (entry: TimetableEntryLike) => void;
};

function refId(v: string | { _id?: string } | undefined): string {
  if (!v) return '';
  return typeof v === 'string' ? v : String(v._id || '');
}

function rowKeyFor(entry: TimetableEntryLike, mode: RowMode): string {
  if (mode === 'teacher') return refId(entry.teacherId as string | { _id?: string });
  if (mode === 'class') {
    const section = entry.sectionId || entry.section || '';
    return `${refId(entry.classId as string | { _id?: string })}-${section}`;
  }
  return entry.room?.trim() || 'No Room';
}

function rowLabelFor(entry: TimetableEntryLike, mode: RowMode): string {
  if (mode === 'teacher') {
    return refName(entry.teacherId as string | { fullName?: string; name?: string }) || 'Unknown';
  }
  if (mode === 'class') {
    const classId = entry.classId;
    const classNum =
      classId != null && typeof classId === 'object' && classId.classNumber != null
        ? String(classId.classNumber)
        : entry.classNumber != null
          ? String(entry.classNumber)
          : '';
    const section = entry.sectionId || entry.section || '';
    return classNum ? `${classNum}${section ? `-${section}` : ''}` : 'Class';
  }
  return entry.room?.trim() || 'No Room';
}

const ROW_COL = 108;
const DAY_COL = 88;

export default function TimetableMatrixGrid({ entries, rowMode, weekDates, onEntryClick }: Props) {
  const rowHeader =
    rowMode === 'teacher' ? 'Teacher' : rowMode === 'class' ? 'Class' : 'Room';

  const rows = useMemo(() => {
    const map = new Map<string, { key: string; label: string; entries: TimetableEntryLike[] }>();
    for (const entry of entries) {
      const key = rowKeyFor(entry, rowMode);
      if (!key) continue;
      const existing = map.get(key);
      if (existing) {
        existing.entries.push(entry);
      } else {
        map.set(key, { key, label: rowLabelFor(entry, rowMode), entries: [entry] });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [entries, rowMode]);

  if (rows.length === 0) return null;

  return (
    <View style={styles.shell}>
      <ScrollView horizontal showsHorizontalScrollIndicator nestedScrollEnabled bounces={false}>
        <View style={{ minWidth: ROW_COL + weekDates.length * DAY_COL }}>
          <View style={styles.headerRow}>
            <View style={[styles.cornerCell, { width: ROW_COL }]}>
              <Text style={styles.cornerText}>{rowHeader}</Text>
            </View>
            {weekDates.map((date) => (
              <View key={date.toISOString()} style={[styles.dayHeader, { width: DAY_COL }]}>
                <Text style={styles.dayHeaderText}>{format(date, 'EEE')}</Text>
              </View>
            ))}
          </View>

          {rows.map((row) => (
            <View key={row.key} style={styles.dataRow}>
              <View style={[styles.rowLabelCell, { width: ROW_COL }]}>
                <Text style={styles.rowLabelText} numberOfLines={2}>
                  {row.label}
                </Text>
              </View>
              {weekDates.map((date) => {
                const cellEntries = row.entries.filter((entry) => {
                  const dateKey = entry.date?.slice(0, 10);
                  if (!dateKey) return false;
                  return isSameDay(parseISO(dateKey), date);
                });
                return (
                  <View key={date.toISOString()} style={[styles.dayCell, { width: DAY_COL }]}>
                    {cellEntries.map((entry) => (
                      <Pressable
                        key={String(entry._id || entry.id || `${row.key}-${entry.startTime}`)}
                        onPress={() => onEntryClick(entry)}
                        style={styles.entryPill}
                      >
                        <Text style={styles.entryPillText} numberOfLines={2}>
                          {entry.startTime}{' '}
                          {refName(entry.subjectId as string | { name?: string }) ||
                            entry.subject ||
                            'Session'}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(251, 146, 60, 0.35)',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,247,237,0.55)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(251, 146, 60, 0.25)',
  },
  cornerCell: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderRightColor: 'rgba(251, 146, 60, 0.25)',
    justifyContent: 'center',
  },
  cornerText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9A3412',
    textTransform: 'uppercase',
  },
  dayHeader: {
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRightWidth: 1,
    borderRightColor: 'rgba(251, 146, 60, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayHeaderText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7C2D12',
  },
  dataRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(251, 146, 60, 0.12)',
  },
  rowLabelCell: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderRightColor: 'rgba(251, 146, 60, 0.15)',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  rowLabelText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  dayCell: {
    padding: 4,
    borderRightWidth: 1,
    borderRightColor: 'rgba(251, 146, 60, 0.1)',
    minHeight: 52,
    gap: 4,
  },
  entryPill: {
    backgroundColor: 'rgba(255,247,237,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(234, 88, 12, 0.28)',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  entryPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#7C2D12',
    lineHeight: 12,
  },
});
