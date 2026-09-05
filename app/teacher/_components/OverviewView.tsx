import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import WeeklyDigestCard from '../../../src/components/student/WeeklyDigestCard';
import { resolveTeacherDisplayName } from '../../../src/lib/teacher-text';
import { TEACHER, TEACHER_SPACING, TEACHER_TYPO } from '../../../src/theme/teacher';
import type { TeacherNavId } from '../../../src/components/teacher/TeacherNavDrawer';

type Stats = {
  totalStudents: number;
  totalClasses: number;
  totalVideos: number;
};

type Props = {
  user?: any;
  stats: Stats;
  onGo: (id: TeacherNavId) => void;
};

type StatTone = 'amber' | 'violet' | 'teal';
type StatMotif = 'wave' | 'bars' | 'play';

const TONES: Record<
  StatTone,
  {
    surface: readonly [string, string];
    border: string;
    icon: readonly [string, string];
    accent: string;
  }
> = {
  amber: {
    surface: ['#FFFBEB', '#FFF7ED'],
    border: '#FDE68A',
    icon: ['#F59E0B', '#EA580C'],
    accent: '#FBBF24',
  },
  violet: {
    surface: ['#F5F3FF', '#EEF2FF'],
    border: '#DDD6FE',
    icon: ['#8B5CF6', '#4F46E5'],
    accent: '#A78BFA',
  },
  teal: {
    surface: ['#F0FDFA', '#ECFDF5'],
    border: '#99F6E4',
    icon: ['#14B8A6', '#059669'],
    accent: '#2DD4BF',
  },
};

const STATS: Array<{
  key: keyof Stats;
  label: string;
  caption: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: StatTone;
  motif: StatMotif;
  tab: TeacherNavId;
}> = [
  {
    key: 'totalStudents',
    label: 'Total Students',
    caption: 'Across All Your Classes',
    icon: 'people',
    tone: 'amber',
    motif: 'wave',
    tab: 'students',
  },
  {
    key: 'totalClasses',
    label: 'Active Classes',
    caption: 'Currently Running',
    icon: 'school',
    tone: 'violet',
    motif: 'bars',
    tab: 'classes',
  },
  {
    key: 'totalVideos',
    label: 'Videos',
    caption: 'Learning paths + IIT videos',
    icon: 'play',
    tone: 'teal',
    motif: 'play',
    tab: 'eduott',
  },
];

const SHORTCUTS: Array<{
  tab: TeacherNavId;
  label: string;
  hint: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { tab: 'calendar', label: 'Calendar', hint: 'Timetable & Schedule', icon: 'calendar-outline' },
  { tab: 'vidya-ai', label: 'Vidya AI', hint: 'Generate Teaching Aids', icon: 'sparkles-outline' },
];

function StatMotifArt({ motif, color }: { motif: StatMotif; color: string }) {
  if (motif === 'wave') {
    return (
      <Svg width={92} height={40} viewBox="0 0 120 48">
        <Path
          d="M0 34c14 0 14-16 28-16s14 16 28 16 14-20 28-20 14 12 28 12"
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
          fill="none"
          opacity={0.55}
        />
      </Svg>
    );
  }
  if (motif === 'bars') {
    return (
      <Svg width={92} height={40} viewBox="0 0 120 48">
        {[0, 1, 2, 3, 4].map((i) => (
          <Rect
            key={i}
            x={8 + i * 22}
            y={44 - (10 + i * 7)}
            width={12}
            height={10 + i * 7}
            rx={4}
            fill={color}
            opacity={0.3 + i * 0.12}
          />
        ))}
      </Svg>
    );
  }
  return (
    <Svg width={92} height={40} viewBox="0 0 120 48">
      <Circle cx={92} cy={24} r={20} fill={color} opacity={0.25} />
      <Path d="M87 15l13 9-13 9V15z" fill={color} opacity={0.6} />
    </Svg>
  );
}

function OverviewStatCard({
  item,
  value,
  onPress,
}: {
  item: (typeof STATS)[number];
  value: number;
  onPress: () => void;
}) {
  const tone = TONES[item.tone];
  return (
    <Pressable onPress={onPress} style={styles.statPress}>
      <LinearGradient
        colors={[...tone.surface]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.statCard, { borderColor: tone.border }]}
      >
        <View style={styles.motif}>
          <StatMotifArt motif={item.motif} color={tone.accent} />
        </View>
        <View style={styles.statTop}>
          <Text style={styles.statLabel} numberOfLines={2}>
            {item.label}
          </Text>
          <LinearGradient
            colors={[...tone.icon]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statIcon}
          >
            <Ionicons name={item.icon} size={16} color="#FFFFFF" />
          </LinearGradient>
        </View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statCaption} numberOfLines={2}>
          {item.caption}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

export default function OverviewView({ user, stats, onGo }: Props) {
  const name = resolveTeacherDisplayName(user);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#0F766E', '#0284C7', '#0891B2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.welcome}
      >
        <Text style={styles.welcomeTitle}>Welcome,</Text>
        <Text style={styles.welcomeName}>{name}!</Text>
        <Text style={styles.welcomeSub}>
          Your Classes, Students, And Teaching Tools Are Ready. Pick Up Where You Left Off.
        </Text>
      </LinearGradient>

      <View style={styles.statsGrid}>
        {STATS.map((item) => (
          <OverviewStatCard
            key={item.key}
            item={item}
            value={stats[item.key]}
            onPress={() => onGo(item.tab)}
          />
        ))}
      </View>

      <View style={styles.shortcutGrid}>
        {SHORTCUTS.map((item) => (
          <Pressable key={item.tab} onPress={() => onGo(item.tab)} style={styles.shortcutPress}>
            <View style={styles.shortcutCard}>
              <Ionicons name={item.icon} size={20} color={TEACHER.primaryDark} />
              <Text style={styles.shortcutLabel}>{item.label}</Text>
              <Text style={styles.shortcutHint}>{item.hint}</Text>
            </View>
          </Pressable>
        ))}
      </View>

      <WeeklyDigestCard apiBase="/api/teacher" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: TEACHER_SPACING.lg },
  welcome: {
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 22,
    overflow: 'hidden',
  },
  welcomeTitle: {
    ...TEACHER_TYPO.hero,
    fontSize: 26,
    color: '#FFFFFF',
  },
  welcomeName: {
    ...TEACHER_TYPO.hero,
    fontSize: 26,
    color: '#FFFFFF',
  },
  welcomeSub: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    color: 'rgba(255,255,255,0.88)',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  statPress: {
    flex: 1,
    minWidth: 0,
  },
  statCard: {
    minHeight: 132,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingTop: 12,
    paddingBottom: 12,
    overflow: 'hidden',
    ...TEACHER.shadow.sm,
  },
  motif: {
    position: 'absolute',
    right: -4,
    bottom: -2,
    opacity: 0.95,
  },
  statTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 4,
    zIndex: 1,
  },
  statLabel: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
    color: '#475569',
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    marginTop: 10,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.8,
    color: '#0F172A',
    zIndex: 1,
  },
  statCaption: {
    marginTop: 6,
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 13,
    color: '#64748B',
    zIndex: 1,
    maxWidth: '78%',
  },
  shortcutGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  shortcutPress: {
    flexGrow: 1,
    flexBasis: '46%',
    minWidth: 140,
  },
  shortcutCard: {
    minHeight: 88,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 14,
  },
  shortcutLabel: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '800',
    color: TEACHER.text,
  },
  shortcutHint: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: TEACHER.textMuted,
  },
});
