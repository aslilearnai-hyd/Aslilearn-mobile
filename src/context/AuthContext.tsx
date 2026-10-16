import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import authService from '../services/api/authService';
import { onSessionExpired } from '../services/api/api';
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
  /** True once stored-session restore finished (/me ok, cleared, or no token). */
  sessionResolved: boolean;
  isAuthenticated: boolean;
  signIn: (payload: LoginPayload) => Promise<any>;
  signOut: () => Promise<void>;
  refreshAuth: (options?: { silent?: boolean }) => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

function isAuthNetworkIssue(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const maybe = error as { isTimeout?: unknown; isNetworkError?: unknown };
  return Boolean(maybe.isTimeout || maybe.isNetworkError);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionResolved, setSessionResolved] = useState(false);

  const refreshAuth = async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    if (!silent) {
      setIsLoading(true);
      setSessionResolved(false);
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
      // Release the splash as soon as we have a stored session. /me can be slow
      // on mobile networks and must not pin the branded overlay for up to 60s.
      // AuthGate still waits on sessionResolved before opening paid routes.
      if (!silent) {
        setIsLoading(false);
      }

      try {
        const me = await authService.me();
        setUser(me?.user || null);
        if (me?.user?.role) {
          setRole(me.user.role);
        }
      } catch (error) {
        if (!isAuthNetworkIssue(error)) {
          await authService.clearAuth();
          setToken(null);
          setRole(null);
          setUser(null);
        }
      }
    } catch {
      await authService.clearAuth();
      setToken(null);
      setRole(null);
      setUser(null);
    } finally {
      setIsLoading(false);
      setSessionResolved(true);
    }
  };

  useEffect(() => {
    refreshAuth();
  }, []);

  // The API client clears storage when the server rejects the session; mirror
  // that here so isAuthenticated flips and AuthGate redirects to login.
  useEffect(
    () =>
      onSessionExpired(() => {
        setToken(null);
        setRole(null);
        setUser(null);
        setIsLoading(false);
        setSessionResolved(true);
      }),
    []
  );

  const signIn = async (payload: LoginPayload) => {
    resetSessionBaseline();
    setSessionResolved(false);
    const data = await authService.login(payload);
    setToken(data?.token || null);
    setRole(data?.user?.role || null);
    try {
      const me = await authService.me();
      setUser(me?.user || data?.user || null);
      if (me?.user?.role) setRole(me.user.role);
    } catch {
      setUser(data?.user || null);
    } finally {
      setSessionResolved(true);
    }
    return data;
  };

  const signOut = async () => {
    await authService.logout();
    resetSessionBaseline();
    setToken(null);
    setRole(null);
    setUser(null);
    setSessionResolved(true);
  };

  const value = useMemo(
    () => ({
      token,
      role,
      user,
      isLoading,
      sessionResolved,
      isAuthenticated: Boolean(token),
      signIn,
      signOut,
      refreshAuth,
    }),
    [token, role, user, isLoading, sessionResolved]
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
