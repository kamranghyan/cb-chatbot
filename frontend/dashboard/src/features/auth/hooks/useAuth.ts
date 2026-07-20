'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services';
import { clearUserSession, getSavedUserSession, saveUserSession } from '@/core/api/session';

/**
 * Backend auth is a single POST /auth/dev-token { email } -> access_token.
 * This endpoint is explicitly LOCAL-ONLY per the backend README — it will
 * not work against dev/qa/prod. When a real login endpoint exists, only
 * this hook + auth.service.ts need to change.
 */
export function useAuth() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    setIsAuthenticated(Boolean(getSavedUserSession()?.accessToken));
  }, []);

  const login = useCallback(async (email: string) => {
    const res = await authService.getDevToken(email);
    saveUserSession({ accessToken: res.data.access_token, email });
    setIsAuthenticated(true);
    router.push('/admin/conversations');
  }, [router]);

  const logout = useCallback(() => {
    clearUserSession();
    setIsAuthenticated(false);
    router.push('/login');
  }, [router]);

  return { isAuthenticated, login, logout };
}
