import React, { memo, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import GlassCard from '../../../../src/components/student/GlassCard';
import {
  STUDENT,
  STUDENT_ANIMATION,
  STUDENT_RADIUS,
  SUBJECT_COLORS,
} from '../../../../src/theme/student';

interface VideoCardProps {
  title: string;
  description?: string;
  subjectName?: string;
  durationText: string;
  views?: number;
  watchProgress?: number;
  isBookmarked: boolean;
  isYouTubeVideo?: boolean;
  onPress: () => void;
  onToggleBookmark: () => void;
}

function subjectAccent(name?: string): string {
  if (!name) return SUBJECT_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return SUBJECT_COLORS[Math.abs(hash) % SUBJECT_COLORS.length];
}

function AnimatedWatchProgress({ progress }: { progress: number }) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(Math.min(100, progress * 100), {
      duration: STUDENT_ANIMATION.slow,
      easing: Easing.out(Easing.quad),
    });
  }, [progress, width]);

  const animStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }));

  return (
    <View style={styles.progressTrack}>
      <Animated.View style={[styles.progressFill, animStyle]} />
    </View>
  );
}

function VideoCardComponent({
  title,
  description,
  subjectName,
  durationText,
  views = 0,
  watchProgress = 0,
  isBookmarked,
  isYouTubeVideo,
  onPress,
  onToggleBookmark,
}: VideoCardProps) {
  const progress = Math.max(0, Math.min(1, watchProgress || 0));
  const accent = subjectAccent(subjectName || description);

  return (
    <GlassCard variant="glass" padding={12} style={styles.cardWrap} onPress={onPress}>
      <View style={styles.row}>
        <View style={[styles.thumbnail, { backgroundColor: `${accent}14` }]}>
          <Ionicons
            name={isYouTubeVideo ? 'logo-youtube' : 'play-circle'}
            size={34}
            color={isYouTubeVideo ? STUDENT.danger : accent}
          />
          <Pressable onPress={onToggleBookmark} style={styles.bookmark} hitSlop={10}>
            <Ionicons
              name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
              size={16}
              color={STUDENT.textOnPrimary}
            />
          </Pressable>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>
            {title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {subjectName || description || 'Video Lecture'}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{durationText}</Text>
            <Text style={styles.dot}>•</Text>
            <Text style={styles.metaText}>{views} views</Text>
          </View>
          {progress > 0 ? <AnimatedWatchProgress progress={progress} /> : null}
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  cardWrap: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  thumbnail: {
    width: 110,
    height: 76,
    borderRadius: STUDENT_RADIUS.inner,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bookmark: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: STUDENT_RADIUS.sm,
    backgroundColor: 'rgba(15,23,42,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: STUDENT.text,
    lineHeight: 21,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13,
    color: STUDENT.textMuted,
  },
  metaRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: STUDENT.textMuted,
  },
  dot: {
    fontSize: 12,
    color: STUDENT.navInactive,
    marginHorizontal: 6,
  },
  progressTrack: {
    marginTop: 8,
    height: 4,
    borderRadius: STUDENT_RADIUS.full,
    backgroundColor: STUDENT.accentSoft,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: STUDENT_RADIUS.full,
    backgroundColor: STUDENT.accent,
  },
});

export default memo(VideoCardComponent);
