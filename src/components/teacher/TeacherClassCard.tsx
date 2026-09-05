import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import {
  formatClassSectionLabel,
  formatPersonName,
  formatTitleCase,
  summarizeSubjects,
} from '../../lib/teacher-text';
import { TEACHER, TEACHER_RADIUS, TEACHER_TYPO } from '../../theme/teacher';

export type ClassCardStudent = {
  id: string;
  name: string;
  email: string;
  status?: string;
};

type Props = {
  name: string;
  subject: string;
  studentCount: number;
  schedule: string;
  room: string;
  expanded: boolean;
  onToggleStudents: () => void;
  students?: ClassCardStudent[];
  onViewStudentAnalysis?: (studentId: string) => void;
  /** Grade-based accent: 0 = Class 1 … 11 = Class 12 (sections share color). */
  accentIndex?: number;
};

function usePressScale(to = 0.96) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const onPressIn = () => { scale.value = withSpring(to, { damping: 14, stiffness: 300 }); };
  const onPressOut = () => { scale.value = withSpring(1.0, { damping: 14, stiffness: 300 }); };
  return { style, onPressIn, onPressOut };
}

function ScheduleDisplay({ schedule }: { schedule: string }) {
  const normalized = schedule?.trim() || '';
  if (!normalized || normalized === 'N/A' || normalized.toLowerCase() === 'not scheduled') {
    return <Text style={styles.scheduleMuted}>Not Scheduled</Text>;
  }

  const parts = schedule.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length <= 1) {
    return <Text style={styles.infoValue}>{schedule}</Text>;
  }

  return (
    <View style={styles.scheduleChips}>
      {parts.map((day, i) => (
        <View key={`${day}-${i}`} style={styles.scheduleChip}>
          <Text style={styles.scheduleChipText}>
            {formatTitleCase(day.length <= 4 ? day : day.slice(0, 3))}
          </Text>
        </View>
      ))}
    </View>
  );
}

function formatRoom(room: string) {
  if (!room || room === '—' || room === 'N/A') return '—';
  if (room.toLowerCase().startsWith('room')) return room;
  return `Room ${room}`;
}

function titleCaseStatus(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return 'Active';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

const AVATAR_TINTS = [
  { bg: '#EEF2FF', text: '#4338CA' },
  { bg: '#ECFDF5', text: '#047857' },
  { bg: '#FFF7ED', text: '#C2410C' },
  { bg: '#FDF2F8', text: '#BE185D' },
  { bg: '#EFF6FF', text: '#1D4ED8' },
  { bg: '#F5F3FF', text: '#6D28D9' },
] as const;

/** Exactly one gradient per grade (index = grade − 1). No extras. */
const CARD_ACCENTS = [
  ['#F87171', '#DC2626'] as const, // 1 red
  ['#FB923C', '#EA580C'] as const, // 2 orange
  ['#FBBF24', '#D97706'] as const, // 3 amber
  ['#FCD34D', '#B45309'] as const, // 4 gold
  ['#4ADE80', '#16A34A'] as const, // 5 green
  ['#34D399', '#059669'] as const, // 6 emerald
  ['#2DD4BF', '#0F766E'] as const, // 7 teal
  ['#22D3EE', '#0891B2'] as const, // 8 cyan
  ['#38BDF8', '#2563EB'] as const, // 9 blue
  ['#818CF8', '#4338CA'] as const, // 10 indigo
  ['#A78BFA', '#6D28D9'] as const, // 11 purple
  ['#E879F9', '#A855F7'] as const, // 12 violet
] as const;

function studentInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function TeacherClassCard({
  name,
  subject,
  studentCount,
  schedule,
  room,
  expanded,
  onToggleStudents,
  students = [],
  onViewStudentAnalysis,
  accentIndex = 0,
}: Props) {
  const press = usePressScale();
  const [showAllSubjects, setShowAllSubjects] = useState(false);
  const accent = CARD_ACCENTS[Math.abs(accentIndex) % CARD_ACCENTS.length];
  const accentColor = accent[1];
  const displayName = formatClassSectionLabel(name) || name;
  const subjects = summarizeSubjects(subject, 2);
  const visibleSubjects = showAllSubjects ? subjects.all : subjects.shown;

  return (
    <Animated.View
      entering={FadeInUp.duration(350)}
      style={[styles.card, { borderColor: accentColor }]}
    >
        <View style={styles.headerRow}>
          <View style={[styles.iconBox, { backgroundColor: accentColor, borderColor: accentColor }]}>
            <Ionicons name="school" size={22} color="#FFFFFF" />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.className, { color: accentColor }]}>{displayName}</Text>
            <View style={styles.subjectRow}>
              <Ionicons name="book-outline" size={14} color={accentColor} />
              <View style={styles.subjectChips}>
                {visibleSubjects.map((item) => (
                  <View key={item} style={[styles.subjectChip, { borderColor: `${accentColor}33` }]}>
                    <Text style={[styles.subjectChipText, { color: accentColor }]} numberOfLines={1}>
                      {item}
                    </Text>
                  </View>
                ))}
                {subjects.extra > 0 ? (
                  <Pressable
                    onPress={() => setShowAllSubjects((open) => !open)}
                    accessibilityRole="button"
                    accessibilityLabel={
                      showAllSubjects
                        ? 'Hide extra subjects'
                        : `Show ${subjects.extra} more subjects`
                    }
                    style={[styles.moreChip, { backgroundColor: `${accentColor}18` }]}
                    hitSlop={6}
                  >
                    <Text style={[styles.moreChipText, { color: accentColor }]}>
                      {showAllSubjects ? 'Show less' : `+${subjects.extra} more`}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </View>
          <View style={[styles.activeBadge, { backgroundColor: `${accentColor}18` }]}>
            <Text style={[styles.activeBadgeText, { color: accentColor }]}>Active</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoBlock}>
          <View style={styles.infoRow}>
            <View style={styles.infoLabelWrap}>
              <Ionicons name="people-outline" size={14} color={TEACHER.textMuted} />
              <Text style={styles.infoLabel}>Students</Text>
            </View>
            <Text style={styles.infoValue}>{studentCount}</Text>
          </View>

          <View style={[styles.infoRow, styles.infoRowSchedule]}>
            <View style={styles.infoLabelWrap}>
              <Ionicons name="calendar-outline" size={14} color={TEACHER.textMuted} />
              <Text style={styles.infoLabel}>Schedule</Text>
            </View>
            <ScheduleDisplay schedule={schedule} />
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoLabelWrap}>
              <Ionicons name="business-outline" size={14} color={TEACHER.textMuted} />
              <Text style={styles.infoLabel}>Room</Text>
            </View>
            <Text style={styles.infoValue}>{formatRoom(room)}</Text>
          </View>
        </View>

        {expanded && students.length > 0 ? (
          <View style={styles.rosterSection}>
            <Text style={styles.rosterTitle}>Students</Text>
            <View style={styles.rosterPanel}>
              <ScrollView style={styles.rosterScroll} nestedScrollEnabled>
                {students.map((student, index) => {
                  const isActive = (student.status || 'active').toLowerCase() === 'active';
                  const displayName = formatPersonName(student.name);
                  const initials = studentInitials(displayName);
                  const avatarTint = AVATAR_TINTS[index % AVATAR_TINTS.length];
                  return (
                    <View key={student.id} style={styles.studentRow}>
                      <View style={[styles.avatar, { backgroundColor: avatarTint.bg }]}>
                        <Text style={[styles.avatarText, { color: avatarTint.text }]}>{initials}</Text>
                      </View>
                      <View style={styles.studentInfo}>
                        <Text style={styles.studentName} numberOfLines={1}>
                          {displayName}
                        </Text>
                        <Text style={styles.studentEmail} numberOfLines={1}>{student.email}</Text>
                      </View>
                      <View style={styles.studentActions}>
                        {onViewStudentAnalysis ? (
                          <Pressable
                            style={styles.analysisBtn}
                            onPress={() => onViewStudentAnalysis(student.id)}
                            hitSlop={8}
                            accessibilityRole="button"
                            accessibilityLabel={`View analysis for ${displayName}`}
                          >
                            <Ionicons
                              name="bar-chart-outline"
                              size={14}
                              color={TEACHER.primaryDark}
                              accessibilityElementsHidden
                              importantForAccessibility="no"
                            />
                            <Text style={styles.analysisBtnText}>Analysis</Text>
                          </Pressable>
                        ) : null}
                        <View style={[styles.statusBadge, isActive ? styles.statusActive : styles.statusInactive]}>
                          <Text style={[styles.statusBadgeText, isActive ? styles.statusActiveText : styles.statusInactiveText]}>
                            {titleCaseStatus(student.status || 'Active')}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        ) : null}

        <Pressable
          onPress={onToggleStudents}
          onPressIn={press.onPressIn}
          onPressOut={press.onPressOut}
          style={styles.btnWrap}
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'Hide students' : 'View students'}
          accessibilityState={{ expanded }}
        >
          <Animated.View style={press.style}>
            <LinearGradient
              colors={[TEACHER.primary, TEACHER.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.viewBtn}
            >
              <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={TEACHER.textOnPrimary} />
              <Text style={styles.viewBtnText}>{expanded ? 'Hide Students' : 'View Students'}</Text>
            </LinearGradient>
          </Animated.View>
        </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 14,
    backgroundColor: TEACHER.cardBg,
    borderRadius: TEACHER_RADIUS.lg,
    borderWidth: 4,
    borderColor: TEACHER.primary,
    padding: 16,
    overflow: 'hidden',
    position: 'relative',
    ...TEACHER.shadow.sm,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  headerText: { flex: 1, minWidth: 0 },
  className: {
    ...TEACHER_TYPO.section,
    color: TEACHER.text,
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 6,
  },
  subjectChips: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  subjectChip: {
    maxWidth: '100%',
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  subjectChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  moreChip: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  moreChipText: {
    fontSize: 11,
    fontWeight: '800',
  },
  activeBadge: {
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: TEACHER.success,
  },
  divider: {
    height: 1,
    backgroundColor: TEACHER.surfaceBorder,
    marginBottom: 12,
  },
  infoBlock: { gap: 10 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  infoRowSchedule: { alignItems: 'flex-start' },
  infoLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoLabel: {
    fontSize: 12,
    color: TEACHER.textMuted,
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '700',
    color: TEACHER.text,
  },
  scheduleMuted: {
    fontSize: 12,
    color: TEACHER.textMuted,
  },
  scheduleChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
    justifyContent: 'flex-end',
  },
  scheduleChip: {
    backgroundColor: TEACHER.surfaceHover,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  scheduleChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: TEACHER.primaryDark,
  },
  rosterSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: TEACHER.surfaceBorder,
  },
  rosterTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: TEACHER.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  rosterPanel: {
    backgroundColor: TEACHER.surface,
    borderRadius: TEACHER_RADIUS.md,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
    padding: 10,
  },
  rosterScroll: { maxHeight: 240 },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E7FF',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
    gap: 10,
    ...TEACHER.shadow.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  studentInfo: { flex: 1, minWidth: 0 },
  studentName: { fontSize: 13, fontWeight: '700', color: TEACHER.text },
  studentEmail: { fontSize: 11, color: TEACHER.textMuted, marginTop: 3 },
  studentActions: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 6,
    flexShrink: 0,
  },
  analysisBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: TEACHER.surfaceHover,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  analysisBtnText: { fontSize: 11, fontWeight: '700', color: TEACHER.primaryDark },
  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusActive: {
    borderColor: 'rgba(16,185,129,0.35)',
    backgroundColor: 'rgba(16,185,129,0.12)',
  },
  statusInactive: {
    borderColor: 'rgba(239,68,68,0.35)',
    backgroundColor: 'rgba(239,68,68,0.12)',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  statusActiveText: { color: TEACHER.success },
  statusInactiveText: { color: TEACHER.danger },
  btnWrap: { marginTop: 16 },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 42,
    borderRadius: 10,
  },
  viewBtnText: {
    color: TEACHER.textOnPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
});
