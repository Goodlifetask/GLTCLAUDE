'use client';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '../../store/auth';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useTranslation } from 'react-i18next';

type NavEntry = {
  label: string;
  icon: string;
  href: string;
  exact?: boolean;
};

export function Sidebar({ onClose }: { onClose?: () => void } = {}) {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();

  /* ── Family pending count for badge ────────────────────────────── */
  const isFamilyUser = user?.plan === 'family' || user?.profileCategory === 'family';
  const { data: familyRemindersData } = useQuery({
    queryKey: ['family-reminders-count'],
    queryFn: () => api.family.reminders({ status: 'pending', limit: 100 }),
    enabled: !!isFamilyUser,
    staleTime: 60_000,
  });
  const familyPendingCount: number = familyRemindersData?.total ?? 0;

  /* ── Conditional plan item ─────────────────────────────────────── */
  const planItem: NavEntry | null =
    (user?.plan === 'family'    || user?.profileCategory === 'family')
      ? { label: t('nav.family'),    icon: '👨‍👩‍👧', href: '/family' }
      : (user?.plan === 'team'  || user?.profileCategory === 'team')
      ? { label: 'Team',      icon: '🏢',    href: '/team' }
      : (user?.plan === 'community' || user?.profileCategory === 'community')
      ? { label: 'Community', icon: '🌐',    href: '/community' }
      : null;

  /* ── Main nav items ────────────────────────────────────────────── */
  const navItems: NavEntry[] = [
    { label: t('nav.dashboard'),  icon: '⊞',  href: '/dashboard', exact: true },
    { label: t('nav.tasks'),      icon: '◎',  href: '/tasks' },
    ...(planItem ? [planItem] : []),
    { label: t('nav.calendar'),   icon: '📅', href: '/calendar' },
    { label: t('nav.flyAlarms'),  icon: '⚡', href: '/fly-alarms' },
    { label: t('nav.settings'),   icon: '⊙',  href: '/settings' },
  ];

  const isActive = (item: NavEntry) => {
    if (item.exact) return pathname === item.href;
    return pathname?.startsWith(item.href) ?? false;
  };

  const initials =
    user?.name
      ?.split(' ')
      .map((n: string) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'U';

  return (
    <aside
      style={{
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--sidebar-border)',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      {/* ── Brand ─────────────────────────────────────────────────── */}
      <div style={{ padding: '22px 20px 18px', borderBottom: '1px solid var(--sidebar-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 34, height: 34,
              background: 'var(--grad-deep)',
              borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, color: '#ffffff',
              boxShadow: 'var(--sh-amber)',
              flexShrink: 0,
            }}
          >
            G
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--t1)', letterSpacing: '-0.01em' }}>
              GoodLifeTask
            </div>
            <div style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 400, letterSpacing: '0.04em' }}>
              {t('nav.tagline')}
            </div>
          </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                width: 28, height: 28, borderRadius: 7,
                background: 'var(--bg)', border: '1px solid var(--b1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', fontSize: 14, color: 'var(--t3)',
                flexShrink: 0,
              }}
            >✕</button>
          )}
        </div>
      </div>

      {/* ── Search ────────────────────────────────────────────────── */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--sidebar-border)' }}>
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--bg)', border: '1px solid var(--b1)',
            borderRadius: 'var(--r-sm)', padding: '8px 11px',
          }}
        >
          <span style={{ fontSize: 13, color: 'var(--t3)', flexShrink: 0 }}>⌕</span>
          <input
            type="text"
            placeholder={t('common.search')}
            style={{
              background: 'none', border: 'none', outline: 'none',
              fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--t1)', width: '100%',
            }}
          />
        </div>
      </div>

      {/* ── Nav items ─────────────────────────────────────────────── */}
      <nav style={{ flex: 1, padding: '10px 10px', overflowY: 'auto' }}>
        {navItems.map(item => {
          const active = isActive(item);
          return (
            <div
              key={item.href}
              onClick={() => { router.push(item.href); onClose?.(); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 11,
                padding: '10px 12px', borderRadius: 'var(--r-sm)',
                cursor: 'pointer',
                color: active ? 'var(--amber)' : 'var(--sidebar-text)',
                fontSize: 13, fontWeight: active ? 600 : 500,
                background: active ? 'var(--sidebar-active)' : 'transparent',
                marginBottom: 2,
                position: 'relative',
                transition: 'all 0.12s',
              }}
              onMouseEnter={e => {
                if (!active) (e.currentTarget as HTMLDivElement).style.background = 'var(--sidebar-active)';
              }}
              onMouseLeave={e => {
                if (!active) (e.currentTarget as HTMLDivElement).style.background = 'transparent';
              }}
            >
              {/* Active bar */}
              {active && (
                <div
                  style={{
                    position: 'absolute', left: 0, top: 6, bottom: 6,
                    width: 3, background: 'var(--amber)',
                    borderRadius: '0 3px 3px 0',
                  }}
                />
              )}
              <span style={{ fontSize: 16, width: 20, textAlign: 'center', flexShrink: 0 }}>
                {item.icon}
              </span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.href === '/family' && familyPendingCount > 0 && (
                <span style={{
                  background: 'var(--amber)',
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 700,
                  minWidth: 18,
                  height: 18,
                  borderRadius: 9,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 5px',
                  flexShrink: 0,
                }}>
                  {familyPendingCount > 99 ? '99+' : familyPendingCount}
                </span>
              )}
            </div>
          );
        })}
      </nav>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <div style={{ padding: '14px 16px', borderTop: '1px solid var(--sidebar-border)' }}>
        {/* User row */}
        <div
          onClick={() => router.push('/settings')}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 10px', borderRadius: 'var(--r-sm)',
            cursor: 'pointer', marginBottom: 8,
          }}
        >
          <div
            style={{
              width: 30, height: 30, borderRadius: 8,
              background: 'var(--amber-glow)',
              border: '1px solid rgba(13,148,136,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: 'var(--amber)', flexShrink: 0,
              fontFamily: 'var(--font-display)',
            }}
          >
            {initials}
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)' }}>
              {user?.name || 'User'}
            </div>
            <div
              style={{
                fontSize: 10, color: 'var(--amber)',
                background: 'var(--amber-glow)',
                padding: '1px 6px', borderRadius: 4,
                display: 'inline-block', marginTop: 2, fontWeight: 600,
              }}
            >
              ✦ {user?.plan || 'free'}
            </div>
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={() => { logout(); router.push('/login'); }}
          style={{
            width: '100%', padding: '8px 10px',
            background: 'transparent', border: '1px solid var(--b1)',
            borderRadius: 'var(--r-sm)', cursor: 'pointer',
            fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600,
            color: 'var(--t3)', transition: 'all 0.12s',
          }}
        >
          {t('nav.signOut')}
        </button>
      </div>
    </aside>
  );
}
