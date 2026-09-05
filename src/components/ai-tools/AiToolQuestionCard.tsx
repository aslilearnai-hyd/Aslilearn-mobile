import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  index: number;
  question: string;
  options?: string[];
  answer?: string;
  explanation?: string;
  marks?: number;
  type?: string;
  accent?: string;
};

export default function AiToolQuestionCard({
  index,
  question,
  options = [],
  answer,
  explanation,
  marks,
  type,
  accent = '#059669',
}: Props) {
  const [revealed, setRevealed] = useState(false);
  const isMcq = options.length >= 2;
  const hasReveal = Boolean(String(answer || '').trim() || String(explanation || '').trim());

  return (
    <View style={[styles.card, { borderLeftColor: accent }]}>
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: accent }]}>
          <Text style={styles.badgeText}>Q{index + 1}</Text>
        </View>
        {type ? (
          <View style={styles.typeBadge}>
            <Text style={styles.typeText}>{type}</Text>
          </View>
        ) : isMcq ? (
          <View style={styles.typeBadge}>
            <Text style={styles.typeText}>MCQ</Text>
          </View>
        ) : null}
        {marks != null ? (
          <View style={styles.marksBadge}>
            <Text style={styles.marksText}>
              {marks} mark{marks === 1 ? '' : 's'}
            </Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.question}>{question}</Text>
      {isMcq ? (
        <View style={styles.options}>
          {options.map((opt, i) => {
            const label = opt.match(/^([A-D])\)/i)?.[1]?.toUpperCase() || String.fromCharCode(65 + i);
            const text = opt.replace(/^[A-D]\)\s*/i, '').trim();
            return (
              <View key={`${opt}-${i}`} style={styles.optionRow}>
                <View style={[styles.optionLabel, { backgroundColor: `${accent}22` }]}>
                  <Text style={[styles.optionLabelText, { color: accent }]}>{label}</Text>
                </View>
                <Text style={styles.optionText}>{text}</Text>
              </View>
            );
          })}
        </View>
      ) : null}
      {hasReveal ? (
        <Pressable
          onPress={() => setRevealed((v) => !v)}
          style={[styles.revealBtn, { borderColor: accent }]}
          accessibilityRole="button"
        >
          <Ionicons name={revealed ? 'eye-off-outline' : 'eye-outline'} size={14} color={accent} />
          <Text style={[styles.revealLabel, { color: accent }]}>
            {revealed ? 'Hide answer' : 'Reveal answer'}
          </Text>
        </Pressable>
      ) : null}
      {revealed && (answer || explanation) ? (
        <View style={styles.answerBox}>
          {answer ? (
            <Text style={styles.answerText}>
              <Text style={styles.answerStrong}>Answer: </Text>
              {answer}
            </Text>
          ) : null}
          {explanation ? (
            <Text style={styles.explainText}>
              <Text style={styles.answerStrong}>Explanation: </Text>
              {explanation}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderLeftWidth: 4,
    backgroundColor: '#FFFFFF',
    padding: 12,
    gap: 8,
  },
  header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  badge: {
    minWidth: 28,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  typeBadge: {
    borderRadius: 999,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  typeText: { fontSize: 11, fontWeight: '700', color: '#334155' },
  marksBadge: {
    borderRadius: 999,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  marksText: { fontSize: 11, fontWeight: '700', color: '#92400e' },
  question: { fontSize: 15, lineHeight: 22, fontWeight: '600', color: '#0f172a' },
  options: { gap: 6 },
  optionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  optionLabel: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabelText: { fontSize: 11, fontWeight: '800' },
  optionText: { flex: 1, fontSize: 14, lineHeight: 20, color: '#334155', paddingTop: 2 },
  revealBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  revealLabel: { fontSize: 12, fontWeight: '700' },
  answerBox: {
    borderRadius: 10,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    padding: 10,
    gap: 6,
  },
  answerText: { fontSize: 13, lineHeight: 19, color: '#065f46' },
  explainText: { fontSize: 13, lineHeight: 19, color: '#475569' },
  answerStrong: { fontWeight: '800' },
});
