import { createContext, useContext, useEffect, useState } from 'react';
import { userService } from '../services/userService';
import { getToken, clearToken } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore the session: if a token is saved, ask the server who it belongs to
  useEffect(() => {
    let cancelled = false;
    const restore = async () => {
      if (!getToken()) { setLoading(false); return; }
      try {
        const me = await userService.me();
        if (!cancelled) setUser(me);
      } catch {
        clearToken();
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    restore();
    return () => { cancelled = true; };
  }, []);

  const login = async (email, password) => {
    try {
      const found = await userService.login(email, password);
      setUser({ id: found.id, name: found.name, email: found.email, role: found.role, avatar: found.avatar });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || 'Login failed — please try again' };
    }
  };

  const logout = () => {
    setUser(null);
    clearToken();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// Role permission map: which routes each role can access
export const rolePermissions = {
  Admin: ['dashboard', 'inventory', 'warehouses', 'stock-movement', 'suppliers', 'orders', 'reports', 'users'],
  'Warehouse Manager': ['dashboard', 'inventory', 'warehouses', 'stock-movement', 'suppliers', 'orders', 'reports'],
  'Inventory Staff': ['dashboard', 'inventory', 'warehouses', 'stock-movement'],
  'Sales Staff': ['dashboard', 'inventory', 'suppliers', 'orders', 'reports'],
};

export function canAccess(role, route) {
  return (rolePermissions[role] || []).includes(route);
}
