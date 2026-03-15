'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone, CheckSquare, Mail, MapPin, Calendar,
  CheckCircle2, Clock, Trash2, MoreHorizontal, RefreshCw,
} from 'lucide-react';
import { formatDistanceToNow, format, isPast } from 'date-fns';
import { api } from '../../lib/api';
import type { Reminder } from '@glt/shared';
import { REMINDER_CATEGORIES } from '@glt/shared';
import { clsx } from 'clsx';

const TYPE_ICONS: Record<string, React.ReactNode> = {
  call:     <Phone     className="w-4 h-4" />,
  task:     <CheckSquare className="w-4 h-4" />,
  email:    <Mail      className="w-4 h-4" />,
  location: <MapPin    className="w-4 h-4" />,
  event:    <Calendar  className="w-4 h-4" />,
};

const TYPE_COLORS: Record<string, string> = {
  call:     'bg-blue-100 text-blue-700',
  task:     'bg-yellow-100 text-yellow-700',
  email:    'bg-purple-100 text-purple-700',
  location: 'bg-green-100 text-green-700',
  event:    'bg-orange-100 text-orange-700',
};

const PRIORITY_COLORS: Record<string, string> = {
  low:    'border-l-gray-300',
  medium: 'border-l-yellow-400',
  high:   'border-l-orange-500',
  urgent: 'border-l-red-600',
};

interface ReminderCardProps {
  reminder: Reminder;
}

export function ReminderCard({ reminder }: ReminderCardProps) {
  const [showActions, setShowActions] = useState(false);
  const qc = useQueryClient();

  const completeMutation = useMutation({
    mutationFn: () => api.reminders.complete(reminder.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reminders'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });

  const snoozeMutation = useMutation({
    mutationFn: (minutes: number) => api.reminders.snooze(reminder.id, minutes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reminders'] });
      setShowActions(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.reminders.delete(reminder.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reminders'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });

  const fireDate  = new Date(reminder.fireAt);
  const isOverdue = isPast(fireDate) && reminder.status === 'pending';
  const isDone    = reminder.status === 'completed';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className={clsx(
        'card border-l-4 p-4 transition-all duration-150',
        PRIORITY_COLORS[reminder.priority],
        isDone    && 'opacity-60',
        isOverdue && 'bg-red-50 border-red-100',
      )}
    >
      <div className="flex items-start gap-3">
        {/* Complete Checkbox */}
        <button
          onClick={() => !isDone && completeMutation.mutate()}
          disabled={isDone || completeMutation.isPending}
          aria-label={isDone ? 'Completed' : 'Mark as complete'}
          className={clsx(
            'mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 transition-all duration-150',
            isDone
              ? 'bg-green-500 border-green-500 text-white'
              : 'border-gray-300 hover:border-[var(--color-primary)]',
          )}
        >
          {isDone && <CheckCircle2 className="w-4 h-4" />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {/* Type badge */}
            <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', TYPE_COLORS[reminder.type])}>
              {TYPE_ICONS[reminder.type]}
              {reminder.type}
            </span>

            {/* Recurrence badge */}
            {reminder.recurrence && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                <RefreshCw className="w-3 h-3" />
                Recurring
              </span>
            )}

            {/* Category badge */}
            {(reminder as any).category && (() => {
              const cat = REMINDER_CATEGORIES.find((c) => c.slug === (reminder as any).category);
              return cat ? (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ background: cat.color + '22', color: cat.color }}
                >
                  {cat.icon} {cat.name}
                </span>
              ) : null;
            })()}
          </div>

          <h4
            className={clsx(
              'font-semibold text-[var(--color-text)] text-sm leading-snug',
              isDone && 'line-through text-[var(--color-text-muted)]',
            )}
          >
            {reminder.title}
          </h4>

          {reminder.notes && (
            <p className="text-xs text-[var(--color-text-muted)] mt-1 truncate">
              {reminder.notes}
            </p>
          )}

          <div className="flex items-center gap-3 mt-2">
            <span
              className={clsx(
                'inline-flex items-center gap-1 text-xs',
                isOverdue ? 'text-red-600 font-semibold' : 'text-[var(--color-text-muted)]',
              )}
            >
              <Clock className="w-3 h-3" />
              {isOverdue
                ? `${formatDistanceToNow(fireDate)} ago`
                : format(fireDate, 'MMM d, h:mm a')}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 ml-2">
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              aria-label="More actions"
              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            <AnimatePresence>
              {showActions && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1,    y: 0 }}
                  exit={{   opacity: 0, scale: 0.95, y: -4 }}
                  className="absolute right-0 top-full mt-1 w-44 bg-white rounded-md shadow-dark border border-gray-100 z-10 py-1"
                >
                  {!isDone && (
                    <>
                      <button
                        onClick={() => snoozeMutation.mutate(15)}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-gray-700"
                      >
                        Snooze 15 min
                      </button>
                      <button
                        onClick={() => snoozeMutation.mutate(60)}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-gray-700"
                      >
                        Snooze 1 hour
                      </button>
                      <button
                        onClick={() => snoozeMutation.mutate(1440)}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-gray-700"
                      >
                        Snooze 1 day
                      </button>
                      <hr className="my-1 border-gray-100" />
                    </>
                  )}
                  <button
                    onClick={() => {
                      deleteMutation.mutate();
                      setShowActions(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-600"
                  >
                    <span className="flex items-center gap-2">
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
