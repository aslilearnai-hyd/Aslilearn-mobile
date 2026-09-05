import { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useAdminTheme } from '../_ui/useAdminTheme';
import AdminScalePressable from '../_ui/AdminScalePressable';

interface VidyaAICornerButtonProps {
  onPress?: () => void;
}

const messages = [
  'Need help managing your school?',
  'Ask Me About Student Management',
  'Need help with class assignments?',
  'Ask me about teacher management?',
];

export default function VidyaAICornerButton({ onPress }: VidyaAICornerButtonProps) {
  const { colors, radius } = useAdminTheme();
  const [currentMessage, setCurrentMessage] = useState(0);
  const opacity = useSharedValue(1);
  const pulse = useSharedValue(1);

  useEffect(() => {
    const interval = setInterval(() => {
      opacity.value = withSequence(
        withTiming(0, { duration: 250 }),
        withTiming(1, { duration: 250 })
      );
      setCurrentMessage((prev) => (prev + 1) % messages.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [opacity]);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(withTiming(1.08, { duration: 1400 }), withTiming(1, { duration: 1400 })),
      -1,
      false
    );
  }, [pulse]);

  const bubbleStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.messageContainer, bubbleStyle]}>
        <View
          style={[
            styles.messageBubble,
            {
              backgroundColor: colors.surface,
              borderColor: colors.primaryMuted,
              borderRadius: radius.md,
            },
          ]}
        >
          <Text style={[styles.messageText, { color: colors.text }]}>{messages[currentMessage]}</Text>
          <View style={[styles.messageTail, { borderTopColor: colors.primaryMuted }]} />
        </View>
      </Animated.View>

      <Animated.View style={btnStyle}>
        <AdminScalePressable
          onPress={onPress}
          scaleTo={0.9}
          accessibilityRole="button"
          accessibilityLabel="Open Vidya AI assistant"
        >
          <LinearGradient
            colors={[...colors.fabGradient]}
            style={[styles.imageButton, { borderRadius: radius.full }]}
          >
            <Ionicons name="sparkles" size={28} color="#fff" />
          </LinearGradient>
        </AdminScalePressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 32,
    left: 16,
    zIndex: 50,
    alignItems: 'flex-start',
  },
  messageContainer: {
    marginBottom: 10,
  },
  messageBubble: {
    padding: 12,
    borderWidth: 1,
    maxWidth: 220,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  messageText: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  messageTail: {
    position: 'absolute',
    bottom: -8,
    left: 28,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  imageButton: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
});
