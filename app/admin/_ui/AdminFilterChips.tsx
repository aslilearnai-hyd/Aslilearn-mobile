import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAdminTheme } from './useAdminTheme';

export type FilterChip = {
  id: string;
  label: string;
  shortLabel?: string;
};

type Props = {
  chips: FilterChip[];
  selected: string;
  onSelect: (id: string) => void;
};

function TabDivider({ color }: { color: string }) {
  return (
    <View style={styles.dividerWrap}>
      <Text style={[styles.dividerText, { color }]}>|</Text>
    </View>
  );
}

function TabRow({
  chips,
  selected,
  onSelect,
  colors,
  compact,
}: {
  chips: FilterChip[];
  selected: string;
  onSelect: (id: string) => void;
  colors: ReturnType<typeof useAdminTheme>['colors'];
  compact?: boolean;
}) {
  return (
    <>
      {chips.map((chip, index) => {
        const active = chip.id === selected;
        const caption = chip.shortLabel ?? chip.label;
        return (
          <React.Fragment key={chip.id}>
            {index > 0 ? <TabDivider color={colors.textMuted} /> : null}
            <Pressable
              onPress={() => onSelect(chip.id)}
              style={[
                styles.tab,
                compact && styles.tabCompact,
                { backgroundColor: active ? colors.primaryMuted : colors.surface },
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: active ? colors.primary : colors.textSecondary },
                  active && styles.tabTextActive,
                ]}
                numberOfLines={1}
              >
                {caption}
              </Text>
            </Pressable>
          </React.Fragment>
        );
      })}
    </>
  );
}

export default function AdminFilterChips({ chips, selected, onSelect }: Props) {
  const { colors } = useAdminTheme();
  const scrollable = chips.length > 4;

  if (scrollable) {
    return (
      <View style={[styles.wrap, { borderColor: colors.surfaceBorder, backgroundColor: colors.surface }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollRow}>
          <TabRow chips={chips} selected={selected} onSelect={onSelect} colors={colors} compact />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { borderColor: colors.surfaceBorder, backgroundColor: colors.surface }]}>
      <TabRow chips={chips} selected={selected} onSelect={onSelect} colors={colors} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  scrollRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minWidth: '100%',
  },
  tab: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  tabCompact: {
    flex: 0,
    minWidth: 104,
    paddingHorizontal: 12,
  },
  tabText: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  tabTextActive: {
    fontWeight: '800',
  },
  dividerWrap: {
    width: 14,
    alignSelf: 'stretch',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dividerText: {
    fontSize: 16,
    fontWeight: '300',
    lineHeight: 18,
  },
});
