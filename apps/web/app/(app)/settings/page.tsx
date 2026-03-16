'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../../../store/auth';
import { api } from '../../../lib/api';
import toast from 'react-hot-toast';
import { REMINDER_CATEGORIES } from '@glt/shared';

const PERSONAS = [
  { value: 'student',       label: 'Student',       icon: '📚', desc: 'Classes, assignments, study sessions' },
  { value: 'teacher',       label: 'Teacher',       icon: '🏫', desc: 'Lessons, grading, parent meetings' },
  { value: 'nurse',         label: 'Nurse',         icon: '🩺', desc: 'Shifts, patient care, medications' },
  { value: 'doctor',        label: 'Doctor',        icon: '⚕️', desc: 'Appointments, rounds, procedures' },
  { value: 'engineer',      label: 'Engineer',      icon: '⚙️', desc: 'Projects, sprints, deadlines' },
  { value: 'carpenter',     label: 'Carpenter',     icon: '🪚', desc: 'Jobs, materials, client meetings' },
  { value: 'chef',          label: 'Chef',          icon: '👨‍🍳', desc: 'Prep, orders, inventory' },
  { value: 'developer',     label: 'Developer',     icon: '💻', desc: 'PRs, standups, deployments' },
  { value: 'manager',       label: 'Manager',       icon: '📊', desc: 'Team tasks, reviews, reports' },
  { value: 'entrepreneur',  label: 'Entrepreneur',  icon: '🚀', desc: 'Goals, pitches, financials' },
  { value: 'parent',        label: 'Parent',        icon: '👨‍👩‍👧', desc: 'Kids schedules, appointments, errands' },
  { value: 'retiree',       label: 'Retiree',       icon: '🌅', desc: 'Activities, appointments, hobbies' },
  { value: 'other',         label: 'Other',         icon: '✦',  desc: 'General life & work tasks' },
];

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver',
  'America/Los_Angeles', 'America/Toronto', 'Europe/London', 'Europe/Paris',
  'Europe/Berlin', 'Europe/Madrid', 'Asia/Tokyo', 'Asia/Shanghai',
  'Asia/Kolkata', 'Asia/Singapore', 'Australia/Sydney', 'Pacific/Auckland',
];

const THEMES = [
  { value: 'dark', label: 'Dark (default)' },
  { value: 'light', label: 'Light' },
  { value: 'system', label: 'System' },
];

export default function SettingsPage() {
  const { user, setUser, logout } = useAuthStore();
  const router = useRouter();
  const qc = useQueryClient();

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(user?.name || '');
  const [timezone, setTimezone] = useState(user?.timezone || 'UTC');
  const [theme, setTheme] = useState(user?.theme || 'dark');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [selectedPersona, setSelectedPersona] = useState((user as any)?.persona || '');
  const [occupation, setOccupation] = useState((user as any)?.occupation || '');

  // Change password state
  const [currentPw, setCurrentPw]   = useState('');
  const [newPw, setNewPw]           = useState('');
  const [confirmPw, setConfirmPw]   = useState('');
  const [showCurrPw, setShowCurrPw] = useState(false);
  const [showNewPw, setShowNewPw]   = useState(false);

  // Notification toggles (UI only)
  const [notifs, setNotifs] = useState({
    email: true,
    push: true,
    reminders: true,
    weekly: false,
  });

  // My Categories state (local-only for now)
  const [myCategoryIds, setMyCategoryIds] = useState<string[]>(['work', 'personal']);
  const [customCats, setCustomCats] = useState<{ name: string; icon: string; color: string }[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('');
  const [newCatColor, setNewCatColor] = useState('#6C4EFF');

  function toggleMyCategory(slug: string) {
    setMyCategoryIds(prev =>
      prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]
    );
  }

  function handleAddCustomCat() {
    const name = newCatName.trim();
    if (!name) { toast.error('Please enter a category name.'); return; }
    setCustomCats(prev => [...prev, { name, icon: newCatIcon.trim() || '📁', color: newCatColor }]);
    setNewCatName('');
    setNewCatIcon('');
    setNewCatColor('#6C4EFF');
    toast.success(`Category "${name}" added.`);
  }

  function handleRemoveCustomCat(i: number) {
    setCustomCats(prev => prev.filter((_, idx) => idx !== i));
  }

  const updateProfileMutation = useMutation({
    mutationFn: (data: Partial<{ name: string; timezone: string; theme: string }>) =>
      api.users.updateProfile(data),
    onSuccess: (res: any) => {
      const updated = res?.data;
      if (updated && user) {
        setUser({ ...user, ...updated });
      }
      qc.invalidateQueries({ queryKey: ['me'] });
      toast.success('Profile updated!');
      setEditingName(false);
    },
    onError: () => toast.error('Failed to update profile'),
  });

  const exportMutation = useMutation({
    mutationFn: () => api.users.requestExport(),
    onSuccess: () => toast.success('Export requested! You will receive an email shortly.'),
    onError: () => toast.error('Failed to request export'),
  });

  const changePasswordMutation = useMutation({
    mutationFn: () => api.users.changePassword(currentPw, newPw),
    onSuccess: () => {
      toast.success('Password updated successfully!');
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Failed to update password';
      toast.error(msg);
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: () => api.users.deleteAccount(),
    onSuccess: () => {
      toast.success('Account deleted');
      logout();
      router.push('/login');
    },
    onError: () => toast.error('Failed to delete account'),
  });

  const initials = user?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  const sectionStyle: React.CSSProperties = {
    background: 'var(--card)', border: '1px solid var(--b1)',
    borderRadius: 'var(--r-xl)', padding: '24px 28px', marginBottom: 20
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: 'var(--t3)',
    textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16, display: 'block'
  };

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg-raised)', border: '1px solid var(--b1)',
    borderRadius: 'var(--r-sm)', padding: '9px 12px',
    fontSize: 13, color: 'var(--t1)', fontFamily: 'var(--font-body)',
    outline: 'none', width: '100%', boxSizing: 'border-box'
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 0', borderBottom: '1px solid var(--b1)'
  };

  return (
    <>
      {/* Topbar */}
      <div style={{
        background: 'rgba(20,18,16,0.85)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--b1)', padding: '0 26px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 40, flexShrink: 0
      }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 500, color: 'var(--t1)', letterSpacing: '-0.01em' }}>
            Settings
          </div>
          <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 1 }}>
            Manage your account and preferences
          </div>
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          style={{
            padding: '7px 16px', borderRadius: 'var(--r-sm)',
            border: '1px solid var(--b1)', background: 'var(--card)',
            cursor: 'pointer', fontFamily: 'var(--font-body)',
            fontSize: 12, fontWeight: 600, color: 'var(--t2)'
          }}
        >← Back to Dashboard</button>
      </div>

      {/* Content */}
      <div style={{ padding: '28px 26px', flex: 1, maxWidth: 680 }}>

        {/* Profile Section */}
        <div style={sectionStyle}>
          <span style={labelStyle}>Profile</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 22 }}>
            <div style={{
              width: 64, height: 64, borderRadius: 18,
              background: 'linear-gradient(135deg, var(--amber-dim), var(--amber))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 700, color: '#ffffff', flexShrink: 0,
              fontFamily: 'var(--font-display)',
              boxShadow: 'var(--sh-amber)'
            }}>{initials}</div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'var(--t1)' }}>{user?.name}</div>
              <div style={{ fontSize: 13, color: 'var(--t3)', marginTop: 3 }}>{user?.email}</div>
              <div style={{
                display: 'inline-block', fontSize: 10, color: 'var(--amber)',
                background: 'var(--amber-glow)', padding: '2px 8px',
                borderRadius: 4, marginTop: 5, fontWeight: 700
              }}>✦ {user?.plan || 'free'} plan</div>
            </div>
          </div>

          {/* Name field */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--t2)', display: 'block', marginBottom: 6 }}>Display Name</label>
            {editingName ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  autoFocus
                  style={{ ...inputStyle, flex: 1 }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && nameInput.trim()) {
                      updateProfileMutation.mutate({ name: nameInput.trim() });
                    }
                    if (e.key === 'Escape') setEditingName(false);
                  }}
                />
                <button
                  onClick={() => nameInput.trim() && updateProfileMutation.mutate({ name: nameInput.trim() })}
                  disabled={updateProfileMutation.isPending}
                  style={{
                    padding: '9px 16px', background: 'var(--amber)', color: '#fff',
                    border: 'none', borderRadius: 'var(--r-sm)',
                    cursor: 'pointer', fontFamily: 'var(--font-body)',
                    fontSize: 12, fontWeight: 700
                  }}
                >{updateProfileMutation.isPending ? '...' : 'Save'}</button>
                <button
                  onClick={() => { setEditingName(false); setNameInput(user?.name || ''); }}
                  style={{
                    padding: '9px 14px', background: 'var(--bg-raised)',
                    border: '1px solid var(--b1)', borderRadius: 'var(--r-sm)',
                    cursor: 'pointer', fontFamily: 'var(--font-body)',
                    fontSize: 12, fontWeight: 600, color: 'var(--t3)'
                  }}
                >Cancel</button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ ...inputStyle, color: 'var(--t2)', flex: 1 }}>{user?.name}</div>
                <button
                  onClick={() => { setEditingName(true); setNameInput(user?.name || ''); }}
                  style={{
                    padding: '9px 14px', background: 'var(--bg-raised)',
                    border: '1px solid var(--b1)', borderRadius: 'var(--r-sm)',
                    cursor: 'pointer', fontFamily: 'var(--font-body)',
                    fontSize: 12, fontWeight: 600, color: 'var(--t2)'
                  }}
                >Edit</button>
              </div>
            )}
          </div>

          {/* Email field (read only) */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--t2)', display: 'block', marginBottom: 6 }}>Email</label>
            <div style={{ ...inputStyle, color: 'var(--t3)', cursor: 'default' }}>{user?.email}</div>
          </div>
        </div>

        {/* Your Profile / Persona Section */}
        <div style={sectionStyle}>
          <span style={labelStyle}>Your Profile</span>
          <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 16 }}>
            Tell us about yourself so we can suggest relevant task templates for your daily life.
          </div>

          {/* Persona grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
            {PERSONAS.map(p => (
              <div
                key={p.value}
                onClick={() => {
                  setSelectedPersona(p.value);
                  updateProfileMutation.mutate({ persona: p.value });
                }}
                style={{
                  padding: '10px 10px 8px',
                  border: `1px solid ${selectedPersona === p.value ? 'rgba(124,58,237,0.5)' : 'var(--b1)'}`,
                  borderRadius: 'var(--r-sm)',
                  background: selectedPersona === p.value ? 'var(--amber-glow)' : 'var(--bg-raised)',
                  cursor: 'pointer',
                  transition: 'all 0.12s',
                }}
              >
                <div style={{ fontSize: 18, marginBottom: 4 }}>{p.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: selectedPersona === p.value ? 'var(--amber)' : 'var(--t1)', marginBottom: 2 }}>{p.label}</div>
                <div style={{ fontSize: 10, color: 'var(--t4)', lineHeight: 1.3 }}>{p.desc}</div>
              </div>
            ))}
          </div>

          {/* Occupation text field */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--t2)', display: 'block', marginBottom: 6 }}>
              Job Title / Occupation <span style={{ color: 'var(--t4)', fontWeight: 400 }}>(optional)</span>
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={occupation}
                onChange={e => setOccupation(e.target.value)}
                placeholder="e.g. Senior Software Engineer, High School Teacher…"
                style={{ ...inputStyle, flex: 1 }}
                onKeyDown={e => {
                  if (e.key === 'Enter') updateProfileMutation.mutate({ occupation: occupation.trim() });
                }}
              />
              <button
                onClick={() => updateProfileMutation.mutate({ occupation: occupation.trim() })}
                disabled={updateProfileMutation.isPending}
                style={{
                  padding: '9px 16px', background: 'var(--bg-raised)',
                  border: '1px solid var(--b1)', borderRadius: 'var(--r-sm)',
                  cursor: 'pointer', fontFamily: 'var(--font-body)',
                  fontSize: 12, fontWeight: 600, color: 'var(--t2)', flexShrink: 0
                }}
              >Save</button>
            </div>
          </div>
        </div>

        {/* My Categories Section */}
        <div style={sectionStyle}>
          <span style={labelStyle}>My Categories</span>
          <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 16 }}>
            Choose which categories you use and add your own custom ones.
          </div>

          {/* System category toggles */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 18 }}>
            {REMINDER_CATEGORIES.map(cat => {
              const active = myCategoryIds.includes(cat.slug);
              return (
                <div
                  key={cat.slug}
                  onClick={() => toggleMyCategory(cat.slug)}
                  style={{
                    padding: '8px 6px',
                    borderRadius: 10,
                    border: `1px solid ${active ? 'rgba(124,58,237,0.45)' : 'var(--b1)'}`,
                    background: active ? 'var(--amber-glow)' : 'var(--bg-raised)',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.12s',
                  }}
                >
                  <div style={{ fontSize: 18, marginBottom: 3 }}>{cat.icon}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: active ? 'var(--amber)' : 'var(--t2)' }}>{cat.name}</div>
                </div>
              );
            })}
          </div>

          {/* Custom categories list */}
          {customCats.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t2)', marginBottom: 8 }}>Your Custom Categories</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {customCats.map((cat, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: 'var(--bg-raised)', borderRadius: 'var(--r-sm)',
                    padding: '8px 12px', border: '1px solid var(--b1)',
                  }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 16 }}>{cat.icon}</span>
                    <span style={{ fontSize: 13, color: 'var(--t1)', flex: 1 }}>{cat.name}</span>
                    <button
                      onClick={() => handleRemoveCustomCat(i)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--t4)', fontSize: 14, padding: '0 4px',
                      }}
                      title="Remove"
                    >✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add new custom category */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t2)', marginBottom: 8 }}>Add Custom Category</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <input
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                placeholder="Category name"
                maxLength={60}
                style={{ ...inputStyle, flex: '1 1 130px' }}
                onKeyDown={e => e.key === 'Enter' && handleAddCustomCat()}
              />
              <input
                value={newCatIcon}
                onChange={e => setNewCatIcon(e.target.value)}
                placeholder="📁"
                maxLength={4}
                style={{ ...inputStyle, width: 60 }}
              />
              <input
                type="color"
                value={newCatColor}
                onChange={e => setNewCatColor(e.target.value)}
                style={{ ...inputStyle, width: 50, padding: 4, height: 36, cursor: 'pointer' }}
              />
              <button
                onClick={handleAddCustomCat}
                style={{
                  padding: '9px 16px', background: 'var(--amber)', color: '#fff',
                  border: 'none', borderRadius: 'var(--r-sm)',
                  cursor: 'pointer', fontFamily: 'var(--font-body)',
                  fontSize: 12, fontWeight: 700, flexShrink: 0,
                }}
              >+ Add</button>
            </div>
          </div>
        </div>

        {/* Preferences Section */}
        <div style={sectionStyle}>
          <span style={labelStyle}>Preferences</span>

          {/* Timezone */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--t2)', display: 'block', marginBottom: 6 }}>Timezone</label>
            <select
              value={timezone}
              onChange={e => {
                setTimezone(e.target.value);
                updateProfileMutation.mutate({ timezone: e.target.value });
              }}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              {TIMEZONES.map(tz => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>

          {/* Theme */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--t2)', display: 'block', marginBottom: 8 }}>Theme</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {THEMES.map(t => (
                <div
                  key={t.value}
                  onClick={() => {
                    setTheme(t.value);
                    updateProfileMutation.mutate({ theme: t.value });
                  }}
                  style={{
                    flex: 1, padding: '10px 12px', borderRadius: 'var(--r-sm)',
                    border: `1px solid ${theme === t.value ? 'rgba(124,58,237,0.4)' : 'var(--b1)'}`,
                    cursor: 'pointer', textAlign: 'center',
                    fontSize: 12, fontWeight: 600,
                    color: theme === t.value ? 'var(--amber)' : 'var(--t2)',
                    background: theme === t.value ? 'var(--amber-glow)' : 'var(--bg-raised)',
                  }}
                >{t.label}</div>
              ))}
            </div>
          </div>
        </div>

        {/* Notifications Section */}
        <div style={sectionStyle}>
          <span style={labelStyle}>Notifications</span>
          <div style={{ fontSize: 11, color: 'var(--t4)', marginBottom: 14 }}>
            Configure how and when you receive notifications.
          </div>
          {[
            { key: 'email', label: 'Email reminders', desc: 'Receive reminder alerts via email' },
            { key: 'push', label: 'Push notifications', desc: 'Browser and mobile push alerts' },
            { key: 'reminders', label: 'Reminder digest', desc: 'Daily summary of upcoming reminders' },
            { key: 'weekly', label: 'Weekly report', desc: 'Weekly productivity summary' },
          ].map(({ key, label, desc }) => (
            <div key={key} style={{ ...rowStyle, borderBottom: key === 'weekly' ? 'none' : '1px solid var(--b1)' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)', marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 11, color: 'var(--t4)' }}>{desc}</div>
              </div>
              <div
                onClick={() => setNotifs(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                style={{
                  width: 42, height: 24, borderRadius: 12,
                  background: notifs[key as keyof typeof notifs] ? 'var(--amber)' : 'var(--b1)',
                  cursor: 'pointer', position: 'relative',
                  transition: 'background 0.2s', flexShrink: 0
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', background: '#fff',
                  position: 'absolute', top: 3,
                  left: notifs[key as keyof typeof notifs] ? 21 : 3,
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                }} />
              </div>
            </div>
          ))}
        </div>

        {/* Security Section */}
        <div style={sectionStyle}>
          <span style={labelStyle}>Security</span>

          <div style={{ marginBottom: 4 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)', marginBottom: 4 }}>Change Password</div>
            <div style={{ fontSize: 11, color: 'var(--t4)', marginBottom: 16 }}>Update your password. You will need your current password to confirm.</div>

            {/* Current password */}
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--t2)', display: 'block', marginBottom: 6 }}>Current Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showCurrPw ? 'text' : 'password'}
                  value={currentPw}
                  onChange={e => setCurrentPw(e.target.value)}
                  placeholder="Your current password"
                  style={{ ...inputStyle, paddingRight: 40 }}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrPw(v => !v)}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)',
                    display: 'flex', alignItems: 'center', padding: 0
                  }}
                  tabIndex={-1}
                >
                  {showCurrPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* New password */}
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--t2)', display: 'block', marginBottom: 6 }}>New Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showNewPw ? 'text' : 'password'}
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  placeholder="Min. 8 characters"
                  style={{ ...inputStyle, paddingRight: 40 }}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw(v => !v)}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)',
                    display: 'flex', alignItems: 'center', padding: 0
                  }}
                  tabIndex={-1}
                >
                  {showNewPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Confirm new password */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--t2)', display: 'block', marginBottom: 6 }}>Confirm New Password</label>
              <input
                type="password"
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                placeholder="Repeat new password"
                style={{
                  ...inputStyle,
                  borderColor: confirmPw && confirmPw !== newPw ? 'var(--coral)' : undefined,
                }}
                autoComplete="new-password"
              />
              {confirmPw && confirmPw !== newPw && (
                <p style={{ color: 'var(--coral)', fontSize: 11, marginTop: 4 }}>Passwords do not match</p>
              )}
            </div>

            <button
              onClick={() => {
                if (newPw !== confirmPw) { toast.error('Passwords do not match'); return; }
                if (newPw.length < 8) { toast.error('New password must be at least 8 characters'); return; }
                changePasswordMutation.mutate();
              }}
              disabled={changePasswordMutation.isPending || !currentPw || !newPw || !confirmPw || newPw !== confirmPw}
              style={{
                padding: '9px 20px', borderRadius: 'var(--r-sm)',
                background: 'var(--amber)', color: '#fff',
                border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)',
                fontSize: 12, fontWeight: 700, boxShadow: 'var(--sh-amber)',
                opacity: changePasswordMutation.isPending || !currentPw || !newPw || !confirmPw || newPw !== confirmPw ? 0.6 : 1,
              }}
            >
              {changePasswordMutation.isPending ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        </div>

        {/* Account Section */}
        <div style={sectionStyle}>
          <span style={labelStyle}>Account</span>

          {/* Export */}
          <div style={rowStyle}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)', marginBottom: 2 }}>Export Data</div>
              <div style={{ fontSize: 11, color: 'var(--t4)' }}>Download all your reminders and data as JSON</div>
            </div>
            <button
              onClick={() => exportMutation.mutate()}
              disabled={exportMutation.isPending}
              style={{
                padding: '8px 18px', borderRadius: 'var(--r-sm)',
                border: '1px solid var(--b1)', background: 'var(--bg-raised)',
                cursor: 'pointer', fontFamily: 'var(--font-body)',
                fontSize: 12, fontWeight: 600, color: 'var(--t2)',
                flexShrink: 0
              }}
            >{exportMutation.isPending ? 'Requesting...' : 'Export'}</button>
          </div>

          {/* Upgrade (only show for free plan) */}
          {user?.plan === 'free' && (
            <div style={rowStyle}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)', marginBottom: 2 }}>Upgrade to Pro</div>
                <div style={{ fontSize: 11, color: 'var(--t4)' }}>Unlock unlimited reminders, integrations, and more</div>
              </div>
              <button
                style={{
                  padding: '8px 18px', borderRadius: 'var(--r-sm)',
                  background: 'var(--amber)', color: '#fff',
                  border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)',
                  fontSize: 12, fontWeight: 700, boxShadow: 'var(--sh-amber)',
                  flexShrink: 0
                }}
              >✦ Upgrade</button>
            </div>
          )}

          {/* Sign Out */}
          <div style={rowStyle}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)', marginBottom: 2 }}>Sign Out</div>
              <div style={{ fontSize: 11, color: 'var(--t4)' }}>Sign out of your account on this device</div>
            </div>
            <button
              onClick={() => { logout(); router.push('/login'); }}
              style={{
                padding: '8px 18px', borderRadius: 'var(--r-sm)',
                border: '1px solid var(--b1)', background: 'var(--bg-raised)',
                cursor: 'pointer', fontFamily: 'var(--font-body)',
                fontSize: 12, fontWeight: 600, color: 'var(--t2)',
                flexShrink: 0
              }}
            >Sign Out</button>
          </div>

          {/* Delete Account — danger zone */}
          <div style={{ marginTop: 4, padding: '16px', border: '1px solid rgba(255,80,80,0.2)', borderRadius: 'var(--r)', background: 'rgba(255,80,80,0.04)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#ff5050', marginBottom: 6 }}>Danger Zone</div>
            {!showDeleteConfirm ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 12, color: 'var(--t3)' }}>Permanently delete your account and all data. This cannot be undone.</div>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  style={{
                    padding: '7px 14px', borderRadius: 'var(--r-sm)',
                    border: '1px solid rgba(255,80,80,0.4)', background: 'rgba(255,80,80,0.08)',
                    cursor: 'pointer', fontFamily: 'var(--font-body)',
                    fontSize: 12, fontWeight: 700, color: '#ff5050',
                    flexShrink: 0, marginLeft: 14
                  }}
                >Delete Account</button>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 12, color: 'var(--t2)', marginBottom: 10 }}>
                  Type <strong style={{ color: 'var(--t1)' }}>DELETE</strong> to confirm. This action is permanent and irreversible.
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={deleteInput}
                    onChange={e => setDeleteInput(e.target.value)}
                    placeholder="Type DELETE"
                    style={{
                      ...inputStyle, flex: 1,
                      border: '1px solid rgba(255,80,80,0.3)',
                      background: 'rgba(255,80,80,0.06)'
                    }}
                  />
                  <button
                    onClick={() => {
                      if (deleteInput === 'DELETE') deleteAccountMutation.mutate();
                    }}
                    disabled={deleteInput !== 'DELETE' || deleteAccountMutation.isPending}
                    style={{
                      padding: '9px 16px', borderRadius: 'var(--r-sm)',
                      background: deleteInput === 'DELETE' ? '#ff5050' : 'var(--bg-raised)',
                      color: deleteInput === 'DELETE' ? '#fff' : 'var(--t4)',
                      border: '1px solid rgba(255,80,80,0.3)',
                      cursor: deleteInput === 'DELETE' ? 'pointer' : 'not-allowed',
                      fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 700
                    }}
                  >{deleteAccountMutation.isPending ? 'Deleting...' : 'Confirm Delete'}</button>
                  <button
                    onClick={() => { setShowDeleteConfirm(false); setDeleteInput(''); }}
                    style={{
                      padding: '9px 14px', borderRadius: 'var(--r-sm)',
                      border: '1px solid var(--b1)', background: 'var(--bg-raised)',
                      cursor: 'pointer', fontFamily: 'var(--font-body)',
                      fontSize: 12, fontWeight: 600, color: 'var(--t3)'
                    }}
                  >Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
