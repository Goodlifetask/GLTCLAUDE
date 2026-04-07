'use client';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { api } from '../../../lib/api';

/* ── Constants ─────────────────────────────────────────────────────── */
const MONTHS   = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_S = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DOWS     = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const DOWS_S   = ['S','M','T','W','T','F','S'];
const HOURS    = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2,'0')}:00`);

const TYPE_META: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  call:     { color: '#10b981', bg: 'rgba(16,185,129,0.12)',  icon: '📞', label: 'Call'     },
  task:     { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  icon: '◎',  label: 'Task'     },
  email:    { color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)',  icon: '✉️',  label: 'Email'    },
  location: { color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', icon: '📍', label: 'Location' },
  event:    { color: '#f43f5e', bg: 'rgba(244,63,94,0.12)',   icon: '📅', label: 'Event'    },
};
const DEFAULT_TYPE = { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: '◎', label: 'Task' };
function tm(type: string) { return TYPE_META[type] ?? DEFAULT_TYPE; }

type View = 'day' | 'week' | 'month' | 'year' | 'leap';

/* ── Helpers ─────────────────────────────────────────────────────────── */
function isLeapYear(y: number) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }
function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function weekStart(date: Date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0,0,0,0);
  return d;
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/* ── Compact event pill for month/week cells ─────────────────────────── */
function EventPill({ r, tiny }: { r: any; tiny?: boolean }) {
  const m = tm(r.type);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: tiny ? 3 : 4,
      padding: tiny ? '1px 5px' : '2px 6px',
      borderRadius: 4, marginBottom: 2,
      background: m.bg,
      border: `1px solid ${m.color}30`,
      overflow: 'hidden',
    }}>
      <span style={{ fontSize: tiny ? 9 : 10, flexShrink: 0 }}>{m.icon}</span>
      <span style={{
        fontSize: tiny ? 9 : 10, fontWeight: 500, color: m.color,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        flex: 1,
      }}>{r.title}</span>
    </div>
  );
}

/* ── Day detail panel ─────────────────────────────────────────────────── */
function DayPanel({
  date, reminders, isLoading, onQuickAdd,
}: {
  date: Date | null;
  reminders: any[];
  isLoading: boolean;
  onQuickAdd?: () => void;
}) {
  const grouped = useMemo(() => {
    const g: Record<string, any[]> = {};
    reminders.forEach(r => {
      const h = new Date(r.fireAt).getHours();
      const label = h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening';
      (g[label] = g[label] || []).push(r);
    });
    return g;
  }, [reminders]);

  return (
    <div style={{
      width: 270, flexShrink: 0,
      background: 'var(--card)', border: '1px solid var(--b1)',
      borderRadius: 14, overflow: 'hidden',
      alignSelf: 'flex-start', position: 'sticky', top: 78,
    }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--b1)' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: 'var(--t1)' }}>
          {date ? date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'Select a day'}
        </div>
        <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>
          {date ? `${reminders.length} reminder${reminders.length !== 1 ? 's' : ''}` : 'Click any date to inspect'}
        </div>
      </div>

      {/* Reminder list */}
      <div style={{ maxHeight: 380, overflowY: 'auto' }}>
        {isLoading ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--t3)', fontSize: 12 }}>Loading…</div>
        ) : !date ? (
          <div style={{ padding: '32px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 28, opacity: 0.25, marginBottom: 8 }}>📅</div>
            <div style={{ fontSize: 12, color: 'var(--t4)' }}>Click any date</div>
          </div>
        ) : reminders.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 28, opacity: 0.2, marginBottom: 8 }}>✦</div>
            <div style={{ fontSize: 12, color: 'var(--t4)' }}>No reminders this day</div>
          </div>
        ) : (
          ['Morning', 'Afternoon', 'Evening'].map(period => {
            const items = grouped[period];
            if (!items?.length) return null;
            return (
              <div key={period}>
                <div style={{
                  padding: '7px 14px 4px',
                  fontSize: 9, fontWeight: 700, color: 'var(--t4)',
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                  borderTop: '1px solid var(--b2)',
                }}>{period}</div>
                {items.map((r: any) => {
                  const m = tm(r.type);
                  return (
                    <div key={r.id} style={{
                      padding: '9px 14px',
                      display: 'flex', gap: 10, alignItems: 'flex-start',
                      borderBottom: '1px solid var(--b2)',
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                        background: m.bg, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: 13,
                      }}>{m.icon}</div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.title}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 10, fontWeight: 600, color: m.color, background: m.bg, padding: '1px 6px', borderRadius: 20 }}>
                            {m.label}
                          </span>
                          <span style={{ fontSize: 10, color: 'var(--t4)' }}>{fmtTime(r.fireAt)}</span>
                        </div>
                        {r.notes && (
                          <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {r.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>

      {/* Quick add button */}
      {date && (
        <div style={{ padding: '12px 14px', borderTop: '1px solid var(--b1)' }}>
          <button
            onClick={onQuickAdd}
            style={{
              width: '100%', padding: '9px 0', borderRadius: 8,
              background: 'var(--amber)', border: 'none', color: '#fff',
              cursor: 'pointer', fontFamily: 'var(--font-body)',
              fontSize: 12, fontWeight: 700,
            }}
          >+ Add Reminder</button>
        </div>
      )}
    </div>
  );
}

/* ── Quick Add Modal ─────────────────────────────────────────────────── */
function QuickAddModal({ date, onClose }: { date: Date | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [title, setTitle]   = useState('');
  const [type, setType]     = useState('task');
  const [time, setTime]     = useState('09:00');
  const [dateStr, setDateStr] = useState(
    date ? date.toISOString().slice(0,10) : new Date().toISOString().slice(0,10)
  );

  const mut = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.reminders.create(data),
    onSuccess: () => {
      toast.success('Reminder added!');
      qc.invalidateQueries({ queryKey: ['cal'] });
      onClose();
    },
    onError: () => toast.error('Failed to add reminder'),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { toast.error('Title is required'); return; }
    const fireAt = new Date(`${dateStr}T${time}:00`).toISOString();
    mut.mutate({ title: title.trim(), type, fire_at: fireAt });
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--card)', borderRadius: 16, border: '1px solid var(--b1)',
        width: '100%', maxWidth: 420, boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 22px 14px', borderBottom: '1px solid var(--b1)',
        }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: 'var(--t1)' }}>
            Quick Add Reminder
          </span>
          <button onClick={onClose} style={{
            width: 26, height: 26, borderRadius: 6, background: 'var(--bg-raised)',
            border: '1px solid var(--b1)', cursor: 'pointer', fontSize: 13, color: 'var(--t3)',
          }}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 22 }}>
          {/* Type selector */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
            {Object.entries(TYPE_META).map(([t, m]) => (
              <button key={t} type="button" onClick={() => setType(t)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                  border: `1px solid ${type === t ? m.color : 'var(--b1)'}`,
                  background: type === t ? m.bg : 'transparent',
                  color: type === t ? m.color : 'var(--t3)',
                  cursor: 'pointer',
                }}>
                <span>{m.icon}</span> {m.label}
              </button>
            ))}
          </div>
          {/* Title */}
          <input
            autoFocus
            value={title} onChange={e => setTitle(e.target.value)}
            placeholder="What needs remembering?"
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 8,
              background: 'var(--bg-raised)', border: '1px solid var(--b1)',
              fontSize: 13, color: 'var(--t1)', fontFamily: 'var(--font-body)',
              outline: 'none', boxSizing: 'border-box', marginBottom: 12,
            }}
          />
          {/* Date + Time */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
            <input type="date" value={dateStr} onChange={e => setDateStr(e.target.value)}
              style={{
                padding: '9px 10px', borderRadius: 8, background: 'var(--bg-raised)',
                border: '1px solid var(--b1)', fontSize: 12, color: 'var(--t1)',
                fontFamily: 'var(--font-body)', outline: 'none',
              }} />
            <input type="time" value={time} onChange={e => setTime(e.target.value)}
              style={{
                padding: '9px 10px', borderRadius: 8, background: 'var(--bg-raised)',
                border: '1px solid var(--b1)', fontSize: 12, color: 'var(--t1)',
                fontFamily: 'var(--font-body)', outline: 'none',
              }} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" disabled={mut.isPending} style={{
              flex: 1, padding: '10px 0', borderRadius: 9,
              background: 'var(--amber)', border: 'none', color: '#fff',
              cursor: mut.isPending ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700,
              opacity: mut.isPending ? 0.6 : 1,
            }}>{mut.isPending ? 'Adding…' : 'Add Reminder'}</button>
            <button type="button" onClick={onClose} style={{
              padding: '10px 18px', borderRadius: 9,
              background: 'var(--bg-raised)', border: '1px solid var(--b1)',
              cursor: 'pointer', fontFamily: 'var(--font-body)',
              fontSize: 13, fontWeight: 600, color: 'var(--t3)',
            }}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════ */
export default function CalendarPage() {
  const router = useRouter();
  const today  = new Date();
  const [view, setView]         = useState<View>('month');
  const [cursor, setCursor]     = useState(new Date(today));
  const [selected, setSelected] = useState<Date | null>(today);
  const [quickAdd, setQuickAdd] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string[]>([]); // empty = show all

  /* ── Fetch range ──────────────────────────────────────────────────── */
  const { from, to } = useMemo(() => {
    if (view === 'day') {
      const d = new Date(cursor); d.setHours(0,0,0,0);
      const e = new Date(cursor); e.setHours(23,59,59,999);
      return { from: d.toISOString(), to: e.toISOString() };
    }
    if (view === 'week') {
      const s = weekStart(cursor);
      const e = new Date(s); e.setDate(s.getDate()+6); e.setHours(23,59,59,999);
      return { from: s.toISOString(), to: e.toISOString() };
    }
    if (view === 'month') {
      const y = cursor.getFullYear(), m = cursor.getMonth();
      return { from: new Date(y,m,1).toISOString(), to: new Date(y,m+1,0,23,59,59,999).toISOString() };
    }
    if (view === 'year') {
      const y = cursor.getFullYear();
      return { from: new Date(y,0,1).toISOString(), to: new Date(y,11,31,23,59,59,999).toISOString() };
    }
    const ly = cursor.getFullYear() - (cursor.getFullYear()%4);
    return { from: new Date(ly,0,1).toISOString(), to: new Date(ly+3,11,31,23,59,59,999).toISOString() };
  }, [view, cursor]);

  const { data, isLoading } = useQuery({
    queryKey: ['cal', view, from, to],
    queryFn: () => api.reminders.list({ limit: 200, from, to }),
    staleTime: 30_000,
  });

  const allReminders: any[] = useMemo(() => {
    const raw = (data as any)?.data?.reminders ?? (data as any)?.data ?? [];
    return Array.isArray(raw) ? raw : [];
  }, [data]);

  /* Apply type filter */
  const reminders = useMemo(() =>
    typeFilter.length === 0 ? allReminders : allReminders.filter(r => typeFilter.includes(r.type)),
  [allReminders, typeFilter]);

  /* Group by date */
  const byDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    reminders.forEach(r => {
      if (!r.fireAt) return;
      const key = new Date(r.fireAt).toISOString().slice(0,10);
      (map[key] = map[key] || []).push(r);
    });
    return map;
  }, [reminders]);

  const dateKey  = (d: Date) => d.toISOString().slice(0,10);
  const isToday  = (d: Date) => dateKey(d) === dateKey(today);
  const isSel    = (d: Date) => !!(selected && dateKey(d) === dateKey(selected));
  const dayRems  = (d: Date) => byDate[dateKey(d)] || [];
  const selRems  = selected ? dayRems(selected) : [];

  /* Navigation */
  const navigate = (dir: 1 | -1) => {
    const d = new Date(cursor);
    if (view==='day')   d.setDate(d.getDate()+dir);
    if (view==='week')  d.setDate(d.getDate()+dir*7);
    if (view==='month') d.setMonth(d.getMonth()+dir);
    if (view==='year')  d.setFullYear(d.getFullYear()+dir);
    if (view==='leap')  d.setFullYear(d.getFullYear()+dir*4);
    setCursor(d);
  };

  const title = useMemo(() => {
    if (view==='day')   return cursor.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
    if (view==='week')  { const s=weekStart(cursor),e=new Date(s); e.setDate(s.getDate()+6); return `${s.toLocaleDateString('en-US',{month:'short',day:'numeric'})} – ${e.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}`; }
    if (view==='month') return `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`;
    if (view==='year')  return `${cursor.getFullYear()}`;
    const ly=cursor.getFullYear()-(cursor.getFullYear()%4); return `${ly} – ${ly+3}  (Leap cycle)`;
  }, [view, cursor]);

  const toggleType = (t: string) =>
    setTypeFilter(f => f.includes(t) ? f.filter(x => x !== t) : [...f, t]);

  /* ── NAV BUTTON STYLE ─────────────────────────────────────────────── */
  const navBtn: React.CSSProperties = {
    width: 30, height: 30, borderRadius: 8,
    border: '1px solid var(--b1)', background: 'var(--card)',
    cursor: 'pointer', fontSize: 16, color: 'var(--t2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'var(--font-body)',
  };

  /* ════════════════════════════════════════════════════════════════════
     VIEW RENDERERS
  ════════════════════════════════════════════════════════════════════ */

  /* DAY VIEW */
  const DayView = () => {
    const rems = dayRems(cursor);
    return (
      <div style={{ display: 'flex', gap: 18 }}>
        <div style={{ flex: 1, background: 'var(--card)', border: '1px solid var(--b1)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{
            padding: '12px 18px', borderBottom: '1px solid var(--b1)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: 'var(--t1)' }}>
                {isToday(cursor) ? '— Today' : cursor.toLocaleDateString('en-US',{weekday:'long'})}
              </span>
              <span style={{ fontWeight: 400, fontSize: 11, color: 'var(--t3)', marginLeft: 8 }}>
                {rems.length} reminder{rems.length!==1?'s':''}
              </span>
            </div>
            <button onClick={() => setQuickAdd(true)} style={{
              padding: '6px 14px', borderRadius: 8, background: 'var(--amber)',
              border: 'none', color: '#fff', cursor: 'pointer',
              fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 700,
            }}>+ Add</button>
          </div>
          <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 220px)' }}>
            {HOURS.map(h => {
              const hour = parseInt(h);
              const slot = rems.filter(r => new Date(r.fireAt).getHours()===hour);
              const isCurrHour = hour===today.getHours()&&isToday(cursor);
              return (
                <div key={h} style={{
                  display: 'flex', minHeight: 52,
                  borderBottom: '1px solid var(--b2)',
                  background: isCurrHour ? 'rgba(245,158,11,0.04)' : 'transparent',
                  position: 'relative',
                }}>
                  {isCurrHour && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: 'var(--amber)' }} />}
                  <div style={{
                    width: 58, padding: '10px 10px 0', fontSize: 10, color: isCurrHour ? 'var(--amber)' : 'var(--t4)',
                    fontWeight: isCurrHour ? 700 : 500, flexShrink: 0, borderRight: '1px solid var(--b2)', textAlign: 'right',
                  }}>{h}</div>
                  <div style={{ flex: 1, padding: '6px 10px' }}>
                    {slot.map(r => {
                      const m = tm(r.type);
                      return (
                        <div key={r.id} style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '7px 12px', borderRadius: 9, marginBottom: 4,
                          background: m.bg, border: `1px solid ${m.color}30`,
                        }}>
                          <span style={{ fontSize: 14 }}>{m.icon}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</div>
                            {r.notes && <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 1 }}>{r.notes}</div>}
                          </div>
                          <span style={{ fontSize: 10, color: m.color, fontWeight: 600, background: m.bg, padding: '2px 7px', borderRadius: 20, flexShrink: 0 }}>
                            {fmtTime(r.fireAt)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <DayPanel date={cursor} reminders={rems} isLoading={isLoading} onQuickAdd={() => setQuickAdd(true)} />
      </div>
    );
  };

  /* WEEK VIEW */
  const WeekView = () => {
    const ws   = weekStart(cursor);
    const days = Array.from({length:7},(_,i)=>{ const d=new Date(ws); d.setDate(ws.getDate()+i); return d; });
    return (
      <div style={{ display: 'flex', gap: 18 }}>
        <div style={{ flex: 1, background: 'var(--card)', border: '1px solid var(--b1)', borderRadius: 14, overflow: 'hidden' }}>
          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: '1px solid var(--b1)' }}>
            {days.map(d => {
              const cnt = dayRems(d).length;
              return (
                <div key={d.toISOString()} onClick={() => setSelected(new Date(d))} style={{
                  padding: '10px 6px', textAlign: 'center', cursor: 'pointer',
                  background: isSel(d) ? 'var(--amber-glow)' : isToday(d) ? 'rgba(245,158,11,0.06)' : 'transparent',
                  borderRight: '1px solid var(--b2)',
                }}>
                  <div style={{ fontSize: 10, color: 'var(--t4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{DOWS[d.getDay()]}</div>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', margin: '4px auto 2px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: isToday(d) ? 700 : 500,
                    background: isToday(d) ? 'var(--amber)' : 'transparent',
                    color: isToday(d) ? '#fff' : isSel(d) ? 'var(--amber)' : 'var(--t1)',
                  }}>{d.getDate()}</div>
                  {cnt > 0 && (
                    <div style={{
                      fontSize: 9, fontWeight: 700, color: 'var(--amber)',
                      background: 'var(--amber-glow)', padding: '1px 6px', borderRadius: 20,
                      display: 'inline-block',
                    }}>{cnt}</div>
                  )}
                </div>
              );
            })}
          </div>
          {/* Hourly rows */}
          <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 260px)' }}>
            {HOURS.map(h => {
              const hour = parseInt(h);
              return (
                <div key={h} style={{ display: 'flex', borderBottom: '1px solid var(--b2)', minHeight: 48 }}>
                  <div style={{ width: 50, padding: '8px 8px 0', fontSize: 10, color: 'var(--t4)', fontWeight: 600, flexShrink: 0, borderRight: '1px solid var(--b2)', textAlign: 'right' }}>{h}</div>
                  {days.map(d => {
                    const slot = dayRems(d).filter(r => new Date(r.fireAt).getHours()===hour);
                    return (
                      <div key={d.toISOString()} style={{
                        flex: 1, padding: '4px 3px', borderRight: '1px solid var(--b2)',
                        background: isSel(d) ? 'rgba(245,158,11,0.02)' : 'transparent',
                        minWidth: 0,
                      }}>
                        {slot.map(r => {
                          const m = tm(r.type);
                          return (
                            <div key={r.id} style={{
                              fontSize: 9, padding: '2px 5px', borderRadius: 4, marginBottom: 2,
                              background: m.bg, color: m.color, fontWeight: 600,
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                              border: `1px solid ${m.color}25`,
                            }}>{m.icon} {r.title}</div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
        <DayPanel date={selected} reminders={selRems} isLoading={isLoading} onQuickAdd={() => setQuickAdd(true)} />
      </div>
    );
  };

  /* MONTH VIEW */
  const MonthView = () => {
    const y = cursor.getFullYear(), m = cursor.getMonth();
    const firstDow = new Date(y,m,1).getDay();
    const dim = daysInMonth(y,m);
    return (
      <div style={{ display: 'flex', gap: 18 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--b1)', borderRadius: 14, overflow: 'hidden' }}>
            {/* Day-of-week headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: '1px solid var(--b1)' }}>
              {DOWS.map(d => (
                <div key={d} style={{
                  textAlign: 'center', padding: '10px 0',
                  fontSize: 10, fontWeight: 700, color: 'var(--t3)',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>{d}</div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
              {/* padding cells */}
              {Array.from({length:firstDow}).map((_,i) => (
                <div key={`pad${i}`} style={{
                  minHeight: 100, borderRight: '1px solid var(--b2)',
                  borderBottom: '1px solid var(--b2)', background: 'var(--bg)',
                }} />
              ))}
              {Array.from({length:dim},(_,i)=>i+1).map(d => {
                const date = new Date(y,m,d);
                const rems = dayRems(date);
                const sel  = isSel(date);
                const tod  = isToday(date);
                const visible = rems.slice(0,2);
                const more    = rems.length - 2;
                return (
                  <div key={d} onClick={() => setSelected(new Date(date))} style={{
                    minHeight: 100, padding: '6px 5px 4px',
                    borderRight: '1px solid var(--b2)', borderBottom: '1px solid var(--b2)',
                    cursor: 'pointer',
                    background: sel ? 'rgba(245,158,11,0.06)' : tod ? 'rgba(245,158,11,0.03)' : 'transparent',
                    transition: 'background 0.1s',
                  }}>
                    {/* Date number */}
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: tod ? 700 : 500,
                      background: tod ? 'var(--amber)' : sel ? 'var(--amber-glow)' : 'transparent',
                      color: tod ? '#fff' : sel ? 'var(--amber)' : 'var(--t2)',
                      marginBottom: 4,
                    }}>{d}</div>
                    {/* Event pills */}
                    {visible.map((r:any) => <EventPill key={r.id} r={r} />)}
                    {more > 0 && (
                      <div style={{
                        fontSize: 9, color: 'var(--t4)', fontWeight: 700,
                        padding: '1px 5px', borderRadius: 4,
                        background: 'var(--bg-raised)',
                        display: 'inline-block', marginTop: 1,
                      }}>+{more} more</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <DayPanel date={selected} reminders={selRems} isLoading={isLoading} onQuickAdd={() => setQuickAdd(true)} />
      </div>
    );
  };

  /* YEAR VIEW */
  const YearView = () => {
    const y = cursor.getFullYear();
    const leap = isLeapYear(y);
    return (
      <div>
        {leap && (
          <div style={{ marginBottom: 14, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 20, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', fontSize: 12, fontWeight: 600, color: 'var(--amber)' }}>
            ✦ {y} is a Leap Year — February has 29 days
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
          {Array.from({length:12},(_,m) => {
            const dim = daysInMonth(y,m);
            const firstDow = new Date(y,m,1).getDay();
            let monthTotal = 0;
            for (let d=1; d<=dim; d++) monthTotal += dayRems(new Date(y,m,d)).length;
            return (
              <div key={m} style={{ background: 'var(--card)', border: '1px solid var(--b1)', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{
                  padding: '8px 10px', borderBottom: '1px solid var(--b1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--t1)' }}>{MONTHS_S[m]}</span>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    {monthTotal > 0 && (
                      <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, background: 'var(--amber-glow)', color: 'var(--amber)', fontWeight: 700 }}>
                        {monthTotal}
                      </span>
                    )}
                    {leap && m===1 && <span style={{ fontSize: 9, color: 'var(--amber)', fontWeight: 700 }}>29d</span>}
                  </div>
                </div>
                <div style={{ padding: '6px', display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 1 }}>
                  {DOWS_S.map(d => (
                    <div key={d} style={{ textAlign: 'center', fontSize: 8, color: 'var(--t4)', fontWeight: 700, paddingBottom: 2 }}>{d}</div>
                  ))}
                  {Array.from({length:firstDow}).map((_,i) => <div key={`p${i}`} />)}
                  {Array.from({length:dim},(_,i)=>i+1).map(d => {
                    const date = new Date(y,m,d);
                    const hasr = dayRems(date).length > 0;
                    const tod  = isToday(date);
                    const isLeapDay = leap && m===1 && d===29;
                    return (
                      <div key={d} onClick={() => { setSelected(new Date(date)); setCursor(new Date(date)); setView('month'); }}
                        style={{
                          textAlign: 'center', fontSize: 9, padding: '2px 0',
                          borderRadius: 4, cursor: 'pointer',
                          background: isLeapDay ? 'rgba(245,158,11,0.2)' : tod ? 'var(--amber)' : hasr ? 'rgba(245,158,11,0.15)' : 'transparent',
                          color: tod ? '#fff' : isLeapDay ? 'var(--amber)' : hasr ? 'var(--amber)' : 'var(--t3)',
                          fontWeight: tod || isLeapDay || hasr ? 700 : 400,
                        }}
                      >{d}</div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  /* LEAP VIEW */
  const LeapView = () => {
    const base  = cursor.getFullYear() - (cursor.getFullYear()%4);
    const years = [base, base+1, base+2, base+3];
    return (
      <div>
        <div style={{ marginBottom: 16, fontSize: 12, color: 'var(--t3)' }}>
          Showing a 4-year leap cycle. Leap years are highlighted in <span style={{ color: 'var(--amber)', fontWeight: 700 }}>amber</span>. Feb 29 appears only on leap years.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 18 }}>
          {years.map(y => {
            const leap = isLeapYear(y);
            let count = 0;
            for (const k in byDate) { if (new Date(k).getFullYear()===y) count += byDate[k].length; }
            return (
              <div key={y} style={{
                background: 'var(--card)', border: `1px solid ${leap?'rgba(245,158,11,0.4)':'var(--b1)'}`,
                borderRadius: 14, overflow: 'hidden',
                boxShadow: leap ? 'var(--sh-amber)' : 'none',
              }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--b1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: leap ? 'rgba(245,158,11,0.06)' : 'transparent' }}>
                  <div>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: leap?'var(--amber)':'var(--t1)' }}>{y}</span>
                    {leap && <span style={{ marginLeft: 10, fontSize: 11, fontWeight: 700, color: 'var(--amber)', background: 'var(--amber-glow)', padding: '2px 10px', borderRadius: 20 }}>✦ Leap Year</span>}
                  </div>
                  {count > 0 && <span style={{ fontSize: 12, color: 'var(--t3)' }}>{count} reminder{count!==1?'s':''}</span>}
                </div>
                <div style={{ padding: '12px 14px', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                  {Array.from({length:12},(_,m) => {
                    const dim = daysInMonth(y,m);
                    let mCount = 0;
                    for (let d=1; d<=dim; d++) mCount += dayRems(new Date(y,m,d)).length;
                    const isFeb = m===1;
                    return (
                      <div key={m} onClick={() => { setCursor(new Date(y,m,1)); setView('month'); }} style={{
                        padding: '7px 8px', borderRadius: 8, cursor: 'pointer',
                        border: `1px solid ${isFeb&&leap?'rgba(245,158,11,0.4)':'var(--b2)'}`,
                        background: isFeb&&leap ? 'rgba(245,158,11,0.08)' : 'var(--bg)',
                        transition: 'all 0.12s',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: isFeb&&leap?'var(--amber)':'var(--t2)' }}>{MONTHS_S[m]}</span>
                          {isFeb && <span style={{ fontSize: 9, fontWeight: 700, color: leap?'var(--amber)':'var(--t4)' }}>{leap?'29d':'28d'}</span>}
                        </div>
                        {mCount > 0 ? (
                          <div style={{ fontSize: 10, color: 'var(--amber)', fontWeight: 700 }}>●{mCount}</div>
                        ) : (
                          <div style={{ fontSize: 10, color: 'var(--t4)' }}>—</div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {leap && (
                  <div style={{ margin: '0 14px 14px', padding: '8px 12px', borderRadius: 8, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', fontSize: 11, color: 'var(--amber)', fontWeight: 600 }}>
                    📅 Feb 29 exists this year — click Feb above to view
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  /* ── RENDER ───────────────────────────────────────────────────────── */
  return (
    <>
      {/* ── Topbar ──────────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--card)', borderBottom: '1px solid var(--b1)',
        padding: '0 22px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 40, flexShrink: 0, gap: 12,
      }}>
        {/* View tabs */}
        <div style={{ display: 'flex', gap: 3 }}>
          {(['day','week','month','year','leap'] as View[]).map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: '5px 13px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              borderRadius: 20, border: 'none', fontFamily: 'var(--font-body)',
              background: view===v ? 'var(--amber)' : 'transparent',
              color: view===v ? '#fff' : 'var(--t3)',
              transition: 'all 0.12s',
            }}>
              {v==='leap' ? '✦ Leap' : v.charAt(0).toUpperCase()+v.slice(1)}
            </button>
          ))}
        </div>

        {/* Nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={()=>navigate(-1)} style={navBtn}>‹</button>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: 'var(--t1)', minWidth: 200, textAlign: 'center' }}>
            {title}
          </span>
          <button onClick={()=>navigate(1)} style={navBtn}>›</button>
        </div>

        {/* Right controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => { setCursor(new Date(today)); setSelected(new Date(today)); }} style={{
            padding: '5px 14px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
            borderRadius: 20, border: '1px solid var(--b1)', background: 'transparent',
            color: 'var(--t2)', fontFamily: 'var(--font-body)',
          }}>Today</button>
          <button onClick={() => setQuickAdd(true)} style={{
            padding: '5px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
            borderRadius: 20, border: 'none', background: 'var(--amber)',
            color: '#fff', fontFamily: 'var(--font-body)',
          }}>+ Add</button>
        </div>
      </div>

      {/* ── Type filter legend ───────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '8px 22px',
        borderBottom: '1px solid var(--b1)', background: 'var(--bg-raised)',
        flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: 4 }}>Filter:</span>
        {Object.entries(TYPE_META).map(([t, m]) => {
          const active = typeFilter.includes(t);
          return (
            <button key={t} onClick={() => toggleType(t)} style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 600,
              border: `1px solid ${active ? m.color : 'var(--b1)'}`,
              background: active ? m.bg : 'transparent',
              color: active ? m.color : 'var(--t4)',
              cursor: 'pointer', transition: 'all 0.1s',
            }}>
              {m.icon} {m.label}
            </button>
          );
        })}
        {typeFilter.length > 0 && (
          <button onClick={() => setTypeFilter([])} style={{
            padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 600,
            border: '1px solid var(--b1)', background: 'transparent',
            color: 'var(--t4)', cursor: 'pointer',
          }}>✕ Clear</button>
        )}
        {!isLoading && (
          <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--t4)' }}>
            {reminders.length} reminder{reminders.length!==1?'s':''}
            {typeFilter.length > 0 ? ` (filtered)` : ''}
          </span>
        )}
      </div>

      {/* ── Main content ────────────────────────────────────────────── */}
      <div style={{ padding: '18px 22px', flex: 1, overflow: 'auto' }}>
        {isLoading && (
          <div style={{ textAlign: 'center', padding: 16, color: 'var(--t3)', fontSize: 12, marginBottom: 12 }}>Loading…</div>
        )}
        {view==='day'   && <DayView />}
        {view==='week'  && <WeekView />}
        {view==='month' && <MonthView />}
        {view==='year'  && <YearView />}
        {view==='leap'  && <LeapView />}
      </div>

      {/* ── Quick Add Modal ─────────────────────────────────────────── */}
      {quickAdd && (
        <QuickAddModal date={selected} onClose={() => setQuickAdd(false)} />
      )}
    </>
  );
}
