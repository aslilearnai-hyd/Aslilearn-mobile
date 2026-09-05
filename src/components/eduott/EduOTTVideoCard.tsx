import React, { memo, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import {
  formatEduOTTDurationLabel,
  getEduOTTThumbnailUrls,
  type EduOTTVideoLike,
} from '../../utils/eduottVideoUtils';

export type EduOTTVideoCardProps = {
  title: string;
  durationSeconds?: number;
  subjectLabel?: string;
  classLabel?: string;
  thumbnailUrl?: string;
  youtubeUrl?: string;
  fileUrl?: string;
  videoUrl?: string;
  onPress: () => void;
  variant?: 'teacher' | 'student';
  layout?: 'vertical' | 'horizontal';
  style?: StyleProp<ViewStyle>;
};

function themeFor(variant: 'teacher' | 'student') {
  if (variant === 'teacher') {
    return {
      cardBg: '#FFFFFF',
      border: '#E2E8F0',
      title: '#0F172A',
      subjectBg: '#F8FAFC',
      subjectBorder: '#E2E8F0',
      subjectText: '#475569',
      classBg: '#E0F2FE',
      classText: '#0369A1',
      playAccent: '#6366F1',
      placeholder: '#EEF2FF',
    };
  }
  return {
    cardBg: '#FFFFFF',
    border: '#E2E8F0',
    title: '#0F172A',
    subjectBg: '#F8FAFC',
    subjectBorder: '#E2E8F0',
    subjectText: '#475569',
    classBg: '#E0F2FE',
    classText: '#0369A1',
    playAccent: '#2563EB',
    placeholder: '#EFF6FF',
  };
}

function EduOTTVideoCardComponent({
  title,
  durationSeconds = 0,
  subjectLabel,
  classLabel,
  thumbnailUrl,
  youtubeUrl,
  fileUrl,
  videoUrl,
  onPress,
  variant = 'student',
  layout = 'vertical',
  style,
}: EduOTTVideoCardProps) {
  const theme = themeFor(variant);
  const isHorizontal = layout === 'horizontal';
  const [thumbError, setThumbError] = useState(false);
  const [thumbIndex, setThumbIndex] = useState(0);

  const videoLike: EduOTTVideoLike = useMemo(
    () => ({ thumbnailUrl, youtubeUrl, fileUrl, videoUrl }),
    [thumbnailUrl, youtubeUrl, fileUrl, videoUrl],
  );

  const thumbnailUrls = useMemo(() => getEduOTTThumbnailUrls(videoLike), [videoLike]);
  const thumbnailSrc = thumbnailUrls[thumbIndex] ?? null;
  const durationLabel = formatEduOTTDurationLabel(durationSeconds);
  const showThumbnail = thumbnailSrc && !thumbError;

  useEffect(() => {
    setThumbIndex(0);
    setThumbError(false);
  }, [thumbnailUrls]);

  const handleThumbError = () => {
    if (thumbIndex < thumbnailUrls.length - 1) {
      setThumbIndex((prev) => prev + 1);
      return;
    }
    setThumbError(true);
  };

  const thumbnailBlock = (
    <View style={[styles.thumbnailWrap, isHorizontal && styles.thumbnailWrapHorizontal]}>
      {showThumbnail ? (
        <Image
          source={{ uri: thumbnailSrc }}
          style={styles.thumbnail}
          contentFit="cover"
          cachePolicy="memory-disk"
          recyclingKey={thumbnailSrc}
          onError={handleThumbError}
        />
      ) : (
        <View style={[styles.thumbnail, styles.thumbnailPlaceholder, { backgroundColor: theme.placeholder }]}>
          <Ionicons name="videocam-outline" size={isHorizontal ? 28 : 40} color={theme.playAccent} />
        </View>
      )}

      <View style={styles.brandBadge}>
        <Text style={styles.brandTitle}>ASLI PREP</Text>
        <Text style={styles.brandSub}>FOUNDATION</Text>
      </View>

      {durationLabel ? (
        <View style={styles.durationBadge}>
          <Ionicons name="time-outline" size={12} color="#FFFFFF" />
          <Text style={styles.durationText}>{durationLabel}</Text>
        </View>
      ) : null}
    </View>
  );

  const bodyBlock = (
    <View style={[styles.body, isHorizontal && styles.bodyHorizontal]}>
      <Text style={[styles.title, isHorizontal && styles.titleHorizontal, { color: theme.title }]}>
        {title}
      </Text>

      {(subjectLabel || classLabel) ? (
        <View style={styles.tagsRow}>
          {subjectLabel ? (
            <View
              style={[
                styles.subjectTag,
                { backgroundColor: theme.subjectBg, borderColor: theme.subjectBorder },
              ]}
            >
              <Ionicons name="book-outline" size={12} color={theme.subjectText} />
              <Text style={[styles.subjectTagText, { color: theme.subjectText }]}>{subjectLabel}</Text>
            </View>
          ) : null}
          {classLabel ? (
            <View style={[styles.classTag, { backgroundColor: theme.classBg }]}>
              <Text style={[styles.classTagText, { color: theme.classText }]}>Class {classLabel}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Play video: ${title}`}
      style={({ pressed }) => [
        styles.card,
        isHorizontal && styles.cardHorizontal,
        style,
        {
          backgroundColor: theme.cardBg,
          borderColor: theme.border,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      {isHorizontal ? (
        <>
          {bodyBlock}
          {thumbnailBlock}
        </>
      ) : (
        <>
          {thumbnailBlock}
          {bodyBlock}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHorizontal: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 132,
    marginBottom: 0,
  },
  thumbnailWrap: {
    position: 'relative',
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#F1F5F9',
  },
  thumbnailWrapHorizontal: {
    width: '42%',
    minWidth: 120,
    maxWidth: 180,
    aspectRatio: undefined,
    alignSelf: 'stretch',
    minHeight: 132,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(226,232,240,0.9)',
  },
  brandTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: '#4F46E5',
    letterSpacing: 0.4,
  },
  brandSub: {
    fontSize: 7,
    fontWeight: '600',
    color: '#64748B',
    letterSpacing: 0.2,
    marginTop: 1,
  },
  durationBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.72)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  durationText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  body: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
  },
  bodyHorizontal: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
  titleHorizontal: {
    fontSize: 13,
    lineHeight: 18,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  subjectTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  subjectTagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  classTag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  classTagText: {
    fontSize: 12,
    fontWeight: '700',
  },
});

export default memo(EduOTTVideoCardComponent);
