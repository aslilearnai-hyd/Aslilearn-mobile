import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ChipNav from '../../../../src/components/student/ChipNav';
import { STUDENT, STUDENT_SPACING, STUDENT_TYPO } from '../../../../src/theme/student';

export interface ChipOption {
  value: string;
  label: string;
}

interface FilterChipsProps {
  sectionLabel?: string;
  selected: string;
  onSelect: (value: string) => void;
  options: ChipOption[];
}

function FilterChipsComponent({ sectionLabel, selected, onSelect, options }: FilterChipsProps) {
  const chips = useMemo(
    () => [{ id: 'all', label: 'All' }, ...options.map((opt) => ({ id: opt.value, label: opt.label }))],
    [options]
  );

  return (
    <View style={styles.wrapper}>
      {sectionLabel ? <Text style={styles.sectionLabel}>{sectionLabel}</Text> : null}
      <ChipNav chips={chips} active={selected} onChange={onSelect} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: STUDENT_SPACING.sm,
  },
  sectionLabel: {
    ...STUDENT_TYPO.label,
    color: STUDENT.textMuted,
    marginBottom: 6,
  },
});

export default memo(FilterChipsComponent);
