'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '../../../store/auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import toast from 'react-hot-toast';

const FILTER_PILLS = [
  { label: 'All', value: 'all' },
  { label: 'Today', value: 'today' },
  { label: 'Upcoming', value: 'upcoming' },
  { label: 'Overdue', value: 'overdue' },
  { label: 'Recurring', value: 'recurring' },
  { label: 'Done', value: 'done' },
];

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
const TYPE_LABEL: Record<string, string> = {
  call: 'Call', task: 'Task', email: 'Email', location: 'Location', event: 'Event'
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

  const filter = searchParams.get('filter') || 'all';
  const type = searchParams.get('type') || '';

  const [showModal, setShowModal] = useState(false);
  const [snoozeOpen, setSnoozeOpen] = useState<string | null>(null);

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

  const reminders = (remindersData as any)?.data || [];
  const stats = (statsData as any)?.data || { total: 0, completed: 0, overdue: 0, upcoming: 0 };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
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
            {dateLabel} · {stats.upcoming} reminders pending today
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
            onClick={() => setShowModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '8px 16px', borderRadius: 'var(--r-sm)',
              background: 'var(--amber)', color: '#ffffff',
              border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 700,
              boxShadow: 'var(--sh-amber)'
            }}>+ New Reminder</button>
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
              Here&apos;s what&apos;s on your plate today.
            </div>
            <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 6 }}>Stay focused and make it count.</div>
          </div>
          <div style={{ display: 'flex', gap: 14 }}>
            {[
              { num: stats.completed, label: 'Done', color: 'var(--amber)', bg: 'var(--amber-glow)', border: 'rgba(249,115,22,0.2)' },
              { num: stats.overdue, label: 'Overdue', color: 'var(--coral)', bg: 'var(--coral-bg)', border: 'rgba(220,38,38,0.15)' },
              { num: stats.upcoming, label: 'Remaining', color: 'var(--sky)', bg: 'var(--sky-bg)', border: 'rgba(14,165,233,0.15)' },
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
                  border: `1px solid ${isActive ? 'rgba(232,169,74,0.3)' : 'var(--b1)'}`,
                  color: isActive ? 'var(--amber)' : 'var(--t2)',
                  background: isActive ? 'var(--amber-glow)' : 'var(--card)'
                }}>{pill.label}</div>
            );
          })}
          {type && (
            <div style={{
              padding: '6px 14px', borderRadius: 20,
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              border: '1px solid rgba(232,169,74,0.3)',
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
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--t3)', fontSize: 13 }}>Loading...</div>
        ) : reminders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 42, marginBottom: 14, opacity: 0.35 }}>✦</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 500, fontStyle: 'italic', color: 'var(--t2)', marginBottom: 6 }}>Nothing here yet.</div>
            <div style={{ fontSize: 12, color: 'var(--t3)' }}>Add a reminder to get started.</div>
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
              isCompleting={completeMutation.isPending}
              isDeleting={deleteMutation.isPending}
            />
          ))
        )}
      </div>

      {/* New Reminder Modal */}
      {showModal && (
        <CreateReminderModal onClose={() => setShowModal(false)} />
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
  isCompleting,
  isDeleting,
}: {
  reminder: any;
  onComplete: () => void;
  onDelete: () => void;
  onSnooze: (minutes: number) => void;
  snoozeOpen: boolean;
  onSnoozeToggle: () => void;
  isCompleting: boolean;
  isDeleting: boolean;
}) {
  const type = reminder.type || 'task';
  const isOverdue = new Date(reminder.fireAt) < new Date() && reminder.status !== 'completed';
  const isDone = reminder.status === 'completed';
  const [hovered, setHovered] = useState(false);

  const snoozeOptions = [
    { label: '15 minutes', minutes: 15 },
    { label: '1 hour', minutes: 60 },
    { label: 'Tomorrow', minutes: 1440 },
  ];

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--card)', border: '1px solid var(--b1)',
        borderRadius: 'var(--r-lg)', padding: '15px 16px 15px 18px',
        marginBottom: 6,
        display: 'flex', alignItems: 'flex-start', gap: 13,
        position: 'relative', opacity: isDone ? 0.55 : 1,
        cursor: 'default',
        transition: 'opacity 0.15s'
      }}
    >
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
          background: isDone ? 'var(--sage)' : hovered && !isDone ? 'rgba(255,255,255,0.06)' : 'transparent',
          color: isDone ? '#fff' : 'transparent', fontSize: 11,
          transition: 'all 0.12s'
        }}
        title={isDone ? 'Completed' : 'Mark complete'}
      >{isDone ? '✓' : ''}</div>

      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: isDone ? 'var(--t3)' : 'var(--t1)', lineHeight: 1.35, marginBottom: 5, textDecoration: isDone ? 'line-through' : 'none' }}>
          {reminder.title}
        </div>
        {reminder.notes && <div style={{ fontSize: 11.5, color: 'var(--t3)', marginBottom: 6, lineHeight: 1.5 }}>{reminder.notes}</div>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
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
            <span style={{ fontSize: 10, color: 'var(--t4)', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 4 }}>🔁 recurring</span>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
        opacity: hovered ? 1 : 0, transition: 'opacity 0.15s',
        position: 'relative'
      }}>
        {/* Snooze */}
        {!isDone && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={onSnoozeToggle}
              title="Snooze"
              style={{
                width: 28, height: 28, borderRadius: 7,
                border: '1px solid var(--b1)', background: 'var(--card)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', fontSize: 13, color: 'var(--t2)'
              }}
            >⏰</button>
            {snoozeOpen && (
              <div style={{
                position: 'absolute', right: 0, top: 34,
                background: 'var(--card)', border: '1px solid var(--b1)',
                borderRadius: 'var(--r)', padding: '4px 0',
                zIndex: 50, minWidth: 130,
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
              }}>
                {snoozeOptions.map(opt => (
                  <div
                    key={opt.minutes}
                    onClick={() => onSnooze(opt.minutes)}
                    style={{
                      padding: '8px 14px', fontSize: 12, color: 'var(--t2)',
                      cursor: 'pointer', fontWeight: 500
                    }}
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
          disabled={isDeleting}
          title="Delete"
          style={{
            width: 28, height: 28, borderRadius: 7,
            border: '1px solid rgba(220,38,38,0.2)', background: '#fff5f5',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: 13, color: 'var(--coral)'
          }}
        >🗑</button>
      </div>
    </div>
  );
}

// Inline create reminder modal
function CreateReminderModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [selType, setSelType] = useState('task');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('09:00');
  const [recur, setRecur] = useState('');
  const [note, setNote] = useState('');
  const [priority, setPriority] = useState('medium');

  const createMutation = useMutation({
    mutationFn: () => {
      const fireAt = new Date(`${date}T${time}`).toISOString();
      const type = selType === 'recurring' ? 'task' : selType;
      const payload: Record<string, unknown> = {
        type,
        title: title.trim(),
        fire_at: fireAt,
        priority,
      };
      if (note.trim()) payload['notes'] = note.trim();
      if (recur) {
        const freqMap: Record<string, string> = {
          Daily: 'daily', Weekly: 'weekly', Monthly: 'monthly', Yearly: 'yearly',
        };
        payload['recurrence'] = { frequency: freqMap[recur] ?? 'daily', interval: 1 };
      }
      return api.reminders.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reminders'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      toast.success('Reminder created!');
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Failed to create reminder');
    },
  });

  const typeButtons = [
    { type: 'task', icon: '✓', label: 'Task' },
    { type: 'call', icon: '📞', label: 'Call' },
    { type: 'email', icon: '✉️', label: 'Email' },
    { type: 'location', icon: '📍', label: 'Location' },
    { type: 'event', icon: '📅', label: 'Event' },
    { type: 'recurring', icon: '🔁', label: 'Repeat' },
  ];

  const inputStyle: React.CSSProperties = {
    width: '100%', background: '#f8fafc', border: '1px solid var(--b1)',
    borderRadius: 'var(--r-sm)', padding: '9px 12px',
    fontSize: 13, color: '#0c1a2e', fontFamily: 'var(--font-body)',
    outline: 'none', boxSizing: 'border-box'
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
        zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--card)', border: '1px solid var(--b1)',
          borderRadius: 'var(--r-xl)', width: '100%', maxWidth: 480,
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '18px 22px', borderBottom: '1px solid var(--b1)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--t1)' }}>New Reminder</div>
          <button
            onClick={onClose}
            style={{
              width: 30, height: 30, borderRadius: 8,
              border: '1px solid var(--b1)', background: '#f8fafc',
              cursor: 'pointer', fontSize: 14, color: 'var(--t3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 22px' }}>
          {/* Type grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 16 }}>
            {typeButtons.map(btn => (
              <div
                key={btn.type}
                onClick={() => setSelType(btn.type)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                  padding: '10px 4px', borderRadius: 'var(--r-sm)',
                  border: `1px solid ${selType === btn.type ? 'rgba(232,169,74,0.4)' : 'var(--b1)'}`,
                  cursor: 'pointer', fontSize: 11, fontWeight: 600,
                  color: selType === btn.type ? 'var(--amber)' : 'var(--t3)',
                  background: selType === btn.type ? 'var(--amber-glow)' : '#f8fafc',
                }}
              >
                <span style={{ fontSize: 18 }}>{btn.icon}</span>
                {btn.label}
              </div>
            ))}
          </div>

          {/* Title */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Title *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="What do you need to remember?"
              autoFocus
              style={inputStyle}
            />
          </div>

          {/* Date + Time */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Time</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)} style={inputStyle} />
            </div>
          </div>

          {/* Priority */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Priority</label>
            <select value={priority} onChange={e => setPriority(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          {/* Recurrence */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Repeat</label>
            <select value={recur} onChange={e => setRecur(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="">No repeat</option>
              <option>Daily</option>
              <option>Weekly</option>
              <option>Monthly</option>
              <option>Yearly</option>
            </select>
          </div>

          {/* Notes */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>Notes <span style={{ color: 'var(--t4)', fontWeight: 400 }}>(optional)</span></label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Any extra details..."
              rows={2}
              style={{ ...inputStyle, resize: 'none' }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={onClose}
              style={{
                flex: 1, padding: '10px', border: '1px solid var(--b1)',
                borderRadius: 'var(--r-sm)', background: '#f8fafc',
                cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13,
                fontWeight: 600, color: 'var(--t2)'
              }}
            >Cancel</button>
            <button
              onClick={() => { if (title.trim()) createMutation.mutate(); }}
              disabled={!title.trim() || createMutation.isPending}
              style={{
                flex: 2, padding: '10px',
                background: 'var(--amber)', color: '#ffffff',
                border: 'none', borderRadius: 'var(--r-sm)',
                fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700,
                cursor: (!title.trim() || createMutation.isPending) ? 'not-allowed' : 'pointer',
                boxShadow: 'var(--sh-amber)',
                opacity: (!title.trim() || createMutation.isPending) ? 0.6 : 1,
              }}
            >{createMutation.isPending ? 'Creating...' : 'Create Reminder'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
