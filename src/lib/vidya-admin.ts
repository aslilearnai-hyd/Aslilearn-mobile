import api from '../services/api/api';

export async function fetchVidyaUsageStory(days = 7) {
  const response = await api.get('/api/vidya/admin/usage-story', { params: { days } });
  return response?.data;
}

export async function fetchVidyaSafetyBlocks(days = 7) {
  const response = await api.get('/api/vidya/admin/safety-blocks', { params: { days } });
  return response?.data;
}

export async function fetchVidyaRetrievalTiers(days = 14) {
  const response = await api.get('/api/vidya/admin/retrieval-tiers', { params: { days } });
  return response?.data;
}

export async function fetchCurrentUser() {
  const response = await api.get('/api/auth/me');
  return response?.data?.user || response?.data || null;
}
