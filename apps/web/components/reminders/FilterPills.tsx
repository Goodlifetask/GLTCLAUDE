'use client';

import { clsx } from 'clsx';

type FilterType = 'all' | 'today' | 'upcoming' | 'overdue' | 'recurring' | 'completed';

const FILTERS: { value: FilterType; label: string }[] = [
  { value: 'all',       label: 'All'       },
  { value: 'today',     label: 'Today'     },
  { value: 'upcoming',  label: 'Upcoming'  },
  { value: 'overdue',   label: 'Overdue'   },
  { value: 'recurring', label: 'Recurring' },
  { value: 'completed', label: 'Completed' },
];

interface FilterPillsProps {
  active:   FilterType;
  onChange: (filter: FilterType) => void;
}

export function FilterPills({ active, onChange }: FilterPillsProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
      {FILTERS.map((f) => (
        <button
          key={f.value}
          onClick={() => onChange(f.value)}
          className={clsx(
            'shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-150',
            active === f.value
              ? 'bg-[var(--color-primary)] text-white shadow-sm'
              : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-border)]',
          )}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
