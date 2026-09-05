import { storageGetItem } from '../src/lib/safe-storage';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { API_BASE_URL } from '../src/lib/api-config';
import { dedupeLibraryContents } from '../src/lib/dedupe-library-content';
import { getVideoDisplayTitle } from '../src/lib/video-chapter-schedule';
import { useBackNavigation, getDashboardPath } from '../src/hooks/useBackNavigation';
import { GlassPanel } from '../src/components/ui';

interface Video {
  _id: string;
  title: string;
  description?: string;
  duration: number;
  videoUrl?: string;
  youtubeUrl?: string;
  isYouTubeVideo?: boolean;
  thumbnailUrl?: string;
  difficulty?: string;
  language?: string;
  subject?: {
    _id: string;
    name: string;
  } | string;
  chapter?: string;
  module?: string;
  topic?: string;
  views?: number;
  createdAt: string;
}

export default function VideoLectures() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [subjects, setSubjects] = useState<any[]>([]);
  const [dashboardPath, setDashboardPath] = useState<string>('/dashboard');

  useEffect(() => {
    fetchVideos();
    fetchSubjects();
    getDashboardPath().then(path => {
      if (path) setDashboardPath(path);
    });
  }, []);

  useBackNavigation(dashboardPath, false);

  const fetchVideos = async () => {
    try {
      setIsLoading(true);
      const token = await storageGetItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/student/videos`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setVideos(dedupeLibraryContents(data.data || data || []));
      }
    } catch (error) {
      console.error('Failed to fetch videos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const token = await storageGetItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/subjects`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSubjects(data.subjects || data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
    }
  };

  const extractYouTubeId = (url: string): string | null => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const filteredVideos = useMemo(() => {
    return videos.filter(video => {
      const matchesSearch = !searchQuery || video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (video.description && video.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const subjectId = typeof video.subject === 'object' ? video.subject?._id : video.subject;
      const matchesSubject = selectedSubject === 'all' || subjectId === selectedSubject;
      const matchesDifficulty = selectedDifficulty === 'all' || video.difficulty?.toLowerCase() === selectedDifficulty.toLowerCase();
      return matchesSearch && matchesSubject && matchesDifficulty;
    });
  }, [videos, searchQuery, selectedSubject, selectedDifficulty]);

  const handleVideoPress = useCallback((video: Video) => {
    router.push(`/video-player?videoId=${video._id}`);
  }, []);

  const renderVideoItem = useCallback(({ item: video }: { item: Video }) => {
    const subjectName = typeof video.subject === 'object'
      ? video.subject?.name
      : video.subject || 'General';
    const youtubeId = video.isYouTubeVideo && video.youtubeUrl
      ? extractYouTubeId(video.youtubeUrl)
      : null;

    return (
      <TouchableOpacity
        style={styles.videoCard}
        onPress={() => handleVideoPress(video)}
        activeOpacity={0.7}
      >
        {/* the touchable stays for hit area; the glass card carries the clipped frame */}
        <GlassPanel style={styles.videoCardInner} radius={12} tone="medium">
          <View style={styles.videoThumbnail}>
            {youtubeId ? (
              <Image
                source={{ uri: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` }}
                style={styles.thumbnailImage}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={200}
              />
            ) : video.thumbnailUrl ? (
              <Image
                source={{ uri: video.thumbnailUrl }}
                style={styles.thumbnailImage}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={200}
              />
            ) : (
              <View style={styles.thumbnailPlaceholder}>
                <Ionicons name="videocam" size={48} color="#9ca3af" />
              </View>
            )}
            <View style={styles.playOverlay}>
              <View style={styles.playButton}>
                <Ionicons name="play" size={24} color="#fff" />
              </View>
            </View>
            <View style={styles.durationBadge}>
              <Ionicons name="time" size={12} color="#fff" />
              <Text style={styles.durationText}>
                {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
              </Text>
            </View>
          </View>
          <View style={styles.videoInfo}>
            <Text style={styles.videoTitle}>{getVideoDisplayTitle({ ...video, type: 'Video' })}</Text>
            <Text style={styles.videoSubject}>{subjectName}</Text>
            <View style={styles.videoMeta}>
              {video.difficulty && (
                <View style={[styles.difficultyBadge, difficultyBadgeStyle(video.difficulty)]}>
                  <Text style={styles.difficultyText}>{video.difficulty}</Text>
                </View>
              )}
              {video.views !== undefined && (
                <View style={styles.viewsContainer}>
                  <Ionicons name="eye" size={14} color="#6b7280" />
                  <Text style={styles.viewsText}>{video.views}</Text>
                </View>
              )}
            </View>
          </View>
        </GlassPanel>
      </TouchableOpacity>
    );
  }, [handleVideoPress]);

  const keyExtractor = useCallback((item: Video) => item._id, []);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading videos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={['#3b82f6', '#2563eb']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.replace(dashboardPath)} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Video Lectures</Text>
            <Text style={styles.headerSubtitle}>Learn at your own pace</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Search and Filters */}
      <View style={styles.filtersContainer}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#6b7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search videos..."
            placeholderTextColor="#5B6779"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <TouchableOpacity
            style={[styles.filterChip, selectedSubject === 'all' && styles.filterChipActive]}
            onPress={() => setSelectedSubject('all')}
          >
            <Text style={[styles.filterChipText, selectedSubject === 'all' && styles.filterChipTextActive]}>
              All Subjects
            </Text>
          </TouchableOpacity>
          {subjects.map(subject => (
            <TouchableOpacity
              key={subject._id || subject.id}
              style={[styles.filterChip, selectedSubject === (subject._id || subject.id) && styles.filterChipActive]}
              onPress={() => setSelectedSubject(subject._id || subject.id)}
            >
              <Text style={[styles.filterChipText, selectedSubject === (subject._id || subject.id) && styles.filterChipTextActive]}>
                {subject.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {['all', 'easy', 'medium', 'hard'].map(difficulty => (
            <TouchableOpacity
              key={difficulty}
              style={[styles.filterChip, selectedDifficulty === difficulty && styles.filterChipActive]}
              onPress={() => setSelectedDifficulty(difficulty)}
            >
              <Text style={[styles.filterChipText, selectedDifficulty === difficulty && styles.filterChipTextActive]}>
                {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Videos Grid */}
      {filteredVideos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="videocam-off" size={64} color="#5B6779" />
          <Text style={styles.emptyText}>No videos found</Text>
          <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
        </View>
      ) : (
        <FlatList
          data={filteredVideos}
          renderItem={renderVideoItem}
          keyExtractor={keyExtractor}
          numColumns={2}
          contentContainerStyle={styles.videosGrid}
          style={styles.content}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          initialNumToRender={10}
          windowSize={10}
          getItemLayout={(data, index) => ({
            length: 200,
            offset: 200 * Math.floor(index / 2),
            index,
          })}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // transparent so the app-wide pastel artwork shows through the glass cards
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  filtersContainer: {
    backgroundColor: 'transparent',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.55)',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  filterScroll: {
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.6)',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#3b82f6',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  videosGrid: {
    padding: 16,
    gap: 12,
  },
  videoCard: {
    width: '47%',
    borderRadius: 12,
  },
  videoCardInner: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  videoThumbnail: {
    width: '100%',
    height: 120,
    backgroundColor: '#e5e7eb',
    position: 'relative',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#d1d5db',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(59, 130, 246, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  durationText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  videoInfo: {
    padding: 12,
  },
  videoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  videoSubject: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  videoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  // Tints below are matched case-insensitively — see difficultyBadgeStyle.
  difficultyEasy: {
    backgroundColor: '#d1fae5',
  },
  difficultyMedium: {
    backgroundColor: '#fef3c7',
  },
  difficultyHard: {
    backgroundColor: '#fee2e2',
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: '700',
  },
  viewsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewsText: {
    fontSize: 12,
    color: '#6b7280',
  },
});
/**
 * The API returns difficulty with inconsistent casing (see the .toLowerCase()
 * comparison in the filter above), so match case-insensitively rather than
 * building a style key by string interpolation — that silently produced an
 * untinted badge for any value that wasn't exactly Easy/Medium/Hard.
 */
function difficultyBadgeStyle(difficulty?: string) {
  switch (difficulty?.toLowerCase()) {
    case 'easy':
      return styles.difficultyEasy;
    case 'medium':
      return styles.difficultyMedium;
    case 'hard':
      return styles.difficultyHard;
    default:
      return undefined;
  }
}
