import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AI, AI_RADIUS, AI_SPACING } from '../../theme/ai';
import { formatAiToolText } from '../../lib/title-case';

export type AiToolParamItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  /** When provided, the chip becomes a tappable dropdown (re-select to regenerate). */
  onPress?: () => void;
  disabled?: boolean;
};

type Props = {
  items: AiToolParamItem[];
  accent?: string;
  tabletUi?: boolean;
  /** Show every chip (incl. empty) as an editable dropdown so users can re-pick. */
  editable?: boolean;
};

export default function AiToolParamsGrid({ items, accent = AI.primary, tabletUi, editable }: Props) {
  const visible = editable ? items : items.filter((item) => item.value.trim());
  if (!visible.length) return null;

  return (
    <View style={styles.grid} accessibilityLabel="Generation parameters">
      {visible.map((item) => {
        const hasValue = !!item.value.trim();
        const isInteractive = editable && !!item.onPress && !item.disabled;
        const content = (
          <>
            <View style={styles.boxHeader}>
              <Ionicons name={item.icon} size={13} color={accent} />
              <Text style={styles.boxLabel} numberOfLines={1}>
                {formatAiToolText(item.label).toUpperCase()}
              </Text>
              {editable ? (
                <View style={[styles.boxChevron, { backgroundColor: `${accent}18` }]}>
                  <Ionicons name="chevron-down" size={12} color={accent} />
                </View>
              ) : null}
            </View>
            <Text style={[styles.boxValue, !hasValue && styles.boxValuePlaceholder]} numberOfLines={2}>
              {hasValue ? formatAiToolText(item.value) : 'Select'}
            </Text>
          </>
        );

        if (isInteractive) {
          return (
            <Pressable
              key={item.label}
              onPress={item.onPress}
              accessibilityRole="button"
              accessibilityLabel={`${item.label}: ${item.value || 'not set'}. Tap to change`}
              style={({ pressed }) => [
                styles.box,
                styles.boxEditable,
                tabletUi && styles.boxTablet,
                pressed && styles.boxPressed,
              ]}
            >
              {content}
            </Pressable>
          );
        }

        return (
          <View
            key={item.label}
            style={[styles.box, tabletUi && styles.boxTablet, editable && item.disabled && styles.boxDisabled]}
          >
            {content}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AI_SPACING.sm,
    marginBottom: AI_SPACING.md,
  },
  box: {
    flexGrow: 1,
    flexBasis: '46%',
    borderRadius: AI_RADIUS.md,
    borderWidth: 1,
    borderColor: AI.border,
    backgroundColor: AI.surface,
    paddingHorizontal: AI_SPACING.md,
    paddingVertical: AI_SPACING.sm + 2,
  },
  boxEditable: {
    borderColor: AI.primaryBorder,
  },
  boxDisabled: {
    opacity: 0.55,
  },
  boxPressed: {
    backgroundColor: AI.primarySoft,
  },
  boxTablet: {
    flexBasis: '31%',
  },
  boxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 5,
  },
  boxLabel: {
    flex: 1,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: AI.textMuted,
  },
  boxChevron: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxValue: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    color: AI.text,
  },
  boxValuePlaceholder: {
    color: AI.textMuted,
    fontWeight: '500',
  },
});
