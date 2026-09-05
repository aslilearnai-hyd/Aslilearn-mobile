import { useMemo } from 'react';
import {
  ADMIN_RADIUS,
  ADMIN_SHADOW,
  ADMIN_SPACING,
  ADMIN_TYPO,
  adminGlassCard,
  getAdminColors,
  type AdminColorScheme,
  type AdminThemeColors,
} from '../../../src/theme/admin';

export function useAdminTheme() {
  // Admin stays light indigo — system dark mode previously flipped the portal
  // to a forest-green palette that does not match the web admin.
  const scheme: AdminColorScheme = 'light';
  const colors = useMemo(() => getAdminColors(scheme), [scheme]);
  const isDark = false;

  return {
    scheme,
    isDark,
    colors,
    spacing: ADMIN_SPACING,
    radius: ADMIN_RADIUS,
    shadow: ADMIN_SHADOW,
    typo: ADMIN_TYPO,
    glassCard: useMemo(() => adminGlassCard(colors), [colors]),
  };
}

export type AdminTheme = ReturnType<typeof useAdminTheme>;
export type { AdminThemeColors };
