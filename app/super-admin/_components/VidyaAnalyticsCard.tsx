import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { fetchVidyaSafetyBlocks, fetchVidyaUsageStory } from '../../../src/lib/vidya-admin';

export default function VidyaAnalyticsCard() {
  const [story, setStory] = useState<any>(null);
  const [safety, setSafety] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      fetchVidyaUsageStory(7).catch(() => null),
      fetchVidyaSafetyBlocks(7).catch(() => null),
    ]).then(([storyData, safetyData]) => {
      if (!mounted) return;
      setStory(storyData);
      setSafety(safetyData);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return null;
  if (!story?.success) return null;

  const pct = story.totals?.fromLibraryPct ?? 0;

  return (
    <View style={styles.analyticsCard}>
      <Text style={styles.analyticsTitle}>Vidya AI — Last 7 Days</Text>
      <Text style={styles.analyticsStory}>{story.story}</Text>
      <View style={styles.progressRow}>
        <Text style={styles.progressLabel}>Answered From Your Library</Text>
        <Text style={styles.progressValue}>{pct}%</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.min(100, pct)}%` }]} />
      </View>
      {Array.isArray(story.topUnservedTopics) && story.topUnservedTopics.length > 0 && (
        <View style={styles.gapBlock}>
          <Text style={styles.gapTitle}>Content Gaps (Falling to Gemini):</Text>
          {story.topUnservedTopics.slice(0, 5).map((t: any, i: number) => (
            <Text key={i} style={styles.gapItem}>
              • {t._id?.subject} — Class {t._id?.classLabel} ({t.count} queries)
            </Text>
          ))}
        </View>
      )}
      {safety?.success && safety.totals?.safetyBlocks > 0 && (
        <View style={styles.safetyBox}>
          <Text style={styles.safetyText}>⚠️ {safety.alert}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  analyticsCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  analyticsTitle: { fontSize: 15, fontWeight: '800', color: '#111827', marginBottom: 8 },
  analyticsStory: { fontSize: 13, color: '#374151', lineHeight: 20, marginBottom: 12 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: 12, color: '#6b7280' },
  progressValue: { fontSize: 12, fontWeight: '700', color: '#ea580c' },
  progressTrack: { height: 8, backgroundColor: '#ffedd5', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#f97316', borderRadius: 4 },
  gapBlock: { marginTop: 12 },
  gapTitle: { fontSize: 12, fontWeight: '700', color: '#92400e', marginBottom: 4 },
  gapItem: { fontSize: 11, color: '#78350f', lineHeight: 16 },
  safetyBox: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  safetyText: { fontSize: 12, color: '#991b1b' },
});
