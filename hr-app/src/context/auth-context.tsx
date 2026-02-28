"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getUser, getToken, clearAuth, AuthUser } from "@/lib/auth";
import { rbacApi } from "@/lib/api";

interface AuthContextType {
  user: AuthUser | null;
  permissions: string[];
  roles: any[];
  loading: boolean;
  hasPermission: (permission: string) => boolean;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  permissions: [],
  roles: [],
  loading: true,
  hasPermission: () => false,
  logout: () => {},
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
  const u = getUser();
  const token = getToken();
  console.log('refresh called - user:', u);
  console.log('refresh called - token:', token ? 'exists' : 'missing');
  if (!u || !token) { setLoading(false); return; }

  setUser(u);
  try {
    console.log('fetching permissions for:', u.userId);
    const [perms, userRoles] = await Promise.all([
      rbacApi.myPermissions(u.userId),
      rbacApi.myRoles(u.userId),
    ]);
    console.log('perms:', perms);
    console.log('roles:', userRoles);
    setPermissions(perms);
    setRoles(userRoles);
  } catch (err) {
    console.error('Auth refresh error:', err);
  } finally {
    setLoading(false);
  }
}
  useEffect(() => { refresh(); }, []);

  function hasPermission(permission: string): boolean {
    return permissions.includes(permission);
  }

  function logout() {
    clearAuth();
    setUser(null);
    setPermissions([]);
    window.location.href = "/login";
  }

  return (
    <AuthContext.Provider value={{ user, permissions, roles, loading, hasPermission, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);