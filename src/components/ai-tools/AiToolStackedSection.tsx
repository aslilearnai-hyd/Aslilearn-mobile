import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { formatAiToolText } from '../../lib/title-case';
import { getAiSectionThemeByNum } from '../../lib/ai-tool-section-palette';

const AnimatedIonicons = Animated.createAnimatedComponent(Ionicons);

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Props = {
  num: string;
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  accentColor?: string;
  children: ReactNode;
  /** First two quests start open for curiosity */
  defaultOpen?: boolean;
};

export default function AiToolStackedSection({
  num,
  title,
  icon = 'layers-outline',
  accentColor,
  children,
  defaultOpen,
}: Props) {
  const numLabel = String(num).replace(/^section\s*/i, '').trim() || num;
  const theme = getAiSectionThemeByNum(numLabel);
  const accent = accentColor || theme.hex;
  const [open, setOpen] = useState(
    // All generator sections start expanded so nothing is stuck behind "Unlock".
    typeof defaultOpen === 'boolean' ? defaultOpen : true,
  );
  const displayTitle = formatAiToolText(title);

  const rotation = useSharedValue(open ? 180 : 0);
  useEffect(() => {
    rotation.value = withTiming(open ? 180 : 0, { duration: 220 });
  }, [open, rotation]);
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((v) => !v);
  };

  return (
    <View style={[styles.card, { borderColor: theme.pastelBorder, backgroundColor: theme.pastelBg }]}>
      <View style={[styles.accentBar, { backgroundColor: accent }]} />

      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        hitSlop={8}
        style={styles.header}
      >
        <View style={[styles.iconBadge, { backgroundColor: accent }]}>
          <Ionicons name={icon} size={19} color="#fff" />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.kicker, { color: theme.hexDeep }]}>
            {numLabel.length > 3 ? numLabel : `Section ${numLabel}`}
          </Text>
          <Text style={styles.title}>{displayTitle}</Text>
        </View>
        <View style={[styles.chevronWrap, { backgroundColor: '#FFFFFF' }]}>
          <AnimatedIonicons name="chevron-down" size={18} color={theme.hexDeep} style={chevronStyle} />
        </View>
      </Pressable>

      {open ? (
        <Animated.View entering={FadeIn.duration(200)} style={styles.body}>
          {children}
        </Animated.View>
      ) : null}
    </View>
  );
}

export function AiToolStackedList({ children }: { children: ReactNode }) {
  return <View style={styles.list}>{children}</View>;
}

const styles = StyleSheet.create({
  list: { gap: 8 },
  card: {
    borderRadius: 14,
    borderWidth: 1.5,
    overflow: 'hidden',
    marginBottom: 10,
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    zIndex: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0f172a',
    shadowOpacity: 0.14,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  headerText: { flex: 1, minWidth: 0 },
  kicker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  chevronWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  body: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(15,23,42,0.06)',
  },
});
