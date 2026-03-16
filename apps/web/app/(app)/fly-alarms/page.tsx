'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';

const PRIORITY_COLOR: Record<string, { bg: string; color: string }> = {
  urgent: { bg: '#fee2e2', color: '#dc2626' },
  high:   { bg: '#fef3c7', color: '#d97706' },
  medium: { bg: 'var(--amber-glow)', color: 'var(--amber)' },
  low:    { bg: '#f0fdf4', color: '#16a34a' },
};

const TYPE_ICON: Record<string, string> = {
  call: '📞', task: '◎', email: '✉️', location: '📍', event: '📅',
};

export default function FlyAlarmsPage() {
  const { data: overdueData, isLoading: loadingOverdue } = useQuery({
    queryKey: ['fly-alarms-overdue'],
    queryFn: () => api.reminders.list({ status: 'pending', sort: 'fireAt', order: 'asc', limit: 50 }),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const now = new Date();
  const allPending: any[] = (overdueData as any)?.data ?? [];

  // Split into overdue vs firing soon (next 24 hours)
  const overdue = allPending.filter((r: any) => r.fireAt && new Date(r.fireAt) < now);
  const upcoming24h = allPending.filter((r: any) => {
    if (!r.fireAt) return false;
    const t = new Date(r.fireAt);
    return t >= now && t <= new Date(now.getTime() + 24 * 60 * 60 * 1000);
  });

  const isLoading = loadingOverdue;

  const ReminderCard = ({ item }: { item: any }) => {
    const pri = item.priority || 'medium';
    const colors = PRIORITY_COLOR[pri] ?? PRIORITY_COLOR.medium;
    const fireAt = item.fireAt ? new Date(item.fireAt) : null;
    const isOver = fireAt && fireAt < now;
    const diffMs = fireAt ? Math.abs(fireAt.getTime() - now.getTime()) : 0;
    const diffMin = Math.floor(diffMs / 60000);
    const timeLabel = isOver
      ? diffMin < 60
        ? `${diffMin}m overdue`
        : `${Math.floor(diffMin / 60)}h overdue`
      : diffMin < 60
      ? `in ${diffMin}m`
      : `in ${Math.floor(diffMin / 60)}h`;

    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '13px 18px',
        background: isOver ? 'rgba(220,38,38,0.04)' : 'var(--card)',
        border: `1px solid ${isOver ? 'rgba(220,38,38,0.18)' : 'var(--b1)'}`,
        borderRadius: 'var(--r)',
        transition: 'all 0.12s',
      }}>
        {/* Type icon */}
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: isOver ? 'rgba(220,38,38,0.1)' : 'var(--amber-glow)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
        }}>
          {TYPE_ICON[item.type] || '⚡'}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)', marginBottom: 3 }}>
            {item.title}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
          </div>
        </div>

        {fireAt && (
          <div style={{ fontSize: 11, color: 'var(--t3)', textAlign: 'right', flexShrink: 0 }}>
            {fireAt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
            <div style={{ fontSize: 10, color: 'var(--t4)' }}>
              {fireAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </div>
          </div>
        )}
      </div>
    );
  };

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
                  {overdue.map((item: any) => <ReminderCard key={item.id} item={item} />)}
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
                  {upcoming24h.map((item: any) => <ReminderCard key={item.id} item={item} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
