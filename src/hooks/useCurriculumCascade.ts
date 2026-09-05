import { storageGetItem } from '../lib/safe-storage';
import { useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '../lib/api-config';
import {
  mergePreservingPrimaryOrder,
  normalizeProductCategory,
  dedupeChapterWiseLabels,
} from '../lib/curriculum-chapter-sort';

type CurriculumRow = { id: string; name: string; label: string };

const responseCache = new Map<string, unknown>();

/** Drop in-memory curriculum API responses (called on app background). */
export function clearCurriculumResponseCache() {
  responseCache.clear();
}

function cacheGet<T>(key: string): T | undefined {
  return responseCache.get(key) as T | undefined;
}

function cacheSet(key: string, val: unknown) {
  const payload = val as { success?: boolean; data?: unknown[] | { subjects?: unknown[]; topics?: unknown[]; subTopics?: unknown[] } };
  const data = payload?.data;
  const hasRows = Array.isArray(data)
    ? data.length > 0
    : Boolean(
        (data as { subjects?: unknown[] })?.subjects?.length ||
          (data as { topics?: unknown[] })?.topics?.length ||
          (data as { subTopics?: unknown[] })?.subTopics?.length
      );
  if (payload?.success === false || !hasRows) return;
  if (responseCache.size >= 80) {
    const first = responseCache.keys().next().value;
    if (first) responseCache.delete(first);
  }
  responseCache.set(key, val);
}

function rowsToNames(rows: CurriculumRow[] | undefined): string[] {
  if (!rows || !Array.isArray(rows)) return [];
  return rows.map((r) => r.name || r.label || r.id).filter(Boolean);
}

/**
 * Clean up topic/subtopic options coming from the curriculum API.
 * - Chapter-aware dedupe ("Integers" + "Chapter 1 - Integers" → one entry)
 * - Drops clustered comma-joined junk rows when parts already exist alone
 * - Sorts Chapter 1…10…11 order
 */
function sanitizeCurriculumOptions(options: string[]): string[] {
  const cleaned = options.map((o) => String(o ?? '').trim()).filter(Boolean);
  const deduped = dedupeChapterWiseLabels(cleaned);

  const singleKeys = new Set(
    deduped
      .filter((o) => !o.includes(','))
      .map((o) => o.trim().toLowerCase().replace(/\s+/g, ' ')),
  );

  return dedupeChapterWiseLabels(
    deduped.filter((option) => {
      if (!option.includes(',')) return true;
      const parts = option
        .split(',')
        .map((p) => p.trim().toLowerCase().replace(/\s+/g, ' '))
        .filter(Boolean);
      if (parts.length < 2) return true;
      const allPartsExistSeparately = parts.every((p) => singleKeys.has(p));
      return !allPartsExistSeparately;
    }),
  );
}

function normalizeSubjectKey(value: string): string {
  const compact = String(value).toLowerCase().replace(/[^a-z0-9]/g, '');
  if (compact === 'maths' || compact === 'math') return 'mathematics';
  if (compact === 'socialstudies' || compact === 'sst') return 'socialscience';
  return compact;
}

function dedupeSubjectOptions(subjects: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const subject of subjects) {
    const key = normalizeSubjectKey(subject);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(subject);
  }
  return result;
}

export function normalizeGradeForCurriculum(gradeLevel: string | undefined) {
  if (!gradeLevel) return undefined;
  if (gradeLevel === 'Class-6-IIT' || gradeLevel === 'IIT-6') return 'Class 6';
  return gradeLevel;
}

export function isGradeWithScienceCurriculumDropdowns(gradeLevel: string | undefined): boolean {
  const g = normalizeGradeForCurriculum(gradeLevel);
  return g === 'Class 6' || g === 'Class 7' || g === 'Class 8' || g === 'Class 10';
}

async function fetchCurriculum(path: string, token: string | null) {
  if (responseCache.has(path)) {
    return cacheGet<{ success?: boolean; data?: CurriculumRow[] }>(path)!;
  }
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
    },
  });
  const json = await res.json();
  cacheSet(path, json);
  return json;
}

async function fetchManagedTopicTaxonomy(
  token: string | null,
  params: {
    board?: string;
    classLabel?: string;
    subject?: string;
    topicName?: string;
    productCategory?: string;
  }
) {
  const buildPath = (includeBoard: boolean) => {
    const qs = new URLSearchParams();
    if (includeBoard && params.board) qs.set('board', params.board);
    if (params.classLabel) qs.set('classLabel', params.classLabel);
    if (params.subject) qs.set('subject', params.subject);
    if (params.topicName) qs.set('topicName', params.topicName);
    if (params.productCategory !== undefined) qs.set('productCategory', params.productCategory);
    return `/api/ai-generator/topic-taxonomy?${qs.toString()}`;
  };

  const load = async (includeBoard: boolean) => {
    const path = buildPath(includeBoard);
    if (responseCache.has(path)) {
      return cacheGet<{
        success?: boolean;
        data?: { subjects?: string[]; topics?: string[]; subTopics?: string[] };
      }>(path)!;
    }
    const res = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
    });
    const json = await res.json();
    if (res.ok && json?.success !== false) {
      cacheSet(path, json);
    }
    return json;
  };

  let json = await load(true);
  return json;
}

const SYLLABUS =
  'ncert6eng6hin6math6sst6-7-8-eng7-hin7-math7-sst7-eng8-hin8-math8-sst8-eng10-math10-sst10-hin10-sci10-v1';

export function useCurriculumCascade(
  gradeLevel: string | undefined,
  subject: string | undefined,
  topic: string | undefined,
  board: string | undefined = undefined,
  options?: { enabled?: boolean; productCategory?: string },
) {
  const enabled = options?.enabled !== false;
  const productCategory =
    options?.productCategory !== undefined
      ? normalizeProductCategory(options.productCategory)
      : undefined;
  const gradeForApi = normalizeGradeForCurriculum(gradeLevel);
  const [classRows, setClassRows] = useState<CurriculumRow[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [subtopics, setSubtopics] = useState<string[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [loadingSubtopics, setLoadingSubtopics] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      setLoadingClasses(true);
      try {
        const token = await storageGetItem('authToken');
        const qs = new URLSearchParams({ v: '4' });
        if (board) qs.set('board', board);
        if (productCategory !== undefined) qs.set('productCategory', productCategory);
        const data = await fetchCurriculum(`/api/curriculum/classes?${qs.toString()}`, token);
        if (cancelled) return;
        const rows = (data as { data?: CurriculumRow[] }).data || [];
        setClassRows(rows);
      } catch {
        if (!cancelled) setClassRows([]);
      } finally {
        if (!cancelled) setLoadingClasses(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [board, productCategory, enabled]);

  useEffect(() => {
    let cancelled = false;
    if (!enabled) return;
    if (!gradeLevel || !gradeForApi) {
      setSubjects([]);
      setLoadingSubjects(false);
      return;
    }
    (async () => {
      setLoadingSubjects(true);
      try {
        const token = await storageGetItem('authToken');
        const qs = new URLSearchParams({ classId: gradeForApi, syllabus: 'curriculum-v3' });
        if (board) qs.set('board', board);
        if (productCategory !== undefined) qs.set('productCategory', productCategory);
        const [data, managed] = await Promise.all([
          fetchCurriculum(`/api/curriculum/subjects?${qs.toString()}`, token),
          fetchManagedTopicTaxonomy(token, {
            board,
            classLabel: gradeForApi,
            productCategory,
          }),
        ]);
        if (cancelled) return;
        const curriculumSubjects = dedupeSubjectOptions(
          rowsToNames((data as { data?: CurriculumRow[] }).data)
        );
        const managedSubjects = (managed as { data?: { subjects?: string[] } })?.data?.subjects || [];
        setSubjects(dedupeSubjectOptions([...curriculumSubjects, ...managedSubjects]));
      } catch {
        if (!cancelled) setSubjects([]);
      } finally {
        if (!cancelled) setLoadingSubjects(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gradeLevel, gradeForApi, board, productCategory, enabled]);

  useEffect(() => {
    let cancelled = false;
    if (!enabled) return;
    if (!gradeLevel || !gradeForApi || !subject) {
      setTopics([]);
      setLoadingTopics(false);
      return;
    }
    (async () => {
      setLoadingTopics(true);
      try {
        const token = await storageGetItem('authToken');
        const qs = new URLSearchParams({
          classId: gradeForApi,
          subjectId: subject,
          syllabus: SYLLABUS,
        });
        if (board) qs.set('board', board);
        if (productCategory !== undefined) qs.set('productCategory', productCategory);
        const [data, managed] = await Promise.all([
          fetchCurriculum(`/api/curriculum/topics?${qs.toString()}`, token),
          fetchManagedTopicTaxonomy(token, {
            board,
            classLabel: gradeForApi,
            subject,
            productCategory,
          }),
        ]);
        if (cancelled) return;
        const curriculumTopics = rowsToNames((data as { data?: CurriculumRow[] }).data);
        const managedTopics = (managed as { data?: { topics?: string[] } })?.data?.topics || [];
        setTopics(
          sanitizeCurriculumOptions(mergePreservingPrimaryOrder(managedTopics, curriculumTopics)),
        );
      } catch {
        if (!cancelled) setTopics([]);
      } finally {
        if (!cancelled) setLoadingTopics(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gradeLevel, gradeForApi, subject, board, productCategory, enabled]);

  useEffect(() => {
    let cancelled = false;
    if (!enabled) return;
    if (!gradeLevel || !gradeForApi || !subject || !topic) {
      setSubtopics([]);
      setLoadingSubtopics(false);
      return;
    }
    (async () => {
      setLoadingSubtopics(true);
      try {
        const token = await storageGetItem('authToken');
        const qs = new URLSearchParams({
          classId: gradeForApi,
          subjectId: subject,
          topicId: topic,
          syllabus: SYLLABUS,
        });
        if (board) qs.set('board', board);
        if (productCategory !== undefined) qs.set('productCategory', productCategory);
        const [data, managed] = await Promise.all([
          fetchCurriculum(`/api/curriculum/subtopics?${qs.toString()}`, token),
          fetchManagedTopicTaxonomy(token, {
            board,
            classLabel: gradeForApi,
            subject,
            topicName: topic,
            productCategory,
          }),
        ]);
        if (cancelled) return;
        const curriculumSubtopics = rowsToNames((data as { data?: CurriculumRow[] }).data);
        const managedSubtopics = (managed as { data?: { subTopics?: string[] } })?.data?.subTopics || [];
        setSubtopics(
          sanitizeCurriculumOptions(
            mergePreservingPrimaryOrder(managedSubtopics, curriculumSubtopics),
          ),
        );
      } catch {
        if (!cancelled) setSubtopics([]);
      } finally {
        if (!cancelled) setLoadingSubtopics(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gradeLevel, gradeForApi, subject, topic, board, productCategory, enabled]);

  const classOptions = useMemo(() => {
    if (classRows.length === 0) return [];
    let options = classRows.map((r) => r.name || r.label || r.id).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const boardKey = String(board || '').toUpperCase().replace(/[\s/\\-]+/g, '');
    if (boardKey.includes('IIT') || boardKey.includes('NEET') || boardKey.includes('JEE')) {
      options = options.map((o) => (o === 'IIT-6' || o === 'Class-6-IIT' ? 'Class 6' : o));
      options = [...new Set(options)].filter((o) => o !== 'IIT-6' && o !== 'Class-6-IIT');
      if (!options.includes('Class 6')) options = [...options, 'Class 6'].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    }
    return options;
  }, [classRows, board]);

  return {
    classOptions,
    subjects,
    topics,
    subtopics,
    loadingClasses,
    loadingSubjects,
    loadingTopics,
    loadingSubtopics,
  };
}
