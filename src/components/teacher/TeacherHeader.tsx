import React, { useEffect, useMemo } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  formatSubjectLabel,
  formatTeacherFullName,
  formatTeacherTimeGreeting,
} from '../../lib/teacher-text';
import { TEACHER, TEACHER_SPACING, teacherSubjectBadgePalette } from '../../theme/teacher';
import SchoolBrandRow from '../ui/SchoolBrandRow';
import { glassFillColor } from '../../theme/glass';
import type { BackendStatus } from '../../services/api/teacherService';

type Props = {
  /** `home` = greeting + full name (dashboard only). `compact` = page title bar on other tabs. */
  variant?: 'home' | 'compact';
  /** Shown in compact mode (e.g. Students, Learning Paths). */
  title?: string;
  /** Compact mode only: render as a frosted-glass bar over a colourful backdrop instead of a solid one. */
  glass?: boolean;
  /** Teacher full name shown on the line below the greeting. */
  displayName?: string;
  /** User profile — used to show school logo + name for the member's school. */
  user?: any;
  /** @deprecated Prefer displayName */
  userName?: string;
  subjects?: string[];
  nextClassLabel?: string;
  countdown?: string;
  stale?: boolean;
  backendStatus?: BackendStatus;
  onMenu?: () => void;
  onProfile?: () => void;
  onLogout?: () => void;
};

const screenWidth = Dimensions.get('window').width;

export default function TeacherHeader({
  variant = 'home',
  title,
  glass,
  displayName,
  user,
  userName,
  subjects = [],
  nextClassLabel,
  countdown,
  onLogout,
}: Props) {
  const insets = useSafeAreaInsets();
  const shimmerX = useSharedValue(-150);

  useEffect(() => {
    shimmerX.value = withRepeat(
      withTiming(screenWidth + 150, { duration: 2400 }),
      -1,
      false,
    );
  }, [shimmerX]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerX.value }],
  }));

  const greetingLine = useMemo(() => formatTeacherTimeGreeting(), []);
  const teacherNameLine = useMemo(() => {
    const fromProps = String(displayName || userName || '').trim();
    if (fromProps && fromProps.toLowerCase() !== 'teacher') {
      return formatTeacherFullName(fromProps);
    }
    const combined = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
    const fromUser = String(
      user?.fullName || combined || user?.name || user?.email?.split('@')[0] || fromProps || 'Teacher',
    ).trim();
    return formatTeacherFullName(fromUser || 'Teacher');
  }, [displayName, userName, user]);

  const subjectLabels = useMemo(() => {
    const seen = new Set<string>();
    return subjects
      .map((s) => formatSubjectLabel(s))
      .filter((label) => {
        const key = label.toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => a.localeCompare(b));
  }, [subjects]);

  if (variant === 'compact') {
    return (
      <View
        style={[
          styles.compactWrap,
          glass && styles.compactWrapGlass,
          { paddingTop: Math.max(insets.top, TEACHER_SPACING.sm) + TEACHER_SPACING.xs },
        ]}
      >
        <View style={styles.compactMain}>
          <Text style={styles.compactTitle} numberOfLines={1}>
            {title || ' '}
          </Text>
        </View>
        {onLogout ? (
          <Pressable
            onPress={onLogout}
            style={styles.compactLogoutBtn}
            accessibilityLabel="Logout"
            accessibilityRole="button"
          >
            <Ionicons name="log-out-outline" size={20} color={TEACHER.danger} />
          </Pressable>
        ) : (
          <View style={styles.compactLogoutSpacer} />
        )}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.wrap,
        glass && styles.wrapGlass,
        { paddingTop: Math.max(insets.top, TEACHER_SPACING.md) + TEACHER_SPACING.lg },
      ]}
    >
      {/* Glass home: keep soft backdrop so greeting + name stay readable on artwork */}
      {glass ? null : (
        <>
          <LinearGradient
            colors={[...TEACHER.headerGradient]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.orbTop} />
          <View style={styles.orbBottom} />
          <Animated.View style={[styles.shimmerSweep, shimmerStyle]} />
        </>
      )}

      <View style={styles.row}>
        <View style={styles.textBlock}>
          <Text style={styles.greeting}>{greetingLine}</Text>
          <Text style={styles.teacherName}>{teacherNameLine}</Text>
          <SchoolBrandRow user={user} variant="onLight" style={styles.schoolBrand} fullWidth />
          {subjectLabels.length > 0 ? (
            <View style={styles.badges}>
              {subjectLabels.map((label, index) => {
                const palette = teacherSubjectBadgePalette(label, index);
                return (
                  <View
                    key={label}
                    style={[
                      styles.badge,
                      {
                        backgroundColor: palette.bg,
                        borderColor: palette.border,
                        shadowColor: palette.border,
                      },
                    ]}
                  >
                    <View style={[styles.badgeDot, { backgroundColor: palette.border }]} />
                    <Text style={[styles.badgeText, { color: palette.text }]}>{label}</Text>
                  </View>
                );
              })}
            </View>
          ) : null}
        </View>
        {onLogout ? (
          <Pressable
            onPress={onLogout}
            style={styles.logoutBtn}
            accessibilityLabel="Logout"
            accessibilityRole="button"
          >
            <Ionicons name="log-out-outline" size={22} color={TEACHER.danger} />
          </Pressable>
        ) : null}
      </View>

      {nextClassLabel ? (
        <View style={styles.scheduleRow}>
          <View style={styles.scheduleInner}>
            <Ionicons name="time-outline" size={16} color={TEACHER.primary} />
            <Text style={styles.scheduleText}>{nextClassLabel}</Text>
            {countdown ? (
              <View style={styles.countdownBadge}>
                <Text style={styles.countdown}>{countdown}</Text>
              </View>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  compactWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: TEACHER_SPACING.lg,
    paddingBottom: TEACHER_SPACING.md,
    backgroundColor: TEACHER.bg,
    borderBottomWidth: 1,
    borderBottomColor: TEACHER.surfaceBorder,
  },
  compactWrapGlass: {
    backgroundColor: glassFillColor('medium'),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.5)',
    overflow: 'hidden',
  },
  compactMain: {
    flex: 1,
    minWidth: 0,
    paddingRight: TEACHER_SPACING.sm,
  },
  compactTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: TEACHER.text,
    letterSpacing: -0.3,
  },
  compactLogoutBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
  },
  compactLogoutSpacer: { width: 36 },
  wrap: {
    paddingHorizontal: TEACHER_SPACING.lg,
    paddingBottom: TEACHER_SPACING.lg,
    overflow: 'hidden',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#38BDF8',
  },
  wrapGlass: {
    backgroundColor: glassFillColor('light'),
    borderBottomWidth: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    overflow: 'hidden',
  },
  orbTop: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(14, 165, 233, 0.18)',
    top: -50,
    right: -30,
  },
  orbBottom: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(2, 132, 199, 0.14)',
    bottom: -30,
    left: 20,
  },
  shimmerSweep: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 120,
    backgroundColor: 'rgba(14, 165, 233, 0.12)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  textBlock: {
    flex: 1,
    paddingRight: TEACHER_SPACING.sm,
    paddingTop: TEACHER_SPACING.sm,
  },
  logoutBtn: {
    marginTop: TEACHER_SPACING.sm,
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
  },
  greeting: {
    fontSize: 20,
    fontWeight: '700',
    color: TEACHER.textSecondary,
    letterSpacing: 0.1,
    lineHeight: 26,
  },
  teacherName: {
    fontSize: 24,
    fontWeight: '800',
    color: TEACHER.text,
    letterSpacing: -0.5,
    lineHeight: 30,
    marginTop: 6,
  },
  schoolBrand: {
    marginTop: 10,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.14,
    shadowRadius: 2,
    elevation: 2,
  },
  badgeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  scheduleRow: {
    marginTop: TEACHER_SPACING.md,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#38BDF8',
    backgroundColor: 'rgba(255,255,255,0.65)',
  },
  scheduleInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: TEACHER_SPACING.sm,
    padding: TEACHER_SPACING.md,
  },
  scheduleText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: TEACHER.textSecondary,
  },
  countdownBadge: {
    backgroundColor: TEACHER.navActiveBg,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  countdown: {
    fontSize: 13,
    fontWeight: '800',
    color: TEACHER.primaryDark,
  },
});
