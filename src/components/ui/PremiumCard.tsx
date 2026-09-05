import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONT, RADIUS, SPACING } from '../../theme';
import { GLASS_RIM, GLASS_SHADOW, glassFillColor } from '../../theme/glass';

type Props = {
  title?: string;
  subtitle?: string;
  gradient?: readonly [string, string];
  icon?: keyof typeof Ionicons.glyphMap;
  children?: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
};

export default function PremiumCard({
  title,
  subtitle,
  gradient,
  icon,
  children,
  onPress,
  style,
}: Props) {
  const content = (
    <View style={[styles.card, style]}>
      {gradient && title ? (
        <LinearGradient colors={[...gradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.header}>
          {icon ? (
            <View style={styles.iconWrap}>
              <Ionicons name={icon} size={20} color={COLORS.textInverse} />
            </View>
          ) : null}
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>{title}</Text>
            {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
          </View>
        </LinearGradient>
      ) : title ? (
        <View style={styles.plainHeader}>
          {icon ? <Ionicons name={icon} size={20} color={COLORS.primary} style={styles.plainIcon} /> : null}
          <View style={styles.headerText}>
            <Text style={styles.plainTitle}>{title}</Text>
            {subtitle ? <Text style={styles.plainSubtitle}>{subtitle}</Text> : null}
          </View>
        </View>
      ) : null}
      {children ? <View style={styles.body}>{children}</View> : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
        style={({ pressed }) => [pressed && styles.pressed]}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: glassFillColor('medium'),
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: GLASS_RIM.border,
    overflow: 'hidden',
    ...GLASS_SHADOW.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    zIndex: 1,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: FONT.semibold, color: COLORS.textInverse },
  headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  plainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    zIndex: 1,
  },
  plainIcon: { marginRight: 2 },
  plainTitle: { fontSize: 16, fontWeight: FONT.semibold, color: COLORS.text },
  plainSubtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  body: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    zIndex: 1,
  },
  pressed: { opacity: 0.92 },
});
