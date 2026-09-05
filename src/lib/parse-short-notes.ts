import {
  contentHasNumberedTemplateSections,
  parseNumberedTemplateSections,
  resolveRichDisplayContent,
} from './ai-tool-display-content';

export type ShortNoteSection = {
  num: number;
  label: string;
  body: string;
};

export type ShortNoteItem = {
  title: string;
  sections: ShortNoteSection[];
  meta?: {
    bloomLevel?: string;
    skillFocus?: string;
    subtopic?: string;
    classLabel?: string;
    subject?: string;
  };
};

/** Legacy AMENITY / hardcoded card format. */
export type LegacyShortNote = {
  concept_name: string;
  summary?: string;
  importance?: string;
  quick_facts?: string[];
};

function pickStr(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return '';
}

function listFrom(obj: Record<string, unknown>, ...keys: string[]): string[] {
  const pull = (v: unknown): string[] => {
    if (v == null) return [];
    if (Array.isArray(v)) {
      return v
        .flatMap((x) => (typeof x === 'string' ? [String(x).trim()] : []))
        .filter(Boolean);
    }
    if (typeof v === 'string' && v.trim()) {
      return v
        .split(/\n+/)
        .map((ln) => ln.replace(/^\s*[-*•]\s*|\s*\d+[\).\s]+/i, '').trim())
        .filter(Boolean);
    }
    return [];
  };
  for (const k of keys) {
    const items = pull(obj[k]);
    if (items.length) return items;
  }
  return [];
}

function isStructuredShortNotesNode(node: unknown): boolean {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return false;
  const o = node as Record<string, unknown>;
  if (o.kind === 'shortNotes') return true;
  return Boolean(
    pickStr(o, 'short_note_summary', 'shortNoteSummary', 'summary', 'exam_summary') ||
      listFrom(o, 'key_points_to_remember', 'keyPointsToRemember', 'key_points', 'keyPoints').length ||
      pickStr(o, 'alignment_block', 'alignmentBlock', 'nep_ncf_focus', 'nepNcfFocus') ||
      pickStr(o, 'example') ||
      pickStr(o, 'common_misconception_correction', 'commonMisconceptionCorrection'),
  );
}

function structuredNodeToItem(node: Record<string, unknown>): ShortNoteItem {
  const title = pickStr(node, 'title', 'concept_name', 'conceptName') || 'Notes';

  const nep = pickStr(node, 'nep_ncf_focus', 'nepNcfFocus', 'nep_ncf');
  const udl = pickStr(node, 'udl_support', 'udlSupport', 'udl');
  let alignment = pickStr(node, 'alignment_block', 'alignmentBlock', 'alignment');
  if (!alignment) {
    alignment = [nep ? `NEP/NCF Focus: ${nep}` : '', udl ? `UDL: ${udl}` : ''].filter(Boolean).join(' ');
  }

  const objectives = listFrom(node, 'learning_objectives', 'learningObjectives', 'objectives');
  const summary = pickStr(node, 'short_note_summary', 'shortNoteSummary', 'summary', 'exam_summary', 'quick_recap');
  const keyPoints = listFrom(
    node,
    'key_points_to_remember',
    'keyPointsToRemember',
    'key_points',
    'keyPoints',
    'takeaways',
    'highlights',
    'key_ideas',
    'keyIdeas',
    'main_points',
    'mainPoints',
    'bullet_points',
    'bulletPoints',
    'revision_points',
    'revisionPoints',
  );
  const example = pickStr(node, 'example', 'worked_example', 'workedExample', 'illustration');
  const misconception = pickStr(
    node,
    'common_misconception_correction',
    'commonMisconceptionCorrection',
    'misconception_correction',
  );
  const quickChecks = listFrom(node, 'quick_check_questions', 'quickCheckQuestions', 'self_check');
  const diffSupport = pickStr(node, 'differentiation_support', 'differentiationSupport');
  const diffExtension = pickStr(node, 'differentiation_extension', 'differentiationExtension');
  const realLife = pickStr(node, 'real_life_application', 'realLifeApplication', 'real_life_link', 'real_life');
  const reflection = pickStr(node, 'reflection_exit_ticket', 'reflectionExitTicket', 'reflection_prompt');

  const derivedKeyPoints =
    keyPoints.length > 0
      ? keyPoints
      : summary
          .split(/[.\n]+/)
          .map((s) => s.replace(/^\s*[-*•]\s*/, '').trim())
          .filter((s) => s.length >= 24)
          .slice(0, 6);

  const sections: ShortNoteSection[] = [];
  const push = (num: number, label: string, body: string) => {
    if (body.trim()) sections.push({ num, label, body: body.trim() });
  };
  const pushList = (num: number, label: string, items: string[]) => {
    if (items.length) push(num, label, items.map((x) => `- ${x}`).join('\n'));
  };

  push(1, 'Alignment Block', alignment);
  pushList(2, 'Learning Objectives', objectives);
  push(3, 'Short Note / Summary', summary);
  pushList(4, 'Key Points to Remember', derivedKeyPoints);
  push(5, 'Example', example);
  push(6, 'Common Misconception and Correction', misconception);
  pushList(7, 'Quick Check Questions', quickChecks);
  const diffParts = [
    diffSupport ? `Support: ${diffSupport}` : '',
    diffExtension ? `Extension: ${diffExtension}` : '',
  ].filter(Boolean);
  push(8, 'Differentiation', diffParts.join('\n'));
  push(9, 'Real-life Application', realLife);
  push(10, 'Reflection / Exit Ticket', reflection);

  return {
    title,
    sections,
    meta: {
      bloomLevel: pickStr(node, 'bloom_level', 'bloomLevel'),
      skillFocus: pickStr(node, 'skill_focus', 'skillFocus', 'skill'),
      subtopic: pickStr(node, 'subtopic', 'subtopic_focus'),
      classLabel: pickStr(node, 'class_label', 'classLabel'),
      subject: pickStr(node, 'subject'),
    },
  };
}

function templateMarkdownToItem(markdown: string): ShortNoteItem | null {
  const { title, sections } = parseNumberedTemplateSections(markdown);
  if (!sections.length) return null;
  return {
    title: title || 'Short Notes',
    sections: sections.map((s) => ({
      num: s.num,
      label: s.title.replace(/^\d+\.\s*/, '').trim() || `Section ${s.num}`,
      body: s.body,
    })),
  };
}

function splitMultiNoteMarkdown(text: string): string[] {
  const trimmed = String(text || '').trim();
  if (!trimmed) return [];
  const parts = trimmed.split(/\n(?=## )/).map((p) => p.trim()).filter(Boolean);
  return parts.length > 1 ? parts : [trimmed];
}

function unwrapRawContent(content: string, rawContent?: unknown): unknown {
  if (rawContent != null) return rawContent;
  const raw = String(content || '').trim();
  if (!raw.startsWith('{')) return null;
  try {
    const parsed = JSON.parse(raw) as { raw?: unknown };
    return parsed.raw ?? null;
  } catch {
    return null;
  }
}

function structuredItemsFromRaw(raw: unknown): ShortNoteItem[] {
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw
      .filter((row) => row && typeof row === 'object')
      .map((row) => structuredNodeToItem(row as Record<string, unknown>))
      .filter((item) => item.sections.length > 0);
  }

  if (typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    if (Array.isArray(o.notes)) {
      const legacy = o.notes as LegacyShortNote[];
      if (legacy.length && !legacy.some((n) => isStructuredShortNotesNode(n))) {
        return [];
      }
    }
    if (isStructuredShortNotesNode(o)) {
      const item = structuredNodeToItem(o);
      return item.sections.length ? [item] : [];
    }
    if (Array.isArray(o.items)) {
      return structuredItemsFromRaw(o.items);
    }
  }

  return [];
}

export function resolveShortNotesFromPayload(
  content: string,
  rawContent?: unknown,
): { mode: 'template'; items: ShortNoteItem[] } | { mode: 'legacy'; notes: LegacyShortNote[] } | null {
  const raw = unwrapRawContent(content, rawContent);
  const structured = structuredItemsFromRaw(raw);
  if (structured.length) {
    return { mode: 'template', items: structured };
  }

  const markdown = resolveRichDisplayContent(content, rawContent);
  if (contentHasNumberedTemplateSections(markdown)) {
    const items = splitMultiNoteMarkdown(markdown)
      .map((chunk) => templateMarkdownToItem(chunk))
      .filter((item): item is ShortNoteItem => Boolean(item && item.sections.length));
    if (items.length) return { mode: 'template', items };
  }

  return null;
}
