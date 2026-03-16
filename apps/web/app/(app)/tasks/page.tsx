'use client';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { REMINDER_CATEGORIES } from '@glt/shared';

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

const PRIORITY_COLOR: Record<string, { bg: string; color: string }> = {
  urgent: { bg: '#fee2e2', color: '#dc2626' },
  high:   { bg: '#fef3c7', color: '#d97706' },
  medium: { bg: 'rgba(108,78,255,0.12)', color: '#6C4EFF' },
  low:    { bg: '#f0fdf4', color: '#16a34a' },
};

const TYPE_ICON: Record<string, string> = {
  call: '📞', task: '◎', email: '✉️', location: '📍', event: '📅',
};

/* ── Extra virtual categories ──────────────────────────────────────── */
const ALL_CAT  = { slug: 'all',  name: 'All Tasks',     icon: '⊞', color: '#4338CA' };
const NONE_CAT = { slug: 'none', name: 'Uncategorized', icon: '◌', color: '#6B7280' };

export default function TasksPage() {
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('pending');

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

  /* Count per slug */
  const countByCat = useMemo(() => {
    const m: Record<string, number> = { all: allTasks.length, none: 0 };
    REMINDER_CATEGORIES.forEach(c => { m[c.slug] = 0; });
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
    return REMINDER_CATEGORIES.find(c => c.slug === activeCat) ?? null;
  }, [activeCat]);

  const categories = [ALL_CAT, ...REMINDER_CATEGORIES, NONE_CAT];

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
            <div style={{ textAlign: 'center', paddingTop: 80, color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {visibleTasks.map(task => {
              const pri    = task.priority || 'medium';
              const colors = PRIORITY_COLOR[pri] ?? PRIORITY_COLOR.medium;
              const done   = task.status === 'completed';
              const fireAt = task.fireAt ? new Date(task.fireAt) : null;
              return (
                <div key={task.id} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 14,
                  padding: '14px 18px',
                  background: 'var(--card)',
                  border: '1px solid var(--b1)',
                  borderRadius: 'var(--r)',
                  opacity: done ? 0.6 : 1,
                  transition: 'all 0.12s',
                  boxShadow: 'var(--sh-card)',
                }}>
                  {/* Checkbox */}
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                    border: done ? 'none' : '2px solid var(--b3)',
                    background: done ? 'var(--amber)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, color: '#fff',
                  }}>
                    {done ? '✓' : ''}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: 600, color: 'var(--t1)',
                      textDecoration: done ? 'line-through' : 'none', marginBottom: 4,
                    }}>
                      {task.title}
                    </div>
                    {task.notes && (
                      <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {task.notes}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: 'var(--t3)' }}>{TYPE_ICON[task.type] || '◎'}</span>
                      {fireAt && (
                        <span style={{ fontSize: 10, color: 'var(--t4)' }}>
                          📅 {fireAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} {fireAt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
                        background: colors.bg, color: colors.color,
                      }}>
                        {pri}
                      </span>
                    </div>
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
