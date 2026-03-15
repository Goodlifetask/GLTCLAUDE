export interface ReminderCategory {
  name: string;
  color: string;
  icon: string;
  slug: string;
}

/** System-defined categories (matches admin SYSCATS) */
export const REMINDER_CATEGORIES: ReminderCategory[] = [
  { slug: 'work',      name: 'Work',       color: '#6366f1', icon: '💼' },
  { slug: 'personal',  name: 'Personal',   color: '#f59e0b', icon: '🏠' },
  { slug: 'health',    name: 'Health',     color: '#10b981', icon: '🏥' },
  { slug: 'finance',   name: 'Finance',    color: '#3b82f6', icon: '💰' },
  { slug: 'family',    name: 'Family',     color: '#8b5cf6', icon: '👨‍👩‍👧' },
  { slug: 'travel',    name: 'Travel',     color: '#ef4444', icon: '✈️' },
  { slug: 'shopping',  name: 'Shopping',   color: '#f59e0b', icon: '🛍️' },
  { slug: 'education', name: 'Education',  color: '#6366f1', icon: '📚' },
];

export const CATEGORY_SLUGS = REMINDER_CATEGORIES.map((c) => c.slug) as [string, ...string[]];

export function getCategoryBySlug(slug: string): ReminderCategory | undefined {
  return REMINDER_CATEGORIES.find((c) => c.slug === slug);
}
