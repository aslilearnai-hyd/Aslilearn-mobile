import { storageGetItem } from '../../../src/lib/safe-storage';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  fetchStudentTimetable,
  filterSlotsForToday,
  timetableEntriesToSlots,
} from '../../../src/lib/timetable-helpers';
import { GlassCard } from '../../../src/components/student';
import { STUDENT, STUDENT_RADIUS } from '../../../src/theme/student';

const COLORS_SUBJ = ['#10b981', '#2563eb', '#f59e0b', '#0d9488', '#8b5cf6', '#22c55e'];

type Slot = {
  subject?: string;
  teacher?: string;
  time?: string;
  startTime?: string;
  endTime?: string;
  room?: string;
  day?: string;
};

function isLiveNow(slot: Slot): boolean {
  const now = new Date();
  const start = slot.startTime || slot.time?.split('-')[0]?.trim();
  if (!start) return false;
  try {
    const [h, m] = start.split(':').map(Number);
    const s = new Date(now);
    s.setHours(h, m || 0, 0, 0);
    const e = new Date(s);
    e.setHours(s.getHours() + 1);
    return now >= s && now <= e;
  } catch {
    return false;
  }
}

export default function TodayScheduleSection() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);

  const todayName = useMemo(
    () => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()],
    []
  );

  useEffect(() => {
    (async () => {
      try {
        const token = await storageGetItem('authToken');
        if (!token) return;
        const entries = await fetchStudentTimetable(token);
        const allSlots = timetableEntriesToSlots(entries);
        setSlots(filterSlotsForToday(allSlots));
      } catch {
        setSlots([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [todayName]);

  if (loading) return null;
  const header = (
    <View style={styles.headerRow}>
      <Text style={styles.title}>Today&apos;s Schedule</Text>
      <View style={styles.headerLinks}>
        <TouchableOpacity onPress={() => router.push('/student/timetable')} activeOpacity={0.8}>
          <Text style={styles.linkText}>Full Timetable</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/student/schedule')} activeOpacity={0.8}>
          <Text style={styles.linkText}>Study Schedule</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (slots.length === 0) {
    return (
      <View style={styles.wrap}>
        {header}
        <GlassCard variant="glass">
          <Text style={styles.empty}>No Classes Scheduled Today</Text>
        </GlassCard>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {header}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {slots.map((slot, i) => {
          const live = isLiveNow(slot);
          const color = COLORS_SUBJ[i % COLORS_SUBJ.length];
          return (
            <GlassCard
              key={`${slot.subject}-${i}`}
              variant="glass"
              style={StyleSheet.flatten([styles.card, { borderLeftColor: color, borderLeftWidth: 3 }])}
            >
              {live ? (
                <View style={styles.liveBadge}>
                  <Text style={styles.liveText}>Live Now</Text>
                </View>
              ) : null}
              <Text style={[styles.subject, { color }]} numberOfLines={1}>
                {slot.subject || 'Subject'}
              </Text>
              <Text style={styles.teacher} numberOfLines={1}>
                {slot.teacher || 'Teacher'}
              </Text>
              <View style={styles.timeRow}>
                <Ionicons name="time-outline" size={12} color={STUDENT.textMuted} />
                <Text style={styles.time}>
                  {slot.time || slot.startTime || '—'}
                  {slot.endTime ? ` – ${slot.endTime}` : ''}
                </Text>
              </View>
              {slot.room ? (
                <Text style={styles.room} numberOfLines={1}>
                  Room {slot.room}
                </Text>
              ) : null}
            </GlassCard>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  headerLinks: { flexDirection: 'row', gap: 10 },
  linkText: { fontSize: 12, fontWeight: '700', color: STUDENT.primary },
  title: { fontSize: 17, fontWeight: '800', color: STUDENT.text, flex: 1 },
  scroll: { gap: 10, paddingRight: 8 },
  card: { width: 160, minHeight: 110 },
  subject: { fontSize: 15, fontWeight: '800', marginBottom: 4 },
  teacher: { fontSize: 12, color: STUDENT.textSecondary, marginBottom: 8 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  time: { fontSize: 11, color: STUDENT.textMuted },
  room: { fontSize: 10, color: STUDENT.textMuted, marginTop: 4 },
  liveBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(163,230,53,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: STUDENT_RADIUS.full,
    marginBottom: 6,
  },
  liveText: { fontSize: 10, fontWeight: '800', color: STUDENT.accent },
  empty: { color: STUDENT.textMuted, textAlign: 'center' },
});
