import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Ellipse, G, Line } from 'react-native-svg';
import { TEACHER, TEACHER_RADIUS, TEACHER_SPACING } from '../../theme/teacher';

function ChipSparkleDecor() {
  return (
    <Svg
      width="100%"
      height="100%"
      viewBox="0 0 80 64"
      preserveAspectRatio="xMidYMid slice"
      style={StyleSheet.absoluteFillObject}
      pointerEvents="none"
    >
      <G opacity={0.35}>
        <Ellipse cx="40" cy="54" rx="34" ry="10" stroke="#FFFFFF" strokeWidth={1} fill="none" />
        <Ellipse cx="40" cy="56" rx="24" ry="7" stroke="#FFFFFF" strokeWidth={0.9} fill="none" />
      </G>
      <G opacity={0.5} stroke="#FFFFFF" strokeWidth={1.1}>
        <Line x1="12" y1="12" x2="12" y2="20" />
        <Line x1="8" y1="16" x2="16" y2="16" />
        <Line x1="66" y1="14" x2="66" y2="20" />
        <Line x1="63" y1="17" x2="69" y2="17" />
      </G>
    </Svg>
  );
}

export type ChipItem = {
  id: string;
  label: string;
  shortLabel?: string;
  icon?: keyof typeof Ionicons.glyphMap;
};

type Props = {
  items: ChipItem[];
  active: string;
  onChange: (id: string) => void;
  variant?: 'default' | 'students';
};

function Segment({
  item,
  selected,
  onChange,
  studentsStyle,
}: {
  item: ChipItem;
  selected: boolean;
  onChange: (id: string) => void;
  studentsStyle?: boolean;
}) {
  const caption = item.shortLabel ?? item.label;

  return (
    <Pressable
      onPress={() => onChange(item.id)}
      style={styles.segmentPressable}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
    >
      <View style={[styles.segmentInner, selected ? styles.segmentInnerActive : styles.segmentInnerIdle]}>
        {selected ? (
          <>
            <LinearGradient
              colors={
                item.id === 'classes'
                  ? ['#6D28D9', '#A855F7']
                  : [TEACHER.primary, TEACHER.primaryDark]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <ChipSparkleDecor />
          </>
        ) : null}
        {item.icon ? (
          <Ionicons
            name={item.id === 'classes' && selected ? 'school-outline' : item.icon}
            size={17}
            color={selected ? TEACHER.textOnPrimary : TEACHER.primaryLight}
          />
        ) : null}
        <Text
          style={[
            selected ? styles.segmentLabelActive : styles.segmentLabel,
            !selected && studentsStyle && styles.segmentLabelStudents,
          ]}
          numberOfLines={1}
        >
          {caption}
        </Text>
      </View>
    </Pressable>
  );
}

export default function SubNavChips({ items, active, onChange, variant = 'default' }: Props) {
  const isStudents = variant === 'students';

  const bar = (
    <View style={[styles.bar, isStudents ? styles.barStudents : styles.barDefault]}>
      {items.map((item) => (
        <Segment
          key={item.id}
          item={item}
          selected={item.id === active}
          onChange={onChange}
          studentsStyle={isStudents}
        />
      ))}
    </View>
  );

  if (isStudents) {
    return <View style={styles.studentsWrap}>{bar}</View>;
  }

  return bar;
}

const SEGMENT_HEIGHT = 64;

const styles = StyleSheet.create({
  studentsWrap: {
    marginHorizontal: TEACHER_SPACING.lg,
    marginBottom: TEACHER_SPACING.sm,
    backgroundColor: '#F5F7FF',
    borderRadius: TEACHER_RADIUS.lg,
    borderWidth: 2,
    borderColor: '#A5B4FC',
    padding: 5,
    zIndex: 20,
    elevation: 4,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: SEGMENT_HEIGHT,
  },
  barDefault: {
    marginHorizontal: TEACHER_SPACING.lg,
    marginVertical: TEACHER_SPACING.sm,
    backgroundColor: TEACHER.surface,
    borderRadius: TEACHER_RADIUS.chip,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
    padding: 4,
    gap: 4,
    height: SEGMENT_HEIGHT + 8,
  },
  barStudents: {
    gap: 5,
  },
  segmentPressable: {
    flex: 1,
    minWidth: 0,
    height: SEGMENT_HEIGHT,
  },
  segmentInner: {
    height: SEGMENT_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 4,
    borderRadius: TEACHER_RADIUS.md,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  segmentInnerActive: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  segmentInnerIdle: {
    backgroundColor: '#FFFFFF',
    borderColor: '#A5B4FC',
  },
  segmentLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: TEACHER.textMuted,
    textAlign: 'center',
    maxWidth: '100%',
  },
  segmentLabelStudents: {
    color: TEACHER.primaryDark,
    fontWeight: '700',
  },
  segmentLabelActive: {
    fontSize: 11,
    fontWeight: '800',
    color: TEACHER.textOnPrimary,
    textAlign: 'center',
    maxWidth: '100%',
  },
});
