'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DOWS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const TYPE_COLOR: Record<string, string> = {
  call: 'var(--sage)', task: 'var(--amber)', email: 'var(--sky)',
  location: 'var(--mauve)', event: 'var(--rose)'
};
const TYPE_ICON: Record<string, string> = {
  call: '📞', task: '✓', email: '✉️', location: '📍', event: '📅'
};

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());

  const { data: remindersData, isLoading } = useQuery({
    queryKey: ['reminders-calendar', year, month],
    queryFn: () => {
      const from = new Date(year, month, 1).toISOString().split('T')[0];
      const to = new Date(year, month + 1, 0).toISOString().split('T')[0];
      return api.reminders.list({ limit: 500, date_from: from, date_to: to });
    },
  });

  const reminders: any[] = (remindersData as any)?.data || [];

  // Group reminders by day
  const byDay: Record<number, any[]> = {};
  reminders.forEach(r => {
    if (!r.fireAt) return;
    const d = new Date(r.fireAt);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(r);
    }
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setSelectedDay(null);
  };

  const selectedReminders = selectedDay ? (byDay[selectedDay] || []) : [];
  const isToday = (d: number) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  return (
    <>
      {/* Topbar */}
      <div style={{
        background: 'var(--card)', borderBottom: '1px solid var(--b1)',
        padding: '0 26px', height: 58,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 40, flexShrink: 0
      }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--t1)' }}>Calendar</div>
          <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 1 }}>View your reminders by date</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={prevMonth} style={navBtnStyle}>&#8249;</button>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: 'var(--t1)', minWidth: 140, textAlign: 'center' }}>
            {MONTHS[month]} {year}
          </span>
          <button onClick={nextMonth} style={navBtnStyle}>&#8250;</button>
        </div>
      </div>

      <div style={{ padding: '24px 26px', flex: 1, display: 'flex', gap: 20 }}>
        {/* Calendar grid */}
        <div style={{ flex: 1 }}>
          <div style={{
            background: 'var(--card)', border: '1px solid var(--b1)',
            borderRadius: 'var(--r-xl)', overflow: 'hidden'
          }}>
            {/* Day headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--b1)' }}>
              {DOWS.map(d => (
                <div key={d} style={{
                  textAlign: 'center', padding: '10px 0',
                  fontSize: 11, fontWeight: 700, color: 'var(--t3)',
                  textTransform: 'uppercase', letterSpacing: '0.06em'
                }}>{d}</div>
              ))}
            </div>

            {/* Day cells */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`e${i}`} style={{ minHeight: 90, borderRight: '1px solid var(--b2)', borderBottom: '1px solid var(--b2)', background: 'var(--bg)' }} />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
                const dayReminders = byDay[d] || [];
                const isSelected = selectedDay === d;
                const isTodayDay = isToday(d);
                return (
                  <div
                    key={d}
                    onClick={() => setSelectedDay(d === selectedDay ? null : d)}
                    style={{
                      minHeight: 90, padding: '8px 8px 6px',
                      borderRight: '1px solid var(--b2)', borderBottom: '1px solid var(--b2)',
                      cursor: 'pointer',
                      background: isSelected ? 'var(--amber-glow)' : isTodayDay ? 'var(--sky-bg)' : 'transparent',
                      transition: 'background 0.12s'
                    }}
                  >
                    <div style={{
                      width: 26, height: 26, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: isTodayDay ? 700 : 500,
                      background: isTodayDay ? 'var(--amber)' : 'transparent',
                      color: isTodayDay ? '#fff' : isSelected ? 'var(--amber)' : 'var(--t2)',
                      marginBottom: 4
                    }}>{d}</div>
                    {dayReminders.slice(0, 3).map((r: any) => (
                      <div key={r.id} style={{
                        fontSize: 10, fontWeight: 500,
                        color: TYPE_COLOR[r.type] || 'var(--amber)',
                        background: 'rgba(14,165,233,0.06)',
                        borderLeft: `2px solid ${TYPE_COLOR[r.type] || 'var(--amber)'}`,
                        padding: '1px 5px', borderRadius: '0 3px 3px 0',
                        marginBottom: 2, whiteSpace: 'nowrap',
                        overflow: 'hidden', textOverflow: 'ellipsis'
                      }}>
                        {TYPE_ICON[r.type]} {r.title}
                      </div>
                    ))}
                    {dayReminders.length > 3 && (
                      <div style={{ fontSize: 9, color: 'var(--t4)', fontWeight: 600 }}>+{dayReminders.length - 3} more</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Day panel */}
        <div style={{
          width: 280, flexShrink: 0,
          background: 'var(--card)', border: '1px solid var(--b1)',
          borderRadius: 'var(--r-xl)', overflow: 'hidden',
          alignSelf: 'flex-start',
          position: 'sticky', top: 82
        }}>
          <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--b1)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: 'var(--t1)' }}>
              {selectedDay ? `${MONTHS[month]} ${selectedDay}` : 'Select a day'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>
              {selectedDay ? `${selectedReminders.length} reminder${selectedReminders.length !== 1 ? 's' : ''}` : 'Click a date to see reminders'}
            </div>
          </div>
          <div style={{ maxHeight: 480, overflowY: 'auto' }}>
            {isLoading ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--t3)', fontSize: 12 }}>Loading...</div>
            ) : !selectedDay ? (
              <div style={{ padding: '30px 18px', textAlign: 'center' }}>
                <div style={{ fontSize: 28, opacity: 0.3, marginBottom: 8 }}>📅</div>
                <div style={{ fontSize: 12, color: 'var(--t3)' }}>Click any date to view reminders</div>
              </div>
            ) : selectedReminders.length === 0 ? (
              <div style={{ padding: '30px 18px', textAlign: 'center' }}>
                <div style={{ fontSize: 28, opacity: 0.3, marginBottom: 8 }}>✦</div>
                <div style={{ fontSize: 12, color: 'var(--t3)' }}>No reminders on this day</div>
              </div>
            ) : selectedReminders.map((r: any) => (
              <div key={r.id} style={{
                padding: '12px 18px', borderBottom: '1px solid var(--b2)',
                display: 'flex', gap: 10, alignItems: 'flex-start'
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 5,
                  background: TYPE_COLOR[r.type] || 'var(--amber)'
                }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)', marginBottom: 2 }}>{r.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--t3)' }}>
                    {TYPE_ICON[r.type]} {r.type} · {new Date(r.fireAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </div>
                  {r.notes && <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 3 }}>{r.notes}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

const navBtnStyle: React.CSSProperties = {
  width: 32, height: 32, borderRadius: 8,
  border: '1px solid var(--b1)', background: 'var(--card)',
  cursor: 'pointer', fontSize: 18, color: 'var(--t2)',
  display: 'flex', alignItems: 'center', justifyContent: 'center'
};
