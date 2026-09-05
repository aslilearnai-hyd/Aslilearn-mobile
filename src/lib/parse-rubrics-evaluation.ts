/**
 * Parse Rubrics, Evaluation & Report Card payloads into a 10-section rubric model.
 */

export type RubricCriterionRow = {
  name: string;
  excellent: string;
  good: string;
  satisfactory: string;
  needs_improvement: string;
};

export type NormalizedRubric = {
  title: string;
  assessmentPurpose: string;
  competencyAssessed: string;
  criteriaRows: RubricCriterionRow[];
  gradingCriteria: string;
  strengthsObserved: string;
  areasForImprovement: string;
  teacherRemarks: string;
  actionableSuggestions: string;
  parentFriendlyFeedback: string;
  nextStepRemedialEnrichment: string;
};

export type ResolvedRubric = {
  rubric: NormalizedRubric | null;
  markdownFallback: string | null;
};

function stripOrderedPrefix(line: string): string {
  return String(line || '')
    .replace(/^\s*\d+[\).\s]+/i, '')
    .replace(/^\s*[-*•]\s*/, '')
    .trim();
}

function coalesceText(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') {
    const t = v.trim();
    return t === '[object Object]' ? '' : t;
  }
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) {
    return v.map((x) => coalesceText(x)).filter(Boolean).join('\n');
  }
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    for (const key of [
      'text',
      'content',
      'body',
      'value',
      'purpose',
      'competency',
      'remarks',
      'feedback',
      'suggestions',
    ]) {
      const hit = coalesceText(o[key]);
      if (hit) return hit;
    }
    const title = String(o.title || o.heading || o.name || '').trim();
    const desc = String(o.description || o.details || '').trim();
    if (title && desc) return `${title}\n${desc}`;
    if (title || desc) return title || desc;
    const vals = Object.values(o).map((x) => coalesceText(x)).filter(Boolean);
    return vals.length ? [...new Set(vals)].join('\n') : '';
  }
  const s = String(v).trim();
  return s === '[object Object]' ? '' : s;
}

function toCriteriaRows(value: unknown): RubricCriterionRow[] {
  if (!Array.isArray(value)) return [];
  const out: RubricCriterionRow[] = [];
  for (const raw of value) {
    if (typeof raw === 'string') {
      const name = raw.trim();
      if (!name) continue;
      out.push({ name, excellent: '', good: '', satisfactory: '', needs_improvement: '' });
      continue;
    }
    if (!raw || typeof raw !== 'object') continue;
    const o = raw as Record<string, unknown>;
    const name = coalesceText(o.name || o.criterion || o.skill || o.dimension) || 'Criterion';
    const excellent = coalesceText(o.excellent || o.level_4 || o.level4 || o.Exemplary);
    const good = coalesceText(o.good || o.level_3 || o.level3 || o.Proficient);
    const satisfactory = coalesceText(o.satisfactory || o.level_2 || o.level2 || o.Developing);
    const needs = coalesceText(
      o.needs_improvement || o.needsImprovement || o.level_1 || o.level1 || o.Beginning || o.poor,
    );
    out.push({
      name,
      excellent,
      good,
      satisfactory,
      needs_improvement: needs,
    });
  }
  // de-dupe by name
  const seen = new Set<string>();
  return out.filter((r) => {
    const k = r.name.toLowerCase().trim();
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

const SECTION_HEADING_RE = /^\s*(?:#{1,3}\s*)?(\d{1,2})\.\s*(.+?)\s*$/i;

function splitNumberedSections(text: string): Map<number, string> {
  const map = new Map<number, string>();
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
  let currentNum: number | null = null;
  const buf: string[] = [];

  const flush = () => {
    if (currentNum == null) return;
    const body = buf.join('\n').trim();
    if (body) map.set(currentNum, body);
    buf.length = 0;
  };

  for (const line of lines) {
    const m = line.match(SECTION_HEADING_RE);
    if (m) {
      const num = Number(m[1]);
      if (num >= 1 && num <= 10) {
        flush();
        currentNum = num;
        continue;
      }
    }
    if (currentNum != null) buf.push(line);
  }
  flush();
  return map;
}

function parseCriteriaFromText(body: string): RubricCriterionRow[] {
  const text = String(body || '').replace(/\r\n/g, '\n').trim();
  if (!text) return [];

  // Parse criterion blocks where each criterion is followed by Excellent/Good/Satisfactory/Needs Improvement lines.
  const lines = text.split('\n').map((l) => stripOrderedPrefix(l)).filter(Boolean);
  const rows: RubricCriterionRow[] = [];
  let current: RubricCriterionRow | null = null;
  let seenLevelForCurrent = false;

  const flush = () => {
    if (!current) return;
    if (current.name) rows.push(current);
    current = null;
    seenLevelForCurrent = false;
  };

  for (const line of lines) {
    const levelMatch = line.match(/^(Excellent|Good|Satisfactory|Needs Improvement)\s*:\s*(.+)$/i);
    if (levelMatch) {
      if (!current) current = { name: 'Criterion', excellent: '', good: '', satisfactory: '', needs_improvement: '' };
      const level = levelMatch[1].toLowerCase();
      const val = levelMatch[2].trim();
      if (level === 'excellent') current.excellent = val;
      else if (level === 'good') current.good = val;
      else if (level === 'satisfactory') current.satisfactory = val;
      else current.needs_improvement = val;
      seenLevelForCurrent = true;
      continue;
    }

    // New criterion heading line.
    if (current && seenLevelForCurrent) flush();
    if (!current) {
      current = { name: line, excellent: '', good: '', satisfactory: '', needs_improvement: '' };
      continue;
    }

    // Continuation line for criterion name when levels haven't started yet.
    if (!seenLevelForCurrent) {
      current.name = `${current.name} ${line}`.trim();
    }
  }
  flush();

  if (rows.length) return rows;

  // Fallback: criterion titles only.
  return lines.map((name) => ({ name, excellent: '', good: '', satisfactory: '', needs_improvement: '' }));
}

function normalizeRubric(raw: Record<string, unknown>): NormalizedRubric {
  const title = coalesceText(raw.title || raw.rubric_title || raw.name) || 'Rubric';
  const fromCriteria = toCriteriaRows(raw.criteria);
  const fromRows = toCriteriaRows(raw.criteriaRows);
  const criteriaRows = fromCriteria.length ? fromCriteria : fromRows;

  return {
    title,
    assessmentPurpose: coalesceText(raw.assessment_purpose || raw.purpose || raw.assessmentPurpose),
    competencyAssessed: coalesceText(raw.competency_assessed || raw.learning_outcome_assessed || raw.competencyAssessed),
    criteriaRows,
    gradingCriteria: coalesceText(raw.grading_criteria || raw.gradingScale || raw.gradingCriteria),
    strengthsObserved: coalesceText(raw.strengths_observed || raw.strengths || raw.strengthsObserved),
    areasForImprovement: coalesceText(raw.areas_for_improvement || raw.improvements || raw.areasForImprovement),
    teacherRemarks: coalesceText(raw.teacher_remarks || raw.remarks || raw.teacherRemarks),
    actionableSuggestions: coalesceText(raw.actionable_suggestions || raw.suggestions || raw.actionableSuggestions),
    parentFriendlyFeedback: coalesceText(raw.parent_friendly_feedback || raw.parent_feedback || raw.parentFriendlyFeedback),
    nextStepRemedialEnrichment: coalesceText(raw.next_step_remedial_enrichment || raw.next_steps || raw.nextStepRemedialEnrichment),
  };
}

function mergeRubrics(primary: NormalizedRubric, supplement: NormalizedRubric): NormalizedRubric {
  const pickCriteria = () => {
    const a = primary.criteriaRows.filter((row) =>
      [row.excellent, row.good, row.satisfactory, row.needs_improvement].some((v) => String(v || '').trim()),
    );
    const b = supplement.criteriaRows.filter((row) =>
      [row.excellent, row.good, row.satisfactory, row.needs_improvement].some((v) => String(v || '').trim()),
    );
    if (b.length > a.length) return b;
    if (a.length) return a;
    return supplement.criteriaRows.length ? supplement.criteriaRows : primary.criteriaRows;
  };

  return {
    title: primary.title || supplement.title,
    assessmentPurpose: primary.assessmentPurpose || supplement.assessmentPurpose,
    competencyAssessed: primary.competencyAssessed || supplement.competencyAssessed,
    criteriaRows: pickCriteria(),
    gradingCriteria: primary.gradingCriteria || supplement.gradingCriteria,
    strengthsObserved: primary.strengthsObserved || supplement.strengthsObserved,
    areasForImprovement: primary.areasForImprovement || supplement.areasForImprovement,
    teacherRemarks: primary.teacherRemarks || supplement.teacherRemarks,
    actionableSuggestions: primary.actionableSuggestions || supplement.actionableSuggestions,
    parentFriendlyFeedback: primary.parentFriendlyFeedback || supplement.parentFriendlyFeedback,
    nextStepRemedialEnrichment:
      primary.nextStepRemedialEnrichment || supplement.nextStepRemedialEnrichment,
  };
}

function rubricHasVisibleContent(r: NormalizedRubric): boolean {
  return (
    !!r.assessmentPurpose ||
    !!r.competencyAssessed ||
    r.criteriaRows.length > 0 ||
    !!r.gradingCriteria ||
    !!r.strengthsObserved ||
    !!r.areasForImprovement ||
    !!r.teacherRemarks ||
    !!r.actionableSuggestions ||
    !!r.parentFriendlyFeedback ||
    !!r.nextStepRemedialEnrichment
  );
}

function absorbRawRecords(raw: unknown): Record<string, unknown>[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter((x) => x && typeof x === 'object') as Record<string, unknown>[];
  if (typeof raw !== 'object') return [];
  const o = raw as Record<string, unknown>;
  const meta = o.metadata as Record<string, unknown> | undefined;
  if (meta?.structuredContent && typeof meta.structuredContent === 'object') {
    return absorbRawRecords(meta.structuredContent);
  }
  if (meta?.renderContent && typeof meta.renderContent === 'object') {
    return absorbRawRecords(meta.renderContent);
  }
  if (o.structuredContent && typeof o.structuredContent === 'object') return absorbRawRecords(o.structuredContent);
  if (o.renderContent && typeof o.renderContent === 'object') return absorbRawRecords(o.renderContent);
  if (o.title || o.criteria || o.assessment_purpose || o.grading_criteria) return [o];
  if (o.raw && typeof o.raw === 'object') return absorbRawRecords(o.raw);
  if (o.data && typeof o.data === 'object') return absorbRawRecords(o.data);
  return [];
}

function parseRubricFromMarkdown(text: string): NormalizedRubric | null {
  const body = String(text || '').trim();
  if (!body) return null;

  const sectionMap = splitNumberedSections(body);
  const headingPatterns: Record<number, RegExp> = {
    1: /^assessment purpose$/i,
    2: /^competency\s*\/?\s*learning outcome assessed$/i,
    3: /^evaluation rubric(?: with 4 performance levels)?$/i,
    4: /^grading criteria$/i,
    5: /^strengths observed$/i,
    6: /^areas for improvement$/i,
    7: /^teacher remarks$/i,
    8: /^actionable improvement suggestions$/i,
    9: /^parent[-\s]?friendly feedback$/i,
    10: /^next[-\s]?step remedial\s*\/?\s*enrichment activity$/i,
  };

  const splitByHeadingText = (fullText: string): Map<number, string> => {
    const map = new Map<number, string>();
    const lines = fullText.replace(/\r\n/g, '\n').split('\n');
    let current: number | null = null;
    const buf: string[] = [];

    const flush = () => {
      if (current == null) return;
      const sectionBody = buf.join('\n').trim();
      if (sectionBody) map.set(current, sectionBody);
      buf.length = 0;
    };

    for (const rawLine of lines) {
      const line = stripOrderedPrefix(rawLine);
      let nextSection: number | null = null;
      for (const [numStr, re] of Object.entries(headingPatterns)) {
        if (re.test(line)) {
          nextSection = Number(numStr);
          break;
        }
      }
      if (nextSection != null) {
        flush();
        current = nextSection;
        continue;
      }
      if (current != null) buf.push(rawLine);
    }
    flush();
    return map;
  };

  const finalSectionMap = sectionMap.size ? sectionMap : splitByHeadingText(body);
  if (!finalSectionMap.size) return null;

  const titleFromTop = (() => {
    const h2 = body.match(/^##\s+(.+?)(?:\n|$)/m);
    return h2 ? h2[1].trim() : '';
  })();

  const raw: Record<string, unknown> = {};
  if (titleFromTop) raw.title = titleFromTop;

  const get = (n: number) => finalSectionMap.get(n) || '';
  raw.assessment_purpose = get(1);
  raw.competency_assessed = get(2);
  raw.criteria = parseCriteriaFromText(get(3));
  raw.grading_criteria = get(4);
  raw.strengths_observed = get(5);
  raw.areas_for_improvement = get(6);
  raw.teacher_remarks = get(7);
  raw.actionable_suggestions = get(8);
  raw.parent_friendly_feedback = get(9);
  raw.next_step_remedial_enrichment = get(10);

  const r = normalizeRubric(raw);
  return rubricHasVisibleContent(r) ? r : null;
}

export function resolveRubricFromPayload(content?: string, rawContent?: unknown): ResolvedRubric {
  let formattedText = String(content || '').trim();
  const rawRecords: Record<string, unknown>[] = [];

  try {
    const parsed = JSON.parse(formattedText) as Record<string, unknown>;
    if (parsed.formatted != null) formattedText = String(parsed.formatted).trim();
    if (!formattedText && parsed.markdown) formattedText = String(parsed.markdown).trim();
    rawRecords.push(...absorbRawRecords(parsed.raw));
    if (!rawRecords.length) rawRecords.push(...absorbRawRecords(parsed));
  } catch {
    /* plain */
  }

  rawRecords.push(...absorbRawRecords(rawContent));

  let rubric: NormalizedRubric | null = null;
  if (rawRecords.length) {
    rubric = normalizeRubric(rawRecords[0]);
    if (!rubricHasVisibleContent(rubric)) rubric = null;
  }

  const displayMarkdown =
    formattedText && !formattedText.startsWith('{') ? formattedText : null;

  if (displayMarkdown) {
    const fromMd = parseRubricFromMarkdown(displayMarkdown);
    if (fromMd) {
      if (!rubric || !rubricHasVisibleContent(rubric)) {
        rubric = fromMd;
      } else {
        rubric = mergeRubrics(rubric, fromMd);
      }
    }
  }

  let markdownFallback: string | null = null;
  if (!rubric) markdownFallback = displayMarkdown;

  return { rubric, markdownFallback };
}

