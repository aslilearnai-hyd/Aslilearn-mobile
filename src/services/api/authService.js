import api, { AUTH_TOKEN_KEY, setInMemoryAuthToken } from './api';
import { storageDeleteItem, storageGetItem, storageSetItem } from '../../lib/safe-storage';

const USER_ROLE_KEY = 'userRole';
const USER_EMAIL_KEY = 'userEmail';

const persistAuth = async (token, user) => {
  const role = normalizeRole(user?.role) || 'student';
  const email = user?.email || '';
  await storageSetItem(AUTH_TOKEN_KEY, token);
  // Keep interceptor auth in sync immediately after login.
  setInMemoryAuthToken(token);
  await storageSetItem(USER_ROLE_KEY, role);
  await storageSetItem(USER_EMAIL_KEY, email);
};

const clearAuth = async () => {
  setInMemoryAuthToken(null);
  await storageDeleteItem(AUTH_TOKEN_KEY);
  await storageDeleteItem(USER_ROLE_KEY);
  await storageDeleteItem(USER_EMAIL_KEY);
};

/** Normalize API role variants: super_admin → super-admin */
const normalizeRole = (role) => {
  if (!role || typeof role !== 'string') return '';
  return role.trim().toLowerCase().replace(/_/g, '-');
};

const login = async ({ email, password }) => {
  const payload = {
    email: String(email || '').trim().toLowerCase(),
    password: String(password || ''),
  };

  const response = await api.post('/api/auth/login', payload);
  const data = response?.data || {};

  if (!data?.token || !data?.user) {
    throw new Error('Invalid login response from server.');
  }

  if (data.user?.role) {
    data.user = { ...data.user, role: normalizeRole(data.user.role) || data.user.role };
  }

  await persistAuth(data.token, data.user);
  return data;
};

const me = async () => {
  const response = await api.get('/api/auth/me');
  return response?.data;
};

const logout = async () => {
  try {
    await api.post('/api/auth/logout');
  } catch (_) {
    // Local logout should still complete even if server call fails.
  } finally {
    await clearAuth();
  }
};

const register = async (payload) => {
  const response = await api.post('/api/auth/register', payload);
  return response?.data;
};

const getStoredAuth = async () => {
  const token = (await storageGetItem(AUTH_TOKEN_KEY)) || null;
  if (token) {
    setInMemoryAuthToken(token);
  }
  return {
    token,
    role: (await storageGetItem(USER_ROLE_KEY)) || null,
    email: (await storageGetItem(USER_EMAIL_KEY)) || null,
  };
};

export default {
  login,
  me,
  logout,
  register,
  getStoredAuth,
  clearAuth,
};
