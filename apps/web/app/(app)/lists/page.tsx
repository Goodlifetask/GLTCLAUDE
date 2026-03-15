'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import toast from 'react-hot-toast';

const LIST_COLORS = ['#7C3AED','#6D28D9','#0ea5e9','#16a34a','#dc2626','#A78BFA','#db2777','#818CF8'];

export default function ListsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#7C3AED');
  const [selectedList, setSelectedList] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: listsData, isLoading } = useQuery({
    queryKey: ['lists'],
    queryFn: () => api.lists.list(),
  });

  const { data: listRemindersData } = useQuery({
    queryKey: ['reminders', 'list', selectedList],
    queryFn: () => api.reminders.list({ list_id: selectedList, limit: 100 }),
    enabled: !!selectedList,
  });

  const lists: any[] = (listsData as any)?.data || [];
  const listReminders: any[] = (listRemindersData as any)?.data || [];

  const createMutation = useMutation({
    mutationFn: () => api.lists.create({ name: newName.trim(), color: newColor }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lists'] });
      toast.success('List created!');
      setNewName('');
      setNewColor('#7C3AED');
      setShowForm(false);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to create list'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.lists.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lists'] });
      toast.success('List deleted');
      if (selectedList === deleteConfirm) setSelectedList(null);
      setDeleteConfirm(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Cannot delete this list'),
  });

  return (
    <>
      {/* Topbar */}
      <div style={{
        background: 'var(--card)', borderBottom: '1px solid var(--b1)',
        padding: '0 26px', height: 58,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 40, flexShrink: 0
      }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--t1)' }}>My Lists</div>
          <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 1 }}>Organise reminders into groups</div>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 'var(--r-sm)',
            background: 'var(--amber)', color: '#ffffff',
            border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 700,
            boxShadow: 'var(--sh-amber)'
          }}
        >+ New List</button>
      </div>

      <div style={{ padding: '24px 26px', flex: 1 }}>
        {/* Create form */}
        {showForm && (
          <div style={{
            background: 'var(--card)', border: '1px solid var(--b3)',
            borderRadius: 'var(--r-lg)', padding: '20px 22px', marginBottom: 20,
            boxShadow: 'var(--sh-lg)'
          }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: 'var(--t1)', marginBottom: 14 }}>Create New List</div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label style={labelStyle}>List Name *</label>
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Work, Personal, Shopping..."
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter' && newName.trim()) createMutation.mutate(); }}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Color</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {LIST_COLORS.map(c => (
                    <div
                      key={c}
                      onClick={() => setNewColor(c)}
                      style={{
                        width: 24, height: 24, borderRadius: '50%', background: c,
                        cursor: 'pointer', border: newColor === c ? `2px solid var(--t1)` : '2px solid transparent',
                        boxShadow: newColor === c ? '0 0 0 2px var(--bg)' : 'none',
                        transition: 'all 0.1s'
                      }}
                    />
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => { setShowForm(false); setNewName(''); }}
                  style={{
                    padding: '9px 16px', border: '1px solid var(--b1)',
                    borderRadius: 'var(--r-sm)', background: 'transparent',
                    cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 12,
                    fontWeight: 600, color: 'var(--t3)'
                  }}
                >Cancel</button>
                <button
                  onClick={() => { if (newName.trim()) createMutation.mutate(); }}
                  disabled={!newName.trim() || createMutation.isPending}
                  style={{
                    padding: '9px 20px',
                    background: 'var(--amber)', color: '#fff',
                    border: 'none', borderRadius: 'var(--r-sm)',
                    fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 700,
                    cursor: (!newName.trim() || createMutation.isPending) ? 'not-allowed' : 'pointer',
                    opacity: (!newName.trim() || createMutation.isPending) ? 0.6 : 1,
                    boxShadow: 'var(--sh-amber)'
                  }}
                >{createMutation.isPending ? 'Creating...' : 'Create List'}</button>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, marginBottom: 28 }}>
          {isLoading ? (
            <div style={{ color: 'var(--t3)', fontSize: 13, padding: '20px 0' }}>Loading lists...</div>
          ) : lists.length === 0 ? (
            <div style={{
              gridColumn: '1 / -1', textAlign: 'center', padding: '50px 20px',
              background: 'var(--card)', border: '1px solid var(--b1)',
              borderRadius: 'var(--r-xl)'
            }}>
              <div style={{ fontSize: 36, opacity: 0.25, marginBottom: 12 }}>☰</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontStyle: 'italic', color: 'var(--t2)', marginBottom: 6 }}>No lists yet.</div>
              <div style={{ fontSize: 12, color: 'var(--t3)' }}>Create a list to organise your reminders.</div>
            </div>
          ) : lists.map((list: any) => (
            <div
              key={list.id}
              onClick={() => setSelectedList(selectedList === list.id ? null : list.id)}
              style={{
                background: 'var(--card)', border: `1px solid ${selectedList === list.id ? (list.color || 'var(--amber)') : 'var(--b1)'}`,
                borderRadius: 'var(--r-lg)', padding: '16px 18px',
                cursor: 'pointer', transition: 'all 0.15s',
                boxShadow: selectedList === list.id ? `0 0 0 3px ${(list.color || '#7C3AED')}22` : 'none',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                  background: list.color || '#7C3AED',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, color: '#fff', fontWeight: 700,
                  boxShadow: `0 2px 8px ${(list.color || '#7C3AED')}44`
                }}>{list.icon || list.name?.[0]?.toUpperCase() || '☰'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--t1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{list.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 1 }}>{list._count?.reminders ?? 0} reminders</div>
                </div>
              </div>
              {/* Delete button */}
              {!list.is_system && (
                <button
                  onClick={e => { e.stopPropagation(); setDeleteConfirm(list.id); }}
                  title="Delete list"
                  style={{
                    position: 'absolute', top: 10, right: 10,
                    width: 24, height: 24, borderRadius: 6,
                    border: '1px solid var(--b1)', background: 'var(--bg)',
                    cursor: 'pointer', fontSize: 11, color: 'var(--coral)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >🗑</button>
              )}
            </div>
          ))}
        </div>

        {/* Selected list reminders */}
        {selectedList && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
              Reminders in this list
            </div>
            {listReminders.length === 0 ? (
              <div style={{ background: 'var(--card)', border: '1px solid var(--b1)', borderRadius: 'var(--r-lg)', padding: '30px', textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: 'var(--t3)' }}>No reminders in this list yet</div>
              </div>
            ) : listReminders.map((r: any) => (
              <div key={r.id} style={{
                background: 'var(--card)', border: '1px solid var(--b1)',
                borderRadius: 'var(--r-lg)', padding: '13px 16px', marginBottom: 6,
                display: 'flex', alignItems: 'center', gap: 12
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: r.status === 'completed' ? 'var(--sage)' : 'var(--amber)'
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 600, color: r.status === 'completed' ? 'var(--t3)' : 'var(--t1)',
                    textDecoration: r.status === 'completed' ? 'line-through' : 'none'
                  }}>{r.title}</div>
                  {r.fireAt && <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>
                    {new Date(r.fireAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </div>}
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                  background: r.status === 'completed' ? 'var(--sage-bg)' : 'var(--amber-glow)',
                  color: r.status === 'completed' ? 'var(--sage)' : 'var(--amber)'
                }}>{r.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div
          onClick={() => setDeleteConfirm(null)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.5)', zIndex: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--card)', border: '1px solid var(--b1)',
              borderRadius: 'var(--r-lg)', padding: '24px 28px', maxWidth: 360,
              boxShadow: '0 20px 60px rgba(0,0,0,0.4)'
            }}
          >
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--t1)', marginBottom: 8 }}>Delete List?</div>
            <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 20, lineHeight: 1.5 }}>
              This will permanently delete the list. Reminders inside will not be deleted.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setDeleteConfirm(null)}
                style={{
                  flex: 1, padding: '9px', border: '1px solid var(--b1)',
                  borderRadius: 'var(--r-sm)', background: 'transparent',
                  cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--t2)'
                }}
              >Cancel</button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirm!)}
                disabled={deleteMutation.isPending}
                style={{
                  flex: 1, padding: '9px',
                  background: 'var(--coral)', color: '#fff',
                  border: 'none', borderRadius: 'var(--r-sm)',
                  cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 700,
                  opacity: deleteMutation.isPending ? 0.7 : 1
                }}
              >{deleteMutation.isPending ? 'Deleting...' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--bg)', border: '1px solid var(--b1)',
  borderRadius: 'var(--r-sm)', padding: '9px 12px',
  fontSize: 13, color: 'var(--t1)', fontFamily: 'var(--font-body)', outline: 'none'
};
const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: 'var(--t2)', display: 'block', marginBottom: 5
};
