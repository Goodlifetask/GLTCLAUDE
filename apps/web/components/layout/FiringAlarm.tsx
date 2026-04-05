'use client';
import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth';
import toast from 'react-hot-toast';

const TYPE_ICON: Record<string, string> = {
  call: '📞', task: '✓', email: '✉️', location: '📍', event: '📅',
};

/* ── Audio helpers ──────────────────────────────────────────────────────── */
function playBeep() {
  try {
    const ctx = new ((window as any).AudioContext || (window as any).webkitAudioContext)();
    [0, 0.18, 0.36].forEach((delay) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0, ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + delay + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.28);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.28);
    });
  } catch { /* silently ignore if AudioContext unavailable */ }
}

function speak(text: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate   = 0.92;
  utt.pitch  = 1.05;
  utt.volume = 1;
  window.speechSynthesis.speak(utt);
}

const STORAGE_KEY = 'glt_alarm_shown';

function getShownIds(): Set<string> {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '[]'));
  } catch { return new Set(); }
}
function markShown(id: string) {
  try {
    const arr = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '[]');
    arr.push(id);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch {}
}

/* ── Component ──────────────────────────────────────────────────────────── */
export function FiringAlarm() {
  const { user }         = useAuthStore();
  const qc               = useQueryClient();
  const shownRef         = useRef<Set<string>>(new Set());
  const [queue, setQueue] = useState<any[]>([]);
  const current           = queue[0] ?? null;

  // Hydrate shown-IDs from sessionStorage on mount
  useEffect(() => {
    shownRef.current = getShownIds();
  }, []);

  // Poll every 30 s for pending reminders
  const { data } = useQuery({
    queryKey: ['firing-alarms'],
    queryFn:  () => api.reminders.list({ status: 'pending', limit: 100, sort: 'fireAt', order: 'asc' }),
    enabled:  !!user,
    refetchInterval: 30_000,
  });

  // Detect newly-fired reminders (fireAt <= now, not yet shown)
  useEffect(() => {
    const raw: any[] = (data as any)?.data?.reminders ?? (data as any)?.reminders ?? (data as any)?.data ?? [];
    const reminders  = Array.isArray(raw) ? raw : [];
    const now = Date.now();

    const firing = reminders.filter((r: any) => {
      if (!r.fireAt || shownRef.current.has(r.id)) return false;
      return new Date(r.fireAt).getTime() <= now;
    });

    if (firing.length === 0) return;

    setQueue(prev => {
      const existing = new Set(prev.map((r: any) => r.id));
      return [...prev, ...firing.filter((r: any) => !existing.has(r.id))];
    });
  }, [data]);

  // Play sound + speak when alarm shows
  useEffect(() => {
    if (!current) return;
    markShown(current.id);
    shownRef.current.add(current.id);

    playBeep();
    setTimeout(() => speak(`Reminder: ${current.title}`), 700);
  }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Mutations */
  const completeMutation = useMutation({
    mutationFn: (id: string) => api.reminders.complete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reminders'] });
      qc.invalidateQueries({ queryKey: ['firing-alarms'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      toast.success('Marked done!');
    },
    onError: () => toast.error('Failed to complete'),
  });

  const snoozeMutation = useMutation({
    mutationFn: (id: string) => api.reminders.snooze(id, 10),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reminders'] });
      qc.invalidateQueries({ queryKey: ['firing-alarms'] });
      toast.success('Snoozed 10 min');
    },
    onError: () => toast.error('Failed to snooze'),
  });

  const next = () => {
    window.speechSynthesis?.cancel();
    setQueue(prev => prev.slice(1));
  };

  const handleDone = () => {
    if (!current) return;
    window.speechSynthesis?.cancel();
    completeMutation.mutate(current.id);
    setQueue(prev => prev.slice(1));
  };

  const handleSnooze = () => {
    if (!current) return;
    window.speechSynthesis?.cancel();
    snoozeMutation.mutate(current.id);
    setQueue(prev => prev.slice(1));
  };

  if (!current) return null;

  const fireAt = current.fireAt ? new Date(current.fireAt) : null;

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.72)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 99999,
    }}>
      <div style={{
        background: 'var(--card)',
        border: '2px solid var(--amber)',
        borderRadius: 22,
        padding: '36px 32px 28px',
        maxWidth: 440, width: '90%',
        boxShadow: '0 0 80px rgba(240,162,2,0.25), 0 24px 64px rgba(0,0,0,0.45)',
        textAlign: 'center',
      }}>
        {/* Icon — animated */}
        <div style={{ fontSize: 52, marginBottom: 4, display: 'inline-block', animation: 'glt-ring 0.55s ease-in-out infinite alternate' }}>
          {TYPE_ICON[current.type] ?? '🔔'}
        </div>

        {/* Queue badge */}
        {queue.length > 1 && (
          <div style={{
            display: 'inline-block', marginLeft: 8,
            background: '#dc2626', color: '#fff',
            fontSize: 11, fontWeight: 700,
            borderRadius: 99, padding: '2px 8px', verticalAlign: 'middle',
          }}>
            {queue.length} firing
          </div>
        )}

        {/* Title */}
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 22, fontWeight: 700,
          color: 'var(--t1)', margin: '16px 0 6px',
          lineHeight: 1.3,
        }}>
          {current.title}
        </div>

        {/* Time */}
        {fireAt && (
          <div style={{ fontSize: 13, color: 'var(--amber)', fontWeight: 600, marginBottom: 20 }}>
            🕐{' '}
            {fireAt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
            {' · '}
            {fireAt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
          </div>
        )}

        {/* Notes */}
        {current.notes && (
          <div style={{
            fontSize: 13, color: 'var(--t2)',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--b1)',
            borderRadius: 10, padding: '10px 14px',
            marginBottom: 20, textAlign: 'left',
            lineHeight: 1.5,
          }}>
            {current.notes}
          </div>
        )}

        {/* Read again */}
        <button
          onClick={() => speak(`Reminder: ${current.title}`)}
          style={{
            background: 'none', border: '1px solid var(--b1)',
            borderRadius: 8, padding: '5px 14px',
            cursor: 'pointer', fontSize: 12, color: 'var(--t3)',
            marginBottom: 22,
          }}
        >
          🔊 Read again
        </button>

        {/* Main actions */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <button
            onClick={handleSnooze}
            disabled={snoozeMutation.isPending}
            style={{
              flex: 1, padding: '13px 0', borderRadius: 12,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid var(--b1)', cursor: 'pointer',
              fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600,
              color: 'var(--t2)',
              opacity: snoozeMutation.isPending ? 0.6 : 1,
            }}
          >
            😴 Snooze 10 min
          </button>
          <button
            onClick={handleDone}
            disabled={completeMutation.isPending}
            style={{
              flex: 1, padding: '13px 0', borderRadius: 12,
              background: 'var(--amber)', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700,
              color: '#fff', boxShadow: 'var(--sh-amber)',
              opacity: completeMutation.isPending ? 0.6 : 1,
            }}
          >
            ✓ Done
          </button>
        </div>

        {/* Dismiss */}
        <button
          onClick={next}
          style={{
            background: 'none', border: 'none',
            cursor: 'pointer', fontSize: 12, color: 'var(--t4)',
          }}
        >
          Dismiss{queue.length > 1 ? ` (${queue.length - 1} more)` : ''}
        </button>
      </div>

      <style>{`
        @keyframes glt-ring {
          from { transform: rotate(-18deg) scale(1.05); }
          to   { transform: rotate(18deg)  scale(1.05); }
        }
      `}</style>
    </div>
  );
}
