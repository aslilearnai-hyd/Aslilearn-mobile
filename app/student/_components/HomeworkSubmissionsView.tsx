import { storageGetItem } from '../../../src/lib/safe-storage';
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { API_BASE_URL } from '../../../src/lib/api-config';
import { useBackNavigation } from '../../../src/hooks/useBackNavigation';
import { EmptyState } from '../../../src/components/ui';
import StudentScreenHeader from '../../../src/components/student/StudentScreenHeader';
import GlassCard from '../../../src/components/student/GlassCard';
import {
  STUDENT,
  STUDENT_ANIMATION,
  STUDENT_RADIUS,
  STUDENT_SPACING,
  STUDENT_TYPO,
  SUBJECT_COLORS,
} from '../../../src/theme/student';

interface HomeworkSubmission {
  _id: string;
  homework: {
    _id: string;
    title: string;
    subject?: {
      _id: string;
      name: string;
    } | string;
    deadline?: string;
  };
  submissionLink: string;
  description?: string;
  status: 'pending' | 'reviewed' | 'graded';
  grade?: number;
  feedback?: string;
  submittedAt: string;
}

export default function StudentHomeworkSubmissionsView() {
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useBackNavigation('/dashboard', false);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      setIsLoading(true);
      const token = await storageGetItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/student/homework-submissions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSubmissions(data.data || data || []);
      }
    } catch (error) {
      console.error('Failed to fetch submissions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StudentScreenHeader title="My Submissions" onBack={() => router.back()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={STUDENT.primary} />
          <Text style={styles.loadingText}>Loading Submissions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StudentScreenHeader title="My Submissions" onBack={() => router.back()} />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {submissions.length === 0 ? (
          <EmptyState
            icon="document-text-outline"
            title="No Submissions Yet"
            subtitle="Your Homework Submissions Will Appear Here"
          />
        ) : (
          submissions.map((submission, index) => {
            const subjectName = typeof submission.homework.subject === 'object'
              ? submission.homework.subject?.name
              : submission.homework.subject || 'General';
            const subjectColor = SUBJECT_COLORS[index % SUBJECT_COLORS.length];

            return (
              <Animated.View
                key={submission._id}
                entering={FadeInDown.duration(STUDENT_ANIMATION.normal).delay(index * 60)}
              >
                <GlassCard variant="glass" style={styles.submissionCard}>
                  <View style={[styles.subjectStripe, { backgroundColor: subjectColor }]} />
                  <View style={styles.submissionHeader}>
                    <View style={styles.homeworkInfo}>
                      <Text style={styles.homeworkTitle}>{submission.homework.title}</Text>
                      <Text style={[styles.homeworkSubject, { color: subjectColor }]}>{subjectName}</Text>
                    </View>
                    <View style={[styles.statusBadge, styles[`statusBadge${submission.status}`]]}>
                      <Text style={[styles.statusText, styles[`statusText${submission.status}`]]}>
                        {submission.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.submissionDetails}>
                    <TouchableOpacity
                      style={styles.linkButton}
                      onPress={() => Linking.openURL(submission.submissionLink)}
                    >
                      <Ionicons name="link" size={16} color={STUDENT.accent} />
                      <Text style={styles.linkText}>View Submission</Text>
                    </TouchableOpacity>
                    {submission.description && (
                      <Text style={styles.description}>{submission.description}</Text>
                    )}
                  </View>

                  {submission.grade !== undefined && (
                    <View style={styles.gradeContainer}>
                      <Text style={styles.gradeLabel}>Grade:</Text>
                      <Text style={styles.gradeValue}>{submission.grade}/100</Text>
                    </View>
                  )}

                  {submission.feedback && (
                    <View style={styles.feedbackContainer}>
                      <Text style={styles.feedbackLabel}>Teacher Feedback:</Text>
                      <Text style={styles.feedbackText}>{submission.feedback}</Text>
                    </View>
                  )}

                  <Text style={styles.submittedAt}>
                    Submitted: {new Date(submission.submittedAt).toLocaleString()}
                  </Text>
                </GlassCard>
              </Animated.View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Transparent so the app background artwork shows through.
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: STUDENT_SPACING.md,
    ...STUDENT_TYPO.body,
    color: STUDENT.textMuted,
  },
  content: {
    flex: 1,
    padding: STUDENT_SPACING.lg,
  },
  submissionCard: {
    marginBottom: STUDENT_SPACING.md,
    overflow: 'hidden',
  },
  subjectStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: STUDENT_RADIUS.card,
    borderBottomLeftRadius: STUDENT_RADIUS.card,
  },
  submissionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: STUDENT_SPACING.md,
  },
  homeworkInfo: {
    flex: 1,
    paddingLeft: STUDENT_SPACING.sm,
  },
  homeworkTitle: {
    ...STUDENT_TYPO.body,
    fontWeight: '700',
    color: STUDENT.text,
    marginBottom: 4,
  },
  homeworkSubject: {
    ...STUDENT_TYPO.caption,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: STUDENT_SPACING.md,
    paddingVertical: 6,
    borderRadius: STUDENT_RADIUS.md,
  },
  statusBadgepending: {
    backgroundColor: STUDENT.bgAccent,
  },
  statusBadgereviewed: {
    backgroundColor: STUDENT.accentSoft,
  },
  statusBadgegraded: {
    backgroundColor: STUDENT.navActiveBg,
  },
  statusText: {
    ...STUDENT_TYPO.label,
  },
  statusTextpending: {
    color: STUDENT.warning,
  },
  statusTextreviewed: {
    color: STUDENT.accent,
  },
  statusTextgraded: {
    color: STUDENT.primaryDark,
  },
  submissionDetails: {
    marginBottom: STUDENT_SPACING.md,
    paddingTop: STUDENT_SPACING.md,
    borderTopWidth: 1,
    borderTopColor: STUDENT.surfaceBorder,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: STUDENT_SPACING.sm,
    marginBottom: STUDENT_SPACING.sm,
  },
  linkText: {
    ...STUDENT_TYPO.caption,
    color: STUDENT.accent,
  },
  description: {
    ...STUDENT_TYPO.caption,
    color: STUDENT.textMuted,
    marginTop: STUDENT_SPACING.sm,
  },
  gradeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: STUDENT_SPACING.sm,
    marginBottom: STUDENT_SPACING.md,
    paddingTop: STUDENT_SPACING.md,
    borderTopWidth: 1,
    borderTopColor: STUDENT.surfaceBorder,
  },
  gradeLabel: {
    ...STUDENT_TYPO.caption,
    fontWeight: '600',
    color: STUDENT.textSecondary,
  },
  gradeValue: {
    fontSize: 18,
    fontWeight: '700',
    color: STUDENT.success,
  },
  feedbackContainer: {
    marginBottom: STUDENT_SPACING.md,
    padding: STUDENT_SPACING.md,
    backgroundColor: STUDENT.bgAccent,
    borderRadius: STUDENT_RADIUS.inner,
  },
  feedbackLabel: {
    ...STUDENT_TYPO.label,
    color: STUDENT.textMuted,
    marginBottom: 4,
  },
  feedbackText: {
    ...STUDENT_TYPO.caption,
    color: STUDENT.text,
  },
  submittedAt: {
    ...STUDENT_TYPO.label,
    color: STUDENT.textMuted,
    textAlign: 'right',
  },
});
