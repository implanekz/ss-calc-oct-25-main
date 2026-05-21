import { API_BASE_URL } from '../config/api';

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await response.json().catch(() => ({}))
    : await response.text();

  if (!response.ok) {
    const detail = data?.detail ?? data?.error ?? data?.message ?? data;
    const message = typeof detail === 'string' ? detail : JSON.stringify(detail);
    throw new ApiError(message || `Request failed: ${response.status}`, response.status, data);
  }

  return data;
}

export function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}
