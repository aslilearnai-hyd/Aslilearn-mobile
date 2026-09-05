import React, { memo, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { GlassPanel } from '../../../../src/components/ui';
import { STUDENT, STUDENT_RADIUS, STUDENT_TYPO, SUBJECT_COLORS } from '../../../../src/theme/student';

interface SubjectProgress {
  id: string;
  name: string;
  progress: number;
  currentTopic?: string;
}

function getSubjectIcon(name: string, index: number): {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
} {
  const n = (name || '').toLowerCase();
  const color = SUBJECT_COLORS[index % SUBJECT_COLORS.length];
  if (n.includes('math')) return { icon: 'calculator-outline', color };
  if (n.includes('physics')) return { icon: 'planet-outline', color };
  if (n.includes('chem')) return { icon: 'flask-outline', color };
  if (n.includes('bio') || n.includes('science')) return { icon: 'leaf-outline', color };
  if (n.includes('english')) return { icon: 'book-outline', color };
  if (n.includes('social')) return { icon: 'globe-outline', color };
  return { icon: 'book-outline', color };
}

function AnimatedProgressBar({ progress, delay = 0 }: { progress: number; delay?: number }) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withDelay(
      delay,
      withTiming(Math.min(100, progress), { duration: 900, easing: Easing.out(Easing.quad) })
    );
  }, [progress, delay, width]);

  const animStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }));

  return (
    <View style={styles.progressBar}>
      <Animated.View style={[styles.progressFillWrap, animStyle]}>
        <LinearGradient
          colors={[STUDENT.primary, STUDENT.primaryDark]}
          style={styles.progressFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />
      </Animated.View>
    </View>
  );
}

interface LearningProgressModuleProps {
  overallProgress: number;
  subjectProgress: SubjectProgress[];
  dark?: boolean;
}

function LearningProgressModuleComponent({
  overallProgress,
  subjectProgress,
  dark,
}: LearningProgressModuleProps) {
  const section = dark ? styles.sectionCardDark : styles.sectionCard;

  return (
    <GlassPanel style={section} radius={STUDENT_RADIUS.card}>
      <View style={styles.sectionHeader}>
        <Text style={dark ? styles.sectionTitleDark : styles.sectionTitle}>
          Your Learning Progress
        </Text>
        <LinearGradient colors={[STUDENT.warning, STUDENT.primary]} style={styles.badge}>
          <Text style={styles.badgeText}>Asli Learn</Text>
        </LinearGradient>
      </View>

      <View style={styles.progressOverview}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Overall Progress</Text>
          <Text style={styles.progressPercentage}>{overallProgress}%</Text>
        </View>
        <AnimatedProgressBar progress={overallProgress} />
      </View>

      <View style={styles.subjectProgressList}>
        {subjectProgress.length > 0 ? (
          subjectProgress.map((subject, index) => {
            const iconMeta = getSubjectIcon(subject.name, index);
            return (
              <Animated.View
                key={subject.id}
                entering={FadeInDown.duration(320).delay(index * 60)}
                style={styles.subjectCard}
              >
                <View style={styles.subjectRow}>
                  <View style={[styles.subjectIcon, { backgroundColor: `${iconMeta.color}18` }]}>
                    <Ionicons name={iconMeta.icon} size={18} color={iconMeta.color} />
                  </View>
                  <View style={styles.subjectDetails}>
                    <Text style={styles.subjectName}>{subject.name}</Text>
                    <Text style={styles.subjectTopic} numberOfLines={1}>
                      {subject.currentTopic || `${subject.name} - Recent Exams`}
                    </Text>
                  </View>
                  <Text style={styles.subjectProgressPercent}>{subject.progress}%</Text>
                </View>
                <AnimatedProgressBar progress={subject.progress} delay={80 * index} />
              </Animated.View>
            );
          })
        ) : (
          <Text style={styles.noProgressText}>Complete Exams To See Your Subject-Wise Progress</Text>
        )}
      </View>
    </GlassPanel>
  );
}

const styles = StyleSheet.create({
  sectionCard: {
    // Frosted over the app background artwork instead of a solid fill.
    backgroundColor: 'transparent',
    borderRadius: STUDENT_RADIUS.card,
    padding: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: STUDENT.surfaceBorder,
  },
  sectionCardDark: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: STUDENT_RADIUS.card,
    padding: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.12)',
  },
  sectionTitleDark: {
    ...STUDENT_TYPO.section,
    fontSize: 17,
    color: STUDENT.surfaceHover,
  },
  sectionTitle: {
    ...STUDENT_TYPO.section,
    fontSize: 17,
    color: STUDENT.primaryDark,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: STUDENT_RADIUS.full,
  },
  badgeText: {
    color: STUDENT.textOnPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
  progressOverview: {
    marginBottom: 14,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: STUDENT.textSecondary,
  },
  progressPercentage: {
    fontSize: 13,
    fontWeight: '800',
    color: STUDENT.accent,
  },
  progressBar: {
    height: 10,
    backgroundColor: STUDENT.surfaceBorder,
    borderRadius: STUDENT_RADIUS.full,
    overflow: 'hidden',
  },
  progressFillWrap: {
    height: '100%',
  },
  progressFill: {
    height: '100%',
    borderRadius: STUDENT_RADIUS.full,
  },
  subjectProgressList: {
    gap: 10,
    marginBottom: 12,
  },
  subjectCard: {
    borderRadius: STUDENT_RADIUS.inner,
    borderWidth: 1,
    borderColor: STUDENT.surfaceBorder,
    backgroundColor: 'rgba(255,255,255,0.42)',
    padding: 12,
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  subjectIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subjectDetails: {
    flex: 1,
    minWidth: 0,
  },
  subjectName: {
    fontSize: 14,
    fontWeight: '700',
    color: STUDENT.text,
    textTransform: 'capitalize',
  },
  subjectTopic: {
    fontSize: 11,
    color: STUDENT.textMuted,
    marginTop: 2,
  },
  subjectProgressPercent: {
    fontSize: 16,
    fontWeight: '800',
    color: STUDENT.text,
  },
  noProgressText: {
    textAlign: 'center',
    color: STUDENT.textMuted,
    paddingVertical: 14,
    fontSize: 12,
  },
});

export default memo(LearningProgressModuleComponent);
