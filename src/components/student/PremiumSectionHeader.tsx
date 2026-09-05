import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { STUDENT, STUDENT_ANIMATION, STUDENT_RADIUS, STUDENT_TYPO } from '../../theme/student';

type Props = {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  accent?: string;
  delay?: number;
  right?: React.ReactNode;
  badge?: string;
};

export default function PremiumSectionHeader({
  title,
  subtitle,
  icon,
  accent = STUDENT.primary,
  delay = 0,
  right,
  badge,
}: Props) {
  return (
    <Animated.View
      entering={FadeInDown.duration(STUDENT_ANIMATION.normal).delay(delay)}
      style={styles.wrap}
    >
      <View style={styles.left}>
        {icon ? (
          <LinearGradient
            colors={[accent, `${accent}cc`]}
            style={styles.iconWrap}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          >
            <Ionicons name={icon} size={20} color={STUDENT.textOnPrimary} />
          </LinearGradient>
        ) : null}
        <View style={styles.textWrap}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{title}</Text>
            {badge ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{badge}</Text>
              </View>
            ) : null}
          </View>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      {right}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 12,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  title: {
    ...STUDENT_TYPO.section,
    color: STUDENT.text,
  },
  badge: {
    backgroundColor: STUDENT.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: STUDENT_RADIUS.full,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: STUDENT.accent,
  },
  subtitle: {
    fontSize: 13,
    color: STUDENT.textMuted,
    marginTop: 2,
    lineHeight: 18,
  },
});
