import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import teacherService from '../../../src/services/api/teacherService';
import {
  SubNavChips,
  TeacherShimmer,
  TeacherClassCard,
  TimetableView,
} from '../../../src/components/teacher';
import { GlassPanel } from '../../../src/components/ui';
import {
  classGradeAccentIndex,
  formatClassSectionLabel,
  formatPersonName,
  formatSubjectList,
} from '../../../src/lib/teacher-text';
import { TEACHER, TEACHER_RADIUS, TEACHER_SPACING } from '../../../src/theme/teacher';
import ScheduleCalendarView from './ScheduleCalendarView';

type ClassesSubTab = 'classes' | 'timetable' | 'schedule';

interface ClassItem {
  id: string;
  name: string;
  section: string;
  subject: string;
  studentCount: number;
  schedule: string;
  room: string;
  classNumber?: string;
  students: Array<{ id: string; name: string; email: string; status: string }>;
}

type Props = {
  stats: { totalStudents: number; totalClasses: number; totalVideos: number; pendingGrades?: number };
  initialSubTab?: ClassesSubTab;
  hideSubNav?: boolean;
  hideStats?: boolean;
  onOpenProgress?: (classNumber: string, studentId?: string) => void;
};

const SUB_TABS = [
  { id: 'classes', label: 'Classes', shortLabel: 'Classes', icon: 'school-outline' as const },
  { id: 'timetable', label: 'Timetable', shortLabel: 'Schedule', icon: 'calendar-outline' as const },
  { id: 'schedule', label: 'Schedule', shortLabel: 'Today', icon: 'time-outline' as const },
];

const STAT_ITEMS = [
  {
    key: 'students',
    label: 'Students',
    icon: 'people' as const,
    color: '#7C3AED',
    bg: '#F3E8FF',
    value: (s: Props['stats']) => s.totalStudents,
  },
  {
    key: 'classes',
    label: 'Classes',
    icon: 'layers' as const,
    color: '#EA580C',
    bg: '#FFEDD5',
    value: (s: Props['stats']) => s.totalClasses,
  },
  {
    key: 'videos',
    label: 'Videos',
    icon: 'play-circle' as const,
    color: '#059669',
    bg: '#D1FAE5',
    value: (s: Props['stats']) => s.totalVideos,
  },
  {
    key: 'grades',
    label: 'Pending',
    icon: 'ribbon' as const,
    color: '#D97706',
    bg: '#FEF3C7',
    value: (s: Props['stats']) => s.pendingGrades ?? 0,
  },
];

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

function StatDotGrid({ color }: { color: string }) {
  return (
    <View style={styles.statDots} pointerEvents="none">
      {Array.from({ length: 9 }).map((_, i) => (
        <View key={i} style={[styles.statDot, { backgroundColor: color }]} />
      ))}
    </View>
  );
}

function StatsRibbon({ stats }: { stats: Props['stats'] }) {
  return (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.statsWrap}>
      <View style={styles.statsRibbonRow}>
        {STAT_ITEMS.map((item) => (
          <StatCell key={item.key} item={item} stats={stats} />
        ))}
      </View>
    </Animated.View>
  );
}

function StatCell({
  item,
  stats,
}: {
  item: (typeof STAT_ITEMS)[number];
  stats: Props['stats'];
}) {
  const count = useCountUp(item.value(stats));
  return (
    <View style={[styles.statCell, { backgroundColor: item.bg }]}>
      <StatDotGrid color={`${item.color}33`} />
      <View style={styles.statIconWrap}>
        <Ionicons name={item.icon} size={16} color={item.color} />
      </View>
      <Text style={[styles.statValue, { color: item.color }]}>{count}</Text>
      <Text style={styles.statLabel}>{item.label}</Text>
    </View>
  );
}

function asText(value: unknown, fallback = 'N/A'): string {
  if (value == null || value === '') return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object' && value !== null && 'name' in value) {
    return asText((value as { name?: unknown }).name, fallback);
  }
  return String(value);
}

function formatClassName(cls: any): string {
  const num = cls.classNumber != null ? String(cls.classNumber) : '';
  const sec = cls.section != null ? String(cls.section).trim() : '';
  if (num && sec) return formatClassSectionLabel(`${num}${sec}`);
  if (cls.name && typeof cls.name === 'string') {
    const n = cls.name.trim();
    const compact = n.replace(/\s/g, '');
    if (/^\d{1,2}[-_']?[A-Za-z]$/i.test(compact) || /^class\s*\d/i.test(n)) {
      return formatClassSectionLabel(n);
    }
    return n;
  }
  if (num) return num;
  return 'Class';
}

function classSubjectRaw(cls: any): string {
  const assigned = Array.isArray(cls.assignedSubjects)
    ? cls.assignedSubjects.map((item: unknown) => asText(item, '')).filter(Boolean)
    : [];
  if (assigned.length) return assigned.join(', ');
  const listed = Array.isArray(cls.subjects)
    ? cls.subjects.map((item: unknown) => asText(item, '')).filter(Boolean)
    : [];
  if (listed.length) return listed.join(', ');
  return asText(cls.subject, 'General');
}

function formatRoom(cls: any): string {
  const room = asText(cls.room, '');
  if (room && room !== 'N/A' && room !== '—') {
    if (room.toLowerCase().startsWith('room')) return room;
    return `Room ${room}`;
  }
  const num = cls.classNumber != null ? String(cls.classNumber) : '';
  const sec = cls.section != null ? String(cls.section).trim() : '';
  if (num && sec) return `Room ${num}${sec}`;
  return '—';
}

export default function AIClassesView({
  stats,
  initialSubTab,
  hideSubNav,
  hideStats,
  onOpenProgress,
}: Props) {
  const [subTab, setSubTab] = useState<ClassesSubTab>(initialSubTab || 'classes');
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    if (initialSubTab) setSubTab(initialSubTab);
  }, [initialSubTab]);

  useEffect(() => {
    if (hideSubNav || subTab === 'classes') loadClasses();
  }, [subTab, hideSubNav]);

  const loadClasses = async () => {
    setLoading(true);
    try {
      const res = await teacherService.classes();
      const data = res.data ?? [];

      setClasses(
        (Array.isArray(data) ? data : []).map((cls: any) => {
          const schedule = asText(cls.schedule, '');
          return {
            id: String(cls._id || cls.id || ''),
            name: formatClassName(cls),
            section: asText(cls.section, ''),
            subject: formatSubjectList(classSubjectRaw(cls)),
            studentCount: cls.students?.length || cls.studentCount || 0,
            schedule: schedule || 'Not Scheduled',
            room: formatRoom(cls),
            classNumber: cls.classNumber ? String(cls.classNumber) : undefined,
            students: Array.isArray(cls.students)
              ? cls.students.map((s: any) => ({
                  id: String(s._id || s.id),
                  name: formatPersonName(s.fullName || s.name || 'Student'),
                  email: s.email || '',
                  status: s.status || 'active',
                }))
              : [],
          };
        })
      );
      setStale(res.stale);
    } catch {
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderClasses = () => {
    if (loading) return <TeacherShimmer variant="card" count={3} />;

    if (!classes.length) {
      return (
        <GlassPanel style={styles.empty} radius={TEACHER_RADIUS.lg} tone="medium">
          <View style={styles.emptyInner}>
            <LinearGradient colors={[TEACHER.primary, TEACHER.primaryDark]} style={styles.emptyIconCircle}>
              <Ionicons name="school-outline" size={36} color="#fff" />
            </LinearGradient>
            <Text style={styles.emptyTitle}>No Classes Assigned</Text>
            <Text style={styles.emptySub}>Contact your administrator to get class assignments.</Text>
          </View>
        </GlassPanel>
      );
    }

    return (
      <View style={styles.classesSection}>
        {classes.map((cls, index) => (
          <Animated.View
            key={cls.id}
            entering={FadeInDown.duration(350).delay(Math.min(index * 70, 420))}
          >
            <TeacherClassCard
              name={cls.name}
              subject={cls.subject}
              studentCount={cls.studentCount}
              schedule={cls.schedule}
              room={cls.room}
              expanded={expanded.has(cls.id)}
              onToggleStudents={() => toggleExpanded(cls.id)}
              students={cls.students}
              accentIndex={classGradeAccentIndex(cls.classNumber || cls.name)}
              onViewStudentAnalysis={(studentId) =>
                onOpenProgress?.(cls.classNumber || cls.name, studentId)
              }
            />
          </Animated.View>
        ))}
      </View>
    );
  };

  const visibleSubTab = hideSubNav ? 'classes' : subTab;

  return (
    <View style={styles.root}>
      {hideSubNav ? null : (
        <SubNavChips items={SUB_TABS} active={subTab} onChange={(id: string) => setSubTab(id as ClassesSubTab)} />
      )}

      {visibleSubTab === 'classes' && !hideStats ? <StatsRibbon stats={stats} /> : null}

      {stale && visibleSubTab === 'classes' ? (
        <View style={styles.staleBanner}>
          <Ionicons name="cloud-offline-outline" size={14} color={TEACHER.warning} />
          <Text style={styles.staleBannerText}>Showing Cached Data</Text>
        </View>
      ) : null}

      {visibleSubTab === 'classes' && renderClasses()}

      {visibleSubTab === 'timetable' && <TimetableView />}
      {visibleSubTab === 'schedule' && <ScheduleCalendarView />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    // Transparent so AppBackground's artwork shows through.
    backgroundColor: 'transparent',
  },
  statsWrap: {
    paddingHorizontal: TEACHER_SPACING.lg,
    paddingTop: TEACHER_SPACING.sm,
    paddingBottom: TEACHER_SPACING.md,
  },
  statsRibbonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    position: 'relative',
    overflow: 'hidden',
    minHeight: 108,
    borderRadius: TEACHER_RADIUS.lg,
    paddingVertical: 14,
    paddingHorizontal: 6,
    ...TEACHER.shadow.sm,
  },
  statDots: {
    position: 'absolute',
    right: 6,
    bottom: 8,
    width: 22,
    height: 22,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
  },
  statDot: {
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    backgroundColor: '#FFFFFF',
    ...TEACHER.shadow.sm,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: TEACHER.textSecondary,
    letterSpacing: 0.1,
  },
  classesSection: {
    paddingHorizontal: TEACHER_SPACING.lg,
    paddingBottom: TEACHER_SPACING.xxl,
  },
  empty: {
    padding: TEACHER_SPACING.xxxl,
    marginHorizontal: TEACHER_SPACING.lg,
    borderRadius: TEACHER_RADIUS.lg,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
  },
  emptyInner: {
    alignItems: 'center',
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEACHER.text,
    marginTop: TEACHER_SPACING.lg,
  },
  emptySub: {
    fontSize: 14,
    color: TEACHER.textMuted,
    textAlign: 'center',
    marginTop: TEACHER_SPACING.sm,
  },
  staleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: TEACHER_SPACING.lg,
    marginBottom: TEACHER_SPACING.sm,
    padding: TEACHER_SPACING.sm,
    backgroundColor: 'rgba(255,189,60,0.08)',
    borderRadius: TEACHER_RADIUS.sm,
  },
  staleBannerText: {
    fontSize: 12,
    color: TEACHER.warning,
    fontWeight: '600',
  },
});
