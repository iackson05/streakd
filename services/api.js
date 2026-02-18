import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'http://localhost:8000';

const TOKEN_KEYS = {
  ACCESS: 'streakd_access_token',
  REFRESH: 'streakd_refresh_token',
};

// ============================================
// TOKEN MANAGEMENT
// ============================================

export const getTokens = async () => {
  const [access, refresh] = await Promise.all([
    AsyncStorage.getItem(TOKEN_KEYS.ACCESS),
    AsyncStorage.getItem(TOKEN_KEYS.REFRESH),
  ]);
  return { access, refresh };
};

export const saveTokens = async (access, refresh) => {
  await Promise.all([
    AsyncStorage.setItem(TOKEN_KEYS.ACCESS, access),
    AsyncStorage.setItem(TOKEN_KEYS.REFRESH, refresh),
  ]);
};

export const clearTokens = async () => {
  await Promise.all([
    AsyncStorage.removeItem(TOKEN_KEYS.ACCESS),
    AsyncStorage.removeItem(TOKEN_KEYS.REFRESH),
  ]);
};

// ============================================
// HTTP CLIENT
// ============================================

let isRefreshing = false;
let refreshPromise = null;

const refreshAccessToken = async () => {
  if (isRefreshing) return refreshPromise;

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const { refresh } = await getTokens();
      if (!refresh) throw new Error('No refresh token');

      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refresh }),
      });

      if (!res.ok) throw new Error('Refresh failed');

      const data = await res.json();
      await saveTokens(data.access_token, data.refresh_token);
      return data.access_token;
    } catch (error) {
      await clearTokens();
      throw error;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

/**
 * Authenticated fetch wrapper.
 * Automatically attaches Authorization header and retries once on 401 with a refreshed token.
 */
export const apiFetch = async (path, options = {}) => {
  const { access } = await getTokens();

  const headers = {
    ...options.headers,
  };

  // Don't set Content-Type for FormData (browser/RN sets it with boundary)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  if (access) {
    headers['Authorization'] = `Bearer ${access}`;
  }

  let res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  // If 401 and we have a refresh token, try refreshing
  if (res.status === 401 && access) {
    try {
      const newAccess = await refreshAccessToken();
      headers['Authorization'] = `Bearer ${newAccess}`;
      res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    } catch {
      // refresh failed - caller should handle 401
    }
  }

  return res;
};

/**
 * Convenience: GET with auth
 */
export const apiGet = async (path) => {
  const res = await apiFetch(path);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `GET ${path} failed (${res.status})`);
  }
  return res.json();
};

/**
 * Convenience: POST JSON with auth
 */
export const apiPost = async (path, body) => {
  const res = await apiFetch(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `POST ${path} failed (${res.status})`);
  }
  // 204 No Content
  if (res.status === 204) return null;
  return res.json();
};

/**
 * Convenience: PUT JSON with auth
 */
export const apiPut = async (path, body) => {
  const res = await apiFetch(path, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `PUT ${path} failed (${res.status})`);
  }
  if (res.status === 204) return null;
  return res.json();
};

/**
 * Convenience: DELETE with auth
 */
export const apiDelete = async (path, body) => {
  const options = { method: 'DELETE' };
  if (body) {
    options.body = JSON.stringify(body);
  }
  const res = await apiFetch(path, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `DELETE ${path} failed (${res.status})`);
  }
  if (res.status === 204) return null;
  return res.json();
};
