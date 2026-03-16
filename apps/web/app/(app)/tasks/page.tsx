'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';

const PRIORITY_COLOR: Record<string, { bg: string; color: string }> = {
  urgent: { bg: '#fee2e2', color: '#dc2626' },
  high:   { bg: '#fef3c7', color: '#d97706' },
  medium: { bg: 'var(--amber-glow)', color: 'var(--amber)' },
  low:    { bg: '#f0fdf4', color: '#16a34a' },
};

export default function TasksPage() {
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending');

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', filter],
    queryFn: () =>
      api.reminders.list({
        type: 'task',
        // no status filter for 'all', otherwise pass the selected status
        ...(filter !== 'all' && { status: filter === 'completed' ? 'completed' : 'pending' }),
        limit: 100,
        sort: 'fireAt',
        order: 'asc',
      }),
    staleTime: 30_000,
  });

  // includes own tasks + tasks assigned to current user
  const tasks: any[] = (data as any)?.data?.reminders ?? [];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--bg)', minWidth: 0 }}>

      {/* Header */}
      <div style={{
        padding: '22px 32px 0',
        borderBottom: '1px solid var(--b1)',
        background: 'var(--card)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <span style={{ fontSize: 20 }}>◎</span>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--t1)', margin: 0 }}>
              Tasks
            </h1>
            <p style={{ fontSize: 11, color: 'var(--t3)', margin: '2px 0 0' }}>
              {tasks.length} task{tasks.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Filter tabs — flush to bottom border */}
        <div style={{ display: 'flex', gap: 0, marginBottom: -1 }}>
          {(['pending', 'all', 'completed'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '7px 20px 8px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: 'none', borderBottom: filter === f ? '2px solid var(--amber)' : '2px solid transparent',
                background: 'transparent',
                color: filter === f ? 'var(--amber)' : 'var(--t3)',
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
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--t4)', fontSize: 13 }}>Loading tasks…</div>
        ) : tasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>◎</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--t2)', marginBottom: 6 }}>No tasks here</div>
            <div style={{ fontSize: 12, color: 'var(--t4)' }}>Create a new task from the Dashboard</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tasks.map((task: any) => {
              const pri = task.priority || 'medium';
              const colors = PRIORITY_COLOR[pri] ?? PRIORITY_COLOR.medium;
              const done = task.status === 'completed';
              const fireAt = task.fireAt ? new Date(task.fireAt) : null;
              return (
                <div
                  key={task.id}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 14,
                    padding: '14px 18px',
                    background: 'var(--card)',
                    border: '1px solid var(--b1)',
                    borderRadius: 'var(--r)',
                    opacity: done ? 0.6 : 1,
                    transition: 'all 0.12s',
                  }}
                >
                  {/* Checkbox circle */}
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                    border: done ? 'none' : '2px solid var(--b2)',
                    background: done ? 'var(--amber)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, color: '#fff',
                  }}>
                    {done ? '✓' : ''}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: 600, color: 'var(--t1)',
                      textDecoration: done ? 'line-through' : 'none',
                      marginBottom: 4,
                    }}>
                      {task.title}
                    </div>
                    {task.notes && (
                      <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {task.notes}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {fireAt && (
                        <span style={{ fontSize: 10, color: 'var(--t4)' }}>
                          📅 {fireAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
                        background: colors.bg, color: colors.color,
                      }}>
                        {pri}
                      </span>
                      {task.category && (
                        <span style={{ fontSize: 10, color: 'var(--t4)', background: 'var(--b1)', padding: '2px 7px', borderRadius: 10 }}>
                          {task.category}
                        </span>
                      )}
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
