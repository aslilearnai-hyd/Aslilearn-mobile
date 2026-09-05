/** Admin portal — same light sky / indigo / white language as teacher + student. */
import { Platform } from 'react-native';

export type AdminColorScheme = 'light' | 'dark';

export const ADMIN_SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
} as const;

export const ADMIN_RADIUS = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  full: 9999,
} as const;

export type AdminThemeColors = {
  bg: string;
  bgElevated: string;
  surface: string;
  surfaceGlass: string;
  surfaceBorder: string;
  surfaceHover: string;
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primaryMuted: string;
  secondary: string;
  accent: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  success: string;
  successMuted: string;
  warning: string;
  warningMuted: string;
  danger: string;
  dangerMuted: string;
  info: string;
  infoMuted: string;
  drawerBg: string;
  drawerSurface: string;
  drawerBorder: string;
  drawerText: string;
  drawerTextMuted: string;
  overlay: string;
  inputBg: string;
  inputBorder: string;
  skeleton: string;
  skeletonHighlight: string;
  headerGradient: readonly [string, string, string];
  drawerGradient: readonly [string, string];
  navActiveColor: string;
  navActiveBg: string;
  navActiveText: string;
  cardGradient: readonly [string, string];
  fabGradient: readonly [string, string];
  statGradients: readonly [string, string][];
  dashboardStatCards: readonly { bg: string; accent: string; iconBg: string }[];
};

const ADMIN_LIGHT: AdminThemeColors = {
  bg: 'transparent',
  bgElevated: '#F4F7FB',
  surface: '#FFFFFF',
  surfaceGlass: '#FFFFFF',
  surfaceBorder: 'rgba(226,232,240,0.95)',
  surfaceHover: '#F8FAFC',
  primary: '#6366F1',
  primaryDark: '#4F46E5',
  primaryLight: '#818CF8',
  primaryMuted: 'rgba(99,102,241,0.12)',
  secondary: '#F97316',
  accent: '#2563EB',
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#5B6779',
  textInverse: '#FFFFFF',
  success: '#059669',
  successMuted: 'rgba(5, 150, 105, 0.12)',
  warning: '#F59E0B',
  warningMuted: 'rgba(245, 158, 11, 0.12)',
  danger: '#EF4444',
  dangerMuted: 'rgba(239, 68, 68, 0.12)',
  info: '#0284C7',
  infoMuted: 'rgba(2, 132, 199, 0.12)',
  drawerBg: '#F8FAFC',
  drawerSurface: '#FFFFFF',
  drawerBorder: 'rgba(226,232,240,0.95)',
  drawerText: '#0F172A',
  drawerTextMuted: '#5B6779',
  overlay: 'rgba(15, 23, 42, 0.45)',
  inputBg: '#F8FAFC',
  inputBorder: 'rgba(99,102,241,0.18)',
  skeleton: '#E2E8F0',
  skeletonHighlight: '#F8FAFC',
  headerGradient: ['#7DD3FC', '#BAE6FD', '#DBEAFE'] as const,
  drawerGradient: ['#EEF2FF', '#F8FAFC'] as const,
  navActiveColor: '#4F46E5',
  navActiveBg: 'rgba(99,102,241,0.12)',
  navActiveText: '#4F46E5',
  cardGradient: ['#EEF2FF', '#FFFFFF'] as const,
  fabGradient: ['#6366F1', '#4F46E5'] as const,
  statGradients: [
    ['#FFFBEB', '#FFF7ED'],
    ['#F5F3FF', '#EEF2FF'],
    ['#F0FDFA', '#ECFDF5'],
    ['#E0F2FE', '#BAE6FD'],
    ['#FDF2F8', '#FCE7F3'],
    ['#EEF2FF', '#E0E7FF'],
  ] as const,
  dashboardStatCards: [
    { bg: '#FFFBEB', accent: '#EA580C', iconBg: '#FFEDD5' },
    { bg: '#F5F3FF', accent: '#6366F1', iconBg: '#EDE9FE' },
    { bg: '#F0F9FF', accent: '#0284C7', iconBg: '#E0F2FE' },
    { bg: '#EEF2FF', accent: '#4F46E5', iconBg: '#E0E7FF' },
    { bg: '#FDF2F8', accent: '#DB2777', iconBg: '#FCE7F3' },
    { bg: '#ECFDF5', accent: '#059669', iconBg: '#D1FAE5' },
  ] as const,
};

const ADMIN_DARK: AdminThemeColors = {
  bg: '#0F172A',
  bgElevated: '#1E293B',
  surface: '#1E293B',
  surfaceGlass: 'rgba(30, 41, 59, 0.92)',
  surfaceBorder: 'rgba(165, 180, 252, 0.18)',
  surfaceHover: '#312E81',
  primary: '#A5B4FC',
  primaryDark: '#818CF8',
  primaryLight: '#C7D2FE',
  primaryMuted: 'rgba(165, 180, 252, 0.16)',
  secondary: '#C4B5FD',
  accent: '#818CF8',
  text: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textMuted: '#94A3B8',
  textInverse: '#0F172A',
  success: '#34D399',
  successMuted: 'rgba(52, 211, 153, 0.16)',
  warning: '#FB923C',
  warningMuted: 'rgba(251, 146, 60, 0.16)',
  danger: '#FB7185',
  dangerMuted: 'rgba(251, 113, 133, 0.16)',
  info: '#60A5FA',
  infoMuted: 'rgba(96, 165, 250, 0.16)',
  drawerBg: '#0F172A',
  drawerSurface: 'rgba(248, 250, 252, 0.05)',
  drawerBorder: 'rgba(248, 250, 252, 0.08)',
  drawerText: '#F8FAFC',
  drawerTextMuted: 'rgba(248, 250, 252, 0.55)',
  overlay: 'rgba(0, 0, 0, 0.65)',
  inputBg: '#1E293B',
  inputBorder: '#4338CA',
  skeleton: '#334155',
  skeletonHighlight: '#4F46E5',
  headerGradient: ['#312E81', '#4F46E5', '#6D28D9'] as const,
  drawerGradient: ['#0F172A', '#1E293B'] as const,
  navActiveColor: '#C7D2FE',
  navActiveBg: 'rgba(79, 70, 229, 0.28)',
  navActiveText: '#F8FAFC',
  cardGradient: ['#1E293B', '#312E81'] as const,
  fabGradient: ['#818CF8', '#4F46E5'] as const,
  statGradients: [
    ['#818CF8', '#4F46E5'],
    ['#38BDF8', '#0284C7'],
    ['#C084FC', '#7C3AED'],
    ['#FB7185', '#E11D48'],
    ['#FDBA74', '#EA580C'],
    ['#A78BFA', '#6D28D9'],
  ] as const,
  dashboardStatCards: [
    { bg: '#312E81', accent: '#C7D2FE', iconBg: 'rgba(199, 210, 254, 0.2)' },
    { bg: '#1E3A5F', accent: '#7DD3FC', iconBg: 'rgba(125, 211, 252, 0.2)' },
    { bg: '#4C1D95', accent: '#DDD6FE', iconBg: 'rgba(221, 214, 254, 0.2)' },
    { bg: '#7C2D12', accent: '#FDBA74', iconBg: 'rgba(253, 186, 116, 0.2)' },
  ] as const,
};

export function getAdminColors(scheme: AdminColorScheme): AdminThemeColors {
  return scheme === 'dark' ? ADMIN_DARK : ADMIN_LIGHT;
}

export const ADMIN_SHADOW = {
  sm: Platform.select({
    ios: {
      shadowColor: '#64748B',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
    },
    default: {},
  })!,
  md: Platform.select({
    ios: {
      shadowColor: '#64748B',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    },
    default: {},
  })!,
  lg: Platform.select({
    ios: {
      shadowColor: '#64748B',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
    },
    default: {},
  })!,
} as const;

export const ADMIN_TYPO = {
  hero: { fontSize: 28, fontWeight: '800' as const, letterSpacing: -0.6 },
  title: { fontSize: 22, fontWeight: '800' as const, letterSpacing: -0.4 },
  section: { fontSize: 17, fontWeight: '700' as const, letterSpacing: -0.2 },
  body: { fontSize: 15, fontWeight: '500' as const, lineHeight: 22 },
  caption: { fontSize: 12, fontWeight: '600' as const },
  label: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 0.6, textTransform: 'uppercase' as const },
  stat: { fontSize: 26, fontWeight: '800' as const, letterSpacing: -0.8 },
} as const;

export function adminGlassCard(colors: AdminThemeColors) {
  return {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: ADMIN_RADIUS.lg,
    ...ADMIN_SHADOW.md,
  } as const;
}

export function adminGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}
