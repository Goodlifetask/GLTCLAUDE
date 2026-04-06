'use client';
import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';

const PRIORITY_COLOR: Record<string, { bg: string; color: string }> = {
  urgent: { bg: '#fee2e2', color: '#dc2626' },
  high:   { bg: '#fef3c7', color: '#d97706' },
  medium: { bg: 'var(--amber-glow)', color: 'var(--amber)' },
  low:    { bg: '#f0fdf4', color: '#16a34a' },
};

const TYPE_ICON: Record<string, string> = {
  call: '📞', task: '✓', email: '✉️', location: '📍', event: '📅',
};

const SNOOZE_OPTIONS = [
  { label: '15 minutes', minutes: 15 },
  { label: '1 hour',     minutes: 60 },
  { label: '3 hours',    minutes: 180 },
  { label: 'Tomorrow',   minutes: 24 * 60 },
];

const VOICE_LABELS = ['Dad', 'Mom', 'Wife', 'Husband', 'Son', 'Daughter', 'Friend', 'Partner', 'Grandpa', 'Grandma', 'Other'];

const VOICE_LABEL_EMOJI: Record<string, string> = {
  Dad: '👨', Mom: '👩', Wife: '👩', Husband: '👨', Son: '👦', Daughter: '👧',
  Friend: '🤝', Partner: '💑', Grandpa: '👴', Grandma: '👵', Other: '❤️', 'Loved One': '❤️',
};

// ─── Reminder Card ────────────────────────────────────────────────────────────

function ReminderCard({ item, onRemove }: { item: any; onRemove: (id: string) => void }) {
  const [showSnooze, setShowSnooze] = useState(false);
  const [showRepeat, setShowRepeat] = useState(false);
  const [repeatDate, setRepeatDate] = useState('');
  const snoozeRef = useRef<HTMLDivElement>(null);
  const repeatRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const now = new Date();
  const pri = item.priority || 'medium';
  const colors = PRIORITY_COLOR[pri] ?? PRIORITY_COLOR.medium;
  const fireAt = item.fireAt ? new Date(item.fireAt) : null;
  const isOver = fireAt && fireAt < now;
  const diffMs = fireAt ? Math.abs(fireAt.getTime() - now.getTime()) : 0;
  const diffMin = Math.floor(diffMs / 60000);
  const timeLabel = isOver
    ? diffMin < 60 ? `${diffMin}m overdue` : `${Math.floor(diffMin / 60)}h overdue`
    : diffMin < 60 ? `in ${diffMin}m` : `in ${Math.floor(diffMin / 60)}h`;

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (snoozeRef.current && !snoozeRef.current.contains(e.target as Node)) setShowSnooze(false);
      if (repeatRef.current && !repeatRef.current.contains(e.target as Node)) setShowRepeat(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['fly-alarms-overdue'] });

  const snoozeMut = useMutation({
    mutationFn: (minutes: number) => api.reminders.snooze(item.id, minutes),
    onSuccess: () => { onRemove(item.id); invalidate(); },
  });

  const repeatMut = useMutation({
    mutationFn: (isoDate: string) => api.reminders.update(item.id, { fire_at: isoDate, status: 'pending' }),
    onSuccess: () => { setShowRepeat(false); onRemove(item.id); invalidate(); },
  });

  const doneMut = useMutation({
    mutationFn: () => api.reminders.complete(item.id),
    onSuccess: () => { onRemove(item.id); invalidate(); },
  });

  const isActing = snoozeMut.isPending || repeatMut.isPending || doneMut.isPending;

  const btnBase: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 4,
    padding: '5px 11px', borderRadius: 7, fontSize: 11, fontWeight: 600,
    border: '1px solid', cursor: 'pointer', transition: 'opacity 0.12s',
    opacity: isActing ? 0.55 : 1,
    background: 'transparent',
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '13px 18px',
      background: isOver ? 'rgba(220,38,38,0.04)' : 'var(--card)',
      border: `1px solid ${isOver ? 'rgba(220,38,38,0.18)' : 'var(--b1)'}`,
      borderRadius: 'var(--r)',
      transition: 'opacity 0.15s',
      opacity: isActing ? 0.7 : 1,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: isOver ? 'rgba(220,38,38,0.1)' : 'var(--amber-glow)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
      }}>
        {TYPE_ICON[item.type] || '⚡'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)', marginBottom: 3 }}>
          {item.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
            background: isOver ? '#fee2e2' : 'var(--amber-glow)',
            color: isOver ? '#dc2626' : 'var(--amber)',
          }}>
            {isOver ? '⚡ ' : '⏳ '}{timeLabel}
          </span>
          <span style={{
            fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
            background: colors.bg, color: colors.color,
          }}>
            {pri}
          </span>
          {item.category && (
            <span style={{ fontSize: 10, color: 'var(--t4)', background: 'var(--b1)', padding: '2px 7px', borderRadius: 10 }}>
              {item.category}
            </span>
          )}
          {item.type && (
            <span style={{ fontSize: 10, color: 'var(--t3)', background: 'var(--b1)', padding: '2px 7px', borderRadius: 10, fontWeight: 600 }}>
              {TYPE_ICON[item.type]} {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
            </span>
          )}
        </div>
      </div>
      {fireAt && (
        <div style={{ fontSize: 11, color: 'var(--t3)', textAlign: 'right', flexShrink: 0 }}>
          {fireAt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
          <div style={{ fontSize: 10, color: 'var(--t4)' }}>
            {fireAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </div>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <div ref={snoozeRef} style={{ position: 'relative' }}>
          <button
            onClick={() => { setShowSnooze(v => !v); setShowRepeat(false); }}
            disabled={isActing}
            style={{ ...btnBase, color: '#6366f1', borderColor: 'rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.08)' }}
          >
            😴 Snooze
          </button>
          {showSnooze && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 60,
              background: 'var(--card)', border: '1px solid var(--b1)',
              borderRadius: 10, boxShadow: '0 8px 28px rgba(0,0,0,0.18)',
              minWidth: 160, overflow: 'hidden',
            }}>
              {SNOOZE_OPTIONS.map(opt => (
                <button
                  key={opt.minutes}
                  onClick={() => { snoozeMut.mutate(opt.minutes); setShowSnooze(false); }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '9px 16px', fontSize: 12, fontWeight: 500,
                    background: 'transparent', border: 'none', color: 'var(--t1)',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--b1)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div ref={repeatRef} style={{ position: 'relative' }}>
          <button
            onClick={() => { setShowRepeat(v => !v); setShowSnooze(false); }}
            disabled={isActing}
            style={{ ...btnBase, color: '#10b981', borderColor: 'rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.08)' }}
          >
            🔁 Repeat
          </button>
          {showRepeat && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 60,
              background: 'var(--card)', border: '1px solid var(--b1)',
              borderRadius: 12, boxShadow: '0 8px 28px rgba(0,0,0,0.18)',
              padding: '16px', minWidth: 230,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Choose next date
              </div>
              <input
                type="datetime-local"
                value={repeatDate}
                onChange={e => setRepeatDate(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: 8,
                  border: '1px solid var(--b1)', background: 'var(--bg)',
                  color: 'var(--t1)', fontSize: 12, marginBottom: 10,
                  boxSizing: 'border-box',
                }}
              />
              <button
                onClick={() => repeatDate && repeatMut.mutate(new Date(repeatDate).toISOString())}
                disabled={!repeatDate || repeatMut.isPending}
                style={{
                  width: '100%', padding: '8px', borderRadius: 8,
                  fontSize: 12, fontWeight: 700,
                  background: repeatDate ? '#10b981' : 'var(--b1)',
                  color: repeatDate ? '#fff' : 'var(--t4)',
                  border: 'none', cursor: repeatDate ? 'pointer' : 'default',
                  transition: 'background 0.15s',
                }}
              >
                {repeatMut.isPending ? 'Saving…' : 'Set Date'}
              </button>
            </div>
          )}
        </div>
        <button
          onClick={() => doneMut.mutate()}
          disabled={isActing}
          style={{ ...btnBase, color: '#ef4444', borderColor: 'rgba(220,38,38,0.28)', background: 'rgba(220,38,38,0.07)' }}
        >
          {doneMut.isPending ? '…' : '✓ Done'}
        </button>
      </div>
    </div>
  );
}

// ─── Family Alarm Modal ────────────────────────────────────────────────────────

interface FamilyAlarmForm {
  title: string;
  voice_label: string;
  fire_at: string;
  repeat_rule: string;
  notes: string;
  gradual_volume: boolean;
}

const EMPTY_FORM: FamilyAlarmForm = {
  title: '', voice_label: 'Loved One', fire_at: '', repeat_rule: '',
  notes: '', gradual_volume: true,
};

function FamilyAlarmModal({
  alarm,
  onClose,
  onSaved,
}: {
  alarm: any | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FamilyAlarmForm>(
    alarm
      ? {
          title:          alarm.title,
          voice_label:    alarm.voiceLabel,
          fire_at:        alarm.fireAt ? new Date(alarm.fireAt).toISOString().slice(0, 16) : '',
          repeat_rule:    alarm.repeatRule ?? '',
          notes:          alarm.notes ?? '',
          gradual_volume: alarm.gradualVolume ?? true,
        }
      : EMPTY_FORM,
  );
  const [voiceFile, setVoiceFile] = useState<File | null>(null);
  const [voicePreview, setVoicePreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  // ── Recorder state ──
  const [recState, setRecState] = useState<'idle' | 'recording' | 'done'>('idle');
  const [recSeconds, setRecSeconds] = useState(0);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const chunksRef   = useRef<BlobPart[]>([]);
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Microphone not supported in this browser'); return;
    }
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mediaRecRef.current = mr;
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `voice-recording-${Date.now()}.webm`, { type: 'audio/webm' });
        if (voicePreview) URL.revokeObjectURL(voicePreview);
        setVoiceFile(file);
        setVoicePreview(URL.createObjectURL(blob));
        setRecState('done');
      };
      mr.start();
      setRecState('recording');
      setRecSeconds(0);
      timerRef.current = setInterval(() => setRecSeconds(s => s + 1), 1000);
    }).catch(() => setError('Microphone access denied — please allow mic permission'));
  }

  function stopRecording() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    mediaRecRef.current?.stop();
  }

  function discardRecording() {
    stopRecording();
    if (voicePreview) { URL.revokeObjectURL(voicePreview); setVoicePreview(null); }
    setVoiceFile(null);
    setRecState('idle');
    setRecSeconds(0);
  }

  const fmtSec = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const set = (k: keyof FamilyAlarmForm, v: any) => setForm(f => ({ ...f, [k]: v }));

  const createMut = useMutation({
    mutationFn: (data: FamilyAlarmForm) =>
      api.familyAlarms.create({ ...data, fire_at: new Date(data.fire_at).toISOString() }),
    onSuccess: async (res) => {
      const newId = res?.data?.id;
      if (newId && voiceFile) {
        await api.familyAlarms.uploadVoice(newId, voiceFile).catch(() => {});
      }
      qc.invalidateQueries({ queryKey: ['family-alarms'] });
      qc.invalidateQueries({ queryKey: ['family-alarms-plan'] });
      onSaved();
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message ?? 'Failed to create alarm');
    },
  });

  const updateMut = useMutation({
    mutationFn: (data: FamilyAlarmForm) =>
      api.familyAlarms.update(alarm!.id, { ...data, fire_at: new Date(data.fire_at).toISOString() }),
    onSuccess: async () => {
      if (voiceFile) {
        await api.familyAlarms.uploadVoice(alarm!.id, voiceFile).catch(() => {});
      }
      qc.invalidateQueries({ queryKey: ['family-alarms'] });
      onSaved();
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message ?? 'Failed to update alarm');
    },
  });

  const isPending = createMut.isPending || updateMut.isPending;

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (voicePreview) URL.revokeObjectURL(voicePreview);
    setVoiceFile(f);
    setVoicePreview(URL.createObjectURL(f));
  }

  function submit() {
    setError('');
    if (!form.title.trim()) { setError('Title is required'); return; }
    if (!form.fire_at) { setError('Date & time is required'); return; }
    if (alarm) updateMut.mutate(form);
    else createMut.mutate(form);
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: '1px solid var(--b1)', background: 'var(--bg)',
    color: 'var(--t1)', fontSize: 13, boxSizing: 'border-box',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: 'rgba(0,0,0,0.55)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 16,
    }} onClick={onClose}>
      <div
        style={{
          background: 'var(--card)', borderRadius: 16,
          boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
          width: '100%', maxWidth: 500, maxHeight: '90vh',
          overflowY: 'auto', padding: 28,
        }}
        onClick={e => e.stopPropagation()}
      >
        <style>{`@keyframes glt-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.7)} }`}</style>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--t1)' }}>
            {alarm ? 'Edit Family Alarm' : 'New Family Alarm'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--t3)', lineHeight: 1 }}>×</button>
        </div>

        {error && (
          <div style={{ background: '#fee2e2', color: '#dc2626', borderRadius: 8, padding: '10px 14px', fontSize: 12, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Title */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
              Title *
            </label>
            <input
              type="text"
              placeholder="e.g. Wake up, breakfast is ready!"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              style={inputStyle}
              maxLength={255}
            />
          </div>

          {/* Voice Label */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
              Voice Label
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {VOICE_LABELS.map(l => (
                <button
                  key={l}
                  onClick={() => set('voice_label', l)}
                  style={{
                    padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                    border: `1.5px solid ${form.voice_label === l ? '#f43f5e' : 'var(--b1)'}`,
                    background: form.voice_label === l ? 'rgba(244,63,94,0.1)' : 'transparent',
                    color: form.voice_label === l ? '#f43f5e' : 'var(--t2)',
                    cursor: 'pointer', transition: 'all 0.12s',
                  }}
                >
                  {VOICE_LABEL_EMOJI[l] || '❤️'} {l}
                </button>
              ))}
            </div>
          </div>

          {/* Date, Time & Repeat */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>
              Date &amp; Time *
            </label>
            <input
              type="datetime-local"
              value={form.fire_at}
              onChange={e => set('fire_at', e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              style={{ ...inputStyle, marginBottom: 10 }}
            />

            {/* Repeat picker */}
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>
              Repeat
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {[
                { label: 'Once',     value: '',                     icon: '1️⃣' },
                { label: 'Daily',    value: 'RRULE:FREQ=DAILY',     icon: '📅' },
                { label: 'Weekdays', value: 'RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', icon: '💼' },
                { label: 'Weekends', value: 'RRULE:FREQ=WEEKLY;BYDAY=SA,SU', icon: '🌅' },
                { label: 'Weekly',   value: 'RRULE:FREQ=WEEKLY',    icon: '🔁' },
                { label: 'Monthly',  value: 'RRULE:FREQ=MONTHLY',   icon: '🗓' },
                { label: 'Yearly',   value: 'RRULE:FREQ=YEARLY',    icon: '🎂' },
              ].map(opt => {
                const active = form.repeat_rule === opt.value;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => set('repeat_rule', opt.value)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '6px 13px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                      border: `1.5px solid ${active ? '#f43f5e' : 'var(--b1)'}`,
                      background: active ? 'rgba(244,63,94,0.1)' : 'transparent',
                      color: active ? '#f43f5e' : 'var(--t2)',
                      cursor: 'pointer', transition: 'all 0.12s',
                    }}
                  >
                    <span style={{ fontSize: 13 }}>{opt.icon}</span>
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {/* Show end date only for repeating alarms */}
            {form.repeat_rule && (
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                <label style={{ fontSize: 12, color: 'var(--t3)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  End date (optional)
                </label>
                <input
                  type="date"
                  min={new Date().toISOString().slice(0, 10)}
                  style={{ ...inputStyle, flex: 1 }}
                  onChange={e => {
                    if (e.target.value) {
                      const base = form.repeat_rule.split(';UNTIL=')[0];
                      const until = e.target.value.replace(/-/g, '') + 'T235959Z';
                      set('repeat_rule', `${base};UNTIL=${until}`);
                    } else {
                      set('repeat_rule', form.repeat_rule.split(';UNTIL=')[0]);
                    }
                  }}
                />
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
              Notes
            </label>
            <textarea
              placeholder="Optional message or reminder note…"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              maxLength={5000}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          {/* Gradual Volume */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--b1)', borderRadius: 10 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>Gradual Volume</div>
              <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 2 }}>Ramp up slowly from 5% to 100%</div>
            </div>
            <button
              onClick={() => set('gradual_volume', !form.gradual_volume)}
              style={{
                width: 44, height: 24, borderRadius: 12,
                background: form.gradual_volume ? '#f43f5e' : 'var(--b2)',
                border: 'none', cursor: 'pointer', position: 'relative',
                transition: 'background 0.2s', flexShrink: 0,
              }}
            >
              <span style={{
                position: 'absolute', top: 2, left: form.gradual_volume ? 22 : 2,
                width: 20, height: 20, borderRadius: '50%',
                background: '#fff', transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </button>
          </div>

          {/* Voice Recording — record mic OR upload file */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>
              Voice Recording
            </label>

            {/* Record / Stop bar */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 14px', borderRadius: 10,
              background: recState === 'recording' ? 'rgba(244,63,94,0.08)' : 'var(--b1)',
              border: `1.5px solid ${recState === 'recording' ? '#f43f5e' : 'var(--b1)'}`,
              transition: 'all 0.2s',
            }}>
              {recState === 'idle' && (
                <button
                  onClick={startRecording}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                    background: 'linear-gradient(135deg,#f43f5e,#e11d48)',
                    color: '#fff', border: 'none', cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontSize: 16 }}>🎙</span> Record
                </button>
              )}

              {recState === 'recording' && (
                <>
                  {/* Pulsing dot */}
                  <span style={{
                    width: 10, height: 10, borderRadius: '50%', background: '#f43f5e', flexShrink: 0,
                    animation: 'glt-pulse 1s ease-in-out infinite',
                  }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#f43f5e', minWidth: 44 }}>
                    {fmtSec(recSeconds)}
                  </span>
                  <span style={{ flex: 1, fontSize: 12, color: 'var(--t3)' }}>Recording…</span>
                  <button
                    onClick={stopRecording}
                    style={{
                      padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                      background: '#fff', color: '#f43f5e',
                      border: '1.5px solid #f43f5e', cursor: 'pointer',
                    }}
                  >
                    ⏹ Stop
                  </button>
                </>
              )}

              {recState === 'done' && (
                <>
                  <span style={{ fontSize: 14 }}>✅</span>
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: 'var(--t2)' }}>
                    Recording ready ({fmtSec(recSeconds)})
                  </span>
                  <button
                    onClick={discardRecording}
                    style={{
                      padding: '5px 12px', borderRadius: 7, fontSize: 11, fontWeight: 600,
                      background: 'transparent', color: '#f43f5e',
                      border: '1px solid rgba(244,63,94,0.35)', cursor: 'pointer',
                    }}
                  >
                    Re-record
                  </button>
                </>
              )}
            </div>

            {/* Audio preview */}
            {voicePreview && (
              <audio controls src={voicePreview} style={{ width: '100%', marginTop: 8, borderRadius: 8, height: 36 }} />
            )}

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '10px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--b1)' }} />
              <span style={{ fontSize: 11, color: 'var(--t4)', fontWeight: 600 }}>or upload</span>
              <div style={{ flex: 1, height: 1, background: 'var(--b1)' }} />
            </div>

            {/* Upload button */}
            <input ref={fileRef} type="file" accept="audio/*" onChange={handleFile} style={{ display: 'none' }} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={recState === 'recording'}
              style={{
                width: '100%', padding: '9px', borderRadius: 8,
                border: '1.5px dashed var(--b1)', background: 'transparent',
                color: 'var(--t3)', cursor: recState === 'recording' ? 'not-allowed' : 'pointer',
                fontSize: 12, opacity: recState === 'recording' ? 0.4 : 1,
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => { if (recState !== 'recording') e.currentTarget.style.borderColor = '#f43f5e'; }}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--b1)')}
            >
              {voiceFile && recState !== 'done'
                ? `📎 ${voiceFile.name}`
                : (alarm?.voiceFileUrl && !voiceFile ? '📎 Replace file' : '📎 Upload MP3 / WAV / M4A…')}
            </button>

            {!voicePreview && alarm?.voiceFileUrl && (
              <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 6 }}>
                Current file: {alarm.voiceFileUrl.split('/').pop()}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '10px', borderRadius: 9,
              border: '1px solid var(--b1)', background: 'transparent',
              color: 'var(--t2)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={isPending}
            style={{
              flex: 2, padding: '10px', borderRadius: 9,
              border: 'none', background: isPending ? 'var(--b1)' : 'linear-gradient(135deg,#f43f5e,#e11d48)',
              color: isPending ? 'var(--t4)' : '#fff',
              fontSize: 13, fontWeight: 700, cursor: isPending ? 'default' : 'pointer',
              transition: 'opacity 0.15s',
            }}
          >
            {isPending ? 'Saving…' : alarm ? 'Save Changes' : 'Create Alarm'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Family Alarms Tab ─────────────────────────────────────────────────────────

function FamilyAlarmsTab() {
  const [showModal, setShowModal] = useState(false);
  const [editAlarm, setEditAlarm] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const qc = useQueryClient();

  const { data: alarmsData, isLoading } = useQuery({
    queryKey: ['family-alarms'],
    queryFn: () => api.familyAlarms.list({ limit: 100 }),
    staleTime: 30_000,
  });

  const { data: planData } = useQuery({
    queryKey: ['family-alarms-plan'],
    queryFn: () => api.familyAlarms.planStatus(),
    staleTime: 60_000,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.familyAlarms.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['family-alarms'] });
      qc.invalidateQueries({ queryKey: ['family-alarms-plan'] });
      setDeleteTarget(null);
    },
  });

  const alarms: any[] = alarmsData?.data ?? [];
  const plan = planData?.data;
  const isFree = plan?.plan === 'free';
  const canCreate = plan?.canCreate !== false;

  function openCreate() { setEditAlarm(null); setShowModal(true); }
  function openEdit(alarm: any) { setEditAlarm(alarm); setShowModal(true); }
  function closeModal() { setShowModal(false); setEditAlarm(null); }

  const fmtDate = (d: string) => {
    const dt = new Date(d);
    return dt.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

      {/* Upgrade Banner */}
      {isFree && plan && (
        <div style={{
          margin: '16px 32px 0',
          padding: '12px 18px',
          borderRadius: 12,
          background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
          border: '1px solid #f59e0b',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 20 }}>⭐</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e' }}>
              You've used {plan.count}/{plan.limit} family alarms on Free
            </div>
            <div style={{ fontSize: 11, color: '#a16207', marginTop: 2 }}>
              Upgrade to Pro for unlimited family voice alarms
            </div>
          </div>
          <a
            href="/settings?tab=billing"
            style={{
              padding: '6px 16px', borderRadius: 20, fontSize: 11, fontWeight: 700,
              background: '#d97706', color: '#fff', textDecoration: 'none',
              flexShrink: 0,
            }}
          >
            Upgrade
          </a>
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 32px' }}>
        <div style={{ fontSize: 12, color: 'var(--t4)' }}>
          {alarms.length} alarm{alarms.length !== 1 ? 's' : ''}
          {isFree && plan ? ` · ${plan.limit - plan.count} remaining on Free` : ''}
        </div>
        <button
          onClick={openCreate}
          disabled={!canCreate}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 18px', borderRadius: 9, fontSize: 12, fontWeight: 700,
            background: canCreate ? 'linear-gradient(135deg,#f43f5e,#e11d48)' : 'var(--b1)',
            color: canCreate ? '#fff' : 'var(--t4)',
            border: 'none', cursor: canCreate ? 'pointer' : 'not-allowed',
            opacity: canCreate ? 1 : 0.6,
            transition: 'opacity 0.15s',
          }}
        >
          + New Alarm
        </button>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 32px 24px' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--t4)', fontSize: 13 }}>Loading…</div>
        ) : alarms.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎙</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--t2)', marginBottom: 6 }}>No family alarms yet</div>
            <div style={{ fontSize: 12, color: 'var(--t4)', marginBottom: 24 }}>
              Record a voice clip from a loved one and wake up to their voice
            </div>
            {canCreate && (
              <button
                onClick={openCreate}
                style={{
                  padding: '10px 24px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                  background: 'linear-gradient(135deg,#f43f5e,#e11d48)',
                  color: '#fff', border: 'none', cursor: 'pointer',
                }}
              >
                Create First Alarm
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {alarms.map((alarm: any) => (
              <div
                key={alarm.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 18px',
                  background: 'var(--card)',
                  border: `1px solid ${alarm.active ? 'rgba(244,63,94,0.15)' : 'var(--b1)'}`,
                  borderRadius: 'var(--r)',
                  opacity: alarm.active ? 1 : 0.55,
                }}
              >
                {/* Voice label avatar */}
                <div style={{
                  width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                  background: 'rgba(244,63,94,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                }}>
                  {VOICE_LABEL_EMOJI[alarm.voiceLabel] || '❤️'}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {alarm.title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 10,
                      background: 'rgba(244,63,94,0.1)', color: '#f43f5e',
                    }}>
                      {VOICE_LABEL_EMOJI[alarm.voiceLabel] || '❤️'} {alarm.voiceLabel}
                    </span>
                    {alarm.voiceFileUrl && (
                      <span style={{ fontSize: 10, color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: 10 }}>
                        🎙 Voice
                      </span>
                    )}
                    {alarm.repeatRule && (
                      <span style={{ fontSize: 10, color: 'var(--t3)', background: 'var(--b1)', padding: '2px 8px', borderRadius: 10 }}>
                        🔁 Repeating
                      </span>
                    )}
                    {!alarm.active && (
                      <span style={{ fontSize: 10, color: 'var(--t4)', background: 'var(--b1)', padding: '2px 8px', borderRadius: 10 }}>
                        Inactive
                      </span>
                    )}
                  </div>
                </div>

                {/* Fire time */}
                <div style={{ fontSize: 11, color: 'var(--t3)', textAlign: 'right', flexShrink: 0 }}>
                  {fmtDate(alarm.fireAt)}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => openEdit(alarm)}
                    style={{
                      padding: '5px 12px', borderRadius: 7, fontSize: 11, fontWeight: 600,
                      border: '1px solid var(--b1)', background: 'transparent',
                      color: 'var(--t2)', cursor: 'pointer',
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteTarget(alarm)}
                    style={{
                      padding: '5px 12px', borderRadius: 7, fontSize: 11, fontWeight: 600,
                      border: '1px solid rgba(220,38,38,0.25)', background: 'rgba(220,38,38,0.06)',
                      color: '#ef4444', cursor: 'pointer',
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <FamilyAlarmModal
          alarm={editAlarm}
          onClose={closeModal}
          onSaved={() => { closeModal(); }}
        />
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 999,
            background: 'rgba(0,0,0,0.55)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: 16,
          }}
          onClick={() => setDeleteTarget(null)}
        >
          <div
            style={{
              background: 'var(--card)', borderRadius: 14,
              boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
              width: '100%', maxWidth: 380, padding: 28,
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 12 }}>🗑</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--t1)', textAlign: 'center', marginBottom: 8 }}>
              Delete Alarm?
            </div>
            <div style={{ fontSize: 12, color: 'var(--t3)', textAlign: 'center', marginBottom: 24 }}>
              "{deleteTarget.title}" will be permanently deleted.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setDeleteTarget(null)}
                style={{
                  flex: 1, padding: '10px', borderRadius: 9,
                  border: '1px solid var(--b1)', background: 'transparent',
                  color: 'var(--t2)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMut.mutate(deleteTarget.id)}
                disabled={deleteMut.isPending}
                style={{
                  flex: 1, padding: '10px', borderRadius: 9,
                  border: 'none', background: '#ef4444',
                  color: '#fff', fontSize: 13, fontWeight: 700,
                  cursor: deleteMut.isPending ? 'default' : 'pointer',
                  opacity: deleteMut.isPending ? 0.6 : 1,
                }}
              >
                {deleteMut.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FlyAlarmsPage() {
  const [tab, setTab] = useState<'alarms' | 'family'>('alarms');
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const { data: overdueData, isLoading } = useQuery({
    queryKey: ['fly-alarms-overdue'],
    queryFn: () => api.reminders.list({ status: 'pending', sort: 'fireAt', order: 'asc', limit: 50 }),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const onRemove = (id: string) =>
    setDismissed(prev => new Set([...prev, id]));

  const now = new Date();
  const allPending: any[] = ((overdueData as any)?.data ?? []).filter((r: any) => !dismissed.has(r.id));
  const overdue     = allPending.filter((r: any) => r.fireAt && new Date(r.fireAt) < now);
  const upcoming24h = allPending.filter((r: any) => {
    if (!r.fireAt) return false;
    const t = new Date(r.fireAt);
    return t >= now && t <= new Date(now.getTime() + 24 * 60 * 60 * 1000);
  });

  const tabBtn = (active: boolean): React.CSSProperties => ({
    padding: '6px 18px', borderRadius: 20, fontSize: 12, fontWeight: 700,
    border: 'none', cursor: 'pointer', transition: 'all 0.15s',
    background: active ? 'rgba(255,255,255,0.2)' : 'transparent',
    color: active ? '#fff' : 'rgba(255,255,255,0.55)',
  });

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--bg)' }}>

      {/* Header */}
      <div style={{
        padding: '24px 32px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        background: 'linear-gradient(135deg, #3D2BB8 0%, #2D1E8A 100%)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24 }}>{tab === 'family' ? '🎙' : '⚡'}</span>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: '#ffffff', margin: 0 }}>
              {tab === 'family' ? 'Family Voice Alarms' : 'Fly-Alarms'}
            </h1>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: '2px 0 0' }}>
              {tab === 'family'
                ? 'Wake up to a voice recording from someone you love'
                : 'Overdue & firing within 24 hours · auto-refreshes every 30s'}
            </p>
          </div>

          {/* Tab switcher */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 24, padding: 4 }}>
            <button style={tabBtn(tab === 'alarms')} onClick={() => setTab('alarms')}>
              ⚡ Alarms
            </button>
            <button style={tabBtn(tab === 'family')} onClick={() => setTab('family')}>
              🎙 Family Voice
            </button>
          </div>

          {tab === 'alarms' && overdue.length > 0 && (
            <div style={{
              fontSize: 13, fontWeight: 700,
              padding: '4px 14px', borderRadius: 20,
              background: '#fee2e2', color: '#dc2626',
            }}>
              {overdue.length} overdue
            </div>
          )}
        </div>
      </div>

      {/* Alarms Tab Content */}
      {tab === 'alarms' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 32px' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--t4)', fontSize: 13 }}>Loading alarms…</div>
          ) : overdue.length === 0 && upcoming24h.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 80 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--t2)', marginBottom: 6 }}>All clear!</div>
              <div style={{ fontSize: 12, color: 'var(--t4)' }}>No overdue or upcoming alarms in the next 24 hours</div>
            </div>
          ) : (
            <>
              {overdue.length > 0 && (
                <div style={{ marginBottom: 28 }}>
                  <div style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                    color: '#dc2626', marginBottom: 10,
                  }}>
                    ⚡ Overdue — {overdue.length}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {overdue.map((item: any) => (
                      <ReminderCard key={item.id} item={item} onRemove={onRemove} />
                    ))}
                  </div>
                </div>
              )}
              {upcoming24h.length > 0 && (
                <div>
                  <div style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                    color: 'var(--amber)', marginBottom: 10,
                  }}>
                    ⏳ Firing within 24 hours — {upcoming24h.length}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {upcoming24h.map((item: any) => (
                      <ReminderCard key={item.id} item={item} onRemove={onRemove} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Family Voice Tab Content */}
      {tab === 'family' && <FamilyAlarmsTab />}
    </div>
  );
}
