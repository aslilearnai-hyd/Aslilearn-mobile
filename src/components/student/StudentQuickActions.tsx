import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInRight, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { STUDENT, STUDENT_TYPO } from '../../theme/student';

type Action = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
};

type Props = {
  actions: Action[];
};

const PRESS_SPRING = { damping: 15, stiffness: 260 };

function ActionItem({ action, index }: { action: Action; index: number }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View entering={FadeInRight.duration(280).delay(index * 70)}>
      <Pressable
        onPress={action.onPress}
        onPressIn={() => {
          scale.value = withSpring(0.93, PRESS_SPRING);
        }}
        onPressOut={() => {
          scale.value = withSpring(1, PRESS_SPRING);
        }}
        accessibilityRole="button"
        accessibilityLabel={action.label}
      >
        <Animated.View style={[styles.item, animStyle]}>
          <LinearGradient
            colors={[`${action.color}22`, `${action.color}0f`]}
            style={[styles.iconCircle, { borderColor: `${action.color}30` }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name={action.icon} size={22} color={action.color} />
          </LinearGradient>
          <Text style={styles.label}>{action.label}</Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

export default function StudentQuickActions({ actions }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
    >
      {actions.map((action, index) => (
        <ActionItem key={action.id} action={action} index={index} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    gap: 14,
    paddingVertical: 4,
    paddingRight: 8,
  },
  item: {
    alignItems: 'center',
    width: 76,
    gap: 8,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  label: {
    ...STUDENT_TYPO.label,
    color: STUDENT.textSecondary,
    textAlign: 'center',
  },
});
