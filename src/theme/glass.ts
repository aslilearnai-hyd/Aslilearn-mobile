import { Platform } from 'react-native';
const IS_ANDROID = Platform.OS === 'android';

/**
 * Shared liquid-glass material tokens for the whole mobile app.
 * Role themes keep brand color; glass physics lives here.
 */

export type GlassTone = 'light' | 'medium' | 'strong';

export type GlassToneSpec = {
  colors: [string, string];
  intensity: number;
};

/** White-leaning sheens so pastel artwork supplies hue without muddying text. */
export const GLASS_TONES: Record<GlassTone, GlassToneSpec> = {
  light: {
    colors: ['rgba(255,255,255,0.38)', 'rgba(255,255,255,0.14)'],
    intensity: 42,
  },
  medium: {
    colors: ['rgba(255,255,255,0.55)', 'rgba(255,255,255,0.26)'],
    intensity: 55,
  },
  strong: {
    colors: ['rgba(255,255,255,0.76)', 'rgba(255,255,255,0.52)'],
    intensity: 70,
  },
};

/** Soft blue sheen for Vidya / AI surfaces. */
export const GLASS_BLUE: [string, string] = [
  'rgba(219,234,254,0.42)',
  'rgba(191,219,254,0.14)',
];

/** Brand-tinted liquid glass for student hero / headers. */
export const GLASS_VIOLET: [string, string] = [
  'rgba(237,233,254,0.58)',
  'rgba(196,181,253,0.22)',
];

/** Specular highlight (top-left catch light). */
export const GLASS_SPECULAR: [string, string, string] = [
  'rgba(255,255,255,0.55)',
  'rgba(255,255,255,0.12)',
  'rgba(255,255,255,0)',
];

export const GLASS_RIM = {
  top: 'rgba(255,255,255,0.92)',
  bottom: 'rgba(255,255,255,0.28)',
  border: IS_ANDROID ? 'rgba(226,232,240,0.95)' : 'rgba(255,255,255,0.65)',
} as const;

/** Nested cells inside a glass card. Always opaque to avoid bleed-through. */
export const GLASS_ROW = {
  fill: '#FFFFFF',
  fillStrong: '#FFFFFF',
  fillSoft: '#F8FAFC',
  border: 'rgba(226,232,240,0.95)',
} as const;

export const GLASS_RADIUS = {
  sm: 14,
  md: 18,
  card: 24,
  lg: 28,
  pill: 9999,
} as const;

/** Soft liquid depth — prefer over dense Material elevation. */
export const GLASS_SHADOW = {
  soft: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 28,
    elevation: IS_ANDROID ? 0 : 6,
  },
  sm: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: IS_ANDROID ? 0 : 3,
  },
} as const;

export function glassTone(tone: GlassTone = 'medium'): GlassToneSpec {
  return GLASS_TONES[tone];
}

/** Solid card / bar fill. Never use an absolute overlay for this — Android Fabric leaks those as empty white boxes. */
export function glassFillColor(tone: GlassTone = 'medium'): string {
  return tone === 'light' ? '#FAFBFC' : '#FFFFFF';
}
