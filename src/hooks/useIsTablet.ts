import { useWindowDimensions } from 'react-native';

export const TABLET_MIN_SHORT_SIDE = 600;
export const ADMIN_SIDEBAR_WIDTH = 260;

/** True when the device short edge is tablet-sized (portrait or landscape). */
export function useIsTablet(threshold = TABLET_MIN_SHORT_SIDE): boolean {
  const { width, height } = useWindowDimensions();
  return Math.min(width, height) >= threshold;
}

/**
 * Smart board / TV / large tablet.
 * 1080p TVs often report ~960 CSS px at density 2, so a 1024-width check misses them
 * and the PDF stays in phone "fit width" mode (looks zoomed in).
 */
export function isTvOrBoardDisplay(width: number, height: number): boolean {
  const shortSide = Math.min(width, height);
  const longSide = Math.max(width, height);
  return shortSide >= 500 && longSide >= 900;
}
