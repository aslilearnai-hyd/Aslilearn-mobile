import React, { useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import GlassPanel from '../ui/GlassPanel';
import { TEACHER, TEACHER_RADIUS, TEACHER_SPACING, TEACHER_TYPO } from '../../theme/teacher';
import { GLASS_ROW } from '../../theme/glass';

export type FilterOption = {
  value: string | null;
  label: string;
  count?: number;
};

type Props = {
  label: string;
  value: string | null;
  placeholder: string;
  options: FilterOption[];
  onChange: (value: string | null) => void;
};

export default function FilterDropdown({ label, value, placeholder, options, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const listMaxHeight = Math.min(Math.round(height * 0.52), 440);

  return (
    <>
      <Pressable
        style={styles.trigger}
        onPress={() => setOpen(true)}
        hitSlop={3}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label || placeholder}`}
        accessibilityHint="Opens the filter options"
        accessibilityState={{ expanded: open }}
      >
        <Ionicons
          name="filter"
          size={14}
          color={TEACHER.primaryLight}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
        <Text style={styles.triggerText} numberOfLines={1}>
          {selected?.label || placeholder}
        </Text>
        <Ionicons
          name="chevron-down"
          size={14}
          color={TEACHER.textMuted}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setOpen(false)}
            accessibilityRole="button"
            accessibilityLabel={`Close ${label} filter`}
          />
          <View style={[styles.sheetWrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <GlassPanel
              tone="strong"
              elevated
              radius={24}
              bordered
              style={styles.sheet}
              contentStyle={styles.sheetInner}
            >
              <View style={styles.handle} />
              <View style={styles.headerRow}>
                <Text style={styles.sheetTitle} numberOfLines={1}>
                  {label}
                </Text>
                <Text style={styles.count}>{options.length} Options</Text>
              </View>

              <FlatList
                data={options}
                keyExtractor={(item, index) => `${item.label}-${index}`}
                style={{ height: listMaxHeight }}
                contentContainerStyle={styles.listContent}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
                showsVerticalScrollIndicator
                bounces
                initialNumToRender={18}
                renderItem={({ item }) => {
                  const active = item.value === value;
                  return (
                    <Pressable
                      style={[styles.option, active && styles.optionActive]}
                      onPress={() => {
                        onChange(item.value);
                        setOpen(false);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={
                        item.count != null ? `${item.label}, ${item.count}` : item.label
                      }
                      accessibilityState={{ selected: active }}
                    >
                      <Text style={[styles.optionText, active && styles.optionTextActive]}>
                        {item.label}
                        {item.count != null ? ` (${item.count})` : ''}
                      </Text>
                      {active ? (
                        <Ionicons name="checkmark-circle" size={20} color={TEACHER.primary} />
                      ) : (
                        <Ionicons name="ellipse-outline" size={18} color={TEACHER.navInactive} />
                      )}
                    </Pressable>
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.empty}>
                    <Text style={styles.emptyText}>No Options Available</Text>
                  </View>
                }
              />

              <Pressable style={styles.closeBtn} onPress={() => setOpen(false)}>
                <Text style={styles.closeText}>Close</Text>
              </Pressable>
            </GlassPanel>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: GLASS_ROW.fillStrong,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_ROW.border,
    borderRadius: TEACHER_RADIUS.md,
    paddingHorizontal: TEACHER_SPACING.md,
    paddingVertical: 10,
    minWidth: 0,
  },
  triggerText: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    overflow: 'hidden',
    fontSize: 13,
    fontWeight: '600',
    color: TEACHER.text,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.42)',
    justifyContent: 'flex-end',
  },
  sheetWrap: {
    width: '100%',
    paddingHorizontal: 10,
  },
  sheet: {
    width: '100%',
    overflow: 'hidden',
  },
  sheetInner: {
    paddingTop: 8,
    paddingBottom: 10,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: TEACHER_RADIUS.full,
    backgroundColor: TEACHER.navInactive,
    alignSelf: 'center',
    marginBottom: TEACHER_SPACING.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: TEACHER_SPACING.xl,
    marginBottom: TEACHER_SPACING.sm,
  },
  sheetTitle: {
    ...TEACHER_TYPO.section,
    fontSize: 18,
    color: TEACHER.text,
    flex: 1,
  },
  count: {
    fontSize: 12,
    fontWeight: '700',
    color: TEACHER.textMuted,
  },
  listContent: {
    paddingBottom: 4,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: TEACHER_SPACING.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: GLASS_ROW.border,
  },
  optionActive: {
    backgroundColor: 'rgba(255,255,255,0.42)',
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    color: TEACHER.textSecondary,
    fontWeight: '600',
  },
  optionTextActive: {
    color: TEACHER.primaryDark,
    fontWeight: '700',
  },
  empty: {
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: TEACHER.textMuted,
  },
  closeBtn: {
    marginHorizontal: TEACHER_SPACING.xl,
    marginTop: TEACHER_SPACING.sm,
    paddingVertical: 14,
    borderRadius: TEACHER_RADIUS.md,
    backgroundColor: GLASS_ROW.fillStrong,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_ROW.border,
    alignItems: 'center',
  },
  closeText: {
    ...TEACHER_TYPO.body,
    fontWeight: '700',
    color: TEACHER.textSecondary,
  },
});
