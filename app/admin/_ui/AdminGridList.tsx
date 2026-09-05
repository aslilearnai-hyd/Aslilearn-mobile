import React, { ReactNode, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { ADMIN_LIST_GRID_GAP } from './useAdminListLayout';

type Props<T> = {
  data: T[];
  columns: number;
  gap?: number;
  /** @deprecated Cells use flex so the row fills the container width on tablet. */
  gridCellWidth?: number;
  keyExtractor: (item: T, index: number) => string;
  renderItem: (item: T, index: number) => ReactNode;
};

/** Non-scrollable grid — avoids FlatList swallowing nested card scroll gestures. */
export default function AdminGridList<T>({
  data,
  columns,
  gap = ADMIN_LIST_GRID_GAP,
  keyExtractor,
  renderItem,
}: Props<T>) {
  const safeColumns = Math.max(1, columns || 1);
  const rows = useMemo(() => {
    const result: T[][] = [];
    for (let i = 0; i < data.length; i += safeColumns) {
      result.push(data.slice(i, i + safeColumns));
    }
    return result;
  }, [data, safeColumns]);

  return (
    <View style={[styles.list, { gap }]}>
      {rows.map((row, rowIndex) => (
        <View key={`grid-row-${rowIndex}`} style={[styles.row, { gap }]}>
          {row.map((item, colIndex) => {
            const index = rowIndex * safeColumns + colIndex;
            return (
              <View key={keyExtractor(item, index)} style={styles.cell}>
                {renderItem(item, index)}
              </View>
            );
          })}
          {row.length < safeColumns
            ? Array.from({ length: safeColumns - row.length }).map((_, padIndex) => (
                <View key={`grid-pad-${rowIndex}-${padIndex}`} style={styles.cellPad} />
              ))
            : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    width: '100%',
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    width: '100%',
  },
  cell: {
    flex: 1,
    minWidth: 0,
    alignSelf: 'stretch',
  },
  cellPad: {
    flex: 1,
    minWidth: 0,
  },
});
