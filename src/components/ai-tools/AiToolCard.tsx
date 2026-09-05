import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { AI, AI_RADIUS, AI_SHADOW, AI_SPACING, AI_TYPE } from '../../theme/ai';
import { formatAiToolText } from '../../lib/title-case';
import { glassFillColor } from '../../theme/glass';

type Props = {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent?: string;
  badge?: string;
  compact?: boolean;
  /** TV / board only: reserved title + description height so every card matches. */
  evenHeight?: boolean;
  /** Frosted-glass card: translucent + blurred instead of a solid white surface. */
  glass?: boolean;
  /** Trailing action label, e.g. "Get Started" (web's ai-tutor.tsx wording). */
  ctaText?: string;
  onPress: () => void;
  style?: ViewStyle;
};

export default function AiToolCard({
  title,
  description,
  icon,
  accent = AI.primary,
  badge,
  compact,
  evenHeight,
  glass = true,
  ctaText = 'Open Tool',
  onPress,
  style,
}: Props) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.98, { damping: 16, stiffness: 320 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 16, stiffness: 320 });
      }}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${description}`}
      accessibilityHint="Opens this AI tool"
      style={styles.pressable}
    >
      <Animated.View
        style={[
          styles.card,
          compact && styles.cardCompact,
          evenHeight && styles.cardEven,
          glass && styles.cardGlassShell,
          { borderColor: accent },
          style,
          animatedStyle,
        ]}
      >
        <View
          style={[
            styles.iconBox,
            { backgroundColor: accent, borderColor: accent },
          ]}
        >
          <Ionicons name={icon} size={compact ? 24 : 26} color="#FFFFFF" />
        </View>
        <View style={[styles.content, evenHeight && styles.contentEven]}>
          <View style={styles.titleBlock}>
            <Text style={[styles.title, evenHeight && styles.titleEven]} numberOfLines={2}>
              {formatAiToolText(title)}
            </Text>
            {badge ? (
              <View style={styles.badge}>
                {/*
                  Keep badge raw (no title-case transform). Android often under-measures
                  bold + letterSpacing and clips "Teacher" → "Teache"; trailing NBSP +
                  zero letterSpacing fixes the layout width.
                */}
                <Text
                  style={styles.badgeText}
                  numberOfLines={1}
                  ellipsizeMode="clip"
                  android_hyphenationFrequency="none"
                >
                  {`${String(badge).trim()}\u00A0`}
                </Text>
              </View>
            ) : null}
          </View>
          <Text
            style={[styles.description, evenHeight && styles.descriptionEven]}
            numberOfLines={evenHeight ? 3 : compact ? 4 : 3}
          >
            {formatAiToolText(description)}
          </Text>
          <View style={[styles.actionRow, evenHeight && styles.actionRowEven]}>
            <Text style={styles.actionText}>{formatAiToolText(ctaText)}</Text>
            <Ionicons name="arrow-forward" size={18} color={AI.primary} />
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    width: '100%',
    alignSelf: 'stretch',
    minWidth: 0,
  },
  card: {
    minHeight: 132,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: AI_SPACING.md,
    overflow: 'hidden',
    borderRadius: AI_RADIUS.lg,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.65)',
    backgroundColor: glassFillColor('strong'),
    padding: AI_SPACING.lg,
    ...AI_SHADOW,
  },
  cardCompact: {
    minHeight: 210,
    flexDirection: 'column',
  },
  cardEven: {
    minHeight: 292,
    flexDirection: 'column',
  },
  cardGlassShell: {
    backgroundColor: glassFillColor('strong'),
  },
  iconBox: {
    width: 54,
    height: 54,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: AI_RADIUS.md,
    borderWidth: 1,
  },
  content: {
    flex: 1,
    minWidth: 0,
    width: '100%',
  },
  contentEven: {
    flexGrow: 1,
    justifyContent: 'flex-start',
  },
  titleBlock: {
    gap: AI_SPACING.xs,
    alignItems: 'flex-start',
    width: '100%',
  },
  title: {
    ...AI_TYPE.title,
    color: AI.text,
    width: '100%',
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
  },
  titleEven: {
    minHeight: 60,
  },
  description: {
    ...AI_TYPE.caption,
    marginTop: AI_SPACING.xs,
    color: AI.textSecondary,
    width: '100%',
    flexShrink: 0,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
  },
  descriptionEven: {
    minHeight: 63,
  },
  actionRow: {
    marginTop: AI_SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: AI_SPACING.xs,
  },
  actionRowEven: {
    marginTop: 'auto',
    paddingTop: AI_SPACING.md,
  },
  actionText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
    color: AI.primary,
  },
  badge: {
    flexGrow: 0,
    flexShrink: 0,
    alignSelf: 'flex-start',
    borderRadius: AI_RADIUS.full,
    borderWidth: 1,
    borderColor: AI.primaryBorder,
    backgroundColor: AI.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: AI.primaryPressed,
    letterSpacing: 0,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
  },
});
