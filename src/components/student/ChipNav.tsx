import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { STUDENT, STUDENT_RADIUS } from '../../theme/student';
import { GLASS_RIM, GLASS_ROW, glassFillColor } from '../../theme/glass';

export type Chip = {
  id: string;
  label: string;
  shortLabel?: string;
  /** Optional accent used only for the active tab border. */
  borderColor?: string;
};

type Props = {
  chips: Chip[];
  active: string;
  onChange: (id: string) => void;
};

const TABLET_MIN_WIDTH = 768;

function tabCaption(chip: Chip, mobile: boolean) {
  if (mobile && chip.shortLabel) return chip.shortLabel;
  return chip.label;
}

export default function ChipNav({ chips, active, onChange }: Props) {
  const { width } = useWindowDimensions();
  const isMobile = width < TABLET_MIN_WIDTH;
  const scrollable = chips.length > 4;
  const activeBorderColor = chips.find((chip) => chip.id === active)?.borderColor;

  const row = (
    <>
      {chips.map((chip) => {
        const isActive = chip.id === active;
        const caption = tabCaption(chip, isMobile);
        return (
          <Pressable
            key={chip.id}
            onPress={() => onChange(chip.id)}
            style={[
              styles.tab,
              isMobile && styles.tabMobile,
              scrollable && styles.tabCompact,
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={chip.label}
          >
            <View
              style={[
                styles.pill,
                isActive && styles.pillActive,
                isActive && chip.borderColor
                  ? { borderColor: chip.borderColor }
                  : null,
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  isMobile && styles.tabTextMobile,
                  isActive && styles.tabTextActive,
                ]}
                numberOfLines={1}
              >
                {caption}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </>
  );

  return (
    <View
      style={[
        styles.wrap,
        activeBorderColor ? { borderColor: activeBorderColor } : null,
      ]}
    >
      {scrollable ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollRow}
        >
          {row}
        </ScrollView>
      ) : (
        <View style={styles.row}>{row}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    borderRadius: STUDENT_RADIUS.lg,
    borderWidth: 1,
    borderColor: GLASS_RIM.border,
    overflow: 'hidden',
    backgroundColor: glassFillColor('medium'),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    zIndex: 1,
  },
  scrollRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minWidth: '100%',
    padding: 4,
    zIndex: 1,
  },
  tab: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  tabMobile: {
    paddingVertical: 4,
  },
  tabCompact: {
    flex: 0,
    minWidth: 100,
    paddingHorizontal: 4,
  },
  pill: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: STUDENT_RADIUS.md,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  pillActive: {
    backgroundColor: GLASS_ROW.fillStrong,
    borderColor: 'rgba(109,91,208,0.35)',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: STUDENT.textMuted,
    textAlign: 'center',
  },
  tabTextMobile: {
    fontSize: 14,
    fontWeight: '700',
  },
  tabTextActive: {
    color: STUDENT.primaryDark,
    fontWeight: '800',
  },
});
