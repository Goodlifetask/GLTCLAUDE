'use client';

import { useMemo } from 'react';
import { REMINDER_CATEGORIES } from '@glt/shared';
import { useAuthStore } from '../store/auth';

export interface CategoryDef {
  slug:   string;
  name:   string;
  icon:   string;
  color:  string;
  custom?: boolean;
}

/**
 * Returns system REMINDER_CATEGORIES merged with the current user's
 * custom categories (stored in localStorage as glt_custom_cats_<userId>).
 */
export function useAllCategories(): CategoryDef[] {
  const user = useAuthStore(s => s.user);

  return useMemo(() => {
    const system: CategoryDef[] = REMINDER_CATEGORIES.map(c => ({
      slug:  c.slug,
      name:  c.name,
      icon:  c.icon,
      color: c.color,
    }));

    if (!user?.id || typeof window === 'undefined') return system;

    try {
      const raw = localStorage.getItem(`glt_custom_cats_${user.id}`);
      if (!raw) return system;
      const custom: CategoryDef[] = (JSON.parse(raw) as any[]).map(c => ({
        slug:   c.slug,
        name:   c.name,
        icon:   c.icon  || '📁',
        color:  c.color || '#6C4EFF',
        custom: true,
      }));
      return [...system, ...custom];
    } catch {
      return system;
    }
  }, [user?.id]);
}
