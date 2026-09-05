import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { getSubjectName } from '../../../../src/lib/todays-tasks-helpers';
import GlassCard from '../../../../src/components/student/GlassCard';
import { STUDENT, STUDENT_RADIUS, SUBJECT_COLORS } from '../../../../src/theme/student';

type Props = {
  allContent: any[];
  homeworkSubmissions: any[];
  isLoading?: boolean;
};

function MyHomeworkSectionComponent({ allContent, homeworkSubmissions, isLoading }: Props) {
  const assignedHomework = useMemo(() => {
    return allContent
      .filter((c) => String(c.type || '').toLowerCase() === 'homework')
      .sort((a, b) => {
        const aTime = a.deadline ? new Date(a.deadline).getTime() : 0;
        const bTime = b.deadline ? new Date(b.deadline).getTime() : 0;
        return aTime - bTime;
      });
  }, [allContent]);

  const submissionMap = useMemo(() => {
    const map = new Map<string, any>();
    homeworkSubmissions.forEach((sub) => {
      const homeworkId =
        typeof sub.homeworkId === 'object' ? sub.homeworkId?._id : sub.homeworkId || sub.homework?._id;
      if (homeworkId) map.set(String(homeworkId), sub);
    });
    return map;
  }, [homeworkSubmissions]);

  return (
    <GlassCard variant="glass" padding={14}>
      <View style={styles.header}>
        <LinearGradient colors={[STUDENT.warning, `${STUDENT.warning}cc`]} style={styles.icon}>
          <Ionicons name="document-text" size={20} color={STUDENT.textOnPrimary} />
        </LinearGradient>
        <Text style={styles.title}>My Homework</Text>
      </View>

      {isLoading && assignedHomework.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={STUDENT.warning} />
          <Text style={styles.loadingText}>Loading Homework...</Text>
        </View>
      ) : assignedHomework.length === 0 ? (
        <Text style={styles.empty}>No Assigned Homework Right Now.</Text>
      ) : (
        <>
          <Text style={styles.sectionLabel}>Assigned Homework ({assignedHomework.length})</Text>
          {assignedHomework.slice(0, 10).map((homework, index) => {
            const id = String(homework._id || homework.id);
            const submitted = submissionMap.has(id);
            const isOverdue =
              homework.deadline && new Date(homework.deadline) < new Date() && !submitted;
            const subjectColor = SUBJECT_COLORS[index % SUBJECT_COLORS.length];
            const badgeBg = submitted
              ? styles.statusSubmitted
              : isOverdue
                ? styles.statusOverdue
                : styles.statusPending;
            const badgeText = submitted
              ? styles.statusTextSubmitted
              : isOverdue
                ? styles.statusTextOverdue
                : styles.statusTextPending;

            return (
              <Animated.View key={id} entering={FadeInDown.duration(320).delay(index * 60)}>
                <View style={[styles.row, { borderLeftColor: subjectColor }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.hwTitle} numberOfLines={2}>
                      {homework.title || 'Untitled Homework'}
                    </Text>
                    <Text style={styles.hwMeta} numberOfLines={1}>
                      {getSubjectName(homework)}
                      {homework.deadline
                        ? ` · Due ${new Date(homework.deadline).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}`
                        : ''}
                    </Text>
                  </View>
                  <View style={styles.actions}>
                    <View style={[styles.statusBadge, badgeBg]}>
                      <Text style={[styles.statusText, badgeText]}>
                        {submitted ? 'Submitted' : isOverdue ? 'Overdue' : 'Pending'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.submitBtn}
                      onPress={() => router.push('/assignments')}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.submitBtnText}>{submitted ? 'Update' : 'Submit'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Animated.View>
            );
          })}
        </>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  icon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: STUDENT.text },
  center: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  loadingText: { fontSize: 13, color: STUDENT.textMuted },
  empty: { fontSize: 13, color: STUDENT.textMuted, textAlign: 'center', paddingVertical: 12 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: STUDENT.textSecondary, marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: STUDENT_RADIUS.inner,
    borderWidth: 1,
    borderColor: STUDENT.surfaceBorder,
    borderLeftWidth: 3,
    backgroundColor: 'rgba(255,255,255,0.42)',
    padding: 10,
    marginBottom: 8,
  },
  hwTitle: { fontSize: 14, fontWeight: '700', color: STUDENT.text },
  hwMeta: { fontSize: 11, color: STUDENT.textMuted, marginTop: 2 },
  actions: { alignItems: 'flex-end', gap: 6 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusSubmitted: { backgroundColor: `${STUDENT.primary}18` },
  statusPending: { backgroundColor: `${STUDENT.warning}18` },
  statusOverdue: { backgroundColor: `${STUDENT.danger}18` },
  statusText: { fontSize: 10, fontWeight: '800' },
  statusTextSubmitted: { color: STUDENT.primaryDark },
  statusTextPending: { color: STUDENT.warning },
  statusTextOverdue: { color: STUDENT.danger },
  submitBtn: {
    borderWidth: 1,
    borderColor: STUDENT.surfaceBorder,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: STUDENT.surface,
  },
  submitBtnText: { fontSize: 11, fontWeight: '700', color: STUDENT.textSecondary },
});

export default memo(MyHomeworkSectionComponent);
