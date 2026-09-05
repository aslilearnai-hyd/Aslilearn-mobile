import { FlatList, Modal, Pressable, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import GlassPanel from '../ui/GlassPanel';
import { AI, AI_RADIUS, AI_SPACING } from '../../theme/ai';
import { STUDENT, STUDENT_RADIUS, STUDENT_SPACING, STUDENT_TYPO } from '../../theme/student';

type Props = {
  visible: boolean;
  title: string;
  options: string[];
  value?: string;
  accent: string;
  onSelect: (option: string) => void;
  onClose: () => void;
};

function formatOptionLabel(option: string) {
  if (!option) return '';
  if (option === '__WHOLE_CHAPTER__') return 'Whole chapter';
  if (option === 'NONE' || option === 'GENERAL') return 'General';
  const upper = option.toUpperCase();
  if (['ALPHA', 'BETA', 'GAMMA', 'DELTA'].includes(upper)) {
    return `IIT ${upper.charAt(0)}${upper.slice(1).toLowerCase()}`;
  }
  if (upper.startsWith('IIT_')) {
    const rest = upper.slice(4);
    return `IIT ${rest.charAt(0)}${rest.slice(1).toLowerCase()}`;
  }
  return option.charAt(0).toUpperCase() + option.slice(1);
}

/**
 * Bottom-sheet picker for AI tool subject / topic / option fields.
 * Uses FlatList with a bounded height so long syllabus lists scroll smoothly.
 */
export default function AiToolOptionPicker({
  visible,
  title,
  options,
  value,
  accent,
  onSelect,
  onClose,
}: Props) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const listMaxHeight = Math.min(Math.round(height * 0.52), 440);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} accessibilityLabel="Dismiss" />
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
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              <Text style={styles.count}>{options.length} options</Text>
            </View>

            <FlatList
              data={options}
              keyExtractor={(item, index) => `${item}-${index}`}
              style={{ height: listMaxHeight }}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              showsVerticalScrollIndicator
              bounces
              initialNumToRender={18}
              windowSize={8}
              renderItem={({ item }) => {
                const selected = value === item;
                return (
                  <TouchableOpacity
                    style={[styles.item, selected && styles.itemSelected]}
                    onPress={() => onSelect(item)}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <Text
                      style={[styles.itemText, selected && styles.itemTextSelected]}
                      numberOfLines={3}
                    >
                      {formatOptionLabel(item)}
                    </Text>
                    {selected ? (
                      <Ionicons name="checkmark-circle" size={20} color={accent} />
                    ) : (
                      <Ionicons name="ellipse-outline" size={18} color={STUDENT.navInactive} />
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>No options available</Text>
                </View>
              }
            />

            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.85}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </GlassPanel>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
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
    borderRadius: STUDENT_RADIUS.full,
    backgroundColor: STUDENT.navInactive,
    alignSelf: 'center',
    marginBottom: STUDENT_SPACING.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: STUDENT_SPACING.xl,
    marginBottom: STUDENT_SPACING.sm,
  },
  title: {
    ...STUDENT_TYPO.section,
    fontSize: 18,
    color: STUDENT.text,
    flex: 1,
  },
  count: {
    fontSize: 12,
    fontWeight: '700',
    color: STUDENT.textMuted,
  },
  listContent: {
    paddingBottom: 4,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: STUDENT_SPACING.xl,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: AI.border,
  },
  itemSelected: {
    backgroundColor: 'rgba(255,255,255,0.42)',
  },
  itemText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    color: STUDENT.textSecondary,
  },
  itemTextSelected: {
    fontWeight: '700',
    color: STUDENT.text,
  },
  empty: {
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: STUDENT.textMuted,
  },
  closeBtn: {
    marginHorizontal: STUDENT_SPACING.xl,
    marginTop: AI_SPACING.sm,
    paddingVertical: 14,
    borderRadius: AI_RADIUS.md,
    backgroundColor: STUDENT.bgAccent,
    alignItems: 'center',
  },
  closeText: {
    ...STUDENT_TYPO.body,
    fontWeight: '700',
    color: STUDENT.textSecondary,
  },
});
