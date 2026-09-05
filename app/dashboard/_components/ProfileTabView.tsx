import { storageGetItem } from '../../../src/lib/safe-storage';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { resolveStudentDisplayName } from '../../../src/lib/student-text';
import GlassCard from '../../../src/components/student/GlassCard';
import { ShimmerCard } from '../../../src/components/student/StudentShimmer';
import { AnimatedStatInput, useCountUp } from '../../../src/hooks/useCountUp';
import {
  STUDENT,
  STUDENT_ANIMATION,
  STUDENT_RADIUS,
  STUDENT_SPACING,
  STUDENT_TYPO,
} from '../../../src/theme/student';
import { useAuth } from '../../../src/context/AuthContext';
import studentService from '../../../src/services/api/studentService';
import { API_BASE_URL } from '../../../src/lib/api-config';
import { dedupeStudentExamResults } from '../../../src/lib/dedupe-exam-results';
import { fetchWeeklySessionMinutes, setupSessionTimeSync } from '../../../src/lib/session-time-sync';
import {
  buildWeeklyActivityStats,
  computeProfileOverviewStats,
  getExamIdFromResult,
  toLocalDateKey,
} from '../../../src/lib/profile-overview-stats';

type Props = {
  user: any;
  onLogout: () => void;
};

function getInitials(name?: string): string {
  if (!name?.trim()) return 'U';
  return name
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value || 'N/A'}</Text>
    </View>
  );
}

function StatValue({
  target,
  suffix = '',
  prefix = '',
  color,
}: {
  target: number;
  suffix?: string;
  prefix?: string;
  color: string;
}) {
  const value = useCountUp(target, 800);
  const animatedProps = useAnimatedProps(() => ({
    text: `${prefix}${Math.round(value.value)}${suffix}`,
  }));

  return (
    <AnimatedStatInput
      animatedProps={animatedProps as never}
      editable={false}
      style={[styles.metricValue, { color }]}
      underlineColorAndroid="transparent"
    />
  );
}

function formatWeekHours(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) return '0h';
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m`;
  const rounded = Math.round(hours * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}h` : `${rounded}h`;
}

function AnimatedWeekBar({ hours, completed, delay }: { hours: number; completed: boolean; delay: number }) {
  const height = useSharedValue(8);

  useEffect(() => {
    const target = completed
      ? Math.max(12, Math.min(52, 10 + hours * 3.5))
      : 8;
    height.value = withDelay(
      delay,
      withTiming(target, { duration: 700, easing: Easing.out(Easing.quad) })
    );
  }, [hours, delay, height, completed]);

  const animStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return (
    <Animated.View
      style={[
        styles.weekHoursBox,
        !completed && styles.weekHoursIdle,
        animStyle,
      ]}
    >
      {completed ? (
        <LinearGradient
          colors={[STUDENT.primaryLight, STUDENT.primary, STUDENT.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      ) : null}
    </Animated.View>
  );
}

export default function ProfileTabView({ user, onLogout }: Props) {
  const { signOut } = useAuth();
  const [profile, setProfile] = useState<any>(user);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [examResults, setExamResults] = useState<any[]>([]);
  const [rankings, setRankings] = useState<any[]>([]);
  const [progressRecords, setProgressRecords] = useState<any[]>([]);
  const [streakCount, setStreakCount] = useState(0);
  const [sessionMinutesByDate, setSessionMinutesByDate] = useState<Record<string, number>>({});
  const [localSessionMinutesByDate, setLocalSessionMinutesByDate] = useState<Record<string, number>>({});

  useEffect(() => {
    studentService.getProfile().then((me) => setProfile(me?.user || user)).catch(() => setProfile(user));
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setOverviewLoading(true);
      try {
        const token = await storageGetItem('authToken');
        if (!token) return;
        const headers = {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        };
        const [resultsRes, rankingsRes, focusRes, progressRes, meRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/student/exam-results`, { headers }),
          fetch(`${API_BASE_URL}/api/student/rankings`, { headers }),
          fetch(`${API_BASE_URL}/api/vidya/student/focus-card`, { headers }).catch(() => null),
          fetch(`${API_BASE_URL}/api/student/learning-progress`, { headers }),
          fetch(`${API_BASE_URL}/api/auth/me`, { headers }),
        ]);

        if (!cancelled && resultsRes.ok) {
          const json = await resultsRes.json();
          const rows = Array.isArray(json.data) ? json.data : [];
          setExamResults(dedupeStudentExamResults(rows, getExamIdFromResult));
        }
        if (!cancelled && rankingsRes.ok) {
          const json = await rankingsRes.json();
          setRankings(Array.isArray(json.data) ? json.data : []);
        }
        let streak = 0;
        if (focusRes && 'ok' in focusRes && focusRes.ok) {
          const focusJson = await focusRes.json();
          streak = Number(focusJson?.studyStreak?.current ?? focusJson?.studyStreak?.count ?? 0);
        }
        if ((!Number.isFinite(streak) || streak <= 0) && meRes.ok) {
          const meJson = await meRes.json();
          streak = Number(meJson?.user?.studyStreak?.current ?? 0);
        }
        if (!cancelled) setStreakCount(Number.isFinite(streak) ? Math.max(0, streak) : 0);

        if (!cancelled && progressRes.ok) {
          const progressJson = await progressRes.json();
          setProgressRecords(progressJson?.data?.progressRecords || []);
        }
      } catch {
        if (!cancelled) {
          setExamResults([]);
          setRankings([]);
          setProgressRecords([]);
          setStreakCount(0);
        }
      } finally {
        if (!cancelled) setOverviewLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const refreshStudySessions = async () => {
      const token = await storageGetItem('authToken');
      const weeklySessions = await fetchWeeklySessionMinutes(token);
      if (!cancelled) {
        setSessionMinutesByDate(weeklySessions.backend);
        setLocalSessionMinutesByDate(weeklySessions.local);
      }
    };

    void refreshStudySessions();
    const cleanup = setupSessionTimeSync(() => {
      void refreshStudySessions();
    });

    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);

  const todayDateKey = useMemo(() => toLocalDateKey(new Date()), []);

  const stats = useMemo(
    () => computeProfileOverviewStats(examResults, rankings, streakCount),
    [examResults, rankings, streakCount]
  );

  const weeklyStats = useMemo(
    () =>
      buildWeeklyActivityStats(examResults, progressRecords, {
        sessionMinutesByDate,
        localSessionMinutesByDate,
      }),
    [examResults, progressRecords, sessionMinutesByDate, localSessionMinutesByDate]
  );

  const weeklyHoursTotal = useMemo(
    () => Math.round(weeklyStats.reduce((sum, day) => sum + day.hours, 0) * 10) / 10,
    [weeklyStats]
  );

  const profileClassNumber =
    profile?.assignedClass?.classNumber != null && String(profile.assignedClass.classNumber).trim() !== ''
      ? String(profile.assignedClass.classNumber).trim()
      : profile?.classNumber && String(profile.classNumber).trim() !== '' && profile.classNumber !== 'Unassigned'
        ? String(profile.classNumber).trim()
        : null;

  const profileSection =
    profile?.assignedClass?.section != null && String(profile.assignedClass.section).trim() !== ''
      ? String(profile.assignedClass.section).trim()
      : profile?.section != null && String(profile.section).trim() !== ''
        ? String(profile.section).trim()
        : null;

  const displayBoard =
    profile?.curriculumBoard && String(profile.curriculumBoard).trim() !== ''
      ? String(profile.curriculumBoard).toUpperCase()
      : profile?.board && String(profile.board).toUpperCase() !== 'ASLI_EXCLUSIVE_SCHOOLS'
        ? String(profile.board).toUpperCase()
        : profile?.board || '';

  const logout = () => {
    Alert.alert('Logout', 'Sign Out Of Your Account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          onLogout();
        },
      },
    ]);
  };

  const onEditProfile = () => {
    Alert.alert('Edit Profile', 'Profile editing will be available soon. You can update your information from the web dashboard.');
  };

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <Animated.View entering={FadeInDown.duration(STUDENT_ANIMATION.normal)}>
        <LinearGradient colors={[...STUDENT.heroGradient]} style={styles.profileHero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={styles.headerTop}>
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(profile?.fullName)}</Text>
            </View>
          </View>
            <View style={styles.headerInfo}>
              <Text style={styles.name}>{resolveStudentDisplayName(profile)}</Text>
              <Text style={styles.email}>{profile?.email || ''}</Text>
              <View style={styles.badgeRow}>
                {profileClassNumber ? (
                  <View style={styles.heroBadge}>
                    <Text style={styles.heroBadgeText}>
                      Class {profileClassNumber}
                      {profileSection ? ` · Sec ${profileSection}` : ''}
                    </Text>
                  </View>
                ) : null}
                {displayBoard ? (
                  <View style={styles.heroBadge}>
                    <Text style={styles.heroBadgeText}>{displayBoard}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
          <Pressable style={styles.editBtn} onPress={onEditProfile}>
            <Ionicons name="create-outline" size={16} color={STUDENT.primaryDark} />
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </Pressable>
        </LinearGradient>
      </Animated.View>

      <GlassCard variant="glass" padding={16}>
        <View style={styles.cardTitleRow}>
          <Ionicons name="settings-outline" size={20} color={STUDENT.text} />
          <Text style={styles.cardTitle}>Profile Settings</Text>
        </View>
        <View style={styles.fieldsGrid}>
          <ProfileField label="Full Name" value={profile?.fullName || ''} />
          <ProfileField label="Email" value={profile?.email || ''} />
          <ProfileField label="Class" value={profileClassNumber || ''} />
          <ProfileField label="Section" value={profileSection || ''} />
          <ProfileField label="Phone" value={profile?.phone || ''} />
          <ProfileField label="School" value={profile?.schoolName || profile?.school?.name || ''} />
          <ProfileField label="Board" value={displayBoard} />
        </View>
      </GlassCard>

      <GlassCard variant="glass" padding={16}>
        <View style={styles.cardTitleRow}>
          <Ionicons name="trending-up-outline" size={20} color={STUDENT.text} />
          <Text style={styles.cardTitle}>Performance Overview</Text>
        </View>
        {overviewLoading ? (
          <ShimmerCard style={{ marginVertical: 8 }} />
        ) : (
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <StatValue target={stats.streak} color={STUDENT.warning} />
              <Text style={styles.metricLabel}>Day Streak</Text>
            </View>
            <View style={styles.metricItem}>
              <StatValue target={stats.questionsAnswered} color={STUDENT.success} />
              <Text style={styles.metricLabel}>Questions Solved</Text>
            </View>
            <View style={styles.metricItem}>
              <StatValue target={stats.accuracyRate} suffix="%" color={STUDENT.accent} />
              <Text style={styles.metricLabel}>Accuracy Rate</Text>
            </View>
            <View style={styles.metricItem}>
              {stats.rank > 0 ? (
                <StatValue target={stats.rank} prefix="#" color={STUDENT.statGradients.efficiency[0]} />
              ) : (
                <Text style={[styles.metricValue, { color: STUDENT.textMuted }]}>—</Text>
              )}
              <Text style={styles.metricLabel}>Avg Exam Rank</Text>
            </View>
          </View>
        )}
      </GlassCard>

      <GlassCard variant="glass" padding={16}>
        <View style={styles.cardTitleRow}>
          <Ionicons name="calendar-outline" size={20} color={STUDENT.text} />
          <Text style={styles.cardTitle}>This Week&apos;s Activity</Text>
        </View>
        {overviewLoading ? (
          <ShimmerCard style={{ marginVertical: 8 }} />
        ) : (
          <>
            <View style={styles.weekRow}>
              {weeklyStats.map((day, index) => {
                const isToday = day.dateKey === todayDateKey;
                return (
                <View key={day.dateKey} style={styles.weekCell}>
                  <Text style={[styles.weekDay, isToday && styles.weekDayToday]}>{day.day}</Text>
                  <AnimatedWeekBar hours={day.hours} completed={day.completed} delay={index * 60} />
                  <Text
                    style={[
                      styles.weekHoursText,
                      day.completed ? styles.weekHoursTextActive : undefined,
                      isToday && styles.weekHoursTextToday,
                    ]}
                  >
                    {formatWeekHours(day.hours)}
                  </Text>
                </View>
              );
              })}
            </View>
            <Text style={styles.weekTotal}>Total: {weeklyHoursTotal} Hours This Week</Text>
            <Text style={styles.weekSub}>From Exams, Content Sessions, And App Study Time.</Text>
          </>
        )}
      </GlassCard>

      <Pressable style={styles.logoutBtn} onPress={logout}>
        <Ionicons name="log-out-outline" size={18} color="#dc2626" />
        <Text style={styles.logoutText}>Logout</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  scroll: { paddingBottom: 100, gap: STUDENT_SPACING.md },
  profileHero: {
    borderRadius: STUDENT_RADIUS.xxl,
    padding: STUDENT_SPACING.lg,
    marginBottom: 2,
    ...STUDENT.shadow.md,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: STUDENT_SPACING.md,
    marginBottom: STUDENT_SPACING.md,
  },
  avatarRing: {
    width: 80,
    height: 80,
    borderRadius: 26,
    padding: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  avatar: {
    flex: 1,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  avatarText: { fontSize: 26, fontWeight: '800', color: STUDENT.textOnPrimary },
  headerInfo: { flex: 1, minWidth: 0 },
  name: { ...STUDENT_TYPO.section, color: STUDENT.textOnPrimary },
  email: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  heroBadge: {
    borderRadius: STUDENT_RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  heroBadgeText: { fontSize: 11, fontWeight: '700', color: STUDENT.textOnPrimary },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    gap: 6,
    borderRadius: STUDENT_RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  editBtnText: { fontSize: 12, fontWeight: '700', color: STUDENT.primaryDark },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  cardTitle: { ...STUDENT_TYPO.section, fontSize: 18, color: STUDENT.text },
  fieldsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: STUDENT_SPACING.md,
  },
  field: { width: '47%', gap: 4 },
  fieldLabel: { ...STUDENT_TYPO.caption, color: STUDENT.textMuted },
  fieldValue: { fontSize: 16, fontWeight: '700', color: STUDENT.text },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: STUDENT_SPACING.lg,
  },
  metricItem: { width: '50%', alignItems: 'center' },
  metricValue: { fontSize: 28, fontWeight: '800', lineHeight: 34 },
  metricLabel: {
    ...STUDENT_TYPO.caption,
    color: STUDENT.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 4, alignItems: 'flex-end' },
  weekCell: { flex: 1, alignItems: 'center', minWidth: 36 },
  weekDay: { fontSize: 11, color: STUDENT.textMuted, marginBottom: 6 },
  weekDayToday: { color: STUDENT.primaryDark, fontWeight: '800' },
  weekHoursBox: {
    width: '100%',
    minHeight: 8,
    borderRadius: STUDENT_RADIUS.sm,
    overflow: 'hidden',
  },
  weekHoursIdle: { backgroundColor: '#e2e8f0' },
  weekHoursText: { fontSize: 11, fontWeight: '700', color: STUDENT.textMuted, marginTop: 6 },
  weekHoursTextActive: { color: STUDENT.primaryDark },
  weekHoursTextToday: { color: STUDENT.primary, fontWeight: '800' },
  weekTotal: { marginTop: 14, textAlign: 'center', fontSize: 13, color: STUDENT.textMuted },
  weekSub: { marginTop: 4, textAlign: 'center', fontSize: 12, color: STUDENT.navInactive },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
    padding: 14,
    borderRadius: STUDENT_RADIUS.md,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: STUDENT.danger },
});
