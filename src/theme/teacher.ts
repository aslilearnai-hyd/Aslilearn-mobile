/** Clean Classroom — light teacher portal theme */
import { Platform } from 'react-native';

export const TEACHER = {
  bg: 'transparent',
  surface: '#FFFFFF',
  cardBg: '#FFFFFF',
  surfaceGlass: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceBorder: 'rgba(226,232,240,0.95)',
  surfaceHover: '#F8FAFC',
  primary: '#6366F1',
  primaryDark: '#4F46E5',
  primaryLight: '#818CF8',
  secondary: '#F97316',
  success: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  text: '#0F172A',
  textSecondary: '#475569',
  // Was #94A3B8 — only 2.5:1 on white and ~1.8:1 over the pastel page artwork.
  // #5B6779 holds ~5.6:1 on the artwork and still reads as clearly secondary.
  textMuted: '#5B6779',
  textOnPrimary: '#FFFFFF',
  headerGradient: ['#7DD3FC', '#BAE6FD', '#DBEAFE'] as const,
  heroGradient: ['#4338CA', '#4F46E5', '#6366F1'] as const,
  cardGradient: ['#EEF2FF', '#FFFFFF'] as const,
  tabBarBg: 'rgba(255,255,255,0.98)',
  tabBarBorder: '#E2E8F0',
  // Inactive tab labels sit at 10px on a translucent bar — #94A3B8 was unreadable.
  navInactive: '#5B6779',
  navActiveBg: 'rgba(99,102,241,0.12)',
  navActiveText: '#4F46E5',
  fabGradient: ['#6366F1', '#4F46E5'] as const,
  goldAccent: '#F59E0B',
  shadow: {
    sm: {
      shadowColor: '#64748B',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: Platform.OS === 'android' ? 0 : 2,
    },
    md: {
      shadowColor: '#64748B',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.10,
      shadowRadius: 8,
      elevation: Platform.OS === 'android' ? 1 : 4,
    },
    lg: {
      shadowColor: '#64748B',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: Platform.OS === 'android' ? 1 : 6,
    },
  },
};

export const TEACHER_SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  section: 28,
};

export const TEACHER_RADIUS = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  card: 24,
  full: 9999,
  pill: 9999,
  chip: 16,
};

export const TEACHER_TYPO = {
  hero:    { fontSize: 30, fontWeight: '900' as const, letterSpacing: -0.8 },
  section: { fontSize: 20, fontWeight: '800' as const, letterSpacing: -0.4 },
  body:    { fontSize: 15, fontWeight: '500' as const, lineHeight: 22 },
  caption: { fontSize: 12, fontWeight: '700' as const, letterSpacing: 0.2 },
  label:   { fontSize: 11, fontWeight: '800' as const, letterSpacing: 0.8 },
  number:  { fontSize: 28, fontWeight: '900' as const, letterSpacing: -1.0 },
};

export function teacherGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export function performanceBadge(score: number): 'good' | 'average' | 'at-risk' {
  if (score >= 75) return 'good';
  if (score >= 50) return 'average';
  return 'at-risk';
}

export const PERFORMANCE_COLORS = {
  good:     TEACHER.success,
  average:  TEACHER.warning,
  'at-risk': TEACHER.danger,
} as const;

/** Teacher subject pills — vivid indigo / violet / amber (not student green). */
export const TEACHER_SUBJECT_BADGES = [
  { bg: '#C7D2FE', text: '#312E81', border: '#6366F1' },
  { bg: '#FDBA74', text: '#7C2D12', border: '#EA580C' },
  { bg: '#DDD6FE', text: '#5B21B6', border: '#8B5CF6' },
  { bg: '#93C5FD', text: '#1E3A8A', border: '#3B82F6' },
  { bg: '#F9A8D4', text: '#831843', border: '#EC4899' },
  { bg: '#67E8F9', text: '#155E75', border: '#06B6D4' },
] as const;

export type TeacherSubjectBadgePalette = (typeof TEACHER_SUBJECT_BADGES)[number];

/** Map common subjects to consistent teacher-theme colors. */
export function teacherSubjectBadgePalette(
  subjectLabel: string,
  index = 0
): TeacherSubjectBadgePalette {
  const n = subjectLabel.toLowerCase();
  if (n.includes('physics')) return TEACHER_SUBJECT_BADGES[0];
  if (n.includes('chem')) return TEACHER_SUBJECT_BADGES[1];
  if (n.includes('math')) return TEACHER_SUBJECT_BADGES[3];
  if (n.includes('bio')) return TEACHER_SUBJECT_BADGES[5];
  if (n.includes('english')) return TEACHER_SUBJECT_BADGES[4];
  if (n.includes('science')) return TEACHER_SUBJECT_BADGES[5];
  if (n.includes('social') || n.includes('history') || n.includes('civics') || n.includes('geography')) {
    return TEACHER_SUBJECT_BADGES[2];
  }
  if (n.includes('hindi') || n.includes('telugu') || n.includes('language')) {
    return TEACHER_SUBJECT_BADGES[4];
  }
  return TEACHER_SUBJECT_BADGES[index % TEACHER_SUBJECT_BADGES.length];
}

/** Distinct Ionicons per subject for learning-path / catalog cards. */
export function teacherSubjectIconName(subjectLabel: string): string {
  const n = subjectLabel.toLowerCase();
  if (n.includes('bio')) return 'leaf-outline';
  if (n.includes('chem')) return 'flask-outline';
  if (n.includes('physics')) return 'nuclear-outline';
  if (n.includes('math')) return 'calculator-outline';
  if (n.includes('english')) return 'book-outline';
  if (n.includes('science')) return 'planet-outline';
  if (n.includes('social') || n.includes('history') || n.includes('civics') || n.includes('geography')) {
    return 'globe-outline';
  }
  if (n.includes('hindi') || n.includes('telugu') || n.includes('language') || n.includes('sl ') || n.startsWith('sl') || n.includes('tl ') || n.startsWith('tl')) {
    return 'chatbubbles-outline';
  }
  if (n.includes('computer') || n.includes('coding') || n.includes('it')) return 'code-slash-outline';
  return 'library-outline';
}

/** Card style for light surfaces */
export const glassCard = {
  backgroundColor: '#FFFFFF',
  borderWidth: 1,
  borderColor: TEACHER.surfaceBorder,
  borderRadius: TEACHER_RADIUS.lg,
  shadowColor: '#64748B',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: Platform.OS === 'android' ? 0 : 2,
} as const;
