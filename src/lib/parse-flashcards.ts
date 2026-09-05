import { stripAiToolGenerationLabel } from './strip-ai-tool-generation-label';
import { formatClassroomScienceText } from './exam-text-normalize';
import { sanitizeFlashcardFieldText } from './strip-ai-tool-metadata';

export type FlashcardType = 'question' | 'note' | 'fact';

export type Flashcard = {
  front: string;
  back: string;
  options?: string[];
  type?: FlashcardType;
  cardCategory?: string;
  difficultyTag?: string;
  memoryHookQuickTip?: string;
  memoryCue?: string;
  skillFocus?: string;
  exampleUse?: string;
  peerPrompt?: string;
  selfCheckRound?: string;
  reflection?: string;
};

export type StudentDeckMeta = {
  title: string;
  subtopicLinkPriorKnowledge: string;
  learningObjectives: string[];
  ncfAlignment: string;
  selfCheckRound: string;
  commonMistakesToAvoid: string[];
  expectedLearningOutcomes: string[];
  realLifeApplication: string;
  reflectionExitTicket: string;
};

export type TeacherDeckMeta = {
  title: string;
  topic: string;
  subtopic: string;
  topicAndSubtopicLink: string;
  classLevel: string;
  difficultyLevel: string;
  bloomLevel: string;
  priorKnowledgeRequired: string;
  learningObjectives: string[];
  ncfCompetencyAlignment: string;
  deckMemoryHook: string;
  selfCheckRapidRecallRound: string;
  commonMistakesToAvoid: string[];
  differentiationSupport: string;
  realLifeConnection: string;
  reflectionExitTicket: string;
};

const BLOOM_FALLBACK_LEVELS = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'];

function stripMdBold(s: string): string {
  return sanitizeFlashcardFieldText(s.replace(/\*\*/g, '').trim());
}

function toStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v ?? '').trim()).filter(Boolean);
  const s = String(value ?? '').trim();
  if (!s) return [];
  return s
    .split(/\n|;/)
    .map((v) => v.trim())
    .filter(Boolean);
}

const TEMPLATE_FIELD_LABELS = [
  'Difficulty Tag for Each Card',
  'Difficulty Tag',
  'Memory Hook / Quick Tip',
  'Memory Hook',
  'Self-Check Round',
  'Memory Cue',
  'Skill Focus',
  'Example Use',
  'Peer Prompt',
  'Reflection',
] as const;

function pickLabeledField(block: string, label: string): string {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const stopLabels = ['Front', 'Back', 'Task', 'Solution', ...TEMPLATE_FIELD_LABELS]
    .filter((l) => l.toLowerCase() !== label.toLowerCase())
    .map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');
  const re = new RegExp(
    `\\*\\*${escaped}:?\\*\\*\\s*([\\s\\S]*?)(?=\\n\\s*\\*\\*(?:${stopLabels}):|\\n+---|\\n+##|$)`,
    'i'
  );
  const m = block.match(re);
  return m ? stripMdBold(m[1].trim()) : '';
}

function pickFirstLabeledField(block: string, labels: string[]): string {
  for (const label of labels) {
    const v = pickLabeledField(block, label);
    if (v) return v;
  }
  return '';
}

function parseSevenFieldTemplateBlock(block: string): Flashcard | null {
  const hasFace =
    /\*\*(?:Front|Task):\*\*/i.test(block) ||
    /###\s*(?:Front|Task):/i.test(block) ||
    /\bTask:/i.test(block);
  if (!hasFace) return null;

  let front = '';
  let back = '';

  const taskBold = block.match(/\*\*Task:\*\*\s*([\s\S]*?)(?=\n\s*\*\*Solution:\*\*)/i);
  const solutionBold = block.match(
    /\*\*Solution:\*\*\s*([\s\S]*?)(?=\n\s*\*\*(?:Difficulty|Memory Hook|Memory Cue|Self-Check|Front|Back|Task)[^*]*:\*|\n+---|\n+#{1,6}\s*(?:\d+[.)]?\s*)?(?:Study Aids|Card|Flashcard|Wrap)|$)/i
  );
  if (taskBold && solutionBold) {
    front = stripMdBold(taskBold[1].trim());
    back = stripMdBold(solutionBold[1].trim());
  }

  const frontBold = block.match(/\*\*Front:\*\*\s*([\s\S]*?)(?=\n\s*\*\*Back:\*\*)/i);
  const backBold = block.match(
    /\*\*Back:\*\*\s*([\s\S]*?)(?=\n\s*\*\*(?:Difficulty Tag|Memory Hook|Memory Cue|Self-Check Round|Skill Focus|Example Use|Peer Prompt|Reflection|Task|Solution)[^*]*:\*|\n+---|\n+##\s*(?:Card|Flashcard)|$)/i
  );
  if (!front && frontBold && backBold) {
    front = stripMdBold(frontBold[1].trim());
    back = stripMdBold(backBold[1].trim());
  } else if (!front) {
    const frontH = block.match(/###\s*Front:\s*\n+([\s\S]*?)(?=\n+\s*###\s*Back:)/i);
    const backH = block.match(
      /###\s*Back:\s*\n+([\s\S]*?)(?=\n+\*\*(?:Memory Cue|Skill Focus)|\n+---|\n+##|$)/i
    );
    if (frontH && backH) {
      front = stripMdBold(frontH[1].trim());
      back = stripMdBold(backH[1].trim());
    }
  }

  if (!front || !back) return null;

  const difficultyTag = pickFirstLabeledField(block, [
    'Difficulty Tag for Each Card',
    'Difficulty Tag',
    'Skill Focus',
  ]);
  const memoryHookQuickTip = pickFirstLabeledField(block, [
    'Memory Hook / Quick Tip',
    'Memory Hook',
    'Memory Cue',
  ]);
  const selfCheckRound = pickFirstLabeledField(block, ['Self-Check Round', 'Peer Prompt', 'Reflection']);

  return {
    front,
    back,
    difficultyTag,
    memoryHookQuickTip,
    memoryCue: memoryHookQuickTip || pickLabeledField(block, 'Memory Cue'),
    skillFocus: pickLabeledField(block, 'Skill Focus'),
    selfCheckRound,
    exampleUse: pickLabeledField(block, 'Example Use'),
    peerPrompt: pickLabeledField(block, 'Peer Prompt'),
    reflection: pickLabeledField(block, 'Reflection'),
    type: 'question',
  };
}

function parseSevenFieldDeckMarkdown(text: string): Flashcard[] {
  const cards: Flashcard[] = [];
  for (const chunk of text.split(/\n---\n+/).map((c) => c.trim()).filter(Boolean)) {
    const card = parseSevenFieldTemplateBlock(chunk);
    if (card) cards.push(card);
  }
  if (cards.length) return cards;

  for (const chunk of text.split(/(?=\n?##\s*Card\s+\d+)/i).map((c) => c.trim()).filter(Boolean)) {
    const card = parseSevenFieldTemplateBlock(chunk);
    if (card) cards.push(card);
  }
  if (cards.length) return cards;

  for (const chunk of text.split(/(?=\*\*Front:\*\*)/i).map((c) => c.trim()).filter(Boolean)) {
    const card = parseSevenFieldTemplateBlock(chunk);
    if (card) cards.push(card);
  }
  return cards;
}

function collectCardsFromRaw(raw: Record<string, unknown>): Record<string, unknown>[] {
  const lists = [
    raw.application_hots_cards,
    raw.application_cards,
    raw.cards,
    raw.flashcard_set,
    raw.flashcards,
    raw.concept_and_definition_cards,
    raw.formula_rule_cards,
    raw.formula_cards,
    raw.visual_diagram_suggestion_cards,
    raw.visual_cards,
  ];
  const out: Record<string, unknown>[] = [];
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const item of list as Record<string, unknown>[]) {
      if (item && typeof item === 'object') out.push(item);
    }
  }
  return out;
}

function cardFromLooseObject(item: Record<string, unknown>): Flashcard | null {
  const front =
    (item.front as string) ||
    (item.task as string) ||
    (item.question as string) ||
    (item.term as string) ||
    (item.title as string);
  const back =
    (item.back as string) ||
    (item.solution as string) ||
    (item.correct_answer as string) ||
    (item.answer as string) ||
    (item.content as string) ||
    (item.explanation as string);
  if (!front || !back) return null;

  const typeRaw = (item.type as string) || 'question';
  const type: FlashcardType =
    typeRaw === 'note' || typeRaw === 'fact' || typeRaw === 'question' ? typeRaw : 'question';

  return {
    front: formatClassroomScienceText(stripMdBold(String(front))),
    back: formatClassroomScienceText(stripMdBold(String(back))),
    type,
    cardCategory: String(item.card_category || item.cardCategory || '').trim().toLowerCase() || undefined,
    difficultyTag: stripMdBold(
      String(
        item.difficulty_tag_for_each_card ||
          item.difficulty_tag ||
          item.difficultyTag ||
          item.skill_focus ||
          ''
      )
    ),
    memoryHookQuickTip: stripMdBold(
      String(item.memory_hook_quick_tip || item.memory_hook || item.memory_cue || item.hint || '')
    ),
    memoryCue: stripMdBold(String(item.memory_cue || item.memoryCue || item.hint || '')),
    skillFocus: stripMdBold(String(item.skill_focus || item.skillFocus || item.bloom_level || '')),
    exampleUse: stripMdBold(String(item.example_use || item.exampleUse || item.real_life_link || '')),
    peerPrompt: stripMdBold(String(item.peer_prompt || item.peerPrompt || '')),
    selfCheckRound: stripMdBold(
      String(item.self_check_round || item.selfCheckRound || item.peer_prompt || '')
    ),
    reflection: stripMdBold(String(item.reflection || item.reflection_prompt || item.self_check || '')),
  };
}

function tryParseSingleJsonFlashcardEnvelope(content: string): Flashcard[] | null {
  const text = content.trim();
  if (!text.startsWith('{') && !text.startsWith('[')) return null;
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    if (parsed.formatted && typeof parsed.formatted === 'string') {
      const fromFormatted = parseSevenFieldDeckMarkdown(parsed.formatted);
      if (fromFormatted.length) return fromFormatted;
      const nested = tryParseJsonFlashcards(parsed.formatted);
      if (nested?.length) return nested;
    }
    const raw = parsed.raw as Record<string, unknown> | undefined;
    if (raw) {
      const merged = collectCardsFromRaw(raw);
      if (merged.length) {
        const out: Flashcard[] = [];
        for (const item of merged) {
          const c = cardFromLooseObject(item);
          if (c) out.push(c);
        }
        if (out.length) return out;
      }
    }
    if (Array.isArray(parsed.cards)) {
      const out: Flashcard[] = [];
      for (const item of parsed.cards as Record<string, unknown>[]) {
        const c = cardFromLooseObject(item);
        if (c) out.push(c);
      }
      return out.length ? out : null;
    }
    if (Array.isArray(parsed.flashcards)) {
      const out: Flashcard[] = [];
      for (const item of parsed.flashcards as Record<string, unknown>[]) {
        const c = cardFromLooseObject(item);
        if (c) out.push(c);
      }
      return out.length ? out : null;
    }
  } catch {
    return null;
  }
  return null;
}

function tryParseJsonFlashcards(content: string): Flashcard[] | null {
  return tryParseSingleJsonFlashcardEnvelope(content);
}

function parseTaskSolutionPairs(content: string): Flashcard[] {
  const cards: Flashcard[] = [];
  for (const chunk of content.split(/(?=\*\*Card\s*\d+\*\*)/i).map((c) => c.trim()).filter(Boolean)) {
    const card = parseSevenFieldTemplateBlock(chunk);
    if (card) cards.push(card);
  }
  if (cards.length) return cards;

  const re =
    /\*\*Task:\*\*\s*([\s\S]*?)\n+\*\*Solution:\*\*\s*([\s\S]*?)(?=\n+\*\*Task:|\n+---|\n#{1,6}\s*[345]\.|\n#{1,6}\s*Study Aids|\n+\*\*Card\s*\d+|\n+##\s*(?:Card|Flashcard|Study)|$)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    const front = stripMdBold(m[1].trim());
    const back = stripMdBold(m[2].trim());
    if (front && back) cards.push({ front, back, type: 'question' });
  }
  return cards;
}

function parseQuestionAnswerPairs(content: string): Flashcard[] {
  const cards: Flashcard[] = [];
  const re =
    /\*\*Question:\*\*\s*\n*([\s\S]*?)\n+\*\*Answer:\*\*\s*\n*([\s\S]*?)(?=\n\n\*\*Question:|\n\n##|\n##\s*(?:Flashcard|Card)|$)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    const front = stripMdBold(m[1]);
    const back = stripMdBold(m[2]);
    if (front && back) cards.push({ front, back, type: 'question' });
  }
  return cards;
}

function parseCardNumberFrontBackTemplate(text: string): Flashcard[] {
  const t = text.trim();
  if (!/\bCard\s*\d+\b/i.test(t) || !/Front:/i.test(t) || !/Back:/i.test(t)) return [];

  const cards: Flashcard[] = [];
  for (const chunk of t.split(/(?=\bCard\s*\d+\b)/i).map((c) => c.trim()).filter(Boolean)) {
    if (!/^Card\s*\d+/i.test(chunk)) continue;
    const afterCard = chunk.replace(/^Card\s*\d+\s*/i, '').trim();
    const fb = afterCard.match(/Front:\s*([\s\S]*?)\s*Back:\s*([\s\S]*)$/i);
    if (fb) {
      const front = stripMdBold(fb[1].trim());
      const back = stripMdBold(fb[2].trim());
      if (front && back) cards.push({ front, back, type: 'question' });
    }
  }
  return cards;
}

function parseOneStructuredSection(section: string): Flashcard | null {
  if (!section.trim()) return null;
  const typeMatch = section.match(/\*\*Type:\*\*\s*(question|note|fact)/i);
  const cardType = typeMatch ? (typeMatch[1].toLowerCase() as FlashcardType) : 'question';
  const frontMatch = section.match(/###\s*Front:\s*\n+([\s\S]*?)(?=\n+\s*###\s*Back:)/i);
  const backMatch = section.match(
    /###\s*Back:\s*\n+(?:\*\*Answer:\*\*\s*\n*)?([\s\S]*?)(?=\n+---|\n+##\s*(?:Flashcard|Card)\s*\d|\n*$)/i
  );
  const front = frontMatch ? stripMdBold(frontMatch[1].trim()) : '';
  const back = backMatch ? stripMdBold(backMatch[1].trim()) : '';
  if (front && back) return { front, back, type: cardType };
  return null;
}

export function parseFlashcards(content: string): Flashcard[] {
  const jsonCards = tryParseJsonFlashcards(content);
  if (jsonCards?.length) return jsonCards;

  let text = content;
  try {
    const p = JSON.parse(content) as { formatted?: string };
    if (p?.formatted && typeof p.formatted === 'string') text = p.formatted;
  } catch {
    /* use content */
  }

  const cards: Flashcard[] = [];
  let sections = text.split(/##\s*Flashcard\s*\d+/gi);
  if (sections.length <= 1) sections = text.split(/##\s*Card\s*\d+/gi);

  for (let i = 1; i < sections.length; i++) {
    const card = parseSevenFieldTemplateBlock(sections[i]) || parseOneStructuredSection(sections[i]);
    if (card) cards.push(card);
  }
  if (cards.length) return cards;

  const sevenField = parseSevenFieldDeckMarkdown(text);
  if (sevenField.length) return sevenField;

  const taskSolution = parseTaskSolutionPairs(text);
  if (taskSolution.length) return taskSolution;

  const templateCards = parseCardNumberFrontBackTemplate(text);
  if (templateCards.length) return templateCards;

  const qa = parseQuestionAnswerPairs(text);
  if (qa.length) return qa;

  return cards;
}

export function enrichStudyDeckCards(cards: Flashcard[], rawContent?: unknown): Flashcard[] {
  const raw =
    rawContent && typeof rawContent === 'object' && !Array.isArray(rawContent)
      ? (rawContent as Record<string, unknown>)
      : null;
  const rawList = raw
    ? ((Array.isArray(raw.cards)
        ? raw.cards
        : Array.isArray(raw.flashcards)
          ? raw.flashcards
          : []) as Record<string, unknown>[])
    : [];

  const enriched = cards.map((card, i) => {
    const r = rawList[i];
    const difficultyFromRaw = r
      ? String(
          r.difficulty_tag_for_each_card ||
            r.difficulty_tag ||
            r.difficultyTagForEachCard ||
            r.skill_focus ||
            ''
        ).trim()
      : '';
    const memoryFromRaw = r
      ? String(r.memory_hook_quick_tip || r.memory_cue || r.memoryCue || '').trim()
      : '';
    const selfCheckFromRaw = r
      ? String(r.self_check_round || r.selfCheckRound || r.peer_prompt || '').trim()
      : '';

    const difficultyTag =
      card.difficultyTag ||
      card.skillFocus ||
      difficultyFromRaw ||
      BLOOM_FALLBACK_LEVELS[i % BLOOM_FALLBACK_LEVELS.length];

    const memoryHookQuickTip =
      card.memoryHookQuickTip ||
      card.memoryCue ||
      memoryFromRaw ||
      (card.back ? `Remember: ${card.back.split(/[.!?]/)[0]?.trim().slice(0, 120)}` : '');

    const selfCheckRound =
      card.selfCheckRound ||
      card.peerPrompt ||
      selfCheckFromRaw ||
      (card.front ? `Without looking, explain: ${card.front}` : '');

    return {
      ...card,
      front: formatClassroomScienceText(sanitizeFlashcardFieldText(card.front)),
      back: formatClassroomScienceText(sanitizeFlashcardFieldText(card.back)),
      difficultyTag: formatClassroomScienceText(sanitizeFlashcardFieldText(difficultyTag)),
      memoryHookQuickTip: formatClassroomScienceText(sanitizeFlashcardFieldText(memoryHookQuickTip)),
      memoryCue: formatClassroomScienceText(sanitizeFlashcardFieldText(memoryHookQuickTip)),
      selfCheckRound: formatClassroomScienceText(sanitizeFlashcardFieldText(selfCheckRound)),
    };
  });

  return dedupeFlashcardsByFront(enriched);
}

/** Drop near-duplicate fronts so decks don't repeat the same task. */
export function dedupeFlashcardsByFront(cards: Flashcard[]): Flashcard[] {
  const seen = new Set<string>();
  const out: Flashcard[] = [];
  for (const card of cards) {
    const key = String(card.front || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 240);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(card);
  }
  return out;
}

function pickText(sources: Record<string, unknown>[], ...keys: string[]): string {
  for (const src of sources) {
    for (const k of keys) {
      const v = src[k];
      if (v != null && String(v).trim()) return String(v).trim();
    }
  }
  return '';
}

function pickList(sources: Record<string, unknown>[], ...keys: string[]): string[] {
  for (const src of sources) {
    for (const k of keys) {
      const rows = toStringList(src[k]);
      if (rows.length) return rows;
    }
  }
  return [];
}

function parseDeckMetaFromFormatted(text: string): Partial<StudentDeckMeta> {
  const body = String(text || '').trim();
  if (!body) return {};

  const pickBlock = (labelPattern: string): string => {
    const re = new RegExp(
      `\\*\\*${labelPattern}:?\\*\\*\\s*([\\s\\S]*?)(?=\\n\\n\\*\\*|\\n\\*\\*Flashcard Set|\\n##\\s*Card|$)`,
      'i'
    );
    const m = body.match(re);
    return m ? m[1].trim() : '';
  };

  const objectivesBlock = pickBlock('Learning Objectives[^*]*');
  const mistakesBlock = pickBlock('Common Mistakes to Avoid');
  const outcomesBlock = pickBlock('Expected Learning Outcomes');
  const listFromBlock = (block: string) =>
    block
      .split(/\n+/)
      .map((l) => l.replace(/^\s*[-*•]\s*/, '').trim())
      .filter(Boolean);

  return {
    title: stripAiToolGenerationLabel(pickBlock('Deck Title').replace(/^#+\s*/, ''), 'Study Deck') || undefined,
    subtopicLinkPriorKnowledge: pickBlock('Subtopic Link and Prior Knowledge Required') || undefined,
    learningObjectives: objectivesBlock ? listFromBlock(objectivesBlock) : undefined,
    ncfAlignment: pickBlock('NCF Competency[^*]*') || undefined,
    commonMistakesToAvoid: mistakesBlock ? listFromBlock(mistakesBlock) : undefined,
    expectedLearningOutcomes: outcomesBlock ? listFromBlock(outcomesBlock) : undefined,
    realLifeApplication: pickBlock('Real-life Application') || undefined,
    reflectionExitTicket: pickBlock('Reflection[^*]*') || undefined,
  };
}

export function resolveStudentDeckMeta(content: string, rawContent?: unknown): StudentDeckMeta {
  const sources: Record<string, unknown>[] = [];
  if (rawContent && typeof rawContent === 'object' && !Array.isArray(rawContent)) {
    sources.push(rawContent as Record<string, unknown>);
  }
  const trimmed = String(content || '').trim();
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      if (parsed.raw && typeof parsed.raw === 'object') {
        sources.push(parsed.raw as Record<string, unknown>);
      }
      sources.push(parsed);
    } catch {
      /* plain text */
    }
  }

  const fromFormatted = parseDeckMetaFromFormatted(content);

  const title = stripAiToolGenerationLabel(
    pickText(sources, 'deck_title', 'deckTitle', 'title', 'studyScheduleTitle') ||
      fromFormatted.title ||
      'My Study Deck',
    'My Study Deck',
  );

  const learningObjectives =
    pickList(sources, 'learningObjectives', 'learning_objectives', 'objectives').length > 0
      ? pickList(sources, 'learningObjectives', 'learning_objectives', 'objectives')
      : fromFormatted.learningObjectives || [];

  const commonMistakesToAvoid =
    pickList(sources, 'commonMistakesToAvoid', 'common_mistakes_to_avoid', 'common_mistakes').length > 0
      ? pickList(sources, 'commonMistakesToAvoid', 'common_mistakes_to_avoid', 'common_mistakes')
      : fromFormatted.commonMistakesToAvoid || [];

  const expectedLearningOutcomes =
    pickList(sources, 'expectedLearningOutcomes', 'expected_learning_outcomes').length > 0
      ? pickList(sources, 'expectedLearningOutcomes', 'expected_learning_outcomes')
      : fromFormatted.expectedLearningOutcomes || [];

  return {
    title,
    subtopicLinkPriorKnowledge:
      pickText(
        sources,
        'subtopicLinkPriorKnowledgeRequired',
        'subtopic_link_prior_knowledge_required',
        'prior_knowledge_required',
        'subtopic_link'
      ) || fromFormatted.subtopicLinkPriorKnowledge || '',
    learningObjectives,
    ncfAlignment:
      pickText(
        sources,
        'ncfCompetencyAlignment',
        'ncf_competency_alignment',
        'learning_outcome_alignment'
      ) || fromFormatted.ncfAlignment || '',
    selfCheckRound: pickText(
      sources,
      'selfCheckRound',
      'self_check_round',
      'self_check_rapid_recall_round',
      'peer_prompt'
    ),
    commonMistakesToAvoid,
    expectedLearningOutcomes,
    realLifeApplication:
      pickText(
        sources,
        'realLifeApplication',
        'real_life_application',
        'example_use',
        'real_life_link'
      ) || fromFormatted.realLifeApplication || '',
    reflectionExitTicket:
      pickText(
        sources,
        'reflectionExitTicket',
        'reflection_exit_ticket',
        'reflection',
        'reflection_prompt'
      ) || fromFormatted.reflectionExitTicket || '',
  };
}

function rawRecordFromContent(content: string, rawContent?: unknown): Record<string, unknown> | null {
  if (rawContent && typeof rawContent === 'object' && !Array.isArray(rawContent)) {
    return rawContent as Record<string, unknown>;
  }
  const trimmed = String(content || '').trim();
  if (!trimmed.startsWith('{')) return null;
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    return (parsed.raw as Record<string, unknown> | undefined) || parsed;
  } catch {
    return null;
  }
}

export function resolveTeacherDeckMeta(content: string, rawContent?: unknown): TeacherDeckMeta | null {
  const raw = rawRecordFromContent(content, rawContent);
  if (!raw) return null;
  const title = String(raw.flashcard_deck_title || raw.deck_title || raw.title || '').trim();
  const topic = String(raw.topic || '').trim();
  const subtopic = String(raw.subtopic || raw.sub_topic || '').trim();
  const topicLink = String(raw.topic_and_subtopic_link || raw.subtopic_link || '').trim();
  if (!title && !topic && !subtopic && !topicLink) return null;

  return {
    title: stripAiToolGenerationLabel(title, 'Flashcard deck'),
    topic,
    subtopic,
    topicAndSubtopicLink: topicLink,
    classLevel: String(raw.class_level || raw.classLabel || raw.class || '').trim(),
    difficultyLevel: String(raw.difficulty_level || raw.difficulty || 'Medium').trim(),
    bloomLevel: String(raw.bloom_level || raw.bloom || 'Apply / Analyze').trim(),
    priorKnowledgeRequired: String(raw.prior_knowledge_required || '').trim(),
    learningObjectives: toStringList(raw.learning_objectives || raw.objectives),
    ncfCompetencyAlignment: String(
      raw.ncf_competency_alignment || raw.learning_outcome_alignment || ''
    ).trim(),
    deckMemoryHook: String(
      raw.deck_memory_hook || raw.memory_hook_quick_tip || raw.memory_cue || ''
    ).trim(),
    selfCheckRapidRecallRound: String(
      raw.self_check_rapid_recall_round || raw.self_check_round || ''
    ).trim(),
    commonMistakesToAvoid: toStringList(raw.common_mistakes_to_avoid),
    differentiationSupport: String(raw.differentiation_support || '').trim(),
    realLifeConnection: String(raw.real_life_connection || raw.real_life_application || '').trim(),
    reflectionExitTicket: String(raw.reflection_exit_ticket || raw.reflection || '').trim(),
  };
}

export function deckViewerPayloadFromRecord(
  record?: {
    generatedContent?: string;
    content?: string;
    metadata?: { structuredContent?: unknown };
    structuredContent?: unknown;
  } | null
): { content: string; rawContent: unknown } {
  const generated = String(record?.generatedContent ?? record?.content ?? '').trim();
  const structured = record?.metadata?.structuredContent ?? record?.structuredContent ?? null;

  if (generated.startsWith('{') || generated.startsWith('[')) {
    try {
      const parsed = JSON.parse(generated) as Record<string, unknown>;
      if (Array.isArray(parsed)) {
        return { content: generated, rawContent: structured ?? { cards: parsed } };
      }
      const formatted = String(parsed.formatted ?? parsed.markdown ?? '').trim();
      const raw = parsed.raw ?? structured;
      if (formatted) return { content: formatted, rawContent: raw ?? structured ?? undefined };
      if (raw && typeof raw === 'object') return { content: generated, rawContent: raw };
    } catch {
      /* plain text */
    }
  }

  return { content: generated, rawContent: structured ?? undefined };
}

export function resolveFlashcardsFromPayload(
  content: string,
  rawContent?: unknown
): { cards: Flashcard[]; displayContent: string; raw: unknown } {
  let payload = { content, rawContent };
  if (rawContent == null) {
    payload = deckViewerPayloadFromRecord({ generatedContent: content });
  } else {
    const text = String(content || '').trim();
    if (text.startsWith('{')) {
      try {
        const parsed = JSON.parse(text) as Record<string, unknown>;
        const formatted = String(parsed.formatted ?? parsed.markdown ?? '').trim();
        if (formatted) payload = { content: formatted, rawContent };
      } catch {
        /* use as-is */
      }
    }
  }

  let parsed: Flashcard[] = [];
  const fromFormatted = parseFlashcards(payload.content);
  if (fromFormatted.length) parsed = fromFormatted;
  else if (payload.rawContent && typeof payload.rawContent === 'object') {
    parsed = parseFlashcards(
      JSON.stringify({ formatted: payload.content, raw: payload.rawContent })
    );
  }

  return {
    cards: enrichStudyDeckCards(parsed, payload.rawContent),
    displayContent: payload.content,
    raw: payload.rawContent,
  };
}

export function flashcardsHaveVisibleBody(cards: Flashcard[]): boolean {
  return cards.some((c) => c.front.trim() && c.back.trim());
}
