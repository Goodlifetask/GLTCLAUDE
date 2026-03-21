'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '../../../store/auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { CreateReminderModal } from './CreateReminderModal';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

const TYPE_COLOR: Record<string, string> = {
  call: 'var(--sage)', task: 'var(--amber)', email: 'var(--sky)',
  location: 'var(--mauve)', event: 'var(--rose)'
};
const TYPE_BG: Record<string, string> = {
  call: 'var(--sage-bg)', task: 'var(--amber-glow)', email: 'var(--sky-bg)',
  location: 'var(--mauve-bg)', event: 'var(--rose-bg)'
};
const TYPE_ICON: Record<string, string> = {
  call: '📞', task: '✓', email: '✉️', location: '📍', event: '📅'
};

function buildApiParams(filter: string, type: string): Record<string, unknown> {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const params: Record<string, unknown> = { limit: 100 };

  if (type) {
    params['type'] = type;
  } else {
    switch (filter) {
      case 'today':
        params['status'] = 'pending';
        params['date_from'] = todayStr;
        params['date_to'] = todayStr;
        break;
      case 'upcoming':
        params['status'] = 'pending';
        break;
      case 'overdue':
        params['status'] = 'overdue';
        break;
      case 'done':
        params['status'] = 'completed';
        break;
      case 'recurring':
        params['is_recurring'] = true;
        break;
      default:
        break;
    }
  }
  return params;
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const { t } = useTranslation();

  const filter = searchParams.get('filter') || 'all';
  const type = searchParams.get('type') || '';

  const FILTER_PILLS = [
    { label: t('dashboard.filter_all'), value: 'all' },
    { label: t('dashboard.filter_today'), value: 'today' },
    { label: t('dashboard.filter_upcoming'), value: 'upcoming' },
    { label: t('dashboard.filter_overdue'), value: 'overdue' },
    { label: t('dashboard.filter_recurring'), value: 'recurring' },
    { label: t('dashboard.filter_done'), value: 'done' },
  ];

  const TYPE_LABEL: Record<string, string> = {
    call: t('dashboard.type_call'),
    task: t('dashboard.type_task'),
    email: t('dashboard.type_email'),
    location: t('dashboard.type_location'),
    event: t('dashboard.type_event'),
  };

  const [showModal, setShowModal] = useState(false);
  const [startWithVoice, setStartWithVoice] = useState(false);
  const [snoozeOpen, setSnoozeOpen] = useState<string | null>(null);
  const [repeatOpen, setRepeatOpen] = useState<string | null>(null);

  const apiParams = buildApiParams(filter, type);

  const { data: remindersData, isLoading } = useQuery({
    queryKey: ['reminders', filter, type],
    queryFn: () => api.reminders.list(apiParams),
  });

  const { data: statsData } = useQuery({
    queryKey: ['stats'],
    queryFn: () => api.users.stats(),
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => api.reminders.complete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reminders'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      toast.success('Marked as complete!');
    },
    onError: () => toast.error('Failed to complete reminder'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.reminders.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reminders'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      toast.success('Reminder deleted');
    },
    onError: () => toast.error('Failed to delete reminder'),
  });

  const snoozeMutation = useMutation({
    mutationFn: ({ id, minutes }: { id: string; minutes: number }) => api.reminders.snooze(id, minutes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reminders'] });
      toast.success('Reminder snoozed!');
      setSnoozeOpen(null);
    },
    onError: () => toast.error('Failed to snooze reminder'),
  });

  const repeatMutation = useMutation({
    mutationFn: ({ id, fireAt }: { id: string; fireAt: string }) =>
      api.reminders.update(id, { fire_at: fireAt, status: 'pending' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reminders'] });
      toast.success('Reminder rescheduled!');
      setRepeatOpen(null);
    },
    onError: () => toast.error('Failed to reschedule reminder'),
  });

  const reminders = (remindersData as any)?.data || [];
  const stats = (statsData as any)?.data || { total: 0, completed: 0, overdue: 0, upcoming: 0 };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? t('dashboard.greeting_morning') : hour < 17 ? t('dashboard.greeting_afternoon') : t('dashboard.greeting_evening');
  const firstName = user?.name?.split(' ')[0] || 'there';

  const today = new Date();
  const dateLabel = today.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const handleFilterClick = (val: string) => {
    router.push(`/dashboard?filter=${val}`);
  };

  return (
    <>
      {/* Topbar */}
      <div style={{
        background: 'var(--card)',
        borderBottom: '1px solid var(--b1)', padding: '0 26px', height: 58,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 40, flexShrink: 0,
        boxShadow: '0 1px 0 var(--b1)'
      }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 500, color: 'var(--t1)', letterSpacing: '-0.01em' }}>
            {greeting}, {firstName}.
          </div>
          <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 1 }}>
            {dateLabel} · {t('dashboard.pendingToday', { count: stats.upcoming })}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {['🔍', '🔔'].map(icon => (
            <div key={icon} style={{
              width: 34, height: 34, borderRadius: 'var(--r-sm)',
              border: '1px solid var(--b1)', background: 'var(--card)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, cursor: 'pointer', color: 'var(--t2)'
            }}>{icon}</div>
          ))}
          <div
            onClick={() => router.push('/settings')}
            style={{
              width: 34, height: 34, borderRadius: 'var(--r-sm)',
              border: '1px solid var(--b1)', background: 'var(--card)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, cursor: 'pointer', color: 'var(--t2)'
            }}>⚙</div>
          <button
            onClick={() => { setStartWithVoice(true); setShowModal(true); }}
            title="Voice quick-add"
            style={{
              width: 34, height: 34, borderRadius: 'var(--r-sm)',
              border: '1px solid var(--b1)', background: 'var(--card)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, cursor: 'pointer', color: 'var(--t2)',
            }}>🎤</button>
          <button
            onClick={() => { setStartWithVoice(false); setShowModal(true); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '8px 16px', borderRadius: 'var(--r-sm)',
              background: 'var(--amber)', color: '#ffffff',
              border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 700,
              boxShadow: 'var(--sh-amber)'
            }}>{t('dashboard.newReminder')}</button>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '24px 26px', flex: 1 }}>
        {/* Today banner */}
        <div style={{
          background: 'var(--card)', border: '1px solid var(--b1)',
          borderRadius: 'var(--r-xl)', padding: '22px 26px', marginBottom: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, var(--amber), transparent)', opacity: 0.4 }} />
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{dateLabel}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 500, fontStyle: 'italic', color: 'var(--t1)', lineHeight: 1.2 }}>
              {t('dashboard.subtitle')}
            </div>
            <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 6 }}>{t('dashboard.subtitleMotivation')}</div>
          </div>
          <div style={{ display: 'flex', gap: 14 }}>
            {[
              { num: stats.completed, label: t('dashboard.done'), color: 'var(--amber)', bg: 'var(--amber-glow)', border: 'rgba(124,58,237,0.2)' },
              { num: stats.overdue, label: t('dashboard.overdue'), color: 'var(--coral)', bg: 'var(--coral-bg)', border: 'rgba(220,38,38,0.15)' },
              { num: stats.upcoming, label: t('dashboard.remaining'), color: 'var(--sky)', bg: 'var(--sky-bg)', border: 'rgba(14,165,233,0.15)' },
            ].map(({ num, label, color, bg, border }) => (
              <div key={label} style={{
                textAlign: 'center', background: bg,
                border: `1px solid ${border}`, borderRadius: 'var(--r)', padding: '12px 20px'
              }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color, lineHeight: 1 }}>{num}</div>
                <div style={{ fontSize: 10, color, marginTop: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.8 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Filter pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
          {FILTER_PILLS.map(pill => {
            const isActive = !type && filter === pill.value;
            return (
              <div
                key={pill.value}
                onClick={() => handleFilterClick(pill.value)}
                style={{
                  padding: '6px 14px', borderRadius: 20,
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  border: `1px solid ${isActive ? 'rgba(124,58,237,0.3)' : 'var(--b1)'}`,
                  color: isActive ? 'var(--amber)' : 'var(--t2)',
                  background: isActive ? 'var(--amber-glow)' : 'var(--card)'
                }}>{pill.label}</div>
            );
          })}
          {type && (
            <div style={{
              padding: '6px 14px', borderRadius: 20,
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              border: '1px solid rgba(124,58,237,0.3)',
              color: 'var(--amber)', background: 'var(--amber-glow)',
              display: 'flex', alignItems: 'center', gap: 6
            }}>
              {TYPE_ICON[type]} {TYPE_LABEL[type] || type}
              <span onClick={() => router.push('/dashboard')} style={{ marginLeft: 4, opacity: 0.6, fontSize: 11 }}>✕</span>
            </div>
          )}
        </div>

        {/* Reminder list */}
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--t3)', fontSize: 13 }}>{t('dashboard.loading')}</div>
        ) : reminders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 42, marginBottom: 14, opacity: 0.35 }}>✦</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 500, fontStyle: 'italic', color: 'var(--t2)', marginBottom: 6 }}>{t('dashboard.emptyTitle')}</div>
            <div style={{ fontSize: 12, color: 'var(--t3)' }}>{t('dashboard.emptySubtitle')}</div>
          </div>
        ) : (
          reminders.map((reminder: any) => (
            <ReminderCard
              key={reminder.id}
              reminder={reminder}
              onComplete={() => completeMutation.mutate(reminder.id)}
              onDelete={() => deleteMutation.mutate(reminder.id)}
              onSnooze={(minutes: number) => snoozeMutation.mutate({ id: reminder.id, minutes })}
              snoozeOpen={snoozeOpen === reminder.id}
              onSnoozeToggle={() => setSnoozeOpen(snoozeOpen === reminder.id ? null : reminder.id)}
              repeatOpen={repeatOpen === reminder.id}
              onRepeatToggle={() => setRepeatOpen(repeatOpen === reminder.id ? null : reminder.id)}
              onRepeat={(fireAt: string) => repeatMutation.mutate({ id: reminder.id, fireAt })}
              isCompleting={completeMutation.isPending}
              isDeleting={deleteMutation.isPending}
              isRepeating={repeatMutation.isPending}
            />
          ))
        )}
      </div>

      {/* New Reminder Modal */}
      {showModal && (
        <CreateReminderModal
          startWithVoice={startWithVoice}
          onClose={() => { setShowModal(false); setStartWithVoice(false); }}
        />
      )}
    </>
  );
}

function ReminderCard({
  reminder,
  onComplete,
  onDelete,
  onSnooze,
  snoozeOpen,
  onSnoozeToggle,
  repeatOpen,
  onRepeatToggle,
  onRepeat,
  isCompleting,
  isDeleting,
  isRepeating,
}: {
  reminder: any;
  onComplete: () => void;
  onDelete: () => void;
  onSnooze: (minutes: number) => void;
  snoozeOpen: boolean;
  onSnoozeToggle: () => void;
  repeatOpen: boolean;
  onRepeatToggle: () => void;
  onRepeat: (fireAt: string) => void;
  isCompleting: boolean;
  isDeleting: boolean;
  isRepeating: boolean;
}) {
  const { t } = useTranslation();
  const type = reminder.type || 'task';
  const isOverdue = new Date(reminder.fireAt) < new Date() && reminder.status !== 'completed';
  const isDone = reminder.status === 'completed';

  // Default repeat date: tomorrow same time
  const defaultRepeatDate = () => {
    const d = reminder.fireAt ? new Date(reminder.fireAt) : new Date();
    d.setDate(d.getDate() + 1);
    // format for datetime-local input: YYYY-MM-DDTHH:MM
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const [repeatDate, setRepeatDate] = useState('');

  const TYPE_LABEL: Record<string, string> = {
    call: t('dashboard.type_call'),
    task: t('dashboard.type_task'),
    email: t('dashboard.type_email'),
    location: t('dashboard.type_location'),
    event: t('dashboard.type_event'),
  };

  const snoozeOptions = [
    { label: t('dashboard.snooze15'), minutes: 15 },
    { label: t('dashboard.snooze1h'), minutes: 60 },
    { label: t('dashboard.snoozeTomorrow'), minutes: 1440 },
  ];

  const handleRepeatToggle = () => {
    if (!repeatOpen) setRepeatDate(defaultRepeatDate());
    onRepeatToggle();
  };

  const btnBase: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
    cursor: 'pointer', border: '1px solid var(--b1)',
    background: 'var(--card)', color: 'var(--t2)',
    transition: 'background 0.1s, color 0.1s',
    lineHeight: 1,
  };

  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--b1)',
      borderRadius: 'var(--r-lg)', padding: '14px 16px 12px 18px',
      marginBottom: 6,
      display: 'flex', alignItems: 'flex-start', gap: 13,
      position: 'relative', opacity: isDone ? 0.55 : 1,
      cursor: 'default',
      transition: 'opacity 0.15s'
    }}>
      {/* Color bar */}
      <div style={{
        position: 'absolute', left: 0, top: 10, bottom: 10,
        width: 2.5, borderRadius: '0 2px 2px 0',
        background: TYPE_COLOR[type] || 'var(--amber)'
      }} />

      {/* Complete checkbox */}
      <div
        onClick={!isDone ? onComplete : undefined}
        style={{
          width: 20, height: 20, borderRadius: '50%',
          border: isDone ? 'none' : '1.5px solid var(--t3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: isDone ? 'default' : 'pointer', flexShrink: 0, marginTop: 2,
          background: isDone ? 'var(--sage)' : 'transparent',
          color: isDone ? '#fff' : 'transparent', fontSize: 11,
          transition: 'all 0.12s'
        }}
        title={isDone ? t('dashboard.completed') : t('dashboard.markComplete')}
      >{isDone ? '✓' : ''}</div>

      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: isDone ? 'var(--t3)' : 'var(--t1)', lineHeight: 1.35, marginBottom: 5, textDecoration: isDone ? 'line-through' : 'none' }}>
          {reminder.title}
        </div>
        {reminder.notes && <div style={{ fontSize: 11.5, color: 'var(--t3)', marginBottom: 6, lineHeight: 1.5 }}>{reminder.notes}</div>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          {reminder.fireAt && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: isOverdue ? 'var(--coral)' : 'var(--t3)', fontWeight: isOverdue ? 600 : 500 }}>
              {isOverdue ? '⚡ ' : ''}{new Date(reminder.fireAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </span>
          )}
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
            background: TYPE_BG[type] || 'var(--amber-glow)',
            color: TYPE_COLOR[type] || 'var(--amber)'
          }}>{TYPE_ICON[type] || '✓'} {TYPE_LABEL[type] || type}</span>
          {reminder.is_recurring && (
            <span style={{ fontSize: 10, color: 'var(--t4)', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 4 }}>🔁 {t('dashboard.recurring')}</span>
          )}
        </div>

        {/* Action buttons — always visible */}
        {!isDone && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', position: 'relative' }}>
            {/* Snooze */}
            <div style={{ position: 'relative' }}>
              <button onClick={onSnoozeToggle} style={{ ...btnBase, color: 'var(--sky)' }}>
                ⏰ Snooze
              </button>
              {snoozeOpen && (
                <div style={{
                  position: 'absolute', left: 0, top: 'calc(100% + 4px)',
                  background: 'var(--card)', border: '1px solid var(--b1)',
                  borderRadius: 'var(--r)', padding: '4px 0',
                  zIndex: 50, minWidth: 140,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
                }}>
                  {snoozeOptions.map(opt => (
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

            {/* Repeat */}
            <div style={{ position: 'relative' }}>
              <button onClick={handleRepeatToggle} disabled={isRepeating} style={{ ...btnBase, color: 'var(--amber)' }}>
                🔁 Repeat
              </button>
              {repeatOpen && (
                <div style={{
                  position: 'absolute', left: 0, top: 'calc(100% + 4px)',
                  background: 'var(--card)', border: '1px solid var(--b1)',
                  borderRadius: 'var(--r)', padding: '12px 14px',
                  zIndex: 50, minWidth: 240,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
                }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', marginBottom: 8 }}>Choose next date &amp; time</div>
                  <input
                    type="datetime-local"
                    value={repeatDate}
                    onChange={e => setRepeatDate(e.target.value)}
                    style={{
                      width: '100%', padding: '6px 8px', borderRadius: 6,
                      border: '1px solid var(--b1)', background: 'var(--bg-raised)',
                      color: 'var(--t1)', fontSize: 12, marginBottom: 10,
                      boxSizing: 'border-box' as const,
                    }}
                  />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => repeatDate && onRepeat(new Date(repeatDate).toISOString())}
                      disabled={!repeatDate || isRepeating}
                      style={{
                        flex: 1, padding: '6px 0', borderRadius: 6,
                        background: 'var(--amber)', color: '#fff',
                        border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer'
                      }}
                    >{isRepeating ? 'Saving…' : 'Confirm'}</button>
                    <button
                      onClick={onRepeatToggle}
                      style={{
                        padding: '6px 12px', borderRadius: 6,
                        background: 'transparent', color: 'var(--t3)',
                        border: '1px solid var(--b1)', fontSize: 12, cursor: 'pointer'
                      }}
                    >Cancel</button>
                  </div>
                </div>
              )}
            </div>

            {/* Done (delete) */}
            <button
              onClick={onDelete}
              disabled={isDeleting}
              style={{ ...btnBase, color: 'var(--coral)', borderColor: 'rgba(220,38,38,0.25)' }}
            >
              ✓ Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

