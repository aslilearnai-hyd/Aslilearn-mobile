import React, { memo, useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import api from '../../../../src/services/api/api';
import { openContentPreview } from '../../../../src/utils/openContentPreview';
import PremiumSectionHeader from '../../../../src/components/student/PremiumSectionHeader';
import { ShimmerCard } from '../../../../src/components/student/StudentShimmer';
import { STUDENT, STUDENT_RADIUS, STUDENT_SKY } from '../../../../src/theme/student';
import { capAdaptiveRecommendationsPerSubject } from '../../../../src/lib/adaptive-learning-helpers';

interface RecommendedItem {
  kind: string;
  _id: string;
  title: string;
  displayType: string;
  topicHint?: string;
  fileUrl?: string;
  navigatePath?: string;
  examId?: string;
  openMode?: string;
}

interface AdaptiveCard {
  subjectId: string;
  subjectName: string;
  progressPercent: number;
  examScorePercent?: number;
  weakTopicCount: number;
  priority: 'High' | 'Medium' | 'Low';
  focusChapters?: Array<{
    chapter: string;
    wrong?: number;
    skipped?: number;
    navigatePath?: string;
  }>;
  gapsWithoutContent: string[];
  usesLibraryFallback?: boolean;
  recommendedContent: RecommendedItem[];
}

interface AdaptiveDailyPlan {
  subjectName: string;
  focusTopic: string;
  reason: string;
  steps: Array<{ key: string; title: string; description: string; navigatePath: string }>;
}

function parseAdaptivePayload(json: Record<string, unknown>) {
  const root = json as { success?: boolean; data?: unknown };
  let payload = root.data ?? json;
  if (payload && typeof payload === 'object' && 'data' in (payload as object)) {
    const nested = (payload as { data?: { cards?: AdaptiveCard[]; meta?: unknown } }).data;
    if (nested && Array.isArray(nested.cards)) payload = nested;
  }
  const cards = Array.isArray((payload as { cards?: AdaptiveCard[] })?.cards)
    ? (payload as { cards: AdaptiveCard[] }).cards
    : [];
  const meta =
    payload && typeof payload === 'object' && 'meta' in payload
      ? (payload as { meta?: Record<string, unknown> }).meta
      : undefined;
  const dailyPlan = (payload as { dailyPlan?: AdaptiveDailyPlan | null })?.dailyPlan || null;
  return { cards, meta, dailyPlan };
}

function priorityStyle(priority: string) {
  if (priority === 'High') return { bg: `${STUDENT.danger}18`, text: STUDENT.danger, border: `${STUDENT.danger}33` };
  if (priority === 'Medium') return { bg: `${STUDENT.warning}18`, text: STUDENT.warning, border: `${STUDENT.warning}33` };
  return { bg: STUDENT.surfaceHover, text: STUDENT.textSecondary, border: STUDENT.surfaceBorder };
}

function typeStyle(displayType: string) {
  const d = displayType.toLowerCase();
  if (d === 'video') return { bg: `${STUDENT.accent}18`, text: STUDENT.accent };
  if (d === 'pdf') return { bg: `${STUDENT.danger}18`, text: STUDENT.danger };
  if (d === 'practice') return { bg: `${STUDENT.warning}18`, text: STUDENT.warning };
  return { bg: STUDENT.surfaceHover, text: STUDENT.textSecondary };
}

function getSubjectIcon(name: string): keyof typeof Ionicons.glyphMap {
  const n = (name || '').toLowerCase();
  if (n.includes('math')) return 'calculator-outline';
  if (n.includes('physics')) return 'planet-outline';
  if (n.includes('chem')) return 'flask-outline';
  if (n.includes('bio')) return 'leaf-outline';
  return 'book-outline';
}

const FOCUS_CHAPTERS_VISIBLE = 2;

function AdaptiveLearningModuleComponent({ dark }: { dark?: boolean }) {
  const [cards, setCards] = useState<AdaptiveCard[]>([]);
  const [dailyPlan, setDailyPlan] = useState<AdaptiveDailyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedFocusIds, setExpandedFocusIds] = useState<Record<string, boolean>>({});

  const fetchAdaptive = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data: json } = await api.get('/api/student/adaptive-learning');
      const payload = parseAdaptivePayload(json);
      setCards(payload.cards);
      setDailyPlan(payload.dailyPlan);
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 401 || status === 403) {
        setError('Sign in to load adaptive recommendations.');
      } else {
        setError(e instanceof Error ? e.message : 'Could Not Load Recommendations');
      }
      setCards([]);
      setDailyPlan(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdaptive();
  }, [fetchAdaptive]);

  const openResource = (item: RecommendedItem) => {
    const mode = item.openMode || 'url';
    if (mode === 'navigate' && item.navigatePath) {
      router.push(item.navigatePath as any);
      return;
    }

    if (item.kind === 'quiz' && item._id) {
      router.push(`/quiz/${item._id}`);
      return;
    }

    if (item.kind === 'exam' && item.examId) {
      router.push(`/exam/${item.examId}` as any);
      return;
    }

    if (!item.fileUrl) return;

    const displayType = item.displayType?.toLowerCase() ?? '';
    openContentPreview(router, {
      _id: item._id,
      title: item.title,
      type: displayType === 'pdf' ? 'PDF' : displayType === 'video' ? 'Video' : item.displayType,
      fileUrl: item.fileUrl,
      driveLink: item.fileUrl.includes('drive.google') ? item.fileUrl : undefined,
    });
  };

  return (
    <LinearGradient
      colors={[...STUDENT_SKY.gradient]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.skyShell, dark && styles.darkWrap]}
    >
      <View style={styles.skyInner}>
      <PremiumSectionHeader
        title="Adaptive Learning"
        subtitle="Chapters From Your Exam Misses — Then Matching Library Resources"
        icon="bulb-outline"
        accent={STUDENT_SKY.accent}
        badge="AI Powered"
      />

      {loading ? (
        <ShimmerCard />
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={28} color={STUDENT.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchAdaptive}>
            <Text style={styles.retry}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : cards.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.muted}>No Adaptive Recommendations Yet.</Text>
          <Text style={styles.emptySub}>
            Attempt Exams So We Can Infer Weak Chapters And Map Them To Your Class Library.
          </Text>
        </View>
      ) : (
        <View>
          {dailyPlan ? (
            <View style={styles.dailyPlan}>
              <Text style={styles.dailyPlanTitle}>Today’s Plan · {dailyPlan.focusTopic}</Text>
              <Text style={styles.dailyPlanReason}>{dailyPlan.reason}</Text>
              {dailyPlan.steps.map((step, index) => (
                <TouchableOpacity key={step.key} style={styles.dailyStep} onPress={() => router.push(step.navigatePath as any)}>
                  <View style={styles.dailyStepNumber}><Text style={styles.dailyStepNumberText}>{index + 1}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dailyStepTitle}>{step.title}</Text>
                    <Text style={styles.dailyStepDescription}>{step.description}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={STUDENT_SKY.accentDark} />
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
          {cards.map((rec) => {
            const examScore = rec.examScorePercent ?? rec.progressPercent;
            const pri = priorityStyle(rec.priority);
            const displayContent = capAdaptiveRecommendationsPerSubject(rec.recommendedContent ?? []);
            return (
              <View key={rec.subjectId} style={styles.subjectCard}>
                <View style={styles.subjectTop}>
                  <LinearGradient
                    colors={[STUDENT_SKY.accent, STUDENT_SKY.accentDark]}
                    style={styles.subjectIcon}
                  >
                    <Ionicons name={getSubjectIcon(rec.subjectName)} size={16} color={STUDENT.textOnPrimary} />
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.subjectName}>{rec.subjectName}</Text>
                    <Text style={styles.subjectMeta}>
                      Exam Score {Math.round(examScore)}% · Weak Topics: {rec.weakTopicCount}
                    </Text>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: `${Math.min(100, examScore)}%` }]} />
                    </View>
                  </View>
                  <View style={[styles.priorityBadge, { backgroundColor: pri.bg, borderColor: pri.border }]}>
                    <Text style={[styles.priorityText, { color: pri.text }]}>
                      PRIORITY: {rec.priority.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {Array.isArray(rec.focusChapters) && rec.focusChapters.length > 0 ? (
                  <View style={styles.focusWrap}>
                    <Text style={styles.focusLabel}>CHAPTERS / SUBTOPICS TO FOCUS ON</Text>
                    {(expandedFocusIds[rec.subjectId]
                      ? rec.focusChapters
                      : rec.focusChapters.slice(0, FOCUS_CHAPTERS_VISIBLE)
                    ).map((ch) => (
                      <TouchableOpacity
                        key={ch.chapter}
                        style={styles.focusChip}
                        onPress={() => {
                          if (ch.navigatePath) router.push(ch.navigatePath as any);
                          else router.push('/learning-paths' as any);
                        }}
                      >
                        <Text style={styles.focusChapter}>{ch.chapter}</Text>
                        <Text style={styles.focusMeta}>
                          {(ch.wrong || 0) > 0 ? `${ch.wrong} wrong` : ''}
                          {(ch.wrong || 0) > 0 && (ch.skipped || 0) > 0 ? ' · ' : ''}
                          {(ch.skipped || 0) > 0 ? `${ch.skipped} skipped` : ''}
                          {(ch.wrong || 0) === 0 && (ch.skipped || 0) === 0 ? 'From Recent Exams' : ''}
                          {' · Study This'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    {rec.focusChapters.length > FOCUS_CHAPTERS_VISIBLE ? (
                      <TouchableOpacity
                        style={styles.moreBtn}
                        onPress={() =>
                          setExpandedFocusIds((prev) => ({
                            ...prev,
                            [rec.subjectId]: !prev[rec.subjectId],
                          }))
                        }
                        accessibilityRole="button"
                        accessibilityLabel={
                          expandedFocusIds[rec.subjectId]
                            ? 'Show fewer chapters'
                            : `Show ${rec.focusChapters.length - FOCUS_CHAPTERS_VISIBLE} more chapters`
                        }
                      >
                        <Text style={styles.moreBtnText}>
                          {expandedFocusIds[rec.subjectId]
                            ? 'Show Less'
                            : `+${rec.focusChapters.length - FOCUS_CHAPTERS_VISIBLE} More`}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ) : null}

                {displayContent.length > 0 ? (
                  <>
                    <Text style={styles.recLabel}>
                      {rec.usesLibraryFallback ? 'RECOMMENDED FROM YOUR LIBRARY' : 'RECOMMENDED FOR YOUR WEAK AREAS'}
                    </Text>
                    {displayContent.map((item) => {
                      const ts = typeStyle(item.displayType);
                      const actionLabel =
                        item.kind === 'quiz' || item.kind === 'exam'
                          ? 'Open'
                          : item.displayType?.toLowerCase() === 'pdf'
                            ? 'View Only'
                            : item.displayType?.toLowerCase() === 'video'
                              ? 'Watch'
                              : 'View';
                      return (
                        <TouchableOpacity
                          key={`${item.kind}-${item._id}`}
                          style={styles.recRow}
                          onPress={() => openResource(item)}
                          activeOpacity={0.85}
                        >
                          <Ionicons name="document-text-outline" size={16} color={STUDENT_SKY.accent} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.recTitle} numberOfLines={2}>
                              {item.title}
                            </Text>
                            {item.topicHint && !/^from your library$/i.test(item.topicHint) ? (
                              <Text style={styles.recHint} numberOfLines={1}>
                                Focus: {item.topicHint}
                              </Text>
                            ) : null}
                          </View>
                          <View style={[styles.typeBadge, { backgroundColor: ts.bg }]}>
                            <Text style={[styles.typeBadgeText, { color: ts.text }]}>{item.displayType}</Text>
                          </View>
                          <Text style={styles.actionLabel}>{actionLabel}</Text>
                          <Ionicons name="chevron-forward" size={14} color={STUDENT.textMuted} />
                        </TouchableOpacity>
                      );
                    })}
                  </>
                ) : (
                  <Text style={styles.mutedSmall}>No Library Content Available For This Subject Yet.</Text>
                )}

                {rec.gapsWithoutContent?.length > 0 ? (
                  <View style={styles.gapBox}>
                    <Text style={styles.gapTitle}>No Matching Library Items</Text>
                    {rec.gapsWithoutContent.slice(0, 3).map((topic) => (
                      <Text key={topic} style={styles.gapItem}>
                        No Content For: {topic}
                      </Text>
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  dailyPlan: { backgroundColor: STUDENT_SKY.cardBg, borderWidth: 1, borderColor: `${STUDENT_SKY.accent}55`, borderRadius: STUDENT_RADIUS.inner, padding: 12, marginBottom: 12 },
  dailyPlanTitle: { fontSize: 15, fontWeight: '800', color: STUDENT.text },
  dailyPlanReason: { fontSize: 11, color: STUDENT.textMuted, marginTop: 3, marginBottom: 8 },
  dailyStep: { flexDirection: 'row', alignItems: 'center', gap: 9, borderTopWidth: 1, borderTopColor: STUDENT_SKY.divider, paddingVertical: 9 },
  dailyStepNumber: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: `${STUDENT_SKY.accent}18` },
  dailyStepNumberText: { fontSize: 11, fontWeight: '800', color: STUDENT_SKY.accentDark },
  dailyStepTitle: { fontSize: 13, fontWeight: '700', color: STUDENT.text },
  dailyStepDescription: { fontSize: 10, color: STUDENT.textMuted, marginTop: 1 },
  skyShell: {
    borderRadius: 28,
    padding: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: STUDENT_SKY.shellBorder,
    ...STUDENT.shadow.md,
  },
  skyInner: {
    backgroundColor: STUDENT_SKY.innerBg,
    borderRadius: 20,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: STUDENT_SKY.innerBorder,
  },
  darkWrap: { opacity: 0.95 },
  center: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  muted: { fontSize: 13, color: STUDENT.textMuted, textAlign: 'center' },
  mutedSmall: { fontSize: 12, color: STUDENT.textMuted, fontStyle: 'italic' },
  errorText: { fontSize: 13, color: STUDENT.danger, textAlign: 'center' },
  retry: { fontSize: 13, fontWeight: '700', color: STUDENT_SKY.accent },
  emptyBox: {
    backgroundColor: STUDENT_SKY.cardBg,
    borderRadius: STUDENT_RADIUS.inner,
    padding: 16,
    borderWidth: 1,
    borderColor: STUDENT_SKY.cardBorder,
  },
  emptySub: { fontSize: 12, color: STUDENT.textMuted, textAlign: 'center', marginTop: 6 },
  subjectCard: {
    backgroundColor: STUDENT_SKY.cardBg,
    borderRadius: STUDENT_RADIUS.inner,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: STUDENT_SKY.cardBorder,
  },
  subjectTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  subjectIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subjectName: { fontSize: 15, fontWeight: '800', color: STUDENT.text },
  subjectMeta: { fontSize: 11, color: STUDENT.textMuted, marginTop: 2 },
  progressBar: {
    height: 4,
    backgroundColor: STUDENT_SKY.divider,
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: STUDENT_SKY.accent,
    borderRadius: 2,
  },
  priorityBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  priorityText: { fontSize: 9, fontWeight: '800' },
  focusWrap: { marginBottom: 10, gap: 6 },
  focusLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: STUDENT.danger,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  focusChip: {
    backgroundColor: `${STUDENT.danger}12`,
    borderWidth: 1,
    borderColor: `${STUDENT.danger}33`,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  focusChapter: { fontSize: 13, fontWeight: '700', color: STUDENT.text },
  focusMeta: { fontSize: 11, color: STUDENT.textMuted, marginTop: 2 },
  moreBtn: {
    alignSelf: 'flex-start',
    marginTop: 2,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: `${STUDENT_SKY.accent}14`,
    borderWidth: 1,
    borderColor: `${STUDENT_SKY.accent}33`,
  },
  moreBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: STUDENT_SKY.accentDark,
  },
  recLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: STUDENT.textMuted,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  recRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: STUDENT_SKY.divider,
  },
  recTitle: { fontSize: 13, fontWeight: '600', color: STUDENT.text },
  recHint: { fontSize: 11, color: STUDENT.textMuted, marginTop: 2 },
  typeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  typeBadgeText: { fontSize: 9, fontWeight: '800' },
  actionLabel: { fontSize: 10, fontWeight: '700', color: STUDENT_SKY.accent },
  gapBox: {
    marginTop: 8,
    backgroundColor: `${STUDENT.warning}12`,
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: `${STUDENT.warning}33`,
  },
  gapTitle: { fontSize: 9, fontWeight: '800', color: STUDENT.warning, marginBottom: 4 },
  gapItem: { fontSize: 11, color: STUDENT.warning },
});

export default memo(AdaptiveLearningModuleComponent);
