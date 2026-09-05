/** Shared visual language for every student and teacher AI experience. */
import { GLASS_RIM, GLASS_ROW, GLASS_SHADOW } from './glass';

export const AI = {
  canvas: 'transparent',
  canvasDeep: 'transparent',
  surface: GLASS_ROW.fillStrong,
  surfaceMuted: GLASS_ROW.fill,
  primary: '#4F46E5',
  primaryPressed: '#4338CA',
  primarySoft: 'rgba(79,70,229,0.12)',
  primaryBorder: 'rgba(199,210,254,0.85)',
  sky: '#0284C7',
  skySoft: 'rgba(240,249,255,0.72)',
  skyBorder: 'rgba(186,230,253,0.85)',
  orange: '#C2410C',
  orangeSoft: 'rgba(255,247,237,0.72)',
  orangeBorder: 'rgba(253,215,170,0.85)',
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#5B6779',
  border: GLASS_RIM.border,
  success: '#047857',
  danger: '#DC2626',
  warning: '#B45309',
  roleStudent: '#047857',
  roleTeacher: '#C2410C',
} as const;

export const AI_RADIUS = {
  sm: 12,
  md: 16,
  lg: 22,
  full: 999,
} as const;

export const AI_SPACING = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
  xxl: 36,
} as const;

export const AI_TYPE = {
  eyebrow: { fontSize: 15, lineHeight: 20, fontWeight: '800' as const, letterSpacing: 1 },
  caption: { fontSize: 15, lineHeight: 21, fontWeight: '600' as const },
  body: { fontSize: 17, lineHeight: 26, fontWeight: '500' as const },
  title: { fontSize: 22, lineHeight: 30, fontWeight: '800' as const },
  hero: { fontSize: 32, lineHeight: 39, fontWeight: '900' as const, letterSpacing: -0.6 },
} as const;

export const AI_SHADOW = GLASS_SHADOW.soft;

/** Kept for legacy imports — prefer GlassPanel over hero gradients. */
export const AI_HERO_GRADIENT = ['rgba(238,242,255,0.55)', 'rgba(255,255,255,0.35)', 'rgba(255,247,237,0.45)'] as const;
