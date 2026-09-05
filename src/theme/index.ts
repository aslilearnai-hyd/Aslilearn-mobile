export {
  GLASS_TONES,
  GLASS_BLUE,
  GLASS_VIOLET,
  GLASS_SPECULAR,
  GLASS_RIM,
  GLASS_ROW,
  GLASS_RADIUS,
  GLASS_SHADOW,
  glassTone,
} from './glass';
export type { GlassTone, GlassToneSpec } from './glass';

export const COLORS = {
  primary: '#4F46E5',
  primaryDark: '#4338CA',
  primaryLight: '#EEF2FF',
  secondary: '#0284C7',
  accent: '#F97316',

  student: '#10B981',
  teacher: '#F59E0B',
  admin: '#6366F1',
  superAdmin: '#8B5CF6',

  bg: '#F4F7FB',
  card: '#FFFFFF',
  border: '#E2E8F0',
  divider: 'rgba(237,242,248,0.55)',

  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#526174',
  textInverse: '#FFFFFF',

  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',

  gradientStudent: ['#10B981', '#059669'] as const,
  gradientTeacher: ['#F59E0B', '#D97706'] as const,
  gradientAdmin: ['#3B82F6', '#2563EB'] as const,
  gradientSuperAdmin: ['#8B5CF6', '#7C3AED'] as const,
  gradientBlue: ['#4F46E5', '#2563EB'] as const,
  gradientSky: ['#0284C7', '#4F46E5'] as const,
};

export const SPACING = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 30,
  xxxl: 40,
};

export const RADIUS = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  full: 9999,
};

export const SHADOW = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const FONT = {
  xs: 15,
  sm: 15,
  base: 16,
  md: 17,
  lg: 18,
  xl: 22,
  xxl: 24,
  xxxl: 28,
  h1: 36,
  h0: 42,
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

export type UserRole = 'student' | 'teacher' | 'admin' | 'super-admin';

export function getRoleGradient(role: UserRole): readonly [string, string] {
  switch (role) {
    case 'student':
      return COLORS.gradientStudent;
    case 'teacher':
      return COLORS.gradientTeacher;
    case 'admin':
      return COLORS.gradientAdmin;
    case 'super-admin':
      return COLORS.gradientSuperAdmin;
    default:
      return COLORS.gradientBlue;
  }
}

export function getRoleColor(role: UserRole): string {
  switch (role) {
    case 'student':
      return COLORS.student;
    case 'teacher':
      return COLORS.teacher;
    case 'admin':
      return COLORS.admin;
    case 'super-admin':
      return COLORS.superAdmin;
    default:
      return COLORS.primary;
  }
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}
