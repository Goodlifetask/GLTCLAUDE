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
];

export function RightPanel() {
  const qc = useQueryClient();
  const [selType, setSelType] = useState('task');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('09:00');
  const [recur, setRecur] = useState('');
  const [note, setNote] = useState('');
  const [quote, setQuote] = useState(QUOTES[0]);
  useEffect(() => { setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]); }, []);

  const createMutation = useMutation({
    mutationFn: () => {
      const fireAt = new Date(`${date}T${time}`).toISOString();
      const type = selType === 'recurring' ? 'task' : selType;
      const payload: Record<string, unknown> = {
        type,
        title: title.trim(),
        fire_at: fireAt,
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
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Reminder added!');
      setTitle('');
      setNote('');
      setRecur('');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Failed to create reminder');
    },
  });

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const DOWS = ['Su','Mo','Tu','We','Th','Fr','Sa'];
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayDate = today.getDate();

  const typeButtons = [
    { type: 'task', icon: '✓', label: 'Task' },
    { type: 'call', icon: '📞', label: 'Call' },
    { type: 'email', icon: '✉️', label: 'Email' },
    { type: 'location', icon: '📍', label: 'Location' },
    { type: 'event', icon: '📅', label: 'Event' },
    { type: 'recurring', icon: '🔁', label: 'Repeat' },
  ];

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--card)', border: '1px solid var(--b1)',
    borderRadius: 'var(--r-sm)', padding: '8px 11px',
    fontSize: 12, color: 'var(--t1)', fontFamily: 'var(--font-body)',
    outline: 'none', marginBottom: 10
  };

  const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: 'var(--t4)', marginBottom: 4, display: 'block' };

  return (
    <aside style={{
      background: 'var(--bg-raised)',
      borderLeft: '1px solid var(--b1)',
      display: 'flex', flexDirection: 'column',
      overflowY: 'auto', overflowX: 'hidden'
    }}>
      {/* Add Reminder */}
      <div style={{ padding: '20px 18px', borderBottom: '1px solid var(--b2)' }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(176,196,216,0.5)', marginBottom: 14 }}>Add Reminder</div>

        {/* Type grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5, marginBottom: 14 }}>
          {typeButtons.map(btn => (
            <div key={btn.type} onClick={() => setSelType(btn.type)} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              padding: '9px 4px', borderRadius: 'var(--r-sm)',
              border: `1px solid ${selType === btn.type ? 'rgba(232,169,74,0.4)' : 'var(--b1)'}`,
              cursor: 'pointer', fontSize: 10, fontWeight: 600,
              color: selType === btn.type ? 'var(--amber)' : 'var(--t3)',
              background: selType === btn.type ? 'var(--amber-glow)' : 'var(--card)',
            }}>
              <span style={{ fontSize: 18 }}>{btn.icon}</span>
              {btn.label}
            </div>
          ))}
        </div>

        <label style={labelStyle}>What needs remembering?</label>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title..." style={inputStyle} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <label style={labelStyle}>Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Time</label>
            <input type="time" value={time} onChange={e => setTime(e.target.value)} style={inputStyle} />
          </div>
        </div>

        <label style={labelStyle}>Repeat</label>
        <select value={recur} onChange={e => setRecur(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
          <option value="">No repeat</option>
          <option>Daily</option>
          <option>Weekly</option>
          <option>Monthly</option>
          <option>Yearly</option>
        </select>

        <label style={labelStyle}>Note <span style={{ color: 'var(--t4)', fontWeight: 400 }}>(optional)</span></label>
        <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Any extra details..." style={{ ...inputStyle, resize: 'none', height: 62 }} />

        <button
          onClick={() => { if (title.trim()) createMutation.mutate(); }}
          disabled={!title.trim() || createMutation.isPending}
          style={{
            width: '100%', padding: 11,
            background: 'var(--amber)', color: '#ffffff',
            border: 'none', borderRadius: 'var(--r-sm)',
            fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700,
            cursor: (!title.trim() || createMutation.isPending) ? 'not-allowed' : 'pointer',
            boxShadow: 'var(--sh-amber)',
            opacity: (!title.trim() || createMutation.isPending) ? 0.6 : 1,
          }}
        >{createMutation.isPending ? 'Adding...' : 'Add Reminder'}</button>
      </div>

      {/* Mini Calendar */}
      <div style={{ padding: '20px 18px', borderBottom: '1px solid var(--b2)' }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(176,196,216,0.5)', marginBottom: 14 }}>{MONTHS[month]} {year}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <button style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 12 }}>&#8249;</button>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 500, color: '#ffffff' }}>{MONTHS[month]} {year}</span>
          <button style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 12 }}>&#8250;</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
          {DOWS.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 9, fontWeight: 700, color: 'rgba(176,196,216,0.5)', padding: '4px 0', textTransform: 'uppercase' }}>{d}</div>)}
          {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => (
            <div key={d} style={{
              aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, borderRadius: 7, cursor: 'pointer',
              color: d === todayDate ? '#141210' : 'rgba(255,255,255,0.75)',
              background: d === todayDate ? 'var(--amber)' : 'transparent',
              fontWeight: d === todayDate ? 700 : 500,
              boxShadow: d === todayDate ? 'var(--sh-amber)' : 'none'
            }}>{d}</div>
          ))}
        </div>
      </div>

      {/* Quote */}
      <div style={{ padding: '20px 18px' }}>
        <div style={{
          background: 'linear-gradient(135deg, #1d1810, #261f15)',
          border: '1px solid rgba(232,169,74,0.15)',
          borderRadius: 'var(--r-lg)', padding: '18px 16px',
          position: 'relative', overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute', top: -14, left: 10,
            fontFamily: 'var(--font-display)', fontSize: 80,
            color: 'rgba(232,169,74,0.12)', lineHeight: 1, pointerEvents: 'none'
          }}>&ldquo;</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontStyle: 'italic', color: 'rgba(255,255,255,0.7)', lineHeight: 1.65, position: 'relative' }}>{quote[0]}</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--amber)', marginTop: 10, opacity: 0.8 }}>— {quote[1]}</div>
        </div>
      </div>
    </aside>
  );
}
