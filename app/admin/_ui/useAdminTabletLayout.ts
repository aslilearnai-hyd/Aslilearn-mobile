import { useCallback, useMemo, useState } from 'react';
import { LayoutChangeEvent, useWindowDimensions } from 'react-native';
import {
  ADMIN_GRID_GAP,
  TABLET_CONTENT_MIN,
  gridColumnsForWidth,
} from '../../../src/lib/responsive-layout';
import { useAdminResponsiveLayout } from './useAdminResponsiveLayout';

const CONTENT_MAX = 1080;

export function useAdminTabletLayout(shellPaddingMd = 16) {
  const { width: windowWidth } = useWindowDimensions();
  const responsive = useAdminResponsiveLayout();
  const [measuredWidth, setMeasuredWidth] = useState(0);

  const onShellLayout = useCallback((event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    if (next > 0) {
      setMeasuredWidth((prev) => (Math.abs(prev - next) < 1 ? prev : next));
    }
  }, []);

  return useMemo(() => {
    const layoutWidth = measuredWidth > 0 ? measuredWidth : windowWidth;
    const isTablet = layoutWidth >= TABLET_CONTENT_MIN;
    const contentWidth =
      measuredWidth > 0
        ? Math.min(measuredWidth, CONTENT_MAX)
        : Math.min(windowWidth, CONTENT_MAX) - shellPaddingMd * 2;
    const gridColumns = gridColumnsForWidth(layoutWidth, isTablet);
    const gridInnerWidth = contentWidth;
    const cardWidth =
      gridColumns > 1
        ? (gridInnerWidth - ADMIN_GRID_GAP * (gridColumns - 1)) / gridColumns
        : gridInnerWidth;

    return {
      isTablet,
      contentWidth,
      cardWidth,
      statWidth: undefined as number | undefined,
      modalMaxWidth: responsive.modalMaxWidth,
      gridGap: ADMIN_GRID_GAP,
      contentMax: CONTENT_MAX,
      onShellLayout,
      layoutReady: measuredWidth > 0,
      measuredWidth,
      gridColumns,
    };
  }, [measuredWidth, windowWidth, shellPaddingMd, responsive.modalMaxWidth]);
}

/** Multi-column grid for admin list/card views (e.g. EduOTT videos). */
export function useAdminGridLayout(
  shellPaddingMd = 16,
  itemCount = 0,
  options?: { columnsAt768?: number; columnsAt1024?: number },
) {
  const { width: windowWidth } = useWindowDimensions();
  const layout = useAdminTabletLayout(shellPaddingMd);
  const columnsAt768 = options?.columnsAt768 ?? 2;
  const columnsAt1024 = options?.columnsAt1024 ?? 3;
  const maxColumns = !layout.isTablet
    ? 1
    : windowWidth >= 1024
      ? columnsAt1024
      : columnsAt768;
  const numColumns = itemCount > 0 ? Math.min(maxColumns, itemCount) : maxColumns;
  const cardWidth =
    numColumns > 1
      ? (layout.contentWidth - ADMIN_GRID_GAP * (numColumns - 1)) / numColumns
      : layout.contentWidth;

  return {
    ...layout,
    numColumns,
    cardWidth,
    isGrid: numColumns > 1,
  };
}
