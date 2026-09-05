import { storageGetItem } from '../../../src/lib/safe-storage';
import { useEffect, useMemo, useState } from 'react';
import {
  Text,
  StyleSheet,
  ScrollView,
  View,
  Pressable,
  useWindowDimensions,
  InteractionManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { router } from 'expo-router';
import { API_BASE_URL } from '../../../src/lib/api-config';
import { isTvOrBoardDisplay } from '../../../src/hooks/useIsTablet';
import {
  filterVisibleTeacherTools,
  TEACHER_AI_TOOLS_SUBTITLE,
} from '../../../src/lib/teacher-ai-tools';
import AiToolCard from '../../../src/components/ai-tools/AiToolCard';
import VidyaAvatar from '../../../src/components/vidya/VidyaAvatar';
import { GlassPanel } from '../../../src/components/ui';
import { TEACHER, TEACHER_RADIUS, TEACHER_SPACING } from '../../../src/theme/teacher';
import { AI, AI_TYPE } from '../../../src/theme/ai';
import { isIndividualAccount } from '../../../src/lib/individual-signup';
import { TrialUpgradeBanner } from '../../../src/components/b2c/IndividualSubscriptionReceipt';
import { showTrialUpgrade } from '../../../src/lib/individual-subscription';

const CONTENT_MAX = 1080;
const BOARD_MIN_WIDTH = 1024;
const GRID_GAP = TEACHER_SPACING.lg;
const TAB_BAR_CLEARANCE = 16;

function chunkItems<T>(items: T[], size: number): T[][] {
  if (size <= 1) return items.map((item) => [item]);
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
}

function useVidyaAILayout() {
  const { width, height } = useWindowDimensions();
  const isTvView = isTvOrBoardDisplay(width, height);
  const isBoard = width >= BOARD_MIN_WIDTH;
  const columns = isTvView ? 2 : width >= 1040 ? 3 : width >= 700 ? 2 : 1;
  const shellWidth = isTvView ? '100%' : isBoard ? width : Math.min(width, CONTENT_MAX);
  return { isGrid: columns > 1, columns, shellWidth, isTvView };
}

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
  user: userProp,
}: {
  chatEnabled?: boolean;
  user?: any;
}) {
  const insets = useSafeAreaInsets();
  const { isGrid, columns, shellWidth, isTvView } = useVidyaAILayout();
  const chatPress = usePressScale();
  const scrollBottomPad =
    TAB_BAR_CLEARANCE + Math.max(insets.bottom, 12) + TEACHER_SPACING.xl;
  const [subjectNames, setSubjectNames] = useState<string[]>([]);
  const [individualTeacher, setIndividualTeacher] = useState(() => isIndividualAccount(userProp));
  const [trialUser, setTrialUser] = useState<any>(userProp || null);

  useEffect(() => {
    (async () => {
      try {
        const token = await storageGetItem('authToken');
        if (!token) return;
        const res = await fetch(`${API_BASE_URL}/api/teacher/subjects`, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        if (!res.ok) return;
        const data = await res.json();
        const rows = Array.isArray(data?.data) ? data.data : [];
        const names = rows
          .map((subj: any) => String(subj?.name || subj?.displayName || '').trim())
          .filter(Boolean);
        setSubjectNames(names);
        const meRes = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        if (meRes.ok) {
          const meJson = await meRes.json();
          const me = meJson?.user || meJson;
          setIndividualTeacher(isIndividualAccount(me));
          setTrialUser(me);
        }
      } catch {
        /* optional */
      }
    })();
  }, []);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      void import('../../../src/lib/ai-tool-generate');
    });
    return () => task.cancel();
  }, []);

  const visibleTools = useMemo(
    () => filterVisibleTeacherTools(subjectNames),
    [subjectNames],
  );
  const toolRows = useMemo(
    () => chunkItems(visibleTools, isGrid ? columns : 1),
    [visibleTools, isGrid, columns],
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.innerShell, { width: shellWidth }, isTvView && { alignSelf: 'stretch' }]}>
        <View style={styles.section}>
          {showTrialUpgrade(trialUser || userProp) ? (
            <TrialUpgradeBanner
              daysLeft={(trialUser || userProp)?.trialDaysLeft}
              trialEndsAt={(trialUser || userProp)?.trialEndsAt}
            />
          ) : null}
          <Text style={styles.sectionTitle}>
            {individualTeacher ? 'AI Studio' : 'Create Your Next Classroom Resource'}
          </Text>
          <Text style={styles.sectionSubtitle}>{TEACHER_AI_TOOLS_SUBTITLE}</Text>

          {individualTeacher ? (
            <View style={styles.studioRow}>
              {[
                { label: 'Lesson Planner', icon: 'book-outline' as const, route: '/teacher/tools/lesson-planner' },
                { label: 'Worksheets', icon: 'clipboard-outline' as const, route: '/teacher/tools/worksheet-mcq-generator' },
                { label: 'Question Papers', icon: 'document-text-outline' as const, route: '/teacher/tools/exam-question-paper-generator' },
                { label: 'Profile & Subscription', icon: 'card-outline' as const, route: '/auth/subscribe' },
              ].map((item) => (
                <Pressable
                  key={item.label}
                  onPress={() =>
                    requestAnimationFrame(() => {
                      router.push(item.route as any);
                    })
                  }
                  style={styles.studioCard}
                >
                  <View style={styles.studioIcon}>
                    <Ionicons name={item.icon} size={20} color={TEACHER.primaryDark} />
                  </View>
                  <Text style={styles.studioLabel}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {chatEnabled ? (
            <Pressable
              onPress={() => {
                requestAnimationFrame(() => {
                  router.push('/teacher/vidya-chat' as any);
                });
              }}
              onPressIn={chatPress.onPressIn}
              onPressOut={chatPress.onPressOut}
              accessibilityRole="button"
              accessibilityLabel="Open Vidya AI Chat"
            >
              <Animated.View style={chatPress.style}>
                <GlassPanel style={styles.chatCard} radius={TEACHER_RADIUS.lg} tone="strong">
                  <View style={styles.chatCardRow}>
                    <VidyaAvatar size={48} borderColor="#93c5fd" />
                    <View style={styles.chatTextWrap}>
                      <Text style={styles.chatTitle}>Ask Vidya</Text>
                      <Text style={styles.chatSub}>Lesson plans, assessments, and classroom help</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={TEACHER.primaryDark} />
                  </View>
                </GlassPanel>
              </Animated.View>
            </Pressable>
          ) : null}

          <View style={styles.toolsGrid}>
            {toolRows.map((row, rowIndex) => (
              <View
                key={`tools-row-${rowIndex}`}
                style={[styles.toolsRow, isGrid && styles.toolsRowGrid]}
              >
                {row.map((tool) => (
                  <View key={tool.id} style={isGrid ? styles.toolCell : styles.toolCellFull}>
                    <AiToolCard
                      title={tool.title}
                      description={tool.description}
                      icon={tool.icon as keyof typeof Ionicons.glyphMap}
                      accent={tool.color || AI.primary}
                      badge="Teacher"
                      compact={isGrid}
                      evenHeight={isTvView}
                      glass
                      onPress={() => {
                        requestAnimationFrame(() => {
                          router.push({
                            pathname: tool.route as any,
                            params: { returnTab: 'vidya-ai' },
                          });
                        });
                      }}
                    />
                  </View>
                ))}
                {isGrid
                  ? Array.from({ length: columns - row.length }, (_, spacerIndex) => (
                      <View key={`tools-spacer-${rowIndex}-${spacerIndex}`} style={styles.toolCell} />
                    ))
                  : null}
              </View>
            ))}
          </View>
        </View>
        <View style={{ height: scrollBottomPad }} accessibilityElementsHidden />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    alignItems: 'center',
  },
  innerShell: {
    alignSelf: 'center',
  },
  section: {
    paddingHorizontal: TEACHER_SPACING.lg,
    paddingTop: TEACHER_SPACING.md,
    paddingBottom: TEACHER_SPACING.sm,
  },
  sectionTitle: {
    ...AI_TYPE.hero,
    color: AI.text,
    marginBottom: 8,
  },
  sectionSubtitle: {
    ...AI_TYPE.body,
    color: AI.textSecondary,
    marginBottom: 20,
  },
  studioRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: TEACHER_SPACING.sm,
    marginBottom: TEACHER_SPACING.lg,
  },
  studioCard: {
    flexGrow: 1,
    flexBasis: '46%',
    minWidth: 140,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#E0E7FF',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: TEACHER_RADIUS.lg,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  studioIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  studioLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: TEACHER.text,
  },
  chatCard: {
    marginBottom: TEACHER_SPACING.lg,
    padding: TEACHER_SPACING.lg,
    borderRadius: TEACHER_RADIUS.lg,
    ...TEACHER.shadow.sm,
  },
  chatCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: TEACHER_SPACING.md,
  },
  chatTextWrap: { flex: 1, minWidth: 0 },
  chatTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: TEACHER.text,
  },
  chatSub: {
    marginTop: 4,
    fontSize: 13,
    color: TEACHER.textMuted,
    lineHeight: 18,
  },
  toolsGrid: {
    width: '100%',
    gap: GRID_GAP,
  },
  toolsRow: {
    width: '100%',
  },
  toolsRowGrid: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: GRID_GAP,
  },
  toolCell: {
    flex: 1,
    minWidth: 0,
  },
  toolCellFull: {
    width: '100%',
  },
});
