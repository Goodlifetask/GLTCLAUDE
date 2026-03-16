'use client';
import { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { parseVoiceTranscript, type VoiceParsedReminder } from '../../../lib/voice-parser';
import { REMINDER_CATEGORIES } from '@glt/shared';
import toast from 'react-hot-toast';

const VOICE_TYPE_ICON: Record<string, string> = {
  task: '✓', call: '📞', email: '✉️', location: '📍', event: '📅',
};
const PRIORITY_COLOR: Record<string, { bg: string; color: string }> = {
  urgent: { bg: '#fee2e2', color: '#dc2626' },
  high:   { bg: '#fef3c7', color: '#d97706' },
  medium: { bg: 'var(--amber-glow)', color: 'var(--amber)' },
  low:    { bg: '#f0fdf4', color: '#16a34a' },
};

export function CreateReminderModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [selType, setSelType] = useState('task');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('09:00');
  const [recur, setRecur] = useState('');
  const [note, setNote] = useState('');
  const [priority, setPriority] = useState('medium');
  const [category, setCategory] = useState('');

  // Voice state
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'confirm'>('idle');
  const [transcript, setTranscript] = useState('');
  const [parsed, setParsed] = useState<VoiceParsedReminder | null>(null);
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef('');
  const isStoppingRef = useRef(false);

  const isVoiceSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  useEffect(() => {
    return () => {
      isStoppingRef.current = true;
      recognitionRef.current?.abort();
    };
  }, []);

  const startListening = async () => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
    } catch {
      toast.error('Microphone access denied — click the 🔒 icon in your address bar to allow it, then try again.');
      return;
    }

    finalTranscriptRef.current = '';
    isStoppingRef.current = false;
    setTranscript('');
    setVoiceState('listening');

    const rec = new SpeechRec();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onresult = (e: any) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalTranscriptRef.current += e.results[i][0].transcript + ' ';
        else interim += e.results[i][0].transcript;
      }
      setTranscript((finalTranscriptRef.current + interim).trim());
    };

    rec.onend = () => {
      const text = finalTranscriptRef.current.trim();
      if (text) {
        const result = parseVoiceTranscript(text);
        setParsed(result);
        setTranscript(text);
        setVoiceState('confirm');
      } else if (!isStoppingRef.current) {
        try { rec.start(); } catch (_) { setVoiceState('idle'); }
      } else {
        setVoiceState('idle');
      }
    };

    rec.onerror = (e: any) => {
      if (e.error === 'not-allowed') {
        toast.error('Microphone access denied — allow it in your browser settings and try again.');
        setVoiceState('idle');
      } else if (e.error === 'service-not-available') {
        toast.error('Speech service unavailable — use Chrome or Edge with an internet connection.');
        setVoiceState('idle');
      } else if (e.error === 'audio-capture') {
        toast.error('No microphone found — plug one in and try again.');
        setVoiceState('idle');
      } else if (e.error === 'network') {
        toast.error('Network error — check your connection and try again.');
        setVoiceState('idle');
      } else if (e.error !== 'no-speech') {
        toast.error('Voice recognition failed. Please try again.');
        setVoiceState('idle');
      }
    };

    recognitionRef.current = rec;
    rec.start();
  };

  const stopListening = () => {
    isStoppingRef.current = true;
    recognitionRef.current?.stop();
  };

  const applyParsed = () => {
    if (!parsed) return;
    setSelType(parsed.type);
    setTitle(parsed.title);
    setDate(parsed.date);
    setTime(parsed.time);
    setPriority(parsed.priority);
    setVoiceOpen(false);
    setVoiceState('idle');
    setParsed(null);
    setTranscript('');
  };

  const resetVoice = () => {
    recognitionRef.current?.abort();
    setParsed(null);
    setTranscript('');
    setVoiceState('idle');
  };

  const toggleVoice = () => {
    if (voiceOpen) {
      resetVoice();
      setVoiceOpen(false);
    } else {
      setVoiceOpen(true);
      setVoiceState('idle');
    }
  };

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
      if (category) payload['category'] = category;
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
    outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
        zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--card)', border: '1px solid var(--b1)',
          borderRadius: 'var(--r-xl)', width: '100%', maxWidth: 480,
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
          display: 'flex', flexDirection: 'column',
          maxHeight: 'calc(100vh - 32px)', overflow: 'hidden',
        }}
      >
        {/* Keyframe for listening pulse */}
        <style>{`
          @keyframes voicePulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.5); }
            50% { box-shadow: 0 0 0 10px rgba(239,68,68,0); }
          }
        `}</style>

        {/* Header */}
        <div style={{
          padding: '18px 22px', borderBottom: '1px solid var(--b1)', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--t1)' }}>
            New Reminder
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {isVoiceSupported && (
              <button
                onClick={toggleVoice}
                title="Voice input"
                style={{
                  width: 30, height: 30, borderRadius: 8,
                  border: `1px solid ${voiceOpen ? 'var(--amber)' : 'var(--b1)'}`,
                  background: voiceOpen ? 'var(--amber-glow)' : '#f8fafc',
                  cursor: 'pointer', fontSize: 15,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s',
                }}
              >🎤</button>
            )}
            <button
              onClick={onClose}
              style={{
                width: 30, height: 30, borderRadius: 8,
                border: '1px solid var(--b1)', background: '#f8fafc',
                cursor: 'pointer', fontSize: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--t3)',
              }}
            >✕</button>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ overflowY: 'auto', flex: 1 }}>

          {/* Voice Panel */}
          {voiceOpen && (
            <div style={{
              margin: '16px 22px 0',
              padding: 18, borderRadius: 'var(--r)',
              border: '1px solid var(--b1)', background: '#f8fafc',
            }}>

              {voiceState === 'idle' && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>🎙️</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)', marginBottom: 4 }}>
                    Speak your reminder
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 16, lineHeight: 1.6 }}>
                    Try: <em>&ldquo;Call mom tomorrow at 3pm&rdquo;</em><br />
                    or <em>&ldquo;Task buy groceries on Friday, urgent&rdquo;</em>
                  </div>
                  <button
                    onClick={startListening}
                    style={{
                      padding: '9px 22px', borderRadius: 20,
                      background: 'var(--amber)', color: '#fff',
                      border: 'none', cursor: 'pointer',
                      fontSize: 12, fontWeight: 700,
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      boxShadow: 'var(--sh-amber)',
                    }}
                  >🎤 Start Listening</button>
                </div>
              )}

              {voiceState === 'listening' && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: '50%',
                    background: '#fee2e2', border: '2px solid #ef4444',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 12px', fontSize: 24,
                    animation: 'voicePulse 1.2s ease-in-out infinite',
                  }}>🎙️</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#ef4444', marginBottom: 10 }}>
                    Listening...
                  </div>
                  {transcript && (
                    <div style={{
                      fontSize: 12, color: 'var(--t2)', fontStyle: 'italic',
                      background: '#fff', border: '1px solid var(--b1)',
                      borderRadius: 'var(--r-sm)', padding: '8px 12px',
                      marginBottom: 12, textAlign: 'left', lineHeight: 1.5,
                    }}>
                      &ldquo;{transcript}&rdquo;
                    </div>
                  )}
                  <button
                    onClick={stopListening}
                    style={{
                      padding: '7px 20px', borderRadius: 20,
                      background: '#fee2e2', color: '#ef4444',
                      border: '1px solid rgba(239,68,68,0.3)',
                      cursor: 'pointer', fontSize: 11, fontWeight: 600,
                    }}
                  >■ Stop</button>
                </div>
              )}

              {voiceState === 'confirm' && parsed && (
                <div>
                  <div style={{
                    fontSize: 10, fontWeight: 700, color: 'var(--t3)',
                    textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8,
                  }}>I understood:</div>

                  <div style={{
                    fontSize: 11, color: 'var(--t2)', fontStyle: 'italic',
                    background: '#fff', border: '1px solid var(--b1)',
                    borderRadius: 'var(--r-sm)', padding: '7px 10px', marginBottom: 12,
                    lineHeight: 1.5,
                  }}>
                    &ldquo;{transcript}&rdquo;
                  </div>

                  <div style={{
                    background: '#fff', border: '1px solid var(--b1)',
                    borderRadius: 'var(--r)', padding: '14px 16px', marginBottom: 14,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <span style={{ fontSize: 20 }}>{VOICE_TYPE_ICON[parsed.type]}</span>
                      <span style={{
                        fontSize: 12, fontWeight: 700, color: 'var(--t1)',
                        textTransform: 'capitalize',
                      }}>{parsed.type}</span>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                        background: PRIORITY_COLOR[parsed.priority]?.bg ?? 'var(--amber-glow)',
                        color: PRIORITY_COLOR[parsed.priority]?.color ?? 'var(--amber)',
                        textTransform: 'capitalize',
                      }}>{parsed.priority}</span>
                    </div>

                    <div style={{
                      fontSize: 14, fontWeight: 600, color: 'var(--t1)',
                      marginBottom: 8, lineHeight: 1.3,
                    }}>{parsed.title}</div>

                    <div style={{
                      fontSize: 11, color: 'var(--t3)',
                      display: 'flex', alignItems: 'center', gap: 5,
                    }}>
                      <span>📅</span>
                      <span>{parsed.date} at {parsed.time}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={resetVoice}
                      style={{
                        flex: 1, padding: '8px', borderRadius: 'var(--r-sm)',
                        border: '1px solid var(--b1)', background: '#f8fafc',
                        cursor: 'pointer', fontSize: 11, fontWeight: 600, color: 'var(--t2)',
                      }}
                    >Try Again</button>
                    <button
                      onClick={applyParsed}
                      style={{
                        flex: 2, padding: '8px', borderRadius: 'var(--r-sm)',
                        background: 'var(--amber)', color: '#fff',
                        border: 'none', cursor: 'pointer',
                        fontSize: 11, fontWeight: 700,
                        boxShadow: 'var(--sh-amber)',
                      }}
                    >✓ Fill Form</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Form */}
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
                    border: `1px solid ${selType === btn.type ? 'rgba(124,58,237,0.4)' : 'var(--b1)'}`,
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
                autoFocus={!voiceOpen}
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

            {/* Category */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--t2)', display: 'block', marginBottom: 8 }}>Category</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {REMINDER_CATEGORIES.map(cat => (
                  <button
                    key={cat.slug}
                    type="button"
                    onClick={() => setCategory(category === cat.slug ? '' : cat.slug)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '5px 11px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                      border: '1px solid ' + (category === cat.slug ? cat.color : 'var(--b1)'),
                      background: category === cat.slug ? cat.color + '22' : '#f8fafc',
                      color: category === cat.slug ? cat.color : 'var(--t3)',
                      cursor: 'pointer', transition: 'all 0.12s',
                    }}
                  >
                    {cat.icon} {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--t2)', display: 'block', marginBottom: 5 }}>
                Notes <span style={{ color: 'var(--t4)', fontWeight: 400 }}>(optional)</span>
              </label>
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
                  fontWeight: 600, color: 'var(--t2)',
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
    </div>
  );
}
