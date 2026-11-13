/**
 * api.js — one small helper that talks to the Node/MongoDB backend.
 * Adds the login token automatically and turns server errors into normal JS errors.
 */
const API = import.meta.env.VITE_API_URL || '/api'; // '/api' is forwarded to port 5000 by vite.config.js
export const TOKEN_KEY = 'stockflow_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export async function api(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Cannot reach the server. Is the backend running (npm run dev in /backend)?');
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    // Token expired / invalid while using the app → back to the login page
    if (res.status === 401 && auth) {
      clearToken();
      if (!window.location.pathname.startsWith('/login')) window.location.assign('/login');
    }
    throw new Error(data?.message || `Request failed (${res.status})`);
  }
  return data;
}
