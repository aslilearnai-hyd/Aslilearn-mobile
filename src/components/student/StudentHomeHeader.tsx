import React from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { resolveStudentDisplayName } from '../../lib/student-text';
import { formatTitleCase } from '../../lib/teacher-text';
import { isVidyaEnabledForUser } from '../../lib/vidya-access';
import StudentCardDecor from './StudentCardDecor';

const VIDYA_ROBOT = require('../../../assets/ROBOT.gif');

type Props = {
  user: any;
  streak?: number;
};

export default function StudentHomeHeader({ user, streak = 0 }: Props) {
  const { width } = useWindowDimensions();
  const compact = width < 380;
  const displayName = resolveStudentDisplayName(user);
  const stream = formatTitleCase(String(user?.educationStream || 'JEE').trim() || 'JEE');
  const vidyaEnabled = isVidyaEnabledForUser(user);
  const robotSize = compact ? 112 : 140;

  return (
    <Animated.View entering={FadeInDown.duration(240)} style={styles.wrap}>
      {streak > 0 ? (
        <View style={styles.streakBanner}>
          <Ionicons name="flame" size={20} color="#f97316" />
          <View style={styles.streakCopy}>
            <Text style={styles.streakTitle}>{streak}-day study streak!</Text>
            <Text style={styles.streakMessage}>Keep it up!</Text>
          </View>
        </View>
      ) : null}

      <LinearGradient
        colors={['#0f766e', '#0284c7', '#0891b2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.85 }}
        style={styles.banner}
      >
        <StudentCardDecor variant="hero" />
        <View style={styles.bannerGlowTop} />
        <View style={styles.bannerGlowBottom} />

        <View style={styles.heroRow}>
          <View style={styles.copy}>
            <Text style={[styles.title, compact && styles.titleCompact]}>
              Welcome, {displayName}!
            </Text>
            <Text style={styles.subtitle}>
              {vidyaEnabled
                ? `Continue Your ${stream} Prep—Vidya AI Has Picks Ready.`
                : `Continue Your ${stream} Prep. Pick Up Where You Left Off.`}
            </Text>
          </View>

          <View style={[styles.robotFrame, { width: robotSize, height: robotSize }]}>
            <Image
              source={VIDYA_ROBOT}
              style={{ width: robotSize - 8, height: robotSize - 8 }}
              contentFit="contain"
              cachePolicy="memory-disk"
              transition={0}
              accessibilityLabel="Vidya AI"
            />
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 16,
    gap: 12,
  },
  streakBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  streakCopy: { flex: 1 },
  streakTitle: { fontSize: 13, fontWeight: '800', color: '#c2410c' },
  streakMessage: { fontSize: 12, color: '#ea580c', marginTop: 1 },
  banner: {
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 18,
    overflow: 'hidden',
  },
  bannerGlowTop: {
    position: 'absolute',
    right: -36,
    top: -70,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  bannerGlowBottom: {
    position: 'absolute',
    left: -48,
    bottom: -80,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(253,230,138,0.2)',
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 2,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.4,
    lineHeight: 30,
  },
  titleCompact: {
    fontSize: 20,
    lineHeight: 26,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    color: 'rgba(255,255,255,0.88)',
  },
  robotFrame: {
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.96)',
    padding: 6,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0f172a',
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
});
