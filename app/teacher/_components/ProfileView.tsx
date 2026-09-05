import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import teacherService from '../../../src/services/api/teacherService';
import { TeacherShimmer, TimetableView } from '../../../src/components/teacher';
import { TEACHER, TEACHER_RADIUS, TEACHER_SPACING, TEACHER_TYPO, glassCard } from '../../../src/theme/teacher';
import { GlassPanel } from '../../../src/components/ui';
import EduOTTView from './EduOTTView';
import { EduOTTFilterProvider } from '../../../src/contexts/edu-ott-filter-context';
import WorkDiaryView from './WorkDiaryView';
import WeeklyDigestCard from '../../../src/components/student/WeeklyDigestCard';

type Props = {
  user: any;
  stats: { totalStudents: number; totalClasses: number; pendingGrades?: number; totalVideos: number };
  onNavigate: (tab: string, sub?: string) => void;
  onLogout: () => void;
};

const MENU = [
  { id: 'timetable', label: 'My Timetable', icon: 'calendar-outline' as const, tab: 'classes', sub: 'timetable' },
  { id: 'diary', label: 'Work Diary', icon: 'journal-outline' as const, tab: 'classes', sub: 'diary' },
  { id: 'eduott', label: 'EduOTT Library', icon: 'play-circle-outline' as const, tab: 'profile', sub: 'eduott' },
  { id: 'calendar', label: 'Calendar View', icon: 'today-outline' as const, tab: 'profile', sub: 'calendar' },
  { id: 'attendance', label: 'Attendance History', icon: 'checkmark-done-outline' as const, route: '/teacher/attendance' },
  { id: 'password', label: 'Change Password', icon: 'key-outline' as const, route: '/profile' },
];

const STAT_TILES = [
  { key: 'students', label: 'Students', icon: 'people' as const, color: TEACHER.primary, value: (s: Props['stats']) => s.totalStudents },
  { key: 'classes', label: 'Classes', icon: 'school' as const, color: TEACHER.success, value: (s: Props['stats']) => s.totalClasses },
  { key: 'videos', label: 'Videos', icon: 'play-circle' as const, color: TEACHER.secondary, value: (s: Props['stats']) => s.totalVideos },
];

function usePressScale(to = 0.96) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const onPressIn = () => { scale.value = withSpring(to, { damping: 14, stiffness: 300 }); };
  const onPressOut = () => { scale.value = withSpring(1.0, { damping: 14, stiffness: 300 }); };
  return { style, onPressIn, onPressOut };
}

function useCountUp(target: number, duration = 900) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let frame: number;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      setDisplay(Math.round(target * progress));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return display;
}

function StatTile({ tile, stats }: { tile: typeof STAT_TILES[number]; stats: Props['stats'] }) {
  const count = useCountUp(tile.value(stats));
  return (
    <GlassPanel style={styles.statTile} radius={TEACHER_RADIUS.lg} tone="medium">
      <View style={styles.statTileInner}>
        <LinearGradient colors={[tile.color + '40', tile.color + '18']} style={styles.statIconCircle}>
          <Ionicons name={tile.icon} size={16} color={tile.color} />
        </LinearGradient>
        <Text style={styles.statNumber}>{count}</Text>
        <Text style={styles.statLabel}>{tile.label}</Text>
      </View>
    </GlassPanel>
  );
}

function MenuRow({
  item,
  index,
  onPress,
}: {
  item: typeof MENU[number];
  index: number;
  onPress: () => void;
}) {
  const press = usePressScale();
  return (
    <Animated.View entering={FadeInDown.duration(350).delay(Math.min(index * 60, 440))}>
      <Pressable onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
        <Animated.View style={press.style}>
          <GlassPanel style={styles.menuItem} radius={TEACHER_RADIUS.lg} tone="medium">
            <View style={styles.menuItemRow}>
              <LinearGradient
                colors={[TEACHER.primary + '28', TEACHER.primaryDark + '18']}
                style={styles.menuIconBadge}
              >
                <Ionicons name={item.icon} size={18} color={TEACHER.primaryLight} />
              </LinearGradient>
              <View style={styles.menuLabelWrap}>
                <Text style={styles.menuLabel}>{item.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={TEACHER.textMuted} />
            </View>
          </GlassPanel>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

export default function ProfileView({ user, stats, onNavigate, onLogout }: Props) {
  const [subView, setSubView] = useState<'menu' | 'eduott' | 'calendar'>('menu');
  const [events, setEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  const logoutOpacity = useSharedValue(1);
  useEffect(() => {
    logoutOpacity.value = withRepeat(
      withSequence(withTiming(0.5, { duration: 800 }), withTiming(1, { duration: 800 })),
      -1,
    );
  }, [logoutOpacity]);

  const logoutBorderStyle = useAnimatedStyle(() => ({ opacity: logoutOpacity.value }));

  useEffect(() => {
    if (subView === 'calendar') loadCalendar();
  }, [subView]);

  const loadCalendar = async () => {
    setLoadingEvents(true);
    try {
      const month = new Date().toISOString().slice(0, 7);
      const res = await teacherService.calendarEvents(month);
      setEvents(Array.isArray(res.data) ? res.data : []);
    } catch {
      setEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  };

  const initials = (user?.fullName || 'T')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  if (subView === 'eduott') {
    return (
      <View style={styles.full}>
        <Pressable onPress={() => setSubView('menu')}>
          <GlassPanel style={styles.backRow} radius={TEACHER_RADIUS.lg} tone="medium">
            <View style={styles.backRowInner}>
              <Ionicons name="arrow-back" size={20} color={TEACHER.primaryLight} />
              <Text style={styles.backText}>Back To Profile</Text>
            </View>
          </GlassPanel>
        </Pressable>
        <EduOTTFilterProvider>
          <EduOTTView username={user?.fullName || 'Teacher'} />
        </EduOTTFilterProvider>
      </View>
    );
  }

  if (subView === 'calendar') {
    return (
      <ScrollView style={styles.full} contentContainerStyle={styles.scrollPad}>
        <Pressable onPress={() => setSubView('menu')}>
          <GlassPanel style={styles.backRow} radius={TEACHER_RADIUS.lg} tone="medium">
            <View style={styles.backRowInner}>
              <Ionicons name="arrow-back" size={20} color={TEACHER.primaryLight} />
              <Text style={styles.backText}>Back To Profile</Text>
            </View>
          </GlassPanel>
        </Pressable>
        {loadingEvents ? (
          <TeacherShimmer variant="list" count={3} />
        ) : events.length ? (
          events.map((ev, i) => (
            <Animated.View key={ev._id || i} entering={FadeInDown.duration(320).delay(Math.min(i * 55, 440))}>
              <GlassPanel style={styles.eventCard} radius={TEACHER_RADIUS.lg} tone="medium">
                <Text style={styles.eventTitle}>{ev.title || ev.name || 'Event'}</Text>
                <Text style={styles.eventMeta}>
                  {ev.date ? new Date(ev.date).toLocaleDateString() : ev.startDate || '—'} · {ev.type || 'Event'}
                </Text>
              </GlassPanel>
            </Animated.View>
          ))
        ) : (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={40} color={TEACHER.textMuted} />
            <Text style={styles.emptyText}>No Events This Month</Text>
          </View>
        )}
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.full} contentContainerStyle={styles.scrollPad} showsVerticalScrollIndicator={false}>
      <Animated.View entering={FadeInDown.duration(500)}>
        <LinearGradient colors={['#EEF2FF', '#F8FAFC', '#FFFFFF']} style={styles.heroCard}>
          <LinearGradient colors={[TEACHER.primary, TEACHER.primaryDark]} style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </LinearGradient>
          <Text style={styles.name}>{user?.fullName || 'Teacher'}</Text>
          <View style={styles.rolePill}>
            <Text style={styles.roleText}>Teacher</Text>
          </View>
          <Text style={styles.meta}>ID: {user?.employeeId || user?._id?.slice(-6) || '—'}</Text>
        </LinearGradient>
      </Animated.View>

      <View style={styles.statsRow}>
        {STAT_TILES.map((tile) => (
          <StatTile key={tile.key} tile={tile} stats={stats} />
        ))}
      </View>

      <Text style={styles.sectionTitle}>More</Text>
      {MENU.map((item, index) => (
        <MenuRow
          key={item.id}
          item={item}
          index={index}
          onPress={() => {
            if (item.route) {
              router.push(item.route as any);
            } else if (item.sub === 'eduott') {
              setSubView('eduott');
            } else if (item.sub === 'calendar') {
              setSubView('calendar');
            } else if (item.tab) {
              onNavigate(item.tab, item.sub);
            }
          }}
        />
      ))}

      <WeeklyDigestCard apiBase="/api/teacher" />

      <Animated.View style={logoutBorderStyle}>
        <Pressable style={styles.logoutBtn} onPress={onLogout}>
          <Ionicons name="log-out-outline" size={20} color={TEACHER.danger} />
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Transparent so AppBackground's artwork shows through.
  full: { flex: 1, backgroundColor: 'transparent' },
  scrollPad: { paddingHorizontal: TEACHER_SPACING.lg, paddingBottom: 120, paddingTop: TEACHER_SPACING.sm },
  heroCard: {
    alignItems: 'center',
    paddingVertical: 32,
    marginHorizontal: -TEACHER_SPACING.lg,
    marginBottom: TEACHER_SPACING.lg,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: TEACHER_SPACING.md,
  },
  avatarText: { fontSize: 26, fontWeight: '900', color: '#fff' },
  name: { ...TEACHER_TYPO.hero, color: TEACHER.text, marginTop: 12 },
  rolePill: {
    backgroundColor: TEACHER.navActiveBg,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 8,
  },
  roleText: { color: TEACHER.primaryDark, fontWeight: '700', fontSize: 12 },
  meta: { fontSize: 13, color: TEACHER.textMuted, marginTop: 4 },
  statsRow: {
    flexDirection: 'row',
    gap: TEACHER_SPACING.sm,
    marginBottom: TEACHER_SPACING.xl,
  },
  statTile: {
    ...glassCard,
    backgroundColor: 'transparent',
    flex: 1,
    padding: TEACHER_SPACING.md,
  },
  statTileInner: {
    alignItems: 'center',
    gap: 4,
  },
  statIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumber: { ...TEACHER_TYPO.number, fontSize: 22, color: TEACHER.text },
  statLabel: { ...TEACHER_TYPO.label, color: TEACHER.textMuted, fontSize: 9 },
  sectionTitle: {
    ...TEACHER_TYPO.label,
    color: TEACHER.textSecondary,
    textTransform: 'uppercase',
    marginBottom: TEACHER_SPACING.sm,
  },
  menuItem: {
    ...glassCard,
    backgroundColor: 'transparent',
    padding: TEACHER_SPACING.lg,
    marginBottom: TEACHER_SPACING.sm,
  },
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: TEACHER_SPACING.md,
  },
  menuIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabelWrap: { flex: 1, minWidth: 0 },
  menuLabel: { fontSize: 15, fontWeight: '700', color: TEACHER.text },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: TEACHER_SPACING.lg,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,77,106,0.45)',
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: TEACHER.danger },
  backRow: {
    marginHorizontal: TEACHER_SPACING.lg,
    marginBottom: TEACHER_SPACING.sm,
    padding: TEACHER_SPACING.md,
    ...glassCard,
    backgroundColor: 'transparent',
  },
  backRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backText: { color: TEACHER.text, fontWeight: '700' },
  eventCard: {
    ...glassCard,
    backgroundColor: 'transparent',
    padding: TEACHER_SPACING.lg,
    marginBottom: TEACHER_SPACING.sm,
  },
  eventTitle: { fontSize: 15, fontWeight: '700', color: TEACHER.text },
  eventMeta: { fontSize: 12, color: TEACHER.textMuted, marginTop: 4 },
  empty: { alignItems: 'center', padding: 40 },
  emptyText: { color: TEACHER.textMuted, marginTop: 12 },
});
