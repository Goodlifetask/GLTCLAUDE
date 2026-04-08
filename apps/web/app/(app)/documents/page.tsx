'use client';
import { useState, useRef, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { api } from '../../../lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────
type DocType =
  | 'passport' | 'drivers_license' | 'national_id' | 'visa' | 'insurance'
  | 'vehicle_registration' | 'health_card' | 'work_permit' | 'residence_permit'
  | 'professional_license' | 'birth_certificate' | 'marriage_certificate'
  | 'tax_document' | 'other';

interface UserDocument {
  id:               string;
  name:             string;
  docType:          DocType;
  documentNumber?:  string;
  holderName?:      string;
  issuingAuthority?:string;
  issuingCountry?:  string;
  issueDate?:       string;
  expiryDate?:      string;
  notes?:           string;
  imagePath?:       string;
  reminderIds:      string[];
  daysUntilExpiry?: number | null;
  createdAt:        string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const DOC_TYPES: { value: DocType; label: string; icon: string; color: string }[] = [
  { value: 'passport',             label: 'Passport',              icon: '🛂', color: '#6366f1' },
  { value: 'drivers_license',      label: "Driver's License",      icon: '🚗', color: '#f59e0b' },
  { value: 'national_id',          label: 'National ID',           icon: '🪪', color: '#10b981' },
  { value: 'visa',                 label: 'Visa',                  icon: '✈️', color: '#0ea5e9' },
  { value: 'insurance',            label: 'Insurance',             icon: '🛡️', color: '#8b5cf6' },
  { value: 'vehicle_registration', label: 'Vehicle Registration',  icon: '🚙', color: '#f97316' },
  { value: 'health_card',          label: 'Health Card',           icon: '🏥', color: '#ec4899' },
  { value: 'work_permit',          label: 'Work Permit',           icon: '💼', color: '#14b8a6' },
  { value: 'residence_permit',     label: 'Residence Permit',      icon: '🏠', color: '#84cc16' },
  { value: 'professional_license', label: 'Professional License',  icon: '📜', color: '#a78bfa' },
  { value: 'birth_certificate',    label: 'Birth Certificate',     icon: '👶', color: '#fb923c' },
  { value: 'marriage_certificate', label: 'Marriage Certificate',  icon: '💍', color: '#f43f5e' },
  { value: 'tax_document',         label: 'Tax Document',          icon: '📊', color: '#22d3ee' },
  { value: 'other',                label: 'Other',                 icon: '📄', color: '#64748b' },
];

function getDocMeta(type: DocType) {
  return DOC_TYPES.find(d => d.value === type) ?? DOC_TYPES[DOC_TYPES.length - 1];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function urgencyStyle(days: number | null | undefined): { color: string; bg: string; label: string } {
  if (days === null || days === undefined) return { color: 'var(--t3)', bg: 'var(--bg-raised)', label: 'No expiry' };
  if (days < 0)   return { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   label: 'Expired'                  };
  if (days === 0) return { color: '#ef4444', bg: 'rgba(239,68,68,0.15)',  label: 'Expires TODAY'             };
  if (days <= 7)  return { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   label: `${days}d left`            };
  if (days <= 14) return { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  label: `${days}d left`            };
  if (days <= 30) return { color: '#f97316', bg: 'rgba(249,115,22,0.1)',  label: `${days}d left`            };
  if (days <= 90) return { color: '#10b981', bg: 'rgba(16,185,129,0.1)',  label: `${days}d left`            };
  return           { color: 'var(--t3)',  bg: 'var(--bg-raised)',          label: fmtDate(undefined)         };
}

// ─── Upload / Scan modal ──────────────────────────────────────────────────────
function ScanModal({ onClose, onConfirm }: {
  onClose: () => void;
  onConfirm: (data: Record<string, unknown>) => void;
}) {
  const [step, setStep]         = useState<'upload' | 'scanning' | 'review'>('upload');
  const [preview, setPreview]   = useState<string | null>(null);
  const [file, setFile]         = useState<File | null>(null);
  const [scanData, setScanData] = useState<any>(null);
  const [imagePath, setImagePath] = useState<string>('');
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: '', doc_type: 'other' as DocType, document_number: '',
    holder_name: '', issuing_authority: '', issuing_country: '',
    issue_date: '', expiry_date: '', notes: '',
  });

  function setF(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  function handleFile(f: File) {
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function handleScan() {
    if (!file) return;
    setStep('scanning');
    try {
      const res = await api.documents.scan(file);
      const s   = res.data.scan;
      setImagePath(res.data.imagePath ?? '');
      setScanData(s);
      setForm({
        name:              s.name              ?? '',
        doc_type:          (s.docType as DocType) ?? 'other',
        document_number:   s.documentNumber    ?? '',
        holder_name:       s.holderName        ?? '',
        issuing_authority: s.issuingAuthority  ?? '',
        issuing_country:   s.issuingCountry    ?? '',
        issue_date:        s.issueDate         ?? '',
        expiry_date:       s.expiryDate        ?? '',
        notes:             '',
      });
      setStep('review');
    } catch {
      toast.error('Scan failed — you can fill in details manually');
      setScanData(null);
      setStep('review');
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    onConfirm({
      ...form,
      image_path:   imagePath || null,
      ai_scan_data: scanData  || null,
      issue_date:   form.issue_date  ? new Date(form.issue_date).toISOString()  : undefined,
      expiry_date:  form.expiry_date ? new Date(form.expiry_date).toISOString() : undefined,
    });
  }

  const inp: React.CSSProperties = {
    background: 'var(--bg-raised)', border: '1px solid var(--b1)', borderRadius: 8,
    padding: '9px 12px', fontSize: 13, color: 'var(--t1)', fontFamily: 'var(--font-body)',
    outline: 'none', width: '100%', boxSizing: 'border-box',
  };
  const lbl: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: 'var(--t2)', display: 'block', marginBottom: 5,
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--card)', borderRadius: 18, border: '1px solid var(--b1)',
        width: '100%', maxWidth: 580, maxHeight: '92vh', overflowY: 'auto',
        boxShadow: '0 28px 60px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px 16px', borderBottom: '1px solid var(--b1)',
        }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--t1)' }}>
              {step === 'upload' ? '📷 Add Document' : step === 'scanning' ? '🔍 Scanning…' : '✅ Review Details'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 2 }}>
              {step === 'upload' ? 'Upload or take a photo of your document' :
               step === 'scanning' ? 'AI is reading your document…' :
               'Review and confirm the extracted information'}
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 7, background: 'var(--bg-raised)',
            border: '1px solid var(--b1)', cursor: 'pointer', fontSize: 14, color: 'var(--t3)',
          }}>✕</button>
        </div>

        <div style={{ padding: 24 }}>
          {/* ── UPLOAD STEP ── */}
          {step === 'upload' && (
            <div>
              {!preview ? (
                <div
                  onClick={() => fileRef.current?.click()}
                  style={{
                    border: '2px dashed var(--b1)', borderRadius: 12,
                    padding: '48px 24px', textAlign: 'center', cursor: 'pointer',
                    background: 'var(--bg-raised)', transition: 'all 0.12s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--amber)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--b1)')}
                >
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--t2)', marginBottom: 6 }}>
                    Drop your document here
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--t4)', marginBottom: 18 }}>
                    Supports JPG, PNG, WEBP — passport, ID, license, insurance card, etc.
                  </div>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                    <button type="button" style={{
                      padding: '8px 20px', borderRadius: 8, background: 'var(--amber)',
                      border: 'none', color: '#fff', cursor: 'pointer',
                      fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 700,
                    }}>📁 Choose File</button>
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
                </div>
              ) : (
                <div>
                  <img src={preview} alt="Document preview"
                    style={{ width: '100%', maxHeight: 280, objectFit: 'contain', borderRadius: 10, border: '1px solid var(--b1)', background: 'var(--bg)' }} />
                  <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                    <button type="button" onClick={handleScan} style={{
                      flex: 1, padding: '11px 0', borderRadius: 10, background: 'var(--amber)',
                      border: 'none', color: '#fff', cursor: 'pointer',
                      fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700,
                    }}>🔍 Scan with AI</button>
                    <button type="button" onClick={() => { setPreview(null); setFile(null); }} style={{
                      padding: '11px 18px', borderRadius: 10, background: 'var(--bg-raised)',
                      border: '1px solid var(--b1)', cursor: 'pointer',
                      fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--t3)',
                    }}>Remove</button>
                  </div>
                  <div style={{ textAlign: 'center', marginTop: 10 }}>
                    <button type="button" onClick={() => setStep('review')} style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 12, color: 'var(--t4)', textDecoration: 'underline',
                      fontFamily: 'var(--font-body)',
                    }}>Skip scan — enter details manually →</button>
                  </div>
                </div>
              )}
              {!preview && (
                <div style={{ textAlign: 'center', marginTop: 16 }}>
                  <button type="button" onClick={() => setStep('review')} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 12, color: 'var(--t4)', textDecoration: 'underline',
                    fontFamily: 'var(--font-body)',
                  }}>Skip upload — enter details manually →</button>
                </div>
              )}
            </div>
          )}

          {/* ── SCANNING STEP ── */}
          {step === 'scanning' && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              {preview && (
                <img src={preview} alt="doc"
                  style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 10, marginBottom: 20, filter: 'blur(1px)', opacity: 0.7 }} />
              )}
              <div style={{ fontSize: 32, marginBottom: 12 }}>🤖</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: 'var(--t1)', marginBottom: 8 }}>
                Reading your document…
              </div>
              <div style={{ fontSize: 12, color: 'var(--t4)' }}>
                AI is extracting dates, document type, and key information
              </div>
            </div>
          )}

          {/* ── REVIEW STEP ── */}
          {step === 'review' && (
            <form onSubmit={handleSubmit}>
              {/* Preview thumbnail */}
              {preview && (
                <img src={preview} alt="doc"
                  style={{ width: '100%', maxHeight: 160, objectFit: 'contain', borderRadius: 10, marginBottom: 18, border: '1px solid var(--b1)', background: 'var(--bg)' }} />
              )}
              {scanData && scanData.confidence > 0 && (
                <div style={{
                  padding: '8px 12px', borderRadius: 8, marginBottom: 16,
                  background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
                  fontSize: 11, color: '#10b981', fontWeight: 600,
                }}>
                  ✅ AI scanned successfully — {scanData.confidence}% confidence. Review and adjust below.
                </div>
              )}
              {(!scanData || scanData.confidence === 0) && (
                <div style={{
                  padding: '8px 12px', borderRadius: 8, marginBottom: 16,
                  background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
                  fontSize: 11, color: 'var(--amber)', fontWeight: 600,
                }}>
                  ✏️ Fill in the details below. Set up your ANTHROPIC_API_KEY to enable AI scanning.
                </div>
              )}

              {/* Doc type */}
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>Document Type *</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {DOC_TYPES.map(dt => (
                    <button key={dt.value} type="button" onClick={() => setF('doc_type', dt.value)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: '5px 11px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                        border: `1px solid ${form.doc_type === dt.value ? dt.color : 'var(--b1)'}`,
                        background: form.doc_type === dt.value ? `${dt.color}18` : 'transparent',
                        color: form.doc_type === dt.value ? dt.color : 'var(--t3)',
                        cursor: 'pointer',
                      }}>
                      {dt.icon} {dt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div style={{ marginBottom: 12 }}>
                <label style={lbl}>Display Name *</label>
                <input style={inp} placeholder="e.g. John Smith — US Passport"
                  value={form.name} onChange={e => setF('name', e.target.value)} required />
              </div>

              {/* Holder + Doc number */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={lbl}>Name on Document</label>
                  <input style={inp} placeholder="Full name" value={form.holder_name} onChange={e => setF('holder_name', e.target.value)} />
                </div>
                <div>
                  <label style={lbl}>Document Number</label>
                  <input style={inp} placeholder="ID / passport number" value={form.document_number} onChange={e => setF('document_number', e.target.value)} />
                </div>
              </div>

              {/* Authority + Country */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={lbl}>Issuing Authority</label>
                  <input style={inp} placeholder="e.g. Dept. of State" value={form.issuing_authority} onChange={e => setF('issuing_authority', e.target.value)} />
                </div>
                <div>
                  <label style={lbl}>Issuing Country</label>
                  <input style={inp} placeholder="e.g. United States" value={form.issuing_country} onChange={e => setF('issuing_country', e.target.value)} />
                </div>
              </div>

              {/* Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={lbl}>Issue Date</label>
                  <input style={inp} type="date" value={form.issue_date} onChange={e => setF('issue_date', e.target.value)} />
                </div>
                <div>
                  <label style={lbl}>Expiry Date</label>
                  <input style={inp} type="date" value={form.expiry_date} onChange={e => setF('expiry_date', e.target.value)} />
                </div>
              </div>
              {form.expiry_date && (
                <div style={{
                  padding: '8px 12px', borderRadius: 8, marginBottom: 14,
                  background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)',
                  fontSize: 11, color: '#10b981',
                }}>
                  🔔 Reminders will be created at: 30 days · 14 days · 7 days · 6 · 5 · 4 · 3 · 2 · 1 day · expiry day
                </div>
              )}

              {/* Notes */}
              <div style={{ marginBottom: 20 }}>
                <label style={lbl}>Notes</label>
                <textarea style={{ ...inp, resize: 'vertical', minHeight: 60 }} placeholder="Any extra notes…"
                  value={form.notes} onChange={e => setF('notes', e.target.value)} />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button type="submit" style={{
                  flex: 1, padding: '11px 0', borderRadius: 10, background: 'var(--amber)',
                  border: 'none', color: '#fff', cursor: 'pointer',
                  fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700,
                }}>Save Document</button>
                <button type="button" onClick={onClose} style={{
                  padding: '11px 18px', borderRadius: 10, background: 'var(--bg-raised)',
                  border: '1px solid var(--b1)', cursor: 'pointer',
                  fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--t3)',
                }}>Cancel</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Document Card ────────────────────────────────────────────────────────────
function DocCard({ doc, onEdit, onDelete }: {
  doc: UserDocument;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const meta    = getDocMeta(doc.docType);
  const urgency = urgencyStyle(doc.daysUntilExpiry);
  const [menu, setMenu] = useState(false);

  const isExpired = doc.daysUntilExpiry !== null && doc.daysUntilExpiry !== undefined && doc.daysUntilExpiry < 0;
  const isUrgent  = doc.daysUntilExpiry !== null && doc.daysUntilExpiry !== undefined && doc.daysUntilExpiry >= 0 && doc.daysUntilExpiry <= 30;

  return (
    <div style={{
      background: 'var(--card)',
      border: `1px solid ${isExpired ? '#ef444430' : isUrgent ? `${urgency.color}30` : 'var(--b1)'}`,
      borderLeft: `4px solid ${isExpired ? '#ef4444' : meta.color}`,
      borderRadius: 12, padding: '16px 18px', position: 'relative',
      boxShadow: isExpired ? '0 0 0 1px rgba(239,68,68,0.1)' : 'none',
    }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        {/* Icon or image thumbnail */}
        <div style={{
          width: 48, height: 48, borderRadius: 10, flexShrink: 0,
          background: `${meta.color}15`, border: `1px solid ${meta.color}25`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, overflow: 'hidden',
        }}>
          {doc.imagePath ? (
            <img
              src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/v1'}/user-documents/image/${doc.imagePath.split('/').pop()}`}
              alt={doc.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          ) : meta.icon}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Name + type badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: 'var(--t1)' }}>
              {doc.name}
            </span>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
              background: `${meta.color}15`, color: meta.color,
            }}>{meta.icon} {meta.label}</span>
          </div>

          {/* Details row */}
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 8 }}>
            {doc.holderName && (
              <span style={{ fontSize: 12, color: 'var(--t2)', fontWeight: 500 }}>👤 {doc.holderName}</span>
            )}
            {doc.documentNumber && (
              <span style={{ fontSize: 12, color: 'var(--t3)' }}>#{doc.documentNumber}</span>
            )}
            {doc.issuingCountry && (
              <span style={{ fontSize: 12, color: 'var(--t3)' }}>🌐 {doc.issuingCountry}</span>
            )}
          </div>

          {/* Dates row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {doc.issueDate && (
              <span style={{ fontSize: 11, color: 'var(--t4)' }}>Issued: {fmtDate(doc.issueDate)}</span>
            )}
            {doc.expiryDate && (
              <>
                <span style={{ fontSize: 11, color: 'var(--t4)' }}>→</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: urgency.color }}>
                  Expires: {fmtDate(doc.expiryDate)}
                </span>
              </>
            )}
            {doc.reminderIds?.length > 0 && (
              <span style={{ fontSize: 10, color: 'var(--t4)' }}>🔔 {doc.reminderIds.length} reminders</span>
            )}
          </div>
        </div>

        {/* Expiry badge + menu */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
          {doc.daysUntilExpiry !== null && doc.daysUntilExpiry !== undefined && (
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
              background: urgency.bg, color: urgency.color,
            }}>{urgency.label}</span>
          )}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setMenu(m => !m)} style={{
              width: 28, height: 28, borderRadius: 7, background: 'var(--bg-raised)',
              border: '1px solid var(--b1)', cursor: 'pointer', fontSize: 16, color: 'var(--t3)',
            }}>⋯</button>
            {menu && (
              <div style={{
                position: 'absolute', top: 32, right: 0, zIndex: 10,
                background: 'var(--card)', border: '1px solid var(--b1)',
                borderRadius: 10, minWidth: 130, boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                overflow: 'hidden',
              }} onMouseLeave={() => setMenu(false)}>
                {[
                  { label: '✏️ Edit', action: onEdit },
                  { label: '🗑 Delete', action: onDelete },
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
    </div>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────
function EditModal({ doc, onClose, onSave, saving }: {
  doc: UserDocument;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    name:              doc.name,
    doc_type:          doc.docType as DocType,
    document_number:   doc.documentNumber   ?? '',
    holder_name:       doc.holderName       ?? '',
    issuing_authority: doc.issuingAuthority ?? '',
    issuing_country:   doc.issuingCountry   ?? '',
    issue_date:        doc.issueDate?.slice(0, 10)  ?? '',
    expiry_date:       doc.expiryDate?.slice(0, 10) ?? '',
    notes:             doc.notes ?? '',
  });

  function setF(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    onSave({
      ...form,
      issue_date:  form.issue_date  ? new Date(form.issue_date).toISOString()  : null,
      expiry_date: form.expiry_date ? new Date(form.expiry_date).toISOString() : null,
    });
  }

  const inp: React.CSSProperties = {
    background: 'var(--bg-raised)', border: '1px solid var(--b1)', borderRadius: 8,
    padding: '9px 12px', fontSize: 13, color: 'var(--t1)', fontFamily: 'var(--font-body)',
    outline: 'none', width: '100%', boxSizing: 'border-box',
  };
  const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: 'var(--t2)', display: 'block', marginBottom: 5 };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--card)', borderRadius: 18, border: '1px solid var(--b1)',
        width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 28px 60px rgba(0,0,0,0.5)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1px solid var(--b1)' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--t1)' }}>✏️ Edit Document</span>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--bg-raised)', border: '1px solid var(--b1)', cursor: 'pointer', fontSize: 14, color: 'var(--t3)' }}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 24 }}>
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Document Type</label>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {DOC_TYPES.map(dt => (
                <button key={dt.value} type="button" onClick={() => setF('doc_type', dt.value)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 600,
                    border: `1px solid ${form.doc_type === dt.value ? dt.color : 'var(--b1)'}`,
                    background: form.doc_type === dt.value ? `${dt.color}18` : 'transparent',
                    color: form.doc_type === dt.value ? dt.color : 'var(--t3)', cursor: 'pointer',
                  }}>{dt.icon} {dt.label}</button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>Display Name *</label>
            <input style={inp} value={form.name} onChange={e => setF('name', e.target.value)} required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div><label style={lbl}>Name on Document</label><input style={inp} value={form.holder_name} onChange={e => setF('holder_name', e.target.value)} /></div>
            <div><label style={lbl}>Document Number</label><input style={inp} value={form.document_number} onChange={e => setF('document_number', e.target.value)} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div><label style={lbl}>Issuing Authority</label><input style={inp} value={form.issuing_authority} onChange={e => setF('issuing_authority', e.target.value)} /></div>
            <div><label style={lbl}>Issuing Country</label><input style={inp} value={form.issuing_country} onChange={e => setF('issuing_country', e.target.value)} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div><label style={lbl}>Issue Date</label><input style={inp} type="date" value={form.issue_date} onChange={e => setF('issue_date', e.target.value)} /></div>
            <div><label style={lbl}>Expiry Date</label><input style={inp} type="date" value={form.expiry_date} onChange={e => setF('expiry_date', e.target.value)} /></div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={lbl}>Notes</label>
            <textarea style={{ ...inp, resize: 'vertical', minHeight: 60 }} value={form.notes} onChange={e => setF('notes', e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" disabled={saving} style={{
              flex: 1, padding: '11px 0', borderRadius: 10, background: 'var(--amber)',
              border: 'none', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, opacity: saving ? 0.6 : 1,
            }}>{saving ? 'Saving…' : 'Save Changes'}</button>
            <button type="button" onClick={onClose} style={{
              padding: '11px 18px', borderRadius: 10, background: 'var(--bg-raised)',
              border: '1px solid var(--b1)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--t3)',
            }}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DocumentsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [showScan, setShowScan]     = useState(false);
  const [editDoc, setEditDoc]       = useState<UserDocument | null>(null);
  const [deleteDoc, setDeleteDoc]   = useState<UserDocument | null>(null);
  const [filterType, setFilterType] = useState<DocType | 'all'>('all');
  const [search, setSearch]         = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['user-documents'],
    queryFn: () => api.documents.list(),
  });
  const docs: UserDocument[] = data?.data ?? [];

  const invalidate = () => qc.invalidateQueries({ queryKey: ['user-documents'] });

  const createMut = useMutation({
    mutationFn: (d: Record<string, unknown>) => api.documents.create(d),
    onSuccess: () => { toast.success('Document saved!'); invalidate(); setShowScan(false); },
    onError:   () => toast.error('Failed to save document'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => api.documents.update(id, data),
    onSuccess: () => { toast.success('Document updated!'); invalidate(); setEditDoc(null); },
    onError:   () => toast.error('Failed to update document'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.documents.delete(id),
    onSuccess: () => { toast.success('Document deleted'); invalidate(); setDeleteDoc(null); },
    onError:   () => toast.error('Failed to delete'),
  });

  const filtered = useMemo(() => docs.filter(d => {
    if (filterType !== 'all' && d.docType !== filterType) return false;
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())
               && !(d.holderName ?? '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [docs, filterType, search]);

  // Summary stats
  const expiredCount   = docs.filter(d => d.daysUntilExpiry !== null && d.daysUntilExpiry !== undefined && d.daysUntilExpiry < 0).length;
  const urgentCount    = docs.filter(d => d.daysUntilExpiry !== null && d.daysUntilExpiry !== undefined && d.daysUntilExpiry >= 0 && d.daysUntilExpiry <= 30).length;
  const upToDateCount  = docs.filter(d => d.daysUntilExpiry === null || d.daysUntilExpiry === undefined || d.daysUntilExpiry > 30).length;

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
            📋 Documents
          </div>
          <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 1 }}>
            Track important documents and expiry dates
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={() => router.push('/dashboard')} style={{
            padding: '7px 14px', borderRadius: 8, border: '1px solid var(--b1)',
            background: 'var(--card)', cursor: 'pointer', fontFamily: 'var(--font-body)',
            fontSize: 12, fontWeight: 600, color: 'var(--t2)',
          }}>← Dashboard</button>
          <button onClick={() => setShowScan(true)} style={{
            padding: '7px 16px', borderRadius: 8, border: 'none',
            background: 'var(--amber)', color: '#fff', cursor: 'pointer',
            fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 700,
          }}>+ Add Document</button>
        </div>
      </div>

      <div style={{ padding: '24px 26px', flex: 1 }}>
        {/* ── Stats row ───────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
          {[
            { label: 'Total',      value: docs.length,      icon: '📋', color: '#6366f1'  },
            { label: 'Up to Date', value: upToDateCount,    icon: '✅', color: '#10b981'  },
            { label: 'Expiring',   value: urgentCount,      icon: '⚠️', color: '#f59e0b'  },
            { label: 'Expired',    value: expiredCount,     icon: '🚨', color: '#ef4444'  },
          ].map(s => (
            <div key={s.label} style={{
              background: 'var(--card)', border: '1px solid var(--b1)',
              borderRadius: 12, padding: '18px 20px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 18 }}>{s.icon}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</span>
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, color: s.color, fontFamily: 'var(--font-display)' }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* ── Search + Type filter ─────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 18, flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--card)', border: '1px solid var(--b1)',
            borderRadius: 8, padding: '8px 12px', flex: '1 1 200px',
          }}>
            <span style={{ color: 'var(--t3)', fontSize: 13 }}>⌕</span>
            <input
              type="text" placeholder="Search documents…" value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ background: 'none', border: 'none', outline: 'none', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--t1)', width: '100%' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button onClick={() => setFilterType('all')} style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 11, fontWeight: 600,
              border: `1px solid ${filterType === 'all' ? 'var(--amber)' : 'var(--b1)'}`,
              background: filterType === 'all' ? 'var(--amber-glow)' : 'var(--card)',
              color: filterType === 'all' ? 'var(--amber)' : 'var(--t3)', cursor: 'pointer',
            }}>All</button>
            {DOC_TYPES.map(dt => (
              <button key={dt.value} onClick={() => setFilterType(dt.value)} style={{
                padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                border: `1px solid ${filterType === dt.value ? dt.color : 'var(--b1)'}`,
                background: filterType === dt.value ? `${dt.color}15` : 'var(--card)',
                color: filterType === dt.value ? dt.color : 'var(--t3)', cursor: 'pointer',
              }}>{dt.icon} {dt.label}</button>
            ))}
          </div>
        </div>

        {/* ── Document list ────────────────────────────────────────────────── */}
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--t3)' }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: 44, marginBottom: 14 }}>📋</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--t2)', marginBottom: 6 }}>
              {docs.length === 0 ? 'No documents yet' : 'No documents match your filter'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--t4)', marginBottom: 20 }}>
              {docs.length === 0
                ? 'Upload a passport, ID, insurance card or any document to track its expiry.'
                : 'Try clearing the filter.'}
            </div>
            {docs.length === 0 && (
              <button onClick={() => setShowScan(true)} style={{
                padding: '10px 24px', borderRadius: 10, background: 'var(--amber)',
                border: 'none', color: '#fff', cursor: 'pointer',
                fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700,
              }}>+ Add Your First Document</button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Show expired docs first with a section header */}
            {filtered.some(d => d.daysUntilExpiry !== null && d.daysUntilExpiry !== undefined && d.daysUntilExpiry < 0) && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '4px 0' }}>
                  🚨 Expired
                </div>
                {filtered.filter(d => d.daysUntilExpiry !== null && d.daysUntilExpiry !== undefined && d.daysUntilExpiry < 0).map(d => (
                  <DocCard key={d.id} doc={d} onEdit={() => setEditDoc(d)} onDelete={() => setDeleteDoc(d)} />
                ))}
                <div style={{ height: 8 }} />
              </>
            )}
            {/* Expiring soon */}
            {filtered.some(d => d.daysUntilExpiry !== null && d.daysUntilExpiry !== undefined && d.daysUntilExpiry >= 0 && d.daysUntilExpiry <= 30) && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '4px 0' }}>
                  ⚠️ Expiring Soon (within 30 days)
                </div>
                {filtered.filter(d => d.daysUntilExpiry !== null && d.daysUntilExpiry !== undefined && d.daysUntilExpiry >= 0 && d.daysUntilExpiry <= 30).map(d => (
                  <DocCard key={d.id} doc={d} onEdit={() => setEditDoc(d)} onDelete={() => setDeleteDoc(d)} />
                ))}
                <div style={{ height: 8 }} />
              </>
            )}
            {/* All others */}
            {filtered.filter(d => d.daysUntilExpiry === null || d.daysUntilExpiry === undefined || d.daysUntilExpiry > 30).map(d => (
              <DocCard key={d.id} doc={d} onEdit={() => setEditDoc(d)} onDelete={() => setDeleteDoc(d)} />
            ))}
          </div>
        )}
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {showScan && (
        <ScanModal
          onClose={() => setShowScan(false)}
          onConfirm={data => createMut.mutate(data)}
        />
      )}
      {editDoc && (
        <EditModal
          doc={editDoc}
          onClose={() => setEditDoc(null)}
          onSave={data => updateMut.mutate({ id: editDoc.id, data })}
          saving={updateMut.isPending}
        />
      )}
      {deleteDoc && (
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
            <div style={{ fontSize: 28, marginBottom: 12 }}>🗑</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--t1)', marginBottom: 8 }}>
              Delete "{deleteDoc.name}"?
            </div>
            <div style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 22 }}>
              This will remove the document and all {deleteDoc.reminderIds?.length ?? 0} associated reminders.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => deleteMut.mutate(deleteDoc.id)} disabled={deleteMut.isPending}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 10, border: 'none',
                  background: '#ef4444', color: '#fff', cursor: 'pointer',
                  fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700,
                }}>{deleteMut.isPending ? 'Deleting…' : 'Delete'}</button>
              <button onClick={() => setDeleteDoc(null)} style={{
                padding: '10px 18px', borderRadius: 10, background: 'var(--bg-raised)',
                border: '1px solid var(--b1)', cursor: 'pointer',
                fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: 'var(--t3)',
              }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
