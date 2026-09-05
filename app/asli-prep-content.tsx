import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, SectionList, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import api from '../src/services/api/api';
import { useContentViewerBack } from '../src/hooks/useBackNavigation';
import { openContentPreview } from '../src/utils/openContentPreview';
import { useSchoolProgram } from '../src/hooks/useSchoolProgram';
import {
  getAllowedContentTypes,
  type ContentTypeName,
} from '../src/lib/school-program';
import { prepareLibraryContents, getLibraryContentDisplayTitle } from '../src/lib/dedupe-library-content';
import { libraryContentMatchesSubject } from '../src/lib/library-content-labels';
import {
  learningPathDisplayName,
  prepareStudentLearningPathSubjects,
} from '../src/lib/learning-path-subjects';
import { getVideoDisplayTitle, sortContentsChapterWise } from '../src/lib/video-chapter-schedule';
import { GlassPanel } from '../src/components/ui';

const HEADER_GRADIENT = ['#0f766e', '#0284c7', '#0891b2'] as const;
const ACCENT = '#0284c7';

interface Content {
  _id: string;
  title: string;
  description?: string;
  type: 'TextBook' | 'Workbook' | 'Material' | 'Video' | 'Audio' | 'Homework';
  subject?: {
    _id: string;
    name: string;
    classNumber?: string | number | null;
    productCategory?: string | null;
  };
  subjectId?: {
    _id: string;
    name: string;
    classNumber?: string | number | null;
    productCategory?: string | null;
  } | string;
  topic?: string;
  chapter?: string;
  module?: string;
  classNumber?: string | number | null;
  productCategory?: string | null;
  fileUrl?: string;
  fileUrls?: string[];
  youtubeUrl?: string;
  videoUrl?: string;
  driveLink?: string;
  thumbnailUrl?: string;
  duration?: number;
  size?: number;
  views?: number;
  downloadCount?: number;
  createdAt: string;
}

const VALID_TYPES = ['TextBook', 'Workbook', 'Material', 'Video', 'Audio', 'Homework'] as const;

export default function AsliPrepContent() {
  const { type: typeParam, returnTo: returnToRaw } = useLocalSearchParams<{
    type?: string;
    returnTo?: string;
  }>();
  const returnTo = typeof returnToRaw === 'string' ? returnToRaw : '';
  const goBack = useContentViewerBack(returnTo || undefined);
  const { isAsliPrepExclusive, loading: programLoading } = useSchoolProgram();
  const allowedTypes = getAllowedContentTypes(isAsliPrepExclusive);
  const fetchSeqRef = useRef(0);

  const lockedTypeFromRoute = useMemo((): ContentTypeName | null => {
    const raw = Array.isArray(typeParam) ? typeParam[0] : typeParam;
    if (typeof raw === 'string' && VALID_TYPES.includes(raw as (typeof VALID_TYPES)[number])) {
      return raw as ContentTypeName;
    }
    return null;
  }, [typeParam]);

  const lockedType = lockedTypeFromRoute;
  const selectedTypeFilter = lockedTypeFromRoute ?? ('all' as const);

  const [contents, setContents] = useState<Content[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    subject: 'all',
    type: lockedTypeFromRoute ?? ('all' as const),
    topic: '',
  });

  useEffect(() => {
    if (!lockedTypeFromRoute) return;
    setFilters((prev) =>
      prev.type === lockedTypeFromRoute ? prev : { ...prev, type: lockedTypeFromRoute }
    );
  }, [lockedTypeFromRoute]);

  const [subjects, setSubjects] = useState<any[]>([]);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const { data } = await api.get('/api/student/subjects');
      const list = Array.isArray(data?.subjects)
        ? data.subjects
        : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data)
            ? data
            : [];
      setSubjects(prepareStudentLearningPathSubjects(list));
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
    }
  };

  const fetchContents = useCallback(async () => {
    if (programLoading) return;

    const seq = ++fetchSeqRef.current;
    setIsLoading(true);

    try {
      const queryParams = new URLSearchParams();
      if (filters.type && filters.type !== 'all') queryParams.append('type', filters.type);
      queryParams.append('surface', 'learning-path');

      const { data } = await api.get(`/api/student/asli-prep-content?${queryParams}`);
      if (seq !== fetchSeqRef.current) return;

      const rows = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      if (data?.success !== false) {
        setContents(prepareLibraryContents(rows, isAsliPrepExclusive, { surface: 'learning-path' }));
      }
    } catch (error) {
      console.error('Failed to fetch content:', error);
    } finally {
      if (seq === fetchSeqRef.current) {
        setIsLoading(false);
      }
    }
  }, [filters.type, isAsliPrepExclusive, programLoading]);

  useEffect(() => {
    void fetchContents();
  }, [fetchContents]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Video': return 'videocam';
      case 'TextBook': return 'book';
      case 'Workbook': return 'document-text';
      case 'Material': return 'document';
      case 'Audio': return 'musical-notes';
      case 'Homework': return 'clipboard';
      default: return 'document';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Video': return '#ef4444';
      case 'TextBook': return '#3b82f6';
      case 'Workbook': return '#9333ea';
      case 'Material': return '#10b981';
      case 'Audio': return '#f59e0b';
      case 'Homework': return '#ea580c';
      default: return '#6b7280';
    }
  };

  const getSubjectName = useCallback((content: Content) => {
    const sub = content.subjectId || content.subject;
    if (!sub) return '';
    if (typeof sub === 'string') return sub;
    return sub.name || '';
  }, []);

  const subjectChips = useMemo(() => {
    const chips: Array<{ id: string; label: string; mergedSubjectIds?: string[] }> = subjects.map((s) => ({
      id: String(s._id || s.id),
      label: learningPathDisplayName(s.name),
      mergedSubjectIds: Array.isArray(s.mergedSubjectIds) ? s.mergedSubjectIds : undefined,
    }));
    const seen = new Set(chips.map((c) => c.label.toLowerCase()));
    for (const row of contents) {
      const label = learningPathDisplayName(getSubjectName(row));
      if (!label || seen.has(label.toLowerCase())) continue;
      seen.add(label.toLowerCase());
      chips.push({ id: `name:${label}`, label });
    }
    return chips.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
  }, [subjects, contents, getSubjectName]);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return 'N/A';
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  const normalizedType = (value?: string) => String(value || '').trim().toLowerCase();

  const filteredContents = useMemo(() => {
    const selected = subjectChips.find((chip) => chip.id === filters.subject);
    const rows = contents.filter((content) => {
      const matchesSubject =
        filters.subject === 'all' ||
        (selected
          ? libraryContentMatchesSubject(content, {
              _id: selected.id.startsWith('name:') ? undefined : selected.id,
              name: selected.label,
              mergedSubjectIds: selected.mergedSubjectIds,
            })
          : false);
      const matchesType =
        filters.type === 'all' || normalizedType(content.type) === normalizedType(filters.type);
      const q = filters.topic.trim().toLowerCase();
      const matchesTopic =
        !q ||
        content.topic?.toLowerCase().includes(q) ||
        String(content.title || '').toLowerCase().includes(q) ||
        getSubjectName(content).toLowerCase().includes(q);
      return matchesSubject && matchesType && matchesTopic;
    });
    const isVideoList = normalizedType(filters.type) === 'video';
    return isVideoList ? sortContentsChapterWise(rows) : rows;
  }, [contents, filters, subjectChips, getSubjectName]);

  const subjectSections = useMemo(() => {
    const groups = new Map<string, Content[]>();
    for (const row of filteredContents) {
      const title = learningPathDisplayName(getSubjectName(row)) || 'Other';
      if (!groups.has(title)) groups.set(title, []);
      groups.get(title)!.push(row);
    }
    return [...groups.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], undefined, { sensitivity: 'base' }))
      .map(([title, data]) => ({ title, data }));
  }, [filteredContents, getSubjectName]);

  const handleOpenContent = useCallback(
    (content: Content) => {
      const hasUrl = Boolean(
        content.fileUrl ||
          content.fileUrls?.[0] ||
          content.videoUrl ||
          content.driveLink ||
          content.youtubeUrl
      );
      if (!hasUrl) {
        Alert.alert('Content', 'No preview available for this item.');
        return;
      }
      openContentPreview(router, content);
    },
    []
  );

  const renderContentItem = useCallback(({ item: content }: { item: Content }) => {
    const typeColor = getTypeColor(content.type);
    const subjectName = getSubjectName(content);
    const isVideo = normalizedType(content.type) === 'video';
    return (
      <TouchableOpacity
        style={styles.contentCard}
        onPress={() => handleOpenContent(content)}
        activeOpacity={0.7}
      >
        {/* the touchable stays for hit area; the glass card carries the padding and row */}
        <GlassPanel style={styles.contentCardInner} contentStyle={styles.contentCardBody} radius={12} tone="medium">
          <View style={styles.contentRow}>
            <View style={[styles.contentIcon, { backgroundColor: typeColor + '20' }]}>
              <Ionicons name={getTypeIcon(content.type) as any} size={24} color={typeColor} />
            </View>

            <View style={styles.contentInfo}>
              <View style={styles.contentHeader}>
                <View style={[styles.typeBadge, { backgroundColor: typeColor + '20' }]}>
                  <Text style={[styles.typeBadgeText, { color: typeColor }]}>
                    {content.type}
                  </Text>
                </View>
                {subjectName ? (
                  <View style={styles.subjectBadge}>
                    <Text style={styles.subjectBadgeText}>
                      {learningPathDisplayName(subjectName)}
                    </Text>
                  </View>
                ) : null}
              </View>

              <Text style={styles.contentTitle}>
                {isVideo
                  ? getVideoDisplayTitle(content)
                  : getLibraryContentDisplayTitle(content)}
              </Text>

              {typeof content.description === 'string' && content.description.length > 0 ? (
                <Text style={styles.contentDescription} numberOfLines={2}>
                  {content.description}
                </Text>
              ) : null}

              <View style={styles.contentMeta}>
                {content.duration != null && content.duration > 0 ? (
                  <View style={styles.metaItem}>
                    <Ionicons name="time" size={14} color="#6b7280" />
                    <Text style={styles.metaText}>{formatDuration(content.duration)}</Text>
                  </View>
                ) : null}
                {!isVideo && content.size != null && content.size > 0 ? (
                  <View style={styles.metaItem}>
                    <Ionicons name="document" size={14} color="#6b7280" />
                    <Text style={styles.metaText}>{formatFileSize(content.size)}</Text>
                  </View>
                ) : null}
                {typeof content.views === 'number' && content.views > 0 ? (
                  <View style={styles.metaItem}>
                    <Ionicons name="eye" size={14} color="#6b7280" />
                    <Text style={styles.metaText}>{content.views} views</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          {isVideo ? (
            <TouchableOpacity
              style={styles.watchBtn}
              onPress={() => handleOpenContent(content)}
              activeOpacity={0.88}
            >
              <LinearGradient colors={['#0284c7', '#0f766e']} style={styles.watchBtnGrad}>
                <Ionicons name="play" size={16} color="#fff" />
                <Text style={styles.watchBtnText}>Watch Video</Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.downloadButton, { backgroundColor: typeColor }]}
              onPress={() => handleOpenContent(content)}
            >
              <Ionicons name="eye" size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </GlassPanel>
      </TouchableOpacity>
    );
  }, [handleOpenContent, getSubjectName]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />
      <LinearGradient
        colors={[...HEADER_GRADIENT]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => void goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerIcon}>
                <Ionicons
                  name={(lockedType ? getTypeIcon(lockedType) : 'library') as keyof typeof Ionicons.glyphMap}
                  size={24}
                  color="#fff"
                />
              </View>
              <View style={styles.headerTitleBlock}>
                <Text style={styles.headerTitle}>{lockedType || 'Digital Library'}</Text>
                <Text style={styles.headerSubtitle}>
                  {lockedType
                    ? `${filteredContents.length} ${filteredContents.length === 1 ? 'file' : 'files'}`
                    : 'Browse all study materials'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#6b7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by topic..."
            placeholderTextColor="#5B6779"
            value={filters.topic}
            onChangeText={(text) => setFilters({ ...filters, topic: text })}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <TouchableOpacity
            style={[styles.filterChip, filters.subject === 'all' && styles.filterChipActive]}
            onPress={() => setFilters({ ...filters, subject: 'all' })}
          >
            <Text style={[styles.filterChipText, filters.subject === 'all' && styles.filterChipTextActive]}>
              All Subjects
            </Text>
          </TouchableOpacity>
          {subjectChips.map((subject) => (
            <TouchableOpacity
              key={subject.id}
              style={[styles.filterChip, filters.subject === subject.id && styles.filterChipActive]}
              onPress={() => setFilters({ ...filters, subject: subject.id })}
            >
              <Text style={[styles.filterChipText, filters.subject === subject.id && styles.filterChipTextActive]}>
                {subject.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {!lockedType ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {(['all', ...allowedTypes] as const).map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.filterChip, filters.type === type && styles.filterChipActive]}
                onPress={() => setFilters({ ...filters, type })}
              >
                <Text style={[styles.filterChipText, filters.type === type && styles.filterChipTextActive]}>
                  {type === 'all' ? 'All Types' : type}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : null}
      </View>

      {/* Content List */}
      {programLoading || isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={styles.loadingText}>Loading content...</Text>
        </View>
      ) : filteredContents.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-outline" size={64} color="#5B6779" />
          <Text style={styles.emptyText}>No content found</Text>
          <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
        </View>
      ) : (
        <SectionList
          sections={subjectSections}
          renderItem={renderContentItem}
          keyExtractor={(item) => item._id}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>{section.title}</Text>
              <Text style={styles.sectionHeaderCount}>
                {section.data.length} {section.data.length === 1 ? 'file' : 'files'}
              </Text>
            </View>
          )}
          contentContainerStyle={styles.contentList}
          style={styles.content}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          initialNumToRender={10}
          windowSize={10}
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
  header: {
    paddingTop: 8,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerText: {
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
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
    backgroundColor: ACCENT,
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
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
  contentList: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    paddingBottom: 10,
  },
  sectionHeaderText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F766E',
  },
  sectionHeaderCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  contentCard: {
    borderRadius: 12,
    marginBottom: 12,
  },
  contentCardInner: {
    borderRadius: 12,
    padding: 16,
  },
  contentCardBody: {
    gap: 12,
  },
  // GlassPanel wraps children in its own view, so the row lives one level in
  contentRow: {
    flexDirection: 'row',
  },
  contentIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contentInfo: {
    flex: 1,
  },
  contentHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
    gap: 6,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  subjectBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#e0e7ff',
  },
  subjectBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#3730a3',
  },
  contentTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  contentDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  contentMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#6b7280',
  },
  downloadButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
  watchBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  watchBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  watchBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
});

