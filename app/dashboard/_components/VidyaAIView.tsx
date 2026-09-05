import { storageGetItem } from '../../../src/lib/safe-storage';
import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions, InteractionManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { router } from 'expo-router';
import { API_BASE_URL } from '../../../src/lib/api-config';
import { isTvOrBoardDisplay } from '../../../src/hooks/useIsTablet';
import { filterVisibleStudentTools, type StudentAiTool } from '../../../src/lib/student-ai-tools';
import { ShimmerCard } from '../../../src/components/student/StudentShimmer';
import AiToolCard from '../../../src/components/ai-tools/AiToolCard';
import VidyaAvatar from '../../../src/components/vidya/VidyaAvatar';
import { GlassPanel } from '../../../src/components/ui';
import { AI, AI_RADIUS, AI_SHADOW, AI_SPACING, AI_TYPE } from '../../../src/theme/ai';
import { STUDENT, STUDENT_RADIUS, STUDENT_SPACING } from '../../../src/theme/student';

const LIST_GAP = STUDENT_SPACING.md;
const TOOLS_TABLET_MIN_WIDTH = 768;
const TOOLS_WIDE_MIN_WIDTH = 1024;
const STUDENT_TOOLS_SUBTITLE =
  'Stuck on a concept? Revising a chapter? Preparing for a test? Vidya AI has a tool to help.';

function chunkItems<T>(items: T[], size: number): T[][] {
  if (size <= 1) return items.map((item) => [item]);
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
}

const HERO_STAT_CHIPS: { icon: keyof typeof Ionicons.glyphMap; title: string; copy: string }[] = [
  { icon: 'book-outline', title: 'Learn', copy: 'Understand Concepts Clearly' },
  { icon: 'create-outline', title: 'Practise', copy: 'Questions, flashcards & tests' },
  { icon: 'compass-outline', title: 'Prepare', copy: 'Study guides, projects & plans' },
];

function usePressScale(to = 0.98) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const onPressIn = () => {
    scale.value = withSpring(to, { damping: 14, stiffness: 300 });
  };
  const onPressOut = () => {
    scale.value = withSpring(1, { damping: 14, stiffness: 300 });
  };
  return { style, onPressIn, onPressOut };
}

export default function VidyaAIView({
  chatEnabled = true,
  user,
}: {
  chatEnabled?: boolean;
  user?: any;
}) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isTvView = isTvOrBoardDisplay(screenWidth, screenHeight);
  const isTablet = screenWidth >= TOOLS_TABLET_MIN_WIDTH;
  const gridColumns = isTvView ? 2 : screenWidth >= TOOLS_WIDE_MIN_WIDTH ? 3 : isTablet ? 2 : 1;
  const isGrid = gridColumns > 1;

  const [subjectNames, setSubjectNames] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const chatPress = usePressScale();

  // Let the Vidya tab paint first, then fetch — avoids a hitch on tab switch.
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => setReady(true));
    const fallback = setTimeout(() => setReady(true), 200);
    return () => {
      task.cancel();
      clearTimeout(fallback);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const token = await storageGetItem('authToken');
        if (!token || cancelled) return;
        const res = await fetch(`${API_BASE_URL}/api/student/subjects`, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        if (res.ok && !cancelled) {
          const data = await res.json();
          const list = data.data || data.subjects || data || [];
          const names = (Array.isArray(list) ? list : [])
            .map((s: any) => (typeof s === 'object' ? s.name || '' : String(s)))
            .filter(Boolean);
          setSubjectNames(names);
        }
      } catch {
        /* optional */
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready]);

  // Warm heavy modules while browsing tools so open feels snappy.
  useEffect(() => {
    if (!ready) return;
    const task = InteractionManager.runAfterInteractions(() => {
      void import('../../../src/lib/ai-tool-generate');
      void import('../../student/tools/[toolType]');
    });
    return () => task.cancel();
  }, [ready]);

  const visibleTools = useMemo(
    () => filterVisibleStudentTools(subjectNames, { includeChat: chatEnabled }),
    [subjectNames, chatEnabled],
  );
  const toolRows = useMemo(
    () => chunkItems(visibleTools, isGrid ? gridColumns : 1),
    [visibleTools, isGrid, gridColumns],
  );
  const shimmerRows = useMemo(
    () => chunkItems(Array.from({ length: isGrid ? gridColumns * 2 : 4 }, (_, index) => index), isGrid ? gridColumns : 1),
    [isGrid, gridColumns],
  );

  const openTool = (tool: StudentAiTool) => {
    requestAnimationFrame(() => {
      if (tool.id === 'ai-chat') {
        router.push('/ai-tutor');
        return;
      }
      router.push({
        pathname: `/student/tools/${tool.id}` as any,
        params: { returnTab: 'vidya' },
      });
    });
  };

  const renderToolRow = (row: StudentAiTool[], rowIndex: number) => (
    <View key={`tools-row-${rowIndex}`} style={[styles.toolsRow, isGrid && styles.toolsRowGrid]}>
      {row.map((tool) => (
        <View key={tool.id} style={isGrid ? styles.toolCell : styles.toolCellFull}>
          <AiToolCard
            title={tool.name}
            description={tool.description}
            icon={tool.icon as any}
            accent={tool.color || AI.primary}
            badge="AI Powered"
            ctaText="Get Started"
            compact={isGrid}
            glass
            onPress={() => openTool(tool)}
          />
        </View>
      ))}
      {isGrid
        ? Array.from({ length: gridColumns - row.length }, (_, spacerIndex) => (
            <View key={`tools-spacer-${rowIndex}-${spacerIndex}`} style={styles.toolCell} />
          ))
        : null}
    </View>
  );

  return (
    <View style={styles.container}>
      <GlassPanel radius={AI_RADIUS.lg} tone="strong" style={styles.hero}>
        <View style={styles.heroBadge}>
          <Text style={styles.heroBadgeText}>VIDYA AI STUDIO</Text>
        </View>
        <Text style={styles.sectionTitle}>What Are You Working On Today?</Text>
        <Text style={styles.sectionSubtitle}>{STUDENT_TOOLS_SUBTITLE}</Text>
        <View style={styles.heroStatsRow}>
          {HERO_STAT_CHIPS.map((stat) => (
            <View key={stat.title} style={[styles.heroStatChip, isTablet && styles.heroStatChipWide]}>
              <View style={styles.heroStatIcon}>
                <Ionicons name={stat.icon} size={18} color={AI.primary} />
              </View>
              <View style={styles.heroStatText}>
                <Text style={styles.heroStatTitle}>{stat.title}</Text>
                <Text style={styles.heroStatCopy}>{stat.copy}</Text>
              </View>
            </View>
          ))}
        </View>
      </GlassPanel>

      {chatEnabled ? (
        <Pressable
          onPress={() => {
            requestAnimationFrame(() => {
              router.push('/ai-tutor');
            });
          }}
          onPressIn={chatPress.onPressIn}
          onPressOut={chatPress.onPressOut}
        >
          <Animated.View style={chatPress.style}>
            <GlassPanel style={styles.chatCard} radius={STUDENT_RADIUS.lg} tone="strong">
              <View style={styles.chatCardRow}>
                <VidyaAvatar size={48} borderColor="#c7d2fe" />
                <View style={styles.chatTextWrap}>
                  <Text style={styles.chatTitle}>Ask Vidya</Text>
                  <Text style={styles.chatSub}>AI Chat Assistant · instant doubt solving</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={STUDENT.primaryDark} />
              </View>
            </GlassPanel>
          </Animated.View>
        </Pressable>
      ) : null}

      {!ready || isLoading ? (
        <View style={styles.toolsList}>
          {shimmerRows.map((row, rowIndex) => (
            <View key={`shimmer-row-${rowIndex}`} style={[styles.toolsRow, isGrid && styles.toolsRowGrid]}>
              {row.map((index) => (
                <ShimmerCard
                  key={`shimmer-${index}`}
                  style={isGrid ? styles.shimmerCell : styles.shimmerRow}
                />
              ))}
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.toolsList}>{toolRows.map((row, rowIndex) => renderToolRow(row, rowIndex))}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Transparent so the app background artwork shows through.
  container: { flex: 1, backgroundColor: 'transparent' },
  hero: {
    marginBottom: AI_SPACING.xl,
    overflow: 'hidden',
    borderRadius: AI_RADIUS.lg,
    padding: AI_SPACING.xl,
    ...AI_SHADOW,
  },
  chatCard: {
    marginBottom: AI_SPACING.xl,
    padding: STUDENT_SPACING.lg,
    borderRadius: STUDENT_RADIUS.lg,
    ...STUDENT.shadow.sm,
  },
  chatCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: STUDENT_SPACING.md,
  },
  chatTextWrap: { flex: 1, minWidth: 0 },
  chatTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: STUDENT.text,
  },
  chatSub: {
    marginTop: 4,
    fontSize: 13,
    color: STUDENT.textMuted,
    lineHeight: 18,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    marginBottom: AI_SPACING.sm,
    borderRadius: AI_RADIUS.full,
    borderWidth: 1,
    borderColor: AI.primaryBorder,
    backgroundColor: AI.primarySoft,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  heroBadgeText: {
    ...AI_TYPE.eyebrow,
    color: AI.primaryPressed,
  },
  sectionTitle: {
    ...AI_TYPE.hero,
    color: AI.text,
    marginBottom: 8,
  },
  sectionSubtitle: {
    ...AI_TYPE.body,
    color: AI.textSecondary,
  },
  heroStatsRow: {
    marginTop: AI_SPACING.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AI_SPACING.sm,
  },
  heroStatChip: {
    flexGrow: 1,
    flexBasis: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: AI_SPACING.sm,
    borderRadius: AI_RADIUS.md,
    borderWidth: 1,
    borderColor: AI.primaryBorder,
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: AI_SPACING.md,
    paddingVertical: AI_SPACING.sm,
  },
  heroStatChipWide: {
    flexBasis: '31%',
  },
  heroStatIcon: {
    width: 36,
    height: 36,
    borderRadius: AI_RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AI.primarySoft,
  },
  heroStatText: { flex: 1, minWidth: 0 },
  heroStatTitle: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
    color: AI.text,
  },
  heroStatCopy: {
    marginTop: 1,
    fontSize: 12,
    lineHeight: 16,
    color: AI.textSecondary,
  },
  toolsList: {
    gap: LIST_GAP,
    paddingBottom: STUDENT_SPACING.md,
  },
  toolsRow: {
    width: '100%',
  },
  toolsRowGrid: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: LIST_GAP,
  },
  toolCell: {
    flex: 1,
    minWidth: 0,
  },
  toolCellFull: {
    width: '100%',
  },
  shimmerRow: {
    height: 96,
  },
  shimmerCell: {
    flex: 1,
    minWidth: 0,
    height: 96,
  },
});
