import api from '../services/api/api';
import type { GeminiCostEstimate, TokenUsageSnapshot } from './gemini-token-cost';
import type { BookBasedToolId } from './book-based-tools';
import { dedupeGroupedTools, type GroupedTool } from './ai-generator';

export type BookGeneratorBatchResult = {
  success: boolean;
  savedCount: number;
  failedCount: number;
  batchSize: number;
  failures?: string[];
  tokenUsage?: TokenUsageSnapshot & { totals?: TokenUsageSnapshot['totals'] };
  cost?: GeminiCostEstimate;
  message?: string;
  locked?: boolean;
};

export type BookGeneratorGeneratePayload = {
  toolSlug: BookBasedToolId | string;
  toolName?: string;
  board: string;
  className: string;
  subjectName: string;
  topicName: string;
  subtopicName: string;
  bookId: string;
  batchSize: number;
  useBookKnowledge?: boolean;
  forceGenerate?: boolean;
  forceUnlock?: boolean;
  extraParams?: Record<string, unknown>;
};

export async function generateBookBatch(payload: BookGeneratorGeneratePayload) {
  const res = await api.post<{ success: boolean; data?: BookGeneratorBatchResult; message?: string }>(
    '/api/book-generator/generate-batch',
    payload,
  );
  const data = res.data?.data;
  if (res.status === 409 || data?.locked) {
    const err = new Error(res.data?.message || 'Generation locked');
    (err as Error & { locked?: boolean }).locked = true;
    throw err;
  }
  if (!res.data?.success && !data?.savedCount) {
    throw new Error(res.data?.message || 'Book batch generation failed');
  }
  return { ...(data || {}), success: Boolean(res.data?.success), message: res.data?.message };
}

export async function releaseBookGeneratorLock(payload: Partial<BookGeneratorGeneratePayload>) {
  const res = await api.post<{ success: boolean; message?: string; data?: { released?: number } }>(
    '/api/book-generator/release-lock',
    payload,
  );
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to release lock');
  return res.data;
}

export async function fetchBookGeneratorRecords(boardFilter?: string) {
  const params: Record<string, string> = {};
  if (boardFilter && boardFilter !== '__all__') params.board = boardFilter;
  const res = await api.get<{
    success: boolean;
    data?: { grouped?: GroupedTool[]; total?: number; loadedCount?: number; truncated?: boolean };
    message?: string;
  }>('/api/book-generator/records', { params });
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load records');
  const grouped = Array.isArray(res.data.data?.grouped) ? res.data.data.grouped : [];
  return {
    grouped: dedupeGroupedTools(grouped),
    total: Number(res.data.data?.total || 0),
    loadedCount: Number(res.data.data?.loadedCount || 0),
    truncated: Boolean(res.data.data?.truncated),
  };
}
