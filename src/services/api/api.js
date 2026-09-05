import axios from 'axios';
import { storageDeleteItem, storageGetItem, storageSetItem } from '../../lib/safe-storage';

const DEV_URL = 'https://api.aslilearn.ai';
const PROD_URL = 'https://api.aslilearn.ai';

const normalizeBaseUrl = (value) => {
  if (!value || typeof value !== 'string') return '';
  return value.replace(/\/+$/, '');
};

const getBaseUrl = () => {
  const envBase = normalizeBaseUrl(process.env.EXPO_PUBLIC_API_URL);
  if (envBase) return envBase;
  return __DEV__ ? DEV_URL : PROD_URL;
};

export const API_BASE_URL = getBaseUrl();
export const AUTH_TOKEN_KEY = 'authToken';
const TOKEN_KEYS = [AUTH_TOKEN_KEY, 'token', 'accessToken', 'jwtToken'];
let inMemoryAuthToken = null;

export const setInMemoryAuthToken = (token) => {
  inMemoryAuthToken = token || null;
};

const readTokenFromStorage = async () => {
  for (const key of TOKEN_KEYS) {
    const value = await storageGetItem(key);
    if (value) {
      // Normalize legacy keys to primary key.
      if (key !== AUTH_TOKEN_KEY) {
        await storageSetItem(AUTH_TOKEN_KEY, value);
      }
      return value;
    }
  }
  return null;
};

if (__DEV__) {
  // Keep API target visibility in development only.
  // eslint-disable-next-line no-console
  console.log(`[API] baseURL: ${API_BASE_URL}`);
}

const api = axios.create({
  baseURL: API_BASE_URL,
  // Emulators / slow mobile networks often need more than 20s for authenticated routes.
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    const token = inMemoryAuthToken || (await readTokenFromStorage());
    if (token) {
      inMemoryAuthToken = token;
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error?.response?.status === 401) {
      const serverMessage = String(
        error?.response?.data?.message || error?.response?.data?.error || ''
      ).toLowerCase();
      const shouldClearAuth =
        serverMessage.includes('token expired') ||
        serverMessage.includes('invalid token') ||
        serverMessage.includes('jwt') ||
        serverMessage.includes('unauthorized');

      // Do not clear token for every 401, because permission/route issues can also return 401.
      if (shouldClearAuth) {
        inMemoryAuthToken = null;
        for (const key of TOKEN_KEYS) {
          await storageDeleteItem(key);
        }
        await storageDeleteItem('userRole');
        await storageDeleteItem('userEmail');
      }
    }

    const data = error?.response?.data;
    const baseMessage =
      (typeof data?.message === 'string' && data.message) ||
      (typeof data?.error === 'string' && data.error) ||
      null;

    let detailMessage = '';
    const errors = data?.errors;
    if (Array.isArray(errors) && errors.length > 0) {
      detailMessage = errors
        .map((item) => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object') {
            return item.message || item.msg || null;
          }
          return null;
        })
        .filter(Boolean)
        .join('\n');
    } else if (errors && typeof errors === 'object') {
      detailMessage = Object.entries(errors)
        .map(([key, value]) => {
          const text = Array.isArray(value) ? value.join(', ') : String(value);
          return text ? `${key}: ${text}` : null;
        })
        .filter(Boolean)
        .join('\n');
    }

    // Prefer concrete field errors over the generic "Validation failed" label.
    const isTimeout =
      error?.code === 'ECONNABORTED' ||
      String(error?.message || '').toLowerCase().includes('timeout');
    const isNetwork =
      error?.code === 'ERR_NETWORK' ||
      String(error?.message || '').toLowerCase().includes('network error');

    const message =
      detailMessage ||
      baseMessage ||
      (isTimeout ? 'Request timed out. Pull to refresh and try again.' : null) ||
      (isNetwork
        ? `Unable to connect to server (${API_BASE_URL}). Check Wi‑Fi/data and try again.`
        : null) ||
      'Something went wrong. Please try again.';

    return Promise.reject({
      ...error,
      friendlyMessage: message,
      isTimeout,
      isNetworkError: isNetwork,
    });
  }
);

export default api;
