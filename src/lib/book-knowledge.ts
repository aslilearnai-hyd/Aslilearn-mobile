import api from '../services/api/api';

export type BookRow = {
  _id: string;
  title: string;
  board: string;
  class: string;
  subject: string;
  topic?: string;
  subtopic?: string;
  chunkCount?: number;
  processingStatus?: string;
  embeddingsCreated?: boolean;
  contentId?: string;
  extractedTextLength?: number;
  chapters?: Array<{ title?: string; topic?: string }>;
};

export type ImportableContentRow = {
  contentId: string;
  title: string;
  type: string;
  board: string;
  classNumber: string;
  subjectName: string;
  topic?: string;
  imported: boolean;
  bookId?: string | null;
  bookStatus?: string | null;
  bookChunkCount?: number;
};

const IMPORT_TIMEOUT_MS = 60_000;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function pickString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    const obj = asRecord(value);
    if (obj) {
      const nested = pickString(obj._id, obj.id, obj.$oid);
      if (nested) return nested;
    }
  }
  return '';
}

function unwrapList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const root = asRecord(payload);
  if (!root) return [];
  if (Array.isArray(root.data)) return root.data;
  if (Array.isArray(root.items)) return root.items;
  if (Array.isArray(root.results)) return root.results;
  const nested = asRecord(root.data);
  if (nested) {
    if (Array.isArray(nested.items)) return nested.items;
    if (Array.isArray(nested.results)) return nested.results;
    if (Array.isArray(nested.content)) return nested.content;
  }
  return [];
}

function normalizeImportableRow(raw: unknown): ImportableContentRow | null {
  const row = asRecord(raw);
  if (!row) return null;

  const contentId = pickString(row.contentId, row.content_id, row._id, row.id);
  if (!contentId) return null;

  const subject = asRecord(row.subject);
  const subjectName = pickString(
    row.subjectName,
    row.subject_name,
    subject?.name,
    row.subject,
  );

  return {
    contentId,
    title: pickString(row.title, row.name) || 'Untitled',
    type: pickString(row.type, row.contentType, row.content_type) || 'TextBook',
    board: pickString(row.board) || '',
    classNumber: pickString(row.classNumber, row.class_number, row.class, row.classLabel) || '',
    subjectName,
    topic: pickString(row.topic, row.chapter) || undefined,
    imported: Boolean(row.imported ?? row.isImported ?? row.linked),
    bookId: pickString(row.bookId, row.book_id) || null,
    bookStatus: pickString(row.bookStatus, row.book_status, row.processingStatus) || null,
    bookChunkCount:
      typeof row.bookChunkCount === 'number'
        ? row.bookChunkCount
        : typeof row.chunkCount === 'number'
          ? row.chunkCount
          : undefined,
  };
}

function importErrorMessage(err: any, fallback: string) {
  const raw = String(
    err?.friendlyMessage ||
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err?.message ||
      '',
  ).trim();

  // Backend tried to open a Subject & Content PDF that is missing on disk.
  if (/ENOENT|no such file or directory/i.test(raw)) {
    const fileMatch = raw.match(/content-[^'"/\s]+\.pdf/i);
    const fileHint = fileMatch ? ` (${fileMatch[0]})` : '';
    return (
      `The PDF for this content is missing on the server${fileHint}. ` +
      `Re-upload the file in Subject & Content, then try Import again.`
    );
  }

  return raw || fallback;
}

export async function fetchBookKnowledgeBooks() {
  const res = await api.get<{ success: boolean; data?: BookRow[]; message?: string }>(
    '/api/book-knowledge/books',
  );
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load books');
  return Array.isArray(res.data.data) ? res.data.data : [];
}

export async function fetchImportableContent() {
  const res = await api.get<{ success?: boolean; data?: unknown; message?: string }>(
    '/api/book-knowledge/importable-content',
  );
  if (res.data?.success === false) {
    throw new Error(res.data?.message || 'Failed to load importable content');
  }
  return unwrapList(res.data?.data ?? res.data)
    .map(normalizeImportableRow)
    .filter((row): row is ImportableContentRow => Boolean(row));
}

export async function importBookFromContent(contentId: string) {
  const id = String(contentId || '').trim();
  if (!id) throw new Error('Missing content id for import.');

  try {
    const res = await api.post<{
      success: boolean;
      message?: string;
      alreadyImported?: boolean;
      data?: BookRow & { title?: string };
    }>(
      '/api/book-knowledge/books/import-from-content',
      // Send common aliases — backends vary on the field name.
      { contentId: id, content_id: id, id },
      { timeout: IMPORT_TIMEOUT_MS },
    );
    if (!res.data?.success) throw new Error(res.data?.message || 'Import failed');
    return res.data;
  } catch (err: any) {
    throw Object.assign(err instanceof Error ? err : new Error(importErrorMessage(err, 'Import failed')), {
      friendlyMessage: importErrorMessage(err, 'Import failed'),
    });
  }
}

export async function importBooksFromContentBulk(contentIds: string[]) {
  const ids = (contentIds || []).map((id) => String(id || '').trim()).filter(Boolean);
  if (!ids.length) throw new Error('Select at least one content item to import.');

  try {
    const res = await api.post<{
      success: boolean;
      message?: string;
      summary?: { imported?: number; skipped?: number; failed?: number };
      data?: Array<{
        success?: boolean;
        title?: string;
        contentId?: string;
        message?: string;
      }>;
    }>(
      '/api/book-knowledge/books/import-from-content/bulk',
      { contentIds: ids, content_ids: ids, ids },
      { timeout: IMPORT_TIMEOUT_MS },
    );
    if (!res.data?.success) throw new Error(res.data?.message || 'Bulk import failed');
    return res.data;
  } catch (err: any) {
    throw Object.assign(
      err instanceof Error ? err : new Error(importErrorMessage(err, 'Bulk import failed')),
      { friendlyMessage: importErrorMessage(err, 'Bulk import failed') },
    );
  }
}

export async function uploadBookKnowledgePdf(formData: FormData) {
  const res = await api.post<{ success: boolean; message?: string; data?: BookRow }>(
    '/api/book-knowledge/books/upload',
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: IMPORT_TIMEOUT_MS,
    },
  );
  if (!res.data?.success) throw new Error(res.data?.message || 'Upload failed');
  return res.data;
}

export async function reindexBookKnowledgeBook(id: string) {
  const res = await api.post<{
    success: boolean;
    message?: string;
    data?: { chunkCount?: number };
  }>(`/api/book-knowledge/books/${id}/reindex`, undefined, { timeout: IMPORT_TIMEOUT_MS });
  if (!res.data?.success) throw new Error(res.data?.message || 'Reindex failed');
  return res.data;
}

export async function deleteBookKnowledgeBook(id: string) {
  const res = await api.delete<{ success: boolean; message?: string }>(
    `/api/book-knowledge/books/${id}`,
  );
  if (!res.data?.success) throw new Error(res.data?.message || 'Delete failed');
  return res.data;
}
