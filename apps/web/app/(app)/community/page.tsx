'use client';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/auth';
import { api } from '../../../lib/api';
import toast from 'react-hot-toast';

const GREEN = '#10b981';
const GREEN_DIM = 'rgba(16,185,129,0.12)';
const GREEN_GLOW = 'rgba(16,185,129,0.08)';

type Tab = 'overview' | 'tasks' | 'events' | 'members';

export default function CommunityPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const [selectedId, setSelectedId]       = useState<string | null>(null);
  const [showCreate, setShowCreate]       = useState(false);
  const [commName, setCommName]           = useState('');
  const [commDesc, setCommDesc]           = useState('');
  const [tab, setTab]                     = useState<Tab>('overview');
  const [showInvite, setShowInvite]       = useState(false);
  const [inviteEmail, setInviteEmail]     = useState('');
  const [showNewTask, setShowNewTask]     = useState(false);
  const [taskTitle, setTaskTitle]         = useState('');
  const [taskType, setTaskType]           = useState<'task' | 'event'>('task');
  const [taskDate, setTaskDate]           = useState('');

  /* ── Data ─────────────────────────────────────────────────────── */
  const { data: wsData, isLoading } = useQuery({
    queryKey: ['community-workspaces'],
    queryFn: () => api.team.workspaces.list(),
  });

  const communities: any[] = wsData?.data ?? [];
  const selected = communities.find(w => w.id === selectedId) ?? communities[0] ?? null;

  const { data: projectsData } = useQuery({
    queryKey: ['community-projects', selected?.id],
    queryFn: () => api.team.projects.list(selected!.id),
    enabled: !!selected?.id,
  });

  const { data: remindersData } = useQuery({
    queryKey: ['community-reminders', selected?.id],
    queryFn: () => api.team.reminders.list(selected!.id, { limit: 50 }),
    enabled: !!selected?.id,
  });

  const projects: any[]  = projectsData?.data ?? [];
  const reminders: any[] = remindersData?.data ?? [];

  /* Derived lists */
  const tasks  = useMemo(() => reminders.filter(r => r.type !== 'event'), [reminders]);
  const events = useMemo(() => reminders.filter(r => r.type === 'event'), [reminders]);

  /* Leaderboard: count completed tasks per assignee/creator */
  const leaderboard = useMemo(() => {
    const map: Record<string, { name: string; completed: number; total: number }> = {};
    for (const r of reminders) {
      const key = r.assignee?.id ?? r.user?.id ?? 'unknown';
      const name = r.assignee?.name ?? r.user?.name ?? 'Unknown';
      if (!map[key]) map[key] = { name, completed: 0, total: 0 };
      map[key].total++;
      if (r.status === 'completed') map[key].completed++;
    }
    return Object.values(map).sort((a, b) => b.completed - a.completed);
  }, [reminders]);

  /* ── Mutations ────────────────────────────────────────────────── */
  const createMutation = useMutation({
    mutationFn: () => api.team.workspaces.create({ name: commName.trim(), description: commDesc.trim() || undefined }),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['community-workspaces'] });
      setSelectedId(res?.data?.id ?? null);
      toast.success('Community created! 🌐');
      setShowCreate(false); setCommName(''); setCommDesc('');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to create community'),
  });

  const inviteMutation = useMutation({
    mutationFn: () => api.team.workspaces.invite(selected!.id, { email: inviteEmail.trim(), role: 'member' }),
    onSuccess: () => {
      toast.success('Invite sent!');
      setShowInvite(false); setInviteEmail('');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to invite'),
  });

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) => api.team.workspaces.removeMember(selected!.id, memberId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['community-workspaces'] }); toast.success('Member removed'); },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to remove member'),
  });

  const createTaskMutation = useMutation({
    mutationFn: () => api.team.reminders.create(selected!.id, {
      title: taskTitle.trim(),
      type: taskType,
      fireAt: taskDate || undefined,
      shareScope: 'team',
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['community-reminders', selected?.id] });
      toast.success(taskType === 'event' ? 'Event added!' : 'Task added!');
      setShowNewTask(false); setTaskTitle(''); setTaskDate('');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to create'),
  });

  /* ── Styles ───────────────────────────────────────────────────── */
  const card: React.CSSProperties = {
    background: 'var(--card)', border: '1px solid var(--b1)',
    borderRadius: 'var(--r-xl)', padding: '20px 22px', marginBottom: 16,
  };
  const input: React.CSSProperties = {
    background: 'var(--bg-raised)', border: '1px solid var(--b1)',
    borderRadius: 'var(--r-sm)', padding: '9px 12px',
    fontSize: 13, color: 'var(--t1)', fontFamily: 'var(--font-body)',
    outline: 'none', width: '100%', boxSizing: 'border-box',
  };
  const btnPrimary: React.CSSProperties = {
    padding: '9px 18px', background: GREEN, color: '#fff',
    border: 'none', borderRadius: 'var(--r-sm)',
    cursor: 'pointer', fontFamily: 'var(--font-body)',
    fontSize: 13, fontWeight: 700, flexShrink: 0,
  };
  const btnSecondary: React.CSSProperties = {
    padding: '8px 14px', background: 'var(--bg-raised)',
    border: '1px solid var(--b1)', borderRadius: 'var(--r-sm)',
    cursor: 'pointer', fontFamily: 'var(--font-body)',
    fontSize: 12, fontWeight: 600, color: 'var(--t2)', flexShrink: 0,
  };
  const label: React.CSSProperties = {
    fontSize: 10, fontWeight: 600, color: 'var(--t4)',
    textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12, display: 'block',
  };

  return (
    <>
      {/* Topbar */}
      <div style={{
        background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--b1)', padding: '0 26px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 40,
      }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 500, color: 'var(--t1)' }}>
            🌐 Community
          </div>
          <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 1 }}>
            Groups, clubs & shared spaces
          </div>
        </div>
        {selected && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { setShowNewTask(true); setTaskType('event'); }} style={{ ...btnSecondary, fontSize: 11 }}>
              📅 Add Event
            </button>
            <button onClick={() => { setShowNewTask(true); setTaskType('task'); }} style={{ ...btnSecondary, fontSize: 11 }}>
              + Task
            </button>
            {['owner', 'admin'].includes(selected.myRole) && (
              <button onClick={() => setShowInvite(true)} style={btnPrimary}>+ Invite</button>
            )}
          </div>
        )}
      </div>

      <div style={{ padding: '24px 26px', flex: 1, display: 'flex', gap: 20 }}>

        {/* Sidebar */}
        <div style={{ width: 200, flexShrink: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
            My Communities
          </div>

          {isLoading ? (
            <div style={{ fontSize: 12, color: 'var(--t4)' }}>Loading…</div>
          ) : communities.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--t4)' }}>None yet</div>
          ) : communities.map((c: any) => {
            const active = selected?.id === c.id;
            return (
              <div
                key={c.id}
                onClick={() => { setSelectedId(c.id); setTab('overview'); }}
                style={{
                  padding: '9px 12px', borderRadius: 'var(--r-sm)', cursor: 'pointer',
                  marginBottom: 4, fontSize: 13, fontWeight: 600,
                  color: active ? GREEN : 'var(--t2)',
                  background: active ? GREEN_DIM : 'transparent',
                  border: `1px solid ${active ? 'rgba(16,185,129,0.3)' : 'transparent'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>🌐</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 2, paddingLeft: 24 }}>
                  {c.members?.length ?? 0} members
                </div>
              </div>
            );
          })}

          <button
            onClick={() => setShowCreate(v => !v)}
            style={{ ...btnSecondary, width: '100%', marginTop: 8, justifyContent: 'center', display: 'flex' }}
          >
            + New Community
          </button>

          {showCreate && (
            <div style={{ ...card, marginTop: 10, padding: '14px' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)', marginBottom: 8 }}>Create Community</div>
              <input
                value={commName}
                onChange={e => setCommName(e.target.value)}
                placeholder="Community name"
                style={{ ...input, marginBottom: 7 }}
                autoFocus
              />
              <input
                value={commDesc}
                onChange={e => setCommDesc(e.target.value)}
                placeholder="Description (optional)"
                style={{ ...input, marginBottom: 10 }}
              />
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => createMutation.mutate()}
                  disabled={!commName.trim() || createMutation.isPending}
                  style={{ ...btnPrimary, flex: 1, padding: '7px 10px', fontSize: 11 }}
                >{createMutation.isPending ? '…' : 'Create'}</button>
                <button onClick={() => setShowCreate(false)} style={{ ...btnSecondary, padding: '7px 10px' }}>✕</button>
              </div>
            </div>
          )}
        </div>

        {/* Main */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {!selected ? (
            /* Empty state */
            <div style={{ maxWidth: 520, margin: '40px auto', textAlign: 'center' }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>🌐</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'var(--t1)', marginBottom: 10 }}>
                Join or Create a Community
              </div>
              <div style={{ fontSize: 13, color: 'var(--t3)', lineHeight: 1.8, marginBottom: 32, maxWidth: 400, margin: '0 auto 32px' }}>
                Community spaces let groups, clubs, and organisations share tasks, events, and announcements — all in one place.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14, marginBottom: 28, textAlign: 'left' }}>
                {[
                  { icon: '📋', title: 'Shared Task Boards', desc: 'Coordinate tasks across your entire group' },
                  { icon: '📣', title: 'Announcements', desc: 'Broadcast updates to all members at once' },
                  { icon: '📅', title: 'Community Events', desc: 'Plan events everyone can see' },
                  { icon: '🏆', title: 'Leaderboards', desc: 'Celebrate top contributors' },
                ].map(f => (
                  <div key={f.title} style={{
                    padding: '16px 14px', borderRadius: 14,
                    background: GREEN_GLOW, border: `1px solid rgba(16,185,129,0.18)`,
                  }}>
                    <div style={{ fontSize: 22, marginBottom: 6 }}>{f.icon}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#34d399', marginBottom: 4 }}>{f.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--t3)', lineHeight: 1.5 }}>{f.desc}</div>
                  </div>
                ))}
              </div>
              <button onClick={() => setShowCreate(true)} style={btnPrimary}>
                🌐 Create Your First Community
              </button>
            </div>
          ) : (
            <>
              {/* Community header */}
              <div style={card}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                    background: `linear-gradient(135deg, ${GREEN_DIM}, ${GREEN})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                  }}>🌐</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--t1)' }}>
                      {selected.name}
                    </div>
                    {selected.description && (
                      <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 3 }}>{selected.description}</div>
                    )}
                    <div style={{ display: 'flex', gap: 14, marginTop: 8 }}>
                      <span style={{ fontSize: 11, color: 'var(--t4)' }}>👥 {selected.members?.length ?? 0} members</span>
                      <span style={{ fontSize: 11, color: 'var(--t4)' }}>📋 {projects.length} boards</span>
                      <span style={{ fontSize: 11, color: 'var(--t4)' }}>✅ {tasks.length} tasks</span>
                      <span style={{ fontSize: 11, color: 'var(--t4)' }}>📅 {events.length} events</span>
                    </div>
                  </div>
                  <div style={{
                    padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                    background: GREEN_DIM, color: GREEN,
                  }}>{selected.myRole}</div>
                </div>
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
                {(['overview', 'tasks', 'events', 'members'] as Tab[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    style={{
                      padding: '7px 16px', borderRadius: 20, cursor: 'pointer',
                      fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
                      border: `1px solid ${tab === t ? GREEN : 'var(--b1)'}`,
                      background: tab === t ? GREEN_DIM : 'transparent',
                      color: tab === t ? GREEN : 'var(--t3)',
                      transition: 'all 0.15s',
                    }}
                  >
                    {t === 'overview' ? '🏠 Overview' : t === 'tasks' ? '📋 Tasks' : t === 'events' ? '📅 Events' : '👥 Members'}
                  </button>
                ))}
              </div>

              {/* Invite form */}
              {showInvite && (
                <div style={card}>
                  <span style={label}>Invite to Community</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                      placeholder="member@example.com"
                      type="email"
                      style={{ ...input, flex: 1 }}
                      autoFocus
                    />
                    <button
                      onClick={() => inviteMutation.mutate()}
                      disabled={!inviteEmail.trim() || inviteMutation.isPending}
                      style={{ ...btnPrimary, opacity: !inviteEmail.trim() ? 0.6 : 1 }}
                    >{inviteMutation.isPending ? '…' : 'Send Invite'}</button>
                    <button onClick={() => setShowInvite(false)} style={btnSecondary}>Cancel</button>
                  </div>
                </div>
              )}

              {/* New task/event form */}
              {showNewTask && (
                <div style={card}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    {(['task', 'event'] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => setTaskType(t)}
                        style={{
                          padding: '6px 14px', borderRadius: 20, cursor: 'pointer',
                          fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
                          border: `1px solid ${taskType === t ? GREEN : 'var(--b1)'}`,
                          background: taskType === t ? GREEN_DIM : 'transparent',
                          color: taskType === t ? GREEN : 'var(--t3)',
                        }}
                      >{t === 'task' ? '📋 Task' : '📅 Event'}</button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      value={taskTitle}
                      onChange={e => setTaskTitle(e.target.value)}
                      placeholder={taskType === 'event' ? 'Event name…' : 'Task title…'}
                      style={{ ...input, flex: 1 }}
                      autoFocus
                    />
                    <input
                      type="datetime-local"
                      value={taskDate}
                      onChange={e => setTaskDate(e.target.value)}
                      style={{ ...input, width: 180, colorScheme: 'dark' }}
                    />
                    <button
                      onClick={() => createTaskMutation.mutate()}
                      disabled={!taskTitle.trim() || createTaskMutation.isPending}
                      style={{ ...btnPrimary, opacity: !taskTitle.trim() ? 0.6 : 1 }}
                    >{createTaskMutation.isPending ? '…' : 'Add'}</button>
                    <button onClick={() => setShowNewTask(false)} style={btnSecondary}>Cancel</button>
                  </div>
                </div>
              )}

              {/* ── TAB: OVERVIEW ── */}
              {tab === 'overview' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {/* Boards */}
                  <div style={card}>
                    <span style={label}>Task Boards</span>
                    {projects.length === 0 ? (
                      <div style={{ fontSize: 12, color: 'var(--t4)', fontStyle: 'italic' }}>No boards yet</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {projects.slice(0, 5).map((p: any) => (
                          <div key={p.id} style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '8px 10px', background: 'var(--bg-raised)',
                            borderRadius: 'var(--r-sm)', borderLeft: `3px solid ${p.color}`,
                          }}>
                            <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>{p.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--t4)' }}>{p._count?.reminders ?? 0} tasks</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Leaderboard */}
                  <div style={card}>
                    <span style={label}>🏆 Leaderboard</span>
                    {leaderboard.length === 0 ? (
                      <div style={{ fontSize: 12, color: 'var(--t4)', fontStyle: 'italic' }}>No activity yet</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                        {leaderboard.slice(0, 5).map((entry, i) => (
                          <div key={entry.name} style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '7px 10px', background: 'var(--bg-raised)',
                            borderRadius: 'var(--r-sm)',
                          }}>
                            <div style={{
                              width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                              background: i === 0 ? '#f59e0b' : i === 1 ? 'var(--t4)' : i === 2 ? '#b45309' : 'var(--bg-raised)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 10, fontWeight: 800,
                              color: i < 3 ? '#fff' : 'var(--t3)',
                              border: i >= 3 ? '1px solid var(--b1)' : 'none',
                            }}>{i + 1}</div>
                            <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {entry.name}
                            </div>
                            <div style={{ fontSize: 11, color: GREEN, fontWeight: 700 }}>{entry.completed} done</div>
                            <div style={{ fontSize: 10, color: 'var(--t4)' }}>/ {entry.total}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Recent Events */}
                  <div style={{ ...card, gridColumn: '1 / -1' }}>
                    <span style={label}>Upcoming Events</span>
                    {events.length === 0 ? (
                      <div style={{ fontSize: 12, color: 'var(--t4)', fontStyle: 'italic' }}>
                        No events yet. Use "Add Event" to schedule something for the community.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                        {events.slice(0, 5).map((e: any) => (
                          <div key={e.id} style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '10px 14px', background: 'var(--bg-raised)',
                            borderRadius: 'var(--r-sm)', border: '1px solid var(--b1)',
                          }}>
                            <span style={{ fontSize: 18 }}>📅</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>{e.title}</div>
                              {e.fireAt && (
                                <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>
                                  {new Date(e.fireAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </div>
                              )}
                            </div>
                            {e.user?.name && (
                              <div style={{ fontSize: 11, color: 'var(--t4)' }}>by {e.user.name}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── TAB: TASKS ── */}
              {tab === 'tasks' && (
                <div style={card}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <span style={{ ...label, marginBottom: 0 }}>Shared Tasks</span>
                    <span style={{ fontSize: 11, color: 'var(--t4)' }}>{tasks.length} total</span>
                  </div>
                  {tasks.length === 0 ? (
                    <div style={{ fontSize: 13, color: 'var(--t4)', padding: '20px 0', textAlign: 'center' }}>
                      No tasks yet. Use "+ Task" to add one.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                      {tasks.map((r: any) => (
                        <div key={r.id} style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '10px 14px', background: 'var(--bg-raised)',
                          borderRadius: 'var(--r-sm)', border: '1px solid var(--b1)',
                        }}>
                          <div style={{
                            width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                            background: r.priority === 'urgent' ? 'var(--coral)' : r.priority === 'high' ? '#f59e0b' : GREEN,
                          }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: 13, fontWeight: 600,
                              color: r.status === 'completed' ? 'var(--t4)' : 'var(--t1)',
                              textDecoration: r.status === 'completed' ? 'line-through' : 'none',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>{r.title}</div>
                            <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2, display: 'flex', gap: 10 }}>
                              {r.user?.name && <span>by {r.user.name}</span>}
                              {r.fireAt && <span>{new Date(r.fireAt).toLocaleDateString()}</span>}
                            </div>
                          </div>
                          {r.assignee && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
                              <div style={{
                                width: 20, height: 20, borderRadius: '50%',
                                background: `linear-gradient(135deg, ${GREEN_DIM}, ${GREEN})`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 9, fontWeight: 700, color: '#fff',
                              }}>{r.assignee.name?.slice(0, 1)}</div>
                              <span style={{ color: 'var(--t3)' }}>{r.assignee.name}</span>
                            </div>
                          )}
                          <div style={{
                            fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, flexShrink: 0,
                            background: r.status === 'completed' ? 'rgba(16,185,129,0.1)' : GREEN_DIM,
                            color: r.status === 'completed' ? GREEN : 'var(--t3)',
                          }}>{r.status}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB: EVENTS ── */}
              {tab === 'events' && (
                <div style={card}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <span style={{ ...label, marginBottom: 0 }}>Community Events</span>
                    <span style={{ fontSize: 11, color: 'var(--t4)' }}>{events.length} events</span>
                  </div>
                  {events.length === 0 ? (
                    <div style={{ fontSize: 13, color: 'var(--t4)', padding: '20px 0', textAlign: 'center' }}>
                      No events scheduled. Use "📅 Add Event" to create one.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {events.map((e: any) => (
                        <div key={e.id} style={{
                          display: 'flex', gap: 14,
                          padding: '14px 16px', background: 'var(--bg-raised)',
                          borderRadius: 'var(--r-sm)', border: `1px solid rgba(16,185,129,0.15)`,
                          borderLeft: `3px solid ${GREEN}`,
                        }}>
                          <div style={{
                            width: 44, flexShrink: 0, textAlign: 'center',
                            background: GREEN_DIM, borderRadius: 8, padding: '8px 4px',
                          }}>
                            <div style={{ fontSize: 16 }}>📅</div>
                            {e.fireAt && (
                              <div style={{ fontSize: 10, fontWeight: 700, color: GREEN, marginTop: 3, lineHeight: 1.2 }}>
                                {new Date(e.fireAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                              </div>
                            )}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)', marginBottom: 4 }}>{e.title}</div>
                            {e.fireAt && (
                              <div style={{ fontSize: 11, color: 'var(--t3)' }}>
                                🕐 {new Date(e.fireAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            )}
                            {e.user?.name && (
                              <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 4 }}>
                                Organised by {e.user.name}
                              </div>
                            )}
                          </div>
                          <div style={{
                            fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 4,
                            alignSelf: 'flex-start', flexShrink: 0,
                            background: e.status === 'completed' ? 'rgba(16,185,129,0.1)' : GREEN_DIM,
                            color: e.status === 'completed' ? GREEN : 'var(--t3)',
                          }}>{e.status}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB: MEMBERS ── */}
              {tab === 'members' && (
                <div style={card}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <span style={{ ...label, marginBottom: 0 }}>Members</span>
                    <span style={{ fontSize: 11, color: 'var(--t4)' }}>{selected.members?.length ?? 0} members</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(selected.members ?? []).map((m: any) => {
                      const stats = leaderboard.find(l => l.name === m.user?.name);
                      return (
                        <div key={m.userId} style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '12px 14px', background: 'var(--bg-raised)',
                          borderRadius: 'var(--r-sm)', border: '1px solid var(--b1)',
                        }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                            background: `linear-gradient(135deg, ${GREEN_DIM}, ${GREEN})`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 14, fontWeight: 700, color: '#fff',
                          }}>
                            {m.user?.name?.slice(0, 1).toUpperCase() || '?'}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>{m.user?.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--t3)' }}>{m.user?.email}</div>
                          </div>
                          {stats && (
                            <div style={{ fontSize: 11, color: 'var(--t4)', textAlign: 'right' }}>
                              <div style={{ color: GREEN, fontWeight: 700 }}>{stats.completed} done</div>
                              <div>{stats.total} tasks</div>
                            </div>
                          )}
                          <div style={{
                            fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 4,
                            background: GREEN_DIM, color: GREEN,
                          }}>{m.role}</div>
                          {selected.myRole === 'owner' && m.userId !== user?.id && (
                            <button
                              onClick={() => removeMemberMutation.mutate(m.userId)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', fontSize: 16, padding: '0 4px', lineHeight: 1 }}
                              title="Remove member"
                            >✕</button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
