import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import authService from '../services/api/authService';
import { resetSessionBaseline } from '../lib/session-time-sync';

type LoginPayload = {
  email: string;
  password: string;
};

type AuthState = {
  token: string | null;
  role: string | null;
  user: any;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (payload: LoginPayload) => Promise<any>;
  signOut: () => Promise<void>;
  refreshAuth: (options?: { silent?: boolean }) => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAuth = async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    if (!silent) {
      setIsLoading(true);
    }
    try {
      const stored = await authService.getStoredAuth();
      if (!stored?.token) {
        setToken(null);
        setRole(null);
        setUser(null);
        return;
      }

      setToken(stored.token);
      setRole(stored.role);
      const me = await authService.me();
      setUser(me?.user || null);
      if (me?.user?.role) {
        setRole(me.user.role);
      }
    } catch (error) {
      await authService.clearAuth();
      setToken(null);
      setRole(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshAuth();
  }, []);

  const signIn = async (payload: LoginPayload) => {
    resetSessionBaseline();
    const data = await authService.login(payload);
    setToken(data?.token || null);
    setRole(data?.user?.role || null);
    try {
      const me = await authService.me();
      setUser(me?.user || data?.user || null);
      if (me?.user?.role) setRole(me.user.role);
    } catch {
      setUser(data?.user || null);
    }
    return data;
  };

  const signOut = async () => {
    await authService.logout();
    resetSessionBaseline();
    setToken(null);
    setRole(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({
      token,
      role,
      user,
      isLoading,
      isAuthenticated: Boolean(token),
      signIn,
      signOut,
      refreshAuth,
    }),
    [token, role, user, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
