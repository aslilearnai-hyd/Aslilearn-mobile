import { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { TeacherShimmer, TeacherPageHero } from '../../../src/components/teacher';
import { GlassPanel } from '../../../src/components/ui';
import { TEACHER, TEACHER_RADIUS, TEACHER_SPACING, TEACHER_TYPO, teacherSubjectBadgePalette, teacherSubjectIconName } from '../../../src/theme/teacher';
import { GLASS_ROW } from '../../../src/theme/glass';
import { useSchoolProgram } from '../../../src/hooks/useSchoolProgram';
import {
  loadLearningPathCatalog,
  type SubjectWithPathContent,
} from '../../../src/lib/learningPathCatalog';
import {
  countLearningPathDisplayStats,
  learningPathStatsTotal,
} from '../../../src/lib/learning-path-stats';
import { isIitTrackContent } from '../../../src/lib/library-content-labels';
import { learningPathDisplayName } from '../../../src/lib/learning-path-subjects';

type Props = {
  refreshKey?: number;
};

const GRID_MAX_WIDTH = 1080;
const COLUMN_GAP = TEACHER_SPACING.md;

function useTeacherTabletGrid(itemCount: number) {
  const { width: screenWidth } = useWindowDimensions();
  const isTablet = screenWidth >= 768;
  const maxColumns = screenWidth >= 1024 ? 3 : isTablet ? 2 : 1;
  const numColumns = itemCount > 0 ? Math.min(maxColumns, itemCount) : maxColumns;
  const isGrid = numColumns > 1;
  const innerWidth = Math.min(screenWidth, GRID_MAX_WIDTH) - TEACHER_SPACING.lg * 2;
  const cardWidth = isGrid
    ? (innerWidth - COLUMN_GAP * (numColumns - 1)) / numColumns
    : innerWidth;

  return { numColumns, isGrid, cardWidth, isTablet };
}

function SubjectPathCard({
  subject,
  width,
  listMode,
  index = 0,
}: {
  subject: SubjectWithPathContent;
  width: number;
  listMode: boolean;
  index?: number;
}) {
  const stats = countLearningPathDisplayStats(subject.asliPrepContent);
  const itemCount = learningPathStatsTotal(stats);
  const palette = teacherSubjectBadgePalette(subject.name, index);
  const iconName = teacherSubjectIconName(subject.name) as keyof typeof Ionicons.glyphMap;
  const displayName = learningPathDisplayName(subject.name);
  const iitCount = (subject.asliPrepContent || []).filter((c: any) => isIitTrackContent(c)).length;

  if (listMode) {
    return (
      <Pressable
        style={({ pressed }) => [styles.listPress, pressed && styles.pressed]}
        onPress={() => router.push(`/teacher/subject/${subject.id}?returnTo=learning`)}
        accessibilityRole="button"
        accessibilityLabel={`Open ${displayName}`}
      >
        <GlassPanel style={styles.listCard} radius={TEACHER_RADIUS.lg} tone="strong" elevated>
          <View style={styles.listRow}>
            <View style={[styles.listIcon, { backgroundColor: palette.bg, borderColor: palette.border }]}>
              <Ionicons name={iconName} size={22} color={palette.border} />
            </View>
            <View style={styles.listMeta}>
              <Text style={[styles.listName, { color: palette.border }]} numberOfLines={1}>
                {displayName}
              </Text>
              <Text style={styles.listHint} numberOfLines={1}>
                {iitCount > 0
                  ? `${itemCount} items · includes ${displayName} IIT`
                  : `${itemCount} ${itemCount === 1 ? 'item' : 'items'}`}
              </Text>
              {iitCount > 0 ? (
                <Text style={styles.iitSubhead} numberOfLines={1}>
                  {displayName} IIT · {iitCount}
                </Text>
              ) : null}
            </View>
            <View style={styles.listChevron}>
              <Ionicons name="chevron-forward" size={16} color={TEACHER.textMuted} />
            </View>
          </View>
        </GlassPanel>
      </Pressable>
    );
  }

  return (
    <Pressable
      style={({ pressed }) => [{ width }, pressed && styles.pressed]}
      onPress={() => router.push(`/teacher/subject/${subject.id}?returnTo=learning`)}
    >
      <GlassPanel
        style={styles.card}
        contentStyle={styles.cardInner}
        radius={TEACHER_RADIUS.lg}
        tone="medium"
        elevated
      >
        <View style={styles.cardTop}>
          <View style={[styles.iconWrap, { backgroundColor: palette.bg, borderColor: palette.border }]}>
            <Ionicons name={iconName} size={22} color={palette.border} />
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{itemCount} Items</Text>
          </View>
        </View>
        <Text style={[styles.name, { color: palette.border }]} numberOfLines={2}>
          {displayName}
        </Text>
        {iitCount > 0 ? (
          <Text style={styles.iitSubhead} numberOfLines={1}>
            {displayName} IIT · {iitCount} items
          </Text>
        ) : null}
        {subject.description ? (
          <Text style={styles.desc} numberOfLines={2}>
            {subject.description}
          </Text>
        ) : null}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Ionicons name="book-outline" size={14} color={TEACHER.success} />
            <Text style={styles.statVal}>{stats.textbooks}</Text>
            <Text style={styles.statLbl}>Books</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="document-text-outline" size={14} color={TEACHER.secondary} />
            <Text style={styles.statVal}>{stats.materials}</Text>
            <Text style={styles.statLbl}>Files</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="play-outline" size={14} color={TEACHER.primaryLight} />
            <Text style={styles.statVal}>{stats.videos}</Text>
            <Text style={styles.statLbl}>Videos</Text>
          </View>
        </View>
        <View style={styles.cta}>
          <Text style={styles.ctaText}>View Content</Text>
          <Ionicons name="arrow-forward" size={16} color={TEACHER.textOnPrimary} />
        </View>
      </GlassPanel>
    </Pressable>
  );
}

export default function LearningPathsView({ refreshKey = 0 }: Props) {
  const { isAsliPrepExclusive, loading: programLoading } = useSchoolProgram();
  const [subjects, setSubjects] = useState<SubjectWithPathContent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (programLoading) return;
    setLoading(true);
    try {
      const rows = await loadLearningPathCatalog('teacher', isAsliPrepExclusive);
      setSubjects(rows);
    } catch {
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  }, [isAsliPrepExclusive, programLoading]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const { isGrid, cardWidth, isTablet } = useTeacherTabletGrid(subjects.length);
  const listMode = !isTablet;

  if (programLoading || loading) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.listContent}>
        <TeacherPageHero
          tone="paths"
          badge="Learning Paths"
          title="Learn with clarity."
          accent="Grow every day."
          accentColor="#9EE7FF"
          subtitle="Subjects, textbooks, videos, and study materials for the classes you teach — all in one place."
          icon="school-outline"
        />
        <TeacherShimmer variant="card" count={3} />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    >
      <TeacherPageHero
        tone="paths"
        badge="Learning Paths"
        title="Learn with clarity."
        accent="Grow every day."
        accentColor="#9EE7FF"
        subtitle="Subjects, textbooks, videos, and study materials for the classes you teach — all in one place."
        icon="school-outline"
      />

      {!subjects.length ? (
        <GlassPanel tone="medium" radius={TEACHER_RADIUS.card} contentStyle={styles.emptyInner}>
          <View style={styles.emptyIcon}>
            <Ionicons name="school-outline" size={28} color={TEACHER.primary} />
          </View>
          <Text style={styles.emptyTitle}>No Subjects Yet</Text>
          <Text style={styles.emptySub}>
            Catalog content for your assigned subjects will show up here.
          </Text>
        </GlassPanel>
      ) : (
        <View style={[styles.grid, isGrid && styles.gridMulti, listMode && styles.listStack]}>
          {subjects.map((subject, index) => (
            <SubjectPathCard
              key={subject.mergedSubjectIds?.join(':') || subject.id}
              subject={subject}
              width={cardWidth}
              listMode={listMode}
              index={index}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  listContent: {
    width: '100%',
    maxWidth: GRID_MAX_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: TEACHER_SPACING.lg,
    paddingTop: TEACHER_SPACING.sm,
    paddingBottom: 96,
    gap: TEACHER_SPACING.md,
  },
  banner: {
    width: '100%',
    marginBottom: 4,
  },
  bannerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  bannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: GLASS_ROW.fillStrong,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_ROW.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerText: { flex: 1, minWidth: 0 },
  bannerTitle: {
    ...TEACHER_TYPO.section,
    color: TEACHER.text,
  },
  bannerSub: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: TEACHER.textSecondary,
  },
  grid: {
    width: '100%',
  },
  gridMulti: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: COLUMN_GAP,
    rowGap: COLUMN_GAP,
  },
  listStack: {
    gap: 10,
  },
  listPress: {
    width: '100%',
  },
  listCard: {
    width: '100%',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  listIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: GLASS_ROW.fillStrong,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_ROW.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listMeta: {
    flex: 1,
    minWidth: 0,
  },
  listName: {
    fontSize: 16,
    fontWeight: '800',
    color: TEACHER.text,
  },
  listHint: {
    marginTop: 2,
    fontSize: 12,
    color: TEACHER.textMuted,
  },
  iitSubhead: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: '#B45309',
  },
  listChevron: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: GLASS_ROW.fill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_ROW.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: 'transparent',
  },
  cardInner: {
    padding: TEACHER_SPACING.lg,
    gap: 8,
  },
  pressed: { opacity: 0.92 },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: GLASS_ROW.fillStrong,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_ROW.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    backgroundColor: GLASS_ROW.fillStrong,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_ROW.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: TEACHER.textMuted },
  name: { fontSize: 18, fontWeight: '800', color: TEACHER.text },
  desc: { fontSize: 13, color: TEACHER.textMuted, lineHeight: 18 },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  stat: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: GLASS_ROW.fill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_ROW.border,
    padding: 10,
    borderRadius: TEACHER_RADIUS.sm,
  },
  statVal: { fontSize: 16, fontWeight: '800', color: TEACHER.text, marginTop: 4 },
  statLbl: { fontSize: 10, color: TEACHER.textMuted },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: TEACHER.primary,
    padding: 12,
    borderRadius: TEACHER_RADIUS.md,
    marginTop: 8,
  },
  ctaText: { color: TEACHER.textOnPrimary, fontWeight: '700' },
  emptyInner: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: GLASS_ROW.fillStrong,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_ROW.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: TEACHER.text, marginTop: 4 },
  emptySub: {
    fontSize: 14,
    color: TEACHER.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
