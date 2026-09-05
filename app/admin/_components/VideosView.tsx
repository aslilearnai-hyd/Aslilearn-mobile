import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import adminService from '../../../src/services/api/adminService';
import {
  AdminScreenShell,
  AdminSearchBar,
  AdminFilterChips,
  AdminGlassCard,
  AdminEmptyState,
  AdminSkeletonList,
  AdminFAB,
  AdminModalShell,
  AdminScalePressable,
  useAdminTheme,
} from '../_ui';

interface Video {
  _id: string;
  title: string;
  description?: string;
  subject?: string | { _id: string; name: string };
  duration: number;
  videoUrl?: string;
  youtubeUrl?: string;
  isYouTubeVideo?: boolean;
  thumbnailUrl?: string;
  difficulty?: string;
  language?: string;
  isActive: boolean;
  views?: number;
  createdAt: string;
}

export default function VideosView() {
  const { colors, spacing, radius, typo } = useAdminTheme();
  const [videos, setVideos] = useState<Video[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newVideo, setNewVideo] = useState({
    title: '',
    description: '',
    subject: '',
    subjectId: '',
    duration: 30,
    videoUrl: '',
    youtubeUrl: '',
    isYouTubeVideo: false,
    difficulty: 'medium',
    language: 'English',
  });

  const fetchSubjects = async () => {
    try {
      const data = await adminService.getSubjects();
      setSubjects(data?.data || data?.subjects || data || []);
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
    }
  };

  const fetchVideos = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await adminService.getVideos();
      setVideos(data?.data || data || []);
    } catch (error) {
      console.error('Failed to fetch videos:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchVideos();
    fetchSubjects();
  }, [fetchVideos]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchVideos();
  }, [fetchVideos]);

  const handleCreateVideo = async () => {
    if (!newVideo.title || !newVideo.subject) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }

    try {
      await adminService.createVideo({
        ...newVideo,
        subjectId: newVideo.subject,
      });
      Alert.alert('Success', 'Video created successfully');
      setIsCreateModalOpen(false);
      setNewVideo({
        title: '',
        description: '',
        subject: '',
        subjectId: '',
        duration: 30,
        videoUrl: '',
        youtubeUrl: '',
        isYouTubeVideo: false,
        difficulty: 'medium',
        language: 'English',
      });
      fetchVideos();
    } catch (error) {
      console.error('Failed to create video:', error);
      Alert.alert('Error', 'An error occurred');
    }
  };

  const handleDeleteVideo = async (id: string) => {
    Alert.alert(
      'Delete Video',
      'Are you sure you want to delete this video?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminService.deleteVideo(id);
              fetchVideos();
            } catch (error) {
              console.error('Failed to delete video:', error);
            }
          },
        },
      ]
    );
  };

  const filteredVideos = videos.filter((video) => {
    const matchesSearch = video.title.toLowerCase().includes(searchTerm.toLowerCase());
    const subjectId = typeof video.subject === 'object' ? video.subject?._id : video.subject;
    const matchesSubject = filterSubject === 'all' || subjectId === filterSubject;
    return matchesSearch && matchesSubject;
  });

  const subjectChips = [
    { id: 'all', label: 'All Subjects' },
    ...subjects.map((s) => ({ id: s._id || s.id, label: s.name })),
  ];

  if (isLoading && !refreshing) {
    return <AdminSkeletonList count={5} />;
  }

  return (
    <>
      <AdminScreenShell refreshing={refreshing} onRefresh={onRefresh}>
        <AdminSearchBar
          placeholder="Search Videos..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          style={{ marginBottom: spacing.sm }}
        />

        <AdminFilterChips chips={subjectChips} selected={filterSubject} onSelect={setFilterSubject} />
        <View style={{ height: spacing.md }} />

        {filteredVideos.length === 0 ? (
          <AdminEmptyState
            icon="videocam-outline"
            title="No Videos Found"
            message="Create your first video to get started"
          />
        ) : (
          filteredVideos.map((video, index) => {
            const subjectName =
              typeof video.subject === 'object' ? video.subject?.name : video.subject || 'General';

            return (
              <AdminGlassCard key={video._id} delay={index * 50} style={{ marginBottom: spacing.sm }}>
                <View style={styles.videoHeader}>
                  <View style={[styles.videoIcon, { backgroundColor: colors.primaryMuted }]}>
                    <Ionicons name="videocam" size={24} color={colors.primary} />
                  </View>
                  <View style={styles.videoInfo}>
                    <Text style={[typo.section, { color: colors.text }]} numberOfLines={2}>
                      {video.title}
                    </Text>
                    <Text style={[styles.videoSubject, { color: colors.textMuted }]}>{subjectName}</Text>
                  </View>
                  <AdminScalePressable
                    onPress={() => handleDeleteVideo(video._id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete video ${video.title}`}
                  >
                    <Ionicons name="trash" size={20} color={colors.danger} />
                  </AdminScalePressable>
                </View>

                {video.description ? (
                  <Text style={[styles.videoDescription, { color: colors.textMuted }]} numberOfLines={2}>
                    {video.description}
                  </Text>
                ) : null}

                <View style={[styles.videoMeta, { borderTopColor: colors.surfaceBorder }]}>
                  <View style={styles.metaItem}>
                    <Ionicons name="time" size={16} color={colors.primary} />
                    <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                      {video.duration} min
                    </Text>
                  </View>
                  {video.views !== undefined ? (
                    <View style={styles.metaItem}>
                      <Ionicons name="eye" size={16} color={colors.textMuted} />
                      <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                        {video.views} views
                      </Text>
                    </View>
                  ) : null}
                  {video.isYouTubeVideo ? (
                    <View style={[styles.youtubeBadge, { backgroundColor: colors.dangerMuted }]}>
                      <Ionicons name="logo-youtube" size={16} color={colors.danger} />
                      <Text style={[styles.youtubeText, { color: colors.danger }]}>YouTube</Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.statusBadge}>
                  <Ionicons
                    name={video.isActive ? 'checkmark-circle' : 'close-circle'}
                    size={16}
                    color={video.isActive ? colors.success : colors.danger}
                  />
                  <Text
                    style={[
                      styles.statusText,
                      { color: video.isActive ? colors.success : colors.danger },
                    ]}
                  >
                    {video.isActive ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </AdminGlassCard>
            );
          })
        )}
      </AdminScreenShell>

      <AdminFAB onPress={() => setIsCreateModalOpen(true)} icon="add" />

      <AdminModalShell
        visible={isCreateModalOpen}
        title="Create Video"
        onClose={() => setIsCreateModalOpen(false)}
      >
        <ScrollView style={{ maxHeight: 520 }} keyboardShouldPersistTaps="handled">
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Title *</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.inputBorder, color: colors.text, backgroundColor: colors.inputBg }]}
              placeholder="Video Title"
              placeholderTextColor={colors.textMuted}
              value={newVideo.title}
              onChangeText={(text) => setNewVideo({ ...newVideo, title: text })}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea, { borderColor: colors.inputBorder, color: colors.text, backgroundColor: colors.inputBg }]}
              placeholder="Video Description"
              placeholderTextColor={colors.textMuted}
              value={newVideo.description}
              onChangeText={(text) => setNewVideo({ ...newVideo, description: text })}
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Subject *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {subjects.map((subject) => (
                <AdminScalePressable
                  key={subject._id || subject.id}
                  onPress={() => setNewVideo({ ...newVideo, subject: subject._id || subject.id })}
                  style={[
                    styles.chip,
                    {
                      borderRadius: radius.full,
                      backgroundColor:
                        newVideo.subject === (subject._id || subject.id)
                          ? colors.primary
                          : colors.surface,
                      borderColor: colors.surfaceBorder,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color:
                        newVideo.subject === (subject._id || subject.id)
                          ? colors.textInverse
                          : colors.textSecondary,
                      fontWeight: '600',
                      fontSize: 13,
                    }}
                  >
                    {subject.name}
                  </Text>
                </AdminScalePressable>
              ))}
            </ScrollView>
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Video Type</Text>
            <View style={[styles.toggleContainer, { backgroundColor: colors.bgElevated }]}>
              <AdminScalePressable
                onPress={() => setNewVideo({ ...newVideo, isYouTubeVideo: false })}
                style={[
                  styles.toggleButton,
                  !newVideo.isYouTubeVideo && { backgroundColor: colors.primary, borderRadius: radius.sm },
                ]}
              >
                <Text
                  style={[
                    styles.toggleText,
                    { color: !newVideo.isYouTubeVideo ? colors.textInverse : colors.textMuted },
                  ]}
                >
                  Direct URL
                </Text>
              </AdminScalePressable>
              <AdminScalePressable
                onPress={() => setNewVideo({ ...newVideo, isYouTubeVideo: true })}
                style={[
                  styles.toggleButton,
                  newVideo.isYouTubeVideo && { backgroundColor: colors.primary, borderRadius: radius.sm },
                ]}
              >
                <Text
                  style={[
                    styles.toggleText,
                    { color: newVideo.isYouTubeVideo ? colors.textInverse : colors.textMuted },
                  ]}
                >
                  YouTube
                </Text>
              </AdminScalePressable>
            </View>
          </View>

          {newVideo.isYouTubeVideo ? (
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>YouTube URL *</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.inputBorder, color: colors.text, backgroundColor: colors.inputBg }]}
                placeholder="https://youtube.com/watch?v=..."
                placeholderTextColor={colors.textMuted}
                value={newVideo.youtubeUrl}
                onChangeText={(text) => setNewVideo({ ...newVideo, youtubeUrl: text })}
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>
          ) : (
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Video URL *</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.inputBorder, color: colors.text, backgroundColor: colors.inputBg }]}
                placeholder="https://..."
                placeholderTextColor={colors.textMuted}
                value={newVideo.videoUrl}
                onChangeText={(text) => setNewVideo({ ...newVideo, videoUrl: text })}
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>
          )}

          <View style={styles.inputRow}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Duration (Min)</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.inputBorder, color: colors.text, backgroundColor: colors.inputBg }]}
                placeholder="30"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={newVideo.duration.toString()}
                onChangeText={(text) => setNewVideo({ ...newVideo, duration: parseInt(text) || 30 })}
              />
            </View>
            <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Difficulty</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {['easy', 'medium', 'hard'].map((diff) => (
                  <AdminScalePressable
                    key={diff}
                    onPress={() => setNewVideo({ ...newVideo, difficulty: diff })}
                    style={[
                      styles.chip,
                      {
                        borderRadius: radius.full,
                        backgroundColor: newVideo.difficulty === diff ? colors.primary : colors.surface,
                        borderColor: colors.surfaceBorder,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: newVideo.difficulty === diff ? colors.textInverse : colors.textSecondary,
                        fontWeight: '600',
                        fontSize: 13,
                      }}
                    >
                      {diff.charAt(0).toUpperCase() + diff.slice(1)}
                    </Text>
                  </AdminScalePressable>
                ))}
              </ScrollView>
            </View>
          </View>

          <AdminScalePressable
            onPress={handleCreateVideo}
            style={[styles.createButton, { backgroundColor: colors.primary, borderRadius: radius.sm }]}
          >
            <Text style={[styles.createButtonText, { color: colors.textInverse }]}>Create Video</Text>
          </AdminScalePressable>
        </ScrollView>
      </AdminModalShell>
    </>
  );
}

const styles = StyleSheet.create({
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, marginRight: 8 },
  videoHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
  videoIcon: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  videoInfo: { flex: 1 },
  videoSubject: { fontSize: 14, marginTop: 4 },
  videoDescription: { fontSize: 14, marginBottom: 12 },
  videoMeta: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 12, paddingTop: 12, borderTopWidth: 1 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 14 },
  youtubeBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 },
  youtubeText: { fontSize: 12, fontWeight: '600' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusText: { fontSize: 14, fontWeight: '600' },
  inputContainer: { marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 16 },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  inputRow: { flexDirection: 'row', gap: 16 },
  toggleContainer: { flexDirection: 'row', borderRadius: 12, padding: 4 },
  toggleButton: { flex: 1, paddingVertical: 8, paddingHorizontal: 16, alignItems: 'center' },
  toggleText: { fontSize: 14, fontWeight: '600' },
  createButton: { padding: 16, alignItems: 'center', marginTop: 8, marginBottom: 16 },
  createButtonText: { fontSize: 16, fontWeight: '700' },
});
