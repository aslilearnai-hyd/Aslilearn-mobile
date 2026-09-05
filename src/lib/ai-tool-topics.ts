import api from '../services/api/api';

const NATURAL_COLLATOR = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

export type TopicRow = {
  _id: string;
  board: string;
  classLabel: string;
  subject: string;
  label: string;
  topicName: string;
  subTopic: string;
  updatedAt?: string;
};

export type TopicFormState = {
  board: string;
  classLabel: string;
  subject: string;
  label: string;
  topicName: string;
  subTopic: string;
};

export const emptyTopicForm = (): TopicFormState => ({
  board: '',
  classLabel: '',
  subject: '',
  label: '',
  topicName: '',
  subTopic: '',
});

export function sortNatural(values: string[]) {
  return [...values].sort((a, b) => NATURAL_COLLATOR.compare(a, b));
}

export function normalizeClassLabel(value: string) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits ? `Class ${digits}` : '';
}

export function classNumberFromLabel(value: string) {
  return String(value || '').replace(/\D/g, '');
}

export function buildDisplayTopicName(label: string, topicName: string) {
  const safeLabel = String(label || '').trim();
  const safeTopic = String(topicName || '').trim();
  if (!safeLabel) return safeTopic;
  const prefix = `${safeLabel} - `;
  return safeTopic.startsWith(prefix) ? safeTopic : `${prefix}${safeTopic}`;
}

export function splitTopicByLabel(label: string, topicName: string) {
  const safeLabel = String(label || '').trim();
  const safeTopicName = String(topicName || '').trim();
  if (!safeLabel) return { label: '', topicName: safeTopicName };
  const prefix = `${safeLabel} - `;
  if (safeTopicName.startsWith(prefix)) {
    return { label: safeLabel, topicName: safeTopicName.slice(prefix.length).trim() };
  }
  return { label: safeLabel, topicName: safeTopicName };
}

export type TopicListFilters = {
  search?: string;
  board?: string;
  classLabel?: string;
  subject?: string;
  topicName?: string;
  subTopic?: string;
  page?: number;
  limit?: number;
};

export async function fetchTopicRows(filters: TopicListFilters) {
  const params: Record<string, string> = {
    page: String(filters.page ?? 1),
    limit: String(filters.limit ?? 200),
  };
  if (filters.search?.trim()) params.search = filters.search.trim();
  if (filters.board) params.board = filters.board;
  if (filters.classLabel) params.classLabel = filters.classLabel;
  if (filters.subject) params.subject = filters.subject;
  if (filters.topicName) params.topicName = filters.topicName;
  if (filters.subTopic) params.subTopic = filters.subTopic;

  const response = await api.get<{ data?: { items?: TopicRow[]; total?: number } }>(
    '/api/super-admin/ai-tool-topics',
    { params },
  );
  return {
    items: response.data?.data?.items || [],
    total: response.data?.data?.total || 0,
  };
}

export type TopicHierarchyTree = Record<string, Record<string, Record<string, string[]>>>;

export async function fetchTopicBoards() {
  const response = await api.get<{ data?: { boards?: string[] } }>(
    '/api/super-admin/ai-tool-topics/hierarchy',
  );
  return response.data?.data?.boards || [];
}

export async function fetchTopicHierarchy(board: string) {
  const response = await api.get<{ data?: { tree?: TopicHierarchyTree } }>(
    '/api/super-admin/ai-tool-topics/hierarchy',
    { params: { board } },
  );
  return response.data?.data?.tree || {};
}

export async function fetchTopicOptions(params: Record<string, string> = {}) {
  const response = await api.get<{
    data?: {
      boards?: string[];
      classes?: string[];
      subjects?: string[];
      topics?: string[];
      subTopics?: string[];
    };
  }>('/api/super-admin/ai-tool-topics/options', { params });
  return response.data?.data || {};
}

export async function createTopic(form: TopicFormState) {
  const payload = {
    ...form,
    classLabel: normalizeClassLabel(form.classLabel),
    topicName: buildDisplayTopicName(form.label, form.topicName),
  };
  const response = await api.post('/api/super-admin/ai-tool-topics', payload);
  return response.data;
}

export async function updateTopic(id: string, form: TopicFormState) {
  const payload = {
    ...form,
    classLabel: normalizeClassLabel(form.classLabel),
    topicName: buildDisplayTopicName(form.label, form.topicName),
  };
  const response = await api.put(`/api/super-admin/ai-tool-topics/${id}`, payload);
  return response.data;
}

export async function deleteTopic(id: string) {
  const response = await api.delete(`/api/super-admin/ai-tool-topics/${id}`);
  return response.data;
}

export async function bulkDeleteTopics(payload: { board: string; classLabel?: string; subject?: string }) {
  const response = await api.post<{ success?: boolean; data?: { modifiedCount?: number }; message?: string }>(
    '/api/super-admin/ai-tool-topics/bulk-delete',
    payload,
  );
  return response.data;
}

export function topicFormFromRow(row: TopicRow): TopicFormState {
  const classNumber = classNumberFromLabel(row.classLabel);
  const normalizedClass = normalizeClassLabel(classNumber);
  const splitTopic = splitTopicByLabel(row.label, row.topicName);
  return {
    board: row.board,
    classLabel: normalizedClass || row.classLabel,
    subject: row.subject,
    label: splitTopic.label,
    topicName: splitTopic.topicName,
    subTopic: row.subTopic,
  };
}

export function filterVisibleRows(rows: TopicRow[], selectedTopic: string) {
  if (!selectedTopic) return rows;
  return rows.filter((row) => buildDisplayTopicName(row.label, row.topicName) === selectedTopic);
}
