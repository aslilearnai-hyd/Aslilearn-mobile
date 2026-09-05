import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import teacherService, { asArray } from '../../../src/services/api/teacherService';
import { GlassPanel } from '../../../src/components/ui';
import { TEACHER, TEACHER_RADIUS, TEACHER_SPACING, TEACHER_TYPO, glassCard } from '../../../src/theme/teacher';

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

export default function TeacherVideosView() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
    language: 'English'
  });

  useEffect(() => {
    fetchVideos();
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const res = await teacherService.subjects();
      setSubjects(asArray(res.data));
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
    }
  };

  const fetchVideos = async () => {
    try {
      setIsLoading(true);
      const res = await teacherService.videos();
      setVideos(asArray(res.data));
    } catch (error) {
      console.error('Failed to fetch videos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateVideo = async () => {
    if (!newVideo.title || !newVideo.subject) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }

    try {
      await teacherService.createVideo({
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
      await teacherService.invalidateCache('videos');
      fetchVideos();
    } catch {
      Alert.alert('Error', 'Failed to create video');
    }
  };

  const filteredVideos = videos.filter(video => {
    const matchesSearch = video.title.toLowerCase().includes(searchTerm.toLowerCase());
    const subjectId = typeof video.subject === 'object' ? video.subject?._id : video.subject;
    const matchesSubject = filterSubject === 'all' || subjectId === filterSubject;
    return matchesSearch && matchesSubject;
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={TEACHER.primary} />
        <Text style={styles.loadingText}>Loading Videos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search and Filters */}
      <GlassPanel style={styles.filtersContainer} radius={TEACHER_RADIUS.lg} tone="light">
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#6b7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Videos..."
            placeholderTextColor="#5B6779"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <TouchableOpacity
            style={[styles.filterChip, filterSubject === 'all' && styles.filterChipActive]}
            onPress={() => setFilterSubject('all')}
          >
            <Text style={[styles.filterChipText, filterSubject === 'all' && styles.filterChipTextActive]}>
              All Subjects
            </Text>
          </TouchableOpacity>
          {subjects.map(subject => (
            <TouchableOpacity
              key={subject._id || subject.id}
              style={[styles.filterChip, filterSubject === (subject._id || subject.id) && styles.filterChipActive]}
              onPress={() => setFilterSubject(subject._id || subject.id)}
            >
              <Text style={[styles.filterChipText, filterSubject === (subject._id || subject.id) && styles.filterChipTextActive]}>
                {subject.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </GlassPanel>

      {/* Add Button */}
      <TouchableOpacity style={styles.addButton} onPress={() => setIsCreateModalOpen(true)} activeOpacity={0.85}>
        <LinearGradient colors={[TEACHER.primary, TEACHER.primaryDark]} style={styles.addButtonGrad}>
          <Ionicons name="add" size={24} color={TEACHER.textOnPrimary} />
          <Text style={styles.addButtonText}>Create Video</Text>
        </LinearGradient>
      </TouchableOpacity>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} showsVerticalScrollIndicator={false}>
        {filteredVideos.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="videocam-outline" size={64} color="#5B6779" />
            <Text style={styles.emptyText}>No Videos Found</Text>
            <Text style={styles.emptySubtext}>Create Your First Video To Get Started</Text>
          </View>
        ) : (
          filteredVideos.map((video, index) => {
            const subjectName = typeof video.subject === 'object' 
              ? video.subject?.name 
              : video.subject || 'General';

            return (
              <Animated.View key={video._id} entering={FadeInDown.duration(350).delay(Math.min(index * 60, 480))}>
                <GlassPanel style={styles.videoCard} radius={TEACHER_RADIUS.lg} tone="medium">
                  <View style={styles.videoHeader}>
                    <View style={styles.videoIcon}>
                      <Ionicons name="videocam" size={24} color={TEACHER.primaryLight} />
                    </View>
                    <View style={styles.videoInfo}>
                      <Text style={styles.videoTitle} numberOfLines={2}>{video.title}</Text>
                      <Text style={styles.videoSubject}>{subjectName}</Text>
                    </View>
                  </View>

                  {video.description && (
                    <Text style={styles.videoDescription} numberOfLines={2}>
                      {video.description}
                    </Text>
                  )}

                  <View style={styles.videoMeta}>
                    <View style={styles.metaItem}>
                      <Ionicons name="time" size={16} color={TEACHER.primaryLight} />
                      <Text style={styles.metaText}>{video.duration} Min</Text>
                    </View>
                    {video.views !== undefined && (
                      <View style={styles.metaItem}>
                        <Ionicons name="eye" size={16} color={TEACHER.textMuted} />
                        <Text style={styles.metaText}>{video.views} Views</Text>
                      </View>
                    )}
                    {video.isYouTubeVideo && (
                      <View style={styles.youtubeBadge}>
                        <Ionicons name="logo-youtube" size={16} color="#ef4444" />
                        <Text style={styles.youtubeText}>YouTube</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.statusBadge}>
                    <Ionicons
                      name={video.isActive ? 'checkmark-circle' : 'close-circle'}
                      size={16}
                      color={video.isActive ? TEACHER.success : TEACHER.danger}
                    />
                    <Text style={[styles.statusText, { color: video.isActive ? TEACHER.success : TEACHER.danger }]}>
                      {video.isActive ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                </GlassPanel>
              </Animated.View>
            );
          })
        )}
      </ScrollView>

      {/* Create Modal - Similar to Admin VideosView */}
      <Modal
        visible={isCreateModalOpen}
        animationType="slide"
        onRequestClose={() => setIsCreateModalOpen(false)}
        transparent={false}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Video</Text>
            <TouchableOpacity onPress={() => setIsCreateModalOpen(false)}>
              <Ionicons name="close" size={24} color={TEACHER.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="Video Title"
                value={newVideo.title}
                onChangeText={(text) => setNewVideo({ ...newVideo, title: text })}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Video Description"
                value={newVideo.description}
                onChangeText={(text) => setNewVideo({ ...newVideo, description: text })}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Subject *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {subjects.map(subject => (
                  <TouchableOpacity
                    key={subject._id || subject.id}
                    style={[
                      styles.subjectChip,
                      newVideo.subject === (subject._id || subject.id) && styles.subjectChipActive
                    ]}
                    onPress={() => setNewVideo({ ...newVideo, subject: subject._id || subject.id })}
                  >
                    <Text style={[
                      styles.subjectChipText,
                      newVideo.subject === (subject._id || subject.id) && styles.subjectChipTextActive
                    ]}>
                      {subject.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Video Type</Text>
              <View style={styles.toggleContainer}>
                <TouchableOpacity
                  style={[styles.toggleButton, !newVideo.isYouTubeVideo && styles.toggleButtonActive]}
                  onPress={() => setNewVideo({ ...newVideo, isYouTubeVideo: false })}
                >
                  <Text style={[styles.toggleText, !newVideo.isYouTubeVideo && styles.toggleTextActive]}>
                    Direct URL
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleButton, newVideo.isYouTubeVideo && styles.toggleButtonActive]}
                  onPress={() => setNewVideo({ ...newVideo, isYouTubeVideo: true })}
                >
                  <Text style={[styles.toggleText, newVideo.isYouTubeVideo && styles.toggleTextActive]}>
                    YouTube
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {newVideo.isYouTubeVideo ? (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>YouTube URL *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="https://youtube.com/watch?v=..."
                  value={newVideo.youtubeUrl}
                  onChangeText={(text) => setNewVideo({ ...newVideo, youtubeUrl: text })}
                  keyboardType="url"
                  autoCapitalize="none"
                />
              </View>
            ) : (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Video URL *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="https://..."
                  value={newVideo.videoUrl}
                  onChangeText={(text) => setNewVideo({ ...newVideo, videoUrl: text })}
                  keyboardType="url"
                  autoCapitalize="none"
                />
              </View>
            )}

            <View style={styles.inputRow}>
              <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>Duration (Min)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="30"
                  keyboardType="numeric"
                  value={newVideo.duration.toString()}
                  onChangeText={(text) => setNewVideo({ ...newVideo, duration: parseInt(text) || 30 })}
                />
              </View>
              <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.inputLabel}>Difficulty</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {['easy', 'medium', 'hard'].map(diff => (
                    <TouchableOpacity
                      key={diff}
                      style={[
                        styles.difficultyChip,
                        newVideo.difficulty === diff && styles.difficultyChipActive
                      ]}
                      onPress={() => setNewVideo({ ...newVideo, difficulty: diff })}
                    >
                      <Text style={[
                        styles.difficultyChipText,
                        newVideo.difficulty === diff && styles.difficultyChipTextActive
                      ]}>
                        {diff.charAt(0).toUpperCase() + diff.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <TouchableOpacity style={styles.createButton} onPress={handleCreateVideo} activeOpacity={0.85}>
              <LinearGradient colors={[TEACHER.primary, TEACHER.primaryDark]} style={styles.createButtonGrad}>
                <Text style={styles.createButtonText}>Create Video</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // Transparent so AppBackground's artwork shows through.
  container: { flex: 1, backgroundColor: 'transparent', paddingHorizontal: TEACHER_SPACING.lg },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
  loadingText: { marginTop: 12, ...TEACHER_TYPO.body, color: TEACHER.textMuted },
  // backgroundColor cleared: GlassPanel supplies the fill for these cards.
  filtersContainer: { ...glassCard, backgroundColor: 'transparent', borderRadius: TEACHER_RADIUS.lg, padding: TEACHER_SPACING.lg, marginBottom: TEACHER_SPACING.md },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: TEACHER.surfaceElevated,
    borderRadius: TEACHER_RADIUS.md, borderWidth: 1, borderColor: TEACHER.surfaceBorder,
    paddingHorizontal: TEACHER_SPACING.lg, marginBottom: TEACHER_SPACING.md, height: 48,
  },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, ...TEACHER_TYPO.body, color: TEACHER.text },
  filterScroll: { marginBottom: 8 },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: TEACHER.surfaceElevated, borderWidth: 1, borderColor: TEACHER.surfaceBorder, marginRight: 8,
  },
  filterChipActive: { backgroundColor: TEACHER.primary, borderColor: TEACHER.primary },
  filterChipText: { fontSize: 14, fontWeight: '600', color: TEACHER.textSecondary },
  filterChipTextActive: { color: TEACHER.textOnPrimary },
  addButton: { borderRadius: TEACHER_RADIUS.md, overflow: 'hidden', marginBottom: TEACHER_SPACING.md },
  addButtonGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, gap: 8 },
  addButtonText: { color: TEACHER.textOnPrimary, fontSize: 16, fontWeight: '700' },
  content: { flex: 1 },
  contentInner: { paddingBottom: 120 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 64 },
  emptyText: { ...TEACHER_TYPO.section, fontSize: 20, color: TEACHER.text, marginTop: 16, marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: TEACHER.textMuted, textAlign: 'center' },
  videoCard: { ...glassCard, backgroundColor: 'transparent', borderRadius: TEACHER_RADIUS.lg, padding: TEACHER_SPACING.lg, marginBottom: TEACHER_SPACING.md },
  videoHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
  videoIcon: {
    width: 48, height: 48, borderRadius: 12, backgroundColor: TEACHER.surfaceElevated,
    borderWidth: 1, borderColor: TEACHER.surfaceBorder, justifyContent: 'center', alignItems: 'center',
  },
  videoInfo: { flex: 1 },
  videoTitle: { ...TEACHER_TYPO.body, fontWeight: '700', color: TEACHER.text, marginBottom: 4 },
  videoSubject: { fontSize: 14, color: TEACHER.textMuted },
  videoDescription: { fontSize: 14, color: TEACHER.textMuted, marginBottom: 12 },
  videoMeta: {
    flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 12, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: TEACHER.surfaceBorder,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 14, color: TEACHER.textMuted },
  youtubeBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,77,106,0.15)',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4,
  },
  youtubeText: { fontSize: 12, fontWeight: '600', color: TEACHER.danger },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusText: { fontSize: 14, fontWeight: '600' },
  modalContainer: { flex: 1, backgroundColor: '#FFFFFF', paddingTop: 20 },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, paddingTop: 20, borderBottomWidth: 1, borderBottomColor: TEACHER.surfaceBorder,
  },
  modalTitle: { ...TEACHER_TYPO.section, fontSize: 20, color: TEACHER.text },
  modalContent: { flex: 1, padding: 16 },
  inputContainer: { marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: TEACHER.textSecondary, marginBottom: 8 },
  input: {
    borderWidth: 1, borderColor: TEACHER.surfaceBorder, borderRadius: TEACHER_RADIUS.sm,
    padding: 12, fontSize: 16, color: TEACHER.text, backgroundColor: TEACHER.surfaceElevated,
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  inputRow: { flexDirection: 'row', gap: 16 },
  subjectChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: TEACHER.surfaceElevated, borderWidth: 1, borderColor: TEACHER.surfaceBorder, marginRight: 8,
  },
  subjectChipActive: { backgroundColor: TEACHER.primary, borderColor: TEACHER.primary },
  subjectChipText: { fontSize: 14, fontWeight: '600', color: TEACHER.textSecondary },
  subjectChipTextActive: { color: TEACHER.textOnPrimary },
  toggleContainer: {
    flexDirection: 'row', backgroundColor: TEACHER.surfaceElevated, borderRadius: TEACHER_RADIUS.sm,
    padding: 4, borderWidth: 1, borderColor: TEACHER.surfaceBorder,
  },
  toggleButton: { flex: 1, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6, alignItems: 'center' },
  toggleButtonActive: { backgroundColor: TEACHER.primary },
  toggleText: { fontSize: 14, fontWeight: '600', color: TEACHER.textMuted },
  toggleTextActive: { color: TEACHER.textOnPrimary },
  difficultyChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: TEACHER.surfaceElevated, borderWidth: 1, borderColor: TEACHER.surfaceBorder, marginRight: 8,
  },
  difficultyChipActive: { backgroundColor: TEACHER.primary, borderColor: TEACHER.primary },
  difficultyChipText: { fontSize: 14, fontWeight: '600', color: TEACHER.textSecondary },
  difficultyChipTextActive: { color: TEACHER.textOnPrimary },
  createButton: { borderRadius: TEACHER_RADIUS.sm, overflow: 'hidden', marginTop: 8 },
  createButtonGrad: { padding: 16, alignItems: 'center' },
  createButtonText: { color: TEACHER.textOnPrimary, fontSize: 16, fontWeight: '700' },
});

