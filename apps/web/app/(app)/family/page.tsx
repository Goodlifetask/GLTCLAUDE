'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/auth';
import { api } from '../../../lib/api';
import toast from 'react-hot-toast';

export default function FamilyPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const qc = useQueryClient();

  const [showCreate, setShowCreate] = useState(false);
  const [familyName, setFamilyName] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'adult' | 'child'>('adult');
  const [inviteToken, setInviteToken] = useState('');

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
      setShowCreate(false);
      setFamilyName('');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to create family'),
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

  const family = familyData?.data;
  const reminders = remindersData?.data ?? [];

  const cardStyle: React.CSSProperties = {
    background: 'var(--card)', border: '1px solid var(--b1)',
    borderRadius: 'var(--r-xl)', padding: '22px 24px', marginBottom: 18
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 600, color: 'var(--t4)',
    textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14, display: 'block'
  };

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg-raised)', border: '1px solid var(--b1)',
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
    padding: '9px 16px', background: 'var(--bg-raised)',
    border: '1px solid var(--b1)', borderRadius: 'var(--r-sm)',
    cursor: 'pointer', fontFamily: 'var(--font-body)',
    fontSize: 12, fontWeight: 600, color: 'var(--t2)'
  };

  return (
    <>
      {/* Topbar */}
      <div style={{
        background: 'rgba(20,18,16,0.85)', backdropFilter: 'blur(12px)',
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
        {family && (
          <button onClick={() => setShowInvite(true)} style={btnPrimary}>
            + Invite Member
          </button>
        )}
      </div>

      <div style={{ padding: '24px 26px', flex: 1 }}>
        {isLoading ? (
          <div style={{ color: 'var(--t3)', fontSize: 13 }}>Loading…</div>
        ) : !family ? (
          /* No family yet */
          <div style={{ maxWidth: 500, margin: '60px auto', textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 20 }}>👨‍👩‍👧‍👦</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: 'var(--t1)', marginBottom: 10 }}>
              Create Your Family
            </div>
            <div style={{ fontSize: 13, color: 'var(--t3)', lineHeight: 1.6, marginBottom: 28 }}>
              Bring your family together. Share tasks, reminders, and stay coordinated with everyone you care about.
            </div>
            {!showCreate ? (
              <button onClick={() => setShowCreate(true)} style={btnPrimary}>
                Create Family
              </button>
            ) : (
              <div style={{ ...cardStyle, textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)', marginBottom: 12 }}>Name your family</div>
                <input
                  value={familyName}
                  onChange={e => setFamilyName(e.target.value)}
                  placeholder="e.g. The Johnson Family"
                  style={{ ...inputStyle, marginBottom: 12 }}
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter' && familyName.trim()) createMutation.mutate(); }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => createMutation.mutate()}
                    disabled={!familyName.trim() || createMutation.isPending}
                    style={{ ...btnPrimary, opacity: !familyName.trim() ? 0.6 : 1 }}
                  >{createMutation.isPending ? 'Creating…' : 'Create Family'}</button>
                  <button onClick={() => setShowCreate(false)} style={btnSecondary}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ maxWidth: 720 }}>
            {/* Family header */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: 'linear-gradient(135deg, var(--amber-dim), var(--amber))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24, boxShadow: 'var(--sh-amber)'
                }}>👨‍👩‍👧‍👦</div>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'var(--t1)' }}>
                    {family.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 2 }}>
                    {family.members?.length ?? 0} member{(family.members?.length ?? 0) !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>

              {/* Members */}
              <span style={labelStyle}>Members</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(family.members ?? []).map((m: any) => (
                  <div key={m.userId} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px', background: 'var(--bg-raised)',
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
            </div>

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
                          border: `1px solid ${inviteRole === r ? 'rgba(232,169,74,0.5)' : 'var(--b1)'}`,
                          borderRadius: 'var(--r-sm)', cursor: 'pointer',
                          fontSize: 13, fontWeight: 600,
                          color: inviteRole === r ? 'var(--amber)' : 'var(--t2)',
                          background: inviteRole === r ? 'var(--amber-glow)' : 'var(--bg-raised)',
                        }}
                      >{r === 'adult' ? '🧑 Adult' : '🧒 Child'}</div>
                    ))}
                  </div>
                </div>
                {inviteToken && (
                  <div style={{
                    background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)',
                    borderRadius: 'var(--r-sm)', padding: '10px 14px', marginBottom: 12,
                    fontSize: 12, color: '#10b981'
                  }}>
                    <strong>Invite token generated:</strong>
                    <div style={{ fontFamily: 'monospace', wordBreak: 'break-all', marginTop: 4, fontSize: 11 }}>{inviteToken}</div>
                    <div style={{ marginTop: 4, color: 'var(--t3)', fontSize: 11 }}>Share this token with the invitee. They can accept it at /accept-invite.</div>
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

            {/* Shared Reminders */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <span style={labelStyle}>Shared Reminders</span>
                <button
                  onClick={() => router.push('/dashboard')}
                  style={{ ...btnSecondary, fontSize: 11, padding: '6px 12px' }}
                >+ Add Reminder</button>
              </div>

              {reminders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--t4)', fontSize: 13 }}>
                  No shared reminders yet. Create a reminder and set share scope to "family".
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {reminders.map((r: any) => (
                    <div key={r.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 14px', background: 'var(--bg-raised)',
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
                          fontSize: 10, padding: '2px 8px', borderRadius: 4,
                          background: 'rgba(255,255,255,0.06)', color: 'var(--t3)'
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
            </div>
          </div>
        )}
      </div>
    </>
  );
}
