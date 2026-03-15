'use client';
import { useQuery } from '@tanstack/react-query';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useAuthStore } from '../../store/auth';
import { api } from '../../lib/api';

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentFilter = searchParams.get('filter') || 'all';
  const currentType = searchParams.get('type') || '';

  const { data: statsData } = useQuery({
    queryKey: ['stats'],
    queryFn: () => api.users.stats(),
    staleTime: 30 * 1000,
  });

  const stats = (statsData as any)?.data ?? { total: 0, completed: 0, overdue: 0, upcoming: 0 };

  const navItems = [
    { label: 'All Reminders', icon: '⊞', filter: 'all', count: stats.total || null, countStyle: 'muted' },
    { label: 'Today', icon: '◌', filter: 'today', count: null, countStyle: 'coral' },
    { label: 'Upcoming', icon: '→', filter: 'upcoming', count: stats.upcoming || null, countStyle: null },
    { label: 'Overdue', icon: '⚡', filter: 'overdue', count: stats.overdue || null, countStyle: 'coral' },
    { label: 'Completed', icon: '✓', filter: 'done', count: stats.completed || null, countStyle: null },
  ];

  const typeItems = [
    { label: 'Calls', icon: '📞', filter: 'call' },
    { label: 'Tasks', icon: '◎', filter: 'task' },
    { label: 'Emails', icon: '✉', filter: 'email' },
    { label: 'Location', icon: '◉', filter: 'location' },
    { label: 'Events', icon: '◈', filter: 'event' },
  ];

  const optionItems = [
    { label: 'Recurring', icon: '🔁', filter: 'recurring', count: null, countStyle: 'amber' },
    { label: 'Calendar', icon: '📅', filter: 'calendar', count: null, countStyle: null },
    { label: 'Lists', icon: '☰', filter: 'lists', count: null, countStyle: null },
    { label: 'Settings', icon: '⊙', filter: 'settings', count: null, countStyle: null },
  ];

  const planItems = [
    ...(user?.plan === 'family' ? [{ label: 'Family', icon: '👨‍👩‍👧‍👦', filter: 'family', count: null, countStyle: 'amber' as const }] : []),
    ...(user?.plan === 'team' ? [{ label: 'Team', icon: '🏢', filter: 'team', count: null, countStyle: null }] : []),
  ];

  const handleNavClick = (filter: string) => {
    if (filter === 'settings') {
      router.push('/settings');
    } else if (filter === 'calendar') {
      router.push('/calendar');
    } else if (filter === 'lists') {
      router.push('/lists');
    } else if (filter === 'family') {
      router.push('/family');
    } else if (filter === 'team') {
      router.push('/team');
    } else {
      router.push(`/dashboard?filter=${filter}`);
    }
  };

  const handleTypeClick = (type: string) => {
    router.push(`/dashboard?type=${type}`);
  };

  const isNavActive = (filter: string) => {
    if (filter === 'settings') return pathname === '/settings';
    if (filter === 'calendar') return pathname === '/calendar';
    if (filter === 'lists') return pathname === '/lists';
    if (filter === 'family') return pathname === '/family';
    if (filter === 'team') return pathname?.startsWith('/team') ?? false;
    return pathname === '/dashboard' && currentFilter === filter && !currentType;
  };

  const isTypeActive = (type: string) => {
    return pathname === '/dashboard' && currentType === type;
  };

  const initials = user?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  return (
    <aside style={{
      background: 'var(--bg-raised)',
      borderRight: '1px solid var(--b1)',
      display: 'flex', flexDirection: 'column',
      position: 'sticky', top: 0, height: '100vh',
      overflow: 'hidden'
    }}>
      {/* Brand */}
      <div style={{ padding: '22px 20px 18px', borderBottom: '1px solid var(--b1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{
            width: 34, height: 34,
            background: 'linear-gradient(145deg, var(--amber), var(--amber-dim))',
            borderRadius: 9,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, color: '#ffffff',
            boxShadow: 'var(--sh-amber), inset 0 1px 0 rgba(255,255,255,0.2)',
            flexShrink: 0
          }}>G</div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--t1)', letterSpacing: '-0.01em' }}>GoodLifeTask</div>
            <div style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 400, letterSpacing: '0.04em' }}>Your life, organised</div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--b1)' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--bg)', border: '1px solid var(--b1)',
          borderRadius: 'var(--r-sm)', padding: '8px 11px'
        }}>
          <span style={{ fontSize: 13, color: 'var(--t3)', flexShrink: 0 }}>⌕</span>
          <input
            type="text" placeholder="Search reminders..."
            style={{
              background: 'none', border: 'none', outline: 'none',
              fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--t1)', width: '100%'
            }}
          />
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '8px 10px', overflowY: 'auto' }}>
        <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--t4)', padding: '12px 10px 5px' }}>Overview</div>
        {navItems.map(item => (
          <NavItem
            key={item.filter}
            item={item}
            active={isNavActive(item.filter)}
            onClick={() => handleNavClick(item.filter)}
          />
        ))}

        <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--t4)', padding: '12px 10px 5px' }}>By Type</div>
        {typeItems.map(item => (
          <NavItem
            key={item.filter}
            item={item as any}
            active={isTypeActive(item.filter)}
            onClick={() => handleTypeClick(item.filter)}
          />
        ))}

        {planItems.length > 0 && (
          <>
            <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--t4)', padding: '12px 10px 5px' }}>My Plan</div>
            {planItems.map(item => (
              <NavItem
                key={item.filter}
                item={item}
                active={isNavActive(item.filter)}
                onClick={() => handleNavClick(item.filter)}
              />
            ))}
          </>
        )}

        <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--t4)', padding: '12px 10px 5px' }}>Options</div>
        {optionItems.map(item => (
          <NavItem
            key={item.filter}
            item={item}
            active={isNavActive(item.filter)}
            onClick={() => handleNavClick(item.filter)}
          />
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: '14px 16px', borderTop: '1px solid var(--b1)' }}>
        <div style={{
          background: 'var(--card)', border: '1px solid var(--b1)',
          borderRadius: 'var(--r)', padding: '12px 14px', marginBottom: 10
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, fontWeight: 600, marginBottom: 8 }}>
            <span style={{ color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 10 }}>Today&apos;s progress</span>
            <span style={{ color: 'var(--amber)' }}>{stats.completed} / {stats.total}</span>
          </div>
          <div style={{ height: 3, background: 'var(--b1)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 3, background: 'linear-gradient(90deg, var(--amber-dim), var(--amber))', width: `${stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%`, boxShadow: '0 0 8px rgba(232,169,74,0.4)' }} />
          </div>
        </div>
        <div
          onClick={() => router.push('/settings')}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 10px', borderRadius: 'var(--r-sm)',
            cursor: 'pointer'
          }}
        >
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'linear-gradient(135deg, var(--amber-dim), var(--amber))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: '#ffffff', flexShrink: 0,
            fontFamily: 'var(--font-display)'
          }}>{initials}</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)' }}>{user?.name || 'User'}</div>
            <div style={{
              fontSize: 10, color: 'var(--amber)',
              background: 'var(--amber-glow)',
              padding: '1px 6px', borderRadius: 4,
              display: 'inline-block', marginTop: 2, fontWeight: 600
            }}>✦ {user?.plan || 'free'}</div>
          </div>
        </div>
        <button
          onClick={() => { logout(); router.push('/login'); }}
          style={{
            width: '100%', marginTop: 8, padding: '7px 10px',
            background: 'transparent', border: '1px solid var(--b1)',
            borderRadius: 'var(--r-sm)', cursor: 'pointer',
            fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600,
            color: 'var(--t3)'
          }}
        >Sign Out</button>
      </div>
    </aside>
  );
}

function NavItem({ item, active, onClick }: { item: { label: string; icon: string; filter: string; count?: number | null; countStyle?: string | null }; active: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 11px', borderRadius: 'var(--r-sm)',
        cursor: 'pointer',
        color: active ? 'var(--amber)' : 'var(--t2)',
        fontSize: 13, fontWeight: 500,
        background: active ? 'var(--amber-soft)' : 'transparent',
        marginBottom: 1,
        position: 'relative',
        transition: 'all 0.12s'
      }}
    >
      {active && (
        <div style={{
          position: 'absolute', left: 0, top: 5, bottom: 5,
          width: 2, background: 'var(--amber)',
          borderRadius: '0 2px 2px 0'
        }} />
      )}
      <span style={{ fontSize: 15, width: 18, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
      {item.label}
      {item.count !== null && item.count !== undefined && (
        <span style={{
          marginLeft: 'auto', fontSize: 10, fontWeight: 600,
          padding: '1px 7px', borderRadius: 10,
          background: item.countStyle === 'amber' ? 'var(--amber-glow)' : item.countStyle === 'coral' ? 'var(--coral-bg)' : 'rgba(255,255,255,0.06)',
          color: item.countStyle === 'amber' ? 'var(--amber)' : item.countStyle === 'coral' ? 'var(--coral)' : 'var(--t3)'
        }}>{item.count}</span>
      )}
    </div>
  );
}
