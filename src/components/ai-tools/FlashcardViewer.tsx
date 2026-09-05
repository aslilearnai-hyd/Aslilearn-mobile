import { useMemo, useState, type ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AiToolStackedSection from './AiToolStackedSection';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { stripStructuredAiToolMetadata } from '../../lib/strip-ai-tool-metadata';
import {
  resolveFlashcardsFromPayload,
  resolveStudentDeckMeta,
  resolveTeacherDeckMeta,
  type Flashcard,
  type StudentDeckMeta,
  type TeacherDeckMeta,
} from '../../lib/parse-flashcards';
import { getAiToolIonicon } from '../../lib/ai-tool-icons';

type Props = {
  content: string;
  rawContent?: unknown;
  variant?: 'student' | 'teacher';
  toolType?: string;
};

type SectionDef = {
  num: number;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  stripe: string;
  body: ReactNode;
};

function EmptySectionHint() {
  return <Text style={styles.emptyHint}>Not included in this study deck.</Text>;
}

function SectionCard({
  sectionNum,
  title,
  icon,
  stripe,
  children,
}: {
  sectionNum: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  stripe: string;
  children: ReactNode;
}) {
  const num = sectionNum.replace(/^section\s*/i, '').trim();
  return (
    <AiToolStackedSection num={num} title={title} icon={icon} accentColor={stripe}>
      {children}
    </AiToolStackedSection>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <View style={styles.bulletList}>
      {items.map((line, i) => (
        <View key={`${line}-${i}`} style={styles.bulletRow}>
          <Text style={styles.bulletDot}>•</Text>
          <Text style={styles.bulletText}>{line}</Text>
        </View>
      ))}
    </View>
  );
}

function PerCardList({
  cards,
  pick,
  label,
}: {
  cards: Flashcard[];
  pick: (c: Flashcard, i: number) => string;
  label: (i: number) => string;
}) {
  const rows = cards.map((c, i) => ({ i, text: pick(c, i).trim() })).filter((r) => r.text.length > 0);
  if (!rows.length) return <EmptySectionHint />;
  return (
    <View style={styles.perCardList}>
      {rows.map(({ i, text }) => (
        <View key={i} style={styles.perCardRow}>
          <Text style={styles.perCardLabel}>{label(i)}</Text>
          <Text style={styles.perCardText}>{text}</Text>
        </View>
      ))}
    </View>
  );
}

function Chip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[styles.chip, { backgroundColor: color }]}>
      <Text style={styles.chipLabel}>{label}</Text>
      <Text style={styles.chipValue}>{value}</Text>
    </View>
  );
}

function FlipCardSession({ cards }: { cards: Flashcard[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const flip = useSharedValue(0);

  const current = cards[currentIndex] ?? cards[0];

  const toggleFlip = (toBack?: boolean) => {
    const next = toBack !== undefined ? toBack : !isFlipped;
    setIsFlipped(next);
    flip.value = withTiming(next ? 1 : 0, { duration: 350 });
  };

  const goTo = (idx: number) => {
    setCurrentIndex(idx);
    setIsFlipped(false);
    flip.value = withTiming(0, { duration: 200 });
  };

  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 900 }, { rotateY: `${interpolate(flip.value, [0, 1], [0, 180])}deg` }],
    opacity: flip.value < 0.5 ? 1 : 0,
    zIndex: flip.value < 0.5 ? 2 : 0,
  }));

  const backStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 900 }, { rotateY: `${interpolate(flip.value, [0, 1], [180, 360])}deg` }],
    opacity: flip.value >= 0.5 ? 1 : 0,
    zIndex: flip.value >= 0.5 ? 2 : 0,
  }));

  const extras = [
    current.difficultyTag
      ? { label: 'Difficulty', value: current.difficultyTag, color: '#fef3c7' }
      : null,
    current.memoryHookQuickTip || current.memoryCue
      ? {
          label: 'Memory hook',
          value: current.memoryHookQuickTip || current.memoryCue || '',
          color: '#fef9c3',
        }
      : null,
    current.selfCheckRound
      ? { label: 'Self-check', value: current.selfCheckRound, color: '#ccfbf1' }
      : null,
  ].filter(Boolean) as { label: string; value: string; color: string }[];

  return (
    <View style={styles.flipSession}>
      <View style={styles.flipMetaRow}>
        <View style={styles.cardCountBadge}>
          <Text style={styles.cardCountText}>
            Card {currentIndex + 1} of {cards.length}
          </Text>
        </View>
        <Text style={styles.tapHint}>Tap to flip</Text>
      </View>

      <View style={styles.flipContainer}>
        <Animated.View style={[styles.flipFace, styles.flipFront, frontStyle]}>
          <View style={styles.flipCardInner}>
            <View style={styles.faceHeader}>
              <Text style={styles.faceHeaderFront}>Question</Text>
            </View>
            <ScrollView
              style={styles.faceBodyScroll}
              contentContainerStyle={styles.faceBodyContent}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >
              <Pressable
                onPress={() => toggleFlip()}
                accessibilityRole="button"
                accessibilityLabel={`Question: ${current.front}`}
                accessibilityHint="Flips the card to reveal the answer"
              >
                <Text style={styles.faceText}>{current.front}</Text>
              </Pressable>
            </ScrollView>
            <Pressable
              style={styles.showAnswerBtn}
              onPress={() => toggleFlip(true)}
              accessibilityRole="button"
              accessibilityLabel="Show answer"
            >
              <Ionicons
                name="book-outline"
                size={14}
                color="#fff"
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
              <Text style={styles.showAnswerText}>Show answer</Text>
            </Pressable>
          </View>
        </Animated.View>

        <Animated.View style={[styles.flipFace, styles.flipBack, backStyle]}>
          <View style={styles.flipCardInner}>
            <View style={[styles.faceHeader, styles.faceHeaderBack]}>
              <Text style={styles.faceHeaderBackText}>Answer</Text>
            </View>
            <ScrollView
              style={styles.faceBodyScroll}
              contentContainerStyle={styles.faceBodyContent}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >
              <Pressable
                onPress={() => toggleFlip(false)}
                accessibilityRole="button"
                accessibilityLabel={`Answer: ${current.back}`}
                accessibilityHint="Flips the card back to the question"
              >
                <Text style={styles.faceText}>{current.back}</Text>
                {extras.length > 0 ? (
                  <View style={styles.extrasRow}>
                    {extras.map((chip) => (
                      <View key={chip.label} style={[styles.extraChip, { backgroundColor: chip.color }]}>
                        <Text style={styles.extraChipLabel}>{chip.label}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </Pressable>
            </ScrollView>
            <Pressable
              style={styles.backBtn}
              onPress={() => toggleFlip(false)}
              accessibilityRole="button"
              accessibilityLabel="Back to question"
            >
              <Ionicons
                name="refresh-outline"
                size={14}
                color="#4338ca"
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
              <Text style={styles.backBtnText}>Back</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>

      {extras.length > 0 ? (
        <View style={styles.studyBoosters}>
          <Text style={styles.studyBoostersTitle}>Study boosters</Text>
          <View style={styles.studyBoosterList}>
            {extras.map((chip) => (
              <Chip key={chip.label} label={chip.label} value={chip.value} color={chip.color} />
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.navRow}>
        <Pressable
          style={[styles.navBtn, currentIndex === 0 && styles.navBtnDisabled]}
          disabled={currentIndex === 0}
          onPress={() => goTo(currentIndex - 1)}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="Previous card"
          accessibilityState={{ disabled: currentIndex === 0 }}
        >
          <Ionicons name="chevron-back" size={18} color="#5b21b6" />
        </Pressable>
        <View style={styles.dotsRow}>
          {cards.map((_, idx) => (
            <Pressable
              key={idx}
              onPress={() => goTo(idx)}
              hitSlop={18}
              accessibilityRole="button"
              accessibilityLabel={`Go to card ${idx + 1} of ${cards.length}`}
              accessibilityState={{ selected: idx === currentIndex }}
              style={[styles.dot, idx === currentIndex ? styles.dotActive : styles.dotInactive]}
            />
          ))}
        </View>
        <Pressable
          style={[styles.navBtn, currentIndex >= cards.length - 1 && styles.navBtnDisabled]}
          disabled={currentIndex >= cards.length - 1}
          onPress={() => goTo(currentIndex + 1)}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="Next card"
          accessibilityState={{ disabled: currentIndex >= cards.length - 1 }}
        >
          <Ionicons name="chevron-forward" size={18} color="#5b21b6" />
        </Pressable>
      </View>
    </View>
  );
}

function StudentDeckView({ meta, cards }: { meta: StudentDeckMeta; cards: Flashcard[] }) {
  const hasDifficulty = cards.some((c) => (c.difficultyTag || c.skillFocus || '').trim());
  const hasMemory = cards.some((c) => (c.memoryHookQuickTip || c.memoryCue || '').trim());
  const hasSelfCheck = cards.some(
    (c) => (c.selfCheckRound || c.peerPrompt || c.reflection || '').trim()
  );

  const sections: SectionDef[] = [
    {
      num: 2,
      title: 'Subtopic Link and Prior Knowledge Required',
      icon: 'locate-outline',
      stripe: '#06b6d4',
      body: meta.subtopicLinkPriorKnowledge ? (
        <Text style={styles.bodyText}>{meta.subtopicLinkPriorKnowledge}</Text>
      ) : (
        <EmptySectionHint />
      ),
    },
    {
      num: 3,
      title: "Learning Objectives - Bloom's Taxonomy Aligned",
      icon: 'radio-button-on-outline',
      stripe: '#6366f1',
      body:
        meta.learningObjectives.length > 0 ? (
          <BulletList items={meta.learningObjectives} />
        ) : (
          <EmptySectionHint />
        ),
    },
    {
      num: 4,
      title: 'NCF Competency / Learning Outcome Alignment',
      icon: 'school-outline',
      stripe: '#3b82f6',
      body: meta.ncfAlignment ? (
        <Text style={styles.bodyText}>{meta.ncfAlignment}</Text>
      ) : (
        <EmptySectionHint />
      ),
    },
    {
      num: 5,
      title: 'Flashcard Set',
      icon: 'flash-outline',
      stripe: '#8b5cf6',
      body:
        cards.length > 0 ? (
          <FlipCardSession cards={cards} />
        ) : (
          <EmptySectionHint />
        ),
    },
    {
      num: 6,
      title: 'Difficulty Tag for Each Card',
      icon: 'speedometer-outline',
      stripe: '#f59e0b',
      body: hasDifficulty ? (
        <PerCardList
          cards={cards}
          pick={(c) => c.difficultyTag || c.skillFocus || ''}
          label={(i) => `Card ${i + 1}`}
        />
      ) : (
        <EmptySectionHint />
      ),
    },
    {
      num: 7,
      title: 'Memory Hook / Quick Tip',
      icon: 'bulb-outline',
      stripe: '#eab308',
      body: hasMemory ? (
        <PerCardList
          cards={cards}
          pick={(c) => c.memoryHookQuickTip || c.memoryCue || ''}
          label={(i) => `Card ${i + 1}`}
        />
      ) : (
        <EmptySectionHint />
      ),
    },
    {
      num: 8,
      title: 'Self-Check Round',
      icon: 'checkmark-circle-outline',
      stripe: '#14b8a6',
      body: (
        <>
          {meta.selfCheckRound ? (
            <Text style={[styles.bodyText, styles.mb8]}>{meta.selfCheckRound}</Text>
          ) : null}
          {hasSelfCheck ? (
            <PerCardList
              cards={cards}
              pick={(c) => c.selfCheckRound || c.peerPrompt || c.reflection || ''}
              label={(i) => `Card ${i + 1}`}
            />
          ) : !meta.selfCheckRound ? (
            <EmptySectionHint />
          ) : null}
        </>
      ),
    },
    {
      num: 9,
      title: 'Common Mistakes to Avoid',
      icon: 'warning-outline',
      stripe: '#f97316',
      body:
        meta.commonMistakesToAvoid.length > 0 ? (
          <BulletList items={meta.commonMistakesToAvoid} />
        ) : (
          <EmptySectionHint />
        ),
    },
    {
      num: 10,
      title: 'Expected Learning Outcomes',
      icon: 'trophy-outline',
      stripe: '#a855f7',
      body:
        meta.expectedLearningOutcomes.length > 0 ? (
          <BulletList items={meta.expectedLearningOutcomes} />
        ) : (
          <EmptySectionHint />
        ),
    },
    {
      num: 11,
      title: 'Real-life Application',
      icon: 'sparkles-outline',
      stripe: '#f43f5e',
      body: meta.realLifeApplication ? (
        <Text style={styles.bodyText}>{meta.realLifeApplication}</Text>
      ) : (
        <EmptySectionHint />
      ),
    },
    {
      num: 12,
      title: 'Reflection / Exit Ticket',
      icon: 'chatbubble-ellipses-outline',
      stripe: '#64748b',
      body: meta.reflectionExitTicket ? (
        <Text style={styles.bodyText}>{meta.reflectionExitTicket}</Text>
      ) : (
        <EmptySectionHint />
      ),
    },
  ];

  return (
    <View style={styles.scrollContent}>
      <View style={styles.deckShell}>
        <LinearGradient
          colors={['#7c3aed', '#4f46e5', '#9333ea']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.studentHeroGradient}
        >
          <View style={styles.studentHeroRow}>
            <View style={styles.studentHeroIconWrap}>
              <Ionicons name="layers-outline" size={22} color="#fff" />
            </View>
            <View style={styles.studentHeroText}>
              <Text style={styles.studentHeroEyebrow}>My Study Decks</Text>
              <Text style={styles.studentHeroTitle} numberOfLines={3}>
                {meta.title}
              </Text>
              {cards.length > 0 ? (
                <Text style={styles.studentHeroSub}>{cards.length} flashcards in deck</Text>
              ) : null}
            </View>
          </View>
        </LinearGradient>

        <View style={styles.inner}>
          <View style={styles.section1Card}>
            <Text style={styles.section1Label}>Section 1</Text>
            <View style={styles.deckBadge}>
              <Text style={styles.deckBadgeText}>Deck</Text>
            </View>
            <Text style={styles.section1Title}>{meta.title}</Text>
          </View>

          {sections.map((sec) => (
            <SectionCard
              key={sec.num}
              sectionNum={`Section ${sec.num}`}
              title={sec.title}
              icon={sec.icon}
              stripe={sec.stripe}
            >
              {sec.body}
            </SectionCard>
          ))}
        </View>
      </View>
    </View>
  );
}

function TeacherDeckView({
  meta,
  cards,
  heroIcon,
}: {
  meta: TeacherDeckMeta;
  cards: Flashcard[];
  heroIcon: keyof typeof Ionicons.glyphMap;
}) {
  const topicLabel =
    meta.topic ||
    (meta.topicAndSubtopicLink ? meta.topicAndSubtopicLink.split(/\s*[—–\-:]\s*/)[0]?.trim() : '');
  const subtopicLabel =
    meta.subtopic ||
    (meta.topicAndSubtopicLink
      ? meta.topicAndSubtopicLink.split(/\s*[—–\-:]\s*/).slice(1).join(' — ').trim()
      : '');

  const contextChips = [
    topicLabel ? { label: 'Topic', value: topicLabel } : null,
    subtopicLabel ? { label: 'Subtopic', value: subtopicLabel } : null,
    meta.classLevel ? { label: 'Class', value: meta.classLevel } : null,
    meta.difficultyLevel ? { label: 'Difficulty', value: meta.difficultyLevel } : null,
    meta.bloomLevel ? { label: "Bloom's", value: meta.bloomLevel } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  const sections: SectionDef[] = [
    {
      num: 1,
      title: 'Context & Alignment',
      icon: 'information-circle-outline',
      stripe: '#a5b4fc',
      body: (
        <View style={styles.chipList}>
          {contextChips.map((chip) => (
            <Chip key={chip.label} label={chip.label} value={chip.value} color="#eef2ff" />
          ))}
          {!contextChips.length ? <EmptySectionHint /> : null}
        </View>
      ),
    },
    {
      num: 2,
      title: 'Foundations',
      icon: 'library-outline',
      stripe: '#c4b5fd',
      body: (
        <View style={styles.gap8}>
          {meta.priorKnowledgeRequired ? (
            <Text style={styles.bodyText}>
              <Text style={styles.boldLabel}>Prior knowledge: </Text>
              {meta.priorKnowledgeRequired}
            </Text>
          ) : null}
          {meta.learningObjectives.length > 0 ? (
            <>
              <Text style={styles.boldLabelBlock}>Learning objectives</Text>
              <BulletList items={meta.learningObjectives} />
            </>
          ) : null}
          {meta.ncfCompetencyAlignment ? (
            <Text style={styles.bodyText}>
              <Text style={styles.boldLabel}>NCF alignment: </Text>
              {meta.ncfCompetencyAlignment}
            </Text>
          ) : null}
          {!meta.priorKnowledgeRequired &&
          !meta.learningObjectives.length &&
          !meta.ncfCompetencyAlignment ? (
            <EmptySectionHint />
          ) : null}
        </View>
      ),
    },
    {
      num: 3,
      title: 'The Card Set: Application & HOTS',
      icon: 'flash-outline',
      stripe: '#7c3aed',
      body: <FlipCardSession cards={cards} />,
    },
    {
      num: 4,
      title: 'Study Aids',
      icon: 'bulb-outline',
      stripe: '#fcd34d',
      body: (
        <View style={styles.gap8}>
          {meta.deckMemoryHook ? (
            <Text style={styles.bodyText}>
              <Text style={styles.boldLabel}>Deck memory hook: </Text>
              {meta.deckMemoryHook}
            </Text>
          ) : null}
          {meta.commonMistakesToAvoid.length > 0 ? (
            <>
              <Text style={styles.boldLabelBlock}>Common mistakes to avoid</Text>
              <BulletList items={meta.commonMistakesToAvoid} />
            </>
          ) : null}
          {meta.selfCheckRapidRecallRound ? (
            <Text style={styles.bodyText}>
              <Text style={styles.boldLabel}>Self-check round: </Text>
              {meta.selfCheckRapidRecallRound}
            </Text>
          ) : null}
          {!meta.deckMemoryHook &&
          !meta.commonMistakesToAvoid.length &&
          !meta.selfCheckRapidRecallRound ? (
            <EmptySectionHint />
          ) : null}
        </View>
      ),
    },
    {
      num: 5,
      title: 'Wrap-Up',
      icon: 'flag-outline',
      stripe: '#6ee7b7',
      body: (
        <View style={styles.gap8}>
          {meta.realLifeConnection ? (
            <Text style={styles.bodyText}>
              <Text style={styles.boldLabel}>Real-life connection: </Text>
              {meta.realLifeConnection}
            </Text>
          ) : null}
          {meta.differentiationSupport ? (
            <Text style={styles.bodyText}>
              <Text style={styles.boldLabel}>Differentiation: </Text>
              {meta.differentiationSupport}
            </Text>
          ) : null}
          {meta.reflectionExitTicket ? (
            <Text style={styles.bodyText}>
              <Text style={styles.boldLabel}>Reflection: </Text>
              {meta.reflectionExitTicket}
            </Text>
          ) : null}
          {!meta.realLifeConnection && !meta.differentiationSupport && !meta.reflectionExitTicket ? (
            <EmptySectionHint />
          ) : null}
        </View>
      ),
    },
  ];

  return (
    <View style={styles.scrollContent}>
      <View style={styles.deckShell}>
        <View style={[styles.hero, styles.heroLight]}>
          <View style={styles.heroIcon}>
            <Ionicons name={heroIcon} size={22} color="#6d28d9" />
          </View>
          <View style={styles.heroText}>
            <Text style={styles.heroEyebrow}>Flash Card Generator</Text>
            <Text style={styles.heroTitle} numberOfLines={2}>
              {meta.title}
            </Text>
            <Text style={styles.heroSub}>{cards.length} task/solution cards</Text>
          </View>
        </View>

        <View style={styles.inner}>
          {sections.map((sec) => (
            <SectionCard
              key={sec.num}
              sectionNum={`Block ${sec.num}`}
              title={sec.title}
              icon={sec.icon}
              stripe={sec.stripe}
            >
              {sec.body}
            </SectionCard>
          ))}
        </View>
      </View>
    </View>
  );
}

export default function FlashcardViewer({
  content,
  rawContent,
  variant = 'student',
  toolType,
}: Props) {
  const cleaned = useMemo(() => stripStructuredAiToolMetadata(content), [content]);
  const iconToolType = toolType ?? (variant === 'teacher' ? 'flashcard-generator' : 'my-study-decks');
  const heroIcon = getAiToolIonicon(iconToolType);
  const { cards } = useMemo(
    () => resolveFlashcardsFromPayload(cleaned, rawContent),
    [cleaned, rawContent]
  );
  const studentMeta = useMemo(
    () => resolveStudentDeckMeta(cleaned, rawContent),
    [cleaned, rawContent]
  );
  const teacherMeta = useMemo(
    () => resolveTeacherDeckMeta(cleaned, rawContent),
    [cleaned, rawContent]
  );

  const isStudentStudyDecks = variant === 'student' && toolType === 'my-study-decks';

  if (!cards.length && !isStudentStudyDecks) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="layers-outline" size={36} color="#cbd5e1" />
        <Text style={styles.emptyTitle}>No flashcards in this content</Text>
        <Text style={styles.emptySub}>Generate or upload a deck with front and back on each card.</Text>
      </View>
    );
  }

  if (variant === 'teacher') {
    return (
      <TeacherDeckView
        meta={
          teacherMeta || {
            title: studentMeta.title,
            topic: '',
            subtopic: '',
            topicAndSubtopicLink: '',
            classLevel: '',
            difficultyLevel: 'Medium',
            bloomLevel: 'Apply / Analyze',
            priorKnowledgeRequired: '',
            learningObjectives: studentMeta.learningObjectives,
            ncfCompetencyAlignment: studentMeta.ncfAlignment,
            deckMemoryHook: '',
            selfCheckRapidRecallRound: studentMeta.selfCheckRound,
            commonMistakesToAvoid: studentMeta.commonMistakesToAvoid,
            differentiationSupport: '',
            realLifeConnection: studentMeta.realLifeApplication,
            reflectionExitTicket: studentMeta.reflectionExitTicket,
          }
        }
        cards={cards}
        heroIcon={heroIcon}
      />
    );
  }

  return <StudentDeckView meta={studentMeta} cards={cards} />;
}

const flipFaceBase: ViewStyle = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backfaceVisibility: 'hidden',
};

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  deckShell: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#ddd6fe',
    overflow: 'hidden',
    backgroundColor: '#f5f3ff',
    shadowColor: '#8b5cf6',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  studentHeroGradient: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ede9fe',
  },
  studentHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  studentHeroIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentHeroText: { flex: 1, minWidth: 0 },
  studentHeroEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.85)',
  },
  studentHeroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    marginTop: 2,
    lineHeight: 24,
  },
  studentHeroSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  heroLight: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  heroIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: { flex: 1 },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: '#64748B',
  },
  heroTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginTop: 2 },
  heroSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  inner: { padding: 6, gap: 6 },
  section1Card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ddd6fe',
    backgroundColor: '#FFFFFF',
    padding: 12,
  },
  section1Label: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: '#7c3aed',
    marginBottom: 4,
  },
  deckBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#ede9fe',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 6,
  },
  deckBadgeText: { fontSize: 11, fontWeight: '700', color: '#5b21b6' },
  section1Title: { fontSize: 20, fontWeight: '800', color: '#0f172a', lineHeight: 28 },
  sectionCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ddd6fe',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderLeftWidth: 4,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.36)',
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderText: { flex: 1 },
  sectionNum: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: '#a78bfa',
  },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: '#0f172a', lineHeight: 18 },
  sectionBody: { paddingHorizontal: 12, paddingBottom: 12, paddingTop: 8 },
  bodyText: { fontSize: 14, lineHeight: 22, color: '#334155' },
  boldLabel: { fontWeight: '800', color: '#312e81' },
  boldLabelBlock: { fontWeight: '800', color: '#312e81', marginBottom: 6 },
  mb8: { marginBottom: 8 },
  gap8: { gap: 8 },
  bulletList: { gap: 6 },
  bulletRow: { flexDirection: 'row', gap: 8 },
  bulletDot: { color: '#8b5cf6', fontSize: 14, fontWeight: '800', marginTop: 2 },
  bulletText: { flex: 1, fontSize: 14, lineHeight: 22, color: '#334155' },
  emptyHint: { fontSize: 12, fontStyle: 'italic', color: '#5B6779' },
  perCardList: { gap: 6 },
  perCardRow: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ede9fe',
    backgroundColor: '#f5f3ff',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
  },
  perCardLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: '#7c3aed',
    marginBottom: 2,
  },
  perCardText: { fontSize: 13, lineHeight: 20, color: '#334155' },
  flipSession: { gap: 10 },
  flipMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardCountBadge: {
    backgroundColor: '#ede9fe',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  cardCountText: { fontSize: 11, fontWeight: '700', color: '#5b21b6' },
  tapHint: { fontSize: 11, color: '#5B6779' },
  flipContainer: { minHeight: 340, height: 340, position: 'relative' },
  flipFace: { ...flipFaceBase, height: '100%' },
  flipCardInner: { flex: 1, flexDirection: 'column', minHeight: 0 },
  flipFront: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#c4b5fd',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#7c3aed',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  flipBack: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#a5b4fc',
    backgroundColor: '#eef2ff',
    overflow: 'hidden',
  },
  flipPressable: { flex: 1 },
  faceHeader: {
    flexShrink: 0,
    minHeight: 36,
    borderBottomWidth: 1,
    borderBottomColor: '#ede9fe',
    backgroundColor: '#f5f3ff',
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceHeaderFront: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#6d28d9',
  },
  faceHeaderBack: { backgroundColor: '#e0e7ff', borderBottomColor: '#c7d2fe' },
  faceHeaderBackText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#4338ca',
  },
  faceBodyScroll: { flex: 1, minHeight: 0 },
  faceBodyContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
  },
  faceText: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 22,
    color: '#0f172a',
    textAlign: 'left',
    flexShrink: 1,
    width: '100%',
  },
  showAnswerBtn: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#7c3aed',
    borderRadius: 999,
    paddingVertical: 8,
  },
  showAnswerText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  backBtn: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#c7d2fe',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingVertical: 8,
  },
  backBtnText: { fontSize: 12, fontWeight: '700', color: '#4338ca' },
  extrasRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 8 },
  extraChip: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  extraChipLabel: { fontSize: 9, fontWeight: '800', color: '#78350f' },
  studyBoosters: { gap: 8, marginTop: 4 },
  studyBoostersTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: '#7c3aed',
  },
  chipList: { gap: 8 },
  studyBoosterList: { gap: 8 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    width: '100%',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 4,
  },
  chipLabel: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase', color: '#64748b' },
  chipValue: { fontSize: 13, lineHeight: 20, color: '#334155' },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ede9fe',
    backgroundColor: '#faf5ff',
    padding: 8,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  navBtnDisabled: { opacity: 0.35 },
  dotsRow: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 },
  dot: { borderRadius: 999, height: 8 },
  dotActive: { width: 22, backgroundColor: '#7c3aed' },
  dotInactive: { width: 8, backgroundColor: '#c4b5fd' },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#e2e8f0',
    backgroundColor: 'rgba(255,255,255,0.42)',
    gap: 8,
  },
  emptyTitle: { fontSize: 14, fontWeight: '600', color: '#475569' },
  emptySub: { fontSize: 12, color: '#5B6779', textAlign: 'center' },
});
