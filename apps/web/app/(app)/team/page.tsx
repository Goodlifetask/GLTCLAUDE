'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/auth';
import { api } from '../../../lib/api';
import toast from 'react-hot-toast';

export default function TeamPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const qc = useQueryClient();

  const [showCreateWs, setShowCreateWs] = useState(false);
  const [wsName, setWsName] = useState('');
  const [wsDesc, setWsDesc] = useState('');
  const [selectedWsId, setSelectedWsId] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member');
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectColor, setProjectColor] = useState('#6366f1');

  const { data: workspacesData, isLoading } = useQuery({
    queryKey: ['team-workspaces'],
    queryFn: () => api.team.workspaces.list(),
  });

  const workspaces: any[] = workspacesData?.data ?? [];
  const selectedWs = workspaces.find((w: any) => w.id === selectedWsId) ?? workspaces[0] ?? null;

  const { data: projectsData } = useQuery({
    queryKey: ['team-projects', selectedWs?.id],
    queryFn: () => api.team.projects.list(selectedWs!.id),
    enabled: !!selectedWs?.id,
  });

  const { data: remindersData } = useQuery({
    queryKey: ['team-reminders', selectedWs?.id],
    queryFn: () => api.team.reminders.list(selectedWs!.id, { limit: 30 }),
    enabled: !!selectedWs?.id,
  });

  const createWsMutation = useMutation({
    mutationFn: () => api.team.workspaces.create({ name: wsName.trim(), description: wsDesc.trim() || undefined }),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['team-workspaces'] });
      setSelectedWsId(res?.data?.id ?? null);
      toast.success('Workspace created!');
      setShowCreateWs(false);
      setWsName('');
      setWsDesc('');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to create workspace'),
  });

  const inviteMutation = useMutation({
    mutationFn: () => api.team.workspaces.invite(selectedWs!.id, { email: inviteEmail.trim(), role: inviteRole }),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['team-workspaces'] });
      const msg = res?.data?.message ?? 'Invited!';
      toast.success(msg);
      setShowInvite(false);
      setInviteEmail('');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to invite'),
  });

  const createProjectMutation = useMutation({
    mutationFn: () => api.team.projects.create(selectedWs!.id, { name: projectName.trim(), color: projectColor }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team-projects', selectedWs?.id] });
      toast.success('Project created!');
      setShowCreateProject(false);
      setProjectName('');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to create project'),
  });

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) => api.team.workspaces.removeMember(selectedWs!.id, memberId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team-workspaces'] });
      toast.success('Member removed');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to remove member'),
  });

  const projects: any[] = projectsData?.data ?? [];
  const reminders: any[] = remindersData?.data ?? [];

  const cardStyle: React.CSSProperties = {
    background: 'var(--card)', border: '1px solid var(--b1)',
    borderRadius: 'var(--r-xl)', padding: '20px 22px', marginBottom: 16
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 600, color: 'var(--t4)',
    textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12, display: 'block'
  };

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg-raised)', border: '1px solid var(--b1)',
    borderRadius: 'var(--r-sm)', padding: '9px 12px',
    fontSize: 13, color: 'var(--t1)', fontFamily: 'var(--font-body)',
    outline: 'none', width: '100%', boxSizing: 'border-box'
  };

  const btnPrimary: React.CSSProperties = {
    padding: '9px 18px', background: 'var(--amber)', color: '#fff',
    border: 'none', borderRadius: 'var(--r-sm)',
    cursor: 'pointer', fontFamily: 'var(--font-body)',
    fontSize: 12, fontWeight: 700, boxShadow: 'var(--sh-amber)', flexShrink: 0
  };

  const btnSecondary: React.CSSProperties = {
    padding: '8px 14px', background: 'var(--bg-raised)',
    border: '1px solid var(--b1)', borderRadius: 'var(--r-sm)',
    cursor: 'pointer', fontFamily: 'var(--font-body)',
    fontSize: 12, fontWeight: 600, color: 'var(--t2)', flexShrink: 0
  };

  const PROJECT_COLORS = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#0ea5e9'];

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
            🏢 Team
          </div>
          <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 1 }}>
            Workspaces, projects, and team tasks
          </div>
        </div>
        <button onClick={() => setShowCreateWs(true)} style={btnPrimary}>+ New Workspace</button>
      </div>

      <div style={{ padding: '24px 26px', flex: 1, display: 'flex', gap: 20 }}>

        {/* Workspace list sidebar */}
        <div style={{ width: 200, flexShrink: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Workspaces</div>
          {isLoading ? (
            <div style={{ color: 'var(--t4)', fontSize: 12 }}>Loading…</div>
          ) : workspaces.length === 0 ? (
            <div style={{ color: 'var(--t4)', fontSize: 12 }}>No workspaces yet</div>
          ) : (
            workspaces.map((ws: any) => (
              <div
                key={ws.id}
                onClick={() => setSelectedWsId(ws.id)}
                style={{
                  padding: '9px 12px', borderRadius: 'var(--r-sm)', cursor: 'pointer',
                  marginBottom: 4, fontSize: 13, fontWeight: 600,
                  color: (selectedWs?.id === ws.id) ? 'var(--amber)' : 'var(--t2)',
                  background: (selectedWs?.id === ws.id) ? 'var(--amber-glow)' : 'transparent',
                  border: `1px solid ${(selectedWs?.id === ws.id) ? 'rgba(124,58,237,0.3)' : 'transparent'}`
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>🏢</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ws.name}</span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 2, paddingLeft: 24 }}>
                  {ws.members?.length ?? 0} members · {ws.myRole}
                </div>
              </div>
            ))
          )}

          {/* Create workspace form */}
          {showCreateWs && (
            <div style={{ ...cardStyle, marginTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)', marginBottom: 10 }}>New Workspace</div>
              <input
                value={wsName}
                onChange={e => setWsName(e.target.value)}
                placeholder="Workspace name"
                style={{ ...inputStyle, marginBottom: 8 }}
                autoFocus
              />
              <input
                value={wsDesc}
                onChange={e => setWsDesc(e.target.value)}
                placeholder="Description (optional)"
                style={{ ...inputStyle, marginBottom: 10 }}
              />
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => createWsMutation.mutate()}
                  disabled={!wsName.trim() || createWsMutation.isPending}
                  style={{ ...btnPrimary, padding: '7px 12px', fontSize: 11, flex: 1 }}
                >{createWsMutation.isPending ? '…' : 'Create'}</button>
                <button onClick={() => setShowCreateWs(false)} style={{ ...btnSecondary, padding: '7px 10px' }}>✕</button>
              </div>
            </div>
          )}
        </div>

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {!selectedWs ? (
            <div style={{ maxWidth: 520, margin: '40px auto' }}>
              <div style={{ textAlign: 'center', marginBottom: 28 }}>
                <div style={{ fontSize: 52, marginBottom: 14 }}>🏢</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--t1)', marginBottom: 10 }}>
                  Get Started with Team
                </div>
                <div style={{ fontSize: 13, color: 'var(--t3)', lineHeight: 1.7 }}>
                  Create a new workspace for your team, or ask a workspace admin to invite you by email — you'll be added automatically.
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div
                  onClick={() => setShowCreateWs(true)}
                  style={{
                    padding: '22px 18px', borderRadius: 16, cursor: 'pointer', textAlign: 'center',
                    background: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(59,130,246,0.04))',
                    border: '1.5px solid rgba(59,130,246,0.35)',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(59,130,246,0.7)'}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(59,130,246,0.35)'}
                >
                  <div style={{ fontSize: 34, marginBottom: 10 }}>🚀</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#60a5fa', marginBottom: 6 }}>Create Workspace</div>
                  <div style={{ fontSize: 11, color: 'var(--t3)', lineHeight: 1.5 }}>
                    Start a new workspace and invite your team
                  </div>
                </div>
                <div
                  style={{
                    padding: '22px 18px', borderRadius: 16, textAlign: 'center',
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(99,102,241,0.02))',
                    border: '1.5px solid rgba(99,102,241,0.25)',
                  }}
                >
                  <div style={{ fontSize: 34, marginBottom: 10 }}>📧</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#818cf8', marginBottom: 6 }}>Join a Workspace</div>
                  <div style={{ fontSize: 11, color: 'var(--t3)', lineHeight: 1.5 }}>
                    Ask your workspace admin to invite you by email — you'll be added automatically
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Workspace header */}
              <div style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--t1)' }}>
                      {selectedWs.name}
                    </div>
                    {selectedWs.description && (
                      <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 4 }}>{selectedWs.description}</div>
                    )}
                    <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 6 }}>
                      Your role: <span style={{ color: 'var(--amber)', fontWeight: 700 }}>{selectedWs.myRole}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['owner', 'admin'].includes(selectedWs.myRole) && (
                      <button onClick={() => setShowInvite(true)} style={btnPrimary}>+ Invite</button>
                    )}
                  </div>
                </div>

                {/* Members row */}
                <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                  {(selectedWs.members ?? []).map((m: any) => (
                    <div key={m.userId} style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '5px 10px', background: 'var(--bg-raised)',
                      borderRadius: 20, border: '1px solid var(--b1)', fontSize: 11
                    }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--amber-dim), var(--amber))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 9, fontWeight: 700, color: '#fff', flexShrink: 0
                      }}>{m.user?.name?.slice(0, 1).toUpperCase()}</div>
                      <span style={{ color: 'var(--t2)', fontWeight: 600 }}>{m.user?.name}</span>
                      <span style={{ color: 'var(--t4)' }}>·</span>
                      <span style={{ color: 'var(--amber)', fontSize: 10 }}>{m.role}</span>
                      {selectedWs.myRole === 'owner' && m.userId !== user?.id && (
                        <button
                          onClick={() => removeMemberMutation.mutate(m.userId)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', fontSize: 12, padding: 0, lineHeight: 1 }}
                        >✕</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Invite form */}
              {showInvite && (
                <div style={cardStyle}>
                  <span style={labelStyle}>Invite Team Member</span>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    <input
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                      placeholder="colleague@company.com"
                      type="email"
                      style={{ ...inputStyle, flex: 1 }}
                      autoFocus
                    />
                    <select
                      value={inviteRole}
                      onChange={e => setInviteRole(e.target.value as any)}
                      style={{ ...inputStyle, width: 100, cursor: 'pointer' }}
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => inviteMutation.mutate()}
                      disabled={!inviteEmail.trim() || inviteMutation.isPending}
                      style={{ ...btnPrimary, opacity: !inviteEmail.trim() ? 0.6 : 1 }}
                    >{inviteMutation.isPending ? 'Inviting…' : 'Send Invite'}</button>
                    <button onClick={() => setShowInvite(false)} style={btnSecondary}>Cancel</button>
                  </div>
                </div>
              )}

              {/* Projects */}
              <div style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <span style={{ ...labelStyle, marginBottom: 0 }}>Projects</span>
                  <button
                    onClick={() => setShowCreateProject(v => !v)}
                    style={{ ...btnSecondary, fontSize: 11, padding: '6px 12px' }}
                  >+ New Project</button>
                </div>

                {showCreateProject && (
                  <div style={{ padding: '14px', background: 'var(--bg-raised)', borderRadius: 'var(--r-sm)', marginBottom: 14, border: '1px solid var(--b1)' }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                      <input
                        value={projectName}
                        onChange={e => setProjectName(e.target.value)}
                        placeholder="Project name"
                        style={{ ...inputStyle, flex: 1 }}
                        autoFocus
                      />
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                      {PROJECT_COLORS.map(c => (
                        <div
                          key={c}
                          onClick={() => setProjectColor(c)}
                          style={{
                            width: 22, height: 22, borderRadius: '50%', background: c,
                            cursor: 'pointer', flexShrink: 0,
                            outline: projectColor === c ? `2px solid ${c}` : 'none',
                            outlineOffset: 2
                          }}
                        />
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => createProjectMutation.mutate()}
                        disabled={!projectName.trim() || createProjectMutation.isPending}
                        style={{ ...btnPrimary, fontSize: 11, padding: '7px 14px' }}
                      >{createProjectMutation.isPending ? '…' : 'Create'}</button>
                      <button onClick={() => setShowCreateProject(false)} style={btnSecondary}>Cancel</button>
                    </div>
                  </div>
                )}

                {projects.length === 0 ? (
                  <div style={{ color: 'var(--t4)', fontSize: 13, padding: '12px 0' }}>
                    No projects yet. Create one to organize team tasks.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px,1fr))', gap: 10 }}>
                    {projects.map((p: any) => (
                      <div key={p.id} style={{
                        padding: '12px 14px', background: 'var(--bg-raised)',
                        borderRadius: 'var(--r-sm)', border: `1px solid var(--b1)`,
                        borderLeft: `3px solid ${p.color}`
                      }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)', marginBottom: 4 }}>{p.name}</div>
                        {p.description && <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 6 }}>{p.description}</div>}
                        <div style={{ fontSize: 11, color: 'var(--t4)' }}>{p._count?.reminders ?? 0} tasks</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tasks */}
              <div style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <span style={{ ...labelStyle, marginBottom: 0 }}>Team Tasks</span>
                  <span style={{ fontSize: 11, color: 'var(--t4)' }}>{remindersData?.total ?? 0} total</span>
                </div>

                {reminders.length === 0 ? (
                  <div style={{ color: 'var(--t4)', fontSize: 13, padding: '12px 0' }}>
                    No tasks yet. Tasks created with this workspace will appear here.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
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
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 13, fontWeight: 600,
                            color: r.status === 'completed' ? 'var(--t4)' : 'var(--t1)',
                            textDecoration: r.status === 'completed' ? 'line-through' : 'none',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                          }}>{r.title}</div>
                          <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2, display: 'flex', gap: 10 }}>
                            {r.project && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: r.project.color, display: 'inline-block' }} />
                                {r.project.name}
                              </span>
                            )}
                            {r.fireAt && <span>{new Date(r.fireAt).toLocaleDateString()}</span>}
                          </div>
                        </div>
                        {r.assignee && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
                            <div style={{
                              width: 20, height: 20, borderRadius: '50%',
                              background: 'linear-gradient(135deg, var(--amber-dim), var(--amber))',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 9, fontWeight: 700, color: '#fff', flexShrink: 0
                            }}>{r.assignee.name?.slice(0, 1)}</div>
                            <span style={{ color: 'var(--t3)' }}>{r.assignee.name}</span>
                          </div>
                        )}
                        <div style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, flexShrink: 0,
                          background: r.status === 'completed' ? 'rgba(16,185,129,0.1)' : 'var(--amber-glow)',
                          color: r.status === 'completed' ? '#10b981' : 'var(--amber)'
                        }}>{r.status}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
