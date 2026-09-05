import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/services/api/api';
import { useContentViewerBack } from '../../src/hooks/useBackNavigation';
import { openContentPreview } from '../../src/utils/openContentPreview';
import {
  isVideoContent,
  type LearningPathContentItem,
} from '../../src/lib/learningPathContent';
import { useSchoolProgram } from '../../src/hooks/useSchoolProgram';
import { prepareLibraryContents, getLibraryContentDisplayTitle, isIitTrackContent, formatIitLearningPathContentLabel } from '../../src/lib/dedupe-library-content';
import { groupLearningPathContentsWithIit } from '../../src/lib/learning-path-content-groups';
import { GlassPanel } from '../../src/components/ui';
import { learningPathDisplayName } from '../../src/lib/learning-path-subjects';
import { getVideoDisplayTitle } from '../../src/lib/video-chapter-schedule';

function pickParam(v: string | string[] | undefined): string {
  if (v == null) return '';
  const s = Array.isArray(v) ? v[0] : v;
  return typeof s === 'string' ? s : '';
}

function iconForType(type: string): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'Video':
      return 'videocam';
    case 'TextBook':
    case 'Workbook':
      return 'book';
    case 'Material':
      return 'document-text';
    case 'Audio':
      return 'headset';
    case 'Homework':
      return 'clipboard';
    default:
      return 'document';
  }
}

export default function SubjectContent() {
  const router = useRouter();
  const { isAsliPrepExclusive, loading: programLoading } = useSchoolProgram();
  const { id: idRaw, returnTo: returnToRaw, merge: mergeRaw } = useLocalSearchParams<{
    id?: string | string[];
    returnTo?: string | string[];
    merge?: string | string[];
  }>();
  const id = pickParam(idRaw);
  const returnTo = pickParam(returnToRaw);
  const mergeIds = pickParam(mergeRaw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const [subject, setSubject] = useState<any>(null);
  const [content, setContent] = useState<LearningPathContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedTypes, setExpandedTypes] = useState<Record<string, boolean>>({});
  const [expandedClasses, setExpandedClasses] = useState<Record<string, boolean>>({});
  const goBack = useContentViewerBack(returnTo || undefined);

  const fetchSubjectData = useCallback(async () => {
    if (!id) return;
    try {
      setIsLoading(true);

      let subjectMeta: any = { name: 'Subject', description: '' };
      try {
        const subRes = await api.get(`/api/subjects/${encodeURIComponent(id)}`);
        const sub = subRes.data?.subject ?? subRes.data;
        if (sub) {
          subjectMeta = sub;
          setSubject(sub);
        } else {
          setSubject(subjectMeta);
        }
      } catch {
        setSubject(subjectMeta);
      }

      const subjectIds = Array.from(new Set([id, ...mergeIds]));
      const lists = await Promise.all(
        subjectIds.map(async (sid) => {
          const contentRes = await api.get('/api/student/asli-prep-content', {
            params: { subject: sid, surface: 'learning-path' },
          });
          const raw = contentRes.data?.data ?? contentRes.data;
          return Array.isArray(raw) ? raw : [];
        }),
      );
      const seen = new Set<string>();
      const merged: any[] = [];
      for (const list of lists) {
        for (const item of list) {
          const cid = String(item?._id || '');
          if (!cid || seen.has(cid)) continue;
          seen.add(cid);
          merged.push(item);
        }
      }
      setContent(
        prepareLibraryContents(merged, isAsliPrepExclusive, {
          surface: 'learning-path',
          subjectSlot: {
            classNumber: subjectMeta?.classNumber,
            productCategory: subjectMeta?.productCategory,
          },
        }),
      );
    } catch (error) {
      console.error('Error fetching subject data:', error);
      setContent([]);
    } finally {
      setIsLoading(false);
    }
  }, [id, mergeIds.join(','), isAsliPrepExclusive]);

  useEffect(() => {
    if (!id || programLoading) return;
    void fetchSubjectData();
  }, [id, programLoading, fetchSubjectData]);

  const typeSections = useMemo(
    () =>
      groupLearningPathContentsWithIit(
        content.map((item, index) => ({
          ...item,
          _id: String(item._id || item.id || index),
          type: String(item.type || 'Content'),
        })),
        (item) => isIitTrackContent(item),
      ),
    [content]
  );

  const openContentItem = (item: LearningPathContentItem) => {
    const previewOpts = returnTo === 'learning' ? { returnTo: 'learning' as const } : undefined;
    openContentPreview(router, item, previewOpts);
  };

  const isSectionOpen = (type: string) => expandedTypes[type] ?? true;

  const toggleSection = (type: string) => {
    setExpandedTypes((prev) => ({ ...prev, [type]: !(prev[type] ?? true) }));
  };

  const isClassGroupOpen = (key: string) => expandedClasses[key] ?? true;

  const toggleClassGroup = (key: string) => {
    setExpandedClasses((prev) => ({ ...prev, [key]: !(prev[key] ?? true) }));
  };

  const renderContentItem = (item: (typeof typeSections)[number]['items'][number], iit: boolean, index: number) => {
    const video = isVideoContent(item);
    return (
      <TouchableOpacity
        key={String(item._id || index)}
        onPress={() => openContentItem(item)}
        activeOpacity={0.7}
      >
        <GlassPanel style={styles.contentCard} radius={16}>
          <View style={styles.contentHeader}>
            <View
              style={[
                styles.contentIcon,
                { backgroundColor: video ? '#dbeafe' : '#e8e3fa' },
              ]}
            >
              <Ionicons
                name={iconForType(item.type)}
                size={24}
                color={video ? '#3b82f6' : '#6d5bd0'}
              />
            </View>
            <View style={styles.contentInfo}>
              <Text style={styles.contentTitle}>
                {video
                  ? getVideoDisplayTitle(item)
                  : iit
                    ? formatIitLearningPathContentLabel(
                        item,
                        learningPathDisplayName(subject?.name || ''),
                      ) || 'Content'
                    : getLibraryContentDisplayTitle(item) || 'Content'}
              </Text>
              <Text style={styles.contentDescription} numberOfLines={2}>
                {item.description || 'Learn more about this topic'}
              </Text>
            </View>
            {item.completed ? (
              <Ionicons name="checkmark-circle" size={24} color="#10b981" />
            ) : null}
          </View>
          {item.duration ? (
            <View style={styles.contentMeta}>
              <Text style={styles.metaText}>{String(item.duration)}</Text>
            </View>
          ) : null}
        </GlassPanel>
      </TouchableOpacity>
    );
  };

  if (isLoading || programLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <GlassPanel style={styles.header} radius={0} bordered={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => void goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>{subject?.name || 'Subject'}</Text>
            <Text style={styles.headerSubtitle}>
              {content.length > 0
                ? `${content.length} ${content.length === 1 ? 'item' : 'items'}`
                : subject?.description || 'Learning content'}
            </Text>
          </View>
        </View>
      </GlassPanel>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {typeSections.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="book" size={64} color="#5B6779" />
            <Text style={styles.emptyText}>No content available</Text>
          </View>
        ) : (
          typeSections.map((section) => (
            <View key={section.type} style={styles.typeSection}>
              <Pressable style={styles.typeHeader} onPress={() => toggleSection(section.type)}>
                <Text style={styles.typeTitle}>{section.type}</Text>
                <View style={styles.typeHeaderRight}>
                  <Text style={styles.typeCount}>{section.items.length}</Text>
                  <Ionicons
                    name={isSectionOpen(section.type) ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color="#6b7280"
                  />
                </View>
              </Pressable>
              {isSectionOpen(section.type)
                ? section.iit && section.classGroups && section.classGroups.length > 0
                  ? section.classGroups.map((group) => {
                      const groupKey = `${section.type}::${group.key}`;
                      const classOpen = isClassGroupOpen(groupKey);
                      return (
                        <View key={groupKey} style={styles.classGroup}>
                          <Pressable
                            style={styles.classHeader}
                            onPress={() => toggleClassGroup(groupKey)}
                          >
                            <Text style={styles.classTitle}>{group.label}</Text>
                            <View style={styles.typeHeaderRight}>
                              <Text style={styles.typeCount}>{group.items.length}</Text>
                              <Ionicons
                                name={classOpen ? 'chevron-up' : 'chevron-down'}
                                size={16}
                                color="#6b7280"
                              />
                            </View>
                          </Pressable>
                          {classOpen
                            ? group.items.map((item, index) => renderContentItem(item, true, index))
                            : null}
                        </View>
                      );
                    })
                  : section.items.map((item, index) => renderContentItem(item, Boolean(section.iit), index))
                : null}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Transparent so the app background artwork shows through.
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  // Row layout lives on an inner view because GlassPanel wraps its children.
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 28,
  },
  typeSection: {
    marginTop: 8,
  },
  typeHeader: {
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 4,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typeTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  typeHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeCount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6b7280',
  },
  classGroup: {
    marginTop: 4,
  },
  classHeader: {
    marginHorizontal: 20,
    marginTop: 4,
    paddingVertical: 6,
    paddingLeft: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  classTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
  },
  contentCard: {
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  contentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contentInfo: {
    flex: 1,
  },
  contentTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  contentDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  contentMeta: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  metaText: {
    fontSize: 12,
    color: '#6b7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
  },
});
