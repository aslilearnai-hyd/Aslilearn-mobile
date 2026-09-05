import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Ellipse, G, Line, Path } from 'react-native-svg';

type Props = {
  title?: string;
  subtitle?: string;
  /** Gradient from → to (left → right). */
  colors?: readonly [string, string];
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  style?: ViewStyle;
  /** compact = nav-tile look; banner = full-width section header */
  size?: 'compact' | 'banner';
};

function ClassesDecor() {
  return (
    <Svg
      width="100%"
      height="100%"
      viewBox="0 0 160 100"
      preserveAspectRatio="xMidYMid slice"
      style={StyleSheet.absoluteFillObject}
      pointerEvents="none"
    >
      <G opacity={0.35}>
        <Ellipse cx="80" cy="78" rx="70" ry="18" stroke="#FFFFFF" strokeWidth={1.2} fill="none" />
        <Ellipse cx="80" cy="82" rx="52" ry="12" stroke="#FFFFFF" strokeWidth={1} fill="none" />
      </G>
      <G opacity={0.55} stroke="#FFFFFF" strokeWidth={1.2}>
        <Line x1="22" y1="18" x2="22" y2="30" />
        <Line x1="16" y1="24" x2="28" y2="24" />
        <Line x1="138" y1="22" x2="138" y2="32" />
        <Line x1="133" y1="27" x2="143" y2="27" />
        <Line x1="128" y1="48" x2="128" y2="56" />
        <Line x1="124" y1="52" x2="132" y2="52" />
      </G>
      {/* Soft graduation-cap watermark */}
      <G opacity={0.12} fill="#FFFFFF">
        <Path d="M80 28 L48 42 L80 56 L112 42 Z" />
        <Path d="M60 46 V58 C60 64 68 68 80 68 C92 68 100 64 100 58 V46" fill="none" stroke="#FFFFFF" strokeWidth={3} />
      </G>
    </Svg>
  );
}

/** Shared Classes feature tile — purple gradient, cap icon, sparkles/orbits. */
export default function ClassesGradientCard({
  title = 'Classes',
  subtitle,
  colors = ['#7C3AED', '#A855F7'],
  icon = 'school-outline',
  onPress,
  style,
  size = 'banner',
}: Props) {
  const compact = size === 'compact';
  const body = (
    <LinearGradient
      colors={[colors[0], colors[1]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, compact ? styles.cardCompact : styles.cardBanner, style]}
    >
      <ClassesDecor />
      <View style={[styles.content, compact && styles.contentCompact]}>
        <View style={[styles.iconWrap, compact && styles.iconWrapCompact]}>
          <Ionicons name={icon} size={compact ? 22 : 28} color="#FFFFFF" />
        </View>
        <Text style={[styles.title, compact && styles.titleCompact]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && !compact ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </LinearGradient>
  );

  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={title}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderRadius: 18,
    shadowColor: '#6D28D9',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 3,
  },
  cardBanner: {
    minHeight: 96,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  cardCompact: {
    minHeight: 72,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  content: {
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  contentCompact: {
    gap: 4,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  iconWrapCompact: {
    width: 34,
    height: 34,
    borderRadius: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  titleCompact: {
    fontSize: 12,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.88)',
  },
});
