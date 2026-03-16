'use client';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '../../store/auth';

type NavEntry = {
  label: string;
  icon: string;
  href: string;
  exact?: boolean;
};

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  /* ── Conditional plan item ─────────────────────────────────────── */
  const planItem: NavEntry | null =
    user?.plan === 'family'
      ? { label: 'Family',    icon: '👨‍👩‍👧', href: '/family' }
      : user?.plan === 'team'
      ? { label: 'Team',      icon: '🏢',    href: '/team' }
      : user?.plan === 'community'
      ? { label: 'Community', icon: '🌐',    href: '/community' }
      : null;

  /* ── Main nav items ────────────────────────────────────────────── */
  const navItems: NavEntry[] = [
    { label: 'Dashboard',  icon: '⊞',  href: '/dashboard', exact: true },
    { label: 'Tasks',      icon: '◎',  href: '/tasks' },
    ...(planItem ? [planItem] : []),
    { label: 'Calendar',   icon: '📅', href: '/calendar' },
    { label: 'Fly-Alarms', icon: '⚡', href: '/fly-alarms' },
    { label: 'Settings',   icon: '⊙',  href: '/settings' },
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
      className="dark-surface"
      style={{
        background: 'linear-gradient(180deg, #3D2BB8 0%, #2D1E8A 100%)',
        borderRight: '1px solid var(--b1)',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflow: 'hidden',
        width: 220,
        minWidth: 220,
      }}
    >
      {/* ── Brand ─────────────────────────────────────────────────── */}
      <div style={{ padding: '22px 20px 18px', borderBottom: '1px solid var(--b1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 34, height: 34,
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(8px)',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.28)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, color: '#FDE68A',
              boxShadow: '0 2px 12px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.3)',
              flexShrink: 0,
              textShadow: '0 1px 6px rgba(253,230,138,0.6)',
            }}
          >
            G
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--t1)', letterSpacing: '-0.01em' }}>
              GoodLifeTask
            </div>
            <div style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 400, letterSpacing: '0.04em' }}>
              Your life, organised
            </div>
          </div>
        </div>
      </div>

      {/* ── Search ────────────────────────────────────────────────── */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--b1)' }}>
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
            placeholder="Search..."
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
              onClick={() => router.push(item.href)}
              style={{
                display: 'flex', alignItems: 'center', gap: 11,
                padding: '10px 12px', borderRadius: 'var(--r-sm)',
                cursor: 'pointer',
                color: active ? 'var(--amber)' : 'var(--t2)',
                fontSize: 13, fontWeight: active ? 600 : 500,
                background: active ? 'var(--amber-soft)' : 'transparent',
                marginBottom: 2,
                position: 'relative',
                transition: 'all 0.12s',
              }}
              onMouseEnter={e => {
                if (!active) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)';
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
              <span>{item.label}</span>
            </div>
          );
        })}
      </nav>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <div style={{ padding: '14px 16px', borderTop: '1px solid var(--b1)' }}>
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
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.28)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: '#FDE68A', flexShrink: 0,
              fontFamily: 'var(--font-display)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.25)',
              textShadow: '0 1px 4px rgba(253,230,138,0.5)',
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
          Sign Out
        </button>
      </div>
    </aside>
  );
}
