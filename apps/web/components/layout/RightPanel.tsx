'use client';
import { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAllCategories } from '../../hooks/useAllCategories';
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
  { type: 'task',      icon: '✓',  label: 'Task' },
  { type: 'call',      icon: '📞', label: 'Call' },
  { type: 'email',     icon: '✉️', label: 'Email' },
  { type: 'location',  icon: '📍', label: 'Location' },
  { type: 'event',     icon: '📅', label: 'Event' },
  { type: 'recurring', icon: '🔁', label: 'Repeat' },
];

const fieldInput: React.CSSProperties = {
  width: '100%',
  background: '#ffffff',
  border: '1px solid var(--b1)',
  borderRadius: 8,
  padding: '9px 12px',
  fontSize: 12,
  color: 'var(--t1)',
  fontFamily: 'var(--font-body)',
  outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
};

const fieldLabel: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--t3)',
  marginBottom: 5,
  display: 'block',
};

export function RightPanel() {
  const qc = useQueryClient();
  const [selType, setSelType] = useState('task');
  const [title, setTitle]     = useState('');
  const [date, setDate]       = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime]       = useState('09:00');
  const [recur, setRecur]     = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote]       = useState('');
  const [quote, setQuote]     = useState(QUOTES[0]);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const allCategories = useAllCategories();
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
      if (category) payload['category'] = category;
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
      qc.invalidateQueries({ queryKey: ['tasks-all'] });
      toast.success('Reminder added!');
      setTitle(''); setNote(''); setRecur(''); setCategory('');
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

  const startVoice = async () => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) { toast.error('Voice not supported in this browser'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
    } catch {
      toast.error('Microphone access denied — allow it in browser settings, then reload the page and try again.');
      return;
    }
    const rec = new SpeechRec();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-US';
    rec.onstart = () => setListening(true);
    rec.onend   = () => setListening(false);
    rec.onerror = () => { setListening(false); toast.error('Voice error — try again'); };
    rec.onresult = (e: any) => {
      const text = e.results[0]?.[0]?.transcript?.trim();
      if (text) setTitle(text);
    };
    recognitionRef.current = rec;
    rec.start();
  };

  const stopVoice = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  return (
    <aside
      style={{
        background: 'var(--bg-raised)',
        borderLeft: '1px solid var(--b1)',
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto', overflowX: 'hidden',
      }}
    >

      {/* ── Quick Add ───────────────────────────────────────────── */}
      <div style={{ padding: '22px 18px 20px' }}>

        {/* Section label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <div style={{ width: 3, height: 14, borderRadius: 2, background: 'var(--amber)' }} />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--t3)' }}>
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
                  borderRadius: 10,
                  border: active ? '1.5px solid var(--amber)' : '1.5px solid var(--b1)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 700,
                  color: active ? 'var(--amber)' : 'var(--t3)',
                  background: active ? 'var(--amber-glow)' : 'var(--bg)',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: 17 }}>{btn.icon}</span>
                <span>{btn.label}</span>
              </button>
            );
          })}
        </div>

        {/* Title */}
        <div style={{ marginBottom: 12 }}>
          <label style={fieldLabel}>What needs remembering?</label>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Title…"
              onKeyDown={e => { if (e.key === 'Enter' && title.trim()) createMutation.mutate(); }}
              style={{ ...fieldInput, flex: 1 }}
              onFocus={e => { e.target.style.borderColor = 'var(--amber)'; e.target.style.boxShadow = '0 0 0 3px var(--amber-glow)'; }}
              onBlur={e  => { e.target.style.borderColor = 'var(--b1)'; e.target.style.boxShadow = 'none'; }}
            />
            <button
              onClick={listening ? stopVoice : startVoice}
              title={listening ? 'Stop listening' : 'Voice input'}
              style={{
                flexShrink: 0,
                width: 36, height: 36, borderRadius: 8,
                border: listening ? '1.5px solid var(--coral)' : '1.5px solid var(--b1)',
                background: listening ? 'var(--coral-bg)' : 'var(--bg)',
                color: listening ? 'var(--coral)' : 'var(--t3)',
                fontSize: 16, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: listening ? 'pulse 1s infinite' : 'none',
              }}
            >{listening ? '⏹' : '🎤'}</button>
          </div>
        </div>

        {/* Date + Time */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div>
            <label style={fieldLabel}>Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              style={fieldInput}
              onFocus={e => { e.target.style.borderColor = 'var(--amber)'; e.target.style.boxShadow = '0 0 0 3px var(--amber-glow)'; }}
              onBlur={e  => { e.target.style.borderColor = 'var(--b1)'; e.target.style.boxShadow = 'none'; }} />
          </div>
          <div>
            <label style={fieldLabel}>Time</label>
            <input type="time" value={time} onChange={e => setTime(e.target.value)}
              style={fieldInput}
              onFocus={e => { e.target.style.borderColor = 'var(--amber)'; e.target.style.boxShadow = '0 0 0 3px var(--amber-glow)'; }}
              onBlur={e  => { e.target.style.borderColor = 'var(--b1)'; e.target.style.boxShadow = 'none'; }} />
          </div>
        </div>

        {/* Repeat */}
        <div style={{ marginBottom: 12 }}>
          <label style={fieldLabel}>Repeat</label>
          <select value={recur} onChange={e => setRecur(e.target.value)}
            style={{ ...fieldInput, cursor: 'pointer' }}>
            <option value="">No repeat</option>
            <option>Daily</option>
            <option>Weekly</option>
            <option>Monthly</option>
            <option>Yearly</option>
          </select>
        </div>

        {/* Category */}
        <div style={{ marginBottom: 12 }}>
          <label style={fieldLabel}>Category</label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            style={{ ...fieldInput, cursor: 'pointer' }}
          >
            <option value="">— No category —</option>
            {allCategories.map(cat => (
              <option key={cat.slug} value={cat.slug}>
                {cat.icon} {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Note */}
        <div style={{ marginBottom: 16 }}>
          <label style={fieldLabel}>
            Note <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400, color: 'var(--t4)' }}>(optional)</span>
          </label>
          <textarea value={note} onChange={e => setNote(e.target.value)}
            placeholder="Any extra details…"
            style={{ ...fieldInput, resize: 'none', height: 64, verticalAlign: 'top' }}
            onFocus={e => { e.target.style.borderColor = 'var(--amber)'; e.target.style.boxShadow = '0 0 0 3px var(--amber-glow)'; }}
            onBlur={e  => { e.target.style.borderColor = 'var(--b1)'; e.target.style.boxShadow = 'none'; }}
          />
        </div>

        {/* Submit */}
        <button
          onClick={() => { if (title.trim()) createMutation.mutate(); }}
          disabled={!title.trim() || createMutation.isPending}
          style={{
            width: '100%', padding: '11px 0',
            background: title.trim() ? 'var(--amber)' : 'var(--bg)',
            color: title.trim() ? '#ffffff' : 'var(--t4)',
            border: title.trim() ? 'none' : '1px solid var(--b1)',
            borderRadius: 10,
            fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700,
            cursor: (!title.trim() || createMutation.isPending) ? 'not-allowed' : 'pointer',
            boxShadow: title.trim() ? 'var(--sh-amber)' : 'none',
            transition: 'all 0.2s',
          }}
        >
          {createMutation.isPending ? '…Adding' : '+ Add Reminder'}
        </button>
      </div>

      {/* ── Divider ─────────────────────────────────────────────── */}
      <div style={{ height: 1, background: 'var(--b1)', margin: '0 18px' }} />

      {/* ── Mini Calendar ───────────────────────────────────────── */}
      <div style={{ padding: '20px 18px' }}>

        {/* Cal header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <button onClick={prevMonth} style={{
            width: 28, height: 28, borderRadius: 8,
            border: '1px solid var(--b1)',
            background: 'var(--bg)',
            color: 'var(--t3)', cursor: 'pointer', fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>‹</button>
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, color: 'var(--t1)',
          }}>
            {MONTHS[calMonth]} {calYear}
          </span>
          <button onClick={nextMonth} style={{
            width: 28, height: 28, borderRadius: 8,
            border: '1px solid var(--b1)',
            background: 'var(--bg)',
            color: 'var(--t3)', cursor: 'pointer', fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>›</button>
        </div>

        {/* Day-of-week headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
          {DOWS_S.map((d, i) => (
            <div key={i} style={{
              textAlign: 'center', fontSize: 9, fontWeight: 700,
              color: 'var(--t4)', paddingBottom: 6,
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
                color: tod ? '#ffffff' : 'var(--t2)',
                background: tod ? 'var(--amber)' : 'transparent',
                boxShadow: tod ? 'var(--sh-amber)' : 'none',
                transition: 'all 0.12s',
              }}>{d}</div>
            );
          })}
        </div>
      </div>

      {/* ── Divider ─────────────────────────────────────────────── */}
      <div style={{ height: 1, background: 'var(--b1)', margin: '0 18px' }} />

      {/* ── Quote ───────────────────────────────────────────────── */}
      <div style={{ padding: '20px 18px', marginTop: 'auto' }}>
        <div style={{
          background: 'var(--amber-soft)',
          border: '1px solid var(--card-border)',
          borderRadius: 14,
          padding: '18px 16px',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 40,
            color: 'var(--amber-glow)', lineHeight: 0.8,
            marginBottom: 6, pointerEvents: 'none', userSelect: 'none',
            opacity: 0.6,
          }}>&ldquo;</div>
          <p style={{
            fontFamily: 'var(--font-display)', fontSize: 12,
            fontStyle: 'italic', color: 'var(--t2)',
            lineHeight: 1.7, margin: 0,
          }}>{quote[0]}</p>
          <p style={{
            fontSize: 11, fontWeight: 600,
            color: 'var(--amber)',
            marginTop: 10, marginBottom: 0,
          }}>— {quote[1]}</p>
        </div>
      </div>

    </aside>
  );
}
