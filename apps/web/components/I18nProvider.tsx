'use client';
import { useEffect } from 'react';
import '../lib/i18n';
import i18n from '../lib/i18n';
import { useAuthStore } from '../store/auth';

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const user = useAuthStore(s => s.user);

  useEffect(() => {
    const locale = user?.locale || 'en';
    if (i18n.language !== locale) {
      i18n.changeLanguage(locale);
    }
  }, [user?.locale]);

  return <>{children}</>;
}
