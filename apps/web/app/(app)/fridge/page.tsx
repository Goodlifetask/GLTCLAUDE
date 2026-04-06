'use client';
import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../store/auth';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
  fresh:         { label: 'Fresh',         color: '#16a34a', bg: '#f0fdf4', emoji: '🟢' },
  use_soon:      { label: 'Use Soon',      color: '#d97706', bg: '#fffbeb', emoji: '🟡' },
  expiring_soon: { label: 'Expiring Soon', color: '#dc2626', bg: '#fef2f2', emoji: '🔴' },
  expired:       { label: 'Expired',       color: '#6b7280', bg: '#f9fafb', emoji: '⚫' },
  donated:       { label: 'Donated',       color: '#7c3aed', bg: '#f5f3ff', emoji: '💜' },
  used:          { label: 'Used',          color: '#0284c7', bg: '#eff6ff', emoji: '✅' },
  discarded:     { label: 'Discarded',     color: '#6b7280', bg: '#f9fafb', emoji: '🗑️' },
};

const STORAGE_META = {
  fridge:  { label: 'Fridge',  emoji: '🧊', color: '#0284c7', bg: '#eff6ff' },
  freezer: { label: 'Freezer', emoji: '❄️', color: '#7c3aed', bg: '#f5f3ff' },
};

const ACTION_TABS = [
  { id: 'all',      label: '🧊 All Items' },
  { id: 'expiring', label: '⚠️ Expiring' },
  { id: 'capture',  label: '📷 Add Food' },
  { id: 'family',   label: '👨‍👩‍👧 Family' },
];

const EXPIRY_OFFSET_DAYS = [7, 3, 1, 0];

// ─── Helper: format date ──────────────────────────────────────────────────────
function fmtDate(d: string | null | undefined): string {
  if (!d) return 'No date';
  const date = new Date(d);
  const now = new Date();
  const diff = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0)   return `Expired ${Math.abs(diff)}d ago`;
  if (diff === 0) return 'Expires today';
  if (diff === 1) return 'Tomorrow';
  if (diff <= 7)  return `${diff} days left`;
  return date.toLocaleDateString();
}

function daysLeft(d: string | null | undefined): number {
  if (!d) return 999;
  return Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

// ─── ItemCard ─────────────────────────────────────────────────────────────────
function ItemCard({
  item,
  onEdit,
  onDelete,
  onStatusChange,
  onMove,
  onNotifyFamily,
  showFamily,
}: {
  item: any;
  onEdit: (item: any) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
  onMove: (id: string, to: 'fridge' | 'freezer') => void;
  onNotifyFamily: (id: string) => void;
  showFamily?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const sm = STATUS_META[item.status] ?? STATUS_META.fresh;
  const stm = STORAGE_META[item.storageType as 'fridge' | 'freezer'] ?? STORAGE_META.fridge;
  const dl = daysLeft(item.expirationDate);
  const isUrgent = dl <= 3 && dl >= 0;
  const isExpired = dl < 0;

  return (
    <div
      style={{
        background: 'var(--card)',
        border: `1px solid ${isUrgent ? '#fca5a5' : isExpired ? '#d1d5db' : 'var(--b1)'}`,
        borderRadius: 12,
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        opacity: ['used', 'donated', 'discarded'].includes(item.status) ? 0.6 : 1,
        transition: 'all 0.15s',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ fontSize: 28, lineHeight: 1 }}>{stm.emoji}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--t1)', lineHeight: 1.3 }}>
            {item.name}
          </div>
          {item.quantity && (
            <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 2 }}>{item.quantity}</div>
          )}
          {showFamily && item.user && (
            <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>
              Added by {item.user.name}
            </div>
          )}
        </div>

        {/* Actions menu */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => setMenuOpen(v => !v)}
            style={{
              width: 28, height: 28, borderRadius: 7,
              background: 'var(--bg)', border: '1px solid var(--b1)',
              cursor: 'pointer', fontSize: 16, color: 'var(--t3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >⋯</button>
          {menuOpen && (
            <div
              style={{
                position: 'absolute', top: '100%', right: 0, zIndex: 100,
                background: 'var(--card)', border: '1px solid var(--b1)',
                borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                minWidth: 170, overflow: 'hidden',
              }}
              onMouseLeave={() => setMenuOpen(false)}
            >
              {[
                { label: '✏️ Edit',               action: () => { onEdit(item); setMenuOpen(false); } },
                { label: '✅ Mark Used',           action: () => { onStatusChange(item.id, 'used'); setMenuOpen(false); } },
                { label: '💜 Mark Donated',        action: () => { onStatusChange(item.id, 'donated'); setMenuOpen(false); } },
                { label: '🗑️ Mark Discarded',      action: () => { onStatusChange(item.id, 'discarded'); setMenuOpen(false); } },
                item.storageType === 'fridge'
                  ? { label: '❄️ Move to Freezer', action: () => { onMove(item.id, 'freezer'); setMenuOpen(false); } }
                  : { label: '🧊 Move to Fridge',  action: () => { onMove(item.id, 'fridge'); setMenuOpen(false); } },
                { label: '🔔 Notify Family',       action: () => { onNotifyFamily(item.id); setMenuOpen(false); } },
                { label: '🗑 Delete',               action: () => { onDelete(item.id); setMenuOpen(false); } },
              ].map(m => (
                <div
                  key={m.label}
                  onClick={m.action}
                  style={{
                    padding: '9px 14px', fontSize: 13, cursor: 'pointer',
                    color: m.label.includes('Delete') ? '#ef4444' : 'var(--t1)',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {m.label}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Status + expiry row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={{
          fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 5,
          background: sm.bg, color: sm.color,
        }}>{sm.emoji} {sm.label}</span>
        <span style={{
          fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 5,
          background: stm.bg, color: stm.color,
        }}>{stm.emoji} {stm.label}</span>
        {item.expiryType === 'estimated' && (
          <span style={{ fontSize: 10, color: 'var(--t3)', fontStyle: 'italic' }}>~est.</span>
        )}
        <span style={{
          fontSize: 11, color: isUrgent ? '#dc2626' : isExpired ? '#6b7280' : 'var(--t3)',
          fontWeight: isUrgent ? 700 : 400,
          marginLeft: 'auto',
        }}>
          📅 {fmtDate(item.expirationDate)}
        </span>
      </div>

      {/* Recommendations */}
      {item.status === 'use_soon' && (
        <div style={{ fontSize: 12, color: '#d97706', background: '#fffbeb', borderRadius: 6, padding: '5px 10px' }}>
          💡 Use or freeze soon to reduce waste
        </div>
      )}
      {item.status === 'expiring_soon' && (
        <div style={{ fontSize: 12, color: '#dc2626', background: '#fef2f2', borderRadius: 6, padding: '5px 10px' }}>
          ⚠️ Expiring soon — cook today, donate, or freeze now
        </div>
      )}
      {item.status === 'expired' && (
        <div style={{ fontSize: 12, color: '#6b7280', background: '#f9fafb', borderRadius: 6, padding: '5px 10px' }}>
          🗑️ Check if still safe or discard
        </div>
      )}
    </div>
  );
}

// ─── EditModal ────────────────────────────────────────────────────────────────
function EditModal({
  item,
  onClose,
  onSave,
}: { item: any | null; onClose: () => void; onSave: (data: any) => void }) {
  const isNew = !item?.id;
  const [name, setName]       = useState(item?.name ?? '');
  const [qty, setQty]         = useState(item?.quantity ?? '');
  const [storage, setStorage] = useState<'fridge' | 'freezer'>(item?.storageType ?? 'fridge');
  const [expDate, setExpDate] = useState(
    item?.expirationDate ? new Date(item.expirationDate).toISOString().slice(0, 10) : '',
  );
  const [expiryType, setExpiryType] = useState<'exact' | 'estimated'>(item?.expiryType ?? 'estimated');
  const [notes, setNotes]     = useState(item?.notes ?? '');

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: '1px solid var(--b1)', background: 'var(--bg)',
    fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--t1)',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--t2)', marginBottom: 5,
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: 'var(--card)', borderRadius: 16, padding: 24,
        width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--t1)' }}>
            {isNew ? '🧊 Add Food Item' : '✏️ Edit Item'}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--t3)' }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>Food Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. milk, chicken, spinach" style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Quantity</label>
            <input value={qty} onChange={e => setQty(e.target.value)} placeholder="e.g. 1 carton, 500g, 3 items" style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Storage Location</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['fridge', 'freezer'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setStorage(s)}
                  style={{
                    flex: 1, padding: '9px 12px', borderRadius: 8, cursor: 'pointer',
                    fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600,
                    border: `2px solid ${storage === s ? STORAGE_META[s].color : 'var(--b1)'}`,
                    background: storage === s ? STORAGE_META[s].bg : 'var(--bg)',
                    color: storage === s ? STORAGE_META[s].color : 'var(--t2)',
                    transition: 'all 0.15s',
                  }}
                >
                  {STORAGE_META[s].emoji} {STORAGE_META[s].label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={labelStyle}>Expiration Date</label>
            <input type="date" value={expDate} onChange={e => setExpDate(e.target.value)} style={inputStyle} />
            <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
              {(['exact', 'estimated'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setExpiryType(t)}
                  style={{
                    padding: '5px 12px', borderRadius: 6, cursor: 'pointer',
                    fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
                    border: `1px solid ${expiryType === t ? 'var(--amber)' : 'var(--b1)'}`,
                    background: expiryType === t ? 'var(--amber-glow)' : 'var(--bg)',
                    color: expiryType === t ? 'var(--amber)' : 'var(--t3)',
                  }}
                >
                  {t === 'exact' ? '📌 Exact' : '~️ Estimated'}
                </button>
              ))}
            </div>
            {!expDate && (
              <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4 }}>
                Leave blank to auto-estimate based on food type
              </div>
            )}
          </div>

          <div>
            <label style={labelStyle}>Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Optional notes…"
              rows={2}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '10px', borderRadius: 10,
              border: '1px solid var(--b1)', background: 'var(--bg)',
              cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--t2)',
            }}
          >Cancel</button>
          <button
            onClick={() => {
              if (!name.trim()) return;
              onSave({
                name: name.trim(),
                quantity: qty.trim() || undefined,
                storage_type: storage,
                expiration_date: expDate ? new Date(expDate).toISOString() : undefined,
                expiry_type: expDate ? expiryType : 'estimated',
                notes: notes.trim() || undefined,
              });
            }}
            style={{
              flex: 2, padding: '10px', borderRadius: 10,
              border: 'none', background: 'var(--amber)', color: '#fff',
              cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700,
            }}
          >
            {isNew ? '➕ Add Item' : '💾 Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CaptureTab ───────────────────────────────────────────────────────────────
function CaptureTab({ onItemsAdded }: { onItemsAdded: () => void }) {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const fileRef  = useRef<HTMLInputElement>(null);
  const camRef   = useRef<HTMLInputElement>(null);

  const [step, setStep]         = useState<'idle' | 'analyzing' | 'review' | 'saving'>('idle');
  const [preview, setPreview]   = useState<string | null>(null);
  const [capture, setCapture]   = useState<string | null>(null); // server URL
  const [detected, setDetected] = useState<any[]>([]);
  const [edits, setEdits]       = useState<Record<number, any>>({});
  const [error, setError]       = useState<string | null>(null);
  const [familyId, setFamilyId] = useState<string | undefined>();

  // Fetch family group if applicable
  useQuery({
    queryKey: ['family-me'],
    queryFn: () => api.family.get(),
    retry: false,
    onSuccess: (d: any) => setFamilyId(d?.data?.id),
  } as any);

  const analyzeMut = useMutation({
    mutationFn: (file: File) => api.fridge.analyze(file),
    onSuccess: (res: any) => {
      setCapture(res.captureImageUrl);
      const items = (res.items ?? []).map((it: any, i: number) => ({
        ...it,
        storage_type: it.storageType,
        idx: i,
      }));
      setDetected(items);
      setEdits({});
      setStep('review');
    },
    onError: () => {
      setError('Could not analyze image. Please try again.');
      setStep('idle');
    },
  });

  const saveMut = useMutation({
    mutationFn: (items: any[]) =>
      api.fridge.saveBatch({
        capture_image_url: capture ?? undefined,
        family_group_id:   familyId,
        items,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fridge-items'] });
      qc.invalidateQueries({ queryKey: ['fridge-stats'] });
      setStep('idle');
      setPreview(null);
      setDetected([]);
      onItemsAdded();
    },
    onError: () => setError('Failed to save items. Please try again.'),
  });

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }
    setError(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    setStep('analyzing');
    analyzeMut.mutate(file);
  }, [analyzeMut]);

  const merged = detected.map((it, i) => ({ ...it, ...(edits[i] ?? {}) }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {step === 'idle' && (
        <>
          {/* Upload area */}
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              border: '2px dashed var(--b1)', borderRadius: 16, padding: '40px 24px',
              textAlign: 'center', cursor: 'pointer',
              background: 'var(--bg)', transition: 'all 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--amber)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--b1)')}
          >
            <div style={{ fontSize: 48, marginBottom: 12 }}>📷</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--t1)', marginBottom: 6 }}>
              Take or upload a fridge photo
            </div>
            <div style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 16 }}>
              We'll identify food items and estimate expiry dates
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={e => { e.stopPropagation(); camRef.current?.click(); }}
                style={{
                  padding: '9px 20px', borderRadius: 10, border: 'none',
                  background: 'var(--amber)', color: '#fff',
                  cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700,
                }}
              >📸 Camera</button>
              <button
                style={{
                  padding: '9px 20px', borderRadius: 10,
                  border: '1px solid var(--b1)', background: 'var(--card)',
                  cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--t2)',
                }}
              >🖼 Upload Photo</button>
            </div>
          </div>

          <input ref={fileRef}   type="file" accept="image/*"            hidden onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          <input ref={camRef}    type="file" accept="image/*" capture="environment" hidden onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />

          {error && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', borderRadius: 8, fontSize: 13, color: '#dc2626' }}>
              ⚠️ {error}
            </div>
          )}
        </>
      )}

      {step === 'analyzing' && (
        <div style={{ textAlign: 'center', padding: '40px 24px' }}>
          {preview && (
            <img src={preview} alt="Analyzing…" style={{ width: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 12, marginBottom: 20 }} />
          )}
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--t1)', marginBottom: 6 }}>Identifying food items…</div>
          <div style={{ fontSize: 13, color: 'var(--t3)' }}>Analyzing image and estimating expiry dates</div>
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', gap: 4 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: 8, height: 8, borderRadius: '50%', background: 'var(--amber)',
                animation: `glt-pulse 1s ${i * 0.3}s ease-in-out infinite`,
              }} />
            ))}
          </div>
        </div>
      )}

      {step === 'review' && (
        <>
          {preview && (
            <img src={preview} alt="Captured" style={{ width: '100%', maxHeight: 180, objectFit: 'contain', borderRadius: 12 }} />
          )}
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--t1)' }}>
            🎉 {merged.length} items detected — review &amp; edit
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {merged.map((it, i) => (
              <div key={i} style={{
                background: 'var(--bg)', border: '1px solid var(--b1)', borderRadius: 10, padding: 12,
                display: 'flex', flexDirection: 'column', gap: 8,
              }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 20 }}>
                    {it.storage_type === 'freezer' ? '❄️' : '🧊'}
                  </span>
                  <input
                    value={edits[i]?.name ?? it.name}
                    onChange={e => setEdits(prev => ({ ...prev, [i]: { ...(prev[i] ?? {}), name: e.target.value } }))}
                    style={{
                      flex: 1, padding: '7px 10px', borderRadius: 7,
                      border: '1px solid var(--b1)', background: 'var(--card)',
                      fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--t1)',
                    }}
                  />
                  <button
                    onClick={() => setDetected(prev => prev.filter((_, j) => j !== i))}
                    style={{
                      width: 24, height: 24, borderRadius: 6, border: 'none',
                      background: '#fee2e2', color: '#dc2626', cursor: 'pointer', fontSize: 12,
                    }}
                  >✕</button>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input
                    value={edits[i]?.quantity ?? it.quantity ?? ''}
                    placeholder="Quantity"
                    onChange={e => setEdits(prev => ({ ...prev, [i]: { ...(prev[i] ?? {}), quantity: e.target.value } }))}
                    style={{
                      flex: 1, minWidth: 100, padding: '6px 10px', borderRadius: 7,
                      border: '1px solid var(--b1)', background: 'var(--card)',
                      fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--t1)',
                    }}
                  />
                  <select
                    value={edits[i]?.storage_type ?? it.storage_type ?? 'fridge'}
                    onChange={e => setEdits(prev => ({ ...prev, [i]: { ...(prev[i] ?? {}), storage_type: e.target.value } }))}
                    style={{
                      padding: '6px 10px', borderRadius: 7,
                      border: '1px solid var(--b1)', background: 'var(--card)',
                      fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--t1)',
                    }}
                  >
                    <option value="fridge">🧊 Fridge</option>
                    <option value="freezer">❄️ Freezer</option>
                  </select>
                </div>
                <div style={{ fontSize: 11, color: 'var(--t3)' }}>
                  Confidence: {Math.round((it.confidence ?? 0.8) * 100)}%
                </div>
              </div>
            ))}
          </div>

          {detected.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--t3)', fontSize: 13, padding: '20px' }}>
              All items removed — try a different photo.
            </div>
          )}

          {error && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', borderRadius: 8, fontSize: 13, color: '#dc2626' }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => { setStep('idle'); setPreview(null); setDetected([]); setError(null); }}
              style={{
                flex: 1, padding: '10px', borderRadius: 10,
                border: '1px solid var(--b1)', background: 'var(--bg)',
                cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--t2)',
              }}
            >↩ Retake</button>
            <button
              disabled={merged.length === 0 || saveMut.isPending}
              onClick={() => {
                if (merged.length === 0) return;
                setError(null);
                saveMut.mutate(merged.map(it => ({
                  name:         it.name,
                  quantity:     it.quantity || undefined,
                  storage_type: it.storage_type ?? 'fridge',
                })));
              }}
              style={{
                flex: 2, padding: '10px', borderRadius: 10, border: 'none',
                background: merged.length === 0 ? 'var(--bg)' : 'var(--amber)',
                color: merged.length === 0 ? 'var(--t3)' : '#fff',
                cursor: merged.length === 0 ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700,
              }}
            >
              {saveMut.isPending ? 'Saving…' : `💾 Save ${merged.length} Item${merged.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </>
      )}

      <style>{`@keyframes glt-pulse { 0%,100%{opacity:0.3;transform:scale(0.8)} 50%{opacity:1;transform:scale(1)} }`}</style>
    </div>
  );
}

// ─── StatsBar ─────────────────────────────────────────────────────────────────
function StatsBar({ stats }: { stats: any }) {
  if (!stats) return null;
  const items = [
    { key: 'fresh',         ...STATUS_META.fresh },
    { key: 'use_soon',      ...STATUS_META.use_soon },
    { key: 'expiring_soon', ...STATUS_META.expiring_soon },
    { key: 'expired',       ...STATUS_META.expired },
  ];
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      <div style={{
        flex: '1 1 auto', minWidth: 80,
        background: 'var(--card)', border: '1px solid var(--b1)', borderRadius: 10,
        padding: '12px 16px', textAlign: 'center',
      }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--t1)' }}>{stats.total ?? 0}</div>
        <div style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 600 }}>Total</div>
      </div>
      {items.map(it => (
        <div key={it.key} style={{
          flex: '1 1 auto', minWidth: 80,
          background: it.bg, border: `1px solid ${it.color}30`, borderRadius: 10,
          padding: '12px 16px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: it.color }}>{stats[it.key] ?? 0}</div>
          <div style={{ fontSize: 11, color: it.color, fontWeight: 600 }}>{it.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function FridgePage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const [tab, setTab]           = useState<'all' | 'expiring' | 'capture' | 'family'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [storageFilter, setStorageFilter] = useState<string>('all');
  const [editItem, setEditItem] = useState<any | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [toast, setToast]       = useState<string | null>(null);
  const isFamilyUser = user?.plan === 'family' || user?.profileCategory === 'family';

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: statsData } = useQuery({
    queryKey: ['fridge-stats'],
    queryFn: () => api.fridge.stats(),
    staleTime: 30_000,
  });
  const stats = statsData?.data;

  const listParams: Record<string, unknown> = { limit: 100 };
  if (statusFilter !== 'all') listParams.status = statusFilter;
  if (storageFilter !== 'all') listParams.storage_type = storageFilter;
  if (tab === 'expiring') listParams.expiring_within_days = 7;

  const { data: itemsData, isLoading } = useQuery({
    queryKey: ['fridge-items', tab, statusFilter, storageFilter],
    queryFn: () => api.fridge.list(listParams),
    staleTime: 30_000,
    enabled: tab !== 'capture' && tab !== 'family',
  });
  const items: any[] = itemsData?.data ?? [];

  const { data: familyData, isLoading: familyLoading } = useQuery({
    queryKey: ['fridge-family'],
    queryFn: () => api.fridge.family(),
    staleTime: 30_000,
    enabled: tab === 'family',
    retry: false,
  });
  const familyItems: any[] = familyData?.data ?? [];

  // ── Mutations ──────────────────────────────────────────────────────────────
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['fridge-items'] });
    qc.invalidateQueries({ queryKey: ['fridge-stats'] });
  };

  const createMut = useMutation({
    mutationFn: (data: any) => api.fridge.create({ ...data, family_group_id: undefined }),
    onSuccess: () => { invalidate(); setShowEdit(false); showToast('✅ Item added!'); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.fridge.update(id, data),
    onSuccess: () => { invalidate(); setShowEdit(false); showToast('✅ Item updated!'); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.fridge.delete(id),
    onSuccess: () => { invalidate(); showToast('🗑️ Item deleted'); },
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.fridge.setStatus(id, status),
    onSuccess: (_, { status }) => { invalidate(); showToast(`✅ Marked as ${STATUS_META[status]?.label ?? status}`); },
  });

  const moveMut = useMutation({
    mutationFn: ({ id, to }: { id: string; to: 'fridge' | 'freezer' }) => api.fridge.move(id, to),
    onSuccess: (_, { to }) => { invalidate(); showToast(`📦 Moved to ${to}`); },
  });

  const notifyMut = useMutation({
    mutationFn: (id: string) => api.fridge.notifyFamily(id),
    onSuccess: (res: any) => showToast(`🔔 Notified ${res?.notified ?? 0} family members`),
  });

  const handleSaveEdit = (data: any) => {
    if (editItem?.id) {
      updateMut.mutate({ id: editItem.id, data });
    } else {
      createMut.mutate(data);
    }
  };

  // ── Active tab items ───────────────────────────────────────────────────────
  const displayItems = tab === 'family' ? familyItems : items;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, color: 'var(--t1)', margin: 0 }}>
            🧊 Fridge
          </h1>
          <p style={{ fontSize: 13, color: 'var(--t3)', margin: '4px 0 0' }}>
            Track food, reduce waste, get expiry reminders
          </p>
        </div>
        <button
          onClick={() => { setEditItem(null); setShowEdit(true); }}
          style={{
            padding: '10px 18px', borderRadius: 10, border: 'none',
            background: 'var(--amber)', color: '#fff',
            cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          ➕ Add Item
        </button>
      </div>

      {/* Stats bar */}
      <div style={{ marginBottom: 20 }}>
        <StatsBar stats={stats} />
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 20,
        background: 'var(--bg)', borderRadius: 10, padding: 4,
        border: '1px solid var(--b1)', overflowX: 'auto',
      }}>
        {ACTION_TABS
          .filter(t => t.id !== 'family' || isFamilyUser)
          .map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            style={{
              flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none',
              background: tab === t.id ? 'var(--card)' : 'transparent',
              cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: tab === t.id ? 700 : 500,
              color: tab === t.id ? 'var(--amber)' : 'var(--t2)',
              boxShadow: tab === t.id ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s', whiteSpace: 'nowrap',
            }}
          >{t.label}</button>
        ))}
      </div>

      {/* Filters (shown on all/expiring/family tabs) */}
      {tab !== 'capture' && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{
              padding: '7px 12px', borderRadius: 8, border: '1px solid var(--b1)',
              background: 'var(--bg)', fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--t2)',
            }}
          >
            <option value="all">All Status</option>
            {Object.entries(STATUS_META).map(([k, v]) => (
              <option key={k} value={k}>{v.emoji} {v.label}</option>
            ))}
          </select>
          <select
            value={storageFilter}
            onChange={e => setStorageFilter(e.target.value)}
            style={{
              padding: '7px 12px', borderRadius: 8, border: '1px solid var(--b1)',
              background: 'var(--bg)', fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--t2)',
            }}
          >
            <option value="all">All Storage</option>
            <option value="fridge">🧊 Fridge</option>
            <option value="freezer">❄️ Freezer</option>
          </select>
        </div>
      )}

      {/* ── Tab content ──────────────────────────────────────────────── */}
      {tab === 'capture' ? (
        <CaptureTab onItemsAdded={() => setTab('all')} />
      ) : (
        <>
          {(isLoading || familyLoading) ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--t3)', fontSize: 14 }}>
              Loading…
            </div>
          ) : displayItems.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '60px 24px',
              background: 'var(--card)', borderRadius: 16, border: '1px solid var(--b1)',
            }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>
                {tab === 'expiring' ? '✅' : tab === 'family' ? '👨‍👩‍👧' : '🧊'}
              </div>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--t1)', marginBottom: 8 }}>
                {tab === 'expiring'
                  ? 'Nothing expiring soon'
                  : tab === 'family'
                  ? 'No family fridge items yet'
                  : 'Your fridge is empty'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 20 }}>
                {tab === 'family'
                  ? 'Family members can add items that will appear here'
                  : 'Add items manually or take a photo to get started'}
              </div>
              <button
                onClick={() => setTab('capture')}
                style={{
                  padding: '10px 24px', borderRadius: 10, border: 'none',
                  background: 'var(--amber)', color: '#fff',
                  cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700,
                }}
              >📷 Take a Photo</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {tab === 'family' && (
                <div style={{
                  padding: '10px 14px', background: 'var(--amber-glow)', borderRadius: 10,
                  fontSize: 13, color: 'var(--amber)', fontWeight: 600, border: '1px solid var(--amber)',
                }}>
                  👨‍👩‍👧 Showing shared family fridge — {displayItems.length} items
                </div>
              )}
              {displayItems.map((item: any) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  showFamily={tab === 'family'}
                  onEdit={it => { setEditItem(it); setShowEdit(true); }}
                  onDelete={id => deleteMut.mutate(id)}
                  onStatusChange={(id, status) => statusMut.mutate({ id, status })}
                  onMove={(id, to) => moveMut.mutate({ id, to })}
                  onNotifyFamily={id => notifyMut.mutate(id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Edit / Create Modal ──────────────────────────────────────── */}
      {showEdit && (
        <EditModal
          item={editItem}
          onClose={() => { setShowEdit(false); setEditItem(null); }}
          onSave={handleSaveEdit}
        />
      )}

      {/* ── Toast ────────────────────────────────────────────────────── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--card)', border: '1px solid var(--b1)',
          borderRadius: 10, padding: '10px 20px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          fontSize: 13, fontWeight: 600, color: 'var(--t1)',
          zIndex: 2000, whiteSpace: 'nowrap',
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}
