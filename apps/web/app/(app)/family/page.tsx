'use client';
import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/auth';
import { api } from '../../../lib/api';
import toast from 'react-hot-toast';

/* ── Special Days helpers ─────────────────────────────────────── */
interface SpecialDayItem { id: string; type: 'birthday' | 'anniversary' | 'custom'; label: string; date: string; }
type SpecialDaysMap = Record<string, SpecialDayItem[]>; // keyed by userId

function loadSpecialDays(familyId: string): SpecialDaysMap {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(`family_special_days_${familyId}`) || '{}'); } catch { return {}; }
}
function saveSpecialDays(familyId: string, map: SpecialDaysMap) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`family_special_days_${familyId}`, JSON.stringify(map));
}
function nextOccurrence(mmdd: string): Date {
  const [month, day] = mmdd.split('-').map(Number);
  const now = new Date();
  const next = new Date(now.getFullYear(), month - 1, day);
  if (next < now) next.setFullYear(now.getFullYear() + 1);
  return next;
}
function daysUntil(mmdd: string): number {
  const diff = nextOccurrence(mmdd).getTime() - new Date().getTime();
  return Math.ceil(diff / 86400000);
}

/* ── Member avatar colours ────────────────────────────────────── */
const AVATAR_COLORS = ['#6C4EFF','#8b5cf6','#10b981','#f59e0b','#ef4444','#3b82f6','#ec4899','#14b8a6'];
function memberColor(idx: number) { return AVATAR_COLORS[idx % AVATAR_COLORS.length]; }

export default function FamilyPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const [mode, setMode] = useState<'idle' | 'create' | 'join'>('idle');
  const [familyName, setFamilyName] = useState('');
  const [joinToken, setJoinToken] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'adult' | 'child'>('adult');
  const [inviteToken, setInviteToken] = useState('');

  /* ── Tab ──────────────────────────────────────────────────────── */
  const [activeTab, setActiveTab] = useState<'reminders' | 'special-days'>('reminders');

  /* ── Special Days state ───────────────────────────────────────── */
  const [specialDays, setSpecialDays] = useState<SpecialDaysMap>({});
  const [showAddDay, setShowAddDay] = useState(false);
  const [addDayMemberId, setAddDayMemberId] = useState('');
  const [addDayType, setAddDayType] = useState<'birthday' | 'anniversary' | 'custom'>('birthday');
  const [addDayLabel, setAddDayLabel] = useState('');
  const [addDayDate, setAddDayDate] = useState('');

  /* ── Avatar upload ────────────────────────────────────────────── */
  const [avatarUploading, setAvatarUploading] = useState(false);

  const handleAvatarUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      await api.family.uploadAvatar(file);
      qc.invalidateQueries({ queryKey: ['family'] });
      toast.success('Family photo updated!');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Upload failed');
    } finally {
      setAvatarUploading(false);
      e.target.value = '';
    }
  }, [qc]);

  /* ── New reminder form state ─────────────────────────────────── */
  const [showNewReminder, setShowNewReminder] = useState(false);
  const [reminderTitle,   setReminderTitle]   = useState('');
  const [reminderDate,    setReminderDate]     = useState('');
  const [reminderAssignee, setReminderAssignee] = useState('');
  const [reminderPriority, setReminderPriority] = useState<'medium' | 'high' | 'urgent'>('medium');
  const [copied, setCopied] = useState(false);

  const { data: familyData, isLoading } = useQuery({
    queryKey: ['family'],
    queryFn: () => api.family.get(),
    retry: false,
  });

  const { data: remindersData } = useQuery({
    queryKey: ['family-reminders'],
    queryFn: () => api.family.reminders({ limit: 20 }),
    enabled: !!familyData?.data,
  });

  const createMutation = useMutation({
    mutationFn: () => api.family.create({ name: familyName.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['family'] });
      toast.success('Family created!');
      setMode('idle');
      setFamilyName('');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to create family'),
  });

  const joinMutation = useMutation({
    mutationFn: () => api.family.acceptInvite(joinToken.trim()),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['family'] });
      toast.success(`Joined ${res?.data?.familyName ?? 'family'}! 🎉`);
      setMode('idle');
      setJoinToken('');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Invalid or expired invite token'),
  });

  const inviteMutation = useMutation({
    mutationFn: () => api.family.invite({ email: inviteEmail.trim(), role: inviteRole }),
    onSuccess: (res: any) => {
      const token = res?.data?.inviteToken;
      if (token) setInviteToken(token);
      toast.success('Invite sent!');
      setInviteEmail('');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to send invite'),
  });

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) => api.family.removeMember(memberId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['family'] });
      toast.success('Member removed');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to remove member'),
  });

  const createReminderMutation = useMutation({
    mutationFn: () => api.family.createReminder({
      title:       reminderTitle.trim(),
      fireAt:      reminderDate || undefined,
      assigneeId:  reminderAssignee || undefined,
      priority:    reminderPriority,
      shareScope:  'family',
      type:        'task',
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['family-reminders'] });
      toast.success('Reminder created!');
      setShowNewReminder(false);
      setReminderTitle(''); setReminderDate(''); setReminderAssignee(''); setReminderPriority('medium');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to create reminder'),
  });

  const family = familyData?.data;
  const reminders = remindersData?.data ?? [];

  // Load special days from localStorage when family is known
  useEffect(() => {
    if (family?.id) setSpecialDays(loadSpecialDays(family.id));
  }, [family?.id]);

  const saveDay = useCallback(() => {
    if (!family?.id || !addDayMemberId || !addDayDate) return;
    const label = addDayLabel.trim() ||
      (addDayType === 'birthday' ? 'Birthday' : addDayType === 'anniversary' ? 'Anniversary' : 'Special Day');
    const item: SpecialDayItem = {
      id: Date.now().toString(),
      type: addDayType,
      label,
      date: addDayDate, // stored as MM-DD
    };
    const updated = { ...specialDays, [addDayMemberId]: [...(specialDays[addDayMemberId] ?? []), item] };
    setSpecialDays(updated);
    saveSpecialDays(family.id, updated);
    setShowAddDay(false);
    setAddDayLabel(''); setAddDayDate(''); setAddDayType('birthday');
    toast.success('Special day added!');
  }, [family?.id, addDayMemberId, addDayDate, addDayLabel, addDayType, specialDays]);

  const removeDay = useCallback((memberId: string, itemId: string) => {
    if (!family?.id) return;
    const updated = { ...specialDays, [memberId]: (specialDays[memberId] ?? []).filter(d => d.id !== itemId) };
    setSpecialDays(updated);
    saveSpecialDays(family.id, updated);
  }, [family?.id, specialDays]);

  const cardStyle: React.CSSProperties = {
    background: 'var(--card)', border: '1px solid var(--b1)',
    borderRadius: 'var(--r-xl)', padding: '22px 24px', marginBottom: 18
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, color: 'var(--t2)',
    textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14, display: 'block'
  };

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg)', border: '1px solid var(--b1)',
    borderRadius: 'var(--r-sm)', padding: '9px 12px',
    fontSize: 13, color: 'var(--t1)', fontFamily: 'var(--font-body)',
    outline: 'none', width: '100%', boxSizing: 'border-box'
  };

  const btnPrimary: React.CSSProperties = {
    padding: '9px 20px', background: 'var(--amber)', color: '#fff',
    border: 'none', borderRadius: 'var(--r-sm)',
    cursor: 'pointer', fontFamily: 'var(--font-body)',
    fontSize: 13, fontWeight: 700, boxShadow: 'var(--sh-amber)'
  };

  const btnSecondary: React.CSSProperties = {
    padding: '9px 16px', background: 'var(--bg)',
    border: '1px solid var(--b1)', borderRadius: 'var(--r-sm)',
    cursor: 'pointer', fontFamily: 'var(--font-body)',
    fontSize: 12, fontWeight: 600, color: 'var(--t2)'
  };

  const btnOutline: React.CSSProperties = {
    padding: '9px 20px', background: 'transparent',
    border: '1.5px solid var(--amber)', borderRadius: 'var(--r-sm)',
    cursor: 'pointer', fontFamily: 'var(--font-body)',
    fontSize: 13, fontWeight: 700, color: 'var(--amber)'
  };

  return (
    <>
      {/* Topbar */}
      <div style={{
        background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--b1)', padding: '0 26px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 40
      }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 500, color: 'var(--t1)' }}>
            👨‍👩‍👧‍👦 Family
          </div>
          <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 1 }}>
            Shared tasks and reminders for your family
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {family && (
            <>
              {/* Tab switcher */}
              <div style={{ display: 'flex', gap: 4, background: 'var(--bg)', borderRadius: 8, padding: 3, border: '1px solid var(--b1)' }}>
                {([['reminders', '📋 Reminders'], ['special-days', '🎂 Special Days']] as const).map(([t, label]) => (
                  <button key={t} onClick={() => setActiveTab(t)} style={{
                    padding: '5px 14px', borderRadius: 6, cursor: 'pointer', border: 'none',
                    fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
                    background: activeTab === t ? 'var(--amber)' : 'transparent',
                    color: activeTab === t ? '#fff' : 'var(--t2)',
                    transition: 'all 0.15s',
                  }}>{label}</button>
                ))}
              </div>
              <button onClick={() => setShowInvite(true)} style={btnPrimary}>+ Invite Member</button>
            </>
          )}
        </div>
      </div>

      <div style={{ padding: '24px 26px', flex: 1, position: 'relative' }}>
        {/* Full-page watermark — family photo behind all content */}
        {family?.avatarUrl && (
          <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 0,
            pointerEvents: 'none',
            backgroundImage: `url(http://localhost:3001${family.avatarUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            opacity: 0.08,
          }} />
        )}
        <div style={{ position: 'relative', zIndex: 1 }}>
        {isLoading ? (
          <div style={{ color: 'var(--t3)', fontSize: 13 }}>Loading…</div>
        ) : !family ? (
          /* ── No family yet: Choose to Create or Join ── */
          <div style={{ maxWidth: 540, margin: '48px auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 36 }}>
              <div style={{ fontSize: 60, marginBottom: 16 }}>👨‍👩‍👧‍👦</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--t1)', marginBottom: 10 }}>
                Get Started with Family
              </div>
              <div style={{ fontSize: 13, color: 'var(--t3)', lineHeight: 1.7 }}>
                Create a new family group or join one using an invite token sent by a family member.
              </div>
            </div>

            {/* Two action cards */}
            {mode === 'idle' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                {/* Create */}
                <div
                  onClick={() => setMode('create')}
                  style={{
                    padding: '24px 20px', borderRadius: 16, cursor: 'pointer', textAlign: 'center',
                    background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.04))',
                    border: '1.5px solid rgba(245,158,11,0.35)',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(245,158,11,0.7)'}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(245,158,11,0.35)'}
                >
                  <div style={{ fontSize: 36, marginBottom: 10 }}>🏡</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--amber)', marginBottom: 6 }}>Create Family</div>
                  <div style={{ fontSize: 11, color: 'var(--t3)', lineHeight: 1.5 }}>
                    Start a new family group and invite members
                  </div>
                </div>

                {/* Join */}
                <div
                  onClick={() => setMode('join')}
                  style={{
                    padding: '24px 20px', borderRadius: 16, cursor: 'pointer', textAlign: 'center',
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(99,102,241,0.04))',
                    border: '1.5px solid rgba(99,102,241,0.35)',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(99,102,241,0.7)'}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(99,102,241,0.35)'}
                >
                  <div style={{ fontSize: 36, marginBottom: 10 }}>🔗</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#818cf8', marginBottom: 6 }}>Join a Family</div>
                  <div style={{ fontSize: 11, color: 'var(--t3)', lineHeight: 1.5 }}>
                    Use an invite token from your family member
                  </div>
                </div>
              </div>
            )}

            {/* Create form */}
            {mode === 'create' && (
              <div style={{ ...cardStyle, marginBottom: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)', marginBottom: 4 }}>🏡 Create Your Family</div>
                <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 16 }}>Give your family a name — you can invite members after.</div>
                <input
                  value={familyName}
                  onChange={e => setFamilyName(e.target.value)}
                  placeholder="e.g. The Johnson Family"
                  style={{ ...inputStyle, marginBottom: 14 }}
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter' && familyName.trim()) createMutation.mutate(); }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => createMutation.mutate()}
                    disabled={!familyName.trim() || createMutation.isPending}
                    style={{ ...btnPrimary, opacity: !familyName.trim() ? 0.6 : 1 }}
                  >{createMutation.isPending ? 'Creating…' : 'Create Family'}</button>
                  <button onClick={() => setMode('idle')} style={btnSecondary}>Back</button>
                </div>
              </div>
            )}

            {/* Join form */}
            {mode === 'join' && (
              <div style={{ ...cardStyle, marginBottom: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)', marginBottom: 4 }}>🔗 Join a Family</div>
                <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 16 }}>
                  Paste the invite token shared by your family member. Tokens are valid for 7 days.
                </div>
                <input
                  value={joinToken}
                  onChange={e => setJoinToken(e.target.value)}
                  placeholder="Paste invite token here…"
                  style={{ ...inputStyle, marginBottom: 14, fontFamily: 'monospace', fontSize: 12 }}
                  autoFocus
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => joinMutation.mutate()}
                    disabled={!joinToken.trim() || joinMutation.isPending}
                    style={{ ...btnOutline, opacity: !joinToken.trim() ? 0.6 : 1 }}
                  >{joinMutation.isPending ? 'Joining…' : 'Join Family'}</button>
                  <button onClick={() => setMode('idle')} style={btnSecondary}>Back</button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ maxWidth: 720 }}>
            {/* Family header */}
            <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
              {/* Header bar with family name + upload button */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 20px',
                background: 'linear-gradient(135deg, rgba(61,43,184,0.08) 0%, rgba(108,78,255,0.06) 100%)',
                borderBottom: '1px solid var(--b1)',
              }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--t1)' }}>
                    {family.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 2 }}>
                    {family.members?.length ?? 0} member{(family.members?.length ?? 0) !== 1 ? 's' : ''}
                  </div>
                </div>
                {/* Upload button — owner only */}
                {family.ownerId === user?.id && (
                  <label style={{
                    cursor: 'pointer',
                    background: 'var(--amber)', borderRadius: 10,
                    padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 6,
                    fontSize: 12, fontWeight: 600, color: '#fff', flexShrink: 0,
                    boxShadow: 'var(--sh-amber)',
                  }}>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      style={{ display: 'none' }}
                      onChange={handleAvatarUpload}
                      disabled={avatarUploading}
                    />
                    {avatarUploading ? '⏳ Uploading…' : '📷 Change Photo'}
                  </label>
                )}
              </div>
              {/* Rest of card content */}
              <div style={{ padding: '18px 22px 20px' }}>

              {/* Members */}
              <span style={labelStyle}>Members</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(family.members ?? []).map((m: any) => (
                  <div key={m.userId} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px', background: 'var(--bg)',
                    borderRadius: 'var(--r-sm)', border: '1px solid var(--b1)'
                  }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: 9,
                      background: 'linear-gradient(135deg, var(--amber-dim), var(--amber))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0
                    }}>
                      {m.user?.name?.slice(0, 1).toUpperCase() || '?'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>{m.user?.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--t3)' }}>{m.user?.email}</div>
                    </div>
                    <div style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px',
                      borderRadius: 4, background: 'var(--amber-glow)', color: 'var(--amber)'
                    }}>{m.role}</div>
                    {family.ownerId === user?.id && m.userId !== user?.id && (
                      <button
                        onClick={() => removeMemberMutation.mutate(m.userId)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'var(--t4)', fontSize: 16, padding: '0 4px',
                          lineHeight: 1
                        }}
                        title="Remove member"
                      >✕</button>
                    )}
                  </div>
                ))}
              </div>
              </div>{/* /padding div */}
            </div>{/* /card */}

            {/* Invite modal inline */}
            {showInvite && (
              <div style={cardStyle}>
                <span style={labelStyle}>Invite a Family Member</span>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--t2)', display: 'block', marginBottom: 6 }}>Email Address</label>
                  <input
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="member@example.com"
                    type="email"
                    style={inputStyle}
                    autoFocus
                  />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--t2)', display: 'block', marginBottom: 8 }}>Role</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(['adult', 'child'] as const).map(r => (
                      <div
                        key={r}
                        onClick={() => setInviteRole(r)}
                        style={{
                          flex: 1, padding: '9px 14px', textAlign: 'center',
                          border: `1px solid ${inviteRole === r ? 'rgba(124,58,237,0.5)' : 'var(--b1)'}`,
                          borderRadius: 'var(--r-sm)', cursor: 'pointer',
                          fontSize: 13, fontWeight: 600,
                          color: inviteRole === r ? 'var(--amber)' : 'var(--t2)',
                          background: inviteRole === r ? 'var(--amber-glow)' : 'var(--bg)',
                        }}
                      >{r === 'adult' ? '🧑 Adult' : '🧒 Child'}</div>
                    ))}
                  </div>
                </div>
                {inviteToken && (
                  <div style={{
                    background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)',
                    borderRadius: 'var(--r-sm)', padding: '12px 14px', marginBottom: 14,
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#10b981', marginBottom: 8 }}>
                      ✓ Invite token generated — share this with your family member:
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                      <div style={{
                        flex: 1, fontFamily: 'monospace', wordBreak: 'break-all', fontSize: 11,
                        background: 'rgba(0,0,0,0.08)', borderRadius: 6, padding: '8px 10px',
                        color: 'var(--t1)', border: '1px solid var(--b1)', userSelect: 'all',
                      }}>{inviteToken}</div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(inviteToken);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        style={{
                          padding: '8px 14px', borderRadius: 'var(--r-sm)', cursor: 'pointer',
                          fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 700, flexShrink: 0,
                          background: copied ? 'rgba(16,185,129,0.15)' : 'var(--amber-glow)',
                          border: `1px solid ${copied ? 'rgba(16,185,129,0.4)' : 'var(--amber)'}`,
                          color: copied ? '#10b981' : 'var(--amber)',
                          transition: 'all 0.2s',
                        }}
                      >{copied ? '✓ Copied!' : '📋 Copy'}</button>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--t3)' }}>
                      They enter this token on the Family page → "Join a Family". Valid for 7 days.
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => inviteMutation.mutate()}
                    disabled={!inviteEmail.trim() || inviteMutation.isPending}
                    style={{ ...btnPrimary, opacity: !inviteEmail.trim() ? 0.6 : 1 }}
                  >{inviteMutation.isPending ? 'Sending…' : 'Send Invite'}</button>
                  <button onClick={() => { setShowInvite(false); setInviteToken(''); }} style={btnSecondary}>Close</button>
                </div>
              </div>
            )}

            {/* ── Special Days Tab ──────────────────────────────── */}
            {activeTab === 'special-days' && (() => {
              const members: any[] = family?.members ?? [];
              const owners  = members.filter((m: any) => m.role === 'owner');
              const adults  = members.filter((m: any) => m.role === 'adult');
              const children = members.filter((m: any) => m.role === 'child');

              // All upcoming special days sorted by days until
              const allUpcoming: { memberId: string; memberName: string; item: SpecialDayItem; days: number }[] = [];
              members.forEach((m: any, idx: number) => {
                (specialDays[m.userId] ?? []).forEach(item => {
                  allUpcoming.push({ memberId: m.userId, memberName: m.user?.name ?? '', item, days: daysUntil(item.date) });
                });
              });
              allUpcoming.sort((a, b) => a.days - b.days);

              const typeEmoji = (t: string) => t === 'birthday' ? '🎂' : t === 'anniversary' ? '💍' : '⭐';
              const typeColor = (t: string) => t === 'birthday' ? '#f59e0b' : t === 'anniversary' ? '#ec4899' : '#8b5cf6';

              const MemberNode = ({ m, idx }: { m: any; idx: number }) => {
                const days = specialDays[m.userId] ?? [];
                const next = [...days].sort((a, b) => daysUntil(a.date) - daysUntil(b.date))[0];
                const color = memberColor(members.findIndex((x: any) => x.userId === m.userId));
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 100 }}>
                    {/* Avatar */}
                    <div style={{ position: 'relative' }}>
                      <div style={{
                        width: 56, height: 56, borderRadius: '50%',
                        background: `linear-gradient(135deg, ${color}cc, ${color})`,
                        border: `3px solid ${color}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 20, fontWeight: 700, color: '#fff',
                        boxShadow: `0 4px 14px ${color}40`,
                        fontFamily: 'var(--font-display)',
                      }}>
                        {m.user?.name?.slice(0, 1).toUpperCase() || '?'}
                      </div>
                      {next && daysUntil(next.date) <= 30 && (
                        <div style={{
                          position: 'absolute', top: -4, right: -4,
                          background: typeColor(next.type), color: '#fff',
                          borderRadius: '50%', width: 20, height: 20,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, border: '2px solid #fff',
                        }}>
                          {daysUntil(next.date) === 0 ? '🎉' : typeEmoji(next.type)}
                        </div>
                      )}
                    </div>
                    {/* Name + role */}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t1)' }}>{m.user?.name}</div>
                      <div style={{ fontSize: 10, color: color, fontWeight: 600, textTransform: 'capitalize' }}>{m.role}</div>
                    </div>
                    {/* Special days for this member */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%', alignItems: 'center' }}>
                      {days.map(d => (
                        <div key={d.id} style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          background: `${typeColor(d.type)}14`,
                          border: `1px solid ${typeColor(d.type)}40`,
                          borderRadius: 20, padding: '2px 8px', fontSize: 10, whiteSpace: 'nowrap',
                        }}>
                          <span>{typeEmoji(d.type)}</span>
                          <span style={{ fontWeight: 600, color: typeColor(d.type) }}>{d.label}</span>
                          <span style={{ color: 'var(--t3)' }}>{d.date.replace('-', '/')}</span>
                          <button onClick={() => removeDay(m.userId, d.id)} style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'var(--t4)', fontSize: 10, padding: 0, lineHeight: 1,
                          }}>✕</button>
                        </div>
                      ))}
                      <button
                        onClick={() => { setAddDayMemberId(m.userId); setShowAddDay(true); }}
                        style={{
                          background: 'none', border: `1px dashed var(--b1)`, cursor: 'pointer',
                          borderRadius: 20, padding: '2px 10px', fontSize: 10,
                          color: 'var(--t3)', fontFamily: 'var(--font-body)',
                        }}
                      >+ Add date</button>
                    </div>
                  </div>
                );
              };

              const Connector = () => (
                <div style={{ width: 2, height: 28, background: 'var(--b1)', margin: '0 auto', borderRadius: 2 }} />
              );
              const HLine = ({ count }: { count: number }) => count <= 1 ? null : (
                <div style={{ height: 2, background: 'var(--b1)', borderRadius: 2, margin: '0 28px' }} />
              );

              return (
                <>
                  {/* Family tree */}
                  <div style={{ ...cardStyle, overflow: 'hidden' }}>
                    <span style={labelStyle}>Family Tree</span>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, padding: '10px 0' }}>
                      {/* Owners row */}
                      {owners.length > 0 && (
                        <div style={{ display: 'flex', gap: 32, justifyContent: 'center' }}>
                          {owners.map((m: any, i: number) => <MemberNode key={m.userId} m={m} idx={i} />)}
                        </div>
                      )}

                      {/* Connector + adults */}
                      {adults.length > 0 && (
                        <>
                          <Connector />
                          <HLine count={adults.length} />
                          <div style={{ display: 'flex', gap: 32, justifyContent: 'center' }}>
                            {adults.map((m: any, i: number) => <MemberNode key={m.userId} m={m} idx={owners.length + i} />)}
                          </div>
                        </>
                      )}

                      {/* Connector + children */}
                      {children.length > 0 && (
                        <>
                          <Connector />
                          <HLine count={children.length} />
                          <div style={{ display: 'flex', gap: 32, justifyContent: 'center' }}>
                            {children.map((m: any, i: number) => <MemberNode key={m.userId} m={m} idx={owners.length + adults.length + i} />)}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Upcoming special days */}
                  <div style={cardStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                      <span style={labelStyle}>Upcoming Special Days</span>
                    </div>
                    {allUpcoming.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--t4)', fontSize: 13 }}>
                        No special days yet. Click "+ Add date" on a family member above.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {allUpcoming.map(({ memberId, memberName, item, days }) => (
                          <div key={item.id} style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '11px 14px', background: 'var(--bg)',
                            borderRadius: 'var(--r-sm)', border: `1px solid ${typeColor(item.type)}30`,
                          }}>
                            <div style={{
                              width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                              background: `${typeColor(item.type)}14`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 20,
                            }}>{typeEmoji(item.type)}</div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>
                                {memberName}'s {item.label}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>
                                {item.date.replace('-', ' / ')} · every year
                              </div>
                            </div>
                            <div style={{
                              textAlign: 'center', minWidth: 54,
                              padding: '5px 10px', borderRadius: 8,
                              background: days === 0 ? '#fef3c7' : days <= 7 ? `${typeColor(item.type)}14` : 'var(--bg)',
                              border: `1px solid ${days <= 7 ? typeColor(item.type) + '40' : 'var(--b1)'}`,
                            }}>
                              <div style={{ fontSize: 16, fontWeight: 800, color: days === 0 ? '#d97706' : typeColor(item.type), lineHeight: 1 }}>
                                {days === 0 ? '🎉' : days}
                              </div>
                              <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--t3)', marginTop: 2 }}>
                                {days === 0 ? 'Today!' : days === 1 ? 'tomorrow' : 'days'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add Special Day modal */}
                  {showAddDay && (
                    <div style={{
                      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                    }} onClick={() => setShowAddDay(false)}>
                      <div style={{
                        background: 'var(--card)', borderRadius: 16, padding: 26, width: 360,
                        boxShadow: 'var(--sh-xl)', border: '1px solid var(--b1)',
                      }} onClick={e => e.stopPropagation()}>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--t1)', marginBottom: 18 }}>
                          Add Special Day
                        </div>
                        {/* Member name */}
                        <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 14 }}>
                          For: <strong>{family?.members?.find((m: any) => m.userId === addDayMemberId)?.user?.name}</strong>
                        </div>
                        {/* Type */}
                        <div style={{ marginBottom: 14 }}>
                          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--t2)', display: 'block', marginBottom: 6 }}>Type</label>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {([['birthday','🎂 Birthday'],['anniversary','💍 Anniversary'],['custom','⭐ Custom']] as const).map(([t, label]) => (
                              <button key={t} onClick={() => setAddDayType(t)} style={{
                                flex: 1, padding: '7px 4px', borderRadius: 8, cursor: 'pointer',
                                fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600,
                                border: `1px solid ${addDayType === t ? typeColor(t) : 'var(--b1)'}`,
                                background: addDayType === t ? `${typeColor(t)}14` : 'transparent',
                                color: addDayType === t ? typeColor(t) : 'var(--t2)',
                              }}>{label}</button>
                            ))}
                          </div>
                        </div>
                        {/* Custom label */}
                        {addDayType === 'custom' && (
                          <div style={{ marginBottom: 14 }}>
                            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--t2)', display: 'block', marginBottom: 6 }}>Label</label>
                            <input value={addDayLabel} onChange={e => setAddDayLabel(e.target.value)}
                              placeholder="e.g. Graduation Day"
                              style={inputStyle} />
                          </div>
                        )}
                        {/* Date (MM-DD only — annual) */}
                        <div style={{ marginBottom: 20 }}>
                          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--t2)', display: 'block', marginBottom: 6 }}>
                            Date (Month-Day, repeats every year)
                          </label>
                          <input
                            type="text"
                            value={addDayDate}
                            onChange={e => setAddDayDate(e.target.value)}
                            placeholder="MM-DD  e.g. 05-15"
                            maxLength={5}
                            style={inputStyle}
                          />
                          <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 4 }}>Format: MM-DD (e.g. 05-15 for May 15)</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={saveDay}
                            disabled={!addDayDate.match(/^\d{2}-\d{2}$/)}
                            style={{ ...btnPrimary, flex: 1, opacity: !addDayDate.match(/^\d{2}-\d{2}$/) ? 0.5 : 1 }}
                          >Save</button>
                          <button onClick={() => setShowAddDay(false)} style={{ ...btnSecondary, flex: 1 }}>Cancel</button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}

            {/* Shared Reminders */}
            {activeTab === 'reminders' && <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <span style={labelStyle}>Shared Reminders</span>
                <button
                  onClick={() => setShowNewReminder(v => !v)}
                  style={{ ...btnSecondary, fontSize: 11, padding: '6px 12px' }}
                >+ Add Reminder</button>
              </div>

              {/* Inline create form */}
              {showNewReminder && (
                <div style={{
                  background: 'var(--bg)', border: '1px solid var(--b1)',
                  borderRadius: 'var(--r-sm)', padding: '16px', marginBottom: 16,
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t1)', marginBottom: 12 }}>
                    New Family Reminder
                  </div>

                  {/* Title */}
                  <input
                    value={reminderTitle}
                    onChange={e => setReminderTitle(e.target.value)}
                    placeholder="What needs to be done?"
                    style={{ ...inputStyle, marginBottom: 10 }}
                    autoFocus
                  />

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                    {/* Date/time */}
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--t3)', display: 'block', marginBottom: 4 }}>Date & Time</label>
                      <input
                        type="datetime-local"
                        value={reminderDate}
                        onChange={e => setReminderDate(e.target.value)}
                        style={{ ...inputStyle, colorScheme: 'light' }}
                      />
                    </div>

                    {/* Assign to */}
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--t3)', display: 'block', marginBottom: 4 }}>Assign to</label>
                      <select
                        value={reminderAssignee}
                        onChange={e => setReminderAssignee(e.target.value)}
                        style={{ ...inputStyle, cursor: 'pointer' }}
                      >
                        <option value="">— Unassigned —</option>
                        {(family?.members ?? []).map((m: any) => (
                          <option key={m.userId} value={m.userId}>
                            {m.user?.name}{m.userId === user?.id ? ' (me)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Priority */}
                  <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                    {(['medium', 'high', 'urgent'] as const).map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setReminderPriority(p)}
                        style={{
                          padding: '5px 12px', borderRadius: 20, cursor: 'pointer',
                          fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600,
                          border: `1px solid ${reminderPriority === p
                            ? p === 'urgent' ? 'var(--coral)' : p === 'high' ? '#f59e0b' : 'var(--amber)'
                            : 'var(--b1)'}`,
                          background: reminderPriority === p
                            ? p === 'urgent' ? 'var(--coral-bg)' : p === 'high' ? 'rgba(245,158,11,0.1)' : 'var(--amber-glow)'
                            : 'transparent',
                          color: reminderPriority === p
                            ? p === 'urgent' ? 'var(--coral)' : p === 'high' ? '#d97706' : 'var(--amber)'
                            : 'var(--t3)',
                        }}
                      >{p === 'medium' ? '● Normal' : p === 'high' ? '▲ High' : '🔴 Urgent'}</button>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => createReminderMutation.mutate()}
                      disabled={!reminderTitle.trim() || createReminderMutation.isPending}
                      style={{ ...btnPrimary, opacity: !reminderTitle.trim() ? 0.6 : 1 }}
                    >{createReminderMutation.isPending ? 'Saving…' : 'Create Reminder'}</button>
                    <button onClick={() => setShowNewReminder(false)} style={btnSecondary}>Cancel</button>
                  </div>
                </div>
              )}

              {reminders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--t4)', fontSize: 13 }}>
                  No shared reminders yet. Click "+ Add Reminder" to create one.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {reminders.map((r: any) => (
                    <div key={r.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 14px', background: 'var(--bg)',
                      borderRadius: 'var(--r-sm)', border: '1px solid var(--b1)'
                    }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                        background: r.priority === 'urgent' ? 'var(--coral)' : r.priority === 'high' ? '#f59e0b' : 'var(--amber)'
                      }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: r.status === 'completed' ? 'var(--t4)' : 'var(--t1)', textDecoration: r.status === 'completed' ? 'line-through' : 'none' }}>
                          {r.title}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>
                          {r.user?.name && <span style={{ marginRight: 8 }}>by {r.user.name}</span>}
                          {r.fireAt && <span>{new Date(r.fireAt).toLocaleDateString()}</span>}
                        </div>
                      </div>
                      {r.assignee && (
                        <div style={{
                          fontSize: 11, padding: '3px 10px', borderRadius: 20,
                          background: 'var(--amber-glow)', color: 'var(--amber)', fontWeight: 600,
                        }}>→ {r.assignee.name}</div>
                      )}
                      <div style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                        background: r.status === 'completed' ? 'rgba(16,185,129,0.1)' : 'var(--amber-glow)',
                        color: r.status === 'completed' ? '#10b981' : 'var(--amber)'
                      }}>{r.status}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>}
          </div>
        )}
        </div>{/* end zIndex:1 wrapper */}
      </div>
    </>
  );
}
