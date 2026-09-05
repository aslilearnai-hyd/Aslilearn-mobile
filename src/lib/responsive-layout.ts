/**
 * Shared breakpoints and layout math for phone / tablet / wide screens.
 * Use via role-specific hooks (e.g. useAdminResponsiveLayout) in UI layers.
 */

export const TABLET_SHORT_SIDE_MIN = 600;
export const TABLET_CONTENT_MIN = 768;
export const GRID_3_COLUMNS_MIN = 960;
export const GRID_4_COLUMNS_MIN = 1280;

export const ADMIN_GRID_GAP = 12;
export const ADMIN_FLOATING_TAB_BAR_PAD = 100;
/** Super-admin floating pill tab bar — use on ScrollView content, not the shell. */
export const SUPER_ADMIN_FLOATING_TAB_BAR_PAD = 100;
export const ADMIN_SHELL_PAD_COMPACT = 24;
export const EDUOTT_TAB_BAR_SCROLL_PAD = 88;
/** Student dashboard floating tab bar — keep list above the pill. */
export const STUDENT_FLOATING_TAB_BAR_RESERVE = 72;

export function studentFloatingTabBarReserve(bottomInset: number): number {
  return STUDENT_FLOATING_TAB_BAR_RESERVE + Math.max(bottomInset, 10);
}

export type ScreenTier = 'phone' | 'tablet' | 'wide';

export function isTabletLayout(width: number, height: number): boolean {
  return Math.min(width, height) >= TABLET_SHORT_SIDE_MIN;
}

export function getScreenTier(width: number, height: number): ScreenTier {
  const short = Math.min(width, height);
  if (short < TABLET_SHORT_SIDE_MIN) return 'phone';
  if (width >= GRID_4_COLUMNS_MIN) return 'wide';
  return 'tablet';
}

/** Card/list grid columns from available content width. */
export function gridColumnsForWidth(width: number, tablet: boolean): number {
  if (!tablet) return 1;
  if (width >= GRID_4_COLUMNS_MIN) return 4;
  if (width >= GRID_3_COLUMNS_MIN) return 3;
  return 2;
}

export function adminShellBottomPadding(tablet: boolean, showFloatingTabBar: boolean): number {
  if (!showFloatingTabBar) return ADMIN_SHELL_PAD_COMPACT;
  return ADMIN_FLOATING_TAB_BAR_PAD;
}

export function eduOttListScrollBottomPad(
  role: 'student' | 'teacher' | 'admin',
  tablet: boolean,
  basePad: number,
  bottomInset = 0,
): number {
  if (role === 'student') {
    return basePad + studentFloatingTabBarReserve(bottomInset);
  }
  return basePad;
}

export function adminModalMaxWidth(width: number, tablet: boolean): number | undefined {
  if (!tablet) return undefined;
  return Math.min(560, width - 48);
}
