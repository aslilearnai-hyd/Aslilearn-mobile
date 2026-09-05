/**
 * Parse Activity & Project Generator markdown (## Activity N + numbered sections) into structured rows.
 */

import { stripAiToolGenerationLabel } from './strip-ai-tool-generation-label';

export type ParsedActivity = {
  sl_no?: number;
  title?: string;
  /** Legacy / alternate title field */
  name?: string;
  subtopic_link_prior_knowledge?: string;
  learning_objectives?: string[];
  /** CamelCase alias from some API payloads */
  learningObjectives?: string[];
  ncf_competency_alignment?: string | string[];
  materials_required?: string[];
  materials?: string[];
  step_by_step_procedure?: string[];
  steps?: string[];
  safety_care_instructions?: string[];
  safety_instructions?: string[];
  observation_data_recording_table?: string;
  observation_table?: string;
  creative_output_final_product?: string;
  creative_output?: string;
  differentiation_support_extension?: string;
  self_assessment_rubric?: string[];
  /** Generic procedure / instruction lines */
  instructions?: string | string[];
  /** Legacy — remapped into template fields on sanitize */
  teacher_instructions?: string[];
  /** CamelCase alias from some API payloads */
  teacherInstructions?: string[];
  student_instructions?: string[];
  /** CamelCase alias from some API payloads */
  studentInstructions?: string[];
  differentiation?: string;
  assessment_criteria_rubric?: string[];
  /** CamelCase alias from some API payloads */
  assessmentRubric?: string[];
  /** Legacy rubric field names */
  assessment?: string | string[];
  evaluation?: string | string[];
  expected_learning_outcomes?: string;
  learning_outcome?: string;
  learning_outcomes?: string | string[];
  expected_outcome?: string;
  real_life_application?: string;
  reflection_exit_ticket?: string;
  reflection?: string;
  period_time_cues?: string;
};

function asStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((x) => String(x ?? '').trim()).filter(Boolean);
  }
  const s = String(value ?? '').trim();
  if (!s) return [];
  return s
    .split(/\n+/)
    .map((line) => line.replace(/^\s*[-*•]\s*|\s*\d+[\).\s]+/i, '').trim())
    .filter(Boolean);
}

/** Remove duplicate lines (backend often sends snake_case + camelCase with the same items). */
export function dedupeStringLines(lines: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    const text = String(line ?? '').trim();
    if (!text) continue;
    const key = text.toLowerCase().replace(/\s+/g, ' ');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}

/** Use the first alias field that has items — do not concatenate duplicate alias arrays. */
function firstMeaningfulList(...sources: unknown[]): string[] {
  for (const src of sources) {
    const list = asStringList(src);
    if (list.length) return list;
  }
  return [];
}

function firstNonEmptyString(...values: unknown[]): string {
  for (const v of values) {
    if (Array.isArray(v)) {
      const joined = asStringList(v).join('\n');
      if (joined.trim()) return joined.trim();
    } else {
      const s = String(v ?? '').trim();
      if (s) return s;
    }
  }
  return '';
}

/** Map API / DB aliases (camelCase, legacy keys) → Project Idea Lab & Activity template fields. */
export function normalizeParsedActivityFields(activity: ParsedActivity): ParsedActivity {
  const src = activity && typeof activity === 'object' ? (activity as Record<string, unknown>) : {};
  const out: ParsedActivity = { ...activity };

  out.subtopic_link_prior_knowledge = firstNonEmptyString(
    out.subtopic_link_prior_knowledge,
    src.subtopicLinkPriorKnowledge,
    src.subtopic_link_prior_knowledge_required,
    src.topic_subtopic_connection,
    src.topic_and_subtopic_connection,
    src.subtopic_link,
    src.study_goal_subtopic_link,
    src.prior_knowledge_required,
    src.prior_knowledge,
    src.subtopic_context,
  );

  const ncfRaw =
    out.ncf_competency_alignment ??
    src.ncfCompetencyAlignment ??
    src.ncf_alignment ??
    src.alignment_block ??
    src.competencies ??
    src.learning_outcomes_ncf;
  if (Array.isArray(ncfRaw)) {
    const ncfItems = dedupeStringLines(ncfRaw.map((x) => String(x).trim()).filter(Boolean));
    if (ncfItems.length) out.ncf_competency_alignment = ncfItems;
  } else {
    const ncfStr = String(ncfRaw ?? '').trim();
    if (ncfStr && !out.ncf_competency_alignment) out.ncf_competency_alignment = ncfStr;
  }

  out.creative_output_final_product = firstNonEmptyString(
    out.creative_output_final_product,
    out.creative_output,
    src.creativeOutputFinalProduct,
    src.creative_output,
    src.final_product,
  );
  if (out.creative_output_final_product) {
    out.creative_output = out.creative_output || out.creative_output_final_product;
  }

  out.expected_learning_outcomes = firstNonEmptyString(
    out.expected_learning_outcomes,
    out.learning_outcome,
    src.expectedLearningOutcomes,
    src.expected_outcome,
    src.learningOutcome,
  );
  if (out.expected_learning_outcomes) {
    out.learning_outcome = out.learning_outcome || out.expected_learning_outcomes;
  }

  out.observation_data_recording_table = firstNonEmptyString(
    out.observation_data_recording_table,
    out.observation_table,
    src.observationDataRecordingTable,
    src.data_recording_table,
  );
  if (out.observation_data_recording_table) {
    out.observation_table = out.observation_table || out.observation_data_recording_table;
  }

  out.differentiation_support_extension = firstNonEmptyString(
    out.differentiation_support_extension,
    out.differentiation,
    src.differentiationSupportExtension,
    src.differentiation_plan,
    src.udl_support,
  );
  if (out.differentiation_support_extension) {
    out.differentiation = out.differentiation || out.differentiation_support_extension;
  }

  const safetyMerged = dedupeStringLines([
    ...asStringList(out.safety_care_instructions),
    ...asStringList(out.safety_instructions),
    ...asStringList(src.safetyCareInstructions),
    ...asStringList(src.care_instructions),
  ]);
  if (safetyMerged.length) out.safety_care_instructions = safetyMerged;

  const selfRubric = dedupeStringLines([
    ...asStringList(out.self_assessment_rubric),
    ...asStringList(out.assessment_criteria_rubric),
    ...asStringList(src.selfAssessmentRubric),
    ...asStringList(src.assessment),
  ]);
  if (selfRubric.length) {
    out.self_assessment_rubric = selfRubric;
    out.assessment_criteria_rubric = selfRubric;
  }

  const lo = dedupeStringLines(
    firstMeaningfulList(out.learning_objectives, out.learningObjectives, src.objectives),
  );
  if (lo.length) {
    out.learning_objectives = lo;
    out.learningObjectives = lo;
  }

  const teacherInstr = dedupeStringLines(
    firstMeaningfulList(out.teacher_instructions, src.teacherInstructions),
  );
  if (teacherInstr.length) {
    out.teacher_instructions = teacherInstr;
    out.teacherInstructions = teacherInstr;
  }

  const studentInstr = dedupeStringLines(
    firstMeaningfulList(out.student_instructions, src.studentInstructions),
  );
  if (studentInstr.length) {
    out.student_instructions = studentInstr;
    out.studentInstructions = studentInstr;
  }

  const assessmentRubric = dedupeStringLines(
    firstMeaningfulList(
      out.assessment_criteria_rubric,
      src.assessmentRubric,
      out.assessment,
      out.evaluation,
    ),
  );
  if (assessmentRubric.length) {
    out.assessment_criteria_rubric = assessmentRubric;
  }

  return out;
}

/** Section number in template → field key */
const SECTION_BY_NUMBER: Record<
  number,
  { key: keyof ParsedActivity; list?: boolean; orderedList?: boolean }
> = {
  2: { key: 'subtopic_link_prior_knowledge' },
  3: { key: 'learning_objectives', list: true },
  4: { key: 'ncf_competency_alignment', list: true },
  5: { key: 'materials_required', list: true },
  6: { key: 'step_by_step_procedure', orderedList: true },
  7: { key: 'safety_care_instructions', list: true },
  8: { key: 'observation_data_recording_table' },
  9: { key: 'creative_output_final_product' },
  10: { key: 'differentiation_support_extension' },
  11: { key: 'self_assessment_rubric', list: true },
  12: { key: 'expected_learning_outcomes' },
  13: { key: 'real_life_application' },
  14: { key: 'reflection_exit_ticket' },
  15: { key: 'period_time_cues' },
};

/** Markdown section headers from Super Admin formatter (`pushSection` uses `### N. Title`) */
const SECTION_HEADING_MD_RE = /^#{1,3}\s+(\d{1,2})\.\s*(.+?)\s*$/i;
const SECTION_HEADING_BOLD_RE = /^\*\*(\d{1,2})\.\s*(.+?)\*\*\s*$/i;

/** Plain `N. Title` only when title matches template (avoids procedure steps `2. …` → section 2) */
const SECTION_PLAIN_RE = /^(\d{1,2})\.\s+(.+?)\s*$/i;
const SECTION_TITLE_HINT: Record<number, RegExp> = {
  2: /subtopic|prior\s+knowledge/i,
  3: /learning\s+objective/i,
  4: /ncf|competency|learning\s+outcome\s+alignment/i,
  5: /materials?\s+required/i,
  6: /step-by-step|student\s+procedure|procedure/i,
  7: /teacher\s+instruction|safety|care\s+instruction/i,
  8: /student\s+instruction|observation|data\s+recording/i,
  9: /differentiation|creative\s+output|final\s+product/i,
  10: /differentiation|support\s+and\s+extension|assessment.*rubric/i,
  11: /self[-\s]?assessment|rubric|expected\s+learning\s+outcome/i,
  12: /expected\s+learning\s+outcome|real[-\s]?life/i,
  13: /real[-\s]?life|reflection|exit\s+ticket|closure/i,
  14: /reflection|exit\s+ticket|closure/i,
  15: /period\s*\/\s*time|time\s+cues?/i,
};

/** Legacy section labels without a leading number. */
function legacyActivitySectionNumFromTitle(title: string): number | null {
  const t = String(title || '').trim();
  if (!t) return null;
  if (/^teacher\s+instruction/i.test(t)) return 7;
  if (/^student\s+instruction/i.test(t)) return 8;
  if (/^assessment\s+(?:criteria\s+)?rubric/i.test(t)) return 10;
  if (/^differentiation/i.test(t)) return 9;
  if (/^step-by-step\s+procedure$/i.test(t)) return 6;
  return null;
}

const MATERIAL_LINE_RE =
  /battery|bulb|switch|connecting\s+wires?|nichrome|compass|chart\s+paper|whiteboard|markers?/i;

function sectionNumFromTitle(title: string): number | null {
  const t = String(title || '').trim();
  if (!t) return null;
  for (const [num, hint] of Object.entries(SECTION_TITLE_HINT)) {
    if (hint.test(t)) return Number(num);
  }
  return null;
}

function mapHeadingToSection(n: number, title: string): number | null {
  const legacy = legacyActivitySectionNumFromTitle(title);
  if (legacy != null) return legacy;
  const byTitle = sectionNumFromTitle(title);
  if (byTitle != null) return byTitle;
  if (n >= 2 && n <= 14) {
    const hint = SECTION_TITLE_HINT[n];
    if (title && hint?.test(title)) return n;
  }
  if (n > 14) return sectionNumFromTitle(title);
  return null;
}

/** Numbered action lines inside procedure — not section headers (e.g. "7. Instruct students…"). */
const PROCEDURE_STEP_LINE_RE =
  /^\d{1,2}[\).\s]+(?:Divide|Provide|Instruct|Guide|Ask|Observe|Have|Allow|Distribute|Demonstrate|Explain|Show|Give|Let|Help|Encourage|Monitor|Circulate|Review|Summarize|Collect|Test|Check|Record|Compare|Discuss|Predict|Identify|Label|Place|Prepare|Set|Use|Work)/i;

function looksLikeProcedureStepLine(line: string): boolean {
  return PROCEDURE_STEP_LINE_RE.test(String(line || '').trim());
}

function templateSectionNumberFromLine(line: string): number | null {
  const trimmed = line.trim();
  if (looksLikeProcedureStepLine(trimmed)) return null;
  if (/^\*\*Period\s*\/\s*time\s*cues?\s*:?\s*\*\*$/i.test(trimmed)) return 15;
  if (/^Period\s*\/\s*time\s*cues?\s*:?\s*$/i.test(trimmed)) return 15;

  let m = trimmed.match(SECTION_HEADING_MD_RE);
  if (m) {
    const mapped = mapHeadingToSection(Number(m[1]), m[2]);
    if (mapped != null) return mapped;
  }
  m = trimmed.match(SECTION_HEADING_BOLD_RE);
  if (m) {
    const mapped = mapHeadingToSection(Number(m[1]), m[2]);
    if (mapped != null) return mapped;
  }
  m = trimmed.match(SECTION_PLAIN_RE);
  if (m) {
    const n = Number(m[1]);
    const hint = SECTION_TITLE_HINT[n];
    if (n >= 2 && n <= 14 && hint?.test(m[2])) return n;
    const legacy = legacyActivitySectionNumFromTitle(m[2]);
    if (legacy != null) return legacy;
    const mapped = mapHeadingToSection(n, m[2]);
    if (mapped != null) return mapped;
  }
  const bare = trimmed.replace(/^#+\s*/, '').trim();
  const bareLegacy = legacyActivitySectionNumFromTitle(bare);
  if (bareLegacy != null) return bareLegacy;
  const bareNum = sectionNumFromTitle(bare);
  if (bareNum != null) return bareNum;
  return null;
}

/** Strip markdown headings, misplaced materials, and period cues from reflection prose. */
export function cleanReflectionProse(body: string): string {
  const lines = String(body || '').split('\n');
  const out: string[] = [];

  for (const line of lines) {
    const t = line.trim();
    if (!t) {
      if (out.length && out[out.length - 1] !== '') out.push('');
      continue;
    }
    if (/^#{1,3}\s+\d+[\.\)]\s+/i.test(t)) continue;
    if (/^\*\*\d+[\.\)]\s*.+\*\*\s*$/i.test(t)) continue;
    if (/^\*\*Period\s*\/\s*time/i.test(t) || /^Period\s*\/\s*time/i.test(t)) break;
    if (/^[-*•]\s/.test(t) && MATERIAL_LINE_RE.test(t)) continue;
    out.push(line);
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function dedupePeriodTimeCues(text: string): string {
  const lines = String(text || '')
    .split('\n')
    .map((l) => l.replace(/^\s*[-*•]\s*/, '').trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    const norm = line
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/\bminutes?\b/g, 'min');
    if (seen.has(norm)) continue;
    seen.add(norm);
    out.push(line);
  }
  return out.join('\n');
}

function extractMisplacedMaterials(text: string): { prose: string; materials: string[] } {
  const materials: string[] = [];
  const kept: string[] = [];
  for (const line of String(text || '').split('\n')) {
    const t = line.trim();
    if (/^[-*•]\s/.test(t) && MATERIAL_LINE_RE.test(t)) {
      materials.push(t.replace(/^\s*[-*•]\s*/, '').trim());
    } else {
      kept.push(line);
    }
  }
  return { prose: kept.join('\n').trim(), materials };
}

export function sanitizeParsedActivity(activity: ParsedActivity): ParsedActivity {
  const out: ParsedActivity = normalizeParsedActivityFields({ ...activity });

  let materials = dedupeStringLines([
    ...asStringList(out.materials_required),
    ...asStringList(out.materials),
  ]);

  if (out.period_time_cues) {
    out.period_time_cues = dedupePeriodTimeCues(String(out.period_time_cues));
  }

  let reflectionRaw = String(out.reflection_exit_ticket || '');
  const splitPeriod = reflectionRaw.split(/\n(?=\*{0,2}\s*Period\s*\/\s*time\s*cues?)/i);
  if (splitPeriod.length > 1) {
    reflectionRaw = splitPeriod[0];
    const cues = splitPeriod.slice(1).join('\n').replace(/^\*{0,2}\s*Period\s*\/\s*time\s*cues?\s*:?\s*\*{0,2}\s*/i, '');
    out.period_time_cues = dedupePeriodTimeCues(
      [out.period_time_cues, cues].filter(Boolean).join('\n'),
    );
  }

  const extracted = extractMisplacedMaterials(reflectionRaw);
  if (!materials.length && extracted.materials.length) {
    materials = extracted.materials;
    out.materials_required = materials;
    out.materials = materials;
  }
  out.reflection_exit_ticket = cleanReflectionProse(extracted.prose);

  const studentSteps = Array.isArray(out.student_instructions)
    ? out.student_instructions.map((x) => String(x).trim()).filter(Boolean)
    : [];
  const procedure = extractProcedureSteps(out);
  if (procedure.length) {
    out.step_by_step_procedure = procedure;
    out.steps = procedure;
  } else if (studentSteps.length) {
    out.step_by_step_procedure = studentSteps;
    out.steps = studentSteps;
  }

  const rubric = dedupeStringLines([
    ...asStringList(out.self_assessment_rubric),
    ...asStringList(out.assessment_criteria_rubric),
    ...asStringList(out.assessment),
  ]);
  if (rubric.length) {
    out.self_assessment_rubric = rubric;
    out.assessment_criteria_rubric = rubric;
  }

  if (!String(out.differentiation_support_extension || '').trim() && out.differentiation) {
    out.differentiation_support_extension = out.differentiation;
  }

  return out;
}

function linesToList(body: string): string[] {
  return body
    .split(/\n+/)
    .map((line) => line.replace(/^\s*[-*•]\s*|\s*\d+[\).\s]+/i, '').trim())
    .filter(Boolean);
}

function linesToOrderedList(body: string): string[] {
  const lines = body.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const steps: string[] = [];
  let buf: string[] = [];

  const flushStep = () => {
    const text = buf.join(' ').trim();
    if (text) steps.push(text.replace(/^\s*\d+[\).\s]+/i, '').trim());
    buf = [];
  };

  for (const line of lines) {
    if (/^\d+[\).\s]+/.test(line)) {
      flushStep();
      buf.push(line.replace(/^\s*\d+[\).\s]+/i, '').trim());
    } else if (buf.length) {
      buf.push(line);
    } else {
      steps.push(line.replace(/^\s*[-*•]\s*/, '').trim());
    }
  }
  flushStep();
  return steps.filter(Boolean);
}

function stripStepLine(line: string): string {
  return String(line || '')
    .replace(/\*\*/g, '')
    .replace(/^\s*\d+[\).\s]+/i, '')
    .replace(/^\s*[-*•]\s*/, '')
    .trim();
}

function isLikelyProcedureStepText(text: string): boolean {
  const t = stripStepLine(text);
  if (!t || t.length < 12) return false;
  if (/^(?:teacher|student)\s+instruction/i.test(t)) return false;
  return (
    looksLikeProcedureStepLine(`1. ${t}`) ||
    /^(?:Divide|Provide|Instruct|Guide|Ask|Observe|Have|Distribute|Demonstrate|Explain|Give|Let|Help|Test|Check|Record|Compare|Discuss|Predict|Identify|Label|Place|Prepare|Set|Use|Work)\b/i.test(
      t,
    )
  );
}

function extractProcedureSteps(activity: ParsedActivity): string[] {
  const blobs: string[] = [];
  const pushBlob = (v: unknown) => {
    if (Array.isArray(v)) blobs.push(v.map((x) => String(x ?? '')).join('\n'));
    else if (typeof v === 'string' && v.trim()) blobs.push(v);
  };

  pushBlob(activity.step_by_step_procedure);
  pushBlob(activity.steps);

  let best: string[] = [];
  for (const src of blobs) {
    const parsed = linesToOrderedList(src).map(stripStepLine).filter(Boolean);
    if (parsed.length > best.length) best = parsed;
  }

  if (best.length <= 1) {
    const teacherLines = Array.isArray(activity.teacher_instructions)
      ? activity.teacher_instructions.map((x) => String(x ?? ''))
      : [];
    const misplaced = teacherLines.map(stripStepLine).filter(isLikelyProcedureStepText);
    if (misplaced.length) {
      const seen = new Set(best.map((s) => s.toLowerCase()));
      for (const line of misplaced) {
        const key = line.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          best.push(line);
        }
      }
    }
  }

  return best;
}

function sectionTitleFromLine(line: string): string {
  const trimmed = line.trim().replace(/^#+\s*/, '');
  let m = trimmed.match(SECTION_HEADING_MD_RE);
  if (m) return m[2].trim();
  m = trimmed.match(SECTION_HEADING_BOLD_RE);
  if (m) return m[2].trim();
  m = trimmed.match(SECTION_PLAIN_RE);
  if (m) return m[2].trim();
  return trimmed;
}

function sectionDefFor(num: number, title: string) {
  const t = String(title || '');
  if (num === 7 && /teacher\s+instruction/i.test(t)) {
    return { key: 'teacher_instructions' as const, list: true };
  }
  if (num === 8 && /student\s+instruction/i.test(t)) {
    return { key: 'student_instructions' as const, list: true, orderedList: true };
  }
  if (num === 9 && /differentiation/i.test(t)) {
    return { key: 'differentiation_support_extension' as const };
  }
  if (num === 10) {
    if (/assessment.*rubric/i.test(t) && !/self[-\s]?assessment/i.test(t)) {
      return { key: 'assessment_criteria_rubric' as const, list: true };
    }
    if (/differentiation/i.test(t)) {
      return { key: 'differentiation_support_extension' as const };
    }
  }
  if ((num === 11 || num === 12) && /expected\s+learning/i.test(t)) {
    return { key: 'expected_learning_outcomes' as const };
  }
  if ((num === 12 || num === 13) && /real[-\s]?life/i.test(t)) {
    return { key: 'real_life_application' as const };
  }
  if ((num === 13 || num === 14) && /reflection|exit\s+ticket/i.test(t)) {
    return { key: 'reflection_exit_ticket' as const };
  }
  return SECTION_BY_NUMBER[num];
}

function assignSectionBody(
  activity: ParsedActivity,
  sectionNum: number,
  body: string,
  sectionTitle = '',
) {
  const def = sectionDefFor(sectionNum, sectionTitle);
  if (!def || !body.trim()) return;

  const trimmedBody = body.replace(/\n{2,}/g, '\n').trim();

  if (def.list) {
    const list = def.orderedList ? linesToOrderedList(trimmedBody) : linesToList(trimmedBody);
    (activity as Record<string, unknown>)[def.key] = list;
    if (def.key === 'materials_required') activity.materials = list;
    if (def.key === 'step_by_step_procedure') activity.steps = list;
    if (def.key === 'ncf_competency_alignment') {
      activity.ncf_competency_alignment =
        list.length === 1 ? list[0] : list.length ? list : trimmedBody;
    }
    return;
  }

  if (def.key === 'reflection_exit_ticket') {
    const prev = String(activity.reflection_exit_ticket || '').trim();
    const next = cleanReflectionProse(trimmedBody);
    activity.reflection_exit_ticket = prev ? cleanReflectionProse(`${prev}\n\n${next}`) : next;
    return;
  }

  if (def.key === 'period_time_cues') {
    const prev = String(activity.period_time_cues || '').trim();
    activity.period_time_cues = dedupePeriodTimeCues(prev ? `${prev}\n${trimmedBody}` : trimmedBody);
    return;
  }

  (activity as Record<string, unknown>)[def.key] = trimmedBody;
}

type ParsedSectionChunk = { body: string; title: string };

/** Split block into section number → body text */
function splitNumberedSections(block: string): Map<number, ParsedSectionChunk> {
  const map = new Map<number, ParsedSectionChunk>();
  const lines = block.split('\n');
  let currentNum: number | null = null;
  let currentTitle = '';
  const buf: string[] = [];

  const flush = () => {
    if (currentNum != null && buf.length) {
      const body = buf.join('\n').trim();
      if (body) map.set(currentNum, { body, title: currentTitle });
    }
    buf.length = 0;
  };

  for (const line of lines) {
    const sectionNum = templateSectionNumberFromLine(line);
    if (sectionNum != null) {
      flush();
      currentNum = sectionNum;
      currentTitle = sectionTitleFromLine(line);
      continue;
    }
    if (currentNum != null) buf.push(line);
  }
  flush();
  return map;
}

function parseActivityBlock(block: string, index: number): ParsedActivity | null {
  const trimmed = block.trim();
  if (!trimmed) return null;

  const titleMatch = trimmed.match(/^##\s*Activity\s*(\d+)\s*:\s*(.+?)(?:\n|$)/im);
  const activityTitleLine = trimmed.match(/^##\s+(.+?)(?:\n|$)/m);
  const sl_no = titleMatch ? Number(titleMatch[1]) : index + 1;
  let title = titleMatch
    ? titleMatch[2].trim()
    : activityTitleLine
      ? activityTitleLine[1].replace(/^Activity\s*\d+\s*:\s*/i, '').trim()
      : '';
  title = stripAiToolGenerationLabel(title, 'Activity');

  const bodyStart = titleMatch
    ? trimmed.slice(titleMatch.index! + titleMatch[0].length)
    : activityTitleLine
      ? trimmed.slice(activityTitleLine.index! + activityTitleLine[0].length)
      : trimmed;

  const activity: ParsedActivity = { sl_no, title };

  const sectionMap = splitNumberedSections(bodyStart);
  for (const [num, chunk] of Array.from(sectionMap.entries())) {
    assignSectionBody(activity, num, chunk.body, chunk.title);
  }

  if (activity.expected_learning_outcomes && !activity.learning_outcome) {
    activity.learning_outcome = activity.expected_learning_outcomes;
  }

  return sanitizeParsedActivity(activity);
}

export function parseActivitiesFromMarkdown(content: string): ParsedActivity[] {
  const text = String(content || '')
    .replace(/\r\n/g, '\n')
    .trim();
  if (!text) return [];

  let blocks = text.split(/(?=^##\s+Activity\s+\d+)/im).filter((b) => b.trim());
  if (blocks.length <= 1 && /^##\s+/im.test(text)) {
    blocks = text.split(/(?=^##\s+)/im).filter((b) => b.trim());
  }

  if (blocks.length >= 1) {
    const parsed = blocks
      .map((b, i) => parseActivityBlock(b, i))
      .filter((a): a is ParsedActivity => !!a);
    if (parsed.length) return parsed;
  }

  if (/^\d+\.\s+/m.test(text) || /^#{1,3}\s*\d+\./m.test(text)) {
    const single = parseActivityBlock(text, 0);
    return single ? [single] : [];
  }

  return [];
}

function hasMeaningfulList(arr?: string[]): boolean {
  return Array.isArray(arr) && arr.some((x) => String(x ?? '').trim());
}

function pickMeaningfulList(...lists: (string[] | undefined)[]): string[] {
  for (const arr of lists) {
    if (hasMeaningfulList(arr)) {
      return (arr as string[]).map((x) => String(x ?? '').trim()).filter(Boolean);
    }
  }
  return [];
}

function pickMeaningfulStr(...values: (string | undefined)[]): string {
  for (const v of values) {
    const s = String(v ?? '').trim();
    if (s) return s;
  }
  return '';
}

function pickMeaningfulNcf(
  a?: string | string[],
  b?: string | string[],
): string | string[] | undefined {
  for (const v of [a, b]) {
    if (Array.isArray(v)) {
      const items = v.map((x) => String(x).trim()).filter(Boolean);
      if (items.length) return items;
    } else {
      const s = String(v ?? '').trim();
      if (s) return s;
    }
  }
  return undefined;
}

function pickList(a?: string[], b?: string[]): string[] {
  return pickMeaningfulList(a, b);
}

function pickStr(a?: string, b?: string): string {
  return pickMeaningfulStr(a, b);
}

function pickReflection(a?: string, b?: string): string {
  const aa = cleanReflectionProse(String(a || ''));
  const bb = cleanReflectionProse(String(b || ''));
  if (!aa) return bb;
  if (!bb) return aa;
  const score = (s: string) => {
    let sc = 0;
    if (/^#{1,3}\s+\d+/m.test(s)) sc -= 20;
    if (MATERIAL_LINE_RE.test(s) && /^[-*•]/m.test(s)) sc -= 15;
    if (s.length > 600) sc -= 5;
    return sc + Math.min(s.length, 350);
  };
  return score(aa) >= score(bb) ? aa : bb;
}

function pickPeriodCues(a?: string, b?: string): string {
  const aa = dedupePeriodTimeCues(String(a || ''));
  const bb = dedupePeriodTimeCues(String(b || ''));
  if (!aa) return bb;
  if (!bb) return aa;
  return aa.length >= bb.length ? aa : bb;
}

/** Merge backend JSON (primary) with markdown (fills gaps only). */
function mergeActivity(backend: ParsedActivity = {}, markdown: ParsedActivity = {}): ParsedActivity {
  const b = normalizeParsedActivityFields(backend);
  const m = normalizeParsedActivityFields(markdown);
  const ncf = pickMeaningfulNcf(b.ncf_competency_alignment, m.ncf_competency_alignment);
  const expected = pickMeaningfulStr(
    b.expected_learning_outcomes,
    b.learning_outcome,
    m.expected_learning_outcomes,
    m.learning_outcome,
  );
  return {
    sl_no: b.sl_no ?? m.sl_no,
    title: pickMeaningfulStr(b.title, m.title),
    subtopic_link_prior_knowledge: pickMeaningfulStr(
      b.subtopic_link_prior_knowledge,
      m.subtopic_link_prior_knowledge,
    ),
    learning_objectives: pickMeaningfulList(b.learning_objectives, m.learning_objectives),
    learningObjectives: pickMeaningfulList(b.learningObjectives, m.learningObjectives),
    ncf_competency_alignment: ncf,
    materials_required: pickMeaningfulList(b.materials_required, m.materials_required),
    materials: pickMeaningfulList(b.materials, m.materials),
    step_by_step_procedure: pickMeaningfulList(b.step_by_step_procedure, m.step_by_step_procedure),
    steps: pickMeaningfulList(b.steps, m.steps),
    safety_care_instructions: pickMeaningfulList(b.safety_care_instructions, m.safety_care_instructions),
    safety_instructions: pickMeaningfulList(b.safety_instructions, m.safety_instructions),
    observation_data_recording_table: pickMeaningfulStr(
      b.observation_data_recording_table,
      b.observation_table,
      m.observation_data_recording_table,
      m.observation_table,
    ),
    observation_table: pickMeaningfulStr(
      b.observation_table,
      b.observation_data_recording_table,
      m.observation_table,
      m.observation_data_recording_table,
    ),
    creative_output_final_product: pickMeaningfulStr(
      b.creative_output_final_product,
      b.creative_output,
      m.creative_output_final_product,
      m.creative_output,
    ),
    creative_output: pickMeaningfulStr(
      b.creative_output,
      b.creative_output_final_product,
      m.creative_output,
      m.creative_output_final_product,
    ),
    differentiation_support_extension: pickMeaningfulStr(
      b.differentiation_support_extension,
      b.differentiation,
      m.differentiation_support_extension,
      m.differentiation,
    ),
    differentiation: pickMeaningfulStr(
      b.differentiation,
      b.differentiation_support_extension,
      m.differentiation,
      m.differentiation_support_extension,
    ),
    self_assessment_rubric: pickMeaningfulList(b.self_assessment_rubric, m.self_assessment_rubric),
    teacher_instructions: pickMeaningfulList(b.teacher_instructions, m.teacher_instructions),
    student_instructions: pickMeaningfulList(b.student_instructions, m.student_instructions),
    assessment_criteria_rubric: pickMeaningfulList(
      b.assessment_criteria_rubric,
      m.assessment_criteria_rubric,
    ),
    expected_learning_outcomes: expected,
    learning_outcome: expected,
    learning_outcomes: b.learning_outcomes ?? m.learning_outcomes,
    real_life_application: pickMeaningfulStr(b.real_life_application, m.real_life_application),
    reflection_exit_ticket: pickReflection(b.reflection_exit_ticket, m.reflection_exit_ticket),
    period_time_cues: pickPeriodCues(b.period_time_cues, m.period_time_cues),
  };
}

function activityMarkdownSource(content?: string): string {
  const raw = String(content || '').trim();
  if (!raw) return '';
  if (!raw.startsWith('{')) return raw;
  try {
    const parsed = JSON.parse(raw) as { formatted?: string; markdown?: string };
    return String(parsed.formatted || parsed.markdown || '').trim();
  } catch {
    return raw;
  }
}

function coalesceActivityLines(v: unknown): string[] {
  if (Array.isArray(v)) {
    return v
      .map((x) =>
        String(x ?? '')
          .replace(/^\s*\d+[\).\s]+/i, '')
          .replace(/^\s*[-*•]\s*/, '')
          .trim(),
      )
      .filter(Boolean);
  }
  if (typeof v === 'string' && v.trim()) {
    return v
      .split(/\n+/)
      .map((line) =>
        line
          .replace(/^\s*\d+[\).\s]+/i, '')
          .replace(/^\s*[-*•]\s*/, '')
          .trim(),
      )
      .filter(Boolean);
  }
  return [];
}

function firstNonEmptyActivityField(...values: unknown[]): string {
  for (const v of values) {
    if (Array.isArray(v)) {
      const joined = v
        .map((x) => String(x ?? '').trim())
        .filter(Boolean)
        .join('\n');
      if (joined.trim()) return joined.trim();
    } else {
      const s = String(v ?? '').trim();
      if (s) return s;
    }
  }
  return '';
}

/** True when every teacher template section (2–13) has visible body content. */
export function teacherActivitySectionsComplete(raw: ParsedActivity): boolean {
  const a = normalizeParsedActivityFields(raw);
  const ncfRaw = a.ncf_competency_alignment;
  const ncf = dedupeStringLines(
    Array.isArray(ncfRaw)
      ? ncfRaw.map((x) => String(x).trim()).filter(Boolean)
      : String(ncfRaw || '')
          .split(/[;\n]+/)
          .map((x) => x.trim())
          .filter(Boolean),
  );
  const procedureSteps = coalesceActivityLines(a.step_by_step_procedure || a.steps || a.instructions);
  const teacherInstructions = coalesceActivityLines(a.teacher_instructions || a.teacherInstructions);
  const studentInstructions = coalesceActivityLines(a.student_instructions || a.studentInstructions);
  const learningObjectives = dedupeStringLines(
    coalesceActivityLines(a.learning_objectives || a.learningObjectives),
  );
  const materials = dedupeStringLines(coalesceActivityLines(a.materials_required || a.materials));
  const assessmentRubric = dedupeStringLines(
    coalesceActivityLines(a.assessment_criteria_rubric || a.assessment || a.evaluation),
  );
  const expectedOutcomes = firstNonEmptyActivityField(
    a.expected_learning_outcomes,
    a.learning_outcome,
    a.learning_outcomes,
    a.expected_outcome,
  );
  const differentiation = String(a.differentiation_support_extension || a.differentiation || '').trim();
  const realLife = String(a.real_life_application || '').trim();
  const reflection = cleanReflectionProse(String(a.reflection_exit_ticket || a.reflection || ''));
  const subtopicLink = firstNonEmptyActivityField(a.subtopic_link_prior_knowledge);

  return (
    !!String(a.title || a.name || '').trim() &&
    !!subtopicLink &&
    learningObjectives.length > 0 &&
    ncf.length > 0 &&
    materials.length > 0 &&
    procedureSteps.length > 0 &&
    teacherInstructions.length > 0 &&
    studentInstructions.length > 0 &&
    !!differentiation &&
    assessmentRubric.length > 0 &&
    !!expectedOutcomes &&
    !!realLife &&
    !!reflection
  );
}

/** True when every student Project Idea Lab section has visible body content. */
export function studentActivitySectionsComplete(raw: ParsedActivity): boolean {
  const a = normalizeParsedActivityFields(raw);
  const learningObjectives = dedupeStringLines(
    coalesceActivityLines(a.learning_objectives || a.learningObjectives),
  );
  const studentSteps = coalesceActivityLines(a.student_instructions || a.studentInstructions);
  const procedureSteps = coalesceActivityLines(a.step_by_step_procedure || a.steps || a.instructions);
  const steps = studentSteps.length ? studentSteps : procedureSteps;
  const subtopicLink = firstNonEmptyActivityField(a.subtopic_link_prior_knowledge);

  return (
    !!String(a.title || a.name || '').trim() &&
    !!subtopicLink &&
    learningObjectives.length > 0 &&
    steps.length > 0
  );
}

export function activitiesPayloadIsComplete(
  activities: ParsedActivity[] | undefined | null,
  content?: string,
  mode: 'teacher' | 'student' = 'teacher',
): boolean {
  const rows = resolveActivitiesFromPayload(activities, content);
  if (!rows.length) return false;
  const check =
    mode === 'student' ? studentActivitySectionsComplete : teacherActivitySectionsComplete;
  return rows.some(check);
}

export function resolveActivitiesFromPayload(
  activities: ParsedActivity[] | undefined | null,
  content?: string,
): ParsedActivity[] {
  const fromArr = Array.isArray(activities)
    ? activities.filter(Boolean).map((row) => normalizeParsedActivityFields(row as ParsedActivity))
    : [];
  const mdSource = activityMarkdownSource(content);
  const fromMd = mdSource ? parseActivitiesFromMarkdown(mdSource) : [];

  const mergeRows = (arr: ParsedActivity[], md: ParsedActivity[]) => {
    const n = Math.max(arr.length, md.length);
    return Array.from({ length: n }, (_, i) =>
      sanitizeParsedActivity(
        mergeActivity(arr[i] ?? arr[arr.length - 1], md[i] ?? md[md.length - 1]),
      ),
    );
  };

  if (fromMd.length && fromArr.length) return mergeRows(fromArr, fromMd);
  if (fromArr.length) return fromArr.map(sanitizeParsedActivity);
  if (fromMd.length) return fromMd.map(sanitizeParsedActivity);

  const raw = String(content || '').trim();
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (parsed?.formatted && typeof parsed.formatted === 'string') {
      return resolveActivitiesFromPayload(activities, parsed.formatted);
    }
    if (parsed?.structuredContent && typeof parsed.structuredContent === 'object') {
      const sc = parsed.structuredContent;
      if (Array.isArray(sc)) {
        return sc.map((row) => sanitizeParsedActivity(normalizeParsedActivityFields(row as ParsedActivity)));
      }
      return [sanitizeParsedActivity(normalizeParsedActivityFields(sc as ParsedActivity))];
    }
    if (Array.isArray(parsed)) {
      return parsed.map((row) => sanitizeParsedActivity(normalizeParsedActivityFields(row as ParsedActivity)));
    }
    if (Array.isArray(parsed?.activities)) {
      return parsed.activities.map((row: ParsedActivity) =>
        sanitizeParsedActivity(normalizeParsedActivityFields(row)),
      );
    }
    if (Array.isArray(parsed?.raw?.activities)) {
      return parsed.raw.activities.map((row: ParsedActivity) =>
        sanitizeParsedActivity(normalizeParsedActivityFields(row)),
      );
    }
    if (parsed && typeof parsed === 'object' && (parsed.title || parsed.steps || parsed.materials)) {
      return [sanitizeParsedActivity(normalizeParsedActivityFields(parsed as ParsedActivity))];
    }
  } catch {
    /* not json */
  }
  return [];
}
