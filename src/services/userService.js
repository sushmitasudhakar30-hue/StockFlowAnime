/**
 * userService.js — talks to the backend (/api/users, /api/auth) which stores users in MongoDB.
 * Passwords are hashed on the server and never sent back to the browser.
 */
import { api, setToken } from './api';

// Only used for the "click to autofill" chips on the login page.
// These match the demo users the backend creates on first start (backend/seed.js).
// Delete this list (and the chips in Login.jsx) before going live.
const DEMO_USERS = [
  { role: 'Admin',             email: 'admin@stockflow.in',   password: 'admin123' },
  { role: 'Warehouse Manager', email: 'manager@stockflow.in', password: 'manager123' },
  { role: 'Inventory Staff',   email: 'staff@stockflow.in',   password: 'staff123' },
  { role: 'Sales Staff',       email: 'sales@stockflow.in',   password: 'sales123' },
];

export const userService = {
  getUsers: () => api('/users'),

  addUser: (user) => api('/users', { method: 'POST', body: user }),

  updateUser: (id, updates) => api(`/users/${id}`, { method: 'PUT', body: updates }),

  toggleUserActive: (id) => api(`/users/${id}/toggle`, { method: 'PATCH' }),

  deleteUser: async (id) => {
    await api(`/users/${id}`, { method: 'DELETE' });
    return true;
  },

  /** Logs in. Saves the token and returns the user. Throws Error(message) on failure. */
  async login(email, password) {
    const { token, user } = await api('/auth/login', { method: 'POST', body: { email, password }, auth: false });
    setToken(token);
    return user;
  },

  /** Who is logged in right now? (validates the saved token) */
  me: async () => (await api('/auth/me')).user,

  getDemoUsers: () => Promise.resolve(DEMO_USERS),
};
