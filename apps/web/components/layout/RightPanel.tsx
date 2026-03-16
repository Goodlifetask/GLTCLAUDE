'use client';
import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';

const QUOTES = [
  ['The secret of getting ahead is getting started.', 'Mark Twain'],
  ['Small daily improvements lead to stunning results.', 'Robin Sharma'],
  ['Your time is your most valuable asset. Guard it.', 'Anonymous'],
  ["Don't count the days — make the days count.", 'Muhammad Ali'],
  ['Discipline is the bridge between goals and accomplishment.', 'Jim Rohn'],
  ['Focus on being productive instead of busy.', 'Tim Ferriss'],
  ['The key is not to prioritise what\'s on the schedule, but to schedule priorities.', 'Stephen Covey'],
];

const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];
const DOWS_S = ['S','M','T','W','T','F','S'];

const TYPE_BTNS = [
  { type: 'task',      icon: '✓',  label: 'Task',     color: '#A78BFA' },
  { type: 'call',      icon: '📞', label: 'Call',     color: '#6EE7B7' },
  { type: 'email',     icon: '✉️', label: 'Email',    color: '#93C5FD' },
  { type: 'location',  icon: '📍', label: 'Location', color: '#818CF8' },
  { type: 'event',     icon: '📅', label: 'Event',    color: '#FDE68A' },
  { type: 'recurring', icon: '🔁', label: 'Repeat',   color: '#C4B5FD' },
];

/* glass input shared style */
const glassInput: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 10,
  padding: '9px 13px',
  fontSize: 12,
  color: '#ffffff',
  fontFamily: 'var(--font-body)',
  outline: 'none',
  transition: 'border-color 0.15s, background 0.15s',
};

/* Label above each field */
const glassLabel: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.09em',
  textTransform: 'uppercase',
  color: '#C4B5FD',        /* bright lavender — clearly readable */
  marginBottom: 6,
  display: 'block',
};

export function RightPanel() {
  const qc = useQueryClient();
  const [selType, setSelType] = useState('task');
  const [title, setTitle]     = useState('');
  const [date, setDate]       = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime]       = useState('09:00');
  const [recur, setRecur]     = useState('');
  const [note, setNote]       = useState('');
  const [quote, setQuote]     = useState(QUOTES[0]);
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear,  setCalYear]  = useState(new Date().getFullYear());

  useEffect(() => {
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  }, []);

  const createMutation = useMutation({
    mutationFn: () => {
      const fireAt = new Date(`${date}T${time}`).toISOString();
      const type = selType === 'recurring' ? 'task' : selType;
      const payload: Record<string, unknown> = {
        type, title: title.trim(), fire_at: fireAt,
      };
      if (note.trim()) payload['notes'] = note.trim();
      if (recur) {
        const freqMap: Record<string,string> = {
          Daily:'daily', Weekly:'weekly', Monthly:'monthly', Yearly:'yearly',
        };
        payload['recurrence'] = { frequency: freqMap[recur] ?? 'daily', interval: 1 };
      }
      return api.reminders.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reminders'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Reminder added!');
      setTitle(''); setNote(''); setRecur('');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Failed to create reminder');
    },
  });

  /* calendar helpers */
  const today      = new Date();
  const todayDate  = today.getDate();
  const todayMonth = today.getMonth();
  const todayYear  = today.getFullYear();
  const firstDow   = new Date(calYear, calMonth, 1).getDay();
  const daysInMon  = new Date(calYear, calMonth + 1, 0).getDate();

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  };

  const isToday = (d: number) =>
    d === todayDate && calMonth === todayMonth && calYear === todayYear;

  const selectedColor = TYPE_BTNS.find(b => b.type === selType)?.color ?? '#C4B5FD';

  return (
    <aside
      className="dark-surface"
      style={{
        background: 'linear-gradient(180deg, #3D2BB8 0%, #2D1E8A 100%)',
        borderLeft: '1px solid rgba(255,255,255,0.09)',
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto', overflowX: 'hidden',
      }}
    >

      {/* ── Quick Add ───────────────────────────────────────────── */}
      <div style={{ padding: '22px 18px 20px' }}>

        {/* Section label */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
        }}>
          <div style={{ width: 3, height: 14, borderRadius: 2, background: 'linear-gradient(180deg,#C4B5FD,#818CF8)' }} />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C4B5FD' }}>
            Quick Add
          </span>
        </div>

        {/* Type selector */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 18 }}>
          {TYPE_BTNS.map(btn => {
            const active = selType === btn.type;
            return (
              <button
                key={btn.type}
                onClick={() => setSelType(btn.type)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                  padding: '10px 4px 8px',
                  borderRadius: 12,
                  border: active ? `1.5px solid ${btn.color}` : '1.5px solid rgba(255,255,255,0.1)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 700,
                  color: active ? btn.color : 'rgba(255,255,255,0.5)',
                  background: active ? `${btn.color}1A` : 'rgba(255,255,255,0.05)',
                  transition: 'all 0.15s',
                  boxShadow: active ? `0 0 12px ${btn.color}33` : 'none',
                }}
              >
                <span style={{ fontSize: 17 }}>{btn.icon}</span>
                <span style={{ color: '#FDE68A', fontWeight: 700 }}>{btn.label}</span>
              </button>
            );
          })}
        </div>

        {/* Title */}
        <div style={{ marginBottom: 12 }}>
          <label style={glassLabel}>What needs remembering?</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Title…"
            onKeyDown={e => { if (e.key === 'Enter' && title.trim()) createMutation.mutate(); }}
            style={{ ...glassInput, color: title ? '#ffffff' : 'rgba(255,255,255,0.35)' }}
            onFocus={e => { e.target.style.background = 'rgba(255,255,255,0.11)'; e.target.style.borderColor = `${selectedColor}66`; e.target.style.color = '#fff'; }}
            onBlur={e  => { e.target.style.background = 'rgba(255,255,255,0.07)'; e.target.style.borderColor = 'rgba(255,255,255,0.14)'; }}
          />
        </div>

        {/* Date + Time */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div>
            <label style={glassLabel}>Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              style={{ ...glassInput, colorScheme: 'dark' }} />
          </div>
          <div>
            <label style={glassLabel}>Time</label>
            <input type="time" value={time} onChange={e => setTime(e.target.value)}
              style={{ ...glassInput, colorScheme: 'dark' }} />
          </div>
        </div>

        {/* Repeat */}
        <div style={{ marginBottom: 12 }}>
          <label style={glassLabel}>Repeat</label>
          <select value={recur} onChange={e => setRecur(e.target.value)}
            style={{ ...glassInput, cursor: 'pointer', colorScheme: 'dark' }}>
            <option value="">No repeat</option>
            <option>Daily</option>
            <option>Weekly</option>
            <option>Monthly</option>
            <option>Yearly</option>
          </select>
        </div>

        {/* Note */}
        <div style={{ marginBottom: 16 }}>
          <label style={glassLabel}>
            Note <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400, color: 'rgba(196,181,253,0.5)' }}>(optional)</span>
          </label>
          <textarea value={note} onChange={e => setNote(e.target.value)}
            placeholder="Any extra details…"
            style={{ ...glassInput, resize: 'none', height: 64, verticalAlign: 'top' }}
            onFocus={e => { e.target.style.background = 'rgba(255,255,255,0.11)'; e.target.style.borderColor = `${selectedColor}66`; }}
            onBlur={e  => { e.target.style.background = 'rgba(255,255,255,0.07)'; e.target.style.borderColor = 'rgba(255,255,255,0.14)'; }}
          />
        </div>

        {/* Submit */}
        <button
          onClick={() => { if (title.trim()) createMutation.mutate(); }}
          disabled={!title.trim() || createMutation.isPending}
          style={{
            width: '100%', padding: '11px 0',
            background: title.trim()
              ? 'linear-gradient(135deg, #6C4EFF 0%, #9E7BFF 100%)'
              : 'rgba(255,255,255,0.08)',
            color: title.trim() ? '#ffffff' : 'rgba(255,255,255,0.3)',
            border: 'none', borderRadius: 12,
            fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700,
            cursor: (!title.trim() || createMutation.isPending) ? 'not-allowed' : 'pointer',
            boxShadow: title.trim() ? '0 4px 20px rgba(108,78,255,0.45)' : 'none',
            transition: 'all 0.2s',
            letterSpacing: '0.02em',
          }}
        >
          {createMutation.isPending ? '…Adding' : '+ Add Reminder'}
        </button>
      </div>

      {/* ── Divider ─────────────────────────────────────────────── */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '0 18px' }} />

      {/* ── Mini Calendar ───────────────────────────────────────── */}
      <div style={{ padding: '20px 18px' }}>

        {/* Cal header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <button onClick={prevMonth} style={{
            width: 28, height: 28, borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.07)',
            color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.12s',
          }}>‹</button>
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: '#ffffff',
          }}>
            {MONTHS[calMonth]} {calYear}
          </span>
          <button onClick={nextMonth} style={{
            width: 28, height: 28, borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.07)',
            color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.12s',
          }}>›</button>
        </div>

        {/* Day-of-week headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
          {DOWS_S.map((d, i) => (
            <div key={i} style={{
              textAlign: 'center', fontSize: 9, fontWeight: 700,
              color: 'rgba(196,181,253,0.5)', paddingBottom: 6,
              textTransform: 'uppercase',
            }}>{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
          {Array.from({ length: firstDow }).map((_, i) => <div key={`pad${i}`} />)}
          {Array.from({ length: daysInMon }, (_, i) => i + 1).map(d => {
            const tod = isToday(d);
            return (
              <div key={d} style={{
                aspectRatio: '1', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: 11, borderRadius: 8, cursor: 'pointer',
                fontWeight: tod ? 700 : 400,
                color: tod ? '#ffffff' : 'rgba(255,255,255,0.65)',
                background: tod
                  ? 'linear-gradient(135deg, #6C4EFF, #9E7BFF)'
                  : 'transparent',
                boxShadow: tod ? '0 2px 10px rgba(108,78,255,0.5)' : 'none',
                transition: 'all 0.12s',
              }}>{d}</div>
            );
          })}
        </div>
      </div>

      {/* ── Divider ─────────────────────────────────────────────── */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '0 18px' }} />

      {/* ── Quote ───────────────────────────────────────────────── */}
      <div style={{ padding: '20px 18px', marginTop: 'auto' }}>
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(196,181,253,0.18)',
          borderRadius: 16,
          padding: '18px 16px',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Decorative blob */}
          <div style={{
            position: 'absolute', right: -20, bottom: -20,
            width: 80, height: 80, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(108,78,255,0.25) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 52,
            color: 'rgba(196,181,253,0.15)', lineHeight: 0.8,
            marginBottom: 6, pointerEvents: 'none', userSelect: 'none',
          }}>&ldquo;</div>
          <p style={{
            fontFamily: 'var(--font-display)', fontSize: 12,
            fontStyle: 'italic', color: 'rgba(255,255,255,0.72)',
            lineHeight: 1.7, margin: 0, position: 'relative',
          }}>{quote[0]}</p>
          <p style={{
            fontSize: 11, fontWeight: 600,
            color: 'rgba(196,181,253,0.7)',
            marginTop: 10, marginBottom: 0,
          }}>— {quote[1]}</p>
        </div>
      </div>

    </aside>
  );
}
