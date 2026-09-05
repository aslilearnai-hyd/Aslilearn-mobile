import { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  exportTeacherToolCsvDownload,
  exportTeacherToolDocument,
  isTeacherDownloadTool,
} from '../../lib/ai-tool-teacher-export';
import { AI, AI_SPACING, AI_TYPE } from '../../theme/ai';
import { GLASS_ROW } from '../../theme/glass';

type Props = {
  toolType: string;
  toolLabel: string;
  content: string;
  rawContent: unknown;
  accent?: string;
};

export default function AiToolDownloadBar({ toolType, toolLabel, content, rawContent, accent = AI.primary }: Props) {
  const [busy, setBusy] = useState<'csv' | 'doc' | null>(null);

  if (!isTeacherDownloadTool(toolType) || !content.trim()) return null;

  const run = async (kind: 'csv' | 'doc', fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(kind);
    try {
      await fn();
    } catch (error) {
      console.error('Teacher tool export failed:', error);
      Alert.alert('Download failed', 'Could not export this content. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Download generated content</Text>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.btn, { borderColor: `${accent}40` }]}
          onPress={() =>
            run('doc', () => exportTeacherToolDocument(toolType, toolLabel, content, rawContent))
          }
          disabled={!!busy}
          accessibilityRole="button"
          accessibilityLabel="Download PDF or print"
          accessibilityState={{ disabled: !!busy, busy: busy === 'doc' }}
        >
          {busy === 'doc' ? (
            <ActivityIndicator size="small" color={accent} />
          ) : (
            <Ionicons name="document-text-outline" size={17} color={accent} />
          )}
          <Text style={[styles.btnText, { color: accent }]}>PDF / Print</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, { borderColor: `${accent}40` }]}
          onPress={() =>
            run('csv', () => exportTeacherToolCsvDownload(toolType, toolLabel, content, rawContent))
          }
          disabled={!!busy}
          accessibilityRole="button"
          accessibilityLabel="Download CSV"
          accessibilityState={{ disabled: !!busy, busy: busy === 'csv' }}
        >
          {busy === 'csv' ? (
            <ActivityIndicator size="small" color={accent} />
          ) : (
            <Ionicons name="grid-outline" size={17} color={accent} />
          )}
          <Text style={[styles.btnText, { color: accent }]}>CSV</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 2,
    padding: AI_SPACING.md,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_ROW.border,
    backgroundColor: GLASS_ROW.fillSoft,
  },
  label: {
    ...AI_TYPE.caption,
    color: AI.textSecondary,
    marginBottom: AI_SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  row: {
    flexDirection: 'row',
    gap: AI_SPACING.sm,
  },
  btn: {
    flex: 1,
    minHeight: 40,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: GLASS_ROW.fillStrong,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 12,
  },
  btnText: {
    ...AI_TYPE.caption,
    fontWeight: '700',
  },
});
