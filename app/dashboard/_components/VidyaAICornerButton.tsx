import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { GlassPanel } from '../../../src/components/ui';

const messages = [
  'Need Some Help With Your Homework?',
  'Need Some Help With Maths?',
  'Need Some Help With Physics?',
  'Need Some Help With Chemistry?',
];

export default function VidyaAICornerButton() {
  const [currentMessage, setCurrentMessage] = useState(0);
  const [showMessage, setShowMessage] = useState(true);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessage((prev) => (prev + 1) % messages.length);
    }, 5000); // Increased from 3s to 5s to reduce re-renders
    return () => clearInterval(interval);
  }, []);

  const handlePress = useCallback(() => {
    router.push('/ai-tutor');
  }, []);

  const currentMessageText = useMemo(() => messages[currentMessage], [currentMessage]);

  return (
    <View style={styles.container}>
      {showMessage && (
        <Animated.View
          style={[
            styles.messageBubbleWrap,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <GlassPanel radius={12} tone="strong" style={styles.messageBubble}>
            <Text style={styles.messageText}>{currentMessageText}</Text>
          </GlassPanel>
          <View style={styles.messageTail} />
        </Animated.View>
      )}
      
      <TouchableOpacity
        style={styles.button}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <View style={styles.imageContainer}>
          <Image
            source={require('../../../assets/Vidya-ai.jpg')}
            style={styles.avatarImage}
            contentFit="cover"
            transition={200}
          />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    zIndex: 1000,
  },
  // The tail must sit outside the panel's clipped bounds, so it stays a sibling
  // inside this wrapper rather than a child of the frosted bubble.
  messageBubbleWrap: {
    marginBottom: 12,
    maxWidth: 200,
  },
  messageBubble: {
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  messageText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  messageTail: {
    position: 'absolute',
    bottom: -8,
    left: 32,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#fff',
  },
  button: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  imageContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
});
