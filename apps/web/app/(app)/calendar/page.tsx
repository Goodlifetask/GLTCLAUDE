'use client';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';

/* ── Constants ─────────────────────────────────────────────────────── */
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];
const MONTHS_S = ['Jan','Feb','Mar','Apr','May','Jun',
                  'Jul','Aug','Sep','Oct','Nov','Dec'];
const DOWS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const DOWS_S = ['S','M','T','W','T','F','S'];
const HOURS  = Array.from({ length: 24 }, (_, i) =>
  `${String(i).padStart(2,'0')}:00`);

const TYPE_COLOR: Record<string,string> = {
  call:'var(--sage)', task:'var(--amber)', email:'var(--sky)',
  location:'var(--mauve)', event:'var(--rose)',
};
const TYPE_ICON: Record<string,string> = {
  call:'📞', task:'◎', email:'✉️', location:'📍', event:'📅',
};

type View = 'day' | 'week' | 'month' | 'year' | 'leap';

/* ── Helpers ─────────────────────────────────────────────────────────── */
function isLeapYear(y: number) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}
function daysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate();
}
function weekStart(date: Date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0,0,0,0);
  return d;
}

/* ── Shared styles ───────────────────────────────────────────────────── */
const navBtn: React.CSSProperties = {
  width:30, height:30, borderRadius:8,
  border:'1px solid var(--b1)', background:'var(--card)',
  cursor:'pointer', fontSize:16, color:'var(--t2)',
  display:'flex', alignItems:'center', justifyContent:'center',
  fontFamily:'var(--font-body)',
};
const pill = (active: boolean): React.CSSProperties => ({
  padding:'5px 14px', fontSize:12, fontWeight:600, cursor:'pointer',
  borderRadius:20, border:'none', fontFamily:'var(--font-body)',
  background: active ? 'var(--amber)' : 'var(--card)',
  color: active ? '#fff' : 'var(--t3)',
  border2:'1px solid var(--b1)', transition:'all 0.12s',
} as any);

/* ── ReminderDot ─────────────────────────────────────────────────────── */
function ReminderDot({ r, small }: { r: any; small?: boolean }) {
  return (
    <div style={{
      fontSize: small ? 9 : 10, fontWeight:500,
      color: TYPE_COLOR[r.type] || 'var(--amber)',
      background: 'rgba(14,165,233,0.06)',
      borderLeft:`2px solid ${TYPE_COLOR[r.type]||'var(--amber)'}`,
      padding: small ? '1px 3px' : '1px 5px',
      borderRadius:'0 3px 3px 0', marginBottom:2,
      whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
    }}>
      {TYPE_ICON[r.type]} {r.title}
    </div>
  );
}

/* ── DayPanel (right sidebar) ─────────────────────────────────────────── */
function DayPanel({ date, reminders, isLoading }: {
  date: Date | null; reminders: any[]; isLoading: boolean;
}) {
  return (
    <div style={{
      width:260, flexShrink:0,
      background:'var(--card)', border:'1px solid var(--b1)',
      borderRadius:'var(--r-xl)', overflow:'hidden',
      alignSelf:'flex-start', position:'sticky', top:82,
    }}>
      <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--b1)' }}>
        <div style={{ fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, color:'var(--t1)' }}>
          {date ? date.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'}) : 'Select a day'}
        </div>
        <div style={{ fontSize:11, color:'var(--t3)', marginTop:2 }}>
          {date ? `${reminders.length} reminder${reminders.length!==1?'s':''}` : 'Click a date'}
        </div>
      </div>
      <div style={{ maxHeight:440, overflowY:'auto' }}>
        {isLoading ? (
          <div style={{ padding:20, textAlign:'center', color:'var(--t3)', fontSize:12 }}>Loading…</div>
        ) : !date ? (
          <div style={{ padding:'28px 16px', textAlign:'center' }}>
            <div style={{ fontSize:26, opacity:0.3, marginBottom:8 }}>📅</div>
            <div style={{ fontSize:12, color:'var(--t3)' }}>Click any date</div>
          </div>
        ) : reminders.length === 0 ? (
          <div style={{ padding:'28px 16px', textAlign:'center' }}>
            <div style={{ fontSize:26, opacity:0.3, marginBottom:8 }}>✦</div>
            <div style={{ fontSize:12, color:'var(--t3)' }}>No reminders</div>
          </div>
        ) : reminders.map((r:any) => (
          <div key={r.id} style={{
            padding:'11px 16px', borderBottom:'1px solid var(--b2)',
            display:'flex', gap:10, alignItems:'flex-start',
          }}>
            <div style={{ width:7, height:7, borderRadius:'50%', flexShrink:0, marginTop:4, background:TYPE_COLOR[r.type]||'var(--amber)' }} />
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'var(--t1)', marginBottom:2 }}>{r.title}</div>
              <div style={{ fontSize:11, color:'var(--t3)' }}>
                {TYPE_ICON[r.type]} {r.type} · {new Date(r.fireAt).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}
              </div>
              {r.notes && <div style={{ fontSize:10, color:'var(--t4)', marginTop:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{r.notes}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════ */
export default function CalendarPage() {
  const today = new Date();
  const [view, setView] = useState<View>('month');
  const [cursor, setCursor] = useState(new Date(today));  // anchor date
  const [selected, setSelected] = useState<Date | null>(today);

  /* ── Compute fetch range from current view+cursor ─────────────────── */
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
      return {
        from: new Date(y,m,1).toISOString(),
        to:   new Date(y,m+1,0,23,59,59,999).toISOString(),
      };
    }
    if (view === 'year') {
      const y = cursor.getFullYear();
      return { from: new Date(y,0,1).toISOString(), to: new Date(y,11,31,23,59,59,999).toISOString() };
    }
    // leap: fetch 4-year window starting at nearest past/current leap year
    const ly = cursor.getFullYear() - (cursor.getFullYear() % 4);
    return { from: new Date(ly,0,1).toISOString(), to: new Date(ly+3,11,31,23,59,59,999).toISOString() };
  }, [view, cursor]);

  const { data, isLoading } = useQuery({
    queryKey: ['cal', view, from, to],
    queryFn: () => api.reminders.list({ limit:500, from, to }),
    staleTime: 30_000,
  });

  const reminders: any[] = useMemo(() => {
    const raw = (data as any)?.data?.reminders ?? (data as any)?.data ?? [];
    return Array.isArray(raw) ? raw : [];
  }, [data]);

  /* ── Group reminders by ISO date string (YYYY-MM-DD) ─────────────── */
  const byDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    reminders.forEach(r => {
      if (!r.fireAt) return;
      const key = new Date(r.fireAt).toISOString().slice(0,10);
      (map[key] = map[key] || []).push(r);
    });
    return map;
  }, [reminders]);

  const dateKey = (d: Date) => d.toISOString().slice(0,10);
  const isToday  = (d: Date) => dateKey(d) === dateKey(today);
  const isSel    = (d: Date) => selected && dateKey(d) === dateKey(selected);
  const dayRems  = (d: Date) => byDate[dateKey(d)] || [];
  const selRems  = selected ? dayRems(selected) : [];

  /* ── Navigation ───────────────────────────────────────────────────── */
  const navigate = (dir: 1 | -1) => {
    const d = new Date(cursor);
    if (view==='day')   d.setDate(d.getDate()+dir);
    if (view==='week')  d.setDate(d.getDate()+dir*7);
    if (view==='month') d.setMonth(d.getMonth()+dir);
    if (view==='year')  d.setFullYear(d.getFullYear()+dir);
    if (view==='leap')  d.setFullYear(d.getFullYear()+dir*4);
    setCursor(d);
  };

  /* ── Title label ─────────────────────────────────────────────────── */
  const title = useMemo(() => {
    if (view==='day')  return cursor.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
    if (view==='week') {
      const s = weekStart(cursor);
      const e = new Date(s); e.setDate(s.getDate()+6);
      return `${s.toLocaleDateString('en-US',{month:'short',day:'numeric'})} – ${e.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}`;
    }
    if (view==='month') return `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`;
    if (view==='year')  return `${cursor.getFullYear()}`;
    const ly = cursor.getFullYear() - (cursor.getFullYear()%4);
    return `${ly} – ${ly+3}  (Leap cycle)`;
  }, [view, cursor]);

  /* ────────────────────────────────────────────────────────────────────
     VIEW RENDERERS
  ──────────────────────────────────────────────────────────────────── */

  /* DAY VIEW */
  const DayView = () => {
    const rems = dayRems(cursor);
    return (
      <div style={{ display:'flex', gap:20 }}>
        <div style={{ flex:1, background:'var(--card)', border:'1px solid var(--b1)', borderRadius:'var(--r-xl)', overflow:'hidden' }}>
          <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--b1)', fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, color:'var(--t1)' }}>
            {isToday(cursor) ? '— Today' : cursor.toLocaleDateString('en-US',{weekday:'long'})}
            <span style={{ fontWeight:400, fontSize:12, color:'var(--t3)', marginLeft:8 }}>{rems.length} reminder{rems.length!==1?'s':''}</span>
          </div>
          <div style={{ overflowY:'auto', maxHeight:'calc(100vh - 220px)' }}>
            {HOURS.map(h => {
              const hour = parseInt(h);
              const slot = rems.filter(r => new Date(r.fireAt).getHours()===hour);
              return (
                <div key={h} style={{
                  display:'flex', minHeight:52,
                  borderBottom:'1px solid var(--b2)',
                  background: hour===today.getHours()&&isToday(cursor) ? 'rgba(245,158,11,0.04)' : 'transparent',
                }}>
                  <div style={{ width:56, padding:'8px 10px', fontSize:10, color:'var(--t4)', fontWeight:600, flexShrink:0, borderRight:'1px solid var(--b2)', textAlign:'right' }}>{h}</div>
                  <div style={{ flex:1, padding:'6px 10px' }}>
                    {slot.map(r => (
                      <div key={r.id} style={{
                        display:'flex', alignItems:'center', gap:8,
                        padding:'5px 10px', borderRadius:8, marginBottom:4,
                        background:(TYPE_COLOR[r.type]||'var(--amber)')+'18',
                        border:`1px solid ${TYPE_COLOR[r.type]||'var(--amber)'}33`,
                      }}>
                        <span style={{ fontSize:13 }}>{TYPE_ICON[r.type]}</span>
                        <span style={{ fontSize:12, fontWeight:600, color:'var(--t1)' }}>{r.title}</span>
                        <span style={{ fontSize:10, color:'var(--t3)', marginLeft:'auto' }}>
                          {new Date(r.fireAt).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  /* WEEK VIEW */
  const WeekView = () => {
    const ws = weekStart(cursor);
    const days = Array.from({length:7},(_,i)=>{ const d=new Date(ws); d.setDate(ws.getDate()+i); return d; });
    return (
      <div style={{ display:'flex', gap:20 }}>
        <div style={{ flex:1, background:'var(--card)', border:'1px solid var(--b1)', borderRadius:'var(--r-xl)', overflow:'hidden' }}>
          {/* Day headers */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', borderBottom:'1px solid var(--b1)' }}>
            {days.map(d => (
              <div key={d.toISOString()} onClick={() => setSelected(new Date(d))} style={{
                padding:'10px 6px', textAlign:'center', cursor:'pointer',
                background: isSel(d) ? 'var(--amber-glow)' : isToday(d) ? 'rgba(245,158,11,0.06)' : 'transparent',
                borderRight:'1px solid var(--b2)',
              }}>
                <div style={{ fontSize:10, color:'var(--t4)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em' }}>{DOWS[d.getDay()]}</div>
                <div style={{
                  width:28, height:28, borderRadius:'50%', margin:'4px auto 0',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:14, fontWeight: isToday(d)?700:500,
                  background: isToday(d) ? 'var(--amber)' : 'transparent',
                  color: isToday(d) ? '#fff' : isSel(d) ? 'var(--amber)' : 'var(--t1)',
                }}>{d.getDate()}</div>
                {dayRems(d).length > 0 && (
                  <div style={{ width:5, height:5, borderRadius:'50%', background:'var(--amber)', margin:'3px auto 0' }} />
                )}
              </div>
            ))}
          </div>
          {/* Hourly rows */}
          <div style={{ overflowY:'auto', maxHeight:'calc(100vh - 260px)' }}>
            {HOURS.map(h => {
              const hour = parseInt(h);
              return (
                <div key={h} style={{ display:'flex', borderBottom:'1px solid var(--b2)', minHeight:44 }}>
                  <div style={{ width:50, padding:'6px 8px', fontSize:10, color:'var(--t4)', fontWeight:600, flexShrink:0, borderRight:'1px solid var(--b2)', textAlign:'right' }}>{h}</div>
                  {days.map(d => {
                    const slot = dayRems(d).filter(r => new Date(r.fireAt).getHours()===hour);
                    return (
                      <div key={d.toISOString()} style={{
                        flex:1, padding:'4px 4px', borderRight:'1px solid var(--b2)',
                        background: isSel(d) ? 'rgba(245,158,11,0.03)' : 'transparent',
                      }}>
                        {slot.map(r => (
                          <div key={r.id} style={{
                            fontSize:9, padding:'2px 4px', borderRadius:4, marginBottom:2,
                            background:(TYPE_COLOR[r.type]||'var(--amber)')+'22',
                            color:TYPE_COLOR[r.type]||'var(--amber)',
                            whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                          }}>{r.title}</div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
        <DayPanel date={selected} reminders={selRems} isLoading={isLoading} />
      </div>
    );
  };

  /* MONTH VIEW */
  const MonthView = () => {
    const y = cursor.getFullYear(), m = cursor.getMonth();
    const firstDow = new Date(y,m,1).getDay();
    const dim = daysInMonth(y,m);
    return (
      <div style={{ display:'flex', gap:20 }}>
        <div style={{ flex:1 }}>
          <div style={{ background:'var(--card)', border:'1px solid var(--b1)', borderRadius:'var(--r-xl)', overflow:'hidden' }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', borderBottom:'1px solid var(--b1)' }}>
              {DOWS.map(d => (
                <div key={d} style={{ textAlign:'center', padding:'10px 0', fontSize:11, fontWeight:700, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{d}</div>
              ))}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)' }}>
              {Array.from({length:firstDow}).map((_,i) => (
                <div key={`pad${i}`} style={{ minHeight:96, borderRight:'1px solid var(--b2)', borderBottom:'1px solid var(--b2)', background:'var(--bg)' }} />
              ))}
              {Array.from({length:dim},(_,i)=>i+1).map(d => {
                const date = new Date(y,m,d);
                const rems = dayRems(date);
                const sel  = isSel(date);
                const tod  = isToday(date);
                return (
                  <div key={d} onClick={() => setSelected(new Date(date))} style={{
                    minHeight:96, padding:'7px 7px 5px',
                    borderRight:'1px solid var(--b2)', borderBottom:'1px solid var(--b2)',
                    cursor:'pointer',
                    background: sel ? 'var(--amber-glow)' : tod ? 'rgba(245,158,11,0.06)' : 'transparent',
                    transition:'background 0.12s',
                  }}>
                    <div style={{
                      width:24, height:24, borderRadius:'50%',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:12, fontWeight:tod?700:500,
                      background: tod ? 'var(--amber)' : 'transparent',
                      color: tod ? '#fff' : sel ? 'var(--amber)' : 'var(--t2)',
                      marginBottom:4,
                    }}>{d}</div>
                    {rems.slice(0,3).map((r:any) => <ReminderDot key={r.id} r={r} />)}
                    {rems.length>3 && <div style={{ fontSize:9, color:'var(--t4)', fontWeight:600 }}>+{rems.length-3} more</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <DayPanel date={selected} reminders={selRems} isLoading={isLoading} />
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
          <div style={{ marginBottom:14, display:'inline-flex', alignItems:'center', gap:8, padding:'6px 16px', borderRadius:20, background:'rgba(245,158,11,0.12)', border:'1px solid rgba(245,158,11,0.3)', fontSize:12, fontWeight:600, color:'var(--amber)' }}>
            ✦ {y} is a Leap Year — February has 29 days
          </div>
        )}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
          {Array.from({length:12},(_,m) => {
            const dim = daysInMonth(y,m);
            const firstDow = new Date(y,m,1).getDay();
            const monthRems: any[] = [];
            for (let d=1; d<=dim; d++) {
              monthRems.push(...(dayRems(new Date(y,m,d))));
            }
            return (
              <div key={m} style={{ background:'var(--card)', border:'1px solid var(--b1)', borderRadius:'var(--r)', overflow:'hidden' }}>
                <div style={{
                  padding:'8px 10px', borderBottom:'1px solid var(--b1)',
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                }}>
                  <span style={{ fontSize:12, fontWeight:700, color: cursor.getMonth()===m&&isToday(new Date(y,m,1)) ? 'var(--amber)' : 'var(--t1)' }}>
                    {MONTHS_S[m]}
                  </span>
                  {monthRems.length>0 && (
                    <span style={{ fontSize:10, padding:'1px 6px', borderRadius:10, background:'var(--amber-glow)', color:'var(--amber)', fontWeight:600 }}>
                      {monthRems.length}
                    </span>
                  )}
                  {leap && m===1 && (
                    <span style={{ fontSize:9, color:'var(--amber)', fontWeight:700 }}>29d</span>
                  )}
                </div>
                <div style={{ padding:'6px', display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:1 }}>
                  {DOWS_S.map(d => (
                    <div key={d} style={{ textAlign:'center', fontSize:8, color:'var(--t4)', fontWeight:700, paddingBottom:2 }}>{d}</div>
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
                          textAlign:'center', fontSize:9, padding:'2px 0',
                          borderRadius:4, cursor:'pointer',
                          background: isLeapDay ? 'rgba(245,158,11,0.2)' : tod ? 'var(--amber)' : hasr ? 'rgba(14,165,233,0.1)' : 'transparent',
                          color: tod ? '#fff' : isLeapDay ? 'var(--amber)' : hasr ? 'var(--sky)' : 'var(--t3)',
                          fontWeight: tod||isLeapDay ? 700 : 400,
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

  /* LEAP VIEW — 4-year cycle */
  const LeapView = () => {
    const base = cursor.getFullYear() - (cursor.getFullYear()%4);
    const years = [base, base+1, base+2, base+3];
    return (
      <div>
        <div style={{ marginBottom:16, fontSize:13, color:'var(--t3)' }}>
          Showing a 4-year leap cycle. Leap years are highlighted in
          <span style={{ color:'var(--amber)', fontWeight:700 }}> amber</span>.
          Feb 29 appears only on leap years.
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:18 }}>
          {years.map(y => {
            const leap = isLeapYear(y);
            // count reminders in this year
            const from = new Date(y,0,1), to = new Date(y,11,31);
            let count = 0;
            for (let k in byDate) {
              const d = new Date(k);
              if (d.getFullYear()===y) count += byDate[k].length;
            }
            return (
              <div key={y} style={{
                background:'var(--card)', border:`1px solid ${leap?'rgba(245,158,11,0.4)':'var(--b1)'}`,
                borderRadius:'var(--r-xl)', overflow:'hidden',
                boxShadow: leap ? '0 0 0 1px rgba(245,158,11,0.15), var(--sh-amber)' : 'none',
              }}>
                {/* Year header */}
                <div style={{
                  padding:'14px 18px', borderBottom:'1px solid var(--b1)',
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  background: leap ? 'rgba(245,158,11,0.06)' : 'transparent',
                }}>
                  <div>
                    <span style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:700, color: leap?'var(--amber)':'var(--t1)' }}>{y}</span>
                    {leap && <span style={{ marginLeft:10, fontSize:11, fontWeight:700, color:'var(--amber)', background:'var(--amber-glow)', padding:'2px 10px', borderRadius:20 }}>✦ Leap Year</span>}
                  </div>
                  {count>0 && <span style={{ fontSize:12, color:'var(--t3)' }}>{count} reminder{count!==1?'s':''}</span>}
                </div>
                {/* Mini 12-month grid */}
                <div style={{ padding:'12px 14px', display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
                  {Array.from({length:12},(_,m) => {
                    const dim = daysInMonth(y,m);
                    let mCount = 0;
                    for (let d=1; d<=dim; d++) mCount += dayRems(new Date(y,m,d)).length;
                    const isFeb = m===1;
                    return (
                      <div key={m} onClick={() => { setCursor(new Date(y,m,1)); setView('month'); }}
                        style={{
                          padding:'7px 8px', borderRadius:8, cursor:'pointer',
                          border: `1px solid ${isFeb&&leap ? 'rgba(245,158,11,0.4)' : 'var(--b2)'}`,
                          background: isFeb&&leap ? 'rgba(245,158,11,0.08)' : 'var(--bg)',
                          transition:'all 0.12s',
                        }}
                      >
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:2 }}>
                          <span style={{ fontSize:11, fontWeight:700, color: isFeb&&leap?'var(--amber)':'var(--t2)' }}>{MONTHS_S[m]}</span>
                          {isFeb && <span style={{ fontSize:9, fontWeight:700, color: leap?'var(--amber)':'var(--t4)' }}>{leap?'29d':'28d'}</span>}
                        </div>
                        {mCount>0 ? (
                          <div style={{ fontSize:10, color:'var(--sky)', fontWeight:600 }}>●{mCount}</div>
                        ) : (
                          <div style={{ fontSize:10, color:'var(--t4)' }}>—</div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* Feb 29 callout on leap years */}
                {leap && (
                  <div style={{
                    margin:'0 14px 14px', padding:'8px 12px', borderRadius:8,
                    background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.25)',
                    fontSize:11, color:'var(--amber)', fontWeight:600,
                  }}>
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

  /* ── Render ───────────────────────────────────────────────────────── */
  return (
    <>
      {/* Topbar */}
      <div style={{
        background:'var(--card)', borderBottom:'1px solid var(--b1)',
        padding:'0 26px', height:58,
        display:'flex', alignItems:'center', justifyContent:'space-between',
        position:'sticky', top:0, zIndex:40, flexShrink:0, gap:12,
      }}>
        {/* View tabs */}
        <div style={{ display:'flex', gap:4 }}>
          {(['day','week','month','year','leap'] as View[]).map(v => (
            <button key={v} onClick={() => setView(v)} style={pill(view===v)}>
              {v==='leap' ? '✦ Leap' : v.charAt(0).toUpperCase()+v.slice(1)}
            </button>
          ))}
        </div>

        {/* Nav */}
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button onClick={()=>navigate(-1)} style={navBtn}>‹</button>
          <span style={{ fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, color:'var(--t1)', minWidth:220, textAlign:'center' }}>
            {title}
          </span>
          <button onClick={()=>navigate(1)} style={navBtn}>›</button>
        </div>

        {/* Today button */}
        <button onClick={() => { setCursor(new Date(today)); setSelected(new Date(today)); }} style={{
          padding:'6px 16px', fontSize:12, fontWeight:600, cursor:'pointer',
          borderRadius:20, border:'1px solid var(--b1)', background:'var(--card)',
          color:'var(--t2)', fontFamily:'var(--font-body)',
        }}>Today</button>
      </div>

      <div style={{ padding:'20px 26px', flex:1, overflow:'auto' }}>
        {isLoading && (
          <div style={{ textAlign:'center', padding:20, color:'var(--t3)', fontSize:12, marginBottom:12 }}>Loading…</div>
        )}
        {view==='day'   && <DayView />}
        {view==='week'  && <WeekView />}
        {view==='month' && <MonthView />}
        {view==='year'  && <YearView />}
        {view==='leap'  && <LeapView />}
      </div>
    </>
  );
}
