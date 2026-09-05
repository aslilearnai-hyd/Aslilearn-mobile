import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { TEACHER, TEACHER_SPACING, glassCard } from '../../theme/teacher';

export type FabAction = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

const SPRING = { damping: 14, stiffness: 220 };

function FabActionItem({
  action,
  index,
  progress,
  bottom,
  onSelect,
}: {
  action: FabAction;
  index: number;
  progress: SharedValue<number>;
  bottom: number;
  onSelect: (action: FabAction) => void;
}) {
  const angle = -90 - index * 22;
  const radius = 72 + index * 8;

  const itemStyle = useAnimatedStyle(() => {
    const rad = (angle * Math.PI) / 180;
    const threshold = index * 0.12;
    const staggered = Math.max(0, Math.min(1, (progress.value - threshold) / (1 - threshold)));
    return {
      opacity: staggered,
      transform: [
        { translateX: Math.cos(rad) * radius * staggered },
        { translateY: Math.sin(rad) * radius * staggered },
        { scale: 0.6 + staggered * 0.4 },
      ],
    };
  });

  return (
    <Animated.View style={[styles.actionWrap, { bottom, right: 20 }, itemStyle]}>
      <Pressable
        style={styles.actionBtn}
        onPress={() => onSelect(action)}
        accessibilityRole="button"
        accessibilityLabel={action.label}
      >
        <LinearGradient colors={[TEACHER.primary, TEACHER.primaryDark]} style={styles.actionIconCircle}>
          <Ionicons
            name={action.icon}
            size={16}
            color={TEACHER.textOnPrimary}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        </LinearGradient>
      </Pressable>
      <Text style={styles.actionLabel}>{action.label}</Text>
    </Animated.View>
  );
}

type Props = {
  actions: FabAction[];
  bottomOffset?: number;
};

export default function TeacherFAB({ actions, bottomOffset = 88 }: Props) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = React.useState(false);
  const progress = useSharedValue(0);
  const mountScale = useSharedValue(0.75);
  const bottom = Math.max(insets.bottom, 12) + bottomOffset;

  useEffect(() => {
    mountScale.value = withSpring(1.0, { damping: 10, stiffness: 220 });
  }, [mountScale]);

  const toggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const next = !open;
    setOpen(next);
    progress.value = withSpring(next ? 1 : 0, SPRING);
  };

  const close = () => {
    setOpen(false);
    progress.value = withTiming(0, { duration: 180 });
  };

  const mainRotate = useAnimatedStyle(() => ({
    transform: [{ rotate: `${progress.value * 45}deg` }],
  }));

  const mountStyle = useAnimatedStyle(() => ({
    transform: [{ scale: mountScale.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value * 0.78,
  }));

  const handleSelect = (action: FabAction) => {
    close();
    action.onPress();
  };

  return (
    <>
      {open ? (
        <Animated.View entering={FadeIn.duration(200)} style={[styles.backdrop, backdropStyle]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel="Close quick actions"
          />
        </Animated.View>
      ) : null}

      {actions.map((action, index) => (
        <FabActionItem
          key={action.id}
          action={action}
          index={index}
          progress={progress}
          bottom={bottom}
          onSelect={handleSelect}
        />
      ))}

      <Animated.View style={[styles.fabWrap, { bottom, right: 20 }, mountStyle]}>
        <Pressable
          onPress={toggle}
          style={styles.fabOuter}
          accessibilityRole="button"
          accessibilityLabel={open ? 'Close quick actions' : 'Open quick actions'}
          accessibilityState={{ expanded: open }}
        >
          <LinearGradient colors={[...TEACHER.fabGradient]} style={styles.fab}>
            <Animated.View style={mainRotate}>
              <Ionicons name={open ? 'close' : 'add'} size={28} color={TEACHER.textOnPrimary} />
            </Animated.View>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.35)',
    zIndex: 45,
  },
  fabWrap: {
    position: 'absolute',
    zIndex: 50,
  },
  fabOuter: {
    borderWidth: 2,
    borderColor: 'rgba(99,102,241,0.30)',
    borderRadius: 31,
    shadowColor: TEACHER.primary,
    shadowOpacity: 0.65,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 4 },
    elevation: 12,
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionWrap: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 48,
    width: 90,
  },
  actionBtn: {
    ...glassCard,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: TEACHER_SPACING.xs,
    backgroundColor: TEACHER.cardBg,
  },
  actionIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: TEACHER.text,
    textAlign: 'center',
  },
});
