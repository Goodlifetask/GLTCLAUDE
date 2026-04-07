'use client';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { api } from '../../../lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────
type BillingCycle = 'weekly' | 'monthly' | 'quarterly' | 'yearly';
type SubStatus    = 'active' | 'trial' | 'paused' | 'cancelled' | 'expired' | 'pending';

interface UserSub {
  id:                 string;
  name:               string;
  description?:       string;
  category?:          string;
  billingCycle:       BillingCycle;
  price:              string;
  currency:           string;
  status:             SubStatus;
  startDate:          string;
  nextBillingDate?:   string;
  trialEndDate?:      string;
  cancelledAt?:       string;
  reminderDaysBefore: number;
  reminderId?:        string;
  notes?:             string;
  color?:             string;
  icon?:              string;
  website?:           string;
  createdAt:          string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const BILLING_CYCLES: { value: BillingCycle; label: string }[] = [
  { value: 'weekly',    label: 'Weekly'    },
  { value: 'monthly',   label: 'Monthly'   },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly',    label: 'Yearly'    },
];

const STATUSES: { value: SubStatus; label: string; color: string; bg: string }[] = [
  { value: 'active',    label: 'Active',    color: '#10b981', bg: 'rgba(16,185,129,0.1)'  },
  { value: 'trial',     label: 'Trial',     color: '#6366f1', bg: 'rgba(99,102,241,0.1)'  },
  { value: 'paused',    label: 'Paused',    color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
  { value: 'pending',   label: 'Pending',   color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
  { value: 'cancelled', label: 'Cancelled', color: '#ef4444', bg: 'rgba(239,68,68,0.1)'   },
  { value: 'expired',   label: 'Expired',   color: '#9ca3af', bg: 'rgba(156,163,175,0.1)' },
];

const CATEGORIES = [
  'Streaming', 'Software', 'Fitness', 'Music', 'News & Media',
  'Cloud Storage', 'Gaming', 'Food & Delivery', 'Utilities',
  'Finance', 'Education', 'Healthcare', 'Other',
];

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'INR', 'NGN', 'ZAR', 'BRL', 'MXN', 'SGD'];

const PRESET_ICONS = ['📱', '🎵', '📺', '🎮', '☁️', '💪', '📰', '🛒', '🏠', '💊', '📚', '💰', '🔧', '🍿', '✈️', '💳'];
const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b',
  '#10b981', '#06b6d4', '#3b82f6', '#64748b', '#d97706',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function normalizePrice(price: number, cycle: BillingCycle): { monthly: number; yearly: number } {
  switch (cycle) {
    case 'weekly':    return { monthly: price * 4.33, yearly: price * 52 };
    case 'monthly':   return { monthly: price,        yearly: price * 12 };
    case 'quarterly': return { monthly: price / 3,    yearly: price * 4  };
    case 'yearly':    return { monthly: price / 12,   yearly: price      };
  }
}

function fmtCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function fmtDate(dateStr?: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getStatus(s: SubStatus) {
  return STATUSES.find(x => x.value === s) ?? STATUSES[0];
}

// ─── Empty Form ───────────────────────────────────────────────────────────────
const emptyForm = () => ({
  name:                '',
  description:         '',
  category:            '',
  billing_cycle:       'monthly' as BillingCycle,
  price:               '',
  currency:            'USD',
  status:              'active' as SubStatus,
  start_date:          new Date().toISOString().slice(0, 10),
  next_billing_date:   '',
  trial_end_date:      '',
  reminder_days_before: 3,
  notes:               '',
  color:               '#6366f1',
  icon:                '💳',
  website:             '',
});

// ─── Modal ────────────────────────────────────────────────────────────────────
function SubModal({
  sub,
  onClose,
  onSave,
  saving,
}: {
  sub?: UserSub | null;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => void;
  saving: boolean;
}) {
  const isEdit = !!sub;
  const [form, setForm] = useState(() =>
    sub
      ? {
          name:                sub.name,
          description:         sub.description ?? '',
          category:            sub.category    ?? '',
          billing_cycle:       sub.billingCycle,
          price:               sub.price,
          currency:            sub.currency,
          status:              sub.status,
          start_date:          sub.startDate?.slice(0, 10) ?? '',
          next_billing_date:   sub.nextBillingDate?.slice(0, 10)  ?? '',
          trial_end_date:      sub.trialEndDate?.slice(0, 10)     ?? '',
          reminder_days_before: sub.reminderDaysBefore,
          notes:               sub.notes    ?? '',
          color:               sub.color    ?? '#6366f1',
          icon:                sub.icon     ?? '💳',
          website:             sub.website  ?? '',
        }
      : emptyForm()
  );

  function set(key: string, val: unknown) {
    setForm(f => ({ ...f, [key]: val }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim())  { toast.error('Name is required'); return; }
    if (!form.price)        { toast.error('Price is required'); return; }
    if (!form.start_date)   { toast.error('Start date is required'); return; }

    const payload: Record<string, unknown> = {
      name:                form.name.trim(),
      billing_cycle:       form.billing_cycle,
      price:               parseFloat(String(form.price)),
      currency:            form.currency,
      status:              form.status,
      start_date:          new Date(form.start_date).toISOString(),
      reminder_days_before: Number(form.reminder_days_before),
    };
    if (form.description)       payload.description      = form.description;
    if (form.category)          payload.category         = form.category;
    if (form.next_billing_date) payload.next_billing_date = new Date(form.next_billing_date).toISOString();
    if (form.trial_end_date)    payload.trial_end_date   = new Date(form.trial_end_date).toISOString();
    if (form.notes)             payload.notes            = form.notes;
    if (form.color)             payload.color            = form.color;
    if (form.icon)              payload.icon             = form.icon;
    if (form.website)           payload.website          = form.website;

    onSave(payload);
  }

  const inp: React.CSSProperties = {
    background: 'var(--bg-raised)', border: '1px solid var(--b1)',
    borderRadius: 8, padding: '9px 12px',
    fontSize: 13, color: 'var(--t1)', fontFamily: 'var(--font-body)',
    outline: 'none', width: '100%', boxSizing: 'border-box',
  };
  const lbl: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: 'var(--t2)',
    display: 'block', marginBottom: 5,
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--card)', borderRadius: 16,
        border: '1px solid var(--b1)', width: '100%', maxWidth: 540,
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px 16px', borderBottom: '1px solid var(--b1)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>{form.icon || '💳'}</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--t1)' }}>
              {isEdit ? 'Edit Subscription' : 'Add Subscription'}
            </span>
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 7, background: 'var(--bg-raised)',
            border: '1px solid var(--b1)', cursor: 'pointer', fontSize: 14, color: 'var(--t3)',
          }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 24 }}>
          {/* Icon & Color row */}
          <div style={{ marginBottom: 16 }}>
            <label style={lbl}>Icon & Color</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              {PRESET_ICONS.map(ic => (
                <button key={ic} type="button" onClick={() => set('icon', ic)}
                  style={{
                    width: 34, height: 34, borderRadius: 8, fontSize: 18,
                    border: form.icon === ic ? '2px solid var(--amber)' : '1px solid var(--b1)',
                    background: form.icon === ic ? 'var(--amber-glow)' : 'var(--bg-raised)',
                    cursor: 'pointer',
                  }}>{ic}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {PRESET_COLORS.map(c => (
                <button key={c} type="button" onClick={() => set('color', c)}
                  style={{
                    width: 24, height: 24, borderRadius: '50%', background: c,
                    border: form.color === c ? '2px solid var(--t1)' : '2px solid transparent',
                    cursor: 'pointer', outline: 'none',
                  }} />
              ))}
            </div>
          </div>

          {/* Name */}
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Service Name *</label>
            <input style={inp} placeholder="e.g. Netflix, Spotify, AWS…" value={form.name}
              onChange={e => set('name', e.target.value)} required />
          </div>

          {/* Category */}
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Category</label>
            <select style={{ ...inp, cursor: 'pointer' }} value={form.category}
              onChange={e => set('category', e.target.value)}>
              <option value="">Select category…</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Price & Currency & Billing Cycle */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 1fr', gap: 10, marginBottom: 14 }}>
            <div>
              <label style={lbl}>Price *</label>
              <input style={inp} type="number" min="0" step="0.01" placeholder="0.00"
                value={form.price} onChange={e => set('price', e.target.value)} required />
            </div>
            <div>
              <label style={lbl}>Currency</label>
              <select style={{ ...inp, cursor: 'pointer', padding: '9px 6px' }} value={form.currency}
                onChange={e => set('currency', e.target.value)}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Billing Cycle *</label>
              <select style={{ ...inp, cursor: 'pointer' }} value={form.billing_cycle}
                onChange={e => set('billing_cycle', e.target.value as BillingCycle)}>
                {BILLING_CYCLES.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
              </select>
            </div>
          </div>

          {/* Status */}
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Status</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {STATUSES.map(s => (
                <button key={s.value} type="button" onClick={() => set('status', s.value)}
                  style={{
                    padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                    border: `1px solid ${form.status === s.value ? s.color : 'var(--b1)'}`,
                    background: form.status === s.value ? s.bg : 'var(--bg-raised)',
                    color: form.status === s.value ? s.color : 'var(--t3)',
                    cursor: 'pointer',
                  }}>{s.label}</button>
              ))}
            </div>
          </div>

          {/* Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div>
              <label style={lbl}>Start Date *</label>
              <input style={inp} type="date" value={form.start_date}
                onChange={e => set('start_date', e.target.value)} required />
            </div>
            <div>
              <label style={lbl}>Next Billing Date</label>
              <input style={inp} type="date" value={form.next_billing_date}
                onChange={e => set('next_billing_date', e.target.value)} />
            </div>
          </div>

          {form.status === 'trial' && (
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Trial End Date</label>
              <input style={inp} type="date" value={form.trial_end_date}
                onChange={e => set('trial_end_date', e.target.value)} />
            </div>
          )}

          {/* Reminder */}
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Remind me (days before billing)</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {[0, 1, 2, 3, 5, 7, 14].map(d => (
                <button key={d} type="button" onClick={() => set('reminder_days_before', d)}
                  style={{
                    padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    border: `1px solid ${form.reminder_days_before === d ? 'var(--amber)' : 'var(--b1)'}`,
                    background: form.reminder_days_before === d ? 'var(--amber-glow)' : 'var(--bg-raised)',
                    color: form.reminder_days_before === d ? 'var(--amber)' : 'var(--t3)',
                    cursor: 'pointer',
                  }}>{d === 0 ? 'Off' : `${d}d`}</button>
              ))}
            </div>
          </div>

          {/* Website */}
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Website</label>
            <input style={inp} type="url" placeholder="https://…" value={form.website}
              onChange={e => set('website', e.target.value)} />
          </div>

          {/* Notes */}
          <div style={{ marginBottom: 20 }}>
            <label style={lbl}>Notes</label>
            <textarea style={{ ...inp, resize: 'vertical', minHeight: 72 }} placeholder="Any notes…"
              value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" disabled={saving}
              style={{
                flex: 1, padding: '11px 0', borderRadius: 10,
                background: 'var(--amber)', color: '#fff',
                border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700,
                opacity: saving ? 0.6 : 1,
              }}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Subscription'}
            </button>
            <button type="button" onClick={onClose}
              style={{
                padding: '11px 18px', borderRadius: 10,
                background: 'var(--bg-raised)', border: '1px solid var(--b1)',
                cursor: 'pointer', fontFamily: 'var(--font-body)',
                fontSize: 13, fontWeight: 600, color: 'var(--t3)',
              }}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────
function SubCard({
  sub,
  onEdit,
  onCancel,
  onPause,
  onResume,
  onDelete,
}: {
  sub: UserSub;
  onEdit:   () => void;
  onCancel: () => void;
  onPause:  () => void;
  onResume: () => void;
  onDelete: () => void;
}) {
  const status  = getStatus(sub.status);
  const price   = parseFloat(sub.price);
  const norm    = normalizePrice(price, sub.billingCycle);
  const days    = daysUntil(sub.nextBillingDate);
  const [menu, setMenu] = useState(false);

  const isDueSoon = days !== null && days >= 0 && days <= 7;
  const isOverdue = days !== null && days < 0;

  return (
    <div style={{
      background: 'var(--card)', border: `1px solid ${sub.color ?? 'var(--b1)'}22`,
      borderLeft: `3px solid ${sub.color ?? 'var(--b1)'}`,
      borderRadius: 12, padding: '16px 18px',
      position: 'relative',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {/* Icon */}
        <div style={{
          width: 42, height: 42, borderRadius: 10, flexShrink: 0,
          background: `${sub.color ?? '#6366f1'}18`,
          border: `1px solid ${sub.color ?? '#6366f1'}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
        }}>{sub.icon ?? '💳'}</div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: 'var(--t1)' }}>
              {sub.name}
            </span>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
              color: status.color, background: status.bg,
            }}>{status.label.toUpperCase()}</span>
            {sub.category && (
              <span style={{ fontSize: 10, color: 'var(--t4)', background: 'var(--bg-raised)', padding: '2px 8px', borderRadius: 20 }}>
                {sub.category}
              </span>
            )}
          </div>

          {/* Price row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--t1)', fontFamily: 'var(--font-display)' }}>
              {fmtCurrency(price, sub.currency)}
              <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--t3)', marginLeft: 3 }}>
                / {BILLING_CYCLES.find(b => b.value === sub.billingCycle)?.label}
              </span>
            </span>
            <div style={{ display: 'flex', gap: 10 }}>
              <span style={{ fontSize: 11, color: 'var(--t3)' }}>
                ~{fmtCurrency(norm.monthly, sub.currency)}<span style={{ color: 'var(--t4)' }}>/mo</span>
              </span>
              <span style={{ fontSize: 11, color: 'var(--t3)' }}>
                ~{fmtCurrency(norm.yearly, sub.currency)}<span style={{ color: 'var(--t4)' }}>/yr</span>
              </span>
            </div>
          </div>

          {/* Dates */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {sub.nextBillingDate && (
              <span style={{
                fontSize: 11, fontWeight: 600,
                color: isOverdue ? '#ef4444' : isDueSoon ? '#f59e0b' : 'var(--t3)',
              }}>
                {isOverdue
                  ? `Overdue by ${Math.abs(days!)}d`
                  : days === 0
                  ? '📅 Due today'
                  : isDueSoon
                  ? `📅 Due in ${days}d (${fmtDate(sub.nextBillingDate)})`
                  : `Next: ${fmtDate(sub.nextBillingDate)}`}
              </span>
            )}
            {sub.reminderId && (
              <span style={{ fontSize: 10, color: 'var(--t4)' }}>🔔 Reminder set</span>
            )}
          </div>
        </div>

        {/* Menu */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button onClick={() => setMenu(m => !m)} style={{
            width: 28, height: 28, borderRadius: 7, background: 'var(--bg-raised)',
            border: '1px solid var(--b1)', cursor: 'pointer', fontSize: 16, color: 'var(--t3)',
          }}>⋯</button>
          {menu && (
            <div style={{
              position: 'absolute', top: 32, right: 0, zIndex: 10,
              background: 'var(--card)', border: '1px solid var(--b1)',
              borderRadius: 10, minWidth: 140, boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
              overflow: 'hidden',
            }} onMouseLeave={() => setMenu(false)}>
              {[
                { label: '✏️ Edit',   action: onEdit },
                ...(sub.status === 'active' || sub.status === 'trial'
                  ? [{ label: '⏸ Pause',   action: onPause }]
                  : []),
                ...(sub.status === 'paused'
                  ? [{ label: '▶️ Resume',  action: onResume }]
                  : []),
                ...(sub.status !== 'cancelled'
                  ? [{ label: '🚫 Cancel',  action: onCancel }]
                  : []),
                { label: '🗑 Delete',  action: onDelete },
              ].map(({ label, action }) => (
                <button key={label} onClick={() => { action(); setMenu(false); }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '10px 14px', background: 'none', border: 'none',
                    cursor: 'pointer', fontSize: 12, fontWeight: 500, color: 'var(--t2)',
                    fontFamily: 'var(--font-body)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-raised)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >{label}</button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SubscriptionsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<SubStatus | 'all'>('all');
  const [search, setSearch]             = useState('');
  const [showModal, setShowModal]       = useState(false);
  const [editSub, setEditSub]           = useState<UserSub | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<UserSub | null>(null);

  // ── Data fetching ──────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['user-subscriptions', filterStatus, search],
    queryFn: () => api.userSubscriptions.list({
      status: filterStatus === 'all' ? undefined : filterStatus,
      search: search || undefined,
      limit: 100,
    }),
  });

  const subs: UserSub[]    = data?.data ?? [];
  const stats              = data?.stats ?? { totalMonthly: 0, totalYearly: 0, activeCount: 0 };

  // ── Mutations ──────────────────────────────────────────────────────────────
  const invalidate = () => qc.invalidateQueries({ queryKey: ['user-subscriptions'] });

  const createMut = useMutation({
    mutationFn: (d: Record<string, unknown>) => api.userSubscriptions.create(d),
    onSuccess: () => { toast.success('Subscription added!'); invalidate(); setShowModal(false); },
    onError:   () => toast.error('Failed to add subscription'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.userSubscriptions.update(id, data),
    onSuccess: () => { toast.success('Subscription updated!'); invalidate(); setEditSub(null); },
    onError:   () => toast.error('Failed to update subscription'),
  });

  const cancelMut = useMutation({
    mutationFn: (id: string) => api.userSubscriptions.cancel(id),
    onSuccess: () => { toast.success('Subscription cancelled'); invalidate(); },
    onError:   () => toast.error('Failed to cancel'),
  });

  const pauseMut = useMutation({
    mutationFn: (id: string) => api.userSubscriptions.pause(id),
    onSuccess: () => { toast.success('Subscription paused'); invalidate(); },
    onError:   () => toast.error('Failed to pause'),
  });

  const resumeMut = useMutation({
    mutationFn: (id: string) => api.userSubscriptions.resume(id),
    onSuccess: () => { toast.success('Subscription resumed'); invalidate(); },
    onError:   () => toast.error('Failed to resume'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.userSubscriptions.delete(id),
    onSuccess: () => { toast.success('Subscription deleted'); invalidate(); setDeleteConfirm(null); },
    onError:   () => toast.error('Failed to delete'),
  });

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return subs.filter(s => {
      if (filterStatus !== 'all' && s.status !== filterStatus) return false;
      if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [subs, filterStatus, search]);

  // ── Upcoming this week ─────────────────────────────────────────────────────
  const upcomingCount = subs.filter(s => {
    const d = daysUntil(s.nextBillingDate);
    return d !== null && d >= 0 && d <= 7 && (s.status === 'active' || s.status === 'trial');
  }).length;

  const s: React.CSSProperties = {};
  const cardBg: React.CSSProperties = {
    background: 'var(--card)', border: '1px solid var(--b1)',
    borderRadius: 12, padding: '18px 20px',
  };

  return (
    <>
      {/* ── Topbar ──────────────────────────────────────────────────────────── */}
      <div style={{
        background: 'rgba(20,18,16,0.85)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--b1)', padding: '0 26px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 40, flexShrink: 0,
      }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 500, color: 'var(--t1)' }}>
            💳 Subscriptions
          </div>
          <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 1 }}>
            Track and manage all your recurring payments
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={() => router.push('/dashboard')} style={{
            padding: '7px 14px', borderRadius: 8, border: '1px solid var(--b1)',
            background: 'var(--card)', cursor: 'pointer', fontFamily: 'var(--font-body)',
            fontSize: 12, fontWeight: 600, color: 'var(--t2)',
          }}>← Dashboard</button>
          <button onClick={() => { setEditSub(null); setShowModal(true); }} style={{
            padding: '7px 16px', borderRadius: 8, border: 'none',
            background: 'var(--amber)', color: '#fff', cursor: 'pointer',
            fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 700,
          }}>+ Add Subscription</button>
        </div>
      </div>

      <div style={{ padding: '24px 26px', flex: 1 }}>
        {/* ── Stats row ───────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
          {[
            {
              label: 'Monthly Cost',
              value: fmtCurrency(stats.totalMonthly, 'USD'),
              sub:   'active subscriptions',
              icon:  '📅',
              color: '#6366f1',
            },
            {
              label: 'Yearly Cost',
              value: fmtCurrency(stats.totalYearly, 'USD'),
              sub:   'annual spend',
              icon:  '📊',
              color: '#8b5cf6',
            },
            {
              label: 'Active',
              value: String(stats.activeCount),
              sub:   'subscriptions',
              icon:  '✅',
              color: '#10b981',
            },
            {
              label: 'Due This Week',
              value: String(upcomingCount),
              sub:   'upcoming payments',
              icon:  '⚠️',
              color: upcomingCount > 0 ? '#f59e0b' : 'var(--t3)',
            },
          ].map(card => (
            <div key={card.label} style={{ ...cardBg }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 18 }}>{card.icon}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {card.label}
                </span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: card.color, fontFamily: 'var(--font-display)', marginBottom: 2 }}>
                {card.value}
              </div>
              <div style={{ fontSize: 11, color: 'var(--t4)' }}>{card.sub}</div>
            </div>
          ))}
        </div>

        {/* ── Search & filters ────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 18, flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--card)', border: '1px solid var(--b1)',
            borderRadius: 8, padding: '8px 12px', flex: '1 1 200px',
          }}>
            <span style={{ color: 'var(--t3)', fontSize: 13 }}>⌕</span>
            <input
              type="text" placeholder="Search subscriptions…" value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                background: 'none', border: 'none', outline: 'none',
                fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--t1)', width: '100%',
              }}
            />
          </div>

          {/* Status pills */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[{ value: 'all', label: 'All' }, ...STATUSES].map(s => {
              const active = filterStatus === s.value;
              const st     = STATUSES.find(x => x.value === s.value);
              return (
                <button key={s.value}
                  onClick={() => setFilterStatus(s.value as SubStatus | 'all')}
                  style={{
                    padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                    border: `1px solid ${active && st ? st.color : active ? 'var(--amber)' : 'var(--b1)'}`,
                    background: active ? (st?.bg ?? 'var(--amber-glow)') : 'var(--card)',
                    color: active ? (st?.color ?? 'var(--amber)') : 'var(--t3)',
                    cursor: 'pointer',
                  }}>
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── List ────────────────────────────────────────────────────────── */}
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--t3)' }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>💳</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--t2)', marginBottom: 6 }}>
              No subscriptions yet
            </div>
            <div style={{ fontSize: 13, color: 'var(--t4)', marginBottom: 20 }}>
              Add your first subscription to start tracking costs and due dates.
            </div>
            <button onClick={() => { setEditSub(null); setShowModal(true); }} style={{
              padding: '10px 24px', borderRadius: 10, background: 'var(--amber)',
              border: 'none', color: '#fff', cursor: 'pointer',
              fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700,
            }}>+ Add Subscription</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 12 }}>
            {filtered.map(sub => (
              <SubCard
                key={sub.id}
                sub={sub}
                onEdit={() => { setEditSub(sub); setShowModal(true); }}
                onCancel={() => cancelMut.mutate(sub.id)}
                onPause={() => pauseMut.mutate(sub.id)}
                onResume={() => resumeMut.mutate(sub.id)}
                onDelete={() => setDeleteConfirm(sub)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Create/Edit Modal ──────────────────────────────────────────────── */}
      {showModal && (
        <SubModal
          sub={editSub}
          onClose={() => { setShowModal(false); setEditSub(null); }}
          onSave={data =>
            editSub
              ? updateMut.mutate({ id: editSub.id, data })
              : createMut.mutate(data)
          }
          saving={createMut.isPending || updateMut.isPending}
        />
      )}

      {/* ── Delete Confirm ──────────────────────────────────────────────────── */}
      {deleteConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 300,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }}>
          <div style={{
            background: 'var(--card)', borderRadius: 14, padding: 28,
            border: '1px solid var(--b1)', maxWidth: 380, width: '100%',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          }}>
            <div style={{ fontSize: 24, marginBottom: 12 }}>🗑</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--t1)', marginBottom: 8 }}>
              Delete "{deleteConfirm.name}"?
            </div>
            <div style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 22 }}>
              This will permanently remove the subscription and its associated reminder. This cannot be undone.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => deleteMut.mutate(deleteConfirm.id)}
                disabled={deleteMut.isPending}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 10, border: 'none',
                  background: '#ef4444', color: '#fff', cursor: 'pointer',
                  fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700,
                }}>
                {deleteMut.isPending ? 'Deleting…' : 'Delete'}
              </button>
              <button onClick={() => setDeleteConfirm(null)} style={{
                padding: '10px 18px', borderRadius: 10,
                background: 'var(--bg-raised)', border: '1px solid var(--b1)',
                cursor: 'pointer', fontFamily: 'var(--font-body)',
                fontSize: 13, fontWeight: 600, color: 'var(--t3)',
              }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
