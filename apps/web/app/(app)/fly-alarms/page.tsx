'use client';
import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';

const PRIORITY_COLOR: Record<string, { bg: string; color: string }> = {
  urgent: { bg: '#fee2e2', color: '#dc2626' },
  high:   { bg: '#fef3c7', color: '#d97706' },
  medium: { bg: 'var(--amber-glow)', color: 'var(--amber)' },
  low:    { bg: '#f0fdf4', color: '#16a34a' },
};

const TYPE_ICON: Record<string, string> = {
  call: '📞', task: '✓', email: '✉️', location: '📍', event: '📅',
};

const SNOOZE_OPTIONS = [
  { label: '15 minutes', minutes: 15 },
  { label: '1 hour',     minutes: 60 },
  { label: '3 hours',    minutes: 180 },
  { label: 'Tomorrow',   minutes: 24 * 60 },
];

// ─── Individual card with Snooze / Repeat / Done actions ─────────────────────

function ReminderCard({ item, onRemove }: { item: any; onRemove: (id: string) => void }) {
  const [showSnooze, setShowSnooze] = useState(false);
  const [showRepeat, setShowRepeat] = useState(false);
  const [repeatDate, setRepeatDate] = useState('');
  const snoozeRef = useRef<HTMLDivElement>(null);
  const repeatRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const now = new Date();
  const pri = item.priority || 'medium';
  const colors = PRIORITY_COLOR[pri] ?? PRIORITY_COLOR.medium;
  const fireAt = item.fireAt ? new Date(item.fireAt) : null;
  const isOver = fireAt && fireAt < now;
  const diffMs = fireAt ? Math.abs(fireAt.getTime() - now.getTime()) : 0;
  const diffMin = Math.floor(diffMs / 60000);
  const timeLabel = isOver
    ? diffMin < 60 ? `${diffMin}m overdue` : `${Math.floor(diffMin / 60)}h overdue`
    : diffMin < 60 ? `in ${diffMin}m` : `in ${Math.floor(diffMin / 60)}h`;

  // Close dropdowns on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (snoozeRef.current && !snoozeRef.current.contains(e.target as Node)) setShowSnooze(false);
      if (repeatRef.current && !repeatRef.current.contains(e.target as Node)) setShowRepeat(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['fly-alarms-overdue'] });

  const snoozeMut = useMutation({
    mutationFn: (minutes: number) => api.reminders.snooze(item.id, minutes),
    onSuccess: () => { onRemove(item.id); invalidate(); },
  });

  const repeatMut = useMutation({
    mutationFn: (isoDate: string) => api.reminders.update(item.id, { fire_at: isoDate, status: 'pending' }),
    onSuccess: () => { setShowRepeat(false); onRemove(item.id); invalidate(); },
  });

  const doneMut = useMutation({
    mutationFn: () => api.reminders.complete(item.id),
    onSuccess: () => { onRemove(item.id); invalidate(); },
  });

  const isActing = snoozeMut.isPending || repeatMut.isPending || doneMut.isPending;

  const btnBase: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 4,
    padding: '5px 11px', borderRadius: 7, fontSize: 11, fontWeight: 600,
    border: '1px solid', cursor: 'pointer', transition: 'opacity 0.12s',
    opacity: isActing ? 0.55 : 1,
    background: 'transparent',
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '13px 18px',
      background: isOver ? 'rgba(220,38,38,0.04)' : 'var(--card)',
      border: `1px solid ${isOver ? 'rgba(220,38,38,0.18)' : 'var(--b1)'}`,
      borderRadius: 'var(--r)',
      transition: 'opacity 0.15s',
      opacity: isActing ? 0.7 : 1,
    }}>

      {/* Type icon */}
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: isOver ? 'rgba(220,38,38,0.1)' : 'var(--amber-glow)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
      }}>
        {TYPE_ICON[item.type] || '⚡'}
      </div>

      {/* Title + badges */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)', marginBottom: 3 }}>
          {item.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
            background: isOver ? '#fee2e2' : 'var(--amber-glow)',
            color: isOver ? '#dc2626' : 'var(--amber)',
          }}>
            {isOver ? '⚡ ' : '⏳ '}{timeLabel}
          </span>
          <span style={{
            fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
            background: colors.bg, color: colors.color,
          }}>
            {pri}
          </span>
          {item.category && (
            <span style={{ fontSize: 10, color: 'var(--t4)', background: 'var(--b1)', padding: '2px 7px', borderRadius: 10 }}>
              {item.category}
            </span>
          )}
          {item.type && (
            <span style={{ fontSize: 10, color: 'var(--t3)', background: 'var(--b1)', padding: '2px 7px', borderRadius: 10, fontWeight: 600 }}>
              {TYPE_ICON[item.type]} {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
            </span>
          )}
        </div>
      </div>

      {/* Fire time */}
      {fireAt && (
        <div style={{ fontSize: 11, color: 'var(--t3)', textAlign: 'right', flexShrink: 0 }}>
          {fireAt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
          <div style={{ fontSize: 10, color: 'var(--t4)' }}>
            {fireAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </div>
        </div>
      )}

      {/* ── Action buttons ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>

        {/* Snooze */}
        <div ref={snoozeRef} style={{ position: 'relative' }}>
          <button
            onClick={() => { setShowSnooze(v => !v); setShowRepeat(false); }}
            disabled={isActing}
            style={{ ...btnBase, color: '#6366f1', borderColor: 'rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.08)' }}
          >
            😴 Snooze
          </button>
          {showSnooze && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 60,
              background: 'var(--card)', border: '1px solid var(--b1)',
              borderRadius: 10, boxShadow: '0 8px 28px rgba(0,0,0,0.18)',
              minWidth: 160, overflow: 'hidden',
            }}>
              {SNOOZE_OPTIONS.map(opt => (
                <button
                  key={opt.minutes}
                  onClick={() => { snoozeMut.mutate(opt.minutes); setShowSnooze(false); }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '9px 16px', fontSize: 12, fontWeight: 500,
                    background: 'transparent', border: 'none', color: 'var(--t1)',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--b1)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Repeat / Reschedule */}
        <div ref={repeatRef} style={{ position: 'relative' }}>
          <button
            onClick={() => { setShowRepeat(v => !v); setShowSnooze(false); }}
            disabled={isActing}
            style={{ ...btnBase, color: '#10b981', borderColor: 'rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.08)' }}
          >
            🔁 Repeat
          </button>
          {showRepeat && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 60,
              background: 'var(--card)', border: '1px solid var(--b1)',
              borderRadius: 12, boxShadow: '0 8px 28px rgba(0,0,0,0.18)',
              padding: '16px', minWidth: 230,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Choose next date
              </div>
              <input
                type="datetime-local"
                value={repeatDate}
                onChange={e => setRepeatDate(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: 8,
                  border: '1px solid var(--b1)', background: 'var(--bg)',
                  color: 'var(--t1)', fontSize: 12, marginBottom: 10,
                  boxSizing: 'border-box',
                }}
              />
              <button
                onClick={() => repeatDate && repeatMut.mutate(new Date(repeatDate).toISOString())}
                disabled={!repeatDate || repeatMut.isPending}
                style={{
                  width: '100%', padding: '8px', borderRadius: 8,
                  fontSize: 12, fontWeight: 700,
                  background: repeatDate ? '#10b981' : 'var(--b1)',
                  color: repeatDate ? '#fff' : 'var(--t4)',
                  border: 'none', cursor: repeatDate ? 'pointer' : 'default',
                  transition: 'background 0.15s',
                }}
              >
                {repeatMut.isPending ? 'Saving…' : 'Set Date'}
              </button>
            </div>
          )}
        </div>

        {/* Done */}
        <button
          onClick={() => doneMut.mutate()}
          disabled={isActing}
          style={{
            ...btnBase,
            color: '#ef4444',
            borderColor: 'rgba(220,38,38,0.28)',
            background: 'rgba(220,38,38,0.07)',
          }}
        >
          {doneMut.isPending ? '…' : '✓ Done'}
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FlyAlarmsPage() {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const { data: overdueData, isLoading } = useQuery({
    queryKey: ['fly-alarms-overdue'],
    queryFn: () => api.reminders.list({ status: 'pending', sort: 'fireAt', order: 'asc', limit: 50 }),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const onRemove = (id: string) =>
    setDismissed(prev => new Set([...prev, id]));

  const now = new Date();
  const allPending: any[] = ((overdueData as any)?.data ?? []).filter((r: any) => !dismissed.has(r.id));

  const overdue    = allPending.filter((r: any) => r.fireAt && new Date(r.fireAt) < now);
  const upcoming24h = allPending.filter((r: any) => {
    if (!r.fireAt) return false;
    const t = new Date(r.fireAt);
    return t >= now && t <= new Date(now.getTime() + 24 * 60 * 60 * 1000);
  });

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--bg)' }}>

      {/* Header */}
      <div style={{
        padding: '24px 32px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        background: 'linear-gradient(135deg, #3D2BB8 0%, #2D1E8A 100%)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24 }}>⚡</span>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: '#ffffff', margin: 0 }}>
              Fly-Alarms
            </h1>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: '2px 0 0' }}>
              Overdue &amp; firing within 24 hours · auto-refreshes every 30s
            </p>
          </div>
          {overdue.length > 0 && (
            <div style={{
              marginLeft: 'auto', fontSize: 13, fontWeight: 700,
              padding: '4px 14px', borderRadius: 20,
              background: '#fee2e2', color: '#dc2626',
            }}>
              {overdue.length} overdue
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 32px' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--t4)', fontSize: 13 }}>Loading alarms…</div>
        ) : overdue.length === 0 && upcoming24h.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--t2)', marginBottom: 6 }}>All clear!</div>
            <div style={{ fontSize: 12, color: 'var(--t4)' }}>No overdue or upcoming alarms in the next 24 hours</div>
          </div>
        ) : (
          <>
            {/* Overdue section */}
            {overdue.length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <div style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: '#dc2626', marginBottom: 10,
                }}>
                  ⚡ Overdue — {overdue.length}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {overdue.map((item: any) => (
                    <ReminderCard key={item.id} item={item} onRemove={onRemove} />
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming 24h section */}
            {upcoming24h.length > 0 && (
              <div>
                <div style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: 'var(--amber)', marginBottom: 10,
                }}>
                  ⏳ Firing within 24 hours — {upcoming24h.length}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {upcoming24h.map((item: any) => (
                    <ReminderCard key={item.id} item={item} onRemove={onRemove} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
