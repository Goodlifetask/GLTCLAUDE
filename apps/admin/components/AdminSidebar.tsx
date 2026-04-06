'use client';
import { useState, useEffect, useRef } from 'react';
import { adminApi } from '../lib/api';

// ── Hardcoded fallback NAV (used if API is unavailable) ──────────────────────
const DEFAULT_NAV = [
  { section: 'Overview', items: [
    { label: 'Dashboard', icon: '⊞', page: 'dashboard', badge: null, badgeClass: null },
    { label: 'Analytics', icon: '↗', page: 'analytics', badge: 'Live', badgeClass: 'nb-brand' },
    { label: 'Activity Logs', icon: '≡', page: 'logs', badge: null, badgeClass: null },
  ]},
  { section: 'Users', items: [
    { label: 'All Users', icon: '◎', page: 'users', badge: '24.8k', badgeClass: 'nb-gray' },
    { label: 'Roles & Permissions', icon: '⬡', page: 'roles', badge: null, badgeClass: null },
    { label: 'Family Groups', icon: '👨‍👩‍👧', page: 'families', badge: null, badgeClass: null },
    { label: 'Subscriptions', icon: '◈', page: 'subs', badge: '3', badgeClass: 'nb-red' },
  ]},
  { section: 'Application', items: [
    { label: 'Categories', icon: '⊛', page: 'categories', badge: null, badgeClass: null },
    { label: 'Themes & UI', icon: '◑', page: 'themes', badge: null, badgeClass: null },
    { label: 'Languages', icon: '⊕', page: 'language', badge: null, badgeClass: null },
    { label: 'Translations', icon: '⟺', page: 'translations', badge: null, badgeClass: null },
    { label: 'Notifications', icon: '◉', page: 'notifs', badge: null, badgeClass: null },
  ]},
  { section: 'Monetisation', items: [
    { label: 'Web Ads', icon: '□', page: 'webads', badge: null, badgeClass: null },
    { label: 'Mobile Ads', icon: '▣', page: 'mobileads', badge: null, badgeClass: null },
    { label: 'Billing & Revenue', icon: '◇', page: 'billing', badge: null, badgeClass: null },
  ]},
  { section: 'Integrations', items: [
    { label: 'All Integrations', icon: '⊞', page: 'integrations', badge: '8', badgeClass: 'nb-green' },
    { label: 'Voice Assistants', icon: '◎', page: 'voice', badge: null, badgeClass: null },
    { label: 'Calendar Sync', icon: '⊡', page: 'calsync', badge: null, badgeClass: null },
    { label: 'Email Clients', icon: '⊠', page: 'emailint', badge: null, badgeClass: null },
    { label: 'API Keys', icon: '⊹', page: 'apikeys', badge: null, badgeClass: null },
  ]},
  { section: 'System', items: [
    { label: 'Settings', icon: '⊙', page: 'settings', badge: null, badgeClass: null },
    { label: 'Security', icon: '⊗', page: 'security', badge: null, badgeClass: null },
    { label: 'Backup & Restore', icon: '◫', page: 'backup', badge: null, badgeClass: null },
    { label: 'Menu Links', icon: '☰', page: 'menulinks', badge: null, badgeClass: null },
    { label: 'My Profile', icon: '◎', page: 'profile', badge: null, badgeClass: null },
  ]},
];

function groupBySection(flat: any[]): { section: string; items: any[] }[] {
  const map = new Map<string, any[]>();
  const sorted = [...flat].filter(i => i.visible !== false).sort((a, b) => a.order - b.order);
  for (const item of sorted) {
    if (!map.has(item.section)) map.set(item.section, []);
    map.get(item.section)!.push(item);
  }
  return Array.from(map.entries()).map(([section, items]) => ({ section, items }));
}

export function AdminSidebar({ activePage, onNavigate }: { activePage: string; onNavigate: (page: string) => void }) {
  const [admin, setAdmin] = useState<{ name: string; email: string; avatarUrl?: string | null } | null>(null);
  const [nav, setNav] = useState(DEFAULT_NAV);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fetch admin profile
  useEffect(() => {
    adminApi.users.me()
      .then(u => setAdmin({ name: (u as any).name, email: (u as any).email, avatarUrl: (u as any).avatarUrl }))
      .catch(() => {});
  }, []);

  // Fetch dynamic menu config
  useEffect(() => {
    adminApi.users.getMenuConfig()
      .then((res: any) => {
        const flat: any[] = res?.data?.admin ?? res?.admin ?? [];
        if (flat.length > 0) setNav(groupBySection(flat));
      })
      .catch(() => {/* keep fallback */});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const initials = admin?.name
    ? admin.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'SA';

  function handleLogout() {
    localStorage.removeItem('admin_token');
    window.location.href = '/login';
  }

  return (
    <aside className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <div className="brand-row">
          <div className="brand-icon">G</div>
          <div className="brand-name">GoodLifeTask</div>
        </div>
        <div className="brand-env">
          <div className="env-dot" />
          Production
        </div>
      </div>

      {/* Search */}
      <div className="sidebar-search">
        <span className="sidebar-search-icon">⌕</span>
        <input type="text" placeholder="Search..." />
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {nav.map(section => (
          <div key={section.section} className="nav-section">
            <div className="nav-section-label">{section.section}</div>
            {section.items.map(item => {
              const isActive = activePage === item.page;
              return (
                <div
                  key={item.page}
                  className={`nav-link${isActive ? ' active' : ''}`}
                  onClick={() => onNavigate(item.page)}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {item.label}
                  {item.badge && (
                    <span className={`nav-badge${item.badgeClass ? ' ' + item.badgeClass : ''}`}>
                      {item.badge}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer" ref={menuRef} style={{ position: 'relative' }}>
        <div
          className="sidebar-user"
          onClick={() => setMenuOpen(v => !v)}
          style={{ cursor: 'pointer' }}
        >
          <div className="user-ava">
            {admin?.avatarUrl
              ? <img src={admin.avatarUrl} alt={initials} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              : initials}
          </div>
          <div className="user-info">
            <div className="user-name">{admin?.name ?? 'Admin'}</div>
            <div className="user-role">{admin?.email ?? '…'}</div>
          </div>
          <div className="user-menu">⋯</div>
        </div>

        {menuOpen && (
          <div style={{
            position: 'absolute', bottom: '100%', left: 12, right: 12, marginBottom: 6,
            background: 'var(--card)', border: '1px solid var(--b1)',
            borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            overflow: 'hidden', zIndex: 200,
          }}>
            {[
              { icon: '◎', label: 'My Profile', page: 'profile' },
              { icon: '☰', label: 'Menu Links', page: 'menulinks' },
              { icon: '⊙', label: 'Settings',   page: 'settings' },
            ].map(item => (
              <div
                key={item.page}
                onClick={() => { onNavigate(item.page); setMenuOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 16px', fontSize: 13, color: 'var(--text-primary)',
                  cursor: 'pointer', transition: 'background 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ fontSize: 14 }}>{item.icon}</span>
                {item.label}
              </div>
            ))}
            <div style={{ height: 1, background: 'var(--b1)', margin: '4px 0' }} />
            <div
              onClick={handleLogout}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 16px', fontSize: 13, color: '#ef4444',
                cursor: 'pointer', transition: 'background 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.06)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontSize: 14 }}>⊘</span>
              Sign Out
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
