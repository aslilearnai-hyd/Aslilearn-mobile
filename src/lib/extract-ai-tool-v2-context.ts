/**
 * Shared metadata extraction for V2 viewer insight blocks (Bloom, NEP, class context).
 */

export type AiToolV2Context = {
  className: string;
  subject: string;
  topic: string;
  subtopic: string;
  board: string;
  bloomLevel: string;
  duration: string;
  nepNcfFocus: string;
  difficulty: string;
};

function pickString(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const v = record[key];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return '';
}

function collectCandidates(rawContent?: unknown): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  if (!rawContent || typeof rawContent !== 'object' || Array.isArray(rawContent)) return out;
  const root = rawContent as Record<string, unknown>;
  out.push(root);
  const meta = root.metadata;
  if (meta && typeof meta === 'object' && !Array.isArray(meta)) {
    out.push(meta as Record<string, unknown>);
    const extra = (meta as Record<string, unknown>).extraParams;
    if (extra && typeof extra === 'object' && !Array.isArray(extra)) {
      out.push(extra as Record<string, unknown>);
    }
    const structured = (meta as Record<string, unknown>).structuredContent;
    if (structured && typeof structured === 'object' && !Array.isArray(structured)) {
      out.push(structured as Record<string, unknown>);
    }
  }
  if (root.structuredContent && typeof root.structuredContent === 'object') {
    out.push(root.structuredContent as Record<string, unknown>);
  }
  return out;
}

export function extractAiToolV2Context(rawContent?: unknown): AiToolV2Context {
  const candidates = collectCandidates(rawContent);
  const pick = (...keys: string[]) => {
    for (const c of candidates) {
      const v = pickString(c, keys);
      if (v) return v;
    }
    return '';
  };
  return {
    className: pick('classLabel', 'className', 'class_name', 'class_level', 'class', 'gradeLevel'),
    subject: pick('subject', 'subjectName', 'subject_name'),
    topic: pick('topic', 'topicName', 'topic_name', 'chapter', 'chapterName'),
    subtopic: pick('subtopic', 'subTopic', 'subtopicName', 'sub_topic'),
    board: pick('board', 'boardName', 'board_name'),
    bloomLevel: pick('bloomLevel', 'bloom_level', 'bloom', 'bloom_mapping', 'bloomMapping'),
    duration: pick('duration', 'estimated_time', 'estimatedTime', 'time'),
    nepNcfFocus: pick(
      'nepNcfFocus',
      'nep_ncf_focus',
      'ncf_competency_alignment',
      'ncfCompetencyAlignment',
      'competency_mapping',
      'ncf_alignment',
    ),
    difficulty: pick('difficulty', 'difficulty_tag', 'difficultyTag', 'difficulty_level'),
  };
}
