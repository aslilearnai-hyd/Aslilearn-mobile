import { useAdminResponsiveLayout } from './useAdminResponsiveLayout';

export const ADMIN_LIST_GRID_COLUMNS = 3;
export { ADMIN_GRID_GAP as ADMIN_LIST_GRID_GAP } from './useAdminResponsiveLayout';

/** Tablet list/card grid — delegates to useAdminResponsiveLayout. */
export function useAdminListLayout() {
  const layout = useAdminResponsiveLayout();
  const cols = Math.max(1, layout.gridColumns);
  const gapTotal = layout.gridGap * (cols - 1);
  const gridCellWidth =
    cols <= 1
      ? layout.listContentWidth
      : Math.max(0, Math.floor((layout.listContentWidth - gapTotal) / cols));
  return {
    isTablet: layout.isTablet,
    modalMaxWidth: layout.modalMaxWidth,
    gridColumns: layout.gridColumns,
    gridGap: layout.gridGap,
    listContentWidth: layout.listContentWidth,
    gridCellWidth,
  };
}
