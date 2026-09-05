import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { STUDENT, STUDENT_RADIUS, STUDENT_SPACING } from '../../theme/student';

export type StudentFilterOption = {
  value: string;
  label: string;
  count?: number;
};

type Props = {
  label: string;
  value: string;
  placeholder: string;
  options: StudentFilterOption[];
  onChange: (value: string) => void;
};

export default function StudentFilterDropdown({
  label,
  value,
  placeholder,
  options,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <>
      <View style={styles.wrap}>
        <Text style={styles.label}>{label}</Text>
        <Pressable
          style={styles.trigger}
          onPress={() => setOpen(true)}
          hitSlop={2}
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${selected?.label || placeholder}`}
          accessibilityHint="Opens the filter options"
          accessibilityState={{ expanded: open }}
        >
          <Text style={styles.triggerText} numberOfLines={1}>
            {selected?.label || placeholder}
          </Text>
          <Ionicons
            name="chevron-down"
            size={16}
            color={STUDENT.textMuted}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        </Pressable>
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          style={styles.overlay}
          onPress={() => setOpen(false)}
          accessibilityRole="button"
          accessibilityLabel={`Close ${label} filter`}
        >
          <Pressable
            style={styles.sheet}
            onPress={(e) => e.stopPropagation()}
            accessibilityViewIsModal
          >
            <Text style={styles.sheetTitle}>{label}</Text>
            {options.map((option) => {
              const active = option.value === value;
              return (
                <Pressable
                  key={`${option.value}-${option.label}`}
                  style={[styles.option, active && styles.optionActive]}
                  onPress={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={
                    option.count != null ? `${option.label}, ${option.count}` : option.label
                  }
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.optionText, active && styles.optionTextActive]}>
                    {option.label}
                    {option.count != null ? ` (${option.count})` : ''}
                  </Text>
                  {active ? <Ionicons name="checkmark" size={18} color={STUDENT.primary} /> : null}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  label: {
    fontSize: 13,
    color: STUDENT.textSecondary,
    fontWeight: '600',
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    minWidth: 0,
    overflow: 'hidden',
    backgroundColor: STUDENT.surface,
    borderWidth: 1,
    borderColor: STUDENT.surfaceBorder,
    borderRadius: STUDENT_RADIUS.md,
    paddingHorizontal: STUDENT_SPACING.md,
    paddingVertical: 11,
  },
  triggerText: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    overflow: 'hidden',
    fontSize: 14,
    fontWeight: '600',
    color: STUDENT.text,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: STUDENT.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: STUDENT_SPACING.lg,
    paddingBottom: STUDENT_SPACING.xxl,
    borderWidth: 1,
    borderColor: STUDENT.surfaceBorder,
    gap: 4,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: STUDENT.text,
    marginBottom: STUDENT_SPACING.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: STUDENT_SPACING.md,
    borderRadius: STUDENT_RADIUS.md,
  },
  optionActive: {
    backgroundColor: STUDENT.navActiveBg,
  },
  optionText: {
    fontSize: 14,
    color: STUDENT.textSecondary,
    fontWeight: '600',
    flex: 1,
  },
  optionTextActive: {
    color: STUDENT.navActiveText,
    fontWeight: '700',
  },
});
