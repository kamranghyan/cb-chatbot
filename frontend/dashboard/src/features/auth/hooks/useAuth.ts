'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services';
import { clearUserSession, getSavedUserSession, saveUserSession } from '@/core/api/session';

/**
 * Minimal session hook. In mock mode the login endpoint is served by
 * src/core/api/mock (any credentials succeed); against the real backend
 * the exact same code path authenticates for real.
 */
export function useAuth() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    setIsAuthenticated(Boolean(getSavedUserSession()?.accessToken));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authService.login(email, password);
    saveUserSession(res.data);
    setIsAuthenticated(true);
    router.push('/admin/users');
  }, [router]);

  const logout = useCallback(() => {
    clearUserSession();
    setIsAuthenticated(false);
    router.push('/login');
  }, [router]);

  return { isAuthenticated, login, logout };
}
