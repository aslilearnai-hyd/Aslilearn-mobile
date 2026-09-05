import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import AiToolWebView from './AiToolWebView';
import { stripStructuredAiToolMetadata } from '../../lib/strip-ai-tool-metadata';
import { coalesceAiToolRawContent } from '../../lib/ai-tool-display-content';
import { STUDENT_AI_TOOLS } from '../../lib/student-ai-tools';

type Props = {
  toolType: string;
  content: string;
  metadata?: Record<string, unknown> | null;
};

const STUDENT_TOOL_IDS = new Set(STUDENT_AI_TOOLS.map((t) => t.id));

function resolveRecordRawContent(
  content: string,
  metadata?: Record<string, unknown> | null,
): unknown {
  const fromMeta = metadata?.structuredContent ?? metadata?.rawData ?? metadata?.raw;
  if (fromMeta != null) return fromMeta;
  return coalesceAiToolRawContent(content, null);
}

/** Super Admin record viewer — same HTML pipeline as Teacher/Student tools. */
export default function AiToolRecordPreview({ toolType, content, metadata }: Props) {
  const cleaned = useMemo(() => stripStructuredAiToolMetadata(String(content || '')), [content]);
  const rawContent = useMemo(
    () => resolveRecordRawContent(cleaned, metadata),
    [cleaned, metadata],
  );
  const variant = STUDENT_TOOL_IDS.has(toolType) ? 'student' : 'teacher';
  const slug = String(toolType || '').trim() || 'smart-study-guide-generator';

  return (
    <View style={styles.wrap} collapsable={false}>
      <AiToolWebView
        toolType={slug}
        content={cleaned}
        rawContent={rawContent}
        variant={variant}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
});
