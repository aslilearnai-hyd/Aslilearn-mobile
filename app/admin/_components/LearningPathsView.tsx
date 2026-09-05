import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { openContentPreview } from '../../../src/utils/openContentPreview';
import {
  isVideoContent as lpIsVideo,
  type LearningPathContentItem,
} from '../../../src/lib/learningPathContent';
import { useSchoolProgram } from '../../../src/hooks/useSchoolProgram';
import {
  loadLearningPathCatalog,
  type SubjectWithPathContent,
} from '../../../src/lib/learningPathCatalog';
import { groupLearningPathsByClass, formatClassGroupTitle } from '../../../src/lib/learning-path-admin';
import { displaySubjectName } from '../../../src/lib/subject-names';
import {
  AdminScreenShell,
  AdminSectionHeader,
  AdminGlassCard,
  AdminEmptyState,
  AdminSkeletonList,
  AdminScalePressable,
  useAdminTheme,
} from '../_ui';

interface ContentItem extends LearningPathContentItem {
  title: string;
  type: string;
  subject?: string;
}

export default function LearningPathsView() {
  const router = useRouter();
  const { colors, spacing, radius, typo } = useAdminTheme();
  const { isAsliPrepExclusive, loading: programLoading } = useSchoolProgram();
  const [subjectsWithContent, setSubjectsWithContent] = useState<SubjectWithPathContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedClassKey, setExpandedClassKey] = useState<string | null>(null);
  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(null);

  const loadCatalog = useCallback(async () => {
    if (programLoading) return;
    setIsLoading(true);
    try {
      const rows = await loadLearningPathCatalog('admin', isAsliPrepExclusive);
      setSubjectsWithContent(rows);
    } catch (error) {
      console.error('Failed to fetch learning paths:', error);
      setSubjectsWithContent([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [isAsliPrepExclusive, programLoading]);

  useEffect(() => {
    if (programLoading) return;
    void loadCatalog();
  }, [loadCatalog, programLoading]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadCatalog();
  }, [loadCatalog]);

  const groupedByClass = useMemo(
    () => groupLearningPathsByClass(subjectsWithContent),
    [subjectsWithContent]
  );

  const toggleClass = (classKey: string) => {
    setExpandedClassKey((prev) => (prev === classKey ? null : classKey));
    setExpandedSubjectId(null);
  };

  const openContentItem = (content: ContentItem) => {
    openContentPreview(router, content, { returnTo: 'learning' });
  };

  const showLoading = (programLoading || isLoading) && !refreshing;

  if (showLoading) {
    return <AdminSkeletonList count={4} />;
  }

  return (
    <AdminScreenShell refreshing={refreshing} onRefresh={onRefresh}>
      <AdminGlassCard noAnimation style={{ marginBottom: spacing.sm }}>
        <AdminSectionHeader
          icon="map"
          title="Learning Paths"
          subtitle={
            isAsliPrepExclusive
              ? 'Browse by class, then subject'
              : 'Curriculum library. Audio, TextBook and Homework.'
          }
        />
      </AdminGlassCard>

      {subjectsWithContent.length === 0 ? (
        <AdminEmptyState
          icon="map-outline"
          title="No learning paths found"
          message={
            isAsliPrepExclusive
              ? 'No catalog content is available yet.'
              : 'Normal schools see Audio, TextBook and Homework only.'
          }
        />
      ) : (
        groupedByClass.map((group, groupIndex) => {
          const classContentCount = group.subjects.reduce(
            (sum, s) => sum + (s.totalContent || 0),
            0
          );
          const classTitle = formatClassGroupTitle(group);
          const isClassExpanded = expandedClassKey === group.classKey;

          return (
            <AdminGlassCard
              key={group.classKey}
              delay={groupIndex * 40}
              style={{ marginBottom: spacing.sm }}
            >
              <AdminScalePressable
                onPress={() => toggleClass(group.classKey)}
                style={[
                  styles.classHeader,
                  {
                    backgroundColor: colors.primaryMuted,
                    borderColor: colors.surfaceBorder,
                    borderRadius: radius.md,
                  },
                ]}
              >
                <View style={[styles.classBadge, { backgroundColor: colors.primary }]}>
                  <Ionicons name="school" size={14} color={colors.textInverse} />
                  <Text style={[styles.classBadgeText, { color: colors.textInverse }]}>
                    {classTitle}
                  </Text>
                </View>
                <View style={styles.classMetaWrap}>
                  <Text style={[styles.classMeta, { color: colors.textSecondary }]}>
                    {group.subjects.length} subject{group.subjects.length === 1 ? '' : 's'} ·{' '}
                    {classContentCount} item{classContentCount === 1 ? '' : 's'}
                  </Text>
                </View>
                <Ionicons
                  name={isClassExpanded ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={colors.textMuted}
                />
              </AdminScalePressable>

              {isClassExpanded
                ? group.subjects.map((subject, index) => {
                const subjectId = String(subject._id || subject.id);
                const isExpanded = expandedSubjectId === subjectId;
                const displayName = displaySubjectName(subject.name || 'Subject');

                return (
                  <View
                    key={subjectId}
                    style={[
                      styles.subjectBlock,
                      index > 0
                        ? { borderTopWidth: 1, borderTopColor: colors.surfaceBorder }
                        : null,
                    ]}
                  >
                    <AdminScalePressable
                      onPress={() => setExpandedSubjectId(isExpanded ? null : subjectId)}
                      style={styles.pathHeaderRow}
                    >
                      <View style={styles.pathHeader}>
                        <View
                          style={[
                            styles.pathIcon,
                            {
                              backgroundColor: colors.inputBg,
                              borderColor: colors.surfaceBorder,
                            },
                          ]}
                        >
                          <Ionicons name="book" size={20} color={colors.primary} />
                        </View>
                        <View style={styles.pathInfo}>
                          <Text style={[typo.section, { color: colors.text }]}>{displayName}</Text>
                          <Text style={[styles.pathDescription, { color: colors.textMuted }]}>
                            {subject.description ||
                              `Content for ${displayName} in ${classTitle}`}
                          </Text>
                          {subject.board ? (
                            <Text style={[styles.pathBoard, { color: colors.textMuted }]}>
                              Board: {subject.board}
                            </Text>
                          ) : null}
                        </View>
                        <Ionicons
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={20}
                          color={colors.textMuted}
                        />
                      </View>
                    </AdminScalePressable>

                    <View style={[styles.pathFooter, { borderTopColor: colors.surfaceBorder }]}>
                      <View style={styles.pathStat}>
                        <Ionicons name="document-text" size={15} color={colors.textMuted} />
                        <Text style={[styles.pathStatText, { color: colors.textSecondary }]}>
                          {subject.totalContent || 0} content items
                        </Text>
                      </View>
                    </View>

                    {isExpanded && subject.asliPrepContent && subject.asliPrepContent.length > 0 ? (
                      <View style={[styles.contentList, { borderTopColor: colors.surfaceBorder }]}>
                        <Text style={[styles.contentListTitle, { color: colors.text }]}>
                          Content Items
                        </Text>
                        {subject.asliPrepContent.map((content, contentIndex) => (
                          <AdminScalePressable
                            key={content._id || content.id || `content-${contentIndex}`}
                            onPress={() => openContentItem(content as ContentItem)}
                            style={[
                              styles.contentItem,
                              {
                                backgroundColor: colors.bgElevated,
                                borderColor: colors.surfaceBorder,
                                borderRadius: radius.sm,
                              },
                            ]}
                          >
                            <Ionicons
                              name={lpIsVideo(content) ? 'videocam' : 'document-text'}
                              size={18}
                              color={colors.primary}
                            />
                            <View style={styles.contentItemInfo}>
                              <Text
                                style={[styles.contentItemTitle, { color: colors.text }]}
                                numberOfLines={1}
                              >
                                {content.title || 'Untitled'}
                              </Text>
                              <Text style={[styles.contentItemType, { color: colors.textMuted }]}>
                                {content.type || 'Content'}
                              </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                          </AdminScalePressable>
                        ))}
                      </View>
                    ) : null}
                  </View>
                );
              })
                : null}
            </AdminGlassCard>
          );
        })
      )}
    </AdminScreenShell>
  );
}

const styles = StyleSheet.create({
  classHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    gap: 8,
  },
  subjectBlock: {
    marginTop: 10,
    paddingTop: 10,
  },
  classBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  classBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  classMetaWrap: {
    flexShrink: 1,
    minWidth: 0,
  },
  classMeta: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
  },
  pathHeaderRow: { borderRadius: 8 },
  pathHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  pathIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
  },
  pathInfo: { flex: 1, minWidth: 0 },
  pathDescription: { fontSize: 13, marginTop: 2, lineHeight: 18 },
  pathBoard: { fontSize: 12, marginTop: 4 },
  pathFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
  },
  contentList: { marginTop: 10, paddingTop: 10, borderTopWidth: 1 },
  contentListTitle: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  contentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
  },
  contentItemInfo: { flex: 1, marginLeft: 10 },
  contentItemTitle: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  contentItemType: { fontSize: 12 },
  pathStat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pathStatText: { fontSize: 13 },
});
