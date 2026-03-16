'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { AuthResponse, AdminUserInfo, RefreshResponse } from '@/lib/types/api';

const TOKEN_KEY = 'sunnyseat-admin-token';
const REFRESH_TOKEN_KEY = 'sunnyseat-admin-refresh-token';
const USER_KEY = 'sunnyseat-admin-user';

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: AdminUserInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

function getStoredRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

function getStoredUser(): AdminUserInfo | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function parseJwtExp(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    token: null,
    refreshToken: null,
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAuth = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
    setState({
      token: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  const scheduleRefresh = useCallback(
    (token: string, currentRefreshToken: string) => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      const exp = parseJwtExp(token);
      if (!exp) return;

      // Refresh 2 minutes before expiry
      const delay = Math.max(exp - Date.now() - 2 * 60 * 1000, 10_000);
      refreshTimeoutRef.current = setTimeout(async () => {
        try {
          const res = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: currentRefreshToken }),
          });
          if (!res.ok) {
            clearAuth();
            return;
          }
          const data: RefreshResponse = await res.json();
          localStorage.setItem(TOKEN_KEY, data.accessToken);
          setState((prev) => ({ ...prev, token: data.accessToken }));
          scheduleRefresh(data.accessToken, currentRefreshToken);
        } catch {
          clearAuth();
        }
      }, delay);
    },
    [clearAuth]
  );

  const login = useCallback(
    async (username: string, password: string): Promise<{ ok: boolean; error?: string }> => {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });
        if (!res.ok) {
          const data = await res.json();
          return { ok: false, error: data.detail || data.error || 'Inloggning misslyckades' };
        }
        const data: AuthResponse = await res.json();
        localStorage.setItem(TOKEN_KEY, data.accessToken);
        localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        setState({
          token: data.accessToken,
          refreshToken: data.refreshToken,
          user: data.user,
          isAuthenticated: true,
          isLoading: false,
        });
        scheduleRefresh(data.accessToken, data.refreshToken);
        return { ok: true };
      } catch {
        return { ok: false, error: 'Nätverksfel. Försök igen.' };
      }
    },
    [scheduleRefresh]
  );

  const logout = useCallback(async () => {
    const rt = getStoredRefreshToken();
    if (rt) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: rt }),
        });
      } catch {
        // ignore network errors on logout
      }
    }
    clearAuth();
  }, [clearAuth]);

  // Check auth on mount
  useEffect(() => {
    const token = getStoredToken();
    const refreshTokenStored = getStoredRefreshToken();
    const user = getStoredUser();

    if (!token) {
      setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    // Validate token with /api/auth/me
    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (res.ok) {
          const userData: AdminUserInfo = await res.json();
          localStorage.setItem(USER_KEY, JSON.stringify(userData));
          setState({
            token,
            refreshToken: refreshTokenStored,
            user: userData,
            isAuthenticated: true,
            isLoading: false,
          });
          if (refreshTokenStored) {
            scheduleRefresh(token, refreshTokenStored);
          }
        } else {
          // Token invalid — try refresh
          if (refreshTokenStored) {
            const refreshRes = await fetch('/api/auth/refresh', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refreshToken: refreshTokenStored }),
            });
            if (refreshRes.ok) {
              const data: RefreshResponse = await refreshRes.json();
              localStorage.setItem(TOKEN_KEY, data.accessToken);
              // Re-fetch user with new token
              const meRes = await fetch('/api/auth/me', {
                headers: { Authorization: `Bearer ${data.accessToken}` },
              });
              if (meRes.ok) {
                const freshUser: AdminUserInfo = await meRes.json();
                localStorage.setItem(USER_KEY, JSON.stringify(freshUser));
                setState({
                  token: data.accessToken,
                  refreshToken: refreshTokenStored,
                  user: freshUser,
                  isAuthenticated: true,
                  isLoading: false,
                });
                scheduleRefresh(data.accessToken, refreshTokenStored);
                return;
              }
            }
          }
          clearAuth();
        }
      })
      .catch(() => {
        // Network error — use cached user if available
        if (user) {
          setState({
            token,
            refreshToken: refreshTokenStored,
            user,
            isAuthenticated: true,
            isLoading: false,
          });
        } else {
          clearAuth();
        }
      });

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [clearAuth, scheduleRefresh]);

  return {
    ...state,
    login,
    logout,
  };
}
