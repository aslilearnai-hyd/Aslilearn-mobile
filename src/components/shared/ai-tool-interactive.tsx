import { useEffect, useState, type ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
} from 'react-native-reanimated';

export type InteractiveTone =
  | 'violet'
  | 'teal'
  | 'emerald'
  | 'amber'
  | 'lime'
  | 'fuchsia'
  | 'sky'
  | 'rose'
  | 'indigo'
  | 'pink'
  | 'orange'
  | 'cyan'
  | 'slate';

type ToneColors = { accent: string; soft: string; softBorder: string; text: string };

const TONE_MAP: Record<InteractiveTone, ToneColors> = {
  violet: { accent: '#7c3aed', soft: '#f5f3ff', softBorder: '#ddd6fe', text: '#5b21b6' },
  teal: { accent: '#0f766e', soft: '#f0fdfa', softBorder: '#99f6e4', text: '#115e59' },
  emerald: { accent: '#059669', soft: '#ecfdf5', softBorder: '#a7f3d0', text: '#065f46' },
  amber: { accent: '#d97706', soft: '#fffbeb', softBorder: '#fde68a', text: '#92400e' },
  lime: { accent: '#65a30d', soft: '#f7fee7', softBorder: '#d9f99d', text: '#3f6212' },
  fuchsia: { accent: '#c026d3', soft: '#fdf4ff', softBorder: '#f5d0fe', text: '#86198f' },
  sky: { accent: '#0284c7', soft: '#f0f9ff', softBorder: '#bae6fd', text: '#075985' },
  rose: { accent: '#e11d48', soft: '#fff1f2', softBorder: '#fecdd3', text: '#9f1239' },
  indigo: { accent: '#4f46e5', soft: '#eef2ff', softBorder: '#c7d2fe', text: '#3730a3' },
  pink: { accent: '#db2777', soft: '#fdf2f8', softBorder: '#fbcfe8', text: '#9d174d' },
  orange: { accent: '#ea580c', soft: '#fff7ed', softBorder: '#fed7aa', text: '#9a3412' },
  cyan: { accent: '#0e7490', soft: '#ecfeff', softBorder: '#a5f3fc', text: '#155e75' },
  slate: { accent: '#475569', soft: '#f8fafc', softBorder: '#e2e8f0', text: '#334155' },
};

function toneOf(tone: InteractiveTone = 'violet'): ToneColors {
  return TONE_MAP[tone] || TONE_MAP.violet;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Shared "whileTap"-style press scale, matching the web version's tap feedback. */
function useTapScale() {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return {
    style,
    onPressIn: () => {
      scale.value = withTiming(0.97, { duration: 90 });
    },
    onPressOut: () => {
      scale.value = withTiming(1, { duration: 160 });
    },
  };
}

/** Little "pop" the icon plays whenever `active` flips to true — mirrors web's check-in bounce. */
function usePopOnActive(active: boolean) {
  const pop = useSharedValue(1);
  useEffect(() => {
    if (active) {
      pop.value = withSequence(withTiming(1.35, { duration: 110 }), withTiming(1, { duration: 140 }));
    }
  }, [active, pop]);
  return useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
}

function CheckRow({
  item,
  index,
  done,
  onToggle,
  c,
}: {
  item: string;
  index: number;
  done: boolean;
  onToggle: () => void;
  c: ToneColors;
}) {
  const tap = useTapScale();
  const pop = usePopOnActive(done);
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 40).duration(260)}>
      <AnimatedPressable
        onPress={onToggle}
        onPressIn={tap.onPressIn}
        onPressOut={tap.onPressOut}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={item}
        style={[
          styles.selfCheckRow,
          tap.style,
          { borderColor: done ? c.accent : 'rgba(255,255,255,0.9)' },
          done && { backgroundColor: '#FFFFFF' },
        ]}
      >
        <Animated.View style={pop}>
          <Ionicons
            name={done ? 'checkmark-circle' : 'ellipse-outline'}
            size={20}
            color={done ? c.accent : '#94a3b8'}
          />
        </Animated.View>
        <Text style={[styles.selfCheckText, done && styles.selfCheckTextDone]}>{item}</Text>
      </AnimatedPressable>
    </Animated.View>
  );
}

/** Tap each item once you've reviewed/answered/understood it — a self-check list with a running counter. */
export function SelfCheckList({
  items,
  tone = 'violet',
  prompt = "Tap each one you're confident about",
}: {
  items: string[];
  tone?: InteractiveTone;
  prompt?: string;
}) {
  const c = toneOf(tone);
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  if (!items.length) return null;
  const doneCount = Object.values(checked).filter(Boolean).length;

  const toggle = (i: number) => setChecked((prev) => ({ ...prev, [i]: !prev[i] }));

  return (
    <View style={[styles.selfCheckWrap, { backgroundColor: c.soft, borderColor: c.softBorder }]}>
      <View style={styles.selfCheckHeaderRow}>
        <Text style={[styles.selfCheckPrompt, { color: c.text }]}>{prompt}</Text>
        <Text style={[styles.selfCheckCount, { color: c.accent }]}>
          {doneCount}/{items.length} confident
        </Text>
      </View>
      <View style={styles.selfCheckList}>
        {items.map((item, i) => (
          <CheckRow key={`${item}-${i}`} item={item} index={i} done={!!checked[i]} onToggle={() => toggle(i)} c={c} />
        ))}
      </View>
    </View>
  );
}

const ICON_ALIASES: Record<string, keyof typeof Ionicons.glyphMap> = {
  lightbulb: 'bulb-outline',
  star: 'star',
  checklist: 'checkbox-outline',
  sparkle: 'sparkles-outline',
  sparkles: 'sparkles-outline',
  notebook: 'book-outline',
  quiz: 'help-circle-outline',
  'ellipse-outline': 'ellipse-outline',
  'checkmark-circle': 'checkmark-circle',
  'bulb-outline': 'bulb-outline',
  'checkbox-outline': 'checkbox-outline',
  'sparkles-outline': 'sparkles-outline',
  'book-outline': 'book-outline',
  'help-circle-outline': 'help-circle-outline',
};

function resolveInteractiveIcon(name?: string): keyof typeof Ionicons.glyphMap {
  if (!name) return 'ellipse-outline';
  return ICON_ALIASES[name] || (name as keyof typeof Ionicons.glyphMap);
}

/** A single tappable row that toggles a checked/strike-through state — for materials, aids, checklists. */
export function TapToMarkItem({
  text,
  tone = 'violet',
  markedStyle = 'strike',
  iconOff = 'ellipse-outline',
  iconOn = 'checkmark-circle',
}: {
  text: string;
  tone?: InteractiveTone;
  markedStyle?: 'strike' | 'none' | 'highlight';
  iconOff?: string;
  iconOn?: string;
}) {
  const c = toneOf(tone);
  const [marked, setMarked] = useState(false);
  const tap = useTapScale();
  const pop = usePopOnActive(marked);
  return (
    <AnimatedPressable
      onPress={() => setMarked((v) => !v)}
      onPressIn={tap.onPressIn}
      onPressOut={tap.onPressOut}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: marked }}
      accessibilityLabel={text}
      style={[
        styles.markRow,
        tap.style,
        { borderColor: marked ? c.accent : c.softBorder, backgroundColor: marked ? c.soft : '#FFFFFF' },
      ]}
    >
      <Animated.View style={pop}>
        <Ionicons
          name={resolveInteractiveIcon(marked ? iconOn : iconOff)}
          size={20}
          color={marked ? c.accent : '#94a3b8'}
        />
      </Animated.View>
      <Text
        style={[
          styles.markText,
          marked && markedStyle === 'strike' && styles.markTextStrike,
          marked && markedStyle === 'highlight' && { color: c.text, fontWeight: '600' },
        ]}
      >
        {text}
      </Text>
    </AnimatedPressable>
  );
}

/** Tap to reveal hidden content — for answer keys, hints, and answers that shouldn't be visible by default. */
export function TapToRevealCard({
  label = 'Tap to reveal',
  text,
  prompt,
  detail,
  revealLabel,
  tone = 'violet',
}: {
  label?: string;
  text?: string;
  /** Web-parity: term / question shown as the card title. */
  prompt?: string;
  /** Web-parity: hidden body. */
  detail?: string;
  revealLabel?: string;
  tone?: InteractiveTone;
}) {
  const c = toneOf(tone);
  const [revealed, setRevealed] = useState(false);
  const tap = useTapScale();
  const body = String(detail ?? text ?? '').trim();
  const heading = String(prompt || '').trim();
  const action = revealLabel || label;
  if (!body && !heading) return null;
  return (
    <AnimatedPressable
      onPress={() => setRevealed((v) => !v)}
      onPressIn={tap.onPressIn}
      onPressOut={tap.onPressOut}
      accessibilityRole="button"
      accessibilityState={{ expanded: revealed }}
      accessibilityLabel={revealed ? body || heading : heading || action}
      style={[styles.revealCard, tap.style, { borderColor: c.softBorder, backgroundColor: c.soft }]}
    >
      {heading ? (
        <View style={styles.revealHeader}>
          <Text style={[styles.revealPromptTitle, { color: c.text }]}>{heading}</Text>
          {body ? (
            <Text style={[styles.revealLabel, { color: c.accent }]}>{revealed ? 'Hide' : action}</Text>
          ) : null}
        </View>
      ) : null}
      {revealed && body ? (
        <Animated.View entering={FadeInDown.duration(280).springify().damping(16)}>
          <Text style={[styles.revealText, { color: c.text }, heading && styles.revealTextAfterTitle]}>{body}</Text>
        </Animated.View>
      ) : !heading ? (
        <Animated.View entering={FadeIn.duration(160)} style={styles.revealPrompt}>
          <Ionicons name="eye-outline" size={16} color={c.accent} />
          <Text style={[styles.revealLabel, { color: c.accent }]}>{action}</Text>
        </Animated.View>
      ) : null}
    </AnimatedPressable>
  );
}

function StepRow({
  step,
  index,
  done,
  onToggle,
  c,
}: {
  step: string;
  index: number;
  done: boolean;
  onToggle: () => void;
  c: ToneColors;
}) {
  const tap = useTapScale();
  const pop = usePopOnActive(done);
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 40).duration(260)}>
      <AnimatedPressable
        onPress={onToggle}
        onPressIn={tap.onPressIn}
        onPressOut={tap.onPressOut}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        style={[styles.stepRow, tap.style]}
      >
        <Animated.View
          style={[
            styles.stepBadge,
            pop,
            { backgroundColor: done ? c.accent : c.soft, borderColor: c.accent },
          ]}
        >
          {done ? (
            <Ionicons name="checkmark" size={14} color="#fff" />
          ) : (
            <Text style={[styles.stepBadgeText, { color: c.accent }]}>{index + 1}</Text>
          )}
        </Animated.View>
        <Text style={[styles.stepText, done && styles.stepTextDone]}>{step}</Text>
      </AnimatedPressable>
    </Animated.View>
  );
}

/** Numbered steps, each tappable to mark done — used for procedures/timelines. */
export function CheckableSteps({
  items,
  tone = 'teal',
}: {
  items: string[];
  tone?: InteractiveTone;
}) {
  const c = toneOf(tone);
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  if (!items.length) return null;
  const doneCount = Object.values(checked).filter(Boolean).length;
  const toggle = (i: number) => setChecked((prev) => ({ ...prev, [i]: !prev[i] }));

  return (
    <View style={styles.stepsWrap}>
      <Text style={[styles.stepsCount, { color: c.accent }]}>
        {doneCount}/{items.length} marked done — tap a step to check it off
      </Text>
      {items.map((step, i) => (
        <StepRow key={`${step}-${i}`} step={step} index={i} done={!!checked[i]} onToggle={() => toggle(i)} c={c} />
      ))}
    </View>
  );
}

/** Timeline of steps/objectives the student can tap to check off — same as web CheckableTimeline. */
export function CheckableTimeline({ items, tone = 'violet' }: { items: string[]; tone?: InteractiveTone }) {
  return <CheckableSteps items={items} tone={tone} />;
}

/** Text with a Read more / Read less toggle once it gets long. */
export function ExpandableText({ text, threshold = 260 }: { text?: string; threshold?: number }) {
  const [expanded, setExpanded] = useState(false);
  const safeText = String(text || '');
  if (!safeText.trim()) return null;
  const isLong = safeText.length > threshold;
  const display = isLong && !expanded ? `${safeText.slice(0, threshold - 40).trim()}…` : safeText;
  return (
    <View>
      <Text style={styles.expandText}>{display}</Text>
      {isLong ? (
        <Pressable onPress={() => setExpanded((v) => !v)} style={styles.expandBtn} accessibilityRole="button">
          <Text style={styles.expandBtnLabel}>{expanded ? 'Read less ↑' : 'Read more ↓'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Tap-to-flip card for terms / concepts. */
export function FlipCard({
  front,
  back,
  tone = 'amber',
}: {
  front: ReactNode;
  back: ReactNode;
  tone?: InteractiveTone;
}) {
  const c = toneOf(tone);
  const [flipped, setFlipped] = useState(false);
  const tap = useTapScale();
  return (
    <AnimatedPressable
      onPress={() => setFlipped((v) => !v)}
      onPressIn={tap.onPressIn}
      onPressOut={tap.onPressOut}
      accessibilityRole="button"
      accessibilityState={{ expanded: flipped }}
      style={[styles.flipCard, tap.style, { borderColor: c.softBorder, backgroundColor: flipped ? '#FFFFFF' : c.soft }]}
    >
      {flipped ? (
        <Animated.View entering={FadeIn.duration(180)}>{back}</Animated.View>
      ) : (
        <Animated.View entering={FadeIn.duration(180)}>{front}</Animated.View>
      )}
      <Text style={[styles.flipHint, { color: c.accent }]}>{flipped ? 'Tap to flip back ↻' : 'Tap to flip ↻'}</Text>
    </AnimatedPressable>
  );
}

/** One-item-at-a-time carousel — matches web Practice Recall layout. */
export function OneAtATimeCarousel({
  items,
  tone = 'fuchsia',
}: {
  items: string[];
  tone?: InteractiveTone;
  icon?: string;
}) {
  const c = toneOf(tone);
  const [index, setIndex] = useState(0);
  if (!items.length) return null;
  const item = items[Math.min(index, items.length - 1)];
  return (
    <View style={styles.carouselWrap}>
      <View style={[styles.carouselCard, { borderColor: c.softBorder, backgroundColor: c.soft }]}>
        <Text style={styles.carouselText}>{item}</Text>
      </View>
      <View style={styles.carouselNav}>
        <Pressable
          onPress={() => setIndex((v) => Math.max(0, v - 1))}
          disabled={index === 0}
          style={[styles.carouselBtn, { borderColor: c.softBorder, opacity: index === 0 ? 0.4 : 1 }]}
        >
          <Text style={[styles.carouselBtnLabel, { color: c.accent }]}>← Prev</Text>
        </Pressable>
        <View style={styles.carouselDots}>
          {items.map((_, i) => (
            <Pressable
              key={i}
              onPress={() => setIndex(i)}
              style={[
                styles.carouselDot,
                { width: i === index ? 18 : 8, backgroundColor: i === index ? c.accent : c.softBorder },
              ]}
            />
          ))}
        </View>
        <Pressable
          onPress={() => setIndex((v) => Math.min(items.length - 1, v + 1))}
          disabled={index === items.length - 1}
          style={[
            styles.carouselBtn,
            { borderColor: c.accent, backgroundColor: c.accent, opacity: index === items.length - 1 ? 0.4 : 1 },
          ]}
        >
          <Text style={[styles.carouselBtnLabel, { color: '#fff' }]}>Next →</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  selfCheckWrap: { borderRadius: 14, borderWidth: 1, padding: 12, gap: 10 },
  selfCheckHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  selfCheckPrompt: { flex: 1, fontSize: 12, fontWeight: '700' },
  selfCheckCount: { fontSize: 12, fontWeight: '800' },
  selfCheckList: { gap: 8 },
  selfCheckRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selfCheckText: { flex: 1, fontSize: 14, lineHeight: 20, color: '#1e293b', fontWeight: '500' },
  selfCheckTextDone: { color: '#0f172a', fontWeight: '600' },
  markRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  markText: { flex: 1, fontSize: 14, lineHeight: 20, color: '#1e293b', fontWeight: '500' },
  markTextStrike: { textDecorationLine: 'line-through', color: '#94a3b8' },
  revealCard: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 12 },
  revealPrompt: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  revealLabel: { fontSize: 13, fontWeight: '700' },
  revealText: { fontSize: 14, lineHeight: 21, fontWeight: '600' },
  stepsWrap: { gap: 8 },
  stepsCount: { fontSize: 11, fontWeight: '700', marginBottom: 2 },
  stepRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  stepBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: { fontSize: 11, fontWeight: '800' },
  stepText: { flex: 1, fontSize: 14, lineHeight: 21, color: '#334155', paddingTop: 3 },
  stepTextDone: { color: '#94a3b8', textDecorationLine: 'line-through' },
  revealHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  revealPromptTitle: { flex: 1, fontSize: 15, fontWeight: '800', lineHeight: 21 },
  revealTextAfterTitle: { marginTop: 8 },
  expandText: { fontSize: 15, lineHeight: 22, color: '#334155' },
  expandBtn: { marginTop: 6 },
  expandBtnLabel: { fontSize: 13, fontWeight: '700', color: '#0369a1' },
  flipCard: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 14, minHeight: 88 },
  flipHint: { marginTop: 8, fontSize: 11, fontWeight: '700' },
  carouselWrap: { gap: 10 },
  carouselCard: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 14 },
  carouselText: { fontSize: 15, lineHeight: 22, color: '#1e293b', fontWeight: '500' },
  carouselNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  carouselBtn: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  carouselBtnLabel: { fontSize: 13, fontWeight: '700' },
  carouselDots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  carouselDot: { height: 8, borderRadius: 4 },
});
