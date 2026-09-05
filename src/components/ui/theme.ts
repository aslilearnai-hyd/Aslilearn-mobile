export const uiTheme = {
  colors: {
    primary: '#4f46e5',
    primaryDark: '#4338ca',
    text: '#0f172a',
    textMuted: '#526174',
    border: 'rgba(255,255,255,0.65)',
    surface: 'rgba(255,255,255,0.72)',
    background: '#f4f7fb',
    danger: '#dc2626',
    accent: '#f97316',
    primarySoft: '#eef2ff',
  },
  radius: {
    sm: 10,
    md: 14,
    lg: 18,
    xl: 24,
    full: 999,
  },
  spacing: {
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 28,
  },
};

export type UIButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
