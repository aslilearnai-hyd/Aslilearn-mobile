import React, { memo } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { STUDENT, STUDENT_RADIUS, STUDENT_SPACING, STUDENT_TYPO } from '../../../../src/theme/student';
import { GlassPanel } from '../../../../src/components/ui';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

function SearchBarComponent({ value, onChangeText, placeholder = 'Search Videos...' }: SearchBarProps) {
  return (
    <GlassPanel style={styles.container} radius={STUDENT_RADIUS.inner}>
      {/* Row layout lives on this inner view — GlassPanel wraps children itself. */}
      <View style={styles.row}>
        <Ionicons name="search" size={18} color={STUDENT.navInactive} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          placeholderTextColor={STUDENT.navInactive}
        />
        <TouchableOpacity style={styles.iconButton} activeOpacity={0.8}>
          <Ionicons name="options-outline" size={18} color={STUDENT.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} activeOpacity={0.8}>
          <Ionicons name="mic-outline" size={18} color={STUDENT.textMuted} />
        </TouchableOpacity>
      </View>
    </GlassPanel>
  );
}

const styles = StyleSheet.create({
  container: {
    // Fill comes from GlassPanel's blur + white rim.
    borderRadius: STUDENT_RADIUS.inner,
    paddingHorizontal: STUDENT_SPACING.md,
    ...STUDENT.shadow.sm,
    marginBottom: STUDENT_SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 46,
    ...STUDENT_TYPO.body,
    color: STUDENT.text,
    paddingHorizontal: STUDENT_SPACING.sm,
  },
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: STUDENT_RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: STUDENT_SPACING.xs,
  },
});

export default memo(SearchBarComponent);
