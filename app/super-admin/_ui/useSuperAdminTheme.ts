import { useMemo } from 'react';
import { useColorScheme } from 'react-native';
import {
  ADMIN_RADIUS,
  ADMIN_SHADOW,
  ADMIN_SPACING,
  ADMIN_TYPO,
  adminGlassCard,
  type AdminColorScheme,
  type AdminThemeColors,
} from '../../../src/theme/admin';
import { getSuperAdminColors } from '../../../src/theme/superAdmin';

export function useSuperAdminTheme() {
  const systemScheme = useColorScheme();
  const scheme: AdminColorScheme = systemScheme === 'dark' ? 'dark' : 'light';
  const colors = useMemo(() => getSuperAdminColors(scheme), [scheme]);
  const isDark = scheme === 'dark';

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

export type SuperAdminTheme = ReturnType<typeof useSuperAdminTheme>;
export type { AdminThemeColors };
