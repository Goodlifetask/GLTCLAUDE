'use client';
import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth';
import toast from 'react-hot-toast';

const TYPE_ICON: Record<string, string> = {
  call: '📞', task: '✓', email: '✉️', location: '📍', event: '📅',
};

const VOICE_LABEL_EMOJI: Record<string, string> = {
  Dad: '👨', Mom: '👩', Wife: '👩', Husband: '👨', Son: '👦', Daughter: '👧',
  Friend: '🤝', Partner: '💑', Grandpa: '👴', Grandma: '👵', Other: '❤️', 'Loved One': '❤️',
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

/* ── Session deduplication ──────────────────────────────────────────────── */
const STORAGE_KEY     = 'glt_alarm_shown';
const FAM_STORAGE_KEY = 'glt_fam_alarm_shown';

function getShownIds(key: string): Set<string> {
  try { return new Set(JSON.parse(sessionStorage.getItem(key) ?? '[]')); }
  catch { return new Set(); }
}
function markShown(key: string, id: string) {
  try {
    const arr = JSON.parse(sessionStorage.getItem(key) ?? '[]');
    arr.push(id);
    sessionStorage.setItem(key, JSON.stringify(arr));
  } catch {}
}

/* ── Discriminated union ────────────────────────────────────────────────── */
type FiringItem =
  | { kind: 'reminder'; data: any }
  | { kind: 'family';   data: any };

const API_BASE = process.env['NEXT_PUBLIC_API_URL']?.replace('/v1', '') ?? '';

/* ── Component ──────────────────────────────────────────────────────────── */
export function FiringAlarm() {
  const { user }          = useAuthStore();
  const qc                = useQueryClient();
  const shownRef          = useRef<Set<string>>(new Set());
  const famShownRef       = useRef<Set<string>>(new Set());
  const [queue, setQueue] = useState<FiringItem[]>([]);
  const current           = queue[0] ?? null;

  // Voice playback refs
  const audioRef        = useRef<HTMLAudioElement | null>(null);
  const volIntervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  function playVoice(url: string, gradual: boolean) {
    stopVoice();
    const audio = new Audio(`${API_BASE}${url}`);
    audioRef.current = audio;
    audio.volume = gradual ? 0.05 : 1;
    audio.play().catch(() => playBeep());
    if (gradual) {
      let v = 0.05;
      volIntervalRef.current = setInterval(() => {
        v = Math.min(v + 0.05, 1);
        if (audioRef.current) audioRef.current.volume = v;
        if (v >= 1 && volIntervalRef.current) {
          clearInterval(volIntervalRef.current);
          volIntervalRef.current = null;
        }
      }, 1000);
    }
  }

  function stopVoice() {
    if (volIntervalRef.current) { clearInterval(volIntervalRef.current); volIntervalRef.current = null; }
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
  }

  // Hydrate shown-IDs from sessionStorage on mount
  useEffect(() => {
    shownRef.current    = getShownIds(STORAGE_KEY);
    famShownRef.current = getShownIds(FAM_STORAGE_KEY);
  }, []);

  // Cleanup audio on unmount
  useEffect(() => () => stopVoice(), []); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll reminders
  const { data: remindersData } = useQuery({
    queryKey: ['firing-alarms'],
    queryFn:  () => api.reminders.list({ status: 'pending', limit: 100, sort: 'fireAt', order: 'asc' }),
    enabled:  !!user,
    refetchInterval: 30_000,
  });

  // Poll family alarms
  const { data: famData } = useQuery({
    queryKey: ['firing-family-alarms'],
    queryFn:  () => api.familyAlarms.list({ limit: 100 }),
    enabled:  !!user,
    refetchInterval: 30_000,
  });

  // Enqueue newly-fired reminders
  useEffect(() => {
    const raw: any[] = (remindersData as any)?.data?.reminders ?? (remindersData as any)?.reminders ?? (remindersData as any)?.data ?? [];
    const reminders  = Array.isArray(raw) ? raw : [];
    const now = Date.now();

    const firing = reminders.filter((r: any) => {
      if (!r.fireAt || shownRef.current.has(r.id)) return false;
      return new Date(r.fireAt).getTime() <= now;
    });

    if (firing.length === 0) return;
    setQueue(prev => {
      const existing = new Set(prev.map(i => i.data.id));
      const newItems: FiringItem[] = firing
        .filter((r: any) => !existing.has(r.id))
        .map((r: any) => ({ kind: 'reminder', data: r }));
      return [...prev, ...newItems];
    });
  }, [remindersData]);

  // Enqueue newly-fired family alarms
  useEffect(() => {
    const raw: any[] = (famData as any)?.data ?? [];
    const alarms = Array.isArray(raw) ? raw : [];
    const now = Date.now();

    const firing = alarms.filter((a: any) => {
      if (!a.active || a.deletedAt || famShownRef.current.has(a.id)) return false;
      return a.fireAt && new Date(a.fireAt).getTime() <= now;
    });

    if (firing.length === 0) return;
    setQueue(prev => {
      const existing = new Set(prev.map(i => i.data.id));
      const newItems: FiringItem[] = firing
        .filter((a: any) => !existing.has(a.id))
        .map((a: any) => ({ kind: 'family', data: a }));
      return [...prev, ...newItems];
    });
  }, [famData]);

  // Play sound when alarm shows
  useEffect(() => {
    if (!current) return;

    if (current.kind === 'reminder') {
      markShown(STORAGE_KEY, current.data.id);
      shownRef.current.add(current.data.id);
      playBeep();
      setTimeout(() => speak(`Reminder: ${current.data.title}`), 700);
    } else {
      markShown(FAM_STORAGE_KEY, current.data.id);
      famShownRef.current.add(current.data.id);
      if (current.data.voiceFileUrl) {
        setTimeout(() => playVoice(current.data.voiceFileUrl, current.data.gradualVolume ?? true), 400);
      } else {
        playBeep();
        setTimeout(() => speak(`${current.data.voiceLabel} says: ${current.data.title}`), 700);
      }
    }
  }, [current?.data?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Mutations — reminders */
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

  /* Mutations — family alarms */
  const famDoneMut = useMutation({
    mutationFn: (id: string) => api.familyAlarms.update(id, { active: false }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['family-alarms'] });
      qc.invalidateQueries({ queryKey: ['firing-family-alarms'] });
      toast.success('Alarm dismissed!');
    },
    onError: () => toast.error('Failed to dismiss'),
  });

  const famSnoozeMut = useMutation({
    mutationFn: (id: string) => {
      const snoozedUntil = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      return api.familyAlarms.update(id, { fire_at: snoozedUntil });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['family-alarms'] });
      qc.invalidateQueries({ queryKey: ['firing-family-alarms'] });
      toast.success('Snoozed 10 min');
    },
    onError: () => toast.error('Failed to snooze'),
  });

  function advance() {
    stopVoice();
    window.speechSynthesis?.cancel();
    setQueue(prev => prev.slice(1));
  }

  function handleDone() {
    if (!current) return;
    stopVoice();
    window.speechSynthesis?.cancel();
    if (current.kind === 'family') {
      famDoneMut.mutate(current.data.id);
    } else {
      completeMutation.mutate(current.data.id);
    }
    setQueue(prev => prev.slice(1));
  }

  function handleSnooze() {
    if (!current) return;
    stopVoice();
    window.speechSynthesis?.cancel();
    if (current.kind === 'family') {
      famSnoozeMut.mutate(current.data.id);
    } else {
      snoozeMutation.mutate(current.data.id);
    }
    setQueue(prev => prev.slice(1));
  }

  if (!current) return null;

  const isFamilyAlarm = current.kind === 'family';
  const fireAt = current.data.fireAt ? new Date(current.data.fireAt) : null;

  const accentColor = isFamilyAlarm ? '#f43f5e' : 'var(--amber)';
  const shadowColor = isFamilyAlarm ? 'rgba(244,63,94,0.25)' : 'rgba(240,162,2,0.25)';
  const borderStyle = isFamilyAlarm ? '2px solid #f43f5e' : '2px solid var(--amber)';
  const doneStyle   = isFamilyAlarm
    ? { background: '#f43f5e', boxShadow: '0 4px 14px rgba(244,63,94,0.4)' }
    : { background: 'var(--amber)', boxShadow: 'var(--sh-amber)' };

  const isActing = completeMutation.isPending || snoozeMutation.isPending
    || famDoneMut.isPending || famSnoozeMut.isPending;

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.72)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 99999,
    }}>
      <div style={{
        background: 'var(--card)',
        border: borderStyle,
        borderRadius: 22,
        padding: '36px 32px 28px',
        maxWidth: 440, width: '90%',
        boxShadow: `0 0 80px ${shadowColor}, 0 24px 64px rgba(0,0,0,0.45)`,
        textAlign: 'center',
      }}>
        {/* Icon — animated */}
        <div style={{ fontSize: 52, marginBottom: 4, display: 'inline-block', animation: 'glt-ring 0.55s ease-in-out infinite alternate' }}>
          {isFamilyAlarm
            ? (VOICE_LABEL_EMOJI[current.data.voiceLabel] || '❤️')
            : (TYPE_ICON[current.data.type] ?? '🔔')}
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

        {/* Subtitle for family alarms */}
        {isFamilyAlarm && (
          <div style={{ fontSize: 12, color: accentColor, fontWeight: 700, marginTop: 8, letterSpacing: '0.04em' }}>
            {VOICE_LABEL_EMOJI[current.data.voiceLabel] || '❤️'} {current.data.voiceLabel} is waking you up
          </div>
        )}

        {/* Title */}
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 22, fontWeight: 700,
          color: 'var(--t1)', margin: '12px 0 6px',
          lineHeight: 1.3,
        }}>
          {current.data.title}
        </div>

        {/* Time */}
        {fireAt && (
          <div style={{ fontSize: 13, color: accentColor, fontWeight: 600, marginBottom: 20 }}>
            🕐{' '}
            {fireAt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
            {' · '}
            {fireAt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
          </div>
        )}

        {/* Notes */}
        {current.data.notes && (
          <div style={{
            fontSize: 13, color: 'var(--t2)',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--b1)',
            borderRadius: 10, padding: '10px 14px',
            marginBottom: 20, textAlign: 'left',
            lineHeight: 1.5,
          }}>
            {current.data.notes}
          </div>
        )}

        {/* Read again / Play again */}
        <button
          onClick={() => {
            if (isFamilyAlarm && current.data.voiceFileUrl) {
              playVoice(current.data.voiceFileUrl, current.data.gradualVolume ?? true);
            } else {
              const text = isFamilyAlarm
                ? `${current.data.voiceLabel} says: ${current.data.title}`
                : `Reminder: ${current.data.title}`;
              speak(text);
            }
          }}
          style={{
            background: 'none',
            border: `1px solid ${isFamilyAlarm ? 'rgba(244,63,94,0.3)' : 'var(--b1)'}`,
            borderRadius: 8, padding: '5px 14px',
            cursor: 'pointer', fontSize: 12,
            color: isFamilyAlarm ? '#f43f5e' : 'var(--t3)',
            marginBottom: 22,
          }}
        >
          {isFamilyAlarm && current.data.voiceFileUrl ? '▶ Play Again' : '🔊 Read again'}
        </button>

        {/* Main actions */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <button
            onClick={handleSnooze}
            disabled={isActing}
            style={{
              flex: 1, padding: '13px 0', borderRadius: 12,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid var(--b1)', cursor: 'pointer',
              fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600,
              color: 'var(--t2)',
              opacity: isActing ? 0.6 : 1,
            }}
          >
            😴 Snooze 10 min
          </button>
          <button
            onClick={handleDone}
            disabled={isActing}
            style={{
              flex: 1, padding: '13px 0', borderRadius: 12,
              border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700,
              color: '#fff',
              opacity: isActing ? 0.6 : 1,
              ...doneStyle,
            }}
          >
            ✓ Done
          </button>
        </div>

        {/* Dismiss */}
        <button
          onClick={advance}
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
