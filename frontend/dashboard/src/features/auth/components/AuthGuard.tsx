'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../hooks/useAuth';
import { LoadingState } from '@/components/ui/LoadingState';

/** Client-side gate for authenticated areas. */
export function AuthGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated === false) router.replace('/login');
  }, [isAuthenticated, router]);

  if (isAuthenticated !== true) return <LoadingState label="Checking session…" />;
  return <>{children}</>;
}
