import { apiFetch } from '../../lib/api-config';

async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await apiFetch(endpoint, options);
  if (!res.ok) {
    let message = `Request failed: ${res.status}`;
    try {
      const json = await res.json();
      if (json?.message) message = String(json.message);
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return res.json();
}

const vidyaService = {
  getChatSessions: async (userId: string) => {
    const data = await fetchJson<{ success?: boolean; sessions?: unknown[] }>(
      `/api/users/${userId}/chat-sessions`,
    );
    return Array.isArray(data?.sessions) ? data.sessions : [];
  },

  aiChat: (body: { userId: string; message: string; context?: Record<string, unknown> }) =>
    fetchJson<any>('/api/ai-chat', { method: 'POST', body: JSON.stringify(body) }),

  studentChat: (body: {
    message: string;
    studentId: string;
    history?: Array<{ role: string; content: string }>;
  }) =>
    fetchJson<any>('/api/vidya/student/chat', { method: 'POST', body: JSON.stringify(body) }),

  analyzeImage: (body: { image: string; context?: string }) =>
    fetchJson<any>('/api/ai-chat/analyze-image', { method: 'POST', body: JSON.stringify(body) }),

  getStudentFocusCard: () => fetchJson<any>('/api/vidya/student/focus-card'),

  controlQuery: (body: { message: string; history?: Array<{ role: string; content: string }> }) =>
    fetchJson<any>('/api/vidya/control/query', { method: 'POST', body: JSON.stringify(body) }),

  getControlHistory: (limit = 50) =>
    fetchJson<{ success: boolean; items: Array<{ prompt: string; responseText: string; createdAt?: string }> }>(
      `/api/vidya/control/history?limit=${limit}`
    ),

  clearControlHistory: () =>
    fetchJson<any>('/api/vidya/control/history', { method: 'DELETE' }),
};

export default vidyaService;
