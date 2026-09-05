import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ChipNav } from '../../../src/components/student';
import { GlassPanel } from '../../../src/components/ui';
import { STUDENT } from '../../../src/theme/student';
import LearningPathsView from './LearningPathsView';
import EduOTTView from './EduOTTView';
import { EduOTTFilterProvider } from '../../../src/contexts/edu-ott-filter-context';

const CHIPS = [
  { id: 'paths', label: 'Learning Paths' },
  { id: 'eduott', label: 'EduOTT' },
  { id: 'prep', label: 'Prep Content' },
  { id: 'iq', label: 'Quiz' },
  { id: 'videos', label: 'Video Lectures' },
  { id: 'tools', label: 'AI Tools' },
];

const TOOLS = [
  { id: 'chapter-summary-creator', name: 'Chapter Summary', icon: 'document-text' as const },
  { id: 'key-points-formula-extractor', name: 'Key Points', icon: 'key' as const },
  { id: 'flashcard-generator', name: 'Flashcards', icon: 'albums' as const },
  { id: 'smart-qa-practice-generator', name: 'Practice Q&A', icon: 'help-circle' as const },
  { id: 'smart-study-guide-generator', name: 'Study Guide', icon: 'book' as const },
  { id: 'exam-question-paper-generator', name: 'Mock Tests', icon: 'clipboard' as const },
  { id: 'concept-breakdown-explainer', name: 'Concept Mastery', icon: 'bulb' as const },
  { id: 'story-passage-creator', name: 'Story Passage', icon: 'newspaper' as const },
];

export default function LearnTabView({ username }: { username: string }) {
  const [chip, setChip] = useState('paths');

  if (chip === 'paths') {
    return (
      <View style={styles.wrap}>
        <ChipNav chips={CHIPS} active={chip} onChange={setChip} />
        <View style={styles.body}>
          <LearningPathsView />
        </View>
      </View>
    );
  }

  if (chip === 'eduott') {
    return (
      <View style={[styles.wrap, styles.full]}>
        <ChipNav chips={CHIPS} active={chip} onChange={setChip} />
        <EduOTTFilterProvider>
          <EduOTTView username={username} />
        </EduOTTFilterProvider>
      </View>
    );
  }

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <ChipNav chips={CHIPS} active={chip} onChange={setChip} />
      {chip === 'prep' && (
        <Pressable onPress={() => router.push('/asli-prep-content')}>
          <GlassPanel radius={16} style={styles.linkCard}>
            <View style={styles.linkCardRow}>
              <Ionicons name="library-outline" size={28} color={STUDENT.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.linkTitle}>ASLI Prep Content</Text>
                <Text style={styles.linkSub}>Notes, PDFs, flashcards & curated materials</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={STUDENT.textMuted} />
            </View>
          </GlassPanel>
        </Pressable>
      )}
      {chip === 'iq' && (
        <Pressable onPress={() => router.push('/iq-rank-boost-subjects')}>
          <GlassPanel radius={16} style={styles.linkCard}>
            <View style={styles.linkCardRow}>
              <Ionicons name="trophy-outline" size={28} color={STUDENT.accent} />
              <View style={{ flex: 1 }}>
                <Text style={styles.linkTitle}>Quiz</Text>
                <Text style={styles.linkSub}>Daily And Weekly Quizzes Assigned To You</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={STUDENT.textMuted} />
            </View>
          </GlassPanel>
        </Pressable>
      )}
      {chip === 'videos' && (
        <Pressable onPress={() => router.push('/video-lectures')}>
          <GlassPanel radius={16} style={styles.linkCard}>
            <View style={styles.linkCardRow}>
              <Ionicons name="videocam-outline" size={28} color={STUDENT.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.linkTitle}>Video Lectures</Text>
                <Text style={styles.linkSub}>Recorded Lessons By Subject</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={STUDENT.textMuted} />
            </View>
          </GlassPanel>
        </Pressable>
      )}
      {chip === 'tools' && (
        <View style={styles.toolsList}>
          {TOOLS.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => {
                requestAnimationFrame(() => {
                  router.push({
                    pathname: `/student/tools/${t.id}` as any,
                    params: { returnTab: 'vidya' },
                  });
                });
              }}
            >
              <GlassPanel radius={14} style={styles.toolRow}>
                <View style={styles.toolRowInner}>
                  <Ionicons name={t.icon} size={22} color={STUDENT.primary} />
                  <Text style={styles.toolName} numberOfLines={1}>
                    {t.name}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color={STUDENT.textMuted} />
                </View>
              </GlassPanel>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  full: { minHeight: 0 },
  body: { flex: 1, marginTop: 8 },
  scroll: { paddingBottom: 24, gap: 10 },
  // Row layout lives on the inner view — GlassPanel wraps its children.
  linkCard: {
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
  },
  linkCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  linkTitle: { fontSize: 16, fontWeight: '800', color: STUDENT.text },
  linkSub: { fontSize: 12, color: STUDENT.textMuted, marginTop: 4 },
  toolsList: {
    gap: 10,
    marginTop: 8,
  },
  toolRow: {
    width: '100%',
    borderRadius: 14,
    padding: 14,
  },
  toolRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  toolName: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    fontWeight: '700',
    color: STUDENT.text,
  },
});
