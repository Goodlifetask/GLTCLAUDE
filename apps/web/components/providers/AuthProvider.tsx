'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/auth';
import { api } from '../../lib/api';

const PUBLIC_PATHS = ['/login', '/register', '/verify', '/forgot-password', '/reset-password', '/onboarding'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, setUser, setLoading, logout } = useAuthStore();
  const router   = useRouter();
  const pathname = usePathname();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['me'],
    queryFn:  () => api.users.me(),
    retry:    false,
    enabled:  !PUBLIC_PATHS.includes(pathname ?? ''),
  });

  useEffect(() => {
    if (data?.data) setUser(data.data);
  }, [data, setUser]);

  useEffect(() => {
    setLoading(isLoading);
  }, [isLoading, setLoading]);

  useEffect(() => {
    if (isError) {
      logout();
      if (!PUBLIC_PATHS.includes(pathname ?? '')) {
        router.push('/login');
      }
    }
  }, [isError, logout, pathname, router]);

  return <>{children}</>;
}
