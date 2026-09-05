import api from '../services/api/api';
import { apiFetch } from './api-config';
import {
  consolidateLearningPathSubjects,
  dedupeTeacherLearningPathRows,
  groupTeacherSubjectsForCatalog,
  type TeacherCatalogSubject,
} from './learning-path-admin';
import {
  displaySubjectName,
  isActiveCatalogSubject,
  isSoftDeletedSubjectName,
  subjectCatalogGroupKey,
} from './subject-names';
import { prepareLibraryContents, dedupeLibraryContents } from './dedupe-library-content';

export type LearningPathRole = 'admin' | 'teacher' | 'student';

export type SubjectWithPathContent = {
  _id: string;
  id: string;
  name: string;
  description?: string;
  board?: string;
  classNumber?: string;
  asliPrepContent: any[];
  totalContent: number;
  mergedSubjectIds?: string[];
};

function parseSubjectsPayload(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.subjects)) return data.subjects;
  return [];
}

function parseContentPayload(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

async function fetchTeacherPayload<T>(endpoint: string): Promise<T> {
  const res = await apiFetch(endpoint);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  const json = await res.json();
  if (json?.success && json?.data !== undefined) return json.data as T;
  if (json?.data !== undefined) return json.data as T;
  return json as T;
}

function getContentSubjectId(content: any): string | null {
  const fromField = (value: unknown): string | null => {
    if (value == null) return null;
    if (typeof value === 'object' && value !== null && '_id' in value && (value as any)._id != null) {
      return String((value as any)._id);
    }
    if (typeof value === 'object' && value !== null && 'id' in value && (value as any).id != null) {
      return String((value as any).id);
    }
    if (typeof value === 'string' && value.trim()) return value.trim();
    return null;
  };
  return fromField(content?.subject) || fromField(content?.subjectId);
}

async function fetchSubjects(role: LearningPathRole): Promise<any[]> {
  if (role === 'admin') {
    const response = await api.get('/api/admin/subjects');
    return parseSubjectsPayload(response?.data);
  }
  if (role === 'teacher') {
    const data = await fetchTeacherPayload<unknown>('/api/teacher/subjects');
    return parseSubjectsPayload(data);
  }
  const response = await api.get('/api/student/subjects');
  return parseSubjectsPayload(response?.data);
}

async function fetchAllPrepContent(role: LearningPathRole): Promise<any[]> {
  const params = { surface: 'learning-path' };
  if (role === 'admin') {
    const response = await api.get('/api/admin/asli-prep-content', { params });
    return parseContentPayload(response?.data);
  }
  if (role === 'teacher') {
    const data = await fetchTeacherPayload<unknown>('/api/teacher/asli-prep-content?surface=learning-path');
    return parseContentPayload(data);
  }
  const response = await api.get('/api/student/asli-prep-content', { params });
  return parseContentPayload(response?.data);
}

function sortContentNewestFirst(items: any[]): any[] {
  return items.slice().sort((a, b) => {
    const ta = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tb - ta;
  });
}

/**
 * Teacher cards: one bulk content fetch, bucketed by canonical subject name.
 * Avoids duplicate cards when multiple subject IDs resolve to the same sibling content.
 */
async function loadTeacherLearningPathCatalog(
  isAsliPrepExclusive: boolean
): Promise<SubjectWithPathContent[]> {
  const subjects = await fetchSubjects('teacher');
  const groups = groupTeacherSubjectsForCatalog(subjects);

  const assignedGroupKeys = new Set<string>();
  const groupMeta = new Map<
    string,
    { representative: TeacherCatalogSubject; subjectIds: string[]; displayName: string }
  >();
  const subjectIdToGroupKey = new Map<string, string>();

  for (const { representative, subjectIds } of groups) {
    const key = subjectCatalogGroupKey(representative.name || '');
    assignedGroupKeys.add(key);
    groupMeta.set(key, {
      representative,
      subjectIds,
      displayName: displaySubjectName(representative.name || '') || 'Unknown Subject',
    });
    for (const sid of subjectIds) {
      subjectIdToGroupKey.set(sid, key);
    }
  }

  const allContentRaw = await fetchAllPrepContent('teacher');
  const allContent = sortContentNewestFirst(
    prepareLibraryContents(parseContentPayload(allContentRaw), isAsliPrepExclusive, {
      surface: 'learning-path',
    })
  );

  const contentByKey = new Map<string, any[]>();
  const seenByKey = new Map<string, Set<string>>();

  for (const item of allContent) {
    let key: string | null = null;
    const sid = getContentSubjectId(item);
    if (sid && subjectIdToGroupKey.has(sid)) {
      key = subjectIdToGroupKey.get(sid)!;
    } else {
      const subj = item?.subject;
      const name =
        typeof subj === 'object' && subj?.name
          ? String(subj.name)
          : typeof subj === 'string'
            ? subj
            : '';
      if (name.trim()) key = subjectCatalogGroupKey(name);
    }
    if (!key || !assignedGroupKeys.has(key)) continue;

    if (!contentByKey.has(key)) contentByKey.set(key, []);
    if (!seenByKey.has(key)) seenByKey.set(key, new Set());
    const cid = String(item._id || '');
    if (!cid || seenByKey.get(key)!.has(cid)) continue;
    seenByKey.get(key)!.add(cid);
    contentByKey.get(key)!.push(item);
  }

  const rows: SubjectWithPathContent[] = [];
  for (const [key, meta] of Array.from(groupMeta.entries())) {
    const asliPrepContent = dedupeLibraryContents(contentByKey.get(key) || [], {
      collapseAcrossSubjects: true,
    });
    if (asliPrepContent.length === 0) continue;
    const subjectId = meta.subjectIds[0];
    rows.push({
      _id: subjectId,
      id: subjectId,
      name: meta.displayName,
      description: meta.representative.description || `Content for ${meta.displayName}`,
      board: meta.representative.board || '',
      classNumber: meta.representative.classNumber,
      asliPrepContent,
      totalContent: asliPrepContent.length,
      mergedSubjectIds: meta.subjectIds,
    });
  }

  return dedupeTeacherLearningPathRows(rows)
    .filter((row) => isActiveCatalogSubject(row) && row.totalContent > 0)
    .sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base', numeric: true })
    );
}

/** Load subjects grouped with catalog content — matches web admin learning paths. */
export async function loadLearningPathCatalog(
  role: LearningPathRole,
  isAsliPrepExclusive: boolean
): Promise<SubjectWithPathContent[]> {
  if (role === 'teacher') {
    return loadTeacherLearningPathCatalog(isAsliPrepExclusive);
  }

  const [subjects, allContentRaw] = await Promise.all([
    fetchSubjects(role),
    fetchAllPrepContent(role),
  ]);

  const allContent = prepareLibraryContents(allContentRaw, isAsliPrepExclusive, {
    surface: 'learning-path',
  });
  const bySubjectId = new Map<string, any[]>();

  for (const item of allContent) {
    const sid = getContentSubjectId(item);
    if (!sid) continue;
    if (!bySubjectId.has(sid)) bySubjectId.set(sid, []);
    bySubjectId.get(sid)!.push(item);
  }

  const consumedIds = new Set<string>();
  const merged: SubjectWithPathContent[] = [];

  for (const subject of subjects) {
    const subjectId = String(subject._id || subject.id || '');
    if (!subjectId) continue;
    const asliPrepContent = sortContentNewestFirst(
      dedupeLibraryContents(bySubjectId.get(subjectId) || [], { collapseAcrossSubjects: true }),
    );
    consumedIds.add(subjectId);
    merged.push({
      _id: subjectId,
      id: subjectId,
      name: subject.name || 'Unknown Subject',
      description: subject.description || '',
      board: subject.board || '',
      classNumber: subject.classNumber,
      asliPrepContent,
      totalContent: asliPrepContent.length,
    });
  }

  // Content whose subject id is not in /subjects still belongs on Learning Paths.
  bySubjectId.forEach((items, subjectId) => {
    if (consumedIds.has(subjectId)) return;
    const sorted = sortContentNewestFirst(
      dedupeLibraryContents(items, { collapseAcrossSubjects: true }),
    );
    if (sorted.length === 0) return;
    const first = sorted[0];
    const populated = first?.subject ?? first?.subjectId;
    const nameFromPopulate =
      typeof populated === 'object' && populated?.name ? populated.name : 'Subject';
    merged.push({
      _id: subjectId,
      id: subjectId,
      name: nameFromPopulate,
      description: `Content for ${nameFromPopulate}`,
      board: first?.board || '',
      classNumber: first?.classNumber,
      asliPrepContent: sorted,
      totalContent: sorted.length,
    });
  });

  const withContent = merged.filter((row) => row.totalContent > 0);

  if (role === 'admin') {
    return consolidateLearningPathSubjects(withContent).filter(
      (row) => isActiveCatalogSubject(row) && row.totalContent > 0
    );
  }

  return withContent
    .filter((row) => !isSoftDeletedSubjectName(row.name || ''))
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
}

/** Filter + count content rows by type for library tiles. */
export function countContentByType(
  contents: any[],
  isAsliPrepExclusive: boolean
): Record<string, number> {
  const filtered = prepareLibraryContents(contents, isAsliPrepExclusive, { surface: 'learning-path' });
  const counts: Record<string, number> = {};
  for (const item of filtered) {
    const t = item.type || 'Material';
    counts[t] = (counts[t] || 0) + 1;
  }
  return counts;
}
