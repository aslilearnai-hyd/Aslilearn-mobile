import { View, Text, StyleSheet, TouchableOpacity, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ExamDayRole } from '../../lib/exam-calendar-entries';
import {
  formatExamDateRange,
  getExamCardGradientScheme,
  getExamClassLabels,
  getExamDayRoleLabelForCard,
  getExamStatus,
  getHydratedQuestionCount,
  getMaxAttemptsForExam,
  type StudentExamLike,
} from '../../lib/student-exam-display';
import { STUDENT, STUDENT_RADIUS } from '../../theme/student';
import { GLASS_ROW } from '../../theme/glass';
import GlassPanel from '../ui/GlassPanel';

type Props = {
  exam: StudentExamLike;
  examDayRole?: ExamDayRole;
  usedAttempts?: number;
  studentClassNumber?: string | number | null;
  hasAttempted?: boolean;
  focused?: boolean;
  colorIndex?: number;
  variant?: 'available' | 'upcoming';
  style?: ViewStyle;
  onViewInExams?: () => void;
  onStartPress?: () => void;
};

type StatItem = {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
};

export default function StudentExamPreviewCard({
  exam,
  examDayRole,
  usedAttempts = 0,
  studentClassNumber,
  hasAttempted = false,
  focused = false,
  colorIndex = 0,
  variant = 'available',
  style,
  onViewInExams,
  onStartPress,
}: Props) {
  const status = variant === 'upcoming' ? { status: 'upcoming' as const } : getExamStatus(exam);
  const scheme = getExamCardGradientScheme(colorIndex);
  const accent = scheme.gradient[0] || STUDENT.primary;
  const classLabels = getExamClassLabels(exam, studentClassNumber);
  const maxAttempts = getMaxAttemptsForExam(exam);
  const questionCount = getHydratedQuestionCount(exam);
  const dateRange = formatExamDateRange(exam);
  const dayRoleLabel = !hasAttempted ? getExamDayRoleLabelForCard(examDayRole) : null;
  const attemptsExhausted = usedAttempts >= maxAttempts;
  const canResume = Boolean(exam.hasInProgressDraft) && exam.canResumeExam !== false && !exam.forceSubmitDraft;
  const forceSubmit = Boolean(exam.forceSubmitDraft || (exam.hasInProgressDraft && exam.canResumeExam === false));
  const canStart =
    variant === 'available' &&
    ((status.status === 'active' && !attemptsExhausted) || forceSubmit) &&
    onStartPress;
  const isUpcoming = variant === 'upcoming' || status.status === 'upcoming';

  const stats: StatItem[] = [];
  if (exam.duration) {
    stats.push({ icon: 'time-outline', text: `${exam.duration} minutes` });
  }
  stats.push({
    icon: 'book-outline',
    text: `${questionCount} questions · ${exam.totalMarks || 0} marks`,
  });
  if (variant === 'upcoming' && exam.startDate && exam.endDate) {
    const start = new Date(exam.startDate);
    const end = new Date(exam.endDate);
    if (!Number.isNaN(start.getTime())) {
      stats.push({ icon: 'calendar-outline', text: `Starts ${start.toLocaleDateString()}` });
    }
    if (!Number.isNaN(end.getTime())) {
      stats.push({ icon: 'calendar-outline', text: `Ends ${end.toLocaleDateString()}` });
    }
  } else if (dateRange && !exam.hideAvailabilityDates) {
    stats.push({ icon: 'calendar-outline', text: dateRange });
  }
  stats.push({ icon: 'locate-outline', text: `Attempts ${usedAttempts} / ${maxAttempts}` });

  return (
    <GlassPanel
      tone="strong"
      elevated
      radius={18}
      style={[
        styles.card,
        focused && styles.cardFocused,
        { borderColor: accent, borderWidth: 1.5 },
        style,
      ]}
      contentStyle={styles.cardInner}
    >
      <Text style={styles.title}>{exam.title || 'Exam'}</Text>
      {exam.description ? (
        <Text style={styles.description} numberOfLines={2}>
          {exam.description}
        </Text>
      ) : null}

      <View style={styles.badgeRow}>
        <View style={[styles.typeBadge, { backgroundColor: `${accent}22`, borderColor: `${accent}44` }]}>
          <Text style={[styles.typeBadgeText, { color: accent }]}>
            {(exam.examType || 'practice').toUpperCase()}
          </Text>
        </View>
        {classLabels.map((cl) => (
          <View key={cl} style={styles.classPill}>
            <Text style={styles.classPillText}>Class {cl}</Text>
          </View>
        ))}
        {hasAttempted ? (
          <View style={styles.attemptedBadge}>
            <Ionicons name="checkmark-circle" size={12} color={STUDENT.success} />
            <Text style={styles.attemptedBadgeText}>
              {attemptsExhausted ? 'Completed' : 'Attempted'}
            </Text>
          </View>
        ) : dayRoleLabel ? (
          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>{dayRoleLabel}</Text>
          </View>
        ) : status.status === 'ended' ? (
          <View style={[styles.statusPill, styles.statusEnded]}>
            <Text style={[styles.statusPillText, { color: '#fff' }]}>Ended</Text>
          </View>
        ) : isUpcoming ? (
          <View style={[styles.statusPill, styles.statusUpcoming]}>
            <Text style={[styles.statusPillText, { color: '#fff' }]}>Upcoming</Text>
          </View>
        ) : (
          <View style={[styles.statusPill, styles.statusActive]}>
            <Text style={[styles.statusPillText, { color: '#fff' }]}>Active</Text>
          </View>
        )}
      </View>

      <View style={styles.statsList}>
        {stats.map((stat, index) => (
          <View key={`${stat.icon}-${index}`} style={styles.statRow}>
            <Ionicons name={stat.icon} size={14} color={STUDENT.textMuted} />
            <Text style={styles.statText}>{stat.text}</Text>
          </View>
        ))}
      </View>

      {canStart ? (
        <TouchableOpacity
          style={[styles.startButton, { backgroundColor: accent }]}
          onPress={onStartPress}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={
            forceSubmit ? 'Submit saved exam' : canResume ? 'Resume exam' : 'Start exam'
          }
        >
          <Ionicons
            name={forceSubmit ? 'cloud-upload' : canResume ? 'play-skip-forward' : 'play'}
            size={16}
            color="#fff"
          />
          <Text style={styles.startButtonText}>
            {forceSubmit ? 'Submit Saved Exam' : canResume ? 'Resume Exam' : 'Start Exam'}
          </Text>
        </TouchableOpacity>
      ) : variant === 'upcoming' ? (
        <View style={styles.upcomingButton}>
          <Ionicons name="calendar-outline" size={16} color={STUDENT.textMuted} />
          <Text style={styles.upcomingButtonText}>Not Yet Available</Text>
        </View>
      ) : null}
      {hasAttempted && onViewInExams ? (
        <TouchableOpacity
          style={styles.reviewRow}
          onPress={onViewInExams}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="View in attempted exams"
        >
          <Ionicons name="eye-outline" size={16} color={STUDENT.primaryDark} />
          <Text style={styles.reviewText}>View In Attempted Exams</Text>
        </TouchableOpacity>
      ) : null}
    </GlassPanel>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    overflow: 'hidden',
  },
  cardInner: {
    padding: 16,
  },
  cardFocused: {
    borderWidth: 2,
    borderColor: '#fbbf24',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: STUDENT.text,
    lineHeight: 24,
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: STUDENT.textSecondary,
    marginBottom: 8,
    lineHeight: 18,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: 12,
  },
  typeBadge: {
    borderRadius: STUDENT_RADIUS.md,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  classPill: {
    backgroundColor: GLASS_ROW.fillStrong,
    borderRadius: STUDENT_RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_ROW.border,
  },
  classPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: STUDENT.text,
  },
  statusPill: {
    borderRadius: STUDENT_RADIUS.md,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: GLASS_ROW.fill,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: STUDENT.textSecondary,
    letterSpacing: 0.2,
  },
  statusActive: {
    backgroundColor: '#0d9488',
  },
  statusEnded: {
    backgroundColor: '#dc2626',
  },
  statusUpcoming: {
    backgroundColor: '#ca8a04',
  },
  attemptedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: STUDENT_RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(5,150,105,0.14)',
  },
  attemptedBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: STUDENT.success,
  },
  statsList: {
    gap: 8,
    marginBottom: 14,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statText: {
    fontSize: 13,
    color: STUDENT.textSecondary,
    fontWeight: '600',
    flexShrink: 1,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: STUDENT_RADIUS.md,
    paddingVertical: 12,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  upcomingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: GLASS_ROW.fill,
    borderRadius: STUDENT_RADIUS.md,
    paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_ROW.border,
  },
  upcomingButtonText: {
    color: STUDENT.textMuted,
    fontSize: 15,
    fontWeight: '700',
  },
  reviewRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reviewText: {
    fontSize: 12,
    fontWeight: '700',
    color: STUDENT.primaryDark,
  },
});
