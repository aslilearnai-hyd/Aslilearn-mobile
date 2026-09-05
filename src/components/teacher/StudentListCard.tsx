import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import {
  formatClassBadge,
  formatLastLogin,
  progressColors,
  progressTier,
  type StudentRow,
} from '../../lib/students-ui';
import { classGradeAccentIndex } from '../../lib/teacher-text';
import { TEACHER, TEACHER_RADIUS } from '../../theme/teacher';

/** Same grade palette as TeacherClassCard — one color per class number. */
const CARD_ACCENTS = [
  ['#F87171', '#DC2626'] as const, // 1
  ['#FB923C', '#EA580C'] as const, // 2
  ['#FBBF24', '#D97706'] as const, // 3
  ['#FCD34D', '#B45309'] as const, // 4
  ['#4ADE80', '#16A34A'] as const, // 5
  ['#34D399', '#059669'] as const, // 6
  ['#2DD4BF', '#0F766E'] as const, // 7
  ['#22D3EE', '#0891B2'] as const, // 8
  ['#38BDF8', '#2563EB'] as const, // 9
  ['#818CF8', '#4338CA'] as const, // 10
  ['#A78BFA', '#6D28D9'] as const, // 11
  ['#E879F9', '#A855F7'] as const, // 12
] as const;

type Props = {
  student: StudentRow;
  onAddRemark: () => void;
  accentIndex?: number;
};

function usePressScale(to = 0.96) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const onPressIn = () => { scale.value = withSpring(to, { damping: 14, stiffness: 300 }); };
  const onPressOut = () => { scale.value = withSpring(1.0, { damping: 14, stiffness: 300 }); };
  return { style, onPressIn, onPressOut };
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${Math.min(value, 100)}%`, backgroundColor: color }]} />
    </View>
  );
}

export default function StudentListCard({ student, onAddRemark, accentIndex }: Props) {
  const press = usePressScale();
  const perf = student.performance || {};
  const classLabel = formatClassBadge(student);
  const lastLogin = formatLastLogin(student.lastLogin);
  const overall = perf.overallProgress ?? 0;
  const learning = perf.learningProgress ?? 0;
  const hasOverall = overall > 0;
  const overallTier = progressTier(overall);
  const overallColors = progressColors(overallTier);
  const learningTier = progressTier(learning);
  const learningColors = progressColors(learningTier);
  const gradeKey =
    student.assignedClass?.classNumber ||
    student.classNumber ||
    classLabel;
  const resolvedAccent =
    accentIndex != null
      ? accentIndex
      : classGradeAccentIndex(gradeKey);
  const accent = CARD_ACCENTS[Math.abs(resolvedAccent) % CARD_ACCENTS.length];
  const accentColor = accent[1];

  return (
    <Animated.View
      entering={FadeInDown.duration(350)}
      style={[styles.card, { borderColor: accentColor }]}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={[styles.name, { color: accentColor }]}>{student.name}</Text>
          <Text style={styles.email}>{student.email}</Text>
        </View>
        <View style={[styles.statusBadge, student.isActive !== false ? styles.activeBadge : styles.inactiveBadge]}>
          <Text style={[styles.statusText, student.isActive !== false ? styles.activeText : styles.inactiveText]}>
            {student.isActive !== false ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      <View style={styles.metaGrid}>
        <View style={styles.metaItem}>
          <Ionicons name="call-outline" size={14} color={TEACHER.textMuted} />
          <Text style={styles.metaLabel}>Contact</Text>
          <Text style={styles.metaValue}>{student.phone?.trim() || 'No Phone'}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="school-outline" size={14} color={TEACHER.textMuted} />
          <Text style={styles.metaLabel}>Class</Text>
          <View style={styles.classBadge}>
            <Text style={styles.classBadgeText}>{classLabel}</Text>
          </View>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={14} color={TEACHER.textMuted} />
          <Text style={styles.metaLabel}>Last Login</Text>
          {lastLogin ? (
            <>
              <Text style={styles.metaValue}>{lastLogin.date}</Text>
              <Text style={styles.metaSub}>{lastLogin.time}</Text>
            </>
          ) : (
            <Text style={styles.metaMuted}>Never</Text>
          )}
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="stats-chart-outline" size={14} color={TEACHER.textMuted} />
          <Text style={styles.metaLabel}>Average</Text>
          {(perf.totalExams ?? 0) > 0 ? (
            <>
              <Text style={styles.metaValue}>{(perf.averageMarks ?? 0).toFixed(1)}</Text>
            </>
          ) : (
            <Text style={styles.metaMuted}>-</Text>
          )}
        </View>
      </View>

      <View style={styles.progressSection}>
        <View style={styles.progressTitleRow}>
          <View style={styles.progressTitleLeft}>
            <Text style={styles.sectionTitle}>Overall Progress</Text>
          </View>
          <View style={styles.progressTitleRight}>
            {(perf.totalExams ?? 0) > 0 ? (
              <Text style={styles.progressNote}>
                {perf.totalExams} Exam{(perf.totalExams ?? 0) !== 1 ? 's' : ''} Completed
              </Text>
            ) : (
              <Text style={styles.progressNote}>No Exams Completed</Text>
            )}
          </View>
        </View>
        {hasOverall ? (
          <>
            <View style={styles.progressHeader}>
              <View style={[styles.pill, { backgroundColor: overallColors.bg + '33' }]}>
                <Text style={[styles.pillText, { color: overallColors.text }]}>
                  {overall.toFixed(1)}%
                </Text>
              </View>
            </View>
            <ProgressBar value={overall} color={overallColors.bar} />
            {learning > 0 ? (
              <View style={styles.learningBlock}>
                <View style={styles.progressHeader}>
                  <Text style={styles.learningLabel}>Learning Progress</Text>
                  <View style={[styles.pill, { backgroundColor: learningColors.bg + '33' }]}>
                    <Text style={[styles.pillText, { color: learningColors.text }]}>
                      {learning.toFixed(0)}%
                    </Text>
                  </View>
                </View>
                <ProgressBar value={learning} color={learningColors.bar} />
              </View>
            ) : null}
          </>
        ) : (
          <Text style={styles.metaMuted}>No Progress Data</Text>
        )}
      </View>

      <Pressable
        onPress={onAddRemark}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        style={styles.remarkBtnWrap}
        accessibilityRole="button"
        accessibilityLabel={`Add remark for ${student.name}`}
      >
        <Animated.View style={press.style}>
          <LinearGradient
            colors={['#9333ea', '#db2777']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.remarkBtn}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={18} color="#fff" />
            <Text style={styles.remarkBtnText}>Add Remark</Text>
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 10,
    backgroundColor: TEACHER.cardBg,
    borderRadius: TEACHER_RADIUS.lg,
    borderWidth: 4,
    borderColor: TEACHER.primary,
    padding: 10,
    gap: 8,
    overflow: 'visible',
    ...TEACHER.shadow.sm,
  },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  headerText: { flex: 1 },
  name: { fontSize: 16, fontWeight: '800', color: TEACHER.text },
  email: { fontSize: 13, color: TEACHER.textMuted, marginTop: 1 },
  statusBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1 },
  activeBadge: { backgroundColor: 'rgba(0,214,143,0.15)', borderColor: 'rgba(0,214,143,0.3)' },
  inactiveBadge: { backgroundColor: 'rgba(255,77,106,0.15)', borderColor: 'rgba(255,77,106,0.3)' },
  statusText: { fontSize: 11, fontWeight: '700' },
  activeText: { color: TEACHER.success },
  inactiveText: { color: TEACHER.danger },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  metaItem: { width: '47%', gap: 1 },
  metaLabel: { fontSize: 11, fontWeight: '700', color: TEACHER.textMuted, marginTop: 1 },
  metaValue: { fontSize: 14, fontWeight: '600', color: TEACHER.text },
  metaSub: { fontSize: 11, color: TEACHER.textMuted },
  metaMuted: { fontSize: 13, color: TEACHER.textMuted },
  classBadge: {
    alignSelf: 'flex-start',
    backgroundColor: TEACHER.surfaceHover,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 1,
    marginTop: 1,
  },
  classBadgeText: { fontSize: 12, fontWeight: '700', color: TEACHER.primaryDark },
  progressSection: {
    borderTopWidth: 1,
    borderTopColor: TEACHER.surfaceBorder,
    paddingTop: 6,
    gap: 4,
    overflow: 'visible',
  },
  progressTitleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  progressTitleLeft: {
    width: '47%',
  },
  progressTitleRight: {
    width: '47%',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: TEACHER.textMuted,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
  },
  pill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, flexShrink: 0 },
  pillText: { fontSize: 12, fontWeight: '700' },
  progressTrack: {
    height: 6,
    backgroundColor: TEACHER.surfaceElevated,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 999 },
  progressNote: {
    fontSize: 11,
    color: TEACHER.textMuted,
    fontWeight: '600',
  },
  learningBlock: { marginTop: 2, gap: 4 },
  learningLabel: { fontSize: 12, color: TEACHER.textMuted, flex: 1 },
  remarkBtnWrap: { borderRadius: 10, overflow: 'hidden' },
  remarkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  remarkBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
