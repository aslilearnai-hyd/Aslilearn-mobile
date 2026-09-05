import { API_BASE_URL } from '../services/api/api';
import { storageGetItem } from './safe-storage';

/** Re-export so `import { API_BASE_URL } from '.../api-config'` resolves (not only default export). */
export { API_BASE_URL };

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const url = endpoint.startsWith('http') 
    ? endpoint 
    : `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  
  // Use safe-storage — SecureStore can abort the process on some Android devices.
  const token = await storageGetItem('authToken');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...(options.headers || {}),
  };
  
  return fetch(url, {
    ...options,
    headers,
  });
};

export default API_BASE_URL;

