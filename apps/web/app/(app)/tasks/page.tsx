'use client';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { REMINDER_CATEGORIES } from '@glt/shared';
import { useAllCategories } from '../../../hooks/useAllCategories';
import toast from 'react-hot-toast';

/* ── Category gradient map ─────────────────────────────────────────── */
const CAT_GRADIENT: Record<string, string> = {
  work:      'linear-gradient(135deg, #4338CA 0%, #818CF8 100%)',
  personal:  'linear-gradient(135deg, #B45309 0%, #FBBF24 100%)',
  health:    'linear-gradient(135deg, #059669 0%, #34D399 100%)',
  finance:   'linear-gradient(135deg, #1D4ED8 0%, #60A5FA 100%)',
  family:    'linear-gradient(135deg, #7C3AED 0%, #C4B5FD 100%)',
  travel:    'linear-gradient(135deg, #B91C1C 0%, #F87171 100%)',
  shopping:  'linear-gradient(135deg, #C2410C 0%, #FB923C 100%)',
  education: 'linear-gradient(135deg, #1E40AF 0%, #38BDF8 100%)',
  all:       'linear-gradient(135deg, #1E1B4B 0%, #4338CA 100%)',
  none:      'linear-gradient(135deg, #374151 0%, #6B7280 100%)',
};

/* ── Type styling (matches Dashboard) ─────────────────────────────── */
const TYPE_COLOR: Record<string, string> = {
  call: 'var(--sage)', task: 'var(--amber)', email: 'var(--sky)',
  location: 'var(--mauve)', event: 'var(--rose)',
};
const TYPE_BG: Record<string, string> = {
  call: 'var(--sage-bg)', task: 'var(--amber-glow)', email: 'var(--sky-bg)',
  location: 'var(--mauve-bg)', event: 'var(--rose-bg)',
};
const TYPE_ICON: Record<string, string> = {
  call: '📞', task: '✓', email: '✉️', location: '📍', event: '📅',
};
const TYPE_LABEL: Record<string, string> = {
  call: 'Call', task: 'Task', email: 'Email', location: 'Location', event: 'Event',
};

/* ── Extra virtual categories ──────────────────────────────────────── */
const ALL_CAT  = { slug: 'all',  name: 'All Tasks',     icon: '⊞', color: '#4338CA' };
const NONE_CAT = { slug: 'none', name: 'Uncategorized', icon: '◌', color: '#6B7280' };

const SNOOZE_OPTIONS = [
  { label: '15 minutes', minutes: 15 },
  { label: '1 hour',     minutes: 60 },
  { label: 'Tomorrow',   minutes: 1440 },
];

/* ── Task card — matches Dashboard ReminderCard exactly ────────────── */
function TaskCard({
  task,
  onComplete,
  onDelete,
  onSnooze,
  snoozeOpen,
  onSnoozeToggle,
}: {
  task: any;
  onComplete: () => void;
  onDelete: () => void;
  onSnooze: (minutes: number) => void;
  snoozeOpen: boolean;
  onSnoozeToggle: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const type     = task.type || 'task';
  const done     = task.status === 'completed';
  const isOverdue = task.fireAt && new Date(task.fireAt) < new Date() && !done;
  const fireAt   = task.fireAt ? new Date(task.fireAt) : null;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--card)',
        border: '1px solid var(--b1)',
        borderRadius: 'var(--r-lg)',
        padding: '15px 16px 15px 18px',
        marginBottom: 6,
        display: 'flex', alignItems: 'flex-start', gap: 13,
        position: 'relative',
        opacity: done ? 0.55 : 1,
        transition: 'opacity 0.15s, box-shadow 0.15s',
        boxShadow: hovered ? 'var(--sh-card-hover, 0 4px 16px rgba(0,0,0,0.12))' : 'var(--sh-card)',
      }}
    >
      {/* Color bar */}
      <div style={{
        position: 'absolute', left: 0, top: 10, bottom: 10,
        width: 2.5, borderRadius: '0 2px 2px 0',
        background: TYPE_COLOR[type] || 'var(--amber)',
      }} />

      {/* Complete checkbox */}
      <div
        onClick={!done ? onComplete : undefined}
        title={done ? 'Completed' : 'Mark complete'}
        style={{
          width: 20, height: 20, borderRadius: '50%', flexShrink: 0, marginTop: 2,
          border: done ? 'none' : '1.5px solid var(--t3)',
          background: done ? 'var(--sage)' : hovered && !done ? 'rgba(0,0,0,0.04)' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: done ? 'default' : 'pointer',
          color: done ? '#fff' : 'transparent', fontSize: 11,
          transition: 'all 0.12s',
        }}
      >{done ? '✓' : ''}</div>

      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13.5, fontWeight: 600,
          color: done ? 'var(--t3)' : 'var(--t1)',
          lineHeight: 1.35, marginBottom: 5,
          textDecoration: done ? 'line-through' : 'none',
        }}>
          {task.title}
        </div>

        {task.notes && (
          <div style={{ fontSize: 11.5, color: 'var(--t3)', marginBottom: 6, lineHeight: 1.5 }}>
            {task.notes}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {fireAt && (
            <span style={{
              fontSize: 11,
              color: isOverdue ? 'var(--coral)' : 'var(--t3)',
              fontWeight: isOverdue ? 600 : 500,
            }}>
              {isOverdue ? '⚡ ' : ''}
              {fireAt.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </span>
          )}
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
            background: TYPE_BG[type] || 'var(--amber-glow)',
            color: TYPE_COLOR[type] || 'var(--amber)',
          }}>
            {TYPE_ICON[type] || '✓'} {TYPE_LABEL[type] || type}
          </span>
          {task.recurrenceId && (
            <span style={{ fontSize: 10, color: 'var(--t4)', background: 'rgba(0,0,0,0.05)', padding: '2px 6px', borderRadius: 4 }}>
              🔁 recurring
            </span>
          )}
        </div>
      </div>

      {/* Action buttons — visible on hover */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
        opacity: hovered ? 1 : 0, transition: 'opacity 0.15s',
        position: 'relative',
      }}>
        {/* Snooze */}
        {!done && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={onSnoozeToggle}
              title="Snooze"
              style={{
                width: 28, height: 28, borderRadius: 7,
                border: '1px solid var(--b1)', background: 'var(--card)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', fontSize: 13, color: 'var(--t2)',
              }}
            >⏰</button>
            {snoozeOpen && (
              <div style={{
                position: 'absolute', right: 0, top: 34,
                background: 'var(--card)', border: '1px solid var(--b1)',
                borderRadius: 'var(--r)', padding: '4px 0',
                zIndex: 50, minWidth: 130,
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              }}>
                {SNOOZE_OPTIONS.map(opt => (
                  <div
                    key={opt.minutes}
                    onClick={() => onSnooze(opt.minutes)}
                    style={{ padding: '8px 14px', fontSize: 12, color: 'var(--t2)', cursor: 'pointer', fontWeight: 500 }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-raised)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >{opt.label}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Delete */}
        <button
          onClick={onDelete}
          title="Delete"
          style={{
            width: 28, height: 28, borderRadius: 7,
            border: '1px solid rgba(220,38,38,0.2)', background: '#fff5f5',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: 13, color: '#dc2626',
          }}
        >🗑</button>
      </div>
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────────────── */
export default function TasksPage() {
  const qc = useQueryClient();
  const allCategories = useAllCategories();
  const [activeCat,    setActiveCat]    = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('pending');
  const [snoozeOpen,   setSnoozeOpen]   = useState<string | null>(null);

  /* Fetch ALL tasks once; count + filter client-side */
  const { data, isLoading } = useQuery({
    queryKey: ['tasks-all'],
    queryFn: () => api.reminders.list({ type: 'task', limit: 100, sort: 'fireAt', order: 'asc' }),
    staleTime: 30_000,
  });

  const allTasks: any[] = useMemo(
    () => (data as any)?.data ?? [],
    [data],
  );

  /* Mutations */
  const completeMutation = useMutation({
    mutationFn: (id: string) => api.reminders.complete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks-all'] }); toast.success('Task completed!'); },
    onError: () => toast.error('Failed to complete task'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.reminders.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks-all'] }); toast.success('Task deleted'); },
    onError: () => toast.error('Failed to delete task'),
  });

  const snoozeMutation = useMutation({
    mutationFn: ({ id, minutes }: { id: string; minutes: number }) =>
      api.reminders.snooze(id, minutes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks-all'] });
      setSnoozeOpen(null);
      toast.success('Task snoozed');
    },
    onError: () => toast.error('Failed to snooze task'),
  });

  /* Count per slug */
  const countByCat = useMemo(() => {
    const m: Record<string, number> = { all: allTasks.length, none: 0 };
    allCategories.forEach(c => { m[c.slug] = 0; });
    allTasks.forEach(t => {
      const s = t.category ?? '';
      if (s && m[s] !== undefined) m[s]++;
      else m.none++;
    });
    return m;
  }, [allTasks]);

  /* Tasks for active category + status tab */
  const visibleTasks = useMemo(() => {
    let list = allTasks;
    if (activeCat && activeCat !== 'all') {
      list = activeCat === 'none'
        ? list.filter(t => !t.category)
        : list.filter(t => t.category === activeCat);
    }
    if (statusFilter !== 'all') {
      list = list.filter(t =>
        statusFilter === 'completed' ? t.status === 'completed' : t.status !== 'completed',
      );
    }
    return list;
  }, [allTasks, activeCat, statusFilter]);

  /* Active category meta */
  const activeMeta = useMemo(() => {
    if (!activeCat) return null;
    if (activeCat === 'all')  return ALL_CAT;
    if (activeCat === 'none') return NONE_CAT;
    return allCategories.find(c => c.slug === activeCat) ?? null;
  }, [activeCat]);

  const categories = [ALL_CAT, ...allCategories, NONE_CAT];

  /* ── CATEGORY GRID VIEW ──────────────────────────────────────────── */
  if (!activeCat) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0, background: 'var(--bg)' }}>

        {/* Header */}
        <div style={{
          padding: '26px 32px 18px',
          background: 'var(--card)',
          borderBottom: '1px solid var(--b1)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--t1)', margin: 0, letterSpacing: '-0.02em' }}>
                Task Categories
              </h1>
              <p style={{ fontSize: 12, color: 'var(--t3)', margin: '4px 0 0' }}>
                Pick a category to view tasks
              </p>
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--amber)', background: 'var(--amber-glow)', padding: '5px 14px', borderRadius: 20 }}>
              {allTasks.length} Total Task{allTasks.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 32px 32px' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', paddingTop: 80, color: 'var(--t4)', fontSize: 13 }}>
              Loading categories…
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
              gap: 16,
            }}>
              {categories.map(cat => {
                const count = countByCat[cat.slug] ?? 0;
                const grad  = CAT_GRADIENT[cat.slug] ?? CAT_GRADIENT.all;
                return (
                  <div
                    key={cat.slug}
                    onClick={() => setActiveCat(cat.slug)}
                    style={{
                      background: grad,
                      borderRadius: 20,
                      padding: '22px 18px 18px',
                      cursor: 'pointer',
                      display: 'flex', flexDirection: 'column',
                      minHeight: 160,
                      position: 'relative',
                      overflow: 'hidden',
                      transition: 'transform 0.15s, box-shadow 0.15s',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)';
                      (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.5)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                      (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.35)';
                    }}
                  >
                    {/* Decorative circle */}
                    <div style={{
                      position: 'absolute', right: -18, top: -18,
                      width: 80, height: 80, borderRadius: '50%',
                      background: 'rgba(255,255,255,0.08)',
                      pointerEvents: 'none',
                    }} />

                    {/* Count badge */}
                    <div style={{
                      alignSelf: 'flex-end',
                      fontSize: 11, fontWeight: 700,
                      color: 'rgba(255,255,255,0.85)',
                      background: 'rgba(0,0,0,0.2)',
                      padding: '3px 10px', borderRadius: 20,
                      backdropFilter: 'blur(4px)',
                      marginBottom: 'auto',
                    }}>
                      {count} Task{count !== 1 ? 's' : ''}
                    </div>

                    {/* Icon */}
                    <div style={{
                      fontSize: 36, textAlign: 'center',
                      margin: '12px 0 10px',
                      filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.3))',
                    }}>
                      {cat.icon}
                    </div>

                    {/* Name */}
                    <div style={{
                      fontSize: 14, fontWeight: 700, color: '#ffffff',
                      textAlign: 'center',
                      textShadow: '0 1px 4px rgba(0,0,0,0.3)',
                    }}>
                      {cat.name}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── CATEGORY DETAIL VIEW ────────────────────────────────────────── */
  const grad = CAT_GRADIENT[activeCat] ?? CAT_GRADIENT.all;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0, background: 'var(--bg)' }}>

      {/* Header */}
      <div style={{
        background: grad,
        padding: '22px 32px 0',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          {/* Back */}
          <button
            onClick={() => setActiveCat(null)}
            style={{
              width: 34, height: 34, borderRadius: 10,
              background: 'rgba(255,255,255,0.18)',
              border: '1px solid rgba(255,255,255,0.28)',
              color: '#ffffff', fontSize: 18, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            ‹
          </button>
          <span style={{ fontSize: 28 }}>{activeMeta?.icon}</span>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: '#ffffff', margin: 0 }}>
              {activeMeta?.name}
            </h1>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', margin: '2px 0 0' }}>
              {countByCat[activeCat] ?? 0} task{(countByCat[activeCat] ?? 0) !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Status tabs */}
        <div style={{ display: 'flex', gap: 0, marginBottom: -1 }}>
          {(['pending', 'all', 'completed'] as const).map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              style={{
                padding: '7px 20px 8px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: 'none',
                borderBottom: statusFilter === f ? '2px solid #ffffff' : '2px solid transparent',
                background: 'transparent',
                color: statusFilter === f ? '#ffffff' : 'rgba(255,255,255,0.55)',
                transition: 'all 0.12s',
                fontFamily: 'var(--font-body)',
              }}
            >
              {f === 'pending' ? 'Active' : f === 'all' ? 'All' : 'Done'}
            </button>
          ))}
        </div>
      </div>

      {/* Task list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 32px' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--t4)', fontSize: 13 }}>Loading…</div>
        ) : visibleTasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <div style={{ fontSize: 42, marginBottom: 12 }}>{activeMeta?.icon}</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--t2)', marginBottom: 6 }}>No tasks here</div>
            <div style={{ fontSize: 12, color: 'var(--t4)' }}>
              {statusFilter === 'pending' ? 'No active tasks in this category' : 'Nothing to show'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {visibleTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onComplete={() => completeMutation.mutate(task.id)}
                onDelete={() => deleteMutation.mutate(task.id)}
                onSnooze={(minutes) => snoozeMutation.mutate({ id: task.id, minutes })}
                snoozeOpen={snoozeOpen === task.id}
                onSnoozeToggle={() => setSnoozeOpen(snoozeOpen === task.id ? null : task.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
