'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '../../components/layout/Sidebar';
import { RightPanel } from '../../components/layout/RightPanel';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth';
import { I18nProvider } from '../../components/I18nProvider';
import { FiringAlarm } from '../../components/layout/FiringAlarm';

function UrgentRemindersPopup() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);
  const [shown, setShown] = useState(false);

  const { data } = useQuery({
    queryKey: ['urgent-reminders-popup'],
    queryFn: () => api.reminders.list({ status: 'pending', limit: 100 }),
    enabled: !!user,
    staleTime: Infinity, // only fetch once per session
  });

  const urgentItems = ((data as any)?.data ?? []).filter((r: any) => r.priority === 'urgent');

  useEffect(() => {
    // Show popup once per browser session
    if (urgentItems.length > 0 && !shown) {
      const key = `urgent_popup_shown_${user?.id}_${new Date().toDateString()}`;
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        setShown(true);
      }
    }
  }, [urgentItems, user?.id, shown]);

  if (!shown || dismissed || urgentItems.length === 0) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999,
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: 28,
        maxWidth: 460, width: '90%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        border: '2px solid #dc2626',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'rgba(220,38,38,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, flexShrink: 0,
          }}>🔴</div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: '#dc2626' }}>
              Urgent Reminders
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
              You have {urgentItems.length} urgent task{urgentItems.length > 1 ? 's' : ''} requiring attention
            </div>
          </div>
        </div>

        {/* List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {urgentItems.slice(0, 5).map((r: any) => (
            <div key={r.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', borderRadius: 10,
              background: 'rgba(220,38,38,0.05)',
              border: '1px solid rgba(220,38,38,0.15)',
            }}>
              <span style={{ fontSize: 15, flexShrink: 0 }}>
                {r.type === 'call' ? '📞' : r.type === 'email' ? '✉️' : r.type === 'event' ? '📅' : '✔'}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {r.title}
                </div>
                {r.fireAt && (
                  <div style={{ fontSize: 11, color: '#dc2626', marginTop: 1 }}>
                    Due {new Date(r.fireAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>
            </div>
          ))}
          {urgentItems.length > 5 && (
            <div style={{ fontSize: 12, color: '#6b7280', textAlign: 'center', padding: '4px 0' }}>
              +{urgentItems.length - 5} more urgent reminders
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => { setDismissed(true); router.push('/tasks?status=pending&sort=fireAt&order=asc'); }}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 10,
              background: '#dc2626', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, color: '#fff',
            }}
          >
            View Urgent Tasks
          </button>
          <button
            onClick={() => setDismissed(true)}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 10,
              background: 'transparent', border: '1px solid #e5e7eb', cursor: 'pointer',
              fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: '#6b7280',
            }}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 288px', minHeight: '100vh' }}>
        <Sidebar />
        <main style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
          {children}
        </main>
        <RightPanel />
        <UrgentRemindersPopup />
        <FiringAlarm />
      </div>
    </I18nProvider>
  );
}
