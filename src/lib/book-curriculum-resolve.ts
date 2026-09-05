/** Match book metadata (incl. content imports) to curriculum cascade dropdown values. */

function compactKey(value: string): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function normalizeBookSubjectKey(value: string): string {
  const compact = compactKey(value);
  if (compact === "maths" || compact === "math" || compact.includes("mathematics")) return "mathematics";
  if (compact.includes("socialscience") || compact === "sst" || compact.includes("socialstudies")) {
    return "socialscience";
  }
  if (compact.includes("english")) return "english";
  if (compact.includes("hindi")) return "hindi";
  if (compact.includes("physics")) return "physics";
  if (compact.includes("chemistry")) return "chemistry";
  if (compact.includes("biology")) return "biology";
  if (compact.includes("science")) return "science";
  return compact;
}

export function inferClassDigitsFromText(...parts: Array<string | undefined>): string {
  for (const part of parts) {
    const raw = String(part || "").trim();
    if (!raw) continue;
    const iitMatch = raw.match(/\biit[-\s]*(\d{1,2})\b/i);
    if (iitMatch?.[1]) return iitMatch[1];
    const ordinal = raw.match(/\b(\d{1,2})\s*(?:st|nd|rd|th)\b/i);
    if (ordinal?.[1]) return ordinal[1];
    const classWord = raw.match(/\bclass\s*[-:]?\s*(\d{1,2})\b/i);
    if (classWord?.[1]) return classWord[1];
    if (/^\d{1,2}$/.test(raw)) return raw;
  }
  return "";
}

function normalizeIitClassLabel(raw: string): string {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return "";
  if (trimmed === "Class-6-IIT" || /^iit[-\s]*6$/i.test(trimmed)) return "Class 6";
  const iitMatch = trimmed.match(/\biit[-\s]*(\d{1,2})\b/i);
  if (iitMatch?.[1]) return `Class ${iitMatch[1]}`;
  return trimmed;
}

export function inferSubjectFromText(...parts: Array<string | undefined>): string {
  const blob = parts.map((p) => String(p || "")).join(" ").toLowerCase();
  if (/\bmaths?\b|\bmathematics\b/.test(blob)) return "Maths";
  if (/\bphysics\b/.test(blob)) return "Physics";
  if (/\bchemistry\b/.test(blob)) return "Chemistry";
  if (/\bbiology\b/.test(blob)) return "Biology";
  if (/\bscience\b/.test(blob)) return "Science";
  if (/\benglish\b/.test(blob)) return "English";
  if (/\bhindi\b/.test(blob)) return "Hindi";
  if (/\bsst\b|\bsocial\s*science|\bsocial\s*studies/.test(blob)) return "Social Science";
  return "";
}

function normalizeBoardKey(value: string): string {
  const compact = compactKey(value);
  if (compact.includes("iit") || compact.includes("neet") || compact.includes("jee")) return "iitneet";
  if (compact === "cbse" || compact === "cbsc") return "cbse";
  return compact;
}

export function resolveBookBoardForCascade(rawBoard: string, boardOptions: string[]): string {
  const raw = String(rawBoard || "").trim();
  if (!raw) return boardOptions[0] || "";
  if (boardOptions.includes(raw)) return raw;
  const key = normalizeBoardKey(raw);
  for (const opt of boardOptions) {
    if (normalizeBoardKey(opt) === key) return opt;
  }
  return raw;
}

export function resolveBookClassForCascade(
  rawClass: string,
  classOptions: string[],
  board = "",
  title = "",
): string {
  let raw = String(rawClass || "").trim();
  if (!raw || /^general$/i.test(raw)) {
    raw = inferClassDigitsFromText(title, rawClass) || raw;
  }

  const iitLabel = normalizeIitClassLabel(raw);
  if (iitLabel.startsWith("Class ") && normalizeBoardKey(board) === "iitneet") {
    if (classOptions.includes(iitLabel)) return iitLabel;
    return iitLabel;
  }

  if (classOptions.length) {
    if (raw && classOptions.includes(raw)) return raw;
    const digits = inferClassDigitsFromText(raw, title);
    if (digits) {
      const boardKey = normalizeBoardKey(board);
      const preferred =
        boardKey === "iitneet" && digits === "6"
          ? ["Class 6", digits]
          : [`Class ${digits}`, digits];
      for (const candidate of preferred) {
        if (classOptions.includes(candidate)) return candidate;
      }
      for (const opt of classOptions) {
        if (opt.includes(digits)) return opt;
      }
    }
    for (const opt of classOptions) {
      if (compactKey(opt) === compactKey(raw)) return opt;
    }
  }

  const digits = inferClassDigitsFromText(raw, title);
  if (digits) {
    const boardKey = normalizeBoardKey(board);
    if (boardKey === "iitneet" && digits === "6") return "Class 6";
    return /^class\b/i.test(raw) ? raw : `Class ${digits}`;
  }
  return raw;
}

export function resolveBookSubjectForCascade(rawSubject: string, subjectOptions: string[], title = ""): string {
  let raw = String(rawSubject || "").trim();
  if (!raw || /^general$/i.test(raw)) {
    raw = inferSubjectFromText(title, rawSubject) || raw;
  }
  if (!raw) return "";

  if (subjectOptions.length) {
    if (subjectOptions.includes(raw)) return raw;
    const key = normalizeBookSubjectKey(raw);
    for (const opt of subjectOptions) {
      if (normalizeBookSubjectKey(opt) === key) return opt;
    }
    for (const opt of subjectOptions) {
      const optKey = normalizeBookSubjectKey(opt);
      if (key.includes(optKey) || optKey.includes(key)) return opt;
    }
    const inferred = inferSubjectFromText(raw, title);
    if (inferred) {
      for (const opt of subjectOptions) {
        if (normalizeBookSubjectKey(opt) === normalizeBookSubjectKey(inferred)) return opt;
      }
    }
  }

  const inferred = inferSubjectFromText(raw, title);
  return inferred || raw;
}

export type BookCurriculumSource = {
  board?: string;
  class?: string;
  subject?: string;
  title?: string;
  topic?: string;
  subtopic?: string;
};

/** Apply book row → cascade field values (board/class/subject/topic/subtopic). */
export function resolveBookCurriculumSelection(
  book: BookCurriculumSource,
  boardOptions: string[],
  classOptions: string[],
  subjectOptions: string[],
) {
  const board = resolveBookBoardForCascade(String(book.board || ""), boardOptions);
  const classNumber = resolveBookClassForCascade(
    String(book.class || ""),
    classOptions,
    board,
    String(book.title || ""),
  );
  const subject = resolveBookSubjectForCascade(
    String(book.subject || ""),
    subjectOptions,
    String(book.title || ""),
  );
  return {
    board,
    classNumber,
    subject,
    topic: String(book.topic || "").trim(),
    subTopic: String(book.subtopic || "").trim(),
  };
}
