'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { CheckCircle, Clock, AlertCircle, RefreshCw, Plus } from 'lucide-react';
import { api } from '../../lib/api';
import { ReminderCard } from '../reminders/ReminderCard';
import { FilterPills } from '../reminders/FilterPills';
import { StatTile } from './StatTile';
import { GreetingBanner } from './GreetingBanner';
import { CreateReminderModal } from '../reminders/CreateReminderModal';

type FilterType = 'all' | 'today' | 'upcoming' | 'overdue' | 'recurring' | 'completed';

export function DashboardClient() {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Build query params based on filter
  const queryParams = buildQueryParams(activeFilter);

  const {
    data: remindersData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['reminders', queryParams],
    queryFn:  () => api.reminders.list(queryParams),
  });

  const {
    data: statsData,
  } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn:  () => api.users.stats(),
  });

  const reminders = remindersData?.data ?? [];

  // Group reminders by date category
  const grouped = groupByDate(reminders);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Greeting Banner */}
      <GreetingBanner />

      {/* Stat Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatTile
          label="Completed"
          value={statsData?.completed ?? 0}
          icon={<CheckCircle className="w-5 h-5" />}
          color="text-green-600"
          bgColor="bg-green-50"
        />
        <StatTile
          label="Overdue"
          value={statsData?.overdue ?? 0}
          icon={<AlertCircle className="w-5 h-5" />}
          color="text-red-600"
          bgColor="bg-red-50"
        />
        <StatTile
          label="Pending"
          value={statsData?.pending ?? 0}
          icon={<Clock className="w-5 h-5" />}
          color="text-yellow-600"
          bgColor="bg-yellow-50"
        />
        <StatTile
          label="Recurring"
          value={statsData?.recurring ?? 0}
          icon={<RefreshCw className="w-5 h-5" />}
          color="text-blue-600"
          bgColor="bg-blue-50"
        />
      </div>

      {/* Filter Pills + Create Button */}
      <div className="flex items-center justify-between gap-4">
        <FilterPills
          active={activeFilter}
          onChange={setActiveFilter}
        />
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary shrink-0"
          aria-label="Create new reminder"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Reminder</span>
        </button>
      </div>

      {/* Reminder List */}
      {isLoading ? (
        <ReminderListSkeleton />
      ) : error ? (
        <ErrorState message="Failed to load reminders. Please try again." />
      ) : reminders.length === 0 ? (
        <EmptyState filter={activeFilter} onCreateClick={() => setShowCreateModal(true)} />
      ) : (
        <motion.div
          className="space-y-6"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
        >
          {Object.entries(grouped).map(([dateLabel, items]) => (
            <div key={dateLabel}>
              <h3 className="text-sm font-semibold text-[var(--color-text-muted)] mb-2 uppercase tracking-wide">
                {dateLabel}
              </h3>
              <div className="space-y-2">
                {items.map((reminder) => (
                  <ReminderCard key={reminder.id} reminder={reminder} />
                ))}
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Create Reminder Modal */}
      {showCreateModal && (
        <CreateReminderModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildQueryParams(filter: FilterType) {
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  switch (filter) {
    case 'today':
      return { from: now.toISOString(), to: endOfDay.toISOString() };
    case 'upcoming':
      return { status: 'pending', from: endOfDay.toISOString() };
    case 'overdue':
      return { status: 'pending', to: now.toISOString() };
    case 'completed':
      return { status: 'completed' };
    case 'recurring':
      return { status: 'pending' }; // filter by recurrence client-side for now
    default:
      return {};
  }
}

function groupByDate(reminders: any[]): Record<string, any[]> {
  const groups: Record<string, any[]> = {};
  const today     = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  for (const reminder of reminders) {
    const fireDate = new Date(reminder.fireAt);
    let label: string;

    if (isSameDay(fireDate, today)) {
      label = 'Today';
    } else if (isSameDay(fireDate, yesterday)) {
      label = 'Yesterday';
    } else if (fireDate > today) {
      label = 'Upcoming';
    } else {
      label = 'Earlier';
    }

    if (!groups[label]) groups[label] = [];
    groups[label].push(reminder);
  }

  return groups;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate()
  );
}

function ReminderListSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading reminders">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="card p-4 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
          <div className="h-3 bg-gray-100 rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="card p-8 text-center text-red-600">
      <AlertCircle className="w-10 h-10 mx-auto mb-3" />
      <p className="font-medium">{message}</p>
    </div>
  );
}

function EmptyState({ filter, onCreateClick }: { filter: FilterType; onCreateClick: () => void }) {
  const messages: Record<FilterType, string> = {
    all:       "You don't have any reminders yet.",
    today:     "Nothing scheduled for today.",
    upcoming:  "No upcoming reminders.",
    overdue:   "No overdue items — great job!",
    recurring: "No recurring reminders set up.",
    completed: "No completed reminders.",
  };

  return (
    <div className="card p-12 text-center">
      <div className="text-5xl mb-4">🎉</div>
      <h3 className="font-display font-bold text-lg mb-2">{messages[filter]}</h3>
      <p className="text-[var(--color-text-muted)] text-sm mb-6">
        Create a reminder to stay on top of your tasks.
      </p>
      <button onClick={onCreateClick} className="btn-primary mx-auto">
        <Plus className="w-4 h-4" />
        Create Reminder
      </button>
    </div>
  );
}
