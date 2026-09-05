import { API_BASE_URL } from './api-config';
import { getVideoDisplayTitle } from './video-chapter-schedule';
import {
  boardsMatch,
  formatClassBoardLabel,
  normalizeBoardKey,
  parseClassBoardLabel,
} from './board-label';
import {
  displaySubjectName,
  extractClassNumberFromSubjectName,
  extractPlainSubjectName,
  isActiveCatalogSubject,
  normalizeSubjectDisplayKey,
} from './subject-names';

export const BOARD_CODE = 'ASLI_EXCLUSIVE_SCHOOLS';

export type SyllabusBoard = 'ASLI_EXCLUSIVE_SCHOOLS' | 'CBSE' | 'STATE';

export type ContentType =
  | 'TextBook'
  | 'Workbook'
  | 'Material'
  | 'Video'
  | 'Audio'
  | 'Homework';

export type SubjectItem = {
  _id: string;
  name: string;
  description?: string;
  code?: string;
  board: string;
  classNumber?: string;
  stateName?: string;
  isActive?: boolean;
};

export type ContentItem = {
  _id: string;
  title: string;
  description?: string;
  type: ContentType;
  board: string;
  stateName?: string;
  isActive?: boolean;
  subject: {
    _id: string;
    name: string;
    classNumber?: string;
    missingFromCatalog?: boolean;
  };
  classNumber?: string;
  topic?: string;
  chapter?: string;
  module?: string;
  date: string;
  fileUrl: string;
  fileUrls?: string[];
  thumbnailUrl?: string;
  duration?: number;
  createdAt: string;
};

export const SYLLABUS_OPTIONS: { value: SyllabusBoard; label: string }[] = [
  { value: 'CBSE', label: 'CBSE' },
  { value: 'STATE', label: 'State' },
];

export const INDIAN_STATE_OPTIONS = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh',
  'Lakshadweep', 'Puducherry',
];

export const CONTENT_TYPE_OPTIONS: ContentType[] = [
  'TextBook',
  'Workbook',
  'Material',
  'Homework',
  'Video',
  'Audio',
];

export const CONTENT_TYPE_SECTIONS: { title: string; types: ContentType[] }[] = [
  { title: 'Textbooks', types: ['TextBook'] },
  { title: 'Workbooks', types: ['Workbook'] },
  { title: 'Materials', types: ['Material'] },
  { title: 'Homework', types: ['Homework'] },
  { title: 'Videos', types: ['Video'] },
  { title: 'Audio', types: ['Audio'] },
];

const VIDEO_NUMBER_PATTERN = /^[1-9]\d*$/;

export function videoNumberOnly(value: string): string {
  return String(value || '').replace(/\D/g, '');
}

export function isVideoNumber(value: string): boolean {
  return VIDEO_NUMBER_PATTERN.test(String(value || '').trim());
}

export function getVideoContentDisplayTitle(
  item: Pick<ContentItem, 'type' | 'title' | 'chapter' | 'module'> & { topic?: string }
): string {
  return getVideoDisplayTitle(item);
}

export function syllabusLabel(board: string): string {
  const normalized = board.toUpperCase();
  if (normalized === 'ASLI_EXCLUSIVE_SCHOOLS') return '';
  const o = SYLLABUS_OPTIONS.find((x) => x.value === normalized || x.value === board);
  return o?.label ?? board;
}

export function normalizeClassNumber(value: string | null | undefined): string {
  const trimmed = value != null ? String(value).trim() : '';
  if (!trimmed) return '';
  const parsed = parseInt(trimmed, 10);
  if (!Number.isNaN(parsed)) return String(parsed);
  return trimmed;
}

export function isValidGradeClassNumber(value: string | null | undefined): boolean {
  const n = normalizeClassNumber(value);
  if (!n) return false;
  const parsed = parseInt(n, 10);
  return !Number.isNaN(parsed) && parsed >= 1 && parsed <= 12;
}

export function getContentSubjectId(item: ContentItem): string | null {
  const subj = item.subject as { _id?: string } | string | null | undefined;
  if (!subj) return null;
  if (typeof subj === 'string') return subj;
  return subj._id ? String(subj._id) : null;
}

export function isInferredSubjectId(id: string | null | undefined): boolean {
  return !id || String(id).startsWith('inferred-');
}

export function isMongoObjectId(id: string | null | undefined): boolean {
  return Boolean(id && /^[a-f0-9]{24}$/i.test(String(id)));
}

export function isCatalogSubjectId(id: string | null, catalog: SubjectItem[]): boolean {
  if (isInferredSubjectId(id)) return false;
  return catalog.some((s) => String(s._id) === String(id));
}

export function subjectSidebarKey(name: string, classNum: string, board = ''): string {
  return `${normalizeSubjectDisplayKey(name)}|${classNum}|${normalizeBoardKey(board)}`;
}

export function buildClassBoardOptions(
  subjects: SubjectItem[],
  contents: ContentItem[]
): string[] {
  const labels = new Set<string>();
  const add = (classNum: string | null | undefined, board?: string) => {
    if (!isValidGradeClassNumber(classNum)) return;
    labels.add(formatClassBoardLabel(normalizeClassNumber(classNum!), board));
  };

  subjects.forEach((subj) => {
    const cn = subj.classNumber
      ? normalizeClassNumber(subj.classNumber)
      : normalizeClassNumber(extractClassNumberFromSubjectName(subj.name) || '');
    if (cn) add(cn, subj.board);
  });

  contents.forEach((item) => {
    const cn = effectiveContentClass(item, subjects);
    const board = item.board || BOARD_CODE;
    if (cn) add(cn, board);
  });

  return Array.from(labels).sort((a, b) => {
    const pa = parseClassBoardLabel(a);
    const pb = parseClassBoardLabel(b);
    const na = parseInt(pa.classNum, 10);
    const nb = parseInt(pb.classNum, 10);
    if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) return na - nb;
    return a.localeCompare(b);
  });
}

export function contentMatchesClassBoard(
  item: ContentItem,
  subjects: SubjectItem[],
  classNum: string,
  board: string
): boolean {
  if (item.isActive === false) return false;
  const effClass = effectiveContentClass(item, subjects);
  if (normalizeClassNumber(effClass || '') !== normalizeClassNumber(classNum)) return false;
  if (!board) return true;
  const itemBoard = normalizeBoardKey(item.board || '');
  return boardsMatch(itemBoard, board);
}

export function inferSubjectLabelFromContent(item: ContentItem): string {
  const text = `${item.title || ''} ${item.description || ''} ${item.topic || ''}`.toLowerCase();
  if (/ganita|mathematics|maths|\bmath\b/.test(text)) return 'Mathematics';
  if (/science|curiosity|physics|chemistry|biology/.test(text)) return 'Science';
  if (/english/.test(text)) return 'English';
  if (/social|history|geography/.test(text)) return 'Social Studies';
  if (/hindi/.test(text)) return 'Hindi';
  if (/telugu/.test(text)) return 'Telugu';
  const fromTitle = String(item.title || '')
    .replace(/\s+(vol\s*\d+\s*)?class\s*\d+.*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  return fromTitle || 'General';
}

export function effectiveContentClass(item: ContentItem, subjects: SubjectItem[]): string | null {
  if (item.classNumber != null && String(item.classNumber).trim() !== '') {
    return normalizeClassNumber(item.classNumber);
  }
  if (item.subject?.classNumber != null && String(item.subject.classNumber).trim() !== '') {
    return normalizeClassNumber(item.subject.classNumber);
  }
  const sid = item.subject?._id;
  if (!sid) return null;
  const subj = subjects.find((s) => String(s._id) === String(sid));
  if (!subj) return null;
  if (subj.classNumber != null && String(subj.classNumber).trim() !== '') {
    return normalizeClassNumber(subj.classNumber);
  }
  return extractClassNumberFromSubjectName(subj.name);
}

export function normalizeServerContentFileUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith(`${API_BASE_URL}/uploads/`)) {
    return trimmed.slice(API_BASE_URL.length);
  }
  if (trimmed.startsWith('/uploads/')) return trimmed;
  if (trimmed.startsWith('uploads/')) return `/${trimmed}`;
  return trimmed;
}

export function isServerHostedFileUrl(url: string): boolean {
  return normalizeServerContentFileUrl(url).startsWith('/uploads/');
}

export function isHttpUrl(url: string): boolean {
  try {
    const u = new URL(url.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isValidContentSourceUrl(url: string, type: ContentType): boolean {
  const trimmed = normalizeServerContentFileUrl(url) || url.trim();
  if (!trimmed) return false;
  if (type === 'Video') return isHttpUrl(url.trim());
  if (type === 'Audio') return isServerHostedFileUrl(url) || isHttpUrl(url.trim());
  return isServerHostedFileUrl(url);
}

export function normalizeMediaUrl(value?: string | null): string | null {
  const trimmed = (value || '').trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (trimmed.startsWith('/uploads/')) return `${API_BASE_URL}${trimmed}`;
  return trimmed;
}

export function normalizeContentRows(rows: ContentItem[]): ContentItem[] {
  return rows.map((row) => ({
    ...row,
    chapter: row.chapter ? videoNumberOnly(row.chapter) || undefined : undefined,
    module: row.module ? videoNumberOnly(row.module) || undefined : undefined,
    classNumber:
      row.classNumber?.trim() ||
      row.subject?.classNumber?.trim() ||
      extractClassNumberFromSubjectName(row.subject?.name || '') ||
      undefined,
  }));
}

export function mapSubjectFromApi(raw: SubjectItem & { id?: string }): SubjectItem {
  return {
    ...raw,
    _id: String(raw._id || raw.id),
    name: displaySubjectName(raw.name),
    isActive: raw.isActive !== false && !String(raw.name || '').includes('__deleted__'),
    classNumber:
      raw.classNumber?.trim() ||
      extractClassNumberFromSubjectName(raw.name) ||
      undefined,
  };
}

export function buildSubjectsForClass(
  subjects: SubjectItem[],
  contents: ContentItem[],
  selectedClassNumber: string,
  selectedBoard = ''
): SubjectItem[] {
  if (!selectedClassNumber) return [];
  const normClass = normalizeClassNumber(selectedClassNumber);
  const normBoard = normalizeBoardKey(selectedBoard);
  const map = new Map<string, SubjectItem>();

  subjects.forEach((subj) => {
    if (!isActiveCatalogSubject(subj)) return;
    const subjClass = subj.classNumber
      ? normalizeClassNumber(subj.classNumber)
      : normalizeClassNumber(extractClassNumberFromSubjectName(subj.name) || '');
    const subjBoard = normalizeBoardKey(subj.board || '');
    if (normBoard && subjBoard && !boardsMatch(subjBoard, normBoard)) return;
    const linkedViaContent = contents.some((item) => {
      if (!contentMatchesClassBoard(item, subjects, normClass, normBoard)) return false;
      const sid = getContentSubjectId(item);
      return sid != null && String(sid) === String(subj._id);
    });
    if (subjClass === normClass || linkedViaContent) {
      const rowClass = subjClass || normClass;
      const groupKey = subjectSidebarKey(subj.name, rowClass, normBoard || subjBoard);
      const existing = map.get(groupKey);
      const preferThis =
        !existing || (isInferredSubjectId(existing._id) && isMongoObjectId(subj._id));
      if (preferThis) {
        map.set(groupKey, {
          ...subj,
          name: displaySubjectName(subj.name),
          classNumber: rowClass || subj.classNumber,
          board: normBoard || subjBoard || subj.board,
        });
      }
    }
  });

  contents.forEach((item) => {
    if (!contentMatchesClassBoard(item, subjects, normClass, normBoard)) return;
    const sid = getContentSubjectId(item);
    if (sid) {
      const linked = subjects.find((s) => String(s._id) === String(sid));
      if (linked && !isActiveCatalogSubject(linked)) return;
    }
    const label = item.subject?.name
      ? displaySubjectName(item.subject.name)
      : inferSubjectLabelFromContent(item);
    const board = item.board || BOARD_CODE;
    const groupKey = subjectSidebarKey(label, normClass, normBoard || board);
    const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const idKey =
      sid && isMongoObjectId(sid) && !isInferredSubjectId(sid) ? String(sid) : `inferred-${slug}`;

    const existing = map.get(groupKey);
    if (!existing) {
      const fromCatalog = sid && subjects.find((s) => String(s._id) === String(sid));
      map.set(groupKey, {
        _id: fromCatalog ? String(fromCatalog._id) : idKey,
        name: label,
        board: normBoard || board,
        classNumber: normClass,
        isActive: item.isActive,
      });
    } else if (
      sid &&
      isMongoObjectId(sid) &&
      isInferredSubjectId(existing._id) &&
      !isInferredSubjectId(sid)
    ) {
      map.set(groupKey, { ...existing, _id: String(sid), board: existing.board || board });
    }
  });

  return Array.from(map.values()).sort((a, b) =>
    extractPlainSubjectName(a.name).localeCompare(extractPlainSubjectName(b.name))
  );
}

export function filterContentForSubject(
  contents: ContentItem[],
  subjects: SubjectItem[],
  selectedSubjectId: string,
  selectedClassNumber: string,
  subjectsForClass: SubjectItem[],
  selectedBoard = ''
): ContentItem[] {
  const selectedRow = subjectsForClass.find((s) => String(s._id) === String(selectedSubjectId));
  const selectedPlain = selectedRow
    ? extractPlainSubjectName(selectedRow.name).toLowerCase()
    : '';
  const normBoard = normalizeBoardKey(selectedBoard || selectedRow?.board || '');

  return contents.filter((item) => {
    if (!contentMatchesClassBoard(item, subjects, selectedClassNumber, normBoard)) return false;
    const sid = getContentSubjectId(item);
    if (sid && String(sid) === String(selectedSubjectId)) return true;
    if (String(item.subject?._id) === String(selectedSubjectId)) return true;
    const itemPlain = (
      item.subject?.name
        ? extractPlainSubjectName(item.subject.name)
        : inferSubjectLabelFromContent(item)
    ).toLowerCase();
    return selectedPlain !== '' && itemPlain === selectedPlain;
  });
}

export function contentIconName(type: ContentType): keyof typeof import('@expo/vector-icons').Ionicons.glyphMap {
  switch (type) {
    case 'Video':
      return 'videocam-outline';
    case 'Audio':
      return 'headset-outline';
    case 'TextBook':
      return 'book-outline';
    default:
      return 'document-outline';
  }
}

export type ContentFormState = {
  title: string;
  description: string;
  type: ContentType;
  fileUrl: string;
  topic: string;
  date: string;
  chapter: string;
  module: string;
  duration: string;
  thumbnailUrl: string;
};

export function emptyContentForm(): ContentFormState {
  return {
    title: '',
    description: '',
    type: 'Video',
    fileUrl: '',
    topic: '',
    date: new Date().toISOString().slice(0, 10),
    chapter: '',
    module: '',
    duration: '',
    thumbnailUrl: '',
  };
}

export function contentFormFromItem(item: ContentItem): ContentFormState {
  return {
    title: item.title || '',
    description: item.description || '',
    type: item.type || 'Material',
    fileUrl: item.fileUrl || '',
    topic: item.topic || '',
    date: item.date ? String(item.date).slice(0, 10) : '',
    chapter: item.chapter || '',
    module: item.module || '',
    duration: item.duration ? String(item.duration) : '',
    thumbnailUrl: item.thumbnailUrl || '',
  };
}

export function resolveCatalogSubjectIdForSave(
  subjectId: string | null,
  catalog: SubjectItem[],
  classNumber: string,
  classSubjects: SubjectItem[]
): string | null {
  if (!subjectId) return null;
  if (isCatalogSubjectId(subjectId, catalog)) return String(subjectId);
  if (isMongoObjectId(subjectId) && !isInferredSubjectId(subjectId)) {
    return String(subjectId);
  }
  const row = classSubjects.find((s) => String(s._id) === String(subjectId)) ?? null;
  if (!row) return null;
  const normClass = normalizeClassNumber(classNumber);
  const match = catalog.find((s) => {
    const sClass = s.classNumber
      ? normalizeClassNumber(s.classNumber)
      : normalizeClassNumber(extractClassNumberFromSubjectName(s.name) || '');
    if (sClass !== normClass) return false;
    return normalizeSubjectDisplayKey(s.name) === normalizeSubjectDisplayKey(row.name);
  });
  return match ? String(match._id) : null;
}
