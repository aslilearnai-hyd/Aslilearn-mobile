/**
 * Student theme — premium scholar UI.
 *
 * Violet-family, sitting on the shared pastel artwork (see AppBackground).
 * Deliberately a step away from the teacher theme's indigo (#6366F1) so the two
 * roles stay tellable apart, while staying in the same tonal family so they
 * read as one product. Replaced the previous emerald palette, whose white-on-
 * primary buttons only reached 2.54:1; this primary holds 5.17:1.
 */
import { Platform } from 'react-native';
import { GLASS_VIOLET } from './glass';

export const STUDENT = {
  bg: '#f5f3ff',
  bgAccent: '#ede9fe',
  surface: '#FFFFFF',
  surfaceGlass: '#FFFFFF',
  glassSheen: GLASS_VIOLET,
  surfaceDark: '#0f172a',
  surfaceElevated: '#FFFFFF',
  surfaceBorder: 'rgba(226,232,240,0.95)',
  surfaceHover: '#F8FAFC',
  primary: '#6d5bd0',
  primaryDark: '#5443b8',
  primaryLight: '#9b8ae6',
  accent: '#2563eb',
  accentSoft: '#dbeafe',
  warning: '#f59e0b',
  danger: '#ef4444',
  // Semantic success stays green — it encodes meaning, not brand.
  success: '#059669',
  text: '#0f172a',
  textSecondary: '#475569',
  // Darkened for legibility over the pastel page artwork (see AppBackground).
  textMuted: '#5b6779',
  textOnPrimary: '#ffffff',
  headerGradient: ['#4C3BA6', '#5F4CC4', '#7C6BDA'] as const,
  heroGradient: ['#4C3BA6', '#6D5BD0', '#8B7AE0'] as const,
  cardGradient: ['#ede9fe', '#f5f3ff'] as const,
  tabBarBg: '#FFFFFF',
  tabBarBorder: 'rgba(109,91,208,0.20)',
  // Inactive tab labels sit at 9px on a translucent bar — #94a3b8 was unreadable.
  navInactive: '#5b6779',
  navActiveBg: '#e8e3fa',
  navActiveText: '#5443b8',
  statGradients: {
    today: ['#f97316', '#fb923c'] as const,
    study: ['#2563eb', '#3b82f6'] as const,
    week: ['#0d9488', '#14b8a6'] as const,
    efficiency: ['#7c3aed', '#8b5cf6'] as const,
    rank: ['#2563eb', '#3b82f6'] as const,
    accuracy: ['#16a34a', '#22c55e'] as const,
    questions: ['#d97706', '#f59e0b'] as const,
  },
  shadow: {
    soft: {
      shadowColor: '#6d5bd0',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1,
      shadowRadius: 24,
      elevation: Platform.OS === 'android' ? 1 : 8,
    },
    sm: {
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: Platform.OS === 'android' ? 0 : 3,
    },
    md: {
      shadowColor: '#5443b8',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.1,
      shadowRadius: 16,
      elevation: Platform.OS === 'android' ? 1 : 8,
    },
    lg: {
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
      elevation: Platform.OS === 'android' ? 1 : 12,
    },
  },
};

export const STUDENT_SHADOW = STUDENT.shadow;

/** Soft sky-blue shell used on Home sections (calendar, tasks, adaptive). */
export const STUDENT_SKY = {
  gradient: ['#7EC8E8', '#A8D8F0', '#C8E8F8'] as const,
  title: '#0C4A6E',
  shellBorder: 'rgba(14, 116, 144, 0.18)',
  innerBg: 'rgba(255,255,255,0.88)',
  innerBorder: 'rgba(255,255,255,0.95)',
  chipBg: '#E0F2FE',
  weekHead: '#E8F4FC',
  accent: '#0284C7',
  accentDark: '#0369A1',
  accentSoft: '#38BDF8',
  todayBg: 'rgba(14, 165, 233, 0.16)',
  dayCell: 'rgba(255,255,255,0.72)',
  legendText: '#0C4A6E',
  divider: 'rgba(14, 116, 144, 0.14)',
  cardBg: 'rgba(255,255,255,0.72)',
  cardBorder: 'rgba(14, 116, 144, 0.16)',
} as const;

export const STUDENT_SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const STUDENT_RADIUS = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  xxl: 28,
  card: 24,
  inner: 16,
  full: 9999,
};

export const STUDENT_ANIMATION = {
  fast: 180,
  normal: 280,
  slow: 420,
};

export const STUDENT_TYPO = {
  hero: { fontSize: 36, fontWeight: '800' as const, letterSpacing: -1 },
  section: { fontSize: 22, fontWeight: '800' as const, letterSpacing: -0.4 },
  body: { fontSize: 15, fontWeight: '500' as const },
  caption: { fontSize: 12, fontWeight: '600' as const },
  label: { fontSize: 11, fontWeight: '700' as const },
};

export const SUBJECT_COLORS = [
  '#2563eb',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ef4444',
  '#06b6d4',
] as const;

export function studentGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}
