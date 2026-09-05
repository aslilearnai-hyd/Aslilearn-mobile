import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import teacherService from '../../../src/services/api/teacherService';
import { openContentPreview } from '../../../src/utils/openContentPreview';
import { FilterDropdown, TeacherShimmer } from '../../../src/components/teacher';
import { GlassPanel } from '../../../src/components/ui';
import { TEACHER, TEACHER_RADIUS, TEACHER_SPACING } from '../../../src/theme/teacher';
import { useContentViewerBack } from '../../../src/hooks/useBackNavigation';
import { useSchoolProgram } from '../../../src/hooks/useSchoolProgram';
import {
  formatIitLearningPathContentLabel,
  getLibraryContentClassNumber,
  getLibraryContentDisplayTitle,
  getLibraryContentProductCategory,
  isIitTrackContent,
  prepareLibraryContents,
} from '../../../src/lib/dedupe-library-content';
import { formatProductCategoryLabel } from '../../../src/lib/library-content-labels';
import { groupLearningPathContentsWithIit } from '../../../src/lib/learning-path-content-groups';
import { learningPathDisplayName } from '../../../src/lib/learning-path-subjects';

type ContentItem = {
  _id: string;
  title: string;
  description?: string;
  type: string;
  fileUrl?: string;
  fileUrls?: string[];
  videoUrl?: string;
  youtubeUrl?: string;
  driveLink?: string;
  date?: string;
  deadline?: string;
  classNumber?: string | number | null;
  productCategory?: string | null;
  subject?: {
    _id?: string;
    name?: string;
    classNumber?: string | number | null;
    productCategory?: string | null;
  };
};

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

export default function TeacherSubjectContentScreen() {
  const { id, returnTo: returnToRaw } = useLocalSearchParams<{ id: string; returnTo?: string }>();
  const returnTo = typeof returnToRaw === 'string' ? returnToRaw : Array.isArray(returnToRaw) ? returnToRaw[0] : '';
  const goBack = useContentViewerBack(returnTo || undefined);
  const { isAsliPrepExclusive, loading: programLoading } = useSchoolProgram();
  const [subject, setSubject] = useState<any>(null);
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [classFilter, setClassFilter] = useState<string | null>(null);
  const [trackFilter, setTrackFilter] = useState<string | null>(null);
  const [preview, setPreview] = useState<ContentItem | null>(null);
  const [expandedTypes, setExpandedTypes] = useState<Record<string, boolean>>({});
  const [expandedClasses, setExpandedClasses] = useState<Record<string, boolean>>({});

  const load = useCallback(async (subjectId: string, asliPrep: boolean) => {
    setLoading(true);
    try {
      const [subRes, contentRes, classRes] = await Promise.all([
        teacherService.subject(subjectId),
        teacherService.asliPrepContent({ subject: subjectId, surface: 'learning-path' }),
        teacherService.classes(),
      ]);
      const subData = subRes.data?.subject ?? subRes.data;
      setSubject(subData || { _id: subjectId, name: 'Subject' });
      const raw = Array.isArray(contentRes.data) ? contentRes.data : [];
      setContents(
        prepareLibraryContents(raw, asliPrep, {
          surface: 'learning-path',
          subjectSlot: {
            classNumber: subData?.classNumber,
            productCategory: subData?.productCategory,
          },
        }),
      );
      setClasses(Array.isArray(classRes.data) ? classRes.data : []);
      setExpandedTypes({});
      setExpandedClasses({});
    } catch {
      setSubject({ _id: subjectId, name: 'Subject' });
      setContents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!id || programLoading) return;
    void load(String(id), isAsliPrepExclusive);
  }, [id, isAsliPrepExclusive, programLoading, load]);

  useEffect(() => {
    setTypeFilter(null);
    setTrackFilter(null);
  }, [classFilter]);

  const classOptions = useMemo(() => {
    const set = new Set<string>();
    classes.forEach((c) => {
      const cn = getLibraryContentClassNumber({ classNumber: c.classNumber });
      if (cn) set.add(cn);
    });
    contents.forEach((c) => {
      const cn = getLibraryContentClassNumber(c);
      if (cn) set.add(cn);
    });
    return Array.from(set).sort((a, b) => {
      const na = parseInt(a, 10);
      const nb = parseInt(b, 10);
      if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
      return a.localeCompare(b, undefined, { numeric: true });
    });
  }, [classes, contents]);

  const trackOptions = useMemo(() => {
    const set = new Set<string>();
    contents.forEach((c) => {
      const track = getLibraryContentProductCategory(c);
      if (track) set.add(track);
    });
    return Array.from(set).sort();
  }, [contents]);

  const classFiltered = useMemo(() => {
    let list = contents;
    if (classFilter) {
      list = list.filter((c) => getLibraryContentClassNumber(c) === classFilter);
    }
    if (trackFilter) {
      list = list.filter((c) => getLibraryContentProductCategory(c) === trackFilter);
    }
    return list;
  }, [contents, classFilter, trackFilter]);

  const filtered = useMemo(() => {
    if (!typeFilter) return classFiltered;
    return classFiltered.filter((c) => c.type === typeFilter);
  }, [classFiltered, typeFilter]);

  const typeSections = useMemo(
    () => groupLearningPathContentsWithIit(filtered, (item) => isIitTrackContent(item)),
    [filtered],
  );

  const uniqueTypes = useMemo(
    () => Array.from(new Set(classFiltered.map((c) => c.type))).sort(),
    [classFiltered]
  );

  const hasActiveFilters = Boolean(typeFilter || classFilter || trackFilter);

  const toggleSection = (type: string) => {
    setExpandedTypes((prev) => ({ ...prev, [type]: !(prev[type] ?? true) }));
  };

  const isSectionOpen = (type: string) => expandedTypes[type] ?? true;

  const toggleClassGroup = (key: string) => {
    setExpandedClasses((prev) => ({ ...prev, [key]: !(prev[key] ?? true) }));
  };

  const isClassGroupOpen = (key: string) => expandedClasses[key] ?? true;

  const openContent = (item: ContentItem) => {
    const hasPreview = Boolean(
      item.fileUrls?.[0] ||
        item.fileUrl ||
        item.videoUrl ||
        item.youtubeUrl ||
        item.driveLink
    );
    if (hasPreview) {
      openContentPreview(
        router,
        item,
        returnTo === 'learning' ? { returnTo: 'learning' } : undefined
      );
    } else {
      setPreview(item);
    }
  };

  if (loading || programLoading) {
    return (
      <SafeAreaView style={styles.screen}>
        <TeacherShimmer variant="list" count={4} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.topBar}>
        <Pressable onPress={() => void goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={TEACHER.text} />
        </Pressable>
        <View style={styles.topText}>
          <Text style={styles.title}>{subject?.name || 'Subject'}</Text>
          <Text style={styles.sub}>{filtered.length} Items</Text>
        </View>
      </View>

      <View style={styles.filtersRow}>
        {classOptions.length > 0 ? (
          <FilterDropdown
            label="Filter By Class"
            placeholder="Filter By Class"
            value={classFilter}
            onChange={setClassFilter}
            options={[
              { value: null, label: 'All Classes', count: contents.length },
              ...classOptions.map((c) => ({
                value: c,
                label: `Class ${c}`,
                count: contents.filter((item) => getLibraryContentClassNumber(item) === c).length,
              })),
            ]}
          />
        ) : null}
        {trackOptions.length > 1 ? (
          <FilterDropdown
            label="Filter By Track"
            placeholder="Filter By Track"
            value={trackFilter}
            onChange={setTrackFilter}
            options={[
              { value: null, label: 'All Tracks', count: contents.length },
              ...trackOptions.map((t) => ({
                value: t,
                label: formatProductCategoryLabel(t),
                count: contents.filter((item) => getLibraryContentProductCategory(item) === t).length,
              })),
            ]}
          />
        ) : null}
        {contents.length > 0 ? (
          <FilterDropdown
            label="Filter By Type"
            placeholder="Filter By Type"
            value={typeFilter}
            onChange={setTypeFilter}
            options={[
              { value: null, label: 'All Types', count: classFiltered.length },
              ...uniqueTypes.map((t) => ({
                value: t,
                label: t,
                count: classFiltered.filter((item) => item.type === t).length,
              })),
            ]}
          />
        ) : null}
      </View>

      {hasActiveFilters ? (
        <Pressable
          style={styles.clearBtn}
          onPress={() => {
            setTypeFilter(null);
            setClassFilter(null);
            setTrackFilter(null);
          }}
        >
          <Ionicons name="close-circle" size={16} color={TEACHER.primaryLight} />
          <Text style={styles.clearBtnText}>Clear Filters</Text>
        </Pressable>
      ) : null}

      <ScrollView style={styles.listScroll} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {typeSections.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No Content For Selected Filters</Text>
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
                    color={TEACHER.textMuted}
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
                                color={TEACHER.textMuted}
                              />
                            </View>
                          </Pressable>
                          {classOpen
                            ? group.items.map((item) => (
                                <Pressable key={item._id} onPress={() => openContent(item)}>
                                  <GlassPanel style={styles.item} radius={TEACHER_RADIUS.lg} tone="medium">
                                    <View style={styles.itemRow}>
                                      <View style={styles.itemIcon}>
                                        <Ionicons
                                          name={iconForType(item.type)}
                                          size={20}
                                          color={TEACHER.primaryLight}
                                        />
                                      </View>
                                      <View style={styles.itemBody}>
                                        <Text style={styles.itemTitle}>
                                          {formatIitLearningPathContentLabel(
                                            item,
                                            learningPathDisplayName(subject?.name || ''),
                                          )}
                                        </Text>
                                        {item.description ? (
                                          <Text style={styles.itemDesc} numberOfLines={2}>
                                            {item.description}
                                          </Text>
                                        ) : null}
                                      </View>
                                    </View>
                                  </GlassPanel>
                                </Pressable>
                              ))
                            : null}
                        </View>
                      );
                    })
                  : section.items.map((item) => (
                    <Pressable key={item._id} onPress={() => openContent(item)}>
                      <GlassPanel style={styles.item} radius={TEACHER_RADIUS.lg} tone="medium">
                        <View style={styles.itemRow}>
                          <View style={styles.itemIcon}>
                            <Ionicons
                              name={iconForType(item.type)}
                              size={20}
                              color={TEACHER.primaryLight}
                            />
                          </View>
                          <View style={styles.itemBody}>
                            <Text style={styles.itemTitle}>
                              {section.iit
                                ? formatIitLearningPathContentLabel(
                                    item,
                                    learningPathDisplayName(subject?.name || ''),
                                  )
                                : getLibraryContentDisplayTitle(item)}
                            </Text>
                            {item.description ? (
                              <Text style={styles.itemDesc} numberOfLines={2}>
                                {item.description}
                              </Text>
                            ) : null}
                          </View>
                        </View>
                      </GlassPanel>
                    </Pressable>
                  ))
                : null}
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={!!preview} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <GlassPanel style={styles.modalCard} radius={0} tone="strong">
            <Text style={styles.modalTitle}>
              {preview ? getLibraryContentDisplayTitle(preview) : ''}
            </Text>
            <Text style={styles.modalMeta}>{preview?.type}</Text>
            {preview?.description ? <Text style={styles.modalDesc}>{preview.description}</Text> : null}
            <Pressable style={styles.modalClose} onPress={() => setPreview(null)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </Pressable>
          </GlassPanel>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Transparent so AppBackground's artwork shows through.
  screen: { flex: 1, backgroundColor: 'transparent' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: TEACHER_SPACING.lg,
    gap: TEACHER_SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: TEACHER.surfaceBorder,
  },
  backBtn: { padding: 4 },
  topText: { flex: 1 },
  title: { fontSize: 20, fontWeight: '800', color: TEACHER.text },
  sub: { fontSize: 13, color: TEACHER.textMuted, marginTop: 2 },
  filtersRow: {
    flexDirection: 'row',
    gap: TEACHER_SPACING.sm,
    paddingHorizontal: TEACHER_SPACING.lg,
    paddingTop: TEACHER_SPACING.md,
    paddingBottom: TEACHER_SPACING.sm,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    marginLeft: TEACHER_SPACING.lg,
    marginBottom: TEACHER_SPACING.sm,
    paddingVertical: 4,
  },
  clearBtnText: { fontSize: 13, fontWeight: '600', color: TEACHER.primaryLight },
  listScroll: { flex: 1 },
  list: { padding: TEACHER_SPACING.lg, paddingBottom: 120, gap: TEACHER_SPACING.lg },
  typeSection: { gap: TEACHER_SPACING.sm },
  typeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  typeTitle: { fontSize: 16, fontWeight: '800', color: TEACHER.text },
  classGroup: { gap: TEACHER_SPACING.sm, paddingLeft: 4 },
  classHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  classTitle: { fontSize: 14, fontWeight: '800', color: TEACHER.textSecondary },
  typeHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  typeCount: { fontSize: 12, fontWeight: '700', color: TEACHER.textMuted },
  item: {
    borderRadius: TEACHER_RADIUS.lg,
    padding: TEACHER_SPACING.md,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
  },
  // Row layout lives on an inner view because GlassPanel wraps its children.
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: TEACHER_SPACING.md,
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: TEACHER.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemBody: { flex: 1 },
  itemTitle: { fontSize: 14, fontWeight: '700', color: TEACHER.text },
  itemDesc: { fontSize: 12, color: TEACHER.textMuted, marginTop: 4, lineHeight: 16 },
  empty: { alignItems: 'center', padding: 40 },
  emptyText: { color: TEACHER.textMuted },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: TEACHER_SPACING.xxl,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: TEACHER.text },
  modalMeta: { fontSize: 13, color: TEACHER.textMuted, marginTop: 4 },
  modalDesc: { fontSize: 14, color: TEACHER.textSecondary, marginTop: 12, lineHeight: 20 },
  modalClose: { alignItems: 'center', marginTop: TEACHER_SPACING.xl },
  modalCloseText: { color: TEACHER.primaryLight, fontWeight: '700' },
});
