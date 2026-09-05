import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { useIsTablet } from '../../../src/hooks/useIsTablet';

/** Horizontal padding in AdminScreenShell (spacing.md × 2). */
export const ADMIN_SHELL_PADDING = 32;
export const ADMIN_GRID_GAP = 12;
export const ADMIN_TAB_BAR_CLEARANCE_PHONE = 88;
export const ADMIN_TAB_BAR_CLEARANCE_TABLET = 24;

export type AdminLayoutTier = 'phone' | 'tablet' | 'wide';

const TIER_TABLET_MIN = 768;
const TIER_WIDE_MIN = 1280;

export function getAdminLayoutTier(width: number): AdminLayoutTier {
  if (width >= TIER_WIDE_MIN) return 'wide';
  if (width >= TIER_TABLET_MIN) return 'tablet';
  return 'phone';
}

/** Card grid columns from content width (Subjects, Teachers, Classes lists). */
export function getAdminGridColumns(width: number): number {
  const tier = getAdminLayoutTier(width);
  if (tier === 'wide') return 4;
  if (tier === 'tablet') return 3;
  return 1;
}

/**
 * Single responsive layout hook for the admin app.
 * Use this instead of ad-hoc width checks in each screen.
 */
export function useAdminResponsiveLayout() {
  const { width, height } = useWindowDimensions();
  const isTabletDevice = useIsTablet();
  const tier = getAdminLayoutTier(width);
  const isPhone = tier === 'phone';
  const isTablet = !isPhone;
  const isWide = tier === 'wide';

  const showBottomTabBar = !isTabletDevice;
  const gridColumns = getAdminGridColumns(width);
  const compactStats = isTablet;
  const modalMaxWidth = isPhone ? undefined : Math.min(560, width - 48);
  const contentPaddingBottom = showBottomTabBar
    ? 12
    : ADMIN_TAB_BAR_CLEARANCE_TABLET;

  const statsRowStyle = useMemo(
    () => ({
      flexDirection: 'row' as const,
      flexWrap: (isPhone ? 'wrap' : 'nowrap') as 'wrap' | 'nowrap',
      alignItems: (isPhone ? 'flex-start' : 'stretch') as 'flex-start' | 'stretch',
      gap: isPhone ? 8 : 12,
      marginBottom: 12,
      width: '100%' as const,
    }),
    [isPhone],
  );

  const statSlotStyle = useMemo(
    () =>
      isPhone
        ? { width: '48.5%' as const, flexGrow: 0, flexShrink: 0 }
        : { flex: 1, minWidth: 0, flexGrow: 1, flexShrink: 1 },
    [isPhone],
  );

  const listContentWidth = Math.max(0, width - ADMIN_SHELL_PADDING);

  return {
    width,
    height,
    tier,
    isPhone,
    isTablet,
    isWide,
    isTabletDevice,
    showBottomTabBar,
    gridColumns,
    gridGap: ADMIN_GRID_GAP,
    compactStats,
    statsRowStyle,
    statSlotStyle,
    contentPaddingBottom,
    /** Alias used by admin dashboard shell */
    shellPaddingBottom: contentPaddingBottom,
    modalMaxWidth,
    listContentWidth,
  };
}
