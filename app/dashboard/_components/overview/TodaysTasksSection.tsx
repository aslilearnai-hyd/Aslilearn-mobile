import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  getContentTypeLabel,
  getSubjectName,
  getTaskTimeLabel,
} from '../../../../src/lib/todays-tasks-helpers';
import {
  getVideoDisplayTitle,
  isVideoContentType,
} from '../../../../src/lib/video-chapter-schedule';
import { STUDENT, STUDENT_TYPO, SUBJECT_COLORS, STUDENT_SKY } from '../../../../src/theme/student';

type Props = {
  incompleteQuizzes: any[];
  incompleteContent: any[];
  completedScheduleIds: Set<string>;
  isLoading?: boolean;
  onToggleComplete: (item: any, isQuiz: boolean) => void;
  onOpenItem: (item: any, isQuiz: boolean) => void;
};

function getSubjectColor(index: number): string {
  return SUBJECT_COLORS[index % SUBJECT_COLORS.length];
}

function TodaysTasksSectionComponent({
  incompleteQuizzes,
  incompleteContent,
  completedScheduleIds,
  isLoading,
  onToggleComplete,
  onOpenItem,
}: Props) {
  const dateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  const allItems = [
    ...incompleteQuizzes.map((q, i) => ({ item: q, isQuiz: true, index: i })),
    ...incompleteContent.map((c, i) => ({
      item: c,
      isQuiz: false,
      index: incompleteQuizzes.length + i,
    })),
  ];

  return (
    <LinearGradient
      colors={[...STUDENT_SKY.gradient]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.skyShell}
    >
      <View style={styles.skyInner}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <LinearGradient
            colors={[STUDENT_SKY.accent, STUDENT_SKY.accentDark]}
            style={styles.headerIcon}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color={STUDENT.textOnPrimary} />
          </LinearGradient>
          <Text style={styles.headerTitle}>TODAY&apos;S TASKS</Text>
        </View>
        <Text style={styles.headerDate}>{dateLabel}</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={STUDENT_SKY.accent} />
          <Text style={styles.loadingText}>Loading Schedule...</Text>
        </View>
      ) : incompleteQuizzes.length === 0 && incompleteContent.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="checkmark-circle" size={44} color={STUDENT_SKY.accent} />
          <Text style={styles.emptyTitle}>All Caught Up!</Text>
          <Text style={styles.emptySub}>No Pending Content Or Quizzes</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {allItems.map(({ item, isQuiz, index }) => {
            const id = String(item._id || item.id);
            const isCompleted = completedScheduleIds.has(id);
            const subjectColor = getSubjectColor(index);
            const timeLabel = getTaskTimeLabel(item, isQuiz);

            if (isQuiz) {
              return (
                <Animated.View key={`quiz-${id}`} entering={FadeInDown.duration(320).delay(index * 60)}>
                  <TouchableOpacity
                    style={[
                      styles.row,
                      { borderLeftColor: subjectColor },
                      isCompleted && styles.rowDone,
                    ]}
                    onPress={() => onOpenItem(item, true)}
                    activeOpacity={0.85}
                  >
                    <TouchableOpacity
                      style={styles.checkWrap}
                      onPress={(e) => {
                        e.stopPropagation?.();
                        onToggleComplete(item, true);
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      {isCompleted ? (
                        <View style={styles.checkDone}>
                          <Ionicons name="checkmark" size={14} color={STUDENT.textOnPrimary} />
                        </View>
                      ) : (
                        <View style={styles.checkEmpty} />
                      )}
                    </TouchableOpacity>
                    <View style={styles.rowBody}>
                      <Text style={[styles.rowTitle, isCompleted && styles.rowTitleDone]} numberOfLines={2}>
                        Complete {item.title || 'Quiz'}
                      </Text>
                      <View style={styles.metaRow}>
                        <Text style={styles.metaText} numberOfLines={1}>
                          {typeof item.subject === 'string'
                            ? item.subject
                            : item.subject?.name || 'Unknown Subject'}
                        </Text>
                        <View style={styles.typePill}>
                          <Text style={styles.typePillText}>Quiz</Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.timePill}>
                      <Text style={styles.timePillText}>{isCompleted ? 'Done' : timeLabel}</Text>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              );
            }

            const isVideo = isVideoContentType(item.type);
            const isHomework = String(item.type || '').toLowerCase() === 'homework';
            const subjectName = getSubjectName(item);
            const deadline = item.deadline ? new Date(item.deadline) : null;
            const isOverdue = deadline && deadline < new Date() && !isCompleted;
            const title = isVideo
              ? getVideoDisplayTitle(item)
              : `${getContentTypeLabel(item.type || 'Material')} ${item.title || 'Content'}`;

            return (
              <Animated.View key={`content-${id}`} entering={FadeInDown.duration(320).delay(index * 60)}>
                <TouchableOpacity
                  style={[
                    styles.row,
                    { borderLeftColor: subjectColor },
                    isCompleted && styles.rowDone,
                    isOverdue && styles.rowOverdue,
                  ]}
                  onPress={() => onOpenItem(item, false)}
                  activeOpacity={0.85}
                >
                  <TouchableOpacity
                    style={styles.checkWrap}
                    onPress={(e) => {
                      e.stopPropagation?.();
                      if (isVideo && !isCompleted) {
                        onOpenItem(item, false);
                        return;
                      }
                      onToggleComplete(item, false);
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    {isCompleted ? (
                      <View style={styles.checkDone}>
                        <Ionicons name="checkmark" size={14} color={STUDENT.textOnPrimary} />
                      </View>
                    ) : isVideo ? (
                      <View style={styles.playCircle}>
                        <Ionicons name="play" size={12} color={STUDENT_SKY.accent} />
                      </View>
                    ) : (
                      <View style={styles.checkEmpty} />
                    )}
                  </TouchableOpacity>
                  <View style={styles.rowBody}>
                    <Text style={[styles.rowTitle, isCompleted && styles.rowTitleDone]} numberOfLines={2}>
                      {title}
                    </Text>
                    <View style={styles.metaRow}>
                      <Text style={styles.metaText} numberOfLines={1}>
                        {subjectName}
                      </Text>
                      {item.type ? (
                        <View style={styles.typePill}>
                          <Text style={styles.typePillText}>{item.type}</Text>
                        </View>
                      ) : null}
                      {isHomework && deadline ? (
                        <View style={[styles.duePill, isOverdue && styles.duePillOverdue]}>
                          <Text style={[styles.dueText, isOverdue && styles.dueTextOverdue]}>
                            Due: {deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                  <View style={styles.timePill}>
                    <Text style={styles.timePillText}>{isCompleted ? 'Done' : timeLabel}</Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  skyShell: {
    borderRadius: 28,
    padding: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: STUDENT_SKY.shellBorder,
    ...STUDENT.shadow.md,
  },
  skyInner: {
    backgroundColor: STUDENT_SKY.innerBg,
    borderRadius: 20,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: STUDENT_SKY.innerBorder,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...STUDENT_TYPO.caption,
    fontWeight: '800',
    color: STUDENT_SKY.title,
    letterSpacing: 0.3,
  },
  headerDate: { fontSize: 12, color: STUDENT_SKY.accentDark, fontWeight: '600' },
  center: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  loadingText: { fontSize: 13, color: STUDENT.textMuted },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: STUDENT_SKY.title },
  emptySub: { fontSize: 13, color: STUDENT.textMuted },
  list: { gap: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: STUDENT_SKY.divider,
    borderLeftWidth: 3,
    paddingLeft: 9,
  },
  rowDone: { backgroundColor: STUDENT_SKY.chipBg },
  rowOverdue: { backgroundColor: `${STUDENT.danger}0f` },
  checkWrap: { padding: 2 },
  checkEmpty: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: STUDENT_SKY.divider,
  },
  checkDone: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: STUDENT_SKY.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: STUDENT_SKY.accent,
    backgroundColor: STUDENT_SKY.chipBg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 2,
  },
  rowBody: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 14, fontWeight: '700', color: STUDENT.text },
  rowTitleDone: { textDecorationLine: 'line-through', color: STUDENT.textMuted },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 4 },
  metaText: { fontSize: 11, color: STUDENT.textMuted, maxWidth: '45%' },
  typePill: {
    backgroundColor: STUDENT_SKY.chipBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typePillText: { fontSize: 10, fontWeight: '600', color: STUDENT_SKY.accentDark },
  duePill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  duePillOverdue: { backgroundColor: `${STUDENT.danger}18` },
  dueText: { fontSize: 10, fontWeight: '600', color: STUDENT.danger },
  dueTextOverdue: { color: STUDENT.danger },
  timePill: {
    borderWidth: 1,
    borderColor: STUDENT_SKY.cardBorder,
    backgroundColor: STUDENT_SKY.cardBg,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  timePillText: { fontSize: 11, fontWeight: '600', color: STUDENT_SKY.accentDark },
});

export default memo(TodaysTasksSectionComponent);
